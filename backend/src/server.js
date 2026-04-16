import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const uploadsDir = path.join(rootDir, "uploads");
const dataDir = path.join(rootDir, "data");
const legacyTracksFile = path.join(dataDir, "tracks.json");
const dbPath = path.join(dataDir, "dubsync.sqlite");

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration TEXT NOT NULL,
    mood TEXT DEFAULT '',
    bpm INTEGER,
    audio_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS briefs (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    agency TEXT NOT NULL,
    campaign_title TEXT NOT NULL,
    creative_brief TEXT NOT NULL,
    genres TEXT NOT NULL,
    moods TEXT NOT NULL,
    duration TEXT NOT NULL,
    nature_of_use TEXT NOT NULL,
    media TEXT NOT NULL,
    territory TEXT NOT NULL,
    license_agreement_term TEXT NOT NULL,
    commencement_date TEXT NOT NULL,
    campaign_budget TEXT NOT NULL,
    media_spend_budget TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec("ALTER TABLE briefs ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending'");
} catch {}

const defaultSiteContent = {
  homeHero: `Underground
electronic
music.
Cleared fast.`,
  homeIntro:
    "DUBSYNC CONNECTS BRANDS TO ELECTRONIC MUSIC SUBMITTED ON DUBSELECTOR — OUR DAILY UNDERGROUND LIVESTREAM DELIVERING REAL-TIME COMMUNITY FEEDBACK. ##~3000## NEW TRACKS EACH MONTH. ##~100## HOURS REVIEWED WEEKLY. GET CURRENT MUSIC, NOT CATALOGUE MUSIC.",
  homeSectionTitle: `Music that already
exists`,
  homeSourcingOverlay:
    "DUBSYNC SOURCES MUSIC THAT ALREADY EXISTS ACROSS EMERGING UNDERGROUND SCENES. EVERY TRACK IS SUBMITTED VIA DUBSELECTOR AND SHAPED BY COMMUNITY RESPONSE. OUR LIVESTREAMS ATTRACT MORE THAN ~30K VIEWS EACH MONTH. WHAT COMES THROUGH REFLECTS WHAT'S TRENDING NOW, NOT LAST YEAR",
  learnHero: `Where ##culture##
moves
first`,
  learnLibraryHeading: "MUSIC AND TRENDS MOVE FASTER THAN SYSTEMS BUILT TO CONTAIN THEM.",
  learnLibraryBody: `DubSync is built around live intake instead of static catalogues.

We listen to over 100 hours of new music every week, surfaced directly from a global community of emerging electronic and dance producers.

Because the music already exists culturally, it translates naturally to social and online content — not forced sync music.

DubSync is not a library or a platform. It is a live sourcing layer built for relevance, speed, and taste.`,
  footerTagline: "Curated electronic music sourcing",
  footerLocation: "24HR LDN, SF, ATX",
  footerPartnership: "Operated in partnership with underground tastemakers.",
  footerPartners: "DUBSELECTOR / Labels / Observers / Artists",
  rotatingWords: [
    "on USBs.",
    "in rooms.",
    "##in culture.##",
    "underground.",
    "online.",
    "without a brief.",
  ],
};

const briefStatusOptions = ["Pending", "In progress", "Complete"];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inferSourceType(url) {
  const lowered = String(url || "").toLowerCase();

  if (lowered.includes("soundcloud.com")) return "soundcloud";
  if (lowered.includes("spotify.com")) return "spotify";
  if (lowered.includes("youtube.com") || lowered.includes("youtu.be")) return "youtube";

  const audioLike =
    lowered.includes("/uploads/") ||
    /\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/i.test(lowered);

  return audioLike ? "audio" : "embed";
}

function getPublicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_BASE_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");

  const forwardedProto = String(req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || req.get("host") || "")
    .split(",")[0]
    .trim();

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }

  return `http://localhost:${PORT}`;
}

function isLegacyUploadPath(url) {
  return String(url || "").startsWith("/uploads/");
}

function normalizeTrackCode(value, fallback = "Untitled Track") {
  const cleaned = String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
}

function getTracks() {
  return db
    .prepare(`
      SELECT
        id,
        code,
        artist,
        duration,
        mood,
        bpm,
        audio_url AS audioUrl,
        sort_order AS sortOrder,
        created_at AS createdAt
      FROM tracks
      ORDER BY sort_order ASC, created_at DESC
    `)
    .all();
}

function resolveTrackAudioUrl(track, req) {
  const rawAudioUrl = String(track.audioUrl || "");
  const publicBaseUrl = getPublicBaseUrl(req);

  return isLegacyUploadPath(rawAudioUrl)
    ? `${publicBaseUrl}${rawAudioUrl}`
    : rawAudioUrl;
}

function buildTrackResponse(track, req) {
  const resolvedAudioUrl = resolveTrackAudioUrl(track, req);
  const sourceType = inferSourceType(resolvedAudioUrl);

  return {
    ...track,
    trackName: track.code,
    sourceType,
    waveformSource: sourceType === "audio" ? resolvedAudioUrl : undefined,
    audioUrl: resolvedAudioUrl,
  };
}

function nextSortOrder() {
  const row = db
    .prepare(`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
      FROM tracks
    `)
    .get();

  return Number(row?.next_order ?? 0);
}

function normalizeImportedTracks(rawTracks) {
  return rawTracks.map((track, index) => ({
    id: track.id || `import-${Date.now()}-${index}`,
    code: track.code || "UNTITLED_TRACK",
    artist: track.artist || "Unknown Artist",
    duration: track.duration || "—",
    mood: track.mood || "",
    bpm: track.bpm ?? null,
    audioUrl: track.audioUrl || "",
    sortOrder: index,
  }));
}

function migrateLegacyJsonIfNeeded() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM tracks").get();
  const count = Number(row?.count ?? 0);

  if (count > 0) return;
  if (!fs.existsSync(legacyTracksFile)) return;

  try {
    const raw = JSON.parse(fs.readFileSync(legacyTracksFile, "utf-8"));
    if (!Array.isArray(raw) || raw.length === 0) return;

    const tracks = normalizeImportedTracks(raw);
    const insert = db.prepare(`
      INSERT INTO tracks (
        id,
        code,
        artist,
        duration,
        mood,
        bpm,
        audio_url,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN");
    try {
      for (const track of tracks) {
        insert.run(
          track.id,
          track.code,
          track.artist,
          track.duration,
          track.mood,
          track.bpm,
          track.audioUrl,
          track.sortOrder
        );
      }
      db.exec("COMMIT");
      console.log(`Migrated ${tracks.length} tracks from legacy JSON into SQLite.`);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Failed to migrate legacy JSON:", error);
  }
}

function compactSortOrder() {
  const rows = db
    .prepare(`
      SELECT id
      FROM tracks
      ORDER BY sort_order ASC, created_at DESC
    `)
    .all();

  const update = db.prepare("UPDATE tracks SET sort_order = ? WHERE id = ?");
  rows.forEach((row, index) => {
    update.run(index, row.id);
  });
}

function getBriefs(orderBy = "latest") {
  const normalizedOrder = orderBy === "progress" ? "progress" : "latest";
  const orderClause =
    normalizedOrder === "progress"
      ? `CASE status
           WHEN 'Pending' THEN 0
           WHEN 'In progress' THEN 1
           WHEN 'Complete' THEN 2
           ELSE 3
         END ASC, created_at DESC`
      : `created_at DESC`;

  return db.prepare(`
    SELECT
      id,
      brand,
      agency,
      campaign_title AS campaignTitle,
      creative_brief AS creativeBrief,
      genres,
      moods,
      duration,
      nature_of_use AS natureOfUse,
      media,
      territory,
      license_agreement_term AS licenseAgreementTerm,
      commencement_date AS commencementDate,
      campaign_budget AS campaignBudget,
      media_spend_budget AS mediaSpendBudget,
      status,
      created_at AS createdAt
    FROM briefs
    ORDER BY ${orderClause}
  `).all();
}

function getBriefCount() {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM briefs`).get();
  return Number(row?.count ?? 0);
}

