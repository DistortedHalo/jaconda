import { motion } from "framer-motion";

type CornerBrandProps = {
  onClick?: () => void;
  align?: "right" | "left";
  compact?: boolean;
  className?: string;
};

export function CornerBrand({
  onClick,
  align = "right",
  compact = false,
  className = "",
}: CornerBrandProps) {
  const alignClasses = align === "right" ? "items-end text-right" : "items-start text-left";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group inline-flex select-none flex-col",
        alignClasses,
        className,
      ].join(" ")}
      aria-label="DubSync home"
    >
      <motion.span
        initial={{ opacity: 0, y: -14, filter: "blur(10px)", letterSpacing: compact ? "0.46em" : "0.54em" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: compact ? "0.36em" : "0.42em" }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        className={[
          "brand-wordmark whitespace-nowrap font-medium uppercase leading-none text-white transition-all duration-300",
          compact
            ? "text-[0.92rem] md:text-[1rem] group-hover:tracking-[0.4em]"
            : "text-[1rem] md:text-[1.08rem] group-hover:tracking-[0.46em]",
        ].join(" ")}
        style={{ fontFamily: "Space Grotesk, sans-serif" }}
      >
        DUBSYNC
      </motion.span>
    </button>
  );
}
