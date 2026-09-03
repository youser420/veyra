"use client";

import { useRef, KeyboardEvent, ClipboardEvent } from "react";

export function OtpInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (digits: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const updateDigit = (index: number, digit: string) => {
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "");
    onChange(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onChange={(e) => updateDigit(i, e.target.value.replace(/\D/g, "").slice(0, 1))}
          className="h-12 w-10 rounded border border-border bg-bg-3 text-center font-mono text-lg focus:border-gold focus:outline-none"
        />
      ))}
    </div>
  );
}
