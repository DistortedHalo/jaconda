import { ArrowLeft } from "lucide-react";
import { livestreamStats } from "./data";
import { Footer } from "./components/Footer";
import { FadeIn } from "./components/FadeIn";
import { LogoStamp } from "./components/LogoStamp";
import { renderMultilineMarkedText } from "./textFormat";
import type { SiteContent } from "./types";

type LearnMorePageProps = {
  onBack: () => void;
  onHome: () => void;
  onSubmitBrief?: () => void;
  content: SiteContent;
};

export function LearnMorePage({ onBack, onHome, content }: LearnMorePageProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <LogoStamp onClick={onHome} />

      <div className="container-shell flex items-center justify-start py-8">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-white/36 transition hover:text-white">
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <main>
        <section className="px-0 py-10 md:py-16">
          <div className="container-shell">
            <FadeIn>
              <h1 className="massive-title max-w-6xl">{renderMultilineMarkedText(content.learnHero)}</h1>
            </FadeIn>
          </div>
        </section>

        <section className="full-bleed overflow-hidden">
          <div className="relative h-[40vh] md:h-[55vh]">
            <img
              src="/images/g.jpg"
              alt="Fast moving culture"
              className="absolute inset-0 h-full w-full object-cover scale-[1.05]"
            />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute right-8 top-8 text-right md:right-16 md:top-12">
              <div className="text-[3rem] md:text-[6rem] tracking-[-0.06em]">~60–100</div>
              <div className="mt-3 text-white/80">curated tracks active at any time</div>
            </div>
          </div>
        </section>

        <section className="px-0 py-24 md:py-32">
          <div className="container-shell">
            <FadeIn>
              <h2 className="massive-title">
                LIVE-STREAM DATA
                <br />
                (DEC 25’)
              </h2>
            </FadeIn>

            <div className="mt-16 grid gap-8 md:grid-cols-5">
              {livestreamStats.map((stat, i) => (
                <FadeIn key={stat.label} delay={i * 0.05}>
                  <div>
                    <div className="text-2xl text-white md:text-3xl">{stat.value}</div>
                    <div className="mt-2 text-white/40">{stat.label}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="full-bleed overflow-hidden">
          <div className="relative h-[70vh] md:h-[80vh]">
            <img
              src="/images/h.jpg"
              alt="Trees spinning"
              className="absolute inset-0 h-full w-full object-cover scale-[1.05] opacity-90"
            />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute left-8 top-12 max-w-[700px] md:left-16 md:top-20">
              <h2 className="huge-title">
                NOT A LIBRARY
                <br />
                (NOT A PLATFORM)
                <br />
                WHAT IS IT?
              </h2>

              <p className="mt-10 text-xs uppercase leading-[1.7] tracking-[0.22em] text-white/50">
                A LIVE SOURCING AND CURATION LAYER BETWEEN ELECTRONIC MUSIC CULTURE AND COMMERCIAL PRODUCTION, THROUGH DAILY LIVE PUBLIC LISTENING SESSIONS AND REAL-TIME COMMUNITY SUBMISSION.
              </p>
            </div>
          </div>
        </section>

        <section className="full-bleed overflow-hidden">
          <div className="relative min-h-[90vh]">
            <img
              src="/images/i.jpg"
              alt="Blurred motion"
              className="absolute inset-0 h-full w-full object-cover scale-[1.05]"
            />
            <div className="absolute inset-0 bg-black/70" />

            <div className="relative z-10 container-shell py-24 md:py-32">
              <h3 className="max-w-[900px] text-[2rem] font-semibold uppercase leading-[1.18] tracking-[-0.04em] md:text-[3rem]">
                {content.learnLibraryHeading}
              </h3>

              <div className="mt-20 max-w-[720px] space-y-10 text-[1.1rem] leading-9 text-white/60">
                {content.learnLibraryBody
                  .split(/\n\n+/)
                  .filter(Boolean)
                  .map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer onLearnMore={onBack} onHome={onHome} content={content} />
    </div>
  );
}
