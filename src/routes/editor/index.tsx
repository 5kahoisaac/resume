import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead, Form, Link } from "@builder.io/qwik-city";
import { ResumeApp } from "~/components/ResumeApp";
import { isAuthed, loginAction, logoutAction } from "~/utils/auth";

/**
 * Server-side auth gate. Runs on every request to /editor BEFORE render.
 * If the session cookie isn't valid we render a login form instead of the
 * editor — the editing UI is never sent to the client for anonymous users
 * (physically absent, not CSS-hidden).
 */
export const useAuth = routeLoader$(async (req) => {
  return { authed: await isAuthed(req) };
});

export const useLogin = loginAction;
export const useLogout = logoutAction;

export default component$(() => {
  const auth = useAuth();
  const login = useLogin();
  const logout = useLogout();

  // Anonymous → login form. The editor markup below is never rendered (and so
  // never serialized to the client) for unauthenticated visitors.
  if (!auth.value.authed) {
    return (
      <div class="min-h-screen bg-brand-mist flex items-center justify-center p-6">
        <div class="w-full max-w-sm bg-white rounded-2xl shadow-paper border border-brand-rule p-7">
          <div class="flex items-center gap-2.5 mb-5">
            <div class="h-9 w-9 rounded-lg bg-brand-orange flex items-center justify-center font-display font-bold text-white">R</div>
            <div>
              <div class="font-display font-semibold text-brand-navy text-base leading-tight">Resume Forge</div>
              <div class="font-mono text-[10px] text-brand-slate uppercase tracking-wider">Editor access</div>
            </div>
          </div>
          <h1 class="font-display text-lg font-semibold text-brand-navy mb-1">Log in to edit</h1>
          <p class="text-sm text-brand-slate mb-5">Enter the editor password to make changes. Viewing is open to everyone.</p>
          <Form action={login} class="space-y-3">
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              class="field-input"
            />
            {login.value?.failed && (
              <p class="text-sm text-red-600">{login.value.message ?? "Incorrect password."}</p>
            )}
            <button
              type="submit"
              class="w-full bg-brand-orange text-white font-medium rounded-md py-2.5 hover:bg-brand-orange/90 transition-colors"
            >
              Log in
            </button>
          </Form>
          <Link href="/" class="block text-center text-sm text-brand-slate hover:text-brand-navy mt-4">
            ← Back to preview
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated → full editor with View + Log out actions in the toolbar.
  return (
    <ResumeApp canEdit={true}>
      <div q:slot="actions" class="flex items-center gap-2">
        <Link
          href="/"
          title="Back to preview"
          aria-label="Back to preview"
          class="inline-flex items-center justify-center h-9 w-9 rounded-md text-brand-slate hover:bg-brand-mist hover:text-brand-navy transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </Link>
        <Form action={logout}>
          <button
            type="submit"
            title="Log out"
            aria-label="Log out"
            class="inline-flex items-center justify-center h-9 w-9 rounded-md text-brand-slate hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </Form>
      </div>
    </ResumeApp>
  );
});

export const head: DocumentHead = {
  title: "Edit — Resume Forge",
  meta: [{ name: "robots", content: "noindex" }],
};
