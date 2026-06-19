// ============================================================================
// Pure, framework-free auth crypto. No qwik-city imports — unit-testable in
// plain vitest/Node. Uses only the Web Crypto API (crypto.subtle), available
// on both the Netlify Edge runtime and Node 20.
// ============================================================================

const SESSION_VALUE = "ok";

/**
 * Resolve the signing secret. Returns null when AUTH_SECRET is unset/empty so
 * callers can FAIL CLOSED — never sign or verify with a guessable fallback,
 * which would let anyone forge a session cookie and bypass the password gate.
 */
function getSecret(env: { get: (k: string) => string | undefined }): string | null {
  const secret = env.get("AUTH_SECRET");
  return secret && secret.trim() ? secret : null;
}

async function hmac(value: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function makeToken(secret: string): Promise<string> {
  return `${SESSION_VALUE}.${await hmac(SESSION_VALUE, secret)}`;
}

async function verifyToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [val, sig] = token.split(".");
  if (val !== SESSION_VALUE || !sig) return false;
  const expected = await hmac(SESSION_VALUE, secret);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export { getSecret, makeToken, verifyToken, SESSION_VALUE };
