// ============================================================================
// Resume Schema
// ----------------------------------------------------------------------------
// This file is the canonical source of truth for the resume JSON format.
// Every section in the editor maps to one variant of `ResumeSection.data`.
// Add a new section type by:
//   1. Adding it to `SectionType`
//   2. Adding a payload interface
//   3. Discriminating it in `ResumeSection`
//   4. Adding a default factory in `createEmptySection()`
//   5. Rendering it in `<ResumePreview>` and `<SectionEditor>`
// ============================================================================

export type SectionType =
  | "summary"
  | "languages"
  | "skills"
  | "expertise"
  | "experience"
  | "education"
  | "certifications"
  | "awards"
  | "references";

/**
 * Header.contacts is an ordered, typed, append-able list. The order in the
 * array is the order rendered in the preview — no hardcoded slots.
 *
 * Each item has:
 *   - id: stable identifier so drag/edit doesn't lose focus
 *   - type: drives the icon glyph and the default href scheme
 *   - label: the visible text (e.g. "me@isaac.ng", "+852 1234 5678", "Hong Kong")
 *   - href: explicit URL/scheme; optional for "string" type (plain text only).
 *           For url/email/tel, if blank we derive from label.
 */
export type ContactKind = "string" | "url" | "email" | "tel";

export interface ContactItem {
  id: string;
  type: ContactKind;
  label: string;
  href?: string;
}

export interface Header {
  name: string;
  title: string;
  contacts: ContactItem[];
}

export interface SummaryData {
  text: string;
}

/**
 * Language proficiency is an enum, not free text. Selecting a level also
 * determines the dot count (1..5) for the proficiency indicator, so we keep
 * a single source of truth here.
 */
export const LANGUAGE_LEVELS = [
  "Basic",
  "Elementary",
  "Intermediate",
  "Conversational",
  "Proficient",
  "Advanced",
  "Native",
] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

/** Map level → number of filled dots (out of 5). */
export const LANGUAGE_LEVEL_DOTS: Record<LanguageLevel, number> = {
  Basic: 1,
  Elementary: 2,
  Intermediate: 3,
  Conversational: 3,
  Proficient: 4,
  Advanced: 4,
  Native: 5,
};

export interface LanguageItem {
  id: string;
  name: string;
  level: LanguageLevel;
}

export interface LanguagesData {
  items: LanguageItem[];
}

export interface SkillGroup {
  id: string;
  label: string;       // "Programming languages", "Frameworks", ...
  skills: string[];    // free-text list of chips
}

export interface SkillsData {
  groups: SkillGroup[];
}

export interface ExpertiseItem {
  id: string;
  label: string;
  level: number;       // 0..100 — drives the bar fill
}

export interface ExpertiseData {
  items: ExpertiseItem[];
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  location: string;
  /**
   * Stored as "YYYY-MM" (HTML `<input type="month">` native format). Rendered
   * as "MM/YYYY". `start` is required; an empty `end` means "present".
   */
  start: string;
  end: string;
  /** Rich-text (HTML) — TinyMCE-authored content including bullet lists. */
  description: string;
}

export interface ExperienceData {
  items: ExperienceItem[];
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  /** Stored as "YYYY-MM"; start required, empty end means "present". */
  start: string;
  end: string;
}

