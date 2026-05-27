import { component$, useSignal, type QRL, $ } from "@builder.io/qwik";
import type { SectionType } from "~/data/resume";

interface Props {
  onAdd$: QRL<(type: SectionType) => void>;
  /** Section types already present — shown as "already added" but still allowed. */
  existingTypes: SectionType[];
}

interface MenuEntry {
  type: SectionType;
  label: string;
  description: string;
  icon: string; // single emoji-free SVG path 'd' attribute
}

// Curated options in a sensible default order. Users can always reorder later.
const MENU: MenuEntry[] = [
  {
    type: "summary",
    label: "Summary",
    description: "Short personal pitch at the top of the resume",
    icon: "M4 6h16M4 12h10M4 18h16",
  },
  {
    type: "languages",
    label: "Languages",
    description: "Spoken languages with proficiency dots",
    icon: "M5 8l4 8 4-8 4 8M5 16h8",
  },
  {
    type: "skills",
    label: "Skills & Knowledges",
    description: "Grouped technical skill chips",
    icon: "M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 14.8 7.1 17.2 8 11.7l-4-3.9L9.5 7z",
  },
  {
    type: "expertise",
    label: "Industry Expertise",
    description: "Soft skills shown as horizontal level bars",
    icon: "M3 12h6m3 0h9M3 6h12m3 0h3M3 18h3m3 0h15",
  },
  {
    type: "experience",
    label: "Experience",
    description: "Work history with bullet point achievements",
    icon: "M4 7h16M4 7v12a1 1 0 001 1h14a1 1 0 001-1V7M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2",
  },
  {
    type: "education",
    label: "Education",
    description: "Degrees, schools, and academic dates",
    icon: "M3 9l9-5 9 5-9 5-9-5zm0 0v6m18-6v6M7 12v4a5 5 0 0010 0v-4",
  },
  {
    type: "certifications",
    label: "Licenses & Certifications",
    description: "Two-column grid of credentials",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    type: "awards",
    label: "Honors & Awards",
    description: "Recognitions with descriptions and dates",
    icon: "M12 2l3 6 6 .8-4.5 4.2 1 6L12 16l-5.5 3 1-6L3 8.8 9 8z",
  },
  {
    type: "references",
    label: "References",
    description: "Past colleagues willing to vouch for you",
    icon: "M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  },
];

/**
 * AddSectionMenu — a dropdown trigger that expands to a card grid of section
 * types. Sits at the bottom of the editor pane (like the "+ Add slide" CTA
 * in editor apps).
 */
export const AddSectionMenu = component$<Props>(({ onAdd$, existingTypes }) => {
  const open = useSignal(false);

  const toggle$ = $(() => {
    open.value = !open.value;
  });

  return (
    <div class="relative">
      <button
        type="button"
        onClick$={toggle$}
        class={[
          "w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed",
          "py-4 px-5 text-sm font-medium transition-all",
          open.value
            ? "border-brand-orange text-brand-orange bg-brand-orange/5"
            : "border-brand-rule text-brand-slate hover:border-brand-orange hover:text-brand-orange hover:bg-brand-orange/5",
        ].join(" ")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>{open.value ? "Choose a section to add" : "Add a new section"}</span>
      </button>

      {open.value && (
        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border border-brand-rule bg-white shadow-paper-sm animate-fade-in-up">
          {MENU.map((entry) => {
            const exists = existingTypes.includes(entry.type);
            return (
              <button
                type="button"
                key={entry.type}
                onClick$={async () => {
                  await onAdd$(entry.type);
                  open.value = false;
                }}
                class="group flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-brand-orange/30 hover:bg-brand-orange/5 transition-colors text-left"
              >
                <div class="shrink-0 w-9 h-9 rounded-md bg-brand-mist text-brand-navy group-hover:bg-brand-orange/15 group-hover:text-brand-orange flex items-center justify-center transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d={entry.icon} />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-display font-semibold text-sm text-brand-navy">
                      {entry.label}
                    </span>
                    {exists && (
                      <span class="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-mist text-brand-slate">
                        added
                      </span>
                    )}
                  </div>
                  <p class="text-xs text-brand-slate mt-0.5 leading-snug">
                    {entry.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
