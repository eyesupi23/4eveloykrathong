/**
 * SHA-256 of the admin code. Only the hash ships in the bundle, so the code isn't readable as plain text.
 * This is a convenience gate, not real security: anyone can bypass client-side checks. When the database
 * is connected, the server must verify the admin before deleting anything.
 */
const ADMIN_HASH = "28351392195443a09c606a98d4687252a67138aedd655bae882b84b87d9dff06";

export async function checkAdminCode(code: string): Promise<boolean> {
  const bytes = new TextEncoder().encode(code.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return hex === ADMIN_HASH;
}
