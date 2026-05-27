import {
  component$,
  useSignal,
  $,
  type QRL,
} from "@builder.io/qwik";

// ============================================================================
// TagInput — a chip-style multi-value input. Each value is rendered as a
// removable pill; typing in the trailing input field and pressing Enter, Tab,
// or "," commits a new tag. Backspace on an empty input removes the last tag.
//
// Designed for fields like skills, where comma-separated text is brittle:
// users often forget a comma or paste with trailing whitespace. This widget
// makes the boundaries explicit.
// ============================================================================

interface Props {
  values: string[];
  onChange$: QRL<(next: string[]) => void>;
  placeholder?: string;
}

export const TagInput = component$<Props>(({ values, onChange$, placeholder }) => {
  const draft = useSignal("");

  const commit$ = $(() => {
    const v = draft.value.trim().replace(/,+$/, "").trim();
    if (!v) {
      draft.value = "";
      return;
    }
    // Allow pasting "JavaScript, TypeScript, Go" all at once
    const parts = v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      draft.value = "";
      return;
    }
    const next = values.slice();
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onChange$(next);
    draft.value = "";
  });

  const removeAt$ = $((idx: number) => {
    onChange$(values.filter((_, i) => i !== idx));
  });

  return (
    <div
      class="field-input flex flex-wrap items-center gap-1.5 py-1.5"
      onClick$={(_, el) => {
        // Tapping any blank area inside the wrapper focuses the trailing input
        const input = el.querySelector<HTMLInputElement>("input.tag-input-field");
        input?.focus();
      }}
    >
      {values.map((v, idx) => (
        <span
          key={`${v}-${idx}`}
          class="inline-flex items-center gap-1 rounded-md bg-brand-orange/10 text-brand-navy border border-brand-orange/30 px-2 py-0.5 text-[12px] font-medium"
        >
          <span>{v}</span>
          <button
            type="button"
            aria-label={`Remove ${v}`}
            class="text-brand-slate hover:text-red-600 -mr-0.5"
            onClick$={(ev) => {
              ev.stopPropagation();
              removeAt$(idx);
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        class="tag-input-field flex-1 min-w-[100px] bg-transparent outline-none text-[13px] py-0.5"
        placeholder={values.length === 0 ? (placeholder ?? "Type a tag, press Enter") : ""}
        value={draft.value}
        onInput$={(_, el) => {
          const val = (el as HTMLInputElement).value;
          // If the user typed a comma, auto-commit
          if (val.endsWith(",")) {
            draft.value = val;
            commit$();
          } else {
            draft.value = val;
          }
        }}
        onKeyDown$={(ev, el) => {
          const input = el as HTMLInputElement;
          if (ev.key === "Enter" || ev.key === "Tab") {
            if (draft.value.trim()) {
              ev.preventDefault();
              commit$();
            }
          } else if (ev.key === "Backspace" && input.value === "" && values.length > 0) {
            ev.preventDefault();
            removeAt$(values.length - 1);
          }
        }}
        onBlur$={() => {
          if (draft.value.trim()) commit$();
        }}
        onPaste$={(ev, el) => {
          // Let paste happen normally, then if the result contains commas,
          // split on them. The input handler above already auto-commits on
          // trailing comma, so we just need to handle multi-comma pastes.
          const data = ev.clipboardData?.getData("text") ?? "";
          if (data.includes(",")) {
            ev.preventDefault();
            (el as HTMLInputElement).value = "";
            draft.value = data;
            commit$();
          }
        }}
      />
    </div>
  );
});
