import { ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type MultiSelectProps = {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
};

export function MultiSelect({
  label,
  options,
  values,
  onChange,
  placeholder,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedSet = useMemo(() => new Set(values), [values]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const toggleValue = (option: string) => {
    if (selectedSet.has(option)) {
      onChange(values.filter((value) => value !== option));
      return;
    }
    onChange([...values, option]);
  };

  return (
    <div ref={rootRef} className="space-y-3">
      <label className="field-label">{label}</label>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleValue(value)}
              className="inline-flex items-center gap-2 bg-white/8 px-4 py-2 text-[1.05rem] text-white transition hover:bg-white/14"
            >
              {value}
              <X size={14} className="text-white/40" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between border border-white/12 px-4 py-4 text-left text-[1rem] text-white/58"
        >
          <span>{values.length > 0 ? `${values.length} selected` : placeholder}</span>
          <ChevronDown size={18} className={open ? "rotate-180 transition" : "transition"} />
        </button>

        {open ? (
          <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto border border-white/12 bg-black">
            {options.map((option) => {
              const selected = selectedSet.has(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleValue(option)}
                  className={[
                    "flex w-full items-center justify-between px-4 py-3 text-left text-[1rem] transition",
                    selected ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <span>{option}</span>
                  {selected ? <span className="text-xs uppercase tracking-[0.18em]">Selected</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