function getSiteContent() {
  const rows = db.prepare("SELECT key, value FROM site_settings").all();
  const stored = Object.fromEntries(
    rows.map((row) => {
      try {
        return [row.key, JSON.parse(row.value)];
      } catch {
        return [row.key, row.value];
      }
    })
  );

  return {
    ...defaultSiteContent,
    ...stored,
    rotatingWords:
      Array.isArray(stored.rotatingWords) && stored.rotatingWords.length > 0
        ? stored.rotatingWords
        : defaultSiteContent.rotatingWords,
  };
}

function saveSiteContent(nextContent) {
  const entries = Object.entries({
    ...defaultSiteContent,
    ...nextContent,
    rotatingWords: Array.isArray(nextContent.rotatingWords)
      ? nextContent.rotatingWords.filter(Boolean)
      : defaultSiteContent.rotatingWords,
  });

  const upsert = db.prepare(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  db.exec("BEGIN");
  try {
    for (const [key, value] of entries) {
      upsert.run(key, JSON.stringify(value));
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function buildAdminCopyForm(content) {
  return `
    <section class="copy-panel">
      <h2 class="panel-title">Site text</h2>
      <div class="help">Change the frontend copy here. Use ##word## anywhere to make that word flash on the site.</div>
      <form method="post" action="/admin/site-content">
        <div class="form-grid">
          <div class="field full">
            <label>Home hero</label>
            <textarea name="homeHero" rows="4">${escapeHtml(content.homeHero)}</textarea>
          </div>
          <div class="field full">
            <label>Home intro</label>
            <textarea name="homeIntro" rows="5">${escapeHtml(content.homeIntro)}</textarea>
          </div>
          <div class="field full">
            <label>Home section title</label>
            <textarea name="homeSectionTitle" rows="3">${escapeHtml(content.homeSectionTitle)}</textarea>
          </div>
          <div class="field full">
            <label>Home sourcing overlay</label>
            <textarea name="homeSourcingOverlay" rows="5">${escapeHtml(content.homeSourcingOverlay)}</textarea>
          </div>
          <div class="field full">
            <label>Learn more hero</label>
            <textarea name="learnHero" rows="3">${escapeHtml(content.learnHero)}</textarea>
          </div>
          <div class="field full">
            <label>Learn library heading</label>
            <textarea name="learnLibraryHeading" rows="3">${escapeHtml(content.learnLibraryHeading)}</textarea>
          </div>
          <div class="field full">
            <label>Learn library body</label>
            <textarea name="learnLibraryBody" rows="8">${escapeHtml(content.learnLibraryBody)}</textarea>
          </div>
          <div class="field full">
            <label>Footer tagline</label>
            <input name="footerTagline" value="${escapeHtml(content.footerTagline)}" />
          </div>
          <div class="field full">
            <label>Footer location</label>
            <input name="footerLocation" value="${escapeHtml(content.footerLocation)}" />
          </div>
          <div class="field full">
            <label>Footer partnership line</label>
            <input name="footerPartnership" value="${escapeHtml(content.footerPartnership)}" />
          </div>
          <div class="field full">
            <label>Footer partners line</label>
            <input name="footerPartners" value="${escapeHtml(content.footerPartners)}" />
          </div>
          <div class="field full">
            <label>Rotating words (one per line)</label>
            <textarea name="rotatingWords" rows="6">${escapeHtml(content.rotatingWords.join("\n"))}</textarea>
          </div>
        </div>
        <button type="submit" class="primary">Save site text</button>
      </form>
    </section>
  `;
}

migrateLegacyJsonIfNeeded();

const existingContent = getSiteContent();
if (
  existingContent.homeIntro ===
  "DUBSYNC CONNECTS BRANDS TO ELECTRONIC MUSIC SUBMITTED ON DUBSELECTOR — OUR DAILY UNDERGROUND LIVESTREAM DELIVERING REAL-TIME COMMUNITY FEEDBACK. ~3000 NEW TRACKS EACH MONTH. ~100 HOURS REVIEWED WEEKLY. GET CURRENT MUSIC, NOT CATALOGUE MUSIC."
) {
  saveSiteContent({ ...existingContent, homeIntro: defaultSiteContent.homeIntro });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase() || "track";

    cb(
      null,
      `${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase()}`
    );
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".wav") {
      cb(new Error("Only .wav files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: "sqlite", dbPath });
});

app.get("/api/site-content", (_req, res) => {
  res.json(getSiteContent());
});

app.get("/api/tracks", (req, res) => {
  const tracks = getTracks();
  res.json(tracks.map((track) => buildTrackResponse(track, req)));
});

app.post("/api/tracks/upload", upload.single("file"), (req, res) => {
  try {
    const file = req.file;
    const sourceUrl = String(req.body.sourceUrl || "").trim();

    if (!file && !sourceUrl) {
      res.redirect("/admin?error=Provide+a+WAV+file+or+an+external+link");
      return;
    }

    const fallbackCode = file
      ? normalizeTrackCode(file.originalname, "Untitled Track")
      : normalizeTrackCode(sourceUrl, "External link");

    const next = {
      id: `upload-${Date.now()}`,
      code: normalizeTrackCode(req.body.code || fallbackCode, fallbackCode),
      artist: String(req.body.artist || "").trim() || "Unknown Artist",
      duration: String(req.body.duration || "").trim() || "—",
      mood: String(req.body.mood || "").trim(),
      bpm: req.body.bpm ? Number(req.body.bpm) : null,
      audioUrl: file ? `/uploads/${file.filename}` : sourceUrl,
      sortOrder: nextSortOrder(),
    };

    db.prepare(`
      INSERT INTO tracks (
        id,
        code,
        artist,
        duration,
        mood,
        bpm,
        audio_url,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      next.id,
      next.code,
      next.artist,
      next.duration,
      next.mood,
      Number.isFinite(next.bpm) ? next.bpm : null,
      next.audioUrl,
      next.sortOrder
    );

    res.redirect(`/admin?success=${encodeURIComponent(`Added ${next.code}`)}`);
  } catch (error) {
    console.error("Failed to upload track:", error);
    res.redirect(`/admin?error=${encodeURIComponent(error?.message || "Failed to upload track")}`);
  }
});

app.post("/admin/tracks/:id/edit", (req, res) => {
  try {
    const track = db.prepare("SELECT * FROM tracks WHERE id = ?").get(req.params.id);

    if (!track) {
      res.redirect("/admin?error=Track+not+found");
      return;
    }

    db.prepare(`
      UPDATE tracks
      SET code = ?, artist = ?, duration = ?, mood = ?, bpm = ?
      WHERE id = ?
    `).run(
      normalizeTrackCode(req.body.code || track.code, track.code),
      String(req.body.artist || track.artist || "Unknown Artist").trim() || "Unknown Artist",
      String(req.body.duration || track.duration || "—").trim() || "—",
      req.body.mood ?? track.mood,
      req.body.bpm ? Number(req.body.bpm) : null,
      req.params.id
    );

    const updated = db.prepare("SELECT code FROM tracks WHERE id = ?").get(req.params.id);
    res.redirect(`/admin?success=${encodeURIComponent(`Updated ${updated.code}`)}`);
  } catch (error) {
    console.error("Failed to edit track:", error);
    res.redirect("/admin?error=Failed+to+update+track");
  }
});

app.post("/admin/tracks/:id/delete", (req, res) => {
  try {
    const track = db.prepare("SELECT * FROM tracks WHERE id = ?").get(req.params.id);

    if (!track) {
      res.redirect("/admin?error=Track+not+found");
      return;
    }

    const audioUrl = String(track.audio_url || "");

    if (audioUrl.startsWith("/uploads/")) {
      const relativePath = audioUrl.replace(/^\/+/, "");
      const filePath = path.join(rootDir, relativePath);

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileError) {
          console.error("Failed to remove uploaded file:", fileError);
        }
      }
    }

    db.prepare("DELETE FROM tracks WHERE id = ?").run(req.params.id);
    compactSortOrder();

    res.redirect(`/admin?success=${encodeURIComponent(`Deleted ${track.code}`)}`);
  } catch (error) {
    console.error("Failed to delete track:", error);
    res.redirect("/admin?error=Failed+to+delete+track");
  }
});

app.post("/api/briefs", (req, res) => {
  try {
    const {
      brand = "",
      agency = "",
      campaignTitle = "",
      creativeBrief = "",
      genres = [],
      moods = [],
      duration = "",
      natureOfUse = "",
      media = "",
      territory = "",
      licenseAgreementTerm = "",
      commencementDate = "",
      campaignBudget = "",
      mediaSpendBudget = "",
    } = req.body || {};

    if (
      !campaignTitle ||
      !creativeBrief ||
      !Array.isArray(genres) ||
      !genres.length ||
      !Array.isArray(moods) ||
      !moods.length ||
      !duration ||
      !natureOfUse ||
      !media ||
      !territory ||
      !licenseAgreementTerm ||
      !commencementDate ||
      !campaignBudget ||
      !mediaSpendBudget
    ) {
      res.status(400).json({ ok: false, error: "Missing required fields" });
      return;
    }

    const id = `brief-${Date.now()}`;

    db.prepare(`
      INSERT INTO briefs (
        id,
        brand,
        agency,
        campaign_title,
        creative_brief,
        genres,
        moods,
        duration,
        nature_of_use,
        media,
        territory,
        license_agreement_term,
        commencement_date,
        campaign_budget,
        media_spend_budget,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      brand,
      agency,
      campaignTitle,
      creativeBrief,
      JSON.stringify(genres),
      JSON.stringify(moods),
      duration,
      natureOfUse,
      media,
      territory,
      licenseAgreementTerm,
      commencementDate,
      campaignBudget,
      mediaSpendBudget,
      "Pending"
    );

    res.json({ ok: true, id });
  } catch (error) {
    console.error("Failed to store brief:", error);
    res.status(500).json({ ok: false, error: "Failed to store brief" });
  }
});

app.post("/admin/tracks/reorder", (req, res) => {
  try {
    const order = JSON.parse(req.body.order || "[]");

    if (!Array.isArray(order)) {
      res.status(400).json({ error: "Invalid order payload" });
      return;
    }

    const update = db.prepare("UPDATE tracks SET sort_order = ? WHERE id = ?");
    order.forEach((id, index) => {
      update.run(index, id);
    });
    compactSortOrder();

    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to reorder tracks:", error);
    res.status(400).json({ error: "Failed to reorder tracks" });
  }
});

app.post("/admin/briefs/:id/status", (req, res) => {
  try {
    const brief = db.prepare("SELECT id FROM briefs WHERE id = ?").get(req.params.id);

    if (!brief) {
      res.redirect("/admin?error=Brief+not+found");
      return;
    }

    const nextStatus = briefStatusOptions.includes(String(req.body.status || ""))
      ? String(req.body.status)
      : "Pending";

    db.prepare("UPDATE briefs SET status = ? WHERE id = ?").run(nextStatus, req.params.id);

    const orderBy = req.query.briefOrder === "progress" ? "progress" : "latest";
    res.redirect(`/admin?briefOrder=${orderBy}&success=${encodeURIComponent(`Updated brief status to ${nextStatus}`)}`);
  } catch (error) {
    console.error("Failed to update brief status:", error);
    res.redirect("/admin?error=Failed+to+update+brief+status");
  }
});

app.post("/admin/site-content", (req, res) => {
  try {
    saveSiteContent({
      homeHero: String(req.body.homeHero || defaultSiteContent.homeHero),
      homeIntro: String(req.body.homeIntro || defaultSiteContent.homeIntro),
      homeSectionTitle: String(req.body.homeSectionTitle || defaultSiteContent.homeSectionTitle),
      homeSourcingOverlay: String(req.body.homeSourcingOverlay || defaultSiteContent.homeSourcingOverlay),
      learnHero: String(req.body.learnHero || defaultSiteContent.learnHero),
      learnLibraryHeading: String(req.body.learnLibraryHeading || defaultSiteContent.learnLibraryHeading),
      learnLibraryBody: String(req.body.learnLibraryBody || defaultSiteContent.learnLibraryBody),
      footerTagline: String(req.body.footerTagline || defaultSiteContent.footerTagline),
      footerLocation: String(req.body.footerLocation || defaultSiteContent.footerLocation),
      footerPartnership: String(req.body.footerPartnership || defaultSiteContent.footerPartnership),
      footerPartners: String(req.body.footerPartners || defaultSiteContent.footerPartners),
      rotatingWords: String(req.body.rotatingWords || "")
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    });

    res.redirect(`/admin?success=${encodeURIComponent("Saved site text")}`);
  } catch (error) {
    console.error("Failed to save site content", error);
    res.redirect("/admin?error=Failed+to+save+site+text");
  }
});

app.get("/admin", (req, res) => {
  const briefOrder = req.query.briefOrder === "progress" ? "progress" : "latest";
  const briefs = getBriefs(briefOrder);
  const briefCount = getBriefCount();
  const tracks = getTracks();
  const siteContent = getSiteContent();
  const success = req.query.success ? escapeHtml(req.query.success) : "";
  const error = req.query.error ? escapeHtml(req.query.error) : "";

  const briefCards = briefs
    .map((brief) => {
      let genres = [];
      let moods = [];

      try {
        genres = JSON.parse(brief.genres || "[]");
      } catch {}

      try {
        moods = JSON.parse(brief.moods || "[]");
      } catch {}

      return `
        <section class="track-card collapsed brief-card" data-brief-id="${escapeHtml(brief.id)}" style="cursor:default">
          <div class="track-topbar brief-topbar" data-brief-card-toggle>
            <div class="track-left">
              <button
                type="button"
                class="collapse-toggle"
                data-brief-collapse-toggle
                aria-label="Expand brief"
              >+</button>

              <div class="track-main">
                <div class="track-code small">${escapeHtml(brief.campaignTitle)}</div>
                <div class="track-meta">
                  ${escapeHtml(brief.brand || "No brand")} ·
                  ${escapeHtml(brief.agency || "No agency")} ·
                  ${escapeHtml(brief.createdAt)}
                </div>
                <div class="compact-meta">
                  <span class="pill">${escapeHtml(brief.territory)}</span>
                  <span class="pill ghost">${escapeHtml(brief.media)}</span>
                  <span class="pill status-pill status-${(brief.status || "Pending").toLowerCase().replace(/\s+/g, "-")}">
                    ${escapeHtml(brief.status || "Pending")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="track-body">
            <form method="post" action="/admin/briefs/${encodeURIComponent(brief.id)}/status?briefOrder=${briefOrder}" class="brief-status-form">
              <div class="field">
                <label>Progress</label>
                <select name="status">
                  ${briefStatusOptions
                    .map(
                      (status) =>
                        `<option value="${escapeHtml(status)}" ${brief.status === status ? "selected" : ""}>${escapeHtml(status)}</option>`
                    )
                    .join("")}
                </select>
              </div>
              <div class="action-row">
                <button type="submit" class="secondary">Save progress</button>
              </div>
            </form>
            <div class="edit-grid">
              <div class="field">
                <label>Brand</label>
                <input value="${escapeHtml(brief.brand)}" readonly />
              </div>
              <div class="field">
                <label>Agency</label>
                <input value="${escapeHtml(brief.agency)}" readonly />
              </div>
              <div class="field full">
                <label>Creative brief</label>
                <textarea rows="6" readonly>${escapeHtml(brief.creativeBrief)}</textarea>
              </div>
              <div class="field">
                <label>Genres</label>
                <input value="${escapeHtml(genres.join(", "))}" readonly />
              </div>
              <div class="field">
                <label>Moods</label>
                <input value="${escapeHtml(moods.join(", "))}" readonly />
              </div>
              <div class="field">
                <label>Duration</label>
                <input value="${escapeHtml(brief.duration)}" readonly />
              </div>
              <div class="field">
                <label>Nature of use</label>
                <input value="${escapeHtml(brief.natureOfUse)}" readonly />
              </div>
              <div class="field">
                <label>Media</label>
                <input value="${escapeHtml(brief.media)}" readonly />
              </div>
              <div class="field">
                <label>Territory</label>
                <input value="${escapeHtml(brief.territory)}" readonly />
              </div>
              <div class="field">
                <label>License term</label>
                <input value="${escapeHtml(brief.licenseAgreementTerm)}" readonly />
              </div>
              <div class="field">
                <label>Commencement date</label>
                <input value="${escapeHtml(brief.commencementDate)}" readonly />
              </div>
              <div class="field">
                <label>Campaign budget</label>
                <input value="${escapeHtml(brief.campaignBudget)}" readonly />
              </div>
              <div class="field">
                <label>Media spend budget</label>
                <input value="${escapeHtml(brief.mediaSpendBudget)}" readonly />
              </div>
            </div>
          </div>
        </section>
      `;
    })
    .join("");

  const trackCards = tracks
    .map((track) => {
      const resolvedAudioUrl = resolveTrackAudioUrl(track, req);
      const isUpload = String(track.audioUrl || "").startsWith("/uploads/");

      return `
        <section class="track-card collapsed" data-track-id="${escapeHtml(track.id)}">
          <div class="drag-handle" title="Drag to reorder" draggable="true">
            <span></span><span></span><span></span>
          </div>

          <div class="track-topbar" data-track-card-toggle>
            <div class="track-left">
              <button type="button" class="collapse-toggle" data-collapse-toggle aria-label="Expand track">+</button>
              <div class="track-main">
                <div class="track-code">${escapeHtml(track.code)}</div>
                <div class="track-meta">${escapeHtml(track.artist)} · ${escapeHtml(track.duration)}${
                  track.bpm ? ` · ${escapeHtml(track.bpm)} BPM` : ""
                }</div>
                <div class="compact-meta">
                  ${track.mood ? `<span class="pill">${escapeHtml(track.mood)}</span>` : ""}
                  ${
                    isUpload
                      ? `<span class="pill ghost">Uploaded WAV</span>`
                      : resolvedAudioUrl.includes("soundcloud.com")
                        ? `<span class="pill ghost">SoundCloud link</span>`
                        : resolvedAudioUrl.includes("spotify.com")
                          ? `<span class="pill ghost">Spotify link</span>`
                          : resolvedAudioUrl.includes("youtube.com") || resolvedAudioUrl.includes("youtu.be")
                            ? `<span class="pill ghost">YouTube link</span>`
                            : `<span class="pill ghost">Remote audio</span>`
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="track-body">
            <audio controls preload="none" src="${escapeHtml(resolvedAudioUrl)}"></audio>
            <canvas class="inline-wave" width="900" height="54" data-audio-url="${escapeHtml(resolvedAudioUrl)}"></canvas>

            <form method="post" action="/admin/tracks/${encodeURIComponent(track.id)}/edit" class="edit-grid">
              <div class="field">
                <label>Track name</label>
                <input name="code" value="${escapeHtml(track.code)}" />
              </div>
              <div class="field">
                <label>Artist</label>
                <input name="artist" value="${escapeHtml(track.artist)}" />
              </div>
              <div class="field">
                <label>Duration</label>
                <input name="duration" value="${escapeHtml(track.duration)}" />
              </div>
              <div class="field">
                <label>BPM</label>
                <input name="bpm" type="number" value="${track.bpm ?? ""}" />
              </div>
              <div class="field full">
                <label>Mood</label>
                <input name="mood" value="${escapeHtml(track.mood || "")}" />
              </div>
              <div class="action-row">
                <button type="submit" class="secondary">Save changes</button>
              </div>
            </form>

            <form method="post" action="/admin/tracks/${encodeURIComponent(track.id)}/delete" data-delete-track-form>
              <button type="submit" class="danger">Delete track</button>
            </form>
          </div>
        </section>
      `;
    })
    .join("");

  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>DUBSYNC Admin</title>
  <style>
    .status-pill {
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(255,255,255,.06);
      color: rgba(255,255,255,.75);
    }

    .collapsible-panel.collapsed .collapsible-content {
      display: none;
    }

    * { box-sizing: border-box; }
    body { margin: 0; background: #000; color: #fff; font-family: Inter, system-ui, sans-serif; }
    .wrap { max-width: 1240px; margin: 0 auto; padding: 40px 24px 80px; }
    .logo { position: fixed; top: 24px; right: 24px; font-weight: 800; letter-spacing: -0.10em; font-size: 18px; text-transform: uppercase; z-index: 10; }
    .logo .dub { color: #7B3FB6; }
    .logo .sync { color: white; margin-left: .02em; }
    h1 { font-size: clamp(42px, 8vw, 92px); line-height: .92; letter-spacing: -0.06em; margin: 0 0 12px; font-weight: 500; }
    p.sub { color: rgba(255,255,255,.55); margin: 0; max-width: 760px; }
    .flash, .error { margin-top: 24px; padding: 16px 18px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); width: fit-content; }
    .error { border-color: rgba(255,100,100,.22); color: #ffb0b0; background: rgba(255,80,80,.06); }
    .grid { display: grid; grid-template-columns: minmax(320px, 420px) 1fr; gap: 28px; margin-top: 42px; align-items: start; }
    .upload-panel, .list-panel, .copy-panel { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.03); padding: 28px; }
    .panel-title { font-size: 28px; line-height: 1; letter-spacing: -0.04em; margin: 0 0 10px; font-weight: 500; }
    .help { color: rgba(255,255,255,.38); font-size: 14px; margin-bottom: 22px; }
    .helper-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
    .save-order { min-width: 140px; }
    .save-order.saved { background: white; color: black; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .field { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
    .field.full { grid-column: 1 / -1; }
    label { font-size: 12px; letter-spacing: .24em; text-transform: uppercase; color: rgba(255,255,255,.62); }
    input, textarea, select { background: transparent; border: 0; border-bottom: 1px solid rgba(255,255,255,.14); color: white; padding: 14px 0; font-size: 18px; outline: none; width: 100%; }
    textarea { resize: vertical; min-height: 120px; font-family: inherit; }
    input[type=file] { border: 1px dashed rgba(255,255,255,.18); padding: 18px; }
    button { border: 1px solid rgba(255,255,255,.28); background: transparent; color: white; padding: 14px 18px; font-size: 16px; cursor: pointer; transition: .18s ease; }
    button:hover:not([disabled]) { background: white; color: black; }
    button[disabled] { opacity: .25; cursor: not-allowed; }
    .primary { width: 100%; font-size: 18px; padding: 16px 24px; margin-top: 4px; }
    .secondary { min-width: 180px; }
    .danger { border-color: rgba(255,120,120,.26); color: #ffb6b6; }
    .danger:hover { background: #ffb6b6 !important; color: black !important; }
    .tracks { display: grid; gap: 18px; max-height: 72vh; overflow: auto; padding-right: 6px; }
    .tracks::-webkit-scrollbar { width: 8px; }
    .tracks::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); }

    .track-card {
      border: 1px solid rgba(255,255,255,.10);
      padding: 18px;
      background: rgba(255,255,255,.02);
      position: relative;
    }

    .track-card.collapsed .track-body {
      display: none;
    }

    .track-card.dragging {
      opacity: .45;
      border-color: rgba(123,63,182,.7);
    }

    .track-card.drag-over {
      outline: 1px dashed rgba(255,255,255,.35);
      outline-offset: 4px;
    }

    .track-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 12px;
      cursor: pointer;
    }

    .track-left {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      min-width: 0;
      flex: 1;
    }

    .collapse-toggle {
      width: 42px;
      height: 42px;
      padding: 0;
      font-size: 16px;
      flex: 0 0 auto;
    }

    .track-main {
      min-width: 0;
    }

    .inline-wave {
      width: 100%;
      height: 54px;
      display: block;
      margin: 10px 0 12px;
      background: rgba(255,255,255,.02);
      border: 1px solid rgba(255,255,255,.06);
    }

    .compact-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .drag-handle {
      position: absolute;
      top: 16px;
      right: 16px;
      display: grid;
      gap: 4px;
      opacity: .45;
      cursor: grab;
      padding: 6px;
      z-index: 5;
      user-select: none;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .drag-handle span {
      width: 18px;
      height: 2px;
      background: rgba(255,255,255,.55);
      display: block;
      pointer-events: none;
    }

    .track-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 28px;
      letter-spacing: -0.04em;
      text-transform: uppercase;
    }

    .track-code.small {
      font-size: 22px;
    }

    .track-meta {
      color: rgba(255,255,255,.44);
      margin-top: 6px;
      font-size: 14px;
    }

    .pill-row, .compact-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .pill-row {
      margin: 14px 0 18px;
    }

    .pill {
      padding: 8px 10px;
      background: rgba(255,255,255,.07);
      font-size: 12px;
      letter-spacing: .16em;
      text-transform: uppercase;
      color: rgba(255,255,255,.82);
    }

    .pill.ghost {
      background: rgba(255,255,255,.03);
      color: rgba(255,255,255,.45);
    }

    .status-pill {
      border: 1px solid rgba(123,63,182,.32);
      color: rgba(255,255,255,.92);
    }

    .status-in-progress {
      border-color: rgba(255,255,255,.6);
      background: rgba(255,255,255,.9);
      color: black;
      box-shadow: 0 0 10px rgba(255,255,255,.25);
    }

    .status-complete {
      background: #22c55e;
      border-color: #22c55e;
      color: black;
    }

    .brief-toolbar {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .brief-sort-link {
      border: 1px solid rgba(255,255,255,.16);
      color: rgba(255,255,255,.62);
      padding: 10px 14px;
      text-decoration: none;
      transition: .18s ease;
    }

    .brief-sort-link.active,
    .brief-sort-link:hover {
      background: white;
      color: black;
    }

    .brief-status-form {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 14px;
      align-items: end;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }

    audio { width: 100%; margin-bottom: 10px; }

    .edit-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 10px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,.08);
    }

    .action-row {
      grid-column: 1 / -1;
      display: flex;
      gap: 10px;
      justify-content: flex-start;
      margin-top: 6px;
    }

    .empty {
      color: rgba(255,255,255,.4);
      border: 1px dashed rgba(255,255,255,.12);
      padding: 24px;
    }

    @media (max-width: 980px) {
      .grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 760px) {
      .form-grid, .edit-grid { grid-template-columns: 1fr; }
      .wrap { padding: 28px 18px 60px; }
      .track-code { font-size: 22px; }
      .helper-row { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="logo"><span class="dub">DUB</span><span class="sync">SYNC</span></div>

  <div class="grid" style="margin-top:28px;">
    <section class="list-panel collapsible-panel" id="briefRequestsPanel" style="grid-column: 1 / -1;">
      <div class="helper-row" id="briefRequestsHeader" style="cursor:pointer;">
        <div style="display:flex; align-items:flex-start; gap:14px;">
          <button
            type="button"
            class="collapse-toggle"
            id="briefRequestsCollapseToggle"
            aria-label="Collapse brief requests"
          >−</button>

          <div>
            <h2 class="panel-title">Brief requests (${briefCount})</h2>
            <div class="help">Incoming briefs from clients. Click to expand.</div>
          </div>
        </div>

        <div class="brief-toolbar">
          <a href="#" data-brief-order="latest" class="brief-sort-link ${briefOrder === "latest" ? "active" : ""}">Latest</a>
          <a href="#" data-brief-order="progress" class="brief-sort-link ${briefOrder === "progress" ? "active" : ""}">Progress</a>
        </div>
      </div>

      <div class="collapsible-content" id="briefRequestsContent">
        <div class="tracks" id="briefsList">
          ${briefCards || `<div class="empty">No briefs yet.</div>`}
        </div>
      </div>
    </section>
  </div>

  <div class="wrap">
    <h1>Upload, edit,<br/>and shape tracks.</h1>
    <p class="sub">Upload a WAV, stay inside the workflow, then drag tracks into the exact order you want for the frontend playlist. Metadata is stored in SQLite and files are stored locally.</p>

    ${success ? `<div class="flash">${success}</div>` : ""}
    ${error ? `<div class="error">${error}</div>` : ""}

    <div class="grid">
      <div style="display:grid; gap:28px;">
        <section class="upload-panel">
          <h2 class="panel-title">Add track</h2>
          <div class="help">Add a new track to the frontend playlist. Use either a WAV upload or an external SoundCloud / Spotify / YouTube link. Direct audio URLs get live waveform. Embed links are supported too.</div>
          <form action="/api/tracks/upload" method="post" enctype="multipart/form-data" id="addTrackForm">
            <div class="form-grid">
              <div class="field">
                <label>Track name</label>
                <input name="code" id="trackNameInput" placeholder="e.g. Dark Room 01" />
              </div>
              <div class="field">
                <label>Artist</label>
                <input name="artist" id="trackArtistInput" placeholder="e.g. Various Artists" />
              </div>
              <div class="field">
                <label>Duration</label>
                <input name="duration" placeholder="e.g. 2:14" />
              </div>
              <div class="field">
                <label>BPM</label>
                <input name="bpm" type="number" placeholder="e.g. 132" />
              </div>
              <div class="field full">
                <label>Mood</label>
                <input name="mood" placeholder="e.g. Raw / nocturnal" />
              </div>
              <div class="field full">
                <label>Audio source URL (optional)</label>
                <input name="sourceUrl" id="sourceUrlInput" placeholder="SoundCloud / Spotify / YouTube / direct audio URL" />
              </div>
              <div class="field full">
                <label>WAV file (optional)</label>
                <input name="file" id="trackFileInput" type="file" accept=".wav,audio/wav" />
              </div>
            </div>
            <button type="submit" class="primary">Add track</button>
          </form>
        </section>

        ${buildAdminCopyForm(siteContent)}
      </div>

      <section class="list-panel">
        <div class="helper-row">
          <div>
            <h2 class="panel-title">Track manager</h2>
            <div class="help">Drag cards to reorder. Save changes once you're happy.</div>
          </div>
          <button type="button" class="save-order" id="saveOrderBtn">Save order</button>
        </div>

        <div class="tracks" id="tracksList">
          ${trackCards || `<div class="empty">No tracks yet. Add your first track on the left.</div>`}
        </div>
      </section>
    </div>
  </div>

  <script>
    const tracksList = document.getElementById("tracksList");
    const saveOrderBtn = document.getElementById("saveOrderBtn");
    let dragged = null;

    function toggleCard(card, toggleButton) {
      const collapsed = card.classList.toggle("collapsed");
      if (toggleButton) {
        toggleButton.textContent = collapsed ? "+" : "−";
        toggleButton.setAttribute("aria-label", collapsed ? "Expand" : "Collapse");
      }
    }

    function attachDnD() {
      if (!tracksList) return;

      const cards = [...tracksList.querySelectorAll(".track-card")];

      cards.forEach((card) => {
        const toggle = card.querySelector("[data-collapse-toggle]");
        const topbar = card.querySelector("[data-track-card-toggle]");
        const handle = card.querySelector(".drag-handle");

        if (toggle && !toggle.dataset.bound) {
          toggle.dataset.bound = "1";
          toggle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleCard(card, toggle);
          });
        }

        if (topbar && !topbar.dataset.bound) {
          topbar.dataset.bound = "1";
          topbar.addEventListener("click", (event) => {
            if (
              event.target.closest(".collapse-toggle") ||
              event.target.closest(".drag-handle") ||
              event.target.closest("a") ||
              event.target.closest("button")
            ) {
              return;
            }
            toggleCard(card, toggle);
          });
        }

        if (handle && !handle.dataset.bound) {
          handle.dataset.bound = "1";

          handle.addEventListener("dragstart", (event) => {
            dragged = card;
            card.classList.add("dragging");

            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", card.dataset.trackId || "");
            }
          });

          handle.addEventListener("dragend", () => {
            card.classList.remove("dragging");
            [...tracksList.querySelectorAll(".track-card")].forEach((c) => {
              c.classList.remove("drag-over");
            });
            dragged = null;
          });
        }

        card.addEventListener("dragover", (event) => {
          event.preventDefault();
          if (!dragged || dragged === card) return;
          card.classList.add("drag-over");
        });

        card.addEventListener("dragleave", () => {
          card.classList.remove("drag-over");
        });

        card.addEventListener("drop", (event) => {
          event.preventDefault();
          card.classList.remove("drag-over");

          if (!dragged || dragged === card || !tracksList) return;

          const rect = card.getBoundingClientRect();
          const before = event.clientY < rect.top + rect.height / 2;

          if (before) {
            tracksList.insertBefore(dragged, card);
          } else {
            tracksList.insertBefore(dragged, card.nextSibling);
          }

          saveOrderBtn.textContent = "Save order *";
        });
      });

      const briefCardsEls = [...document.querySelectorAll(".brief-card")];
      briefCardsEls.forEach((card) => {
        const toggle = card.querySelector("[data-brief-collapse-toggle]");
        const topbar = card.querySelector("[data-brief-card-toggle]");

        if (toggle && !toggle.dataset.bound) {
          toggle.dataset.bound = "1";
          toggle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleCard(card, toggle);
          });
        }

        if (topbar && !topbar.dataset.bound) {
          topbar.dataset.bound = "1";
          topbar.addEventListener("click", (event) => {
            if (
              event.target.closest(".collapse-toggle") ||
              event.target.closest("a") ||
              event.target.closest("button")
            ) {
              return;
            }
            toggleCard(card, toggle);
          });
        }
      });
    }

    function bindBriefRequestsPanelCollapse() {
      const panel = document.getElementById("briefRequestsPanel");
      const header = document.getElementById("briefRequestsHeader");
      const toggle = document.getElementById("briefRequestsCollapseToggle");

      if (!panel || !toggle) return;

      const applyToggle = () => {
        const collapsed = panel.classList.toggle("collapsed");
        toggle.textContent = collapsed ? "+" : "−";
        toggle.setAttribute(
          "aria-label",
          collapsed ? "Expand brief requests" : "Collapse brief requests"
        );
      };

      if (!toggle.dataset.bound) {
        toggle.dataset.bound = "1";
        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          applyToggle();
        });
      }

      if (header && !header.dataset.bound) {
        header.dataset.bound = "1";
        header.addEventListener("click", (event) => {
          if (event.target.closest(".brief-sort-link") || event.target.closest(".collapse-toggle")) {
            return;
          }
          applyToggle();
        });
      }
    }

    function bindWaveformToAudio(canvas, audio) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.clientWidth || 900;
      const cssHeight = canvas.clientHeight || 54;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderBase = () => {
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      };

      const render = (progress = 0) => {
        renderBase();
        const amps = canvas._amps || [];
        if (!amps.length) return;
        const max = Math.max(...amps, 0.0001);
        const barWidth = cssWidth / amps.length;
        const progressX = Math.max(0, Math.min(cssWidth, cssWidth * progress));

        amps.forEach((amp, i) => {
          const norm = amp / max;
          const h = Math.max(3, norm * (cssHeight - 6));
          const x = i * barWidth;
          const y = (cssHeight - h) / 2;
          const barCenter = x + barWidth * 0.5;
          ctx.fillStyle = barCenter <= progressX
            ? "rgba(255,255,255,0.98)"
            : "rgba(255,255,255,0.42)";
          ctx.fillRect(x + 0.8, y, Math.max(1.2, barWidth - 1.6), h);
        });

        ctx.fillStyle = "rgba(123,63,182,0.9)";
        ctx.fillRect(Math.max(0, progressX - 1), 0, 2, cssHeight);
      };

      canvas._renderWave = render;
      render(audio.duration ? audio.currentTime / audio.duration : 0);

      if (!canvas.dataset.boundSeek) {
        canvas.dataset.boundSeek = "1";
        canvas.title = "Click waveform to jump through the song";
        canvas.style.cursor = "pointer";
        canvas.addEventListener("click", (event) => {
          const rect = canvas.getBoundingClientRect();
          const nextProgress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));

          if (audio.duration) {
            audio.currentTime = audio.duration * nextProgress;
            render(nextProgress);
          } else {
            audio.addEventListener("loadedmetadata", () => {
              audio.currentTime = audio.duration * nextProgress;
              render(nextProgress);
            }, { once: true });
          }
        });
      }

      if (!audio.dataset.waveformBound) {
        audio.dataset.waveformBound = "1";
        audio.addEventListener("timeupdate", () => {
          render(audio.duration ? audio.currentTime / audio.duration : 0);
        });
        audio.addEventListener("ended", () => render(1));
        audio.addEventListener("pause", () => {
          render(audio.duration ? audio.currentTime / audio.duration : 0);
        });
      }
    }

    async function drawWaveforms() {
      const canvases = [...document.querySelectorAll(".inline-wave")];
      for (const canvas of canvases) {
        canvas.dataset.drawn = "1";

        const audio = canvas.parentElement?.querySelector("audio");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        const dpr = window.devicePixelRatio || 1;
        const cssWidth = canvas.clientWidth || 900;
        const cssHeight = canvas.clientHeight || 54;
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const fillBase = () => {
          ctx.clearRect(0, 0, cssWidth, cssHeight);
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.fillRect(0, 0, cssWidth, cssHeight);
        };

        fillBase();

        try {
          const url = canvas.dataset.audioUrl;
          if (
            !url ||
            (!url.includes("/uploads/") &&
              !url.startsWith("http"))
          ) {
            throw new Error("Waveform only available for direct audio");
          }

          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioCtx();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

          const left = audioBuffer.getChannelData(0);
          const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

          const data = new Float32Array(left.length);
          for (let i = 0; i < left.length; i++) {
            data[i] = (left[i] + right[i]) * 0.5;
          }

          const samples = 140;
          const blockSize = Math.max(1, Math.floor(data.length / samples));
          const amps = [];

          for (let i = 0; i < samples; i++) {
            const start = i * blockSize;
            const end = Math.min(start + blockSize, data.length);

            let sumSquares = 0;
            let peak = 0;

            for (let j = start; j < end; j++) {
              const v = data[j];
              const abs = Math.abs(v);
              sumSquares += v * v;
              if (abs > peak) peak = abs;
            }

            const length = Math.max(1, end - start);
            const rms = Math.sqrt(sumSquares / length);
            amps.push(rms * 0.8 + peak * 0.2);
          }

          canvas._amps = amps;
          if (audio) bindWaveformToAudio(canvas, audio);
          audioContext.close();
        } catch {
          canvas._amps = Array.from(
            { length: 110 },
            (_, index) => 0.2 + Math.abs(Math.sin(index * 0.18)) * 0.8
          );
          if (audio) bindWaveformToAudio(canvas, audio);
        }
      }
    }

    function autoFillTrackFields() {
      const fileInput = document.getElementById("trackFileInput");
      const sourceUrlInput = document.getElementById("sourceUrlInput");
      const trackNameInput = document.getElementById("trackNameInput");
      const artistInput = document.getElementById("trackArtistInput");

      const applyParsedValues = (rawValue) => {
        if (!rawValue || !trackNameInput) return;

        const cleaned = String(rawValue)
          .replace(/\\.[a-z0-9]+$/i, "")
          .split(/[?#]/)[0]
          .split("/")
          .filter(Boolean)
          .pop()
          ?.replace(/[-_]+/g, " ")
          .replace(/\\s+/g, " ")
          .trim() || "";

        if (!cleaned) return;

        const separatorMatch = cleaned.match(/(.+?)\\s+-\\s+(.+)/);
        if (separatorMatch) {
          if (artistInput && !artistInput.value.trim()) {
            artistInput.value = separatorMatch[1].trim();
          }
          if (!trackNameInput.value.trim()) {
            trackNameInput.value = separatorMatch[2].trim();
          }
          return;
        }

        if (!trackNameInput.value.trim()) {
          trackNameInput.value = cleaned;
        }
      };

      if (fileInput && !fileInput.dataset.bound) {
        fileInput.dataset.bound = "1";
        fileInput.addEventListener("change", () => {
          const file = fileInput.files && fileInput.files[0];
          if (file) applyParsedValues(file.name);
        });
      }

      if (sourceUrlInput && !sourceUrlInput.dataset.bound) {
        sourceUrlInput.dataset.bound = "1";
        sourceUrlInput.addEventListener("change", () => applyParsedValues(sourceUrlInput.value));
        sourceUrlInput.addEventListener("blur", () => applyParsedValues(sourceUrlInput.value));
      }
    }

    async function saveOrder() {
      if (!tracksList) return;
      const order = [...tracksList.querySelectorAll(".track-card")].map((card) => card.dataset.trackId);

      saveOrderBtn.disabled = true;
      saveOrderBtn.textContent = "Saving...";

      try {
        const res = await fetch("/admin/tracks/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ order: JSON.stringify(order) }).toString(),
        });

        if (!res.ok) throw new Error("Failed to save");

        saveOrderBtn.textContent = "Saved";
        saveOrderBtn.classList.add("saved");

        setTimeout(() => {
          saveOrderBtn.textContent = "Save order";
          saveOrderBtn.classList.remove("saved");
        }, 1200);
      } catch {
        saveOrderBtn.textContent = "Save failed";
      } finally {
        saveOrderBtn.disabled = false;
      }
    }

    function bindDeleteTrackForms() {
      document.querySelectorAll("[data-delete-track-form]").forEach((form) => {
        if (form.dataset.bound === "1") return;
        form.dataset.bound = "1";

        form.addEventListener("submit", async (event) => {
          event.preventDefault();

          const ok = window.confirm("Delete this track?");
          if (!ok) return;

          try {
            const response = await fetch(form.action, {
              method: "POST",
            });

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const newTracks = doc.querySelector("#tracksList");
            const currentTracks = document.querySelector("#tracksList");

            if (newTracks && currentTracks) {
              currentTracks.innerHTML = newTracks.innerHTML;
            }

            document.querySelectorAll(".flash, .error").forEach((el) => el.remove());

            const newFlash = doc.querySelector(".flash");
            const newError = doc.querySelector(".error");
            const sub = document.querySelector("p.sub");

            if (newFlash && sub) sub.insertAdjacentElement("afterend", newFlash);
            if (newError && sub) sub.insertAdjacentElement("afterend", newError);

            attachDnD();
            drawWaveforms();
            autoFillTrackFields();
            bindDeleteTrackForms();
          } catch (error) {
            console.error("Delete failed:", error);
          }
        });
      });
    }

    if (saveOrderBtn) {
      saveOrderBtn.addEventListener("click", saveOrder);
    }

    const trackNameInput = document.getElementById("trackNameInput");
    const trackArtistInput = document.getElementById("trackArtistInput");
    const sourceUrlInput = document.getElementById("sourceUrlInput");
    const trackFileInput = document.getElementById("trackFileInput");

    function normalizeLabel(value) {
      return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\\.[a-z0-9]+$/i, "")
        .replace(/\\s+/g, " ")
        .trim();
    }

    function titleCase(value) {
      return normalizeLabel(value)
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }

    function parseFromUrl(url) {
      try {
        const parsed = new URL(url);
        const pathnameParts = parsed.pathname.split("/").filter(Boolean);

        if (parsed.hostname.includes("soundcloud.com")) {
          return {
            artist: pathnameParts[0] ? titleCase(pathnameParts[0]) : "",
            trackName: pathnameParts[1] ? titleCase(pathnameParts[1]) : "",
          };
        }

        if (parsed.hostname.includes("spotify.com")) {
          return {
            artist: "",
            trackName: pathnameParts.at(-1) ? titleCase(pathnameParts.at(-1)) : "Spotify Track",
          };
        }

        if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
          const videoId = parsed.searchParams.get("v") || pathnameParts.at(-1) || "YouTube Track";
          return {
            artist: "",
            trackName: titleCase(videoId),
          };
        }

        return {
          artist: "",
          trackName: pathnameParts.at(-1) ? titleCase(pathnameParts.at(-1)) : "",
        };
      } catch {
        return { artist: "", trackName: titleCase(url) };
      }
    }

    if (trackFileInput && trackNameInput) {
      trackFileInput.addEventListener("change", () => {
        const file = trackFileInput.files && trackFileInput.files[0];
        if (!file) return;
        if (!trackNameInput.value.trim()) {
          trackNameInput.value = titleCase(file.name);
        }
      });
    }

    if (sourceUrlInput && trackNameInput) {
      sourceUrlInput.addEventListener("input", () => {
        const parsed = parseFromUrl(sourceUrlInput.value);
        if (!trackNameInput.value.trim() && parsed.trackName) {
          trackNameInput.value = parsed.trackName;
        }
        if (trackArtistInput && !trackArtistInput.value.trim() && parsed.artist) {
          trackArtistInput.value = parsed.artist;
        }
      });
    }

    function bindBriefStatusForms() {
      document.querySelectorAll(".brief-status-form").forEach((form) => {
        if (form.dataset.bound === "1") return;
        form.dataset.bound = "1";

        form.addEventListener("submit", async (event) => {
          event.preventDefault();

          const formData = new FormData(form);
          const body = new URLSearchParams();

          for (const [key, value] of formData.entries()) {
            body.append(key, String(value));
          }

          const activeOrderLink = document.querySelector(".brief-sort-link.active");
          const order =
            activeOrderLink?.getAttribute("data-brief-order") ||
            new URL(window.location.href).searchParams.get("briefOrder") ||
            "latest";

          try {
            const response = await fetch(form.action, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: body.toString(),
            });

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const newBriefsList = doc.querySelector("#briefsList");
            const currentBriefsList = document.querySelector("#briefsList");

            const newFlash = doc.querySelector(".flash");
            const currentFlash = document.querySelector(".flash");

            const newError = doc.querySelector(".error");
            const currentError = document.querySelector(".error");

            if (currentFlash) currentFlash.remove();
            if (currentError) currentError.remove();

            if (newFlash) {
              const sub = document.querySelector("p.sub");
              if (sub) sub.insertAdjacentElement("afterend", newFlash);
            }

            if (newError) {
              const sub = document.querySelector("p.sub");
              if (sub) sub.insertAdjacentElement("afterend", newError);
            }

            if (newBriefsList && currentBriefsList) {
              currentBriefsList.innerHTML = newBriefsList.innerHTML;
            }

            document.querySelectorAll("[data-brief-order]").forEach((link) => {
              link.classList.toggle(
                "active",
                link.getAttribute("data-brief-order") === order
              );
            });

            bindBriefStatusForms();
            attachDnD();
          } catch (error) {
            console.error("Failed to save brief status:", error);
          }
        });
      });
    }

    function bindAddTrackForm() {
      const form = document.getElementById("addTrackForm");
      if (!form || form.dataset.bound === "1") return;
      form.dataset.bound = "1";

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        try {
          const res = await fetch(form.action, {
            method: "POST",
            body: formData,
          });

          const html = await res.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          const newTracks = doc.querySelector("#tracksList");
          const currentTracks = document.querySelector("#tracksList");

          if (newTracks && currentTracks) {
            currentTracks.innerHTML = newTracks.innerHTML;
          }

          const newFlash = doc.querySelector(".flash");
          const newError = doc.querySelector(".error");

          document.querySelectorAll(".flash, .error").forEach((el) => el.remove());

          if (newFlash) {
            const sub = document.querySelector("p.sub");
            if (sub) sub.insertAdjacentElement("afterend", newFlash);
          }

          if (newError) {
            const sub = document.querySelector("p.sub");
            if (sub) sub.insertAdjacentElement("afterend", newError);
          }

          form.reset();
          attachDnD();
          drawWaveforms();
          autoFillTrackFields();
          bindDeleteTrackForms();
        } catch (err) {
          console.error("Upload failed:", err);
        }
      });
    }

    autoFillTrackFields();
    drawWaveforms();
    bindBriefStatusForms();
    attachDnD();
    bindBriefRequestsPanelCollapse();
    bindAddTrackForm();
    bindDeleteTrackForms();

    document.querySelectorAll("[data-brief-order]").forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();

        const order = el.getAttribute("data-brief-order");
        if (!order) return;

        try {
          const res = await fetch("/admin?briefOrder=" + encodeURIComponent(order));
          const html = await res.text();

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          const newBriefsList = doc.querySelector("#briefsList");
          const currentBriefsList = document.querySelector("#briefsList");

          if (newBriefsList && currentBriefsList) {
            currentBriefsList.innerHTML = newBriefsList.innerHTML;
          }

          document.querySelectorAll("[data-brief-order]").forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("data-brief-order") === order
            );
          });

          const url = new URL(window.location.href);
          url.searchParams.set("briefOrder", order);
          history.replaceState(null, "", url.toString());

          bindBriefStatusForms();
          attachDnD();
        } catch (error) {
          console.error("Failed to sort briefs:", error);
        }
      });
    });
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`DUBSYNC backend running on http://localhost:${PORT}`);
});