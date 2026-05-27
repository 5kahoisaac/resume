import { component$, $, Slot, type QRL } from "@builder.io/qwik";
import type { ResumeSection } from "~/data/resume";
import { uid } from "~/data/resume";
import { RichTextEditor } from "./RichTextEditor";
import { TagInput } from "./TagInput";

// ============================================================================
// SectionEditor — one editable card for one resume section.
// The parent (`/routes/index.tsx`) owns the resume state and passes down
// `onUpdate$` QRL callbacks that immutably replace this section in the array.
// Each section type has its own form layout, but they all share the
// drag-handle / move / hide / delete header strip.
// ============================================================================

interface Props {
  section: ResumeSection;
  index: number;
  onUpdate$: QRL<(updated: ResumeSection) => void>;
  onDelete$: QRL<() => void>;
  onToggleVisible$: QRL<() => void>;
  onMoveUp$: QRL<() => void>;
  onMoveDown$: QRL<() => void>;
  onDragStart$: QRL<(index: number) => void>;
  onDragOver$: QRL<(index: number) => void>;
  onDrop$: QRL<(index: number) => void>;
  onDragEnd$: QRL<() => void>;
  isDragging: boolean;
  isDragOver: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export const SectionEditor = component$<Props>((props) => {
  const { section } = props;

  // Push a new section object upstream with a shallow-merged `data` field.
  const patchData = $((patch: Record<string, unknown>) => {
    props.onUpdate$({
      ...section,
      data: { ...section.data, ...patch },
    } as ResumeSection);
  });

  const renameTitle = $((value: string) => {
    props.onUpdate$({ ...section, title: value } as ResumeSection);
  });

  return (
    <div
      class={[
        "section-card group rounded-xl border bg-white/70 backdrop-blur-sm",
        props.isDragging ? "dragging" : "",
        props.isDragOver ? "drag-over" : "border-brand-rule",
      ].join(" ")}
      draggable
      onDragStart$={() => props.onDragStart$(props.index)}
      onDragOver$={(ev) => {
        ev.preventDefault();
        props.onDragOver$(props.index);
      }}
      onDrop$={(ev) => {
        ev.preventDefault();
        props.onDrop$(props.index);
      }}
      onDragEnd$={() => props.onDragEnd$()}
    >
      {/* Header strip — drag handle, type pill, editable title, controls */}
      <div class="flex items-center gap-2 border-b border-brand-rule/60 px-3 py-2.5">
        <span
          class="cursor-grab active:cursor-grabbing select-none text-brand-slate/60 hover:text-brand-orange transition-colors"
          title="Drag to reorder"
          aria-label="Drag handle"
        >
          <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
            <circle cx="3" cy="4" r="1.4" />
            <circle cx="3" cy="10" r="1.4" />
            <circle cx="3" cy="16" r="1.4" />
            <circle cx="11" cy="4" r="1.4" />
            <circle cx="11" cy="10" r="1.4" />
            <circle cx="11" cy="16" r="1.4" />
          </svg>
        </span>

        <span
          class="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-mist text-brand-slate"
          title={`Section type: ${section.type}`}
        >
          {section.type}
        </span>

        <input
          type="text"
          value={section.title}
          onInput$={(_, el) => renameTitle((el as HTMLInputElement).value)}
          class="flex-1 bg-transparent font-display font-semibold text-brand-navy text-base outline-none focus:bg-white/80 rounded px-1.5 py-0.5"
          placeholder="Section title"
        />

        <div class="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <IconButton label="Move up" disabled={!props.canMoveUp} onClick$={props.onMoveUp$}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </IconButton>
          <IconButton label="Move down" disabled={!props.canMoveDown} onClick$={props.onMoveDown$}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </IconButton>
          <IconButton
            label={section.visible ? "Hide from preview" : "Show in preview"}
            onClick$={props.onToggleVisible$}
            active={!section.visible}
          >
            {section.visible ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            )}
          </IconButton>
          <IconButton label="Delete section" onClick$={props.onDelete$} danger>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </IconButton>
        </div>
      </div>

      {/* Body — dispatched by section type */}
      <div class="px-4 py-3.5 space-y-3">
        {section.type === "summary" && <SummaryEditor section={section} patchData$={patchData} />}
        {section.type === "languages" && <LanguagesEditor section={section} patchData$={patchData} />}
        {section.type === "skills" && <SkillsEditor section={section} patchData$={patchData} />}
        {section.type === "expertise" && <ExpertiseEditor section={section} patchData$={patchData} />}
        {section.type === "experience" && <ExperienceEditor section={section} patchData$={patchData} />}
        {section.type === "education" && <EducationEditor section={section} patchData$={patchData} />}
        {section.type === "certifications" && <CertificationsEditor section={section} patchData$={patchData} />}
        {section.type === "awards" && <AwardsEditor section={section} patchData$={patchData} />}
        {section.type === "references" && <ReferencesEditor section={section} patchData$={patchData} />}
      </div>
    </div>
  );
});