export interface EducationData {
  items: EducationItem[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
}

export interface CertificationsData {
  items: CertificationItem[];
}

export interface AwardItem {
  id: string;
  name: string;
  description: string;
}

export interface AwardsData {
  items: AwardItem[];
}

export interface ReferenceItem {
  id: string;
  name: string;
  role: string;
  contact: string;
}

export interface ReferencesData {
  items: ReferenceItem[];
}

// Discriminated union — keeps editor + preview in lock-step with type safety
export type ResumeSection =
  | { id: string; type: "summary"; title: string; visible: boolean; data: SummaryData }
  | { id: string; type: "languages"; title: string; visible: boolean; data: LanguagesData }
  | { id: string; type: "skills"; title: string; visible: boolean; data: SkillsData }
  | { id: string; type: "expertise"; title: string; visible: boolean; data: ExpertiseData }
  | { id: string; type: "experience"; title: string; visible: boolean; data: ExperienceData }
  | { id: string; type: "education"; title: string; visible: boolean; data: EducationData }
  | { id: string; type: "certifications"; title: string; visible: boolean; data: CertificationsData }
  | { id: string; type: "awards"; title: string; visible: boolean; data: AwardsData }
  | { id: string; type: "references"; title: string; visible: boolean; data: ReferencesData };

/**
 * Color palettes — accent and text bundled as a set. Users pick a palette,
 * not individual colors. Paper is always white per product spec.
 */
export interface ColorPalette {
  id: string;
  name: string;
  accent: string; // section headings, links, contact icons, expertise bars
  text: string;   // body copy and headings
}

export const PALETTES: ColorPalette[] = [
  { id: "orange-navy",    name: "Orange · Navy",     accent: "#E67E22", text: "#1F3A5F" },
  { id: "navy-black",     name: "Navy · Black",      accent: "#1F3A5F", text: "#111827" },
  { id: "green-charcoal", name: "Green · Charcoal",  accent: "#0F766E", text: "#374151" },
  { id: "purple-slate",   name: "Purple · Slate",    accent: "#7C3AED", text: "#334155" },
  { id: "magenta-graphite", name: "Magenta · Graphite", accent: "#BE185D", text: "#1F2937" },
  { id: "mono",           name: "Monochrome",        accent: "#111827", text: "#374151" },
];

export const DEFAULT_PALETTE_ID = "orange-navy";

export interface Resume {
  version: string;
  header: Header;
  sections: ResumeSection[];
  /** Theme palette id (from PALETTES) — or override colors individually. */
  theme?: {
    paletteId?: string;
    accent?: string; // override the palette's accent
    text?: string;   // override the palette's text
  };
}

// Tiny id helper — short enough to keep JSON readable
export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Default resume loading
// ----------------------------------------------------------------------------
// The default resume content is NOT compiled into the JS bundle. It lives at
// `/public/default-resume.json` so an admin can edit the JSON and commit to
// git for an auto-deployed update — no rebuild of components required.
//
// Both the file at `/public/default-resume.json` AND any JSON exported by
// the editor share the same `Resume` schema, so the file is round-trippable:
// import an exported JSON, edit it, save it as default-resume.json, commit.
// ============================================================================

/** Minimal empty resume for the SSR fallback path. */
export const EMPTY_RESUME: Resume = {
  version: "2.0.0",
  header: { name: "", title: "", contacts: [] },
  theme: { paletteId: DEFAULT_PALETTE_ID },
  sections: [],
};

/**
 * Fetch the default resume JSON shipped at `/default-resume.json`.
 * Used as the seed when no localStorage data exists and on Reset.
 */
export async function loadDefaultResume(): Promise<Resume> {
  if (typeof fetch === "undefined") return EMPTY_RESUME;
  try {
    const res = await fetch("/default-resume.json", { cache: "no-cache" });
    if (!res.ok) return EMPTY_RESUME;
    const data = (await res.json()) as Resume;
    return data;
  } catch {
    return EMPTY_RESUME;
  }
}


// Factories so the "Add section" UI can spawn empty templates safely
export function createEmptySection(type: SectionType): ResumeSection {
  const id = uid("sec");
  switch (type) {
    case "summary":
      return { id, type, title: "Summary", visible: true, data: { text: "" } };
    case "languages":
      return { id, type, title: "Languages", visible: true, data: { items: [] } };
    case "skills":
      return { id, type, title: "Skills & Knowledges", visible: true, data: { groups: [] } };
    case "expertise":
      return { id, type, title: "Industry Expertise", visible: true, data: { items: [] } };
    case "experience":
      return { id, type, title: "Experience", visible: true, data: { items: [] } };
    case "education":
      return { id, type, title: "Education", visible: true, data: { items: [] } };
    case "certifications":
      return { id, type, title: "Licenses & Certifications", visible: true, data: { items: [] } };
    case "awards":
      return { id, type, title: "Honors & Awards", visible: true, data: { items: [] } };
    case "references":
      return { id, type, title: "References", visible: true, data: { items: [] } };
  }
}
