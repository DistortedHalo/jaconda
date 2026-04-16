import type { SiteContent } from "../types";
import { CornerBrand } from "./CornerBrand";

type FooterProps = {
  onLearnMore?: () => void;
  onHome?: () => void;
  content: SiteContent;
};

export function Footer({ onLearnMore, onHome, content }: FooterProps) {
  return (
    <footer className="border-t border-neutral-900 px-6 py-12">
      <div className="mx-auto grid max-w-7xl gap-8 text-xs text-neutral-700 md:grid-cols-3" style={{ fontFamily: "Inter, sans-serif" }}>
        <div>
          <CornerBrand onClick={onHome} align="left" compact className="mb-4" />
          <p className="text-neutral-800 transition-colors duration-300 hover:text-neutral-400">{content.footerTagline}</p>
          <button type="button" className="mt-3 inline-block text-neutral-600 transition-colors duration-300 hover:text-white" onClick={onLearnMore}>
            → Learn more
          </button>
        </div>
        <div className="md:text-center">
          <a href="mailto:hello@dubsync.com" className="mb-2 block transition-colors duration-300 hover:text-white">
            hello@dubsync.com
          </a>
          <p className="text-neutral-800 transition-colors duration-300 hover:text-neutral-400">{content.footerLocation}</p>
        </div>
        <div className="md:text-right">
          <p className="group cursor-default italic text-neutral-800">
            <span className="transition-colors duration-300 group-hover:text-neutral-400">{content.footerPartnership}</span>
            <br />
            <span className="transition-colors duration-300 group-hover:text-neutral-400">{content.footerPartners}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
