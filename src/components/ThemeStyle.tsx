import { component$ } from "@builder.io/qwik";
import { PALETTES, DEFAULT_PALETTE_ID, type Resume } from "~/data/resume";

/** Convert #RRGGBB → "r, g, b" for use in rgba(). */
function hexToRgb(hex: string): string {
  const m = hex.replace("#", "");
  const n = m.length === 3
    ? m.split("").map((c) => c + c).join("")
    : m;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function resolveTheme(resume: Resume): { accent: string; text: string } {
  const t = resume.theme ?? {};
  const palette = PALETTES.find((p) => p.id === (t.paletteId ?? DEFAULT_PALETTE_ID)) ?? PALETTES[0];
  return { accent: t.accent ?? palette.accent, text: t.text ?? palette.text };
}

/**
 * Emits a <style> tag that sets the theme CSS variables on :root. Rendering it
 * inside the app means the chosen palette drives ALL chrome that references
 * var(--accent)/var(--text): editor inputs, buttons, tag chips, TinyMCE links,
 * bullets, focus rings, etc. — not just the preview.
 *
 * It re-renders whenever the resume theme changes (it reads resume.theme), so
 * switching the palette live updates the whole UI.
 */
export const ThemeStyle = component$<{ accent: string; text: string }>(({ accent, text }) => {
  const accentRgb = hexToRgb(accent);
  const css = `:root{--accent:${accent};--text:${text};--accent-soft:rgba(${accentRgb},0.12);--accent-softer:rgba(${accentRgb},0.08);}`;
  return <style dangerouslySetInnerHTML={css} />;
});
