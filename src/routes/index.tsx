import {
  component$,
  useStore,
  useSignal,
  useTask$,
  useVisibleTask$,
  $,
  noSerialize,
  type NoSerialize,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

import {
  DEFAULT_RESUME,
  createEmptySection,
  type Resume,
  type ResumeSection,
  type SectionType,
  type Header,
} from "~/data/resume";
import {
  loadResume,
  saveResume,
  downloadResumeJSON,
  parseResumeJSON,
  migrate,
} from "~/utils/storage";
import { exportResumePDF } from "~/utils/pdf";

import { Toolbar } from "~/components/Toolbar";
import { HeaderEditor } from "~/components/HeaderEditor";
import { SectionEditor } from "~/components/SectionEditor";
import { AddSectionMenu } from "~/components/AddSectionMenu";
import { ResumePreview } from "~/components/ResumePreview";

// ============================================================================
// Main page — owns the canonical resume state, persists it to localStorage,
// and orchestrates the split-pane editor / live preview UI.
// ============================================================================

interface PageStore {
  resume: Resume;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  toast: string | null;
  /** Tracks initial hydration so saveResume() doesn't fire before loadResume() runs. */
  hydrated: boolean;
}

export default component$(() => {
  // Start from DEFAULT_RESUME so SSR has stable content; useVisibleTask$ below
  // swaps in the stored copy once the client mounts.
  const store = useStore<PageStore>(
    {
      resume: migrate(structuredClone(DEFAULT_RESUME)),
      draggedIndex: null,
      dragOverIndex: null,
      toast: null,
      hydrated: false,
    },
    { deep: true },
  );

  const zoom = useSignal(0.7);
  const isExporting = useSignal(false);
  const toastTimer = useSignal<NoSerialize<ReturnType<typeof setTimeout>> | undefined>(undefined);

  // ---- Lifecycle ----------------------------------------------------------

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    // On client mount, replace the SSR-rendered DEFAULT with whatever the user
    // had saved last time. We mutate keys rather than reassigning so Qwik's
    // tracking continues to work.
    const stored = loadResume();
    store.resume.version = stored.version;
    store.resume.header = stored.header;
    store.resume.sections = stored.sections;
    store.resume.theme = stored.theme;
    store.hydrated = true;
  });

  // Persist on every meaningful change. The `hydrated` gate prevents us from
  // overwriting saved data with the SSR fallback on first render.
  useTask$(({ track }) => {
    track(() => store.resume);
    track(() => store.resume.sections);
    track(() => store.resume.header);
    track(() => store.resume.theme);
    track(() => store.hydrated);
    if (!store.hydrated) return;
    saveResume(store.resume);
  });

  // ---- Helpers ------------------------------------------------------------

  const showToast$ = $((message: string) => {
    store.toast = message;
    if (toastTimer.value) clearTimeout(toastTimer.value);
    toastTimer.value = noSerialize(
      setTimeout(() => {
        store.toast = null;
      }, 2400),
    );
  });

  // ---- Header -------------------------------------------------------------

  const onHeaderUpdate$ = $((next: Header) => {
    store.resume.header = next;
  });

  // ---- Sections: update / delete / visibility / move ---------------------

  const onSectionUpdate$ = $((updated: ResumeSection) => {
    const idx = store.resume.sections.findIndex((s) => s.id === updated.id);
    if (idx === -1) return;
    const next = store.resume.sections.slice();
    next[idx] = updated;
    store.resume.sections = next;
  });

  const onSectionDelete$ = $((id: string) => {
    store.resume.sections = store.resume.sections.filter((s) => s.id !== id);
  });

  const onSectionToggleVisible$ = $((id: string) => {
    store.resume.sections = store.resume.sections.map((s) =>
      s.id === id ? ({ ...s, visible: s.visible === false ? true : false } as ResumeSection) : s,
    );
  });

  const moveSection$ = $((id: string, direction: -1 | 1) => {
    const idx = store.resume.sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= store.resume.sections.length) return;
    const next = store.resume.sections.slice();
    const [removed] = next.splice(idx, 1);
    next.splice(target, 0, removed);
    store.resume.sections = next;
  });

  const onAddSection$ = $((type: SectionType) => {
    store.resume.sections = [...store.resume.sections, createEmptySection(type)];
    showToast$(`Added new ${type} section`);
  });

  // ---- Drag-and-drop reorder ---------------------------------------------

  const onDragStart$ = $((index: number) => {
    store.draggedIndex = index;
  });
  const onDragOver$ = $((index: number) => {
    store.dragOverIndex = index;
  });
  const onDrop$ = $((dropIndex: number) => {
    const from = store.draggedIndex;
    if (from === null || from === dropIndex) {
      store.draggedIndex = null;
      store.dragOverIndex = null;
      return;
    }
    const next = store.resume.sections.slice();
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    store.resume.sections = next;
    store.draggedIndex = null;
    store.dragOverIndex = null;
  });
  const onDragEnd$ = $(() => {
    store.draggedIndex = null;
    store.dragOverIndex = null;
  });

  // ---- Toolbar actions ---------------------------------------------------

  const onExportPDF$ = $(async () => {
    if (isExporting.value) return;
    isExporting.value = true;
    try {
      const node = document.getElementById("resume-preview-page");
      if (!node) throw new Error("Preview not found");
      const slug = store.resume.header.name
        ? store.resume.header.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        : "resume";
      await exportResumePDF({ node, fileName: `${slug}.pdf` });
      showToast$("PDF exported");
    } catch (e) {
      console.error(e);
      showToast$("PDF export failed");
    } finally {
      isExporting.value = false;
    }
  });

  const onExportJSON$ = $(() => {
    downloadResumeJSON(store.resume);
    showToast$("JSON downloaded");
  });

  const onImportJSON$ = $((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = parseResumeJSON(text);
        store.resume.version = parsed.version;
        store.resume.header = parsed.header;
        store.resume.sections = parsed.sections;
        store.resume.theme = parsed.theme;
        showToast$("Resume imported");
      } catch (err) {
        console.error(err);
        showToast$(err instanceof Error ? err.message : "Import failed");
      }
    };
    reader.onerror = () => showToast$("Could not read file");
    reader.readAsText(file);
  });

  const onReset$ = $(() => {
    if (typeof window !== "undefined" && !window.confirm("Reset all content to the default sample resume? This cannot be undone.")) {
      return;
    }
    const fresh = migrate(structuredClone(DEFAULT_RESUME));
    store.resume.version = fresh.version;
    store.resume.header = fresh.header;
    store.resume.sections = fresh.sections;
    store.resume.theme = fresh.theme;
    showToast$("Reset to default");
  });

  const onAccentChange$ = $((hex: string) => {
    const current = store.resume.theme ?? { accent: "#E67E22", text: "#1F3A5F", paper: "#ffffff" };
    store.resume.theme = { ...current, accent: hex };
  });

  // ---- Render ------------------------------------------------------------

  return (
    <div class="min-h-screen bg-brand-mist text-brand-navy flex flex-col">
      <Toolbar
        zoom={zoom}
        isExporting={isExporting}
        onExportPDF$={onExportPDF$}
        onExportJSON$={onExportJSON$}
        onImportJSON$={onImportJSON$}
        onReset$={onReset$}
        onAccentChange$={onAccentChange$}
        accent={store.resume.theme?.accent ?? "#E67E22"}
      />

      <main class="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* ---- EDITOR PANE ---- */}
        <section class="no-print w-full lg:w-[44%] xl:w-[40%] border-r border-brand-rule bg-white">
          <div class="h-[calc(100vh-57px)] overflow-y-auto editor-scroll">
            <div class="max-w-2xl mx-auto px-5 py-6 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="font-display text-xl font-semibold text-brand-navy">
                    Edit your resume
                  </h1>
                  <p class="text-xs text-brand-slate mt-0.5">
                    Changes save automatically. Drag the handle on any section to reorder.
                  </p>
                </div>
                <span class="text-[10px] font-mono uppercase tracking-wider text-brand-slate px-2 py-1 rounded bg-brand-mist">
                  {store.resume.sections.length} sections
                </span>
              </div>

              <HeaderEditor header={store.resume.header} onUpdate$={onHeaderUpdate$} />

              <div class="space-y-3">
                {store.resume.sections.map((section, index) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    index={index}
                    isDragging={store.draggedIndex === index}
                    isDragOver={store.dragOverIndex === index && store.draggedIndex !== index}
                    canMoveUp={index > 0}
                    canMoveDown={index < store.resume.sections.length - 1}
                    onUpdate$={onSectionUpdate$}
                    onDelete$={$(() => onSectionDelete$(section.id))}
                    onToggleVisible$={$(() => onSectionToggleVisible$(section.id))}
                    onMoveUp$={$(() => moveSection$(section.id, -1))}
                    onMoveDown$={$(() => moveSection$(section.id, 1))}
                    onDragStart$={onDragStart$}
                    onDragOver$={onDragOver$}
                    onDrop$={onDrop$}
                    onDragEnd$={onDragEnd$}
                  />
                ))}
              </div>

              <AddSectionMenu
                onAdd$={onAddSection$}
                existingTypes={store.resume.sections.map((s) => s.type)}
              />

              <footer class="pt-6 pb-4 text-center">
                <p class="text-[11px] text-brand-slate">
                  Built with Qwik · Resume data lives in your browser only
                </p>
              </footer>
            </div>
          </div>
        </section>

        {/* ---- PREVIEW PANE ---- */}
        <section class="flex-1 bg-brand-mist relative overflow-hidden">
          {/* Zoom badge */}
          <div class="no-print absolute top-3 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/85 backdrop-blur border border-brand-rule shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-brand-slate">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <span class="text-[11px] font-mono tabular-nums text-brand-slate">
              {Math.round(zoom.value * 100)}%
            </span>
          </div>

          <div class="h-[calc(100vh-57px)] overflow-auto preview-scroll">
            <div class="min-h-full flex justify-center items-start py-8 px-4">
              <div
                style={{
                  transform: `scale(${zoom.value})`,
                  transformOrigin: "top center",
                  // Manually offset the parent's height since `scale()` doesn't affect layout
                  marginBottom: `${(1 - zoom.value) * 1123}px`,
                }}
              >
                <ResumePreview resume={store.resume} />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Toast */}
      {store.toast && (
        <div class="no-print fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-lg bg-brand-navy text-white text-sm shadow-paper animate-fade-in-up">
          {store.toast}
        </div>
      )}

      {/* Loading overlay during PDF export */}
      {isExporting.value && (
        <div class="no-print fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center">
          <div class="bg-white rounded-xl px-6 py-5 shadow-paper flex items-center gap-3">
            <div class="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
            <div>
              <div class="font-display font-semibold text-brand-navy text-sm">Generating PDF</div>
              <div class="text-xs text-brand-slate">Capturing the live preview…</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Resume Forge — Qwik Resume Editor",
  meta: [
    {
      name: "description",
      content: "Edit, reorder, and export your resume. Built with Qwik and Tailwind.",
    },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1",
    },
  ],
};
