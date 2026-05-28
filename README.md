# Resume Forge — Qwik Resume Editor

A live, editable, PDF-exporting resume builder built with **Qwik**, **Qwik City**, and **Tailwind CSS**. The default content mirrors the supplied Enhancv-exported PDF for *Isaac Ng, Ka Ho*, and the visual design is a re-creation of the same layout — navy name wordmark, orange section headings and accents, dotted proficiency rows, chip-style skills, timeline experience rail, and the faint flowing wave lines in the page background.

## Features

- **Live split-pane editor** — every keystroke updates the A4 preview on the right.
- **Rich-text content with TinyMCE** — summary, experience descriptions (including bullet points and numbered lists), and award descriptions are full WYSIWYG editors. Bullets live inside the description editor itself via TinyMCE's list toolbar buttons; no separate sub-form to wrangle. Insert links, bold, italic, lists, and more directly from the toolbar.
- **Tag input for skill chips** — skill groups use a proper chip input: type a skill and press Enter, Tab, or comma to commit. Backspace removes the last tag, and pasting a comma-separated list splits automatically.
- **Clickable contact links** — email becomes `mailto:`, phone becomes `tel:`, websites and LinkedIn open in a new tab. Reference contacts and any URL/email/phone embedded in body text auto-link.
- **Edit every field** — typed editors per section (summary, languages, skills, expertise, experience, education, certifications, awards, references).
- **Reorder by drag-and-drop or arrow buttons** — section order is canonical state.
- **Add or remove sections** — pick from 9 section types; you can have more than one of a type if needed.
- **Hide without deleting** — per-section visibility toggle (great for tailoring per application).
- **Theme accent picker** — recolour the orange wordmark and accent bars with one click.
- **Zoom slider** — preview at 40–120% without affecting print size.
- **Export to PDF** — captures the live preview into a paginated A4 PDF that matches the on-screen layout, hyperlinks preserved as clickable annotations.
- **Export / import JSON** — the same schema used internally, round-trippable. Older JSON files (without rich-text or `phone`) load and migrate transparently.
- **Auto-save to `localStorage`** — work continues where you left off.
- **Reset to default** — restore the sample resume.
- **Print-friendly** — `Cmd/Ctrl+P` produces a clean printout (editor chrome hidden via `.no-print`).

## Getting Started

Requires **Node 18.17+ / 20.3+ / 21+**.

```bash
npm install
pnpm dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

### Other scripts

| Script              | What it does                                                |
| ------------------- | ----------------------------------------------------------- |
| `pnpm dev`       | Vite dev server with SSR                                    |
| `pnpm build`     | Full production build (client + SSR)                        |
| `pnpm preview`   | Build and serve a production preview locally                |
| `pnpm lint`      | ESLint with the Qwik plugin ruleset                         |
| `pnpm fmt`       | Prettier across the project                                 |

## Project Structure

```
src/
├── components/
│   ├── AddSectionMenu.tsx     # "+ Add a section" dropdown
│   ├── HeaderEditor.tsx       # name / title / contact form
│   ├── ResumePreview.tsx      # the A4 paper renderer (PDF capture target)
│   ├── SectionEditor.tsx      # per-section editor cards
│   ├── Toolbar.tsx            # sticky header — exports, zoom, accent, reset
│   └── router-head/
│       └── router-head.tsx    # <head> manager
├── data/
│   └── resume.ts              # schema, DEFAULT_RESUME, createEmptySection
├── routes/
│   └── index.tsx              # main orchestrator page
├── utils/
│   ├── pdf.ts                 # html2canvas + jsPDF export pipeline
│   └── storage.ts             # localStorage + JSON import/export
├── entry.dev.tsx
├── entry.preview.tsx
├── entry.ssr.tsx
├── global.css                 # Tailwind directives + paper styling
└── root.tsx
```

## JSON Schema

The editor is a thin shell over a single `Resume` object that round-trips cleanly through JSON. Here's the shape (TypeScript-style; see `src/data/resume.ts` for the source of truth):

```ts
interface Resume {
  version: string;          // schema version string (currently "1.0.0")
  header: Header;
  sections: ResumeSection[]; // ordered, displayed top-to-bottom
  theme?: { accent: string; text: string; paper: string };
}

interface Header {
  name: string;
  title: string;
  email?: string;
  phone?: string;     // rendered as a tel: link
  website?: string;
  linkedin?: string;
  location?: string;
}

