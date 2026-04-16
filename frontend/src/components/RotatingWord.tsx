import { useEffect, useState } from "react";
import { renderMarkedText } from "../textFormat";

export function RotatingWord({ words }: { words: string[] }) {
  const normalized = words.length ? words : ["without a brief."];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setIndex((current) => (current + 1) % normalized.length), 1800);
    return () => window.clearInterval(id);
  }, [normalized.length]);

  return <span className="flash-word">{renderMarkedText(normalized[index])}</span>;
}
