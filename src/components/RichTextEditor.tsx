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

/** Fallback theme colours when no palette override is passed (mirror the
 *  "orange-navy" preset so first paint matches the resume defaults). */
const DEFAULT_TEXT = "#1F3A5F";
const DEFAULT_ACCENT = "#E67E22";

/** The themeable slice of the editor's iframe CSS — body text colour and link
 *  colour. Kept separate from the structural content style so it can be
 *  re-applied live when the palette changes. */
function themeContentCss(accent?: string, text?: string): string {
  return `body { color: ${text ?? DEFAULT_TEXT}; } a { color: ${accent ?? DEFAULT_ACCENT}; text-decoration: underline; }`;
}

/**
 * Inject (or update) a managed <style> element inside the editor's iframe
 * document so theme changes take effect WITHOUT remounting the editor (a
 * remount would discard the caret position and undo history). TinyMCE's
 * `content_style` is only read at init, so runtime palette switches need this.
 */
function applyThemeStyle(ed: any, accent?: string, text?: string): void {
  try {
    const doc = ed?.getDoc?.();
    if (!doc || !doc.head) return;
    let styleEl = doc.getElementById("rf-theme-style") as HTMLStyleElement | null;
    if (!styleEl) {
      const created = doc.createElement("style") as HTMLStyleElement;
      created.id = "rf-theme-style";
      doc.head.appendChild(created);
      styleEl = created;
    }
    styleEl.textContent = themeContentCss(accent, text);
  } catch {
    /* iframe not ready or editor torn down — ignore */
  }
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
      `body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-size: 13.5px; color: ${props.text ?? DEFAULT_TEXT}; line-height: 1.55; padding: 6px 10px; } a { color: ${props.accent ?? DEFAULT_ACCENT}; text-decoration: underline; } strong, b { font-weight: 700; } em, i { font-style: italic; } u, span[style*='text-decoration'] { text-decoration-line: underline; text-underline-offset: 2px; }`,
    );
    editor.setAttribute("link_default_target", "_blank");
    editor.setAttribute("link_default_protocol", "https");
    editor.setAttribute("link_assume_external_targets", "true");
    editor.setAttribute("rel_list", '[{"title":"None","value":""},{"title":"No opener","value":"noopener noreferrer"}]');
    editor.setAttribute("link_title", "false");
    if (props.placeholder) editor.setAttribute("placeholder", props.placeholder);

    // ── Wire change events ───────────────────────────────────────────────────
    // IMPORTANT: the <tinymce-editor> web component only invokes a `setup`
    // function that lives on a *global* config object referenced by its
    // `config` attribute. It IGNORES a `setup` property assigned directly on the
    // element. The previous implementation relied on that ignored property, so
    // our listeners were never attached and edits never reached Qwik — the
    // preview only changed on a full remount. Instead we read the live editor
    // instance the component stashes on its `_editor` field once it initialises
    // and bind our listeners to it directly.
    let lastEmitted = props.value || "";
    let instance: any = null;
    const CHANGE_EVENTS =
      "input keyup change NodeChange ExecCommand SetContent Undo Redo";
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

    // Set initial content — must be a text node, not innerHTML (per TinyMCE
    // web component docs: it parses the text node, never raw HTML)
    editor.appendChild(document.createTextNode(props.value || ""));
    wrapperRef.value.appendChild(editor);

    // Poll for the component's editor instance, then attach listeners. The
    // `_editor` handle is set inside the component's own init `setup`, just
    // before TinyMCE fires "init", and lives for the mounted component's life.
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const attach = () => {
      const ed = (editor as any)._editor;
      if (ed) {
        instance = ed;
        // Capture every event that signals "content changed", including
        // structural ones (ExecCommand fires for bold/italic/underline/lists;
        // SetContent for paste/undo; NodeChange for caret moves).
        ed.on(CHANGE_EVENTS, emit);
        ed.on("blur", emit);
        // Apply theme colors now (init) and expose a method for live updates.
        applyThemeStyle(ed, props.accent, props.text);
        editorRef.value = noSerialize({
          getContent: () => (ed ? ed.getContent() : ""),
          setContent: (html: string) => ed && ed.setContent(html),
          applyTheme: (accent: string | undefined, text: string | undefined) =>
            applyThemeStyle(ed, accent, text),
        } as any);
        ready.value = true;
        return;
      }
      if (attempts++ < 200) pollTimer = setTimeout(attach, 50); // ~10s ceiling
    };
    attach();

    cleanup(() => {
      if (pollTimer) clearTimeout(pollTimer);
      try {
        if (instance) {
          instance.off(CHANGE_EVENTS, emit);
          instance.off("blur", emit);
        }
      } catch {
        /* ignore */
      }
      try {
        editor.remove();
      } catch {
        /* ignore */
      }
    });
  });

  // Live theme sync: re-inject the link/body colours into the editor iframe
  // whenever the parent's palette changes. `content_style` is only read at
  // TinyMCE init, so we push updates via a managed <style> tag.
  // eslint-disable-next-line qwik/no-use-visible-task
  useTask$(({ track }) => {
    const accent = track(() => props.accent);
    const text = track(() => props.text);
    if (!ready.value || !editorRef.value) return;
    (editorRef.value as any).applyTheme?.(accent, text);
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
