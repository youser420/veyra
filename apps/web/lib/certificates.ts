export type CertExpiryStatus = "ok" | "expiring" | "expired";

export function certExpiryStatus(expiresAt?: string | null): CertExpiryStatus | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = ms / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 14) return "expiring";
  return "ok";
}

export function certExpiryLabel(expiresAt?: string | null): string | null {
  const status = certExpiryStatus(expiresAt);
  if (!status || status === "ok") return null;
  if (status === "expired") return "Certificate expired";
  const days = Math.ceil((new Date(expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return `Certificate expires in ${days} day${days === 1 ? "" : "s"}`;
}