// ---- Reusable button bits --------------------------------------------------

const IconButton = component$<{
  label: string;
  onClick$: QRL<() => void>;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}>((props) => (
  <button
    type="button"
    title={props.label}
    aria-label={props.label}
    disabled={props.disabled}
    onClick$={props.onClick$}
    class={[
      "h-7 w-7 inline-flex items-center justify-center rounded-md transition-all",
      "disabled:opacity-30 disabled:cursor-not-allowed",
      props.danger
        ? "text-brand-slate hover:bg-red-50 hover:text-red-600"
        : props.active
        ? "bg-brand-orange/10 text-brand-orange"
        : "text-brand-slate hover:bg-brand-mist hover:text-brand-navy",
    ].join(" ")}
  >
    <Slot />
  </button>
));

const RowFrame = component$<{
  onMoveUp$: QRL<() => void>;
  onMoveDown$: QRL<() => void>;
  onRemove$: QRL<() => void>;
  canUp: boolean;
  canDown: boolean;
}>((props) => (
  <div class="group/row relative rounded-lg border border-brand-rule/70 bg-brand-mist/40 p-2.5">
    <div class="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
      <button type="button" title="Move up" disabled={!props.canUp} onClick$={props.onMoveUp$}
        class="h-5 w-5 inline-flex items-center justify-center rounded text-brand-slate hover:bg-white hover:text-brand-navy disabled:opacity-30">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
      <button type="button" title="Move down" disabled={!props.canDown} onClick$={props.onMoveDown$}
        class="h-5 w-5 inline-flex items-center justify-center rounded text-brand-slate hover:bg-white hover:text-brand-navy disabled:opacity-30">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <button type="button" title="Remove" onClick$={props.onRemove$}
        class="h-5 w-5 inline-flex items-center justify-center rounded text-brand-slate hover:bg-red-50 hover:text-red-600">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <Slot />
  </div>
));

const AddButton = component$<{ label: string; onClick$: QRL<() => void> }>((props) => (
  <button
    type="button"
    onClick$={props.onClick$}
    class="w-full text-left text-sm font-medium text-brand-orange hover:text-brand-navy transition-colors px-3 py-2 rounded-lg border border-dashed border-brand-rule hover:border-brand-orange hover:bg-brand-orange/5"
  >
    + {props.label}
  </button>
));

// ============================================================================
// Per-section editors. Each one extracts items/groups, mutates them
// immutably, and forwards the new payload via patchData$.
// ============================================================================

// ---- Summary ---------------------------------------------------------------
type SummarySec = Extract<ResumeSection, { type: "summary" }>;
const SummaryEditor = component$<{
  section: SummarySec;
  patchData$: QRL<(patch: Record<string, unknown>) => void>;
}>(({ section, patchData$ }) => (
  <RichTextEditor
    value={section.data.text}
    onChange$={$((html: string) => patchData$({ text: html }))}
    placeholder="A short professional summary…"
    height={260}
  />
));

