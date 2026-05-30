# Resume Forge

A live, A4 resume editor with instant preview, PDF export, and JSON round-tripping — built with **Qwik**, **Qwik City**,
and **Tailwind CSS**. All data lives in the browser; there is no backend database.

## Features

- **Live split-pane editing** — every keystroke updates the A4 preview in real time.
- **Rich-text content** — summary and experience descriptions use a full TinyMCE WYSIWYG editor (bold, italic, lists,
  links, and more).
- **Chip-style skill tags** — type a skill and press Enter, Tab, or comma to commit; paste a comma-separated list to
  split automatically.
- **Clickable contacts** — email, phone, website, and LinkedIn auto-resolve to `mailto:`, `tel:`, and HTTPS links in the
  preview and PDF.
- **9 section types** — Summary, Experience, Education, Skills, Languages, Expertise, Certifications, Awards, and
  References.
- **Drag-and-drop reordering** — sections and items within sections.
- **Per-section visibility toggle** — hide a section without deleting it (useful for tailoring per application).
- **Color palette picker** — six pre-set accent/text palettes; override individually.
- **Zoom slider** — preview at 40–120% without affecting the printed size.
- **PDF export** — paginated A4, links preserved as clickable annotations.
- **JSON export / import** — the same schema the editor uses internally, fully round-trippable.
- **Auto-save** — persisted in `localStorage`; continues where you left off.
- **Reset** — restores the default resume from `public/default-resume.json`.
- **Print-friendly** — `Cmd/Ctrl+P` hides editor chrome and prints a clean A4 page.

## Getting Started

Requires **Node 18.17+ / 20.3+ / 21+** and `pnpm`.

