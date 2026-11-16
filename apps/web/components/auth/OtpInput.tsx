"use client";

import { useRef, KeyboardEvent, ClipboardEvent } from "react";

/** One box per digit; the number of boxes is value.length. Paste fills all boxes at once. */
export function OtpInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (digits: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const length = value.length;

  const fill = (raw: string, from: number) => {
    const digits = raw.replace(/\D/g, "").slice(0, length - from);
    if (!digits) return;
    const next = [...value];
    for (let i = 0; i < digits.length; i++) next[from + i] = digits[i];
    onChange(next);
    refs.current[Math.min(from + digits.length, length - 1)]?.focus();
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const onPaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fill(e.clipboardData.getData("text"), index === length - 1 ? 0 : index);
  };

  return (
    <div className="flex justify-center gap-1.5">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1} of ${length}`}
          value={digit}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => onPaste(i, e)}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, "");
            if (typed.length > 1) return fill(typed, i); // browser autofill / fast typing
            const next = [...value];
            next[i] = typed;
            onChange(next);
            if (typed && i < length - 1) refs.current[i + 1]?.focus();
          }}
          className="h-12 w-9 rounded border border-border bg-bg-3 text-center font-mono text-lg focus:border-gold focus:outline-none"
        />
      ))}
    </div>
  );
}