// ---- Languages -------------------------------------------------------------
type LangSec = Extract<ResumeSection, { type: "languages" }>;
const LanguagesEditor = component$<{
  section: LangSec;
  patchData$: QRL<(patch: Record<string, unknown>) => void>;
}>(({ section, patchData$ }) => {
  const items = section.data.items;
  const set = $((next: typeof items) => patchData$({ items: next }));
  return (
    <div class="space-y-2">
      {items.map((item, idx) => (
        <RowFrame
          key={item.id}
          canUp={idx > 0}
          canDown={idx < items.length - 1}
          onMoveUp$={$(() => { const c = items.slice(); [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; set(c); })}
          onMoveDown$={$(() => { const c = items.slice(); [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; set(c); })}
          onRemove$={$(() => set(items.filter((_, i) => i !== idx)))}
        >
          <div class="grid grid-cols-[1fr_1fr_auto] gap-2 items-center pr-16">
            <input class="field-input" placeholder="Language" value={item.name}
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, name: (el as HTMLInputElement).value }; set(c); }} />
            <input class="field-input" placeholder="Level (e.g. Native)" value={item.level}
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, level: (el as HTMLInputElement).value }; set(c); }} />
            <div class="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  class="w-3.5 h-3.5 rounded-full transition-all hover:scale-110"
                  style={{ background: n <= item.proficiency ? "#E67E22" : "#E5E9F0" }}
                  onClick$={() => { const c = items.slice(); c[idx] = { ...item, proficiency: n }; set(c); }}
                  aria-label={`Set proficiency ${n} of 5`}
                />
              ))}
            </div>
          </div>
        </RowFrame>
      ))}
      <AddButton label="Add language"
        onClick$={$(() => set([...items, { id: uid("lang"), name: "", level: "", proficiency: 3 }]))} />
    </div>
  );
});

// ---- Skills ----------------------------------------------------------------
type SkillsSec = Extract<ResumeSection, { type: "skills" }>;
const SkillsEditor = component$<{
  section: SkillsSec;
  patchData$: QRL<(patch: Record<string, unknown>) => void>;
}>(({ section, patchData$ }) => {
  const groups = section.data.groups;
  const set = $((next: typeof groups) => patchData$({ groups: next }));
  return (
    <div class="space-y-2">
      {groups.map((g, idx) => (
        <RowFrame
          key={g.id}
          canUp={idx > 0}
          canDown={idx < groups.length - 1}
          onMoveUp$={$(() => { const c = groups.slice(); [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; set(c); })}
          onMoveDown$={$(() => { const c = groups.slice(); [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; set(c); })}
          onRemove$={$(() => set(groups.filter((_, i) => i !== idx)))}
        >
          <div class="space-y-2 pr-16">
            <input class="field-input font-semibold" placeholder="Group label (e.g. Programming languages)"
              value={g.label}
              onInput$={(_, el) => { const c = groups.slice(); c[idx] = { ...g, label: (el as HTMLInputElement).value }; set(c); }} />
            <TagInput
              values={g.skills}
              onChange$={$((next: string[]) => {
                const c = groups.slice();
                c[idx] = { ...g, skills: next };
                set(c);
              })}
              placeholder="Type a skill, press Enter (or paste a comma-separated list)"
            />
          </div>
        </RowFrame>
      ))}
      <AddButton label="Add skill group"
        onClick$={$(() => set([...groups, { id: uid("grp"), label: "", skills: [] }]))} />
    </div>
  );
});

// ---- Expertise -------------------------------------------------------------
type ExpSec = Extract<ResumeSection, { type: "expertise" }>;
const ExpertiseEditor = component$<{
  section: ExpSec;
  patchData$: QRL<(patch: Record<string, unknown>) => void>;
}>(({ section, patchData$ }) => {
  const items = section.data.items;
  const set = $((next: typeof items) => patchData$({ items: next }));
  return (
    <div class="space-y-2">
      {items.map((item, idx) => (
        <RowFrame
          key={item.id}
          canUp={idx > 0}
          canDown={idx < items.length - 1}
          onMoveUp$={$(() => { const c = items.slice(); [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; set(c); })}
          onMoveDown$={$(() => { const c = items.slice(); [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; set(c); })}
          onRemove$={$(() => set(items.filter((_, i) => i !== idx)))}
        >
          <div class="grid grid-cols-[1fr_120px_44px] gap-2 items-center pr-16">
            <input class="field-input" placeholder="Expertise area" value={item.label}
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, label: (el as HTMLInputElement).value }; set(c); }} />
            <input type="range" min="0" max="100" value={item.level} class="accent-brand-orange"
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, level: Number((el as HTMLInputElement).value) }; set(c); }} />
            <span class="font-mono text-xs text-brand-slate text-right">{item.level}%</span>
          </div>
        </RowFrame>
      ))}
      <AddButton label="Add expertise"
        onClick$={$(() => set([...items, { id: uid("exp"), label: "", level: 60 }]))} />
    </div>
  );
});

