import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead, Link } from "@builder.io/qwik-city";
import { ResumeApp } from "~/components/ResumeApp";
import { isAuthed } from "~/utils/auth";

/** Server-side: is the visitor logged in? Drives the Edit vs Log-in button. */
export const useHomeAuth = routeLoader$(async (req) => {
  return { authed: await isAuthed(req) };
});

export default component$(() => {
  const auth = useHomeAuth();

  return (
    <ResumeApp canEdit={false}>
      <div q:slot="actions">
        <Link
          href="/editor"
          title={auth.value.authed ? "Edit resume" : "Log in to edit"}
          aria-label={auth.value.authed ? "Edit resume" : "Log in to edit"}
          class="inline-flex items-center justify-center h-9 w-9 rounded-md text-brand-slate hover:bg-brand-mist hover:text-brand-navy transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
        </Link>
      </div>
    </ResumeApp>
  );
});

export const head: DocumentHead = {
  title: "Resume - Isaac Ng",
  meta: [
    { name: "description", content: "Resume of Isaac Ng, Ka Ho — Senior Software Engineer." },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ],
};