type ResumeSection =
  | { id: string; type: "summary";       title: string; visible?: boolean; data: { content: string } }
  | { id: string; type: "languages";     title: string; visible?: boolean; data: { items: { id: string; name: string; level: string; proficiency: 1|2|3|4|5 }[] } }
  | { id: string; type: "skills";        title: string; visible?: boolean; data: { groups: { id: string; label: string; items: string[] }[] } }
  | { id: string; type: "expertise";     title: string; visible?: boolean; data: { items: { id: string; label: string; level: number /* 0-100 */ }[] } }
  | { id: string; type: "experience";    title: string; visible?: boolean; data: { items: { id: string; title: string; company: string; start: string; end: string; location?: string; description?: string; bullets: string[] }[] } }
  | { id: string; type: "education";     title: string; visible?: boolean; data: { items: { id: string; degree: string; school: string; start: string; end: string; description?: string }[] } }
  | { id: string; type: "certifications"; title: string; visible?: boolean; data: { items: { id: string; name: string; issuer: string }[] } }
  | { id: string; type: "awards";        title: string; visible?: boolean; data: { items: { id: string; name: string; description?: string }[] } }
  | { id: string; type: "references";    title: string; visible?: boolean; data: { items: { id: string; name: string; role: string; contact?: string }[] } };
```

Every section carries its own `id` (stable across edits — used for React-style keying and drag tracking) and `title` (the visible heading; users can rename "EXPERIENCE" to "PROFESSIONAL HISTORY" without touching the schema).

### Import / Export

- **Export JSON** writes a file named after the candidate (e.g. `isaac-ng-ka-ho.json`).
- **Import JSON** validates that `header` and `sections` exist and refuses anything malformed with an inline toast.
- **Export PDF** rasterizes the live preview node into JPEG-quality-95 pages on an A4 canvas (210mm × 297mm). Two-page resumes split automatically.

## Rich text & hyperlinks

The summary, experience descriptions, experience bullets, and award descriptions all use **TinyMCE** under the hood — a real WYSIWYG editor with Bold / Italic / Underline / Links / Lists / Numbered Lists / Remove Formatting in the toolbar. To insert a hyperlink, select some text and click the link icon.

The editor loads on demand from the TinyMCE web-component CDN (`@tinymce/tinymce-webcomponent`). Out of the box it runs under TinyMCE's open-source / `no-api-key` mode — free, no signup, fully functional, with a small "Build with TinyMCE" footer notice in the editor (permitted under the open-source licence).

### Adding your Tiny Cloud API key

To remove the notice and unlock the premium plugin trial, drop in a Tiny Cloud API key via an env var — never hardcode it in source:

1. Sign up at [tiny.cloud](https://www.tiny.cloud/auth/signup/) (free tier is fine).
2. Copy your API key from the dashboard.
3. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Edit `.env.local` and paste your key after `VITE_TINYMCE_API_KEY=`.
5. Restart `pnpm dev`.

`.env.local` is git-ignored. The `VITE_` prefix is required for Vite to expose the variable to the browser bundle — Tiny's frontend integration expects the key client-side because it's domain-scoped, not a secret. The TypeScript types for `import.meta.env.VITE_TINYMCE_API_KEY` are declared in `src/vite-env.d.ts`.

If no key is set, the editor automatically falls back to `no-api-key` mode so the app still works without configuration.

### Plain-text autolinking

Plain-text fields (location, reference contact, header email/phone/website) aren't editors but they still get **autolinked** on render: anything matching an email, phone, or URL pattern in the body or contact strings becomes a clickable `<a>` tag with the appropriate `mailto:`, `tel:`, or `https://` scheme. The logic lives in `src/utils/linkify.ts` and is also responsible for sanitising the HTML that TinyMCE produces before it reaches `dangerouslySetInnerHTML` in the preview.

Both shapes round-trip cleanly through JSON: imported plain-text content keeps working (it just gets autolinked), and HTML content is stored verbatim as a string.

## Customization

### Change the accent colour permanently

Edit `tailwind.config.js` → `theme.extend.colors.brand.orange`, or override at runtime via the accent swatches in the toolbar (per-resume, persisted in JSON under `theme.accent`).

### Swap the typeface

