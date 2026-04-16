import type { ReactNode } from "react";

export function renderMarkedText(input: string, className = "flash-word"): ReactNode[] {
  const text = String(input ?? "");
  const parts: ReactNode[] = [];
  const regex = /##\{([^}]+)\}##|##([^#]+)##/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const word = match[1] ?? match[2] ?? "";
    parts.push(
      <span key={`${word}-${match.index}`} className={className} style={{ fontFamily: "Space Grotesk" }}>
        {word}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function renderMultilineMarkedText(text: string) {
  return text.split("\n").map((line, index) => (
    <span key={index} className="block">
      {renderMarkedText(line)}
    </span>
  ));
}
