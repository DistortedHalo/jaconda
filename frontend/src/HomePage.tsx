import { motion } from "framer-motion";
import { ArrowUpRight, Mail, MessageCircle, Pause, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Footer } from "./components/Footer";
import { CornerBrand } from "./components/CornerBrand";
import { RotatingWord } from "./components/RotatingWord";
import { TrackList } from "./components/TrackList";
import { renderMarkedText, renderMultilineMarkedText } from "./textFormat";
import type { HomeActionHandlers } from "./types";

const evidenceCards = [
  { label: "Community", asset: "/images/a.jpeg", ratio: "16 / 9", widthClass: "w-[min(78vw,34rem)]", objectPosition: "center 38%" },
  { label: "Product", asset: "/images/b.jpg", ratio: "16 / 9", widthClass: "w-[min(78vw,34rem)]", objectPosition: "center 48%" },
  { label: "Movement", asset: "/images/c.jpg", ratio: "16 / 9", widthClass: "w-[min(78vw,34rem)]", objectPosition: "center center" },
  { label: "Taste", asset: "/images/d.jpeg", ratio: "16 / 9", widthClass: "w-[min(78vw,34rem)]", objectPosition: "center 38%" },
  { label: "Direction", asset: "/images/e.jpeg", ratio: "16 / 9", widthClass: "w-[min(78vw,34rem)]", objectPosition: "center 42%" },
  { label: "Casting", asset: "/images/f.jpg", ratio: "16 / 9", widthClass: "w-[min(78vw,34rem)]", objectPosition: "center 42%" },
  { label: "Detail", asset: "/images/g.jpg", ratio: "16 / 9", widthClass: "w-[min(78vw,34rem)]", objectPosition: "center 52%" },
  { label: "Street", asset: "/images/h.jpg", ratio: "16 / 9", widthClass: "w-[min(78vw,34rem)]", objectPosition: "center 44%" },
  { label: "Energy", asset: "/images/i.jpg", ratio: "16 / 9", widthClass: "w-[min(78vw,34rem)]", objectPosition: "center 40%" },
] as const;