Fonts are pulled from Google Fonts at the top of `src/global.css`. Replace the `@import` URL and the `fontFamily` keys in `tailwind.config.js` together — the preview will pick up the change automatically.

### Add a new section type

Five small touches in two files:

1. **`src/data/resume.ts`** — add the literal to `SectionType`, define a `…Data` interface, extend the `ResumeSection` discriminated union, and add a `case` in `createEmptySection()`.
2. **`src/components/ResumePreview.tsx`** — add a render block for the new type inside `SectionRenderer`.
3. **`src/components/SectionEditor.tsx`** — add a `<NewTypeEditor>` and route to it inside the body switch.
4. **`src/components/AddSectionMenu.tsx`** — append an entry to the `MENU` array.
5. Done. The drag-and-drop, persistence, JSON round-trip, and PDF export pick it up for free.

## Notes on the PDF Export

The export uses `html2canvas` to rasterize the live DOM, then slices vertically across A4 pages with `jsPDF`. Two practical consequences:

- **Web fonts must be loaded before export.** Google Fonts are preloaded by the `<link>` tag in `global.css` and are usually ready by the time the user clicks Export.
- **The output is a rasterized PDF**, not vector text. This is the right trade-off for "exactly matches what I see on screen" — vector PDF generators (pdfmake, react-pdf) require re-implementing the layout in a different rendering engine and almost always drift from the on-screen design.

For a perfect vector PDF you can also use the browser's native print dialog (Cmd/Ctrl+P) — the `@media print` rules in `global.css` hide editor chrome and produce a clean A4 page.

## License

MIT — make it yours.

## Netlify

This starter site is configured to deploy to [Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/), which means it will be rendered at an edge location near to your users.

### Local development

The [Netlify CLI](https://docs.netlify.com/cli/get-started/) can be used to preview a production build locally. To do so: First build your site, then to start a local server, run:

1. Install Netlify CLI globally `npm i -g netlify-cli`.
2. Build your site with both ssr and static `pnpm build`.
3. Start a local server with `pnpm serve`.
   In this project, `pnpm serve` uses the `netlify dev` command to spin up a server that can handle Netlify's Edge Functions locally.
4. Visit [http://localhost:8888/](http://localhost:8888/) to check out your site.

### Edge Functions Declarations

[Netlify Edge Functions declarations](https://docs.netlify.com/edge-functions/declarations/)
can be configured to run on specific URL patterns. Each edge function declaration associates
one site path pattern with one function to execute on requests that match the path. A single request can execute a chain of edge functions from a series of declarations. A single edge function can be associated with multiple paths across various declarations.

This is useful to determine if a page response should be Server-Side Rendered (SSR) or
if the response should use a static-site generated (SSG) `index.html` file instead.

By default, the Netlify Edge adaptor will generate a `.netlify/edge-middleware/manifest.json` file, which is used by the Netlify deployment to determine which paths should, and should not, use edge functions.

To override the generated manifest, you can [add a declaration](https://docs.netlify.com/edge-functions/declarations/#add-a-declaration) to the `netlify.toml` using the `[[edge_functions]]` config. For example:

```toml
[[edge_functions]]
  path = "/admin"
  function = "auth"
```

### Addition Adapter Options

Netlify-specific option fields that can be passed to the adapter options:

- `excludedPath` this option accepts a `string` glob pattern that represents which path pattern should not go through the generated Edge Functions.

### Deployments

You can [deploy your site to Netlify](https://docs.netlify.com/site-deploys/create-deploys/) either via a Git provider integration or through the Netlify CLI. This starter site includes a `netlify.toml` file to configure your build for deployment.

#### Deploying via Git

Once your site has been pushed to your Git provider, you can either link it [in the Netlify UI](https://app.netlify.com/start) or use the CLI. To link your site to a Git provider from the Netlify CLI, run the command:

```shell
netlify link
```

This sets up [continuous deployment](https://docs.netlify.com/site-deploys/create-deploys/#deploy-with-git) for your site's repo. Whenever you push new commits to your repo, Netlify starts the build process..

#### Deploying manually via the CLI

If you wish to deploy from the CLI rather than using Git, you can use the command:

```shell
netlify deploy --build
```

You must use the `--build` flag whenever you deploy. This ensures that the Edge Functions that this starter site relies on are generated and available when you deploy your site.

Add `--prod` flag to deploy to production.
