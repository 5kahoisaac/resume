---
name: cv-import
description: "Extract a PDF/DOCX CV, enhance it with LLM, and transform it into the qwik-resume-editor JSON schema (Resume v2.0.0). Uses markitdown if available, falls back to LLM extraction."
allowed-tools: [ Read, Write, Bash ]
---

# CV Import — PDF to Resume JSON

Import any CV/resume PDF into the qwik-resume-editor JSON format in three stages:
**Extract → Enhance → Transform**.

## Usage

```
/cv-import /path/to/cv.pdf                  # writes src/data/default-resume.json (default)
/cv-import /path/to/cv.pdf --output resume.json   # write to a custom file instead
```

## Stage 0 — Validate Input

1. Confirm the file path was provided. If not, ask the user: `"Please provide the path to your CV PDF."`
2. Check the file exists:
   ```bash
   test -f "<filepath>" && echo "exists" || echo "not found"
   ```
3. Accept `.pdf`, `.docx`, `.doc`, `.txt`. Warn (but proceed) for other extensions.

## Stage 1 — Extract Text

### 1a. Check for markitdown

```bash
markitdown --version 2>/dev/null && echo "MARKITDOWN_OK" || echo "MARKITDOWN_ABSENT"
```

### 1b-A. If markitdown is available

```bash
markitdown "<filepath>"
```

Capture the full stdout as the extracted markdown. markitdown handles multi-column PDFs and strips headers/footers well.

### 1b-B. If markitdown is absent — LLM extraction

Use the `Read` tool to open the PDF directly. Claude can read PDF files natively. If that fails (non-text PDF), instruct
the user:

```
markitdown is not installed. Install it for best results:
  pip install markitdown
  # or: pipx install markitdown

Falling back to native PDF reading via Claude…
```

After reading, extract **all visible text**, preserving approximate section order. Do not summarise at this stage — get
everything.

## Stage 2 — Enhance

After extraction, use LLM reasoning to:

1. **Identify sections** — find headings that correspond to: Summary/Objective, Experience/Work History, Education,
   Skills, Languages, Certifications, Awards/Honors, References.
2. **Normalise dates** — convert any format (`Jan 2020`, `01/2020`, `2020`) to `"YYYY-MM"`. Use `""` (empty string)
   for "Present" / "Current" / "Now".
3. **Clean description text** — convert bullet points to HTML `<ul><li>…</li></ul>`. Wrap paragraphs in `<p>…</p>`.
   Preserve bold/italic if detectable.
4. **Infer contact types** — classify each contact detail:
    - email address → `type: "email"`
    - phone number → `type: "tel"`
    - URL (http/https, LinkedIn, GitHub, portfolio) → `type: "url"`
    - plain text (city, country) → `type: "string"`
5. **Infer language levels** — map free-text proficiency to the enum:
   `Basic | Elementary | Intermediate | Conversational | Proficient | Advanced | Native`
6. **Score expertise** — if expertise/competency levels are present, map to 0–100.
7. **Flag uncertain fields** — add a `_review` key next to uncertain values with a note, e.g.
   `"_review_start": "date was '2020' — assumed January"`.

## Stage 3 — Transform to Resume JSON

Produce a valid `Resume` object (schema version `"2.0.0"`).

### ID generation

Use this pattern for every `id` field: `<prefix>_<7 alphanumeric chars>`.
Generate sequential IDs: `c_0000001`, `sec_0000001`, `exp_0000001`, `edu_0000001`, `grp_0000001`, `lng_0000001`,
`cer_0000001`, `awd_0000001`, `ref_0000001`.

### JSON schema

```jsonc
{
  "version": "2.0.0",
  "header": {
    "name": "Full Name",
    "title": "Professional Title / Headline",
    "contacts": [
      // Order: email, phone, LinkedIn, website, location last
      { "id": "c_0000001", "type": "email",  "label": "you@example.com" },
      { "id": "c_0000002", "type": "tel",    "label": "+1 234 567 8900" },
      { "id": "c_0000003", "type": "url",    "label": "linkedin.com/in/you", "href": "https://linkedin.com/in/you" },
      { "id": "c_0000004", "type": "string", "label": "City, Country" }
    ]
  },
  "theme": { "paletteId": "orange-navy" },
  "sections": [
    {
      "id": "sec_0000001",
      "type": "summary",
      "title": "Summary",
      "visible": true,
      "data": { "text": "<p>Professional summary as HTML…</p>" }
    },
    {
      "id": "sec_0000002",
      "type": "experience",
      "title": "Experience",
      "visible": true,
      "data": {
        "items": [
          {
            "id": "exp_0000001",
            "title": "Job Title",
            "company": "Company Name",
            "location": "City, Country",
            "start": "2021-03",
            "end": "",
            "description": "<ul><li>Achievement or responsibility</li></ul>"
          }
        ]
      }
    },
    {
      "id": "sec_0000003",
      "type": "education",
      "title": "Education",
      "visible": true,
      "data": {
        "items": [
          {
            "id": "edu_0000001",
            "degree": "Bachelor of Science in Computer Science",
            "school": "University Name",
            "start": "2015-09",
            "end": "2019-06"
          }
        ]
      }
    },
    {
      "id": "sec_0000004",
      "type": "skills",
      "title": "Skills & Knowledge",
      "visible": true,
      "data": {
        "groups": [
          {
            "id": "grp_0000001",
            "label": "Programming Languages",
            "skills": ["Python", "TypeScript", "Go"]
          }
        ]
      }
    },
    {
      "id": "sec_0000005",
      "type": "languages",
      "title": "Languages",
      "visible": true,
      "data": {
        "items": [
          { "id": "lng_0000001", "name": "English", "level": "Native" },
          { "id": "lng_0000002", "name": "Mandarin", "level": "Conversational" }
        ]
      }
    },
    {
      "id": "sec_0000006",
      "type": "certifications",
      "title": "Licenses & Certifications",
      "visible": true,
      "data": {
        "items": [
          { "id": "cer_0000001", "name": "AWS Solutions Architect", "issuer": "Amazon Web Services" }
        ]
      }
    }
    // Only include section types present in the CV.
    // Available types: summary | experience | education | skills | languages |
    //                  certifications | awards | expertise | references
  ]
}
```

