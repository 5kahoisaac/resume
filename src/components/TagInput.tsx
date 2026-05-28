import { component$, useSignal, useTask$, $, type QRL } from "@builder.io/qwik";

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
  const tags = useSignal<string[]>(values.slice());
  const dragIndex = useSignal<number | null>(null);
  const dragOverIndex = useSignal<number | null>(null);

  useTask$(({ track }) => {
    tags.value = track(() => values).slice();
  });

  const commit$ = $(async (next: string[]) => {
    tags.value = next;
    await onChange$(next);
  });

  return (
    <div
      class="field-input flex flex-wrap items-center gap-1.5 py-1.5 min-h-[40px]"
      onClick$={(_, el) => {
        el.querySelector<HTMLInputElement>("input.tag-input-field")?.focus();
      }}
    >
      {tags.value.map((v, idx) => (
        <span
          key={`${v}-${idx}`}
          draggable={true}
          onDragStart$={(ev) => {
            dragIndex.value = idx;
            const transfer = (ev as DragEvent).dataTransfer;
            if (transfer) {
              transfer.effectAllowed = "move";
              transfer.setData("text/plain", String(idx));
            }
          }}
          onDragOver$={(ev) => {
            ev.preventDefault();
            const transfer = (ev as DragEvent).dataTransfer;
            if (transfer) transfer.dropEffect = "move";
            dragOverIndex.value = idx;
          }}
          onDrop$={async (ev) => {
            ev.preventDefault();
            const transferValue = (ev as DragEvent).dataTransfer?.getData("text/plain");
            const from = dragIndex.value ?? (transferValue ? Number(transferValue) : null);
            dragIndex.value = null;
            dragOverIndex.value = null;
            if (from === null || Number.isNaN(from) || from === idx) return;
            const next = tags.value.slice();
            const [moved] = next.splice(from, 1);
            next.splice(idx, 0, moved);
            await commit$(next);
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
            onClick$={async (ev) => {
              ev.stopPropagation();
              await commit$(tags.value.filter((_, i) => i !== idx));
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
        placeholder={tags.value.length === 0 ? (placeholder ?? "Type a tag, press Enter") : ""}
        onKeyDown$={async (ev, el) => {
          const input = el as HTMLInputElement;
          const key = (ev as KeyboardEvent).key;
          if (key === "Enter" || key === "Tab") {
            ev.preventDefault();
            const raw = input.value.trim();
            if (!raw) return;
            input.value = "";
            const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
            const next = tags.value.slice();
            for (const p of parts) if (!next.includes(p)) next.push(p);
            await commit$(next);
          } else if (key === "Backspace" && input.value === "" && tags.value.length > 0) {
            ev.preventDefault();
            await commit$(tags.value.slice(0, -1));
          }
        }}
        onInput$={async (_, el) => {
          // auto-commit when the user types a comma
          const input = el as HTMLInputElement;
          if (input.value.includes(",")) {
            const parts = input.value.split(",").map((s) => s.trim()).filter(Boolean);
            input.value = "";
            if (parts.length === 0) return;
            const next = tags.value.slice();
            for (const p of parts) if (!next.includes(p)) next.push(p);
            await commit$(next);
          }
        }}
        onBlur$={async (_, el) => {
          const input = el as HTMLInputElement;
          const raw = input.value.trim();
          if (!raw) return;
          input.value = "";
          const next = tags.value.slice();
          if (!next.includes(raw)) next.push(raw);
          await commit$(next);
        }}
      />
    </div>
  );
});
