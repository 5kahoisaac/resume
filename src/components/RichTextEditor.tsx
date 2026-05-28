import {
  component$,
  useSignal,
  useVisibleTask$,
  useTask$,
  type QRL,
  type NoSerialize,
  noSerialize,
} from "@builder.io/qwik";

// ============================================================================
// RichTextEditor — a Qwik wrapper around TinyMCE.
// ----------------------------------------------------------------------------
// Implementation notes:
// - TinyMCE has an official framework-agnostic *web component* shipped at
//   https://cdn.jsdelivr.net/npm/@tinymce/tinymce-webcomponent/dist/tinymce-webcomponent.min.js
//   It loads TinyMCE from Tiny Cloud under the GPL "no-api-key" mode, which
//   shows a small footer notice but is fully functional and free.
// - We lazy-load the loader once at module scope (a global Promise) so that
//   multiple editors on a page share a single download.
// - Qwik can't track DOM-internal mutations, so we listen for "change" and
//   "input" events from the editor element and forward the HTML upstream via
//   the `onChange$` QRL callback. The parent owns the source of truth.
// - We do NOT bind `value` reactively after mount — TinyMCE owns the DOM
//   while it's mounted. We seed the initial value with the `initial-value`
//   attribute and treat the editor as uncontrolled from that point on. If
//   the parent's value resets (e.g. on JSON import) we re-key the editor
//   from outside, which re-mounts it cleanly.
// ============================================================================

// Single shared loader. Resolves when <tinymce-editor> is defined globally.
let _loadPromise: Promise<void> | null = null;
function loadTinyMce(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).customElements?.get("tinymce-editor")) {
    return Promise.resolve();
  }
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-tinymce-webcomponent]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("TinyMCE failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@tinymce/tinymce-webcomponent@2/dist/tinymce-webcomponent.min.js";
    script.async = true;
    script.dataset.tinymceWebcomponent = "true";
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () =>
      reject(new Error("Failed to load TinyMCE web component")),
    );
    document.head.appendChild(script);
  });
  return _loadPromise;
}

/**
 * Resolve the TinyMCE Cloud API key.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time, so the key lives in the
 * client bundle. That's the standard pattern for Tiny Cloud's frontend usage —
 * the key is domain-scoped, not a secret, and Tiny's docs recommend exactly
 * this approach. To set it:
 *
 *   1. Sign up at https://www.tiny.cloud/auth/signup/ (free tier is fine)
 *   2. Copy your API key from the dashboard
 *   3. Create `.env.local` at the project root with:
 *        VITE_TINYMCE_API_KEY=your-key-here
 *   4. Restart `npm run dev`
 *
 * Without a key we fall back to `"no-api-key"` — the editor still works (it
 * loads from Tiny Cloud under the GPL open-source licence) but shows a small
 * notice banner. Both modes are free.
 */
function resolveTinyMceApiKey(): string {
  // `import.meta.env.VITE_TINYMCE_API_KEY` is declared in src/vite-env.d.ts
  // and inlined by Vite at build time.
  const key = import.meta.env.VITE_TINYMCE_API_KEY;
  if (typeof key === "string" && key.trim() && key.trim() !== "no-api-key") {
    return key.trim();
  }
  return "no-api-key";
}

interface Props {
  value: string;
  onChange$: QRL<(html: string) => void>;
  /** Smaller toolbar for short fields like a single description line */
  variant?: "compact" | "full";
  placeholder?: string;
  /** Approximate editor height in pixels (TinyMCE rounds up). */
  height?: number;
  /** Theme colors for the editor iframe content (links use accent, body text). */
  accent?: string;
  text?: string;
}

