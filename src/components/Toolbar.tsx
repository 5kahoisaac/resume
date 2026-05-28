import { component$, type QRL, type Signal, useSignal, $, Slot } from "@builder.io/qwik";
import { PALETTES } from "~/data/resume";

interface Props {
  zoom: Signal<number>;          // 0.4..1.2 — bound to preview transform scale
  isExporting: Signal<boolean>;
  onExportPDF$: QRL<() => void>;
  onExportJSON$?: QRL<() => void>;
  onImportJSON$?: QRL<(file: File) => void>;
  onReset$?: QRL<() => void>;
  onPaletteChange$?: QRL<(paletteId: string) => void>;
  paletteId: string;
  /** When false, hides editing actions (used by the read-only home page). */
  showEditingActions?: boolean;
}

/**
 * The sticky top toolbar. Editing actions (reset/import/export-json/palette)
 * are gated behind `showEditingActions`. The zoom control sits on the RIGHT
 * next to its percentage indicator (clearer than buried mid-bar). Default
 * zoom is 80%.
 */
export const Toolbar = component$<Props>((props) => {
  const fileInputRef = useSignal<HTMLInputElement>();
  const showEditing = props.showEditingActions !== false;
  const accent = (PALETTES.find((p) => p.id === props.paletteId) ?? PALETTES[0]).accent;

  return (
    <header class="no-print sticky top-0 z-30 border-b border-brand-rule bg-white/80 backdrop-blur-md">
      <div class="flex items-center gap-3 px-5 py-3">
        {/* Brand mark */}
        <div class="flex items-center gap-2.5 mr-1">
          <div
            class="h-8 w-8 rounded-lg flex items-center justify-center font-display font-bold text-white text-sm"
            style={{ background: accent }}
          >
            R
          </div>
          <div>
            <div class="font-display font-semibold text-brand-navy text-[15px] leading-tight">
              Resume Forge
            </div>
            <div class="font-mono text-[10px] text-brand-slate uppercase tracking-wider leading-tight">
              Qwik · Tailwind
            </div>
          </div>
        </div>

        {/* Palette picker (editing only) */}
        {props.onPaletteChange$ && (
          <>
            <div class="h-6 w-px bg-brand-rule" />
            <div class="flex items-center gap-2">
              <span class="font-mono text-[11px] uppercase tracking-wider text-brand-slate">Theme</span>
              <select
                class="text-sm rounded-md border border-brand-rule bg-white px-2 py-1 text-brand-navy outline-none focus:border-brand-orange"
                value={props.paletteId}
                onChange$={(_, el) => props.onPaletteChange$!((el as HTMLSelectElement).value)}
              >
                {PALETTES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {/* preview swatches */}
              <span class="flex gap-1">
                {(() => {
                  const pal = PALETTES.find((p) => p.id === props.paletteId) ?? PALETTES[0];
                  return [pal.accent, pal.text].map((c) => (
                    <span key={c} class="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />
                  ));
                })()}
              </span>
            </div>
          </>
        )}

        <div class="flex-1" />

        {/* Action buttons (editing only) */}
        {showEditing && props.onReset$ && (
          <ToolbarButton onClick$={props.onReset$} variant="ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            Reset
          </ToolbarButton>
        )}

        {showEditing && props.onImportJSON$ && (
          <>
            <ToolbarButton onClick$={$(() => fileInputRef.value?.click())} variant="ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import JSON
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              class="hidden"
              onChange$={(_, el) => {
                const file = (el as HTMLInputElement).files?.[0];
                if (file) props.onImportJSON$!(file);
                (el as HTMLInputElement).value = "";
              }}
            />
          </>
        )}

        {showEditing && props.onExportJSON$ && (
          <ToolbarButton onClick$={props.onExportJSON$} variant="ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export JSON
          </ToolbarButton>
        )}

        <ToolbarButton onClick$={props.onExportPDF$} variant="primary" loading={props.isExporting.value}>
          {props.isExporting.value ? (
            <>
              <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Exporting…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              Export PDF
            </>
          )}
        </ToolbarButton>

        {/* Slot for page-specific actions (e.g. Edit / Logout button) */}
        <Slot />

        <div class="h-6 w-px bg-brand-rule" />

        {/* Zoom control — RIGHT side, slider immediately left of the % readout */}
        <div class="flex items-center gap-2 text-brand-slate">
          <span class="font-mono text-[11px] uppercase tracking-wider">Zoom</span>
          <input
            type="range"
            min="0.4"
            max="1.2"
            step="0.05"
            value={props.zoom.value}
            onInput$={(_, el) => (props.zoom.value = Number((el as HTMLInputElement).value))}
            class="accent-brand-orange w-32"
            aria-label="Zoom level"
          />
          <span class="font-mono text-xs w-10 text-right tabular-nums">
            {Math.round(props.zoom.value * 100)}%
          </span>
        </div>
      </div>
    </header>
  );
});

const ToolbarButton = component$<{
  onClick$: QRL<() => void>;
  variant?: "primary" | "ghost";
  loading?: boolean;
}>((props) => {
  const isPrimary = props.variant === "primary";
  return (
    <button
      type="button"
      disabled={props.loading}
      onClick$={props.onClick$}
      class={[
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        isPrimary
          ? "bg-brand-orange text-white hover:bg-brand-orange/90 shadow-sm"
          : "text-brand-slate hover:bg-brand-mist hover:text-brand-navy",
      ].join(" ")}
    >
      <Slot />
    </button>
  );
});
