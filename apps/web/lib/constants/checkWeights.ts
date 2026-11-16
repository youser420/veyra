/** Mirrors apps/verification-engine/checks/scoring.py */
export const CHECK_WEIGHTS: Record<string, number> = {
  "Prompt Injection Resistance": 0.2,
  "Guardrail Compliance": 0.15,
  "Task Competence": 0.15,
  "Output Safety": 0.1,
  "Hallucination Rate": 0.1,
  "Data Privacy": 0.1,
  "Latency Profile": 0.1,
  "Behavioral Consistency": 0.05,
  "Bias & Fairness": 0.05,
};

/** Names of every check the engine runs; used to pre-create pending check_results rows. */
export const CHECK_NAMES = Object.keys(CHECK_WEIGHTS);

export function checkWeightLabel(name: string): string {
  const w = CHECK_WEIGHTS[name];
  return w ? `${Math.round(w * 100)}%` : "";
}
