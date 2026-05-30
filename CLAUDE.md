# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server with SSR (http://localhost:5173)
npm run build        # Full production build: client + Netlify Edge adapter
npm run build.client # Client bundle only (faster for checking bundle output)
npm run lint         # ESLint with Qwik plugin ruleset
npm run fmt          # Prettier format
npm run fmt.check    # Prettier check (CI-safe)
npx tsc --noEmit     # Type-check without emitting
netlify deploy --build  # Deploy to Netlify (add --prod for production)
```

No test runner is configured — verification is done by running the dev server and observing the browser.

## Architecture

The app is a Qwik + Qwik City SSR application deployed to Netlify Edge Functions. All resume data lives in the browser (`localStorage`) — there is no backend database.

### Data flow

```
store.resume (useStore deep proxy, in ResumeApp)
    ├── HeaderEditor  → onHeaderUpdate$ → store.resume.header = next
    ├── SectionEditor → onSectionUpdate$ → store.resume.sections = next
    └── ResumePreview ← receives resume prop → renders preview + PDF capture target
```

`ResumeApp` (`src/components/ResumeApp.tsx`) is the single source of truth. It owns `store` (a Qwik deep-proxy store), defines all mutation callbacks as QRLs (`$(...)`), passes them down as props, and renders both the editor pane and preview pane side-by-side.

**Routes:**
- `/` (`src/routes/index.tsx`) — read-only preview + export, `canEdit=false`
- `/editor` (`src/routes/editor/index.tsx`) — full editor, password-gated via HMAC-SHA256 session cookie (`src/utils/auth.ts`). Dev password is in `.env` as `EDITOR_PASSWORD`.

### Key files

| File | Purpose |
|---|---|
| `src/data/resume.ts` | `Resume` type, discriminated union for all section types, `PALETTES`, `createEmptySection` |
| `src/components/ResumeApp.tsx` | Root editor orchestrator — all state and mutation QRLs live here |
| `src/components/ResumePreview.tsx` | A4 paper renderer; `id="resume-preview-page"` is the PDF capture target |
| `src/components/SectionEditor.tsx` | All per-section editor forms in one file |
| `src/components/HeaderEditor.tsx` | Name, title, contact list editor |
| `src/components/RichTextEditor.tsx` | TinyMCE web component wrapper |
| `src/utils/pdf.ts` | html2canvas → jsPDF export pipeline with smart page breaks and link annotations |
| `src/utils/linkify.ts` | `renderRichText` (sanitise HTML or autolink plain text), `autoLink`, `sanitiseHtml` |
| `src/utils/storage.ts` | `loadResume`, `saveResume`, schema migration (v1→v2) |
| `src/global.css` | Paper styles, `.rich-content` formatting, `.resume-page` dimensions |

## Critical Qwik gotchas

### 1. QRL closures capture stale props

In Qwik, `$(() => ...)` closures may capture a serialized snapshot of `props` rather than a live reactive reference. Always read `props.X` live inside the QRL body — do not destructure at the top of the component and use the variable in a `$()` closure.

```tsx
// WRONG — `header` is a stale snapshot inside the QRL
const Header = component$(({ header, onUpdate$ }) => {
  const save = $(() => onUpdate$({ ...header, name: 'x' })); // header is stale
});

// CORRECT — read props.header live at call time
const Header = component$((props) => {
  const save = $(() => props.onUpdate$({ ...props.header, name: 'x' }));
});
```

### 2. `key` prop must include reactive content for text-node updates

Qwik's reconciler reuses DOM nodes with the same `key` without patching text content inside them. If a list item's text changes but its key stays the same (e.g. a stable ID), the DOM won't update. Include the changing value in the key:

```tsx
// WRONG — reconciler reuses node, label text never updates in preview
contacts.map(c => <a key={c.id}>{c.label}</a>)

// CORRECT — label change → new key → node remounts with fresh text
contacts.map(c => <a key={`${c.id}-${c.label}`}>{c.label}</a>)
```

This is why `src/components/ResumePreview.tsx` uses `key={\`${c.id}-${c.label}\`}` for contact items.

### 3. Pass changed objects at the level they're consumed

Replacing `store.resume.header = next` fires the subscription for components that read `resume.header` in their JSX. For `Header` to reliably re-render with fresh contacts, `ResumePreview` must pass `resume.header` as a **direct prop** (`<Header header={resume.header} ...>`), not pass `resume` and have `Header` dig into it — passing at the changed level guarantees a new prop reference reaches the child.

### 4. Save is debounced; preview is instant

`saveResume` fires 400ms after the last store mutation (debounced via `cleanup(() => clearTimeout(...))` in `useTask$`). The store mutation itself is synchronous — the preview re-renders immediately.

## TinyMCE integration

`RichTextEditor.tsx` wraps `@tinymce/tinymce-webcomponent@2` from CDN.

**Event binding:** The web component calls `setup` only from a global config object named by its `config` attribute — it ignores a `setup` *property* set on the element. Bind change listeners by polling for `(editorEl as any)._editor` (set after init) and calling `.on(events, handler)` directly on the TinyMCE instance.

**Runtime theme colors:** `content_style` is read only at TinyMCE init. To update colors when the palette changes without remounting, inject `<style id="rf-theme-style">` into `ed.getDoc().head`. See `applyThemeStyle()` in `RichTextEditor.tsx`.

## PDF export

`src/utils/pdf.ts` uses `html2canvas` + `jsPDF`.

**Responsive CSS in the clone:** `html2canvas` clones the document and re-evaluates CSS at `windowWidth: 794px` (the A4 natural width). This is below the `lg` (1024px) breakpoint, so the responsive mobile tab toggle's `hidden` class applies in the clone, making the preview pane invisible → blank PDF. The `onclone` hook forces all ancestors visible:
```ts
if (getComputedStyle(ancestor).display === 'none') ancestor.style.display = 'block';
ancestor.style.overflow = 'visible';
```

**Link annotations:** After rasterizing, `overlayLinks()` walks `a[href]` in the preview node, converts `offsetTop`/`offsetLeft` positions (via `offsetParent` traversal) to PDF mm coordinates, and adds `pdf.link()` annotations per page slice.

## Schema / data model

Current schema version: `2.0.0`. Migration from v1 (handled in `src/utils/storage.ts`):
- `header` flat fields (`email`, `phone`, `website`, `linkedin`, `location`) → `header.contacts[]` array
- Date strings `"MM/YYYY"` / `"Present"` → `"YYYY-MM"` / `""`
- `items[].bullets[]` → merged into `description` as HTML `<ul>`

## Responsive layout

- `lg` (1024px+): editor and preview side-by-side
- Below `lg`: single pane with Edit/Preview tab toggle (`mobileView` signal in `ResumeApp`)
- Zoom defaults on mount: `< 768px` → 50%, `768–991px` → 80%, `≥ 992px` → 120%
- Mobile zoom is capped at 50% on window resize

## Environment variables

| Variable | Purpose |
|---|---|
| `EDITOR_PASSWORD` | Password to access `/editor` (server-side only) |
| `AUTH_SECRET` | HMAC-SHA256 signing key for session cookies |
| `VITE_TINYMCE_API_KEY` | Optional — removes the TinyMCE attribution notice |
