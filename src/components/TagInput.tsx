import { component$, useSignal, $, type QRL } from "@builder.io/qwik";

// ============================================================================
// TagInput — chip-style multi-value input.
//   * Type + Enter / Tab / comma  → commit a tag (or several, comma-split)
//   * Backspace on an empty input → remove the last tag
//   * Chips are draggable to reorder (HTML5 drag-and-drop)
//   * Each chip has a × button to delete it
//
// Design notes (these matter — earlier versions silently dropped edits):
//   * The text field is UNCONTROLLED. We read & clear el.value directly so the
//     field reliably empties after Enter (Qwik's controlled-input sync could
//     lag a synchronous keydown handler).
//   * Handlers build the next array from `values` *inside the event QRL*.
//     Event QRLs re-capture props on every render, so `values` is always the
//     latest the parent passed — no stale-snapshot problem. We intentionally
//     do NOT wrap the array-building in a separate $() that closes over
//     `values`, because that indirection is what went stale before.
// ============================================================================

interface Props {
  values: string[];
  onChange$: QRL<(next: string[]) => void>;
  placeholder?: string;
}

export const TagInput = component$<Props>(({ values, onChange$, placeholder }) => {
  const dragIndex = useSignal<number | null>(null);
  const dragOverIndex = useSignal<number | null>(null);

  return (
    <div
      class="field-input flex flex-wrap items-center gap-1.5 py-1.5 min-h-[40px]"
      onClick$={(_, el) => {
        el.querySelector<HTMLInputElement>("input.tag-input-field")?.focus();
      }}
    >
      {values.map((v, idx) => (
        <span
          key={`${v}-${idx}`}
          draggable={true}
          preventdefault:dragover
          onDragStart$={(ev) => {
            dragIndex.value = idx;
            try { (ev as DragEvent).dataTransfer?.setData("text/plain", String(idx)); } catch { /* noop */ }
          }}
          onDragOver$={() => { dragOverIndex.value = idx; }}
          onDrop$={() => {
            const from = dragIndex.value;
            dragIndex.value = null;
            dragOverIndex.value = null;
            if (from === null || from === idx) return;
            const next = values.slice();
            const [moved] = next.splice(from, 1);
            next.splice(idx, 0, moved);
            onChange$(next);
          }}
          onDragEnd$={() => { dragIndex.value = null; dragOverIndex.value = null; }}
          class={[
            "tag-chip inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium cursor-grab active:cursor-grabbing select-none border",
            dragOverIndex.value === idx ? "ring-1" : "",
          ].join(" ")}
        >
          <span>{v}</span>
          <button
            type="button"
            aria-label={`Remove ${v}`}
            class="tag-chip-x -mr-0.5"
            onClick$={(ev) => {
              ev.stopPropagation();
              onChange$(values.filter((_, i) => i !== idx));
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </span>
      ))}

      <input
        type="text"
        class="tag-input-field flex-1 min-w-[120px] bg-transparent outline-none text-[13px] py-0.5"
        placeholder={values.length === 0 ? (placeholder ?? "Type a tag, press Enter") : ""}
        onKeyDown$={(ev, el) => {
          const input = el as HTMLInputElement;
          const key = (ev as KeyboardEvent).key;
          if (key === "Enter" || key === "Tab") {
            const raw = input.value.trim();
            if (!raw) return;
            ev.preventDefault();
            input.value = "";
            const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
            const next = values.slice();
            for (const p of parts) if (!next.includes(p)) next.push(p);
            onChange$(next);
          } else if (key === "Backspace" && input.value === "" && values.length > 0) {
            ev.preventDefault();
            onChange$(values.slice(0, -1));
          }
        }}
        onInput$={(_, el) => {
          // auto-commit when the user types a comma
          const input = el as HTMLInputElement;
          if (input.value.includes(",")) {
            const parts = input.value.split(",").map((s) => s.trim()).filter(Boolean);
            input.value = "";
            if (parts.length === 0) return;
            const next = values.slice();
            for (const p of parts) if (!next.includes(p)) next.push(p);
            onChange$(next);
          }
        }}
        onBlur$={(_, el) => {
          const input = el as HTMLInputElement;
          const raw = input.value.trim();
          if (!raw) return;
          input.value = "";
          const next = values.slice();
          if (!next.includes(raw)) next.push(raw);
          onChange$(next);
        }}
      />
    </div>
  );
});