const statBlocks: Array<{ value: string; label: string; className: string; kicker?: boolean }> = [
  {
    value: "100+",
    label: "hours of music listened to every week",
    className: "absolute left-0 top-0 max-w-xs md:left-[5%]",
  },
  {
    value: "8,000",
    label: "tracks submitted in Q4-2025",
    className: "absolute right-0 top-[14vh] max-w-xs text-right md:right-[10%]",
  },
  {
    value: "100%",
    label: "Filtered live, by hand",
    className: "absolute left-0 top-[42vh] max-w-xs md:left-[18%]",
    kicker: true,
  },
  {
    value: "~60–100",
    label: "curated tracks active at any time",
    className: "absolute right-0 top-[72vh] max-w-sm text-right md:right-[4%] md:top-auto md:bottom-0",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function ArrowAction({
  children,
  onClick,
  muted = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  muted?: boolean;
}) {
  const classes = [
    "inline-flex items-center gap-2 text-base transition-all duration-300 hover:translate-x-2",
    muted ? "text-neutral-500 hover:text-neutral-300" : "text-white",
  ].join(" ");

  return (
    <button type="button" onClick={onClick} className={classes} style={{ fontFamily: "Inter, sans-serif" }}>
      <span aria-hidden>→</span>
      {children}
    </button>
  );
}

function OutlineAction({
  icon: Icon,
  children,
  onClick,
  href,
}: {
  icon: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "inline-flex items-center gap-2 whitespace-nowrap border border-neutral-800 bg-transparent px-6 py-3 text-sm text-white transition-colors hover:bg-neutral-900";

  if (href) {
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className={className} style={{ fontFamily: "Inter, sans-serif" }}>
        <Icon className="h-4 w-4" /> {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={{ fontFamily: "Inter, sans-serif" }}>
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

export function HomePage({ onLearnMore, onSubmitBrief, onHome, content }: HomeActionHandlers) {
  const introContent = useMemo(() => renderMarkedText(content.homeIntro, "hero-flash"), [content.homeIntro]);
  const sourcingParagraphs = useMemo(
    () => String(content.homeSourcingOverlay || "").split(/\n+/).filter(Boolean),
    [content.homeSourcingOverlay],
  );
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [carouselInView, setCarouselInView] = useState(false);
  const [carouselHovered, setCarouselHovered] = useState(false);
  const duplicatedEvidenceCards = useMemo(() => [...evidenceCards, ...evidenceCards], []);

  useEffect(() => {
    const node = carouselRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setCarouselInView(entry.isIntersecting && entry.intersectionRatio > 0.35),
      { threshold: [0, 0.35, 0.6] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = carouselRef.current;
    if (!node) return;

    let frame = 0;
    let lastTime = 0;

    const tick = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      if (carouselInView && !carouselHovered) {
        const loopWidth = node.scrollWidth / 2;
        node.scrollLeft += delta * 0.012;

        if (loopWidth > 0 && node.scrollLeft >= loopWidth) {
          node.scrollLeft -= loopWidth;
        }
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [carouselInView, carouselHovered]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white antialiased">
      <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.015] mix-blend-overlay" />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20">
        <CornerBrand onClick={onHome} className="absolute right-6 top-8 z-20 md:right-12" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="mb-32">
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="mb-12 max-w-[12ch] text-[clamp(3rem,12vw,14rem)] leading-[0.84] tracking-[-0.08em]"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              {renderMultilineMarkedText(content.homeHero)}
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
              className="mb-8 ml-0 max-w-3xl cursor-default text-xs uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-white md:ml-32"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {introContent}
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.18 }}
              className="ml-0 flex max-w-md flex-col gap-6 md:ml-32 sm:flex-row"
            >
              <ArrowAction onClick={onSubmitBrief}>Submit brief</ArrowAction>
              <ArrowAction onClick={onLearnMore} muted>
                Learn more
              </ArrowAction>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden pt-8 pb-16">
        <div className="mx-auto mb-12 max-w-7xl px-6">
          <div className="flex items-end justify-between gap-6 border-b border-white/8 pb-4">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-700" style={{ fontFamily: "Inter, sans-serif" }}>
              Evidence / Visual references
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600" style={{ fontFamily: "Inter, sans-serif" }}>
              Drag horizontally
            </p>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="editorial-scrollbar flex items-start gap-3 overflow-x-auto px-6 pb-3 cursor-grab active:cursor-grabbing md:gap-4"
          onMouseEnter={() => setCarouselHovered(true)}
          onMouseLeave={() => setCarouselHovered(false)}
        >
          {duplicatedEvidenceCards.map((card, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: index * 0.04 }}
              key={`${card.label}-${index}`}
              className={["group relative flex-shrink-0", card.widthClass].join(" ")}
              style={{ aspectRatio: card.ratio }}
            >
              <div className="relative h-full w-full overflow-hidden bg-neutral-950">
                <img
                  src={card.asset}
                  alt={card.label}
                  draggable={false}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  style={{ objectPosition: card.objectPosition, filter: "saturate(0.84) contrast(0.96) brightness(0.94)" }}
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
                  style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)" }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative flex min-h-[70vh] items-center py-32">
        <div className="relative w-full">
          <div className="relative mx-auto max-w-7xl px-6">
            <div className="text-[clamp(2.5rem,8vw,7rem)] leading-[0.95] tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                {renderMultilineMarkedText(content.homeSectionTitle)}
              </motion.div>
              <div className="relative mt-2 min-h-[1.2em] text-neutral-300">
                <RotatingWord words={content.rotatingWords} />
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.4 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="absolute -bottom-8 left-0 rounded bg-neutral-800/60 px-3 py-1.5 text-base text-white backdrop-blur-sm"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <Pause className="h-4 w-4" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mt-24 flex max-w-7xl gap-1.5 px-6"
          >
            {Array.from({ length: 10 }).map((_, item) => (
              <div
                key={item}
                className="h-px transition-all duration-500 ease-out"
                style={{
                  width: item === 0 ? 40 : 16,
                  backgroundColor: item === 0 ? "rgb(255,255,255)" : "rgb(64,64,64)",
                  opacity: item === 0 ? 1 : 0.25,
                }}
              />
            ))}
          </motion.div>

          <div className="mx-auto mt-14 grid max-w-7xl gap-12 px-6 md:grid-cols-12">
            <div className="md:col-span-6 md:col-start-6">
              {sourcingParagraphs.map((paragraph, index) => (
                <motion.p
                  key={`${index}-${paragraph.slice(0, 16)}`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.55, delay: index * 0.06 }}
                  className={index === 0 ? "max-w-xl text-[15px] leading-relaxed text-neutral-300" : "mt-8 max-w-xl text-[15px] leading-relaxed text-neutral-300"}
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {paragraph}
                </motion.p>
              ))}
              <button type="button" onClick={onLearnMore} className="mt-10 inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-neutral-500 transition hover:text-white" style={{ fontFamily: "Inter, sans-serif" }}>
                <span aria-hidden>→</span> Open Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-900 px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-3 md:col-start-2">
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-0 text-xs uppercase tracking-[0.2em] text-neutral-700 md:mt-8 md:-rotate-90 md:origin-top-left"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Example tracks we pitch
              </motion.p>
            </div>
            <div className="md:col-span-7">
              <TrackList />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-32">
        <div className="absolute inset-0">
          <img src="/data-bg.svg" alt="" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="relative min-h-[120vh] md:min-h-[70vh]">
            {statBlocks.map((block, index) => (
              <motion.div
                key={block.value}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className={block.className}
              >
                {block.kicker ? (
                  <p className="mb-4 text-sm italic text-neutral-400" style={{ fontFamily: "Inter, sans-serif" }}>
                    {block.label}
                  </p>
                ) : null}
                <p className={[block.kicker ? "text-[clamp(2rem,6vw,5rem)]" : "text-[clamp(3rem,8vw,7rem)]", "mb-2 leading-none tracking-tighter"].join(" ")} style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  {block.value}
                </p>
                {!block.kicker ? (
                  <p className="text-sm text-neutral-300" style={{ fontFamily: "Inter, sans-serif" }}>
                    {block.label}
                  </p>
                ) : null}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-48 pt-48">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20">
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-24 text-[clamp(3rem,10vw,12rem)] leading-[0.85] tracking-tighter"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              Submit
              <br />
              brief.
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <OutlineAction icon={ArrowUpRight} onClick={onSubmitBrief}>Submit brief</OutlineAction>
              <OutlineAction icon={Mail} href="mailto:hello@dubsync.com">Email</OutlineAction>
              <OutlineAction icon={MessageCircle} href="https://wa.me/">Whatsapp</OutlineAction>
              <OutlineAction icon={ArrowUpRight} onClick={onLearnMore}>Learn More</OutlineAction>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer onLearnMore={onLearnMore} onHome={onHome} content={content} />
    </div>
  );
}