export const RichTextEditor = component$<Props>((props) => {
  const wrapperRef = useSignal<HTMLDivElement>();
  const ready = useSignal(false);
  // Hold the editor element so we can read its current value before destroying
  const editorRef = useSignal<NoSerialize<HTMLElement> | undefined>(undefined);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    await loadTinyMce();
    if (!wrapperRef.value) return;

    // Build the <tinymce-editor> element imperatively so we can attach
    // listeners and set the initial value as a text node (avoids escaping
    // surprises with attribute values).
    const editor = document.createElement("tinymce-editor");
    editor.setAttribute("api-key", resolveTinyMceApiKey());
    editor.setAttribute("height", String(props.height ?? 240));
    editor.setAttribute("menubar", "false");
    editor.setAttribute("branding", "false");
    editor.setAttribute("statusbar", "false");
    editor.setAttribute(
      "plugins",
      props.variant === "compact"
        ? "lists link autolink"
        : "lists link autolink advlist",
    );
    editor.setAttribute(
      "toolbar",
      props.variant === "compact"
        ? "bold italic | link unlink | bullist numlist"
        : "undo redo | bold italic underline | link unlink | bullist numlist | removeformat",
    );
    editor.setAttribute(
      "content_style",
      `body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-size: 13.5px; color: ${props.text ?? "#1F3A5F"}; line-height: 1.55; padding: 6px 10px; } a { color: ${props.accent ?? "#E67E22"}; text-decoration: underline; } strong, b { font-weight: 700; } em, i { font-style: italic; }`,
    );
    editor.setAttribute("link_default_target", "_blank");
    editor.setAttribute("link_default_protocol", "https");
    editor.setAttribute("link_assume_external_targets", "true");
    editor.setAttribute("rel_list", '[{"title":"None","value":""},{"title":"No opener","value":"noopener noreferrer"}]');
    editor.setAttribute("link_title", "false");
    if (props.placeholder) editor.setAttribute("placeholder", props.placeholder);

    // ── Wire change events via TinyMCE's `setup` config ─────────────────────
    // The web component element accepts a `setup` *property* (not attribute)
    // that receives the underlying editor instance. We capture THAT instance
    // (the reliable handle) and read getContent() from it — reading from the
    // custom element directly is unreliable across TinyMCE versions.
    let lastEmitted = props.value || "";
    let instance: any = null;
    const emit = () => {
      try {
        if (!instance) return;
        const html = instance.getContent();
        if (html === lastEmitted) return; // skip identity emits
        lastEmitted = html;
        props.onChange$(html);
      } catch {
        /* editor torn down */
      }
    };
    (editor as any).setup = (ed: any) => {
      instance = ed;
      // Capture every event that signals "content changed", including ones
      // that fire on structural changes (ExecCommand fires for bold/italic/
      // underline/lists; SetContent for paste/undo; NodeChange for caret).
      ed.on("input keyup change NodeChange ExecCommand SetContent Undo Redo", emit);
      ed.on("blur", emit);
    };

    // Set initial content — must be a text node, not innerHTML (per TinyMCE
    // web component docs: it parses the text node, never raw HTML)
    editor.appendChild(document.createTextNode(props.value || ""));

    wrapperRef.value.appendChild(editor);
    // Stash the instance getter so the external-sync task can read/write it.
    editorRef.value = noSerialize({
      getContent: () => (instance ? instance.getContent() : ""),
      setContent: (html: string) => instance && instance.setContent(html),
    } as any);
    ready.value = true;

    cleanup(() => {
      try {
        editor.remove();
      } catch {
        /* ignore */
      }
    });
  });

  // External value sync: if the parent replaces `value` with something
  // dramatically different from what the editor currently shows (e.g. user
  // hit "Reset" or imported a JSON), pull the new value in. We avoid syncing
  // on every keystroke by comparing trimmed content.
  // eslint-disable-next-line qwik/no-use-visible-task
  useTask$(({ track }) => {
    const incoming = track(() => props.value);
    if (!ready.value || !editorRef.value) return;
    const ed = editorRef.value as any;
    const current = ed.getContent ? ed.getContent() : "";
    if ((incoming || "") !== (current || "")) {
      // Only push back if the difference is structural — TinyMCE's getContent
      // canonicalises HTML (e.g. <p>hi</p> vs hi), so we compare normalised
      // strings to avoid an infinite loop with the change handler.
      const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
      if (normalize(incoming || "") !== normalize(current || "")) {
        try {
          ed.setContent?.(incoming || "");
        } catch {
          /* editor not yet initialised internally — ignore */
        }
      }
    }
  });

  return (
    <div class="rich-text-editor relative">
      {!ready.value && (
        <div
          class="field-input flex items-center text-brand-slate/70 italic"
          style={{ minHeight: `${(props.height ?? 240) - 20}px` }}
        >
          Loading editor…
        </div>
      )}
      <div ref={wrapperRef} class="rich-text-mount" />
    </div>
  );
});
