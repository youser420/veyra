"use client";

import { useMemo } from "react";
import { scoreColor } from "@/lib/utils";

export function ScoreRing({ score, size = 72 }: { score: number; size?: 64 | 72 | 80 | 88 | 120 }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = useMemo(() => circumference * (1 - score / 100), [circumference, score]);
  const color = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-[1200ms]"
        />
      </svg>
      <div className="absolute text-center font-mono">
        <div className="text-sm text-text">{score}</div>
        <div className="text-[9px] tracking-[0.2em] text-text-2">SCORE</div>
      </div>
    </div>
  );
}
