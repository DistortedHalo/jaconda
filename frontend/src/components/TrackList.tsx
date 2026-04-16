import { Pause, Play, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Track } from "../types";

function detectSourceType(url: string): Track["sourceType"] {
  const lowered = url.toLowerCase();
  if (lowered.includes("soundcloud.com")) return "soundcloud";
  if (lowered.includes("spotify.com")) return "spotify";
  if (lowered.includes("youtube.com") || lowered.includes("youtu.be")) return "youtube";
  const audioLike = /\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/i.test(lowered) || lowered.includes("/uploads/");
  return audioLike ? "audio" : "embed";
}

function toEmbedUrl(url: string, sourceType: Track["sourceType"]) {
  if (sourceType === "soundcloud") {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&visual=false`;
  }
  if (sourceType === "spotify") {
    if (url.includes("/embed/")) return url;
    return url.replace("open.spotify.com/", "open.spotify.com/embed/");
  }
  if (sourceType === "youtube") {
    try {
      const parsed = new URL(url);
      let videoId = "";
      if (parsed.hostname.includes("youtu.be")) videoId = parsed.pathname.replace("/", "");
      else videoId = parsed.searchParams.get("v") || "";
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    } catch {
      return url;
    }
  }
  return url;
}

function WaveformCanvas({
  audioUrl,
  active,
  progress,
  onSeek,
}: {
  audioUrl: string;
  active: boolean;
  progress: number;
  onSeek: (nextProgress: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const amplitudesRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.clientWidth || 900;
      const cssHeight = canvas.clientHeight || 48;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const fillBase = () => {
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      };

      const renderBars = () => {
        fillBase();
        const amps = amplitudesRef.current;
        if (!amps.length) return;
        const max = Math.max(...amps, 0.0001);
        const barWidth = cssWidth / amps.length;
        const progressX = Math.max(0, Math.min(cssWidth, cssWidth * progress));

        amps.forEach((amp, i) => {
          const norm = amp / max;
          const h = Math.max(2, norm * (cssHeight - 10));
          const x = i * barWidth;
          const y = (cssHeight - h) / 2;
          const barCenter = x + barWidth * 0.5;
          ctx.fillStyle = barCenter <= progressX
            ? "rgba(255,255,255,0.95)"
            : active
              ? "rgba(255,255,255,0.45)"
              : "rgba(255,255,255,0.18)";
          ctx.fillRect(x + 0.7, y, Math.max(1, barWidth - 1.4), h);
        });

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillRect(Math.max(0, progressX - 0.5), 0, 1, cssHeight);
      };

      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
        const data = new Float32Array(left.length);
        for (let i = 0; i < left.length; i++) data[i] = (left[i] + right[i]) * 0.5;

        const samples = 180;
        const blockSize = Math.max(1, Math.floor(data.length / samples));
        const amps: number[] = [];
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
        amplitudesRef.current = amps;
        if (!cancelled) renderBars();
        audioContext.close();
      } catch {
        amplitudesRef.current = Array.from({ length: 110 }, (_, index) => 0.2 + Math.abs(Math.sin(index * 0.18)) * 0.8);
        if (!cancelled) renderBars();
      }
    }

    draw();
    return () => { cancelled = true; };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || amplitudesRef.current.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 900;
    const cssHeight = canvas.clientHeight || 48;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const amps = amplitudesRef.current;
    const max = Math.max(...amps, 0.0001);
    const barWidth = cssWidth / amps.length;
    const progressX = Math.max(0, Math.min(cssWidth, cssWidth * progress));

    amps.forEach((amp, i) => {
      const norm = amp / max;
      const h = Math.max(2, norm * (cssHeight - 10));
      const x = i * barWidth;
      const y = (cssHeight - h) / 2;
      const barCenter = x + barWidth * 0.5;
      ctx.fillStyle = barCenter <= progressX
        ? "rgba(255,255,255,0.95)"
        : active
          ? "rgba(255,255,255,0.45)"
          : "rgba(255,255,255,0.18)";
      ctx.fillRect(x + 0.7, y, Math.max(1, barWidth - 1.4), h);
    });

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(Math.max(0, progressX - 0.5), 0, 1, cssHeight);
  }, [progress, active]);

  return (
    <canvas
      ref={canvasRef}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const nextProgress = (event.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(1, nextProgress)));
      }}
      className="mt-4 h-12 w-full cursor-pointer"
      title="Click waveform to jump"
    />
  );
}

export function TrackList() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [progressById, setProgressById] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tracks");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load tracks: ${res.status} ${text}`);
      }
      const data = await res.json();
      const normalized: Track[] = data.map((track: Track) => {
        const sourceType = track.sourceType || detectSourceType(track.audioUrl);
        return { ...track, sourceType, waveformSource: sourceType === "audio" ? track.audioUrl : undefined };
      });
      setTracks(normalized);
    } catch (error) {
      console.error("Failed to load tracks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTracks(); }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setActiveId(null);
  };

  const bindAudioEvents = (audio: HTMLAudioElement, trackId: string) => {
    audio.ontimeupdate = () => {
      const nextProgress = audio.duration ? audio.currentTime / audio.duration : 0;
      setProgressById((current) => ({ ...current, [trackId]: nextProgress }));
    };
    audio.onended = () => {
      setActiveId(null);
      setProgressById((current) => ({ ...current, [trackId]: 1 }));
    };
  };

  const toggleTrack = async (track: Track) => {
    if (track.sourceType !== "audio") {
      stopAudio();
      setActiveEmbedId((current) => (current === track.id ? null : track.id));
      return;
    }
    setActiveEmbedId(null);
    if (!audioRef.current) {
      const nextAudio = new Audio(track.audioUrl);
      audioRef.current = nextAudio;
      bindAudioEvents(nextAudio, track.id);
      await nextAudio.play();
      setActiveId(track.id);
      return;
    }
    if (activeId === track.id) {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setActiveId(track.id);
      } else {
        audioRef.current.pause();
        setActiveId(null);
      }
      return;
    }
    audioRef.current.pause();
    const nextAudio = new Audio(track.audioUrl);
    audioRef.current = nextAudio;
    bindAudioEvents(nextAudio, track.id);
    await nextAudio.play();
    setActiveId(track.id);
  };

  const handleSeek = async (track: Track, nextProgress: number) => {
    if (track.sourceType !== "audio") return;
    setProgressById((current) => ({ ...current, [track.id]: nextProgress }));
    if (!audioRef.current || activeId !== track.id) {
      const nextAudio = new Audio(track.audioUrl);
      audioRef.current = nextAudio;
      bindAudioEvents(nextAudio, track.id);
      nextAudio.addEventListener(
        "loadedmetadata",
        async () => {
          nextAudio.currentTime = (nextAudio.duration || 0) * nextProgress;
          await nextAudio.play();
          setActiveId(track.id);
        },
        { once: true },
      );
      return;
    }
    const currentAudio = audioRef.current;
    if (currentAudio.duration) currentAudio.currentTime = currentAudio.duration * nextProgress;
  };

  return (
    <div className="editorial-scrollbar max-h-[600px] overflow-y-auto pr-4 space-y-0">
      <div className="mb-8 flex items-center justify-between border-b border-neutral-900 pb-4">
        <div className="text-xs uppercase tracking-[0.22em] text-neutral-600" style={{ fontFamily: "Inter, sans-serif" }}>
          Live track shortlist
        </div>
        <button
          type="button"
          onClick={loadTracks}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-neutral-500 transition hover:text-white"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-sm text-neutral-500" style={{ fontFamily: "Inter, sans-serif" }}>Loading tracks...</div>
      ) : (
        tracks.map((track, index) => {
          const isPlaying = activeId === track.id || activeEmbedId === track.id;
          const isExternal = track.sourceType !== "audio";
          const title = track.trackName || track.code;
          const progress = progressById[track.id] ?? 0;

          return (
            <div key={track.id} className="track-row group border-b border-neutral-900 py-5 transition-colors hover:border-neutral-700">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => toggleTrack(track)}
                  className="track-play flex h-6 w-6 items-center justify-center opacity-0 transition-opacity"
                  aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm tracking-tight md:text-base" style={{ fontFamily: "Space Grotesk, monospace" }}>
                    {title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-600" style={{ fontFamily: "Inter, sans-serif" }}>
                    <span>{track.artist}</span>
                    {track.mood ? <span>{track.mood}</span> : null}
                    {track.bpm ? <span>{track.bpm} BPM</span> : null}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-xs text-neutral-700" style={{ fontFamily: "Space Grotesk, monospace" }}>
                  {track.duration}
                </span>
              </div>

              {track.waveformSource ? (
                <WaveformCanvas audioUrl={track.waveformSource} active={activeId === track.id} progress={progress} onSeek={(nextProgress) => handleSeek(track, nextProgress)} />
              ) : null}

              {isExternal && activeEmbedId === track.id ? (
                <div className="mt-4 overflow-hidden border border-neutral-900 bg-black">
                  <iframe
                    title={`${title} player`}
                    src={toEmbedUrl(track.audioUrl, track.sourceType)}
                    className="h-[166px] w-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                  />
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