```bash
npm install
pnpm dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

The home route (`/`) is a read-only preview. The editor lives at `/editor` and is password-gated — set `EDITOR_PASSWORD`
and `AUTH_SECRET` in `.env.local`:

```bash
cp .env.example .env.local   # then fill in EDITOR_PASSWORD and AUTH_SECRET
```

### Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `pnpm dev`     | Vite dev server with SSR             |
| `pnpm build`   | Full production build (client + SSR) |
| `pnpm preview` | Build then serve locally             |
| `pnpm lint`    | ESLint with the Qwik plugin ruleset  |
| `pnpm fmt`     | Prettier across the project          |

## Project Structure

```
src/
├── components/
│   ├── ResumeApp.tsx          # root orchestrator — all state and mutation QRLs
│   ├── ResumePreview.tsx      # A4 paper renderer (PDF capture target)
│   ├── SectionEditor.tsx      # per-section editor forms
│   ├── HeaderEditor.tsx       # name / title / contact list
│   ├── Toolbar.tsx            # zoom, palette, export, import, reset
│   ├── RichTextEditor.tsx     # TinyMCE web-component wrapper
│   ├── TagInput.tsx           # chip input for skill groups
│   ├── AddSectionMenu.tsx     # "+ Add a section" dropdown
│   └── ThemeStyle.tsx         # injects CSS variable overrides for the active palette
├── data/
│   └── resume.ts              # Resume type, section types, palettes, factories
├── routes/
│   ├── index.tsx              # / — read-only preview (no login required)
│   └── editor/index.tsx       # /editor — full editor, password-gated
├── utils/
│   ├── pdf.ts                 # html2canvas + jsPDF export pipeline
│   ├── storage.ts             # loadResume, saveResume, schema migration
│   ├── auth.ts                # HMAC-SHA256 session cookie auth
│   └── linkify.ts             # autolink and sanitise HTML
├── global.css                 # paper styles, .rich-content, .resume-page
└── root.tsx
public/
└── default-resume.json        # seed resume (loaded on first visit and on Reset)
```

## JSON Schema

The editor round-trips over a single `Resume` object (schema version `2.0.0`). See `src/data/resume.ts` for the
canonical TypeScript types.

```jsonc
{
  "version": "2.0.0",
  "header": {
    "name": "Jane Smith",
    "title": "Senior Engineer",
    "contacts": [
      { "id": "c_1", "type": "email",  "label": "jane@example.com" },
      { "id": "c_2", "type": "tel",    "label": "+1 234 567 8900" },
      { "id": "c_3", "type": "url",    "label": "linkedin.com/in/jane", "href": "https://linkedin.com/in/jane" },
      { "id": "c_4", "type": "string", "label": "San Francisco, CA" }
    ]
  },
  "theme": { "paletteId": "orange-navy" },
  "sections": [
    {
      "id": "sec_1", "type": "experience", "title": "Experience", "visible": true,
      "data": {
        "items": [{
          "id": "exp_1", "title": "Staff Engineer", "company": "Acme Corp",
          "location": "Remote", "start": "2021-03", "end": "",
          "description": "<ul><li>Led platform migration…</li></ul>"
        }]
      }
    }
  ]
}
```

Available `type` values: `summary` · `experience` · `education` · `skills` · `languages` · `expertise` ·
`certifications` · `awards` · `references`

Dates are stored as `"YYYY-MM"`; an empty string means "present". Older v1 JSON (flat header fields, `MM/YYYY` dates)
migrates transparently on load.

## AI Coding Skills

This project ships a **`cv-import`** skill that extracts a PDF CV, enhances the content with an LLM, and writes a valid
`Resume` JSON to `public/default-resume.json` — so you can preview the result immediately without logging in to the
editor.

### cv-import

```
/cv-import /path/to/cv.pdf
/cv-import /path/to/cv.pdf --output custom.json
```

**What it does:**

1. Detects [`markitdown`](https://github.com/microsoft/markitdown) and uses it if available; falls back to native LLM
   PDF reading otherwise.
2. Normalises all dates to `YYYY-MM`, classifies contacts by type, maps language proficiency to the enum, groups skills
   by category, and converts bullet points to HTML.
3. Writes the result to `public/default-resume.json`.
4. Prints a one-liner to preview the result in the browser immediately — no editor password needed:
   ```js
   localStorage.removeItem("qwik-resume-editor:v2"); location.reload();
   ```

For best extraction quality, install markitdown first:

```bash
pip install markitdown
```

### Supported Agents

The skill is registered for all of the following agents. Each agent reads from its own config directory; all symlink to
the same canonical `SKILL.md` so any edit propagates everywhere automatically.

| Agent                                                     | Config directory                 |
|-----------------------------------------------------------|----------------------------------|
| [Claude Code](https://claude.ai/code)                     | `.claude/skills/cv-import/`      |
| [Cursor](https://cursor.com)                              | `.cursor/skills/cv-import/`      |
| [Codex](https://platform.openai.com/docs/codex)           | `.codex/skills/cv-import/`       |
| [OpenCode](https://opencode.ai)                           | `.opencode/skills/cv-import/`    |
| [Pi](https://pi.dev)                                      | `.pi/skills/cv-import/`          |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `.gemini/skills/cv-import/`      |
| [Antigravity](https://antigravity.dev)                    | `.antigravity/skills/cv-import/` |

> [!TIP]
> Pi also scans `.agents/skills/` as a shared location. The skill is registered there too for broader cross-agent
> compatibility.

## Customization

### Accent colour and palette

Select a palette from the toolbar at runtime (persisted in the JSON `theme` field). To change the default permanently,
edit `PALETTES` in `src/data/resume.ts` or update `public/default-resume.json`.

### Typeface

Fonts are loaded from Google Fonts at the top of `src/global.css`. Replace the `@import` URL and the corresponding
`fontFamily` entry in `tailwind.config.js`.

### TinyMCE API key

The editor runs in open-source mode by default (no signup required, small attribution notice). To remove the notice:

1. Get a free API key at [tiny.cloud](https://www.tiny.cloud/auth/signup/).
2. Add it to `.env.local`:
   ```
   VITE_TINYMCE_API_KEY=your_key_here
   ```
3. Restart `pnpm dev`.

### Adding a new section type

1. Add the literal to `SectionType` and a `…Data` interface in `src/data/resume.ts`, extend the discriminated union, and
   add a `case` in `createEmptySection()`.
2. Add a render block in `src/components/ResumePreview.tsx`.
3. Add an editor form in `src/components/SectionEditor.tsx`.
4. Append an entry to the `MENU` array in `src/components/AddSectionMenu.tsx`.

Drag-and-drop, persistence, JSON round-trip, and PDF export all pick up new section types automatically.

## Deployment

The project targets **Netlify Edge Functions**. After setting `EDITOR_PASSWORD`, `AUTH_SECRET`, and optionally
`VITE_TINYMCE_API_KEY` in the Netlify dashboard:

```bash
# One-off manual deploy
netlify deploy --build --prod

# Or link to a Git repo for continuous deployment
netlify link
```

To preview a production build locally:

```bash
npm i -g netlify-cli
pnpm build
netlify dev   # http://localhost:8888
```

## License

[MIT](LICENSE.md) © Isaac Ng, Ka Ho