// ---- Experience ------------------------------------------------------------
type XpSec = Extract<ResumeSection, { type: "experience" }>;
const ExperienceEditor = component$<{
  section: XpSec;
  patchData$: QRL<(patch: Record<string, unknown>) => void>;
}>(({ section, patchData$ }) => {
  const items = section.data.items;
  const set = $((next: typeof items) => patchData$({ items: next }));
  return (
    <div class="space-y-2">
      {items.map((item, idx) => (
        <RowFrame
          key={item.id}
          canUp={idx > 0}
          canDown={idx < items.length - 1}
          onMoveUp$={$(() => { const c = items.slice(); [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; set(c); })}
          onMoveDown$={$(() => { const c = items.slice(); [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; set(c); })}
          onRemove$={$(() => set(items.filter((_, i) => i !== idx)))}
        >
          <div class="space-y-2 pr-16">
            <div class="grid grid-cols-2 gap-2">
              <input class="field-input" placeholder="Job title" value={item.title}
                onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, title: (el as HTMLInputElement).value }; set(c); }} />
              <input class="field-input" placeholder="Company" value={item.company}
                onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, company: (el as HTMLInputElement).value }; set(c); }} />
            </div>
            <div class="grid grid-cols-[1fr_1fr_2fr] gap-2">
              <input class="field-input" placeholder="Start (e.g. 03/2023)" value={item.start}
                onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, start: (el as HTMLInputElement).value }; set(c); }} />
              <input class="field-input" placeholder="End (or empty)" value={item.end}
                onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, end: (el as HTMLInputElement).value }; set(c); }} />
              <input class="field-input" placeholder="Location" value={item.location}
                onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, location: (el as HTMLInputElement).value }; set(c); }} />
            </div>
            <div>
              <div class="text-[10px] font-mono uppercase tracking-wider text-brand-slate mb-1">
                Description &amp; Achievements
              </div>
              <RichTextEditor
                value={item.description}
                onChange$={$((html: string) => {
                  const c = items.slice();
                  c[idx] = { ...item, description: html };
                  set(c);
                })}
                placeholder="Describe the role, then use the bullet/number list toolbar buttons for achievements"
                height={300}
              />
            </div>
          </div>
        </RowFrame>
      ))}
      <AddButton label="Add experience"
        onClick$={$(() => set([...items, {
          id: uid("xp"), title: "", company: "", location: "", start: "", end: "", description: "", bullets: [],
        }]))} />
    </div>
  );
});

// ---- Education ------------------------------------------------------------
type EduSec = Extract<ResumeSection, { type: "education" }>;
const EducationEditor = component$<{
  section: EduSec;
  patchData$: QRL<(patch: Record<string, unknown>) => void>;
}>(({ section, patchData$ }) => {
  const items = section.data.items;
  const set = $((next: typeof items) => patchData$({ items: next }));
  return (
    <div class="space-y-2">
      {items.map((item, idx) => (
        <RowFrame
          key={item.id}
          canUp={idx > 0}
          canDown={idx < items.length - 1}
          onMoveUp$={$(() => { const c = items.slice(); [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; set(c); })}
          onMoveDown$={$(() => { const c = items.slice(); [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; set(c); })}
          onRemove$={$(() => set(items.filter((_, i) => i !== idx)))}
        >
          <div class="space-y-2 pr-16">
            <input class="field-input" placeholder="Degree" value={item.degree}
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, degree: (el as HTMLInputElement).value }; set(c); }} />
            <input class="field-input" placeholder="School" value={item.school}
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, school: (el as HTMLInputElement).value }; set(c); }} />
            <div class="grid grid-cols-2 gap-2">
              <input class="field-input" placeholder="Start" value={item.start}
                onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, start: (el as HTMLInputElement).value }; set(c); }} />
              <input class="field-input" placeholder="End" value={item.end}
                onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, end: (el as HTMLInputElement).value }; set(c); }} />
            </div>
          </div>
        </RowFrame>
      ))}
      <AddButton label="Add education"
        onClick$={$(() => set([...items, { id: uid("edu"), degree: "", school: "", start: "", end: "" }]))} />
    </div>
  );
});