### Section ordering heuristic

Default order (omit sections not found in the CV):

1. `summary`
2. `experience`
3. `education`
4. `skills`
5. `expertise`
6. `languages`
7. `certifications`
8. `awards`
9. `references`

### Skills grouping heuristic

If the CV lists skills as a flat list, group by inferred category:

- Programming Languages
- Frameworks & Libraries
- Tools & Platforms
- Databases
- Soft Skills / Other

If no clear grouping exists, use a single group `"label": "Skills"`.

### Expertise section

Only emit an `expertise` section if the CV explicitly shows percentage bars, star ratings, or numbered proficiency
levels. Map to 0–100:

- 5/5 stars → 100, 4/5 → 80, 3/5 → 60, 2/5 → 40, 1/5 → 20
- Percentages: use directly.

```jsonc
{
  "id": "sec_000000X",
  "type": "expertise",
  "title": "Industry Expertise",
  "visible": true,
  "data": {
    "items": [
      { "id": "xp_0000001", "label": "Machine Learning", "level": 80 }
    ]
  }
}
```

## Stage 4 — Output

1. **Write `src/data/default-resume.json`** in the project root (default behaviour). This is the file the app bundles as
   the seed shown on first visit and on Reset — no editor login required to see the result.
    - If `--output <file>` was specified, write to that path instead.
2. **Print the full JSON** to the conversation so the user can review it.
3. **Summarise what was imported** in a short table:

| Field            | Value                                                    |
|------------------|----------------------------------------------------------|
| Name             | …                                                        |
| Sections found   | experience (N jobs), education (N), skills (N groups), … |
| Dates normalised | N                                                        |
| Fields to review | N (marked with `_review_*` keys)                         |

4. **Next steps** — tell the user exactly these two steps to preview the resume without logging in:

   Open `http://localhost:5173` in the browser, open DevTools console (F12 / Cmd+Option+I), paste this one line, and
   press Enter:
   ```js
   localStorage.removeItem("qwik-resume-editor:v2"); location.reload();
   ```
   This clears any cached resume from localStorage so the app falls back to the newly written `default-resume.json`. The
   page reloads and shows the imported resume on the public home page — no password needed.

## Error handling

| Problem                     | Action                                                                                                                        |
|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| File not found              | Report path, ask user to confirm                                                                                              |
| PDF is scanned / image-only | Warn "no text layer detected"; suggest installing markitdown with OCR support (`pip install markitdown[pdf]`) or manual entry |
| Date cannot be parsed       | Use `""` and add `"_review_date": "original: <raw text>"`                                                                     |
| Section heading ambiguous   | Pick the closest match; add `"_review_section": "guessed from: <heading text>"`                                               |
| markitdown exits with error | Fall back to LLM extraction; report the error message                                                                         |
| Contact type unclear        | Default to `"string"` type; note it in the summary                                                                            |

## Quality checks before output

- [ ] All `id` fields are unique within the document
- [ ] All dates are `"YYYY-MM"` or `""` — no other formats
- [ ] `type` fields match the allowed `SectionType` enum exactly
- [ ] `level` fields in `languages` use the exact enum values:
  `Basic | Elementary | Intermediate | Conversational | Proficient | Advanced | Native`
- [ ] `level` in `expertise` items is a number 0–100
- [ ] `description` fields contain HTML, not plain text with hyphens
- [ ] No section type appears more than once in `sections`
- [ ] `version` is exactly `"2.0.0"`
- [ ] `theme.paletteId` is one of: `orange-navy | navy-black | green-charcoal | purple-slate | magenta-graphite | mono`
- [ ] JSON is valid (no trailing commas, no `//` comments in the actual output)
