import { globalAction$, zod$, z, type RequestEventLoader, type RequestEventAction } from "@builder.io/qwik-city";

// ============================================================================
// Minimal server-side auth.
// ----------------------------------------------------------------------------
// EDITOR_PASSWORD lives ONLY in the server environment and is never shipped to
// the client. On successful login we set an httpOnly, signed session cookie;
// /editor checks it server-side via isAuthed() before rendering, so the editing
// UI is physically absent for anonymous visitors.
//
// Signed with AUTH_SECRET via the Web Crypto API (HMAC-SHA256) — available in
// the Netlify Edge runtime, so nothing here pulls in node:crypto and the
// client bundle stays clean.
// ============================================================================

const COOKIE_NAME = "rf_session";
const SESSION_VALUE = "ok";

function getSecret(env: { get: (k: string) => string | undefined }): string {
  return env.get("AUTH_SECRET") || "dev-insecure-secret-change-me";
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

/** Check the request's session cookie. Call from routeLoader$ (server-side). */
export async function isAuthed(req: RequestEventLoader | RequestEventAction): Promise<boolean> {
  const token = req.cookie.get(COOKIE_NAME)?.value;
  return verifyToken(token, getSecret(req.env));
}

/** Login action — validates password against EDITOR_PASSWORD env var. */
export const loginAction = globalAction$(
  async (data, req) => {
    const expected = req.env.get("EDITOR_PASSWORD");
    if (!expected) {
      return req.fail(500, { message: "Server has no EDITOR_PASSWORD configured." });
    }
    if (data.password !== expected) {
      return req.fail(401, { message: "Incorrect password." });
    }
    const token = await makeToken(getSecret(req.env));
    req.cookie.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    throw req.redirect(302, "/editor");
  },
  zod$({ password: z.string().min(1) }),
);

/** Logout action — clears the session cookie. */
export const logoutAction = globalAction$(async (_data, req) => {
  req.cookie.delete(COOKIE_NAME, { path: "/" });
  throw req.redirect(302, "/");
});
