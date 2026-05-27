import type { Resume, ResumeSection } from "~/data/resume";
import { DEFAULT_RESUME } from "~/data/resume";

const STORAGE_KEY = "qwik-resume-editor:v1";

/** Escape user-supplied bullet strings before wrapping in HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Coerce a parsed resume blob to the current schema shape, filling in fields
 * that may be missing from older saved data. Keeps backward compatibility so
 * users don't lose work when we add fields or change shapes.
 *
 * Migrations applied:
 *   1. `header.phone` defaults to "" (added in v1.1)
 *   2. `experience.bullets[]` → folded into `description` as <ul><li> HTML
 *      (added in v1.2 — TinyMCE now handles bullets directly inside the rich
 *      text editor, so the separate array is no longer used).
 */
export function migrate(resume: any): Resume {
  if (!resume.header.phone) resume.header.phone = "";

  for (const section of resume.sections as ResumeSection[]) {
    if (section.type !== "experience") continue;
    for (const item of section.data.items) {
      if (!Array.isArray(item.bullets) || item.bullets.length === 0) {
        item.bullets = [];
        continue;
      }
      // Detect whether the bullets are HTML or plain text. Plain text → wrap
      // each in <li> after escaping; HTML → embed verbatim (it came from a
      // newer export where the rich-text editor already produced markup).
      const listHtml = item.bullets
        .map((b) => {
          const looksLikeHtml = /<[a-z][\s\S]*>/i.test(b);
          return `<li>${looksLikeHtml ? b : escapeHtml(b)}</li>`;
        })
        .join("");
      const existing = (item.description ?? "").trim();
      // Avoid creating a duplicate <ul> if a previous migration already ran
      const alreadyHasList = /<ul[\s>]/i.test(existing);
      item.description = alreadyHasList
        ? existing
        : existing
          ? `${existing}<ul>${listHtml}</ul>`
          : `<ul>${listHtml}</ul>`;
      item.bullets = [];
    }
  }
  return resume as Resume;
}

/**
 * Load the resume from localStorage, falling back to the default.
 * Returns DEFAULT_RESUME if anything goes wrong (corrupt JSON, missing keys, etc.).
 * Designed to be SSR-safe: returns the default when `window` is undefined.
 */
export function loadResume(): Resume {
  // SSR: return migrated default so SSR HTML already shows bullets as <ul>
  if (typeof window === "undefined") {
    return migrate(structuredClone(DEFAULT_RESUME));
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrate(structuredClone(DEFAULT_RESUME));
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.sections)) {
      return migrate(structuredClone(DEFAULT_RESUME));
    }
    return migrate(parsed);
  } catch {
    return migrate(structuredClone(DEFAULT_RESUME));
  }
}

export function saveResume(resume: Resume): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  } catch {
    // Quota exceeded or storage disabled — fail silently; the editor still works
    // for the current session.
  }
}

export function clearResume(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Export the resume as a pretty-printed JSON file the user can re-import later. */
export function downloadResumeJSON(resume: Resume): void {
  const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" });
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

/**
 * Parse a JSON file the user uploaded. Throws with a friendly message on failure
 * so the caller can surface it via a toast.
 */
export function parseResumeJSON(jsonText: string): Resume {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("JSON root must be an object.");
  }
  const r = parsed as Partial<Resume>;
  if (!r.header || !Array.isArray(r.sections)) {
    throw new Error("Missing `header` or `sections` — is this a resume export?");
  }
  return migrate(r);
}
