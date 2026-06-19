import { globalAction$, zod$, z, type RequestEventLoader, type RequestEventAction } from "@builder.io/qwik-city";
import { getSecret, makeToken, verifyToken } from "./auth-crypto";

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
// client bundle stays clean. The pure crypto helpers live in auth-crypto.ts
// (no qwik-city import) so they can be unit-tested in plain vitest/Node.
// ============================================================================

const COOKIE_NAME = "rf_session";

/** Check the request's session cookie. Call from routeLoader$ (server-side). */
export async function isAuthed(req: RequestEventLoader | RequestEventAction): Promise<boolean> {
  const secret = getSecret(req.env);
  if (!secret) return false; // no secret configured → no session is valid (fail closed)
  const token = req.cookie.get(COOKIE_NAME)?.value;
  return verifyToken(token, secret);
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
    const secret = getSecret(req.env);
    if (!secret) {
      return req.fail(500, { message: "Server has no AUTH_SECRET configured." });
    }
    const token = await makeToken(secret);
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
