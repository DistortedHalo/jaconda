import { useEffect, useState } from "react";
import { HomePage } from "./HomePage";
import { LearnMorePage } from "./LearnMorePage";
import { SubmitBriefFlow } from "./components/SubmitBriefFlow";
import type { SiteContent, ViewMode } from "./types";

const defaultContent: SiteContent = {
  homeHero: "Underground\nelectronic\nmusic.\nCleared fast.",
  homeIntro:
    "DUBSYNC CONNECTS BRANDS TO ELECTRONIC MUSIC SUBMITTED ON DUBSELECTOR — OUR DAILY UNDERGROUND LIVESTREAM DELIVERING REAL-TIME COMMUNITY FEEDBACK. ##~3000## NEW TRACKS EACH MONTH. ##~100## HOURS REVIEWED WEEKLY. GET CURRENT MUSIC, NOT CATALOGUE MUSIC.",
  homeSectionTitle: "Music that already\nexists",
  homeSourcingOverlay:
    "DUBSYNC SOURCES MUSIC THAT ALREADY EXISTS ACROSS EMERGING UNDERGROUND SCENES. EVERY TRACK IS SUBMITTED VIA DUBSELECTOR AND SHAPED BY COMMUNITY RESPONSE. OUR LIVESTREAMS ATTRACT MORE THAN ~30K VIEWS EACH MONTH. WHAT COMES THROUGH REFLECTS WHAT'S TRENDING NOW, NOT LAST YEAR.",
  learnHero: "Where ##culture##\nmoves\nfirst",
  learnLibraryHeading: "MUSIC AND TRENDS MOVE FASTER THAN SYSTEMS BUILT TO CONTAIN THEM.",
  learnLibraryBody:
    "DubSync is built around live intake instead of static catalogues.\n\nWe listen to over 100 hours of new music every week, surfaced directly from a global community of emerging electronic and dance producers.\n\nBecause the music already exists culturally, it translates naturally to social and online content — not forced sync music.\n\nDubSync is not a library or a platform. It is a live sourcing layer built for relevance, speed, and taste.",
  footerTagline: "Curated electronic music sourcing",
  footerLocation: "24HR LDN, SF, ATX",
  footerPartnership: "Operated in partnership with underground tastemakers.",
  footerPartners: "DUBSELECTOR / Labels / Observers / Artists",
  rotatingWords: ["on USBs.", "in rooms.", "##in culture.##", "underground.", "online.", "without a brief."],
};

export function App() {
  const [view, setView] = useState<ViewMode>("home");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [content, setContent] = useState<SiteContent>(defaultContent);

  useEffect(() => {
    fetch("/api/site-content")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load site content"))))
      .then((data) => setContent({ ...defaultContent, ...data }))
      .catch(() => setContent(defaultContent));
  }, []);

  const goHome = () => {
    setView("home");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  };

  const goLearnMore = () => {
    setView("learnMore");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  };

  return (
    <>
      {view === "home" ? (
        <HomePage onLearnMore={goLearnMore} onSubmitBrief={() => setSubmitOpen(true)} onHome={goHome} content={content} />
      ) : (
        <LearnMorePage onBack={goHome} onHome={goHome} onSubmitBrief={() => setSubmitOpen(true)} content={content} />
      )}
      <SubmitBriefFlow open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </>
  );
}
