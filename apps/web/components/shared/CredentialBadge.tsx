import { scoreLabel } from "@/lib/utils";

export function CredentialBadge({ certificateId, score, issuedAt }: { certificateId: string; score: number; issuedAt: string }) {
  const issued = new Date(issuedAt);
  const validUntil = new Date(issued.getTime() + 90 * 24 * 60 * 60 * 1000);

  return (
    <div className="rounded-xl border border-gold p-4 font-mono text-gold">
      <p className="mb-4 text-xs tracking-[0.2em]">VEYRA TRUST CERTIFICATE</p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <p>ID: {certificateId}</p>
        <p>Score: {score}</p>
        <p>Issued: {issued.toISOString().slice(0, 10)}</p>
        <p>Valid: {validUntil.toISOString().slice(0, 10)}</p>
      </div>
      <p className="mt-3 text-sm">{scoreLabel(score)}</p>
    </div>
  );
}