// ---- Certifications -------------------------------------------------------
type CrtSec = Extract<ResumeSection, { type: "certifications" }>;
const CertificationsEditor = component$<{
  section: CrtSec;
  patchData$: QRL<(patch: Record<string, unknown>) => void>;
}>(({ section, patchData$ }) => {
  const items = section.data.items;
  const set = $((next: typeof items) => patchData$({ items: next }));
  return (
    <div class="space-y-2">
      {items.map((item, idx) => (
        <RowFrame
          key={item.id}
          canUp={idx > 0}
          canDown={idx < items.length - 1}
          onMoveUp$={$(() => { const c = items.slice(); [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; set(c); })}
          onMoveDown$={$(() => { const c = items.slice(); [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; set(c); })}
          onRemove$={$(() => set(items.filter((_, i) => i !== idx)))}
        >
          <div class="grid grid-cols-2 gap-2 pr-16">
            <input class="field-input" placeholder="Certification name" value={item.name}
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, name: (el as HTMLInputElement).value }; set(c); }} />
            <input class="field-input" placeholder="Issuer" value={item.issuer}
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, issuer: (el as HTMLInputElement).value }; set(c); }} />
          </div>
        </RowFrame>
      ))}
      <AddButton label="Add certification"
        onClick$={$(() => set([...items, { id: uid("crt"), name: "", issuer: "" }]))} />
    </div>
  );
});

// ---- Awards ---------------------------------------------------------------
type AwdSec = Extract<ResumeSection, { type: "awards" }>;
const AwardsEditor = component$<{
  section: AwdSec;
  patchData$: QRL<(patch: Record<string, unknown>) => void>;
}>(({ section, patchData$ }) => {
  const items = section.data.items;
  const set = $((next: typeof items) => patchData$({ items: next }));
  return (
    <div class="space-y-2">
      {items.map((item, idx) => (
        <RowFrame
          key={item.id}
          canUp={idx > 0}
          canDown={idx < items.length - 1}
          onMoveUp$={$(() => { const c = items.slice(); [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; set(c); })}
          onMoveDown$={$(() => { const c = items.slice(); [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; set(c); })}
          onRemove$={$(() => set(items.filter((_, i) => i !== idx)))}
        >
          <div class="space-y-2 pr-16">
            <input class="field-input" placeholder="Award name" value={item.name}
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, name: (el as HTMLInputElement).value }; set(c); }} />
            <RichTextEditor
              value={item.description}
              onChange$={$((html: string) => {
                const c = items.slice();
                c[idx] = { ...item, description: html };
                set(c);
              })}
              variant="compact"
              placeholder="Description — what the award was for"
              height={200}
            />
          </div>
        </RowFrame>
      ))}
      <AddButton label="Add award"
        onClick$={$(() => set([...items, { id: uid("awd"), name: "", description: "" }]))} />
    </div>
  );
});

// ---- References -----------------------------------------------------------
type RefSec = Extract<ResumeSection, { type: "references" }>;
const ReferencesEditor = component$<{
  section: RefSec;
  patchData$: QRL<(patch: Record<string, unknown>) => void>;
}>(({ section, patchData$ }) => {
  const items = section.data.items;
  const set = $((next: typeof items) => patchData$({ items: next }));
  return (
    <div class="space-y-2">
      {items.map((item, idx) => (
        <RowFrame
          key={item.id}
          canUp={idx > 0}
          canDown={idx < items.length - 1}
          onMoveUp$={$(() => { const c = items.slice(); [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; set(c); })}
          onMoveDown$={$(() => { const c = items.slice(); [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; set(c); })}
          onRemove$={$(() => set(items.filter((_, i) => i !== idx)))}
        >
          <div class="space-y-2 pr-16">
            <div class="grid grid-cols-2 gap-2">
              <input class="field-input" placeholder="Name" value={item.name}
                onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, name: (el as HTMLInputElement).value }; set(c); }} />
              <input class="field-input" placeholder="Role / company" value={item.role}
                onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, role: (el as HTMLInputElement).value }; set(c); }} />
            </div>
            <input class="field-input" placeholder="Contact (phone, email, etc.)" value={item.contact}
              onInput$={(_, el) => { const c = items.slice(); c[idx] = { ...item, contact: (el as HTMLInputElement).value }; set(c); }} />
          </div>
        </RowFrame>
      ))}
      <AddButton label="Add reference"
        onClick$={$(() => set([...items, { id: uid("ref"), name: "", role: "", contact: "" }]))} />
    </div>
  );
});
