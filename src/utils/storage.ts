import type {
  Resume,
  ResumeSection,
  ContactItem,
  LanguageLevel,
} from "~/data/resume";
import {
  EMPTY_RESUME,
  loadDefaultResume,
  uid,
  LANGUAGE_LEVELS,
  DEFAULT_PALETTE_ID,
} from "~/data/resume";

const STORAGE_KEY = "qwik-resume-editor:v2";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================================
// Migration — coerce legacy / partial JSON into the current Resume type.
// Schema history:
//   v1.0  Header had fixed fields { email, phone, website, linkedin, location }
//         Experience used "MM/YYYY" / "Present"; languages had proficiency: number
//         Theme had { accent, text, paper }
//   v2.0  Header has `contacts: ContactItem[]`
//         Experience/Education use "YYYY-MM"; empty end = present
//         Languages have `level: LanguageLevel` enum
//         Theme has `{ paletteId?, accent?, text? }`
//         Default is bundled at src/data/default-resume.json (see loadDefaultResume)
// ============================================================================

function toMonth(s: any): string {
  if (typeof s !== "string") return "";
  if (s === "Present" || s === "present") return "";
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  return s;
}

function normalizeLanguageLevel(level: any): LanguageLevel {
  if (typeof level !== "string") return "Intermediate";
  if ((LANGUAGE_LEVELS as readonly string[]).includes(level))
    return level as LanguageLevel;
  const lc = level.toLowerCase();
  if (lc.includes("native") || lc.includes("fluent")) return "Native";
  if (lc.includes("advanced")) return "Advanced";
  if (lc.includes("proficient")) return "Proficient";
  if (lc.includes("conv")) return "Conversational";
  if (lc.includes("inter")) return "Intermediate";
  if (lc.includes("elem")) return "Elementary";
  if (lc.includes("basic") || lc.includes("beginner")) return "Basic";
  return "Intermediate";
}

export function migrate(resume: any): Resume {
  if (!resume || typeof resume !== "object") return EMPTY_RESUME;
  if (!resume.header || typeof resume.header !== "object") {
    resume.header = { name: "", title: "", contacts: [] };
  }

  // v1 header → v2 header.contacts
  if (!Array.isArray(resume.header.contacts)) {
    const h = resume.header;
    const contacts: ContactItem[] = [];
    const push = (type: ContactItem["type"], label?: string, href?: string) => {
      if (label)
        contacts.push({ id: uid("c"), type, label, ...(href ? { href } : {}) });
    };
    push("email", h.email, h.email ? `mailto:${h.email}` : undefined);
    if (h.phone) {
      const digits = String(h.phone).replace(/[^\d+]/g, "");
      push("tel", h.phone, `tel:${digits}`);
    }
    if (h.website) push("url", h.website, h.website);
    if (h.linkedin) push("url", h.linkedin, h.linkedin);
    if (h.location) push("string", h.location);
    resume.header = { name: h.name || "", title: h.title || "", contacts };
  }

  // Repair contacts where `label` accidentally got written with the scheme
  // prefix (e.g. "mailto:me@isaac.ng" instead of "me@isaac.ng"). This can
  // happen when stale store snapshots are spread during contact mutations.
  if (Array.isArray(resume.header.contacts)) {
    for (const c of resume.header.contacts as ContactItem[]) {
      if (
        c.type === "email" &&
        typeof c.label === "string" &&
        c.label.startsWith("mailto:")
      ) {
        c.label = c.label.slice("mailto:".length).trim();
      }
      if (
        c.type === "tel" &&
        typeof c.label === "string" &&
        c.label.startsWith("tel:")
      ) {
        c.label = c.label.slice("tel:".length).trim();
      }
    }
  }

  if (!resume.theme) {
    resume.theme = { paletteId: DEFAULT_PALETTE_ID };
  } else if (!resume.theme.paletteId) {
    delete resume.theme.paper;
    resume.theme.paletteId = DEFAULT_PALETTE_ID;
  }

  if (!Array.isArray(resume.sections)) resume.sections = [];
  for (const section of resume.sections as ResumeSection[]) {
    if (section.type === "languages") {
      for (const item of section.data.items as any[]) {
        item.level = normalizeLanguageLevel(item.level);
        delete item.proficiency;
      }
    }
    if (section.type === "experience") {
      for (const item of section.data.items as any[]) {
        item.start = toMonth(item.start);
        item.end = toMonth(item.end);
        if (Array.isArray(item.bullets) && item.bullets.length > 0) {
          const listHtml = item.bullets
            .map((b: string) => {
              const looksLikeHtml = /<[a-z][\s\S]*>/i.test(b);
              return `<li>${looksLikeHtml ? b : escapeHtml(b)}</li>`;
            })
            .join("");
          const existing = (item.description ?? "").trim();
          const alreadyHasList = /<ul[\s>]/i.test(existing);
          item.description = alreadyHasList
            ? existing
            : existing
              ? `${existing}<ul>${listHtml}</ul>`
              : `<ul>${listHtml}</ul>`;
        }
        delete item.bullets;
      }
    }
    if (section.type === "education") {
      for (const item of section.data.items as any[]) {
        item.start = toMonth(item.start);
        item.end = toMonth(item.end);
      }
    }
  }
  resume.version = "2.0.0";
  return resume as Resume;
}

/**
 * Load: localStorage first, then the default resume. Async because the default
 * is resolved lazily by `loadDefaultResume` — either the bundled
 * `src/data/default-resume.json` or a remote `VITE_RESUME_DATA_URL`.
 */
export async function loadResume(): Promise<Resume> {
  if (typeof window === "undefined") return EMPTY_RESUME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray(parsed.sections)
      ) {
        return migrate(parsed);
      }
    }
  } catch {
    /* fall through */
  }
  return migrate(await loadDefaultResume());
}

export function saveResume(resume: Resume): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  } catch {
    /* quota — ignore */
  }
}

export function clearResume(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function downloadResumeJSON(resume: Resume): void {
  const blob = new Blob([JSON.stringify(resume, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const fileName = `${resume.header.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "resume"}.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseResumeJSON(jsonText: string): Resume {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  if (!parsed || typeof parsed !== "object")
    throw new Error("JSON root must be an object.");
  const r = parsed as Partial<Resume>;
  if (!r.header || !Array.isArray(r.sections)) {
    throw new Error(
      "Missing `header` or `sections` — is this a resume export?",
    );
  }
  return migrate(r);
}
