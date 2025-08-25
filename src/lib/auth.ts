export function isAdmin(email?: string | null) {
  if (!email) return false;
  // For MVP, use a public env allowlist. In production, move to server-only checks.
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const list = raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}
