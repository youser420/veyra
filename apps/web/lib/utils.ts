import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const scoreColor = (score: number) =>
  score >= 90 ? "#00e5cc" : score >= 75 ? "#f5c842" : "#ff4444";

export const scoreLabel = (score: number) =>
  score >= 90 ? "TRUSTED" : score >= 75 ? "MODERATE" : "RISK";
