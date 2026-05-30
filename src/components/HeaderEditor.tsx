import { component$, $, type QRL } from "@builder.io/qwik";
import type { Header, ContactItem, ContactKind } from "~/data/resume";
import { uid } from "~/data/resume";

interface Props {
  header: Header;
  onUpdate$: QRL<(next: Header) => void>;
}

const KIND_LABEL: Record<ContactKind, string> = {
  string: "Text",
  url: "URL",
  email: "Email",
  tel: "Phone",
};

const KIND_PLACEHOLDER: Record<ContactKind, string> = {
  string: "e.g. Hong Kong",
  url: "https://yourname.com",
  email: "you@example.com",
  tel: "+852 1234 5678",
};

/**
 * The header editor: name, headline, then a *dynamic* contact list. Each
 * contact has a type selector (Text / URL / Email / Phone), a label (visible
 * text), and an optional href (for the three non-text types — if omitted, the
 * preview derives the href from the label). The order in this list IS the
 * order rendered in the preview, so re-arranging here re-arranges there.
 */
export const HeaderEditor = component$<Props>((props) => {
  // NOTE: read `props.header` LIVE inside every mutator (do NOT destructure it
  // at the top). A destructured `header` is captured by these QRL closures as a
  // stale render-time snapshot, so edits get computed against out-of-date state
  // and the preview lags behind — same class of bug SectionEditor guards
  // against. Reading through `props` always patches the latest store value.
  const header = props.header;

  // ── Mutators ──────────────────────────────────────────────────────────────
  const updateContact$ = $((idx: number, patch: Partial<ContactItem>) => {
    const h = props.header;
    const next = h.contacts.slice();
    next[idx] = { ...next[idx], ...patch };
    props.onUpdate$({ ...h, contacts: next });
  });

  const removeContact$ = $((idx: number) => {
    const h = props.header;
    props.onUpdate$({ ...h, contacts: h.contacts.filter((_, i) => i !== idx) });
  });

  const moveContact$ = $((idx: number, dir: -1 | 1) => {
    const h = props.header;
    const next = h.contacts.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    props.onUpdate$({ ...h, contacts: next });
  });

  const addContact$ = $((type: ContactKind) => {
    const h = props.header;
    const fresh: ContactItem = { id: uid("c"), type, label: "", href: type === "string" ? undefined : "" };
    props.onUpdate$({ ...h, contacts: [...h.contacts, fresh] });
  });

  return (
    <div class="rounded-xl border border-brand-rule bg-gradient-to-br from-brand-orange/5 to-transparent p-4">
      <div class="flex items-center gap-2 mb-3">
        <span class="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-orange/10 text-brand-orange">
          header
        </span>
        <span class="font-display font-semibold text-brand-navy text-base">
          Personal Info
        </span>
      </div>
      <div class="space-y-2">
        <input
          class="field-input text-base font-semibold"
          placeholder="Full name"
          value={header.name}
          onInput$={(_, el) => props.onUpdate$({ ...props.header, name: (el as HTMLInputElement).value })}
        />
        <textarea
          class="field-input"
          rows={2}
          placeholder="Headline / role"
          value={header.title}
          onInput$={(_, el) => props.onUpdate$({ ...props.header, title: (el as HTMLTextAreaElement).value })}
        />

        <div class="pt-2">
          <div class="text-[10px] font-mono uppercase tracking-wider text-brand-slate mb-1.5">
            Contacts <span class="text-brand-slate/60">— drag to reorder</span>
          </div>
          <div class="space-y-2">
            {header.contacts.map((c, idx) => (
              <ContactRow
                key={c.id}
                item={c}
                index={idx}
                isFirst={idx === 0}
                isLast={idx === header.contacts.length - 1}
                onPatch$={$((p: Partial<ContactItem>) => updateContact$(idx, p))}
                onRemove$={$(() => removeContact$(idx))}
                onMoveUp$={$(() => moveContact$(idx, -1))}
                onMoveDown$={$(() => moveContact$(idx, 1))}
              />
            ))}
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <AddBtn label="+ Email"  onClick$={$(() => addContact$("email"))} />
            <AddBtn label="+ Phone"  onClick$={$(() => addContact$("tel"))} />
            <AddBtn label="+ URL"    onClick$={$(() => addContact$("url"))} />
            <AddBtn label="+ Text"   onClick$={$(() => addContact$("string"))} />
          </div>
        </div>
      </div>
    </div>
  );
});

const AddBtn = component$<{ label: string; onClick$: QRL<() => void> }>((props) => (
  <button
    type="button"
    onClick$={props.onClick$}
    class="px-2 py-1 text-xs font-medium text-brand-orange hover:text-brand-navy border border-dashed border-brand-rule hover:border-brand-orange hover:bg-brand-orange/5 rounded transition-colors"
  >
    {props.label}
  </button>
));

interface ContactRowProps {
  item: ContactItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onPatch$: QRL<(p: Partial<ContactItem>) => void>;
  onRemove$: QRL<() => void>;
  onMoveUp$: QRL<() => void>;
  onMoveDown$: QRL<() => void>;
}

const ContactRow = component$<ContactRowProps>((props) => {
  const { item } = props;
  return (
    <div class="flex items-start gap-1.5 rounded-md border border-brand-rule/60 bg-white/60 p-1.5">
      {/* Reorder + remove micro-buttons */}
      <div class="flex flex-col gap-0.5 pt-1.5">
        <button type="button" title="Move up" disabled={props.isFirst} onClick$={props.onMoveUp$}
          class="h-4 w-4 inline-flex items-center justify-center rounded text-brand-slate hover:bg-brand-mist hover:text-brand-navy disabled:opacity-30">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button type="button" title="Move down" disabled={props.isLast} onClick$={props.onMoveDown$}
          class="h-4 w-4 inline-flex items-center justify-center rounded text-brand-slate hover:bg-brand-mist hover:text-brand-navy disabled:opacity-30">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      {/* Type selector */}
      <select
        class="field-input !w-[78px] !p-1.5 text-xs flex-shrink-0"
        value={item.type}
        onChange$={(_, el) => props.onPatch$({ type: (el as HTMLSelectElement).value as ContactKind })}
      >
        {(["email", "tel", "url", "string"] as ContactKind[]).map((k) => (
          <option key={k} value={k}>{KIND_LABEL[k]}</option>
        ))}
      </select>
      {/* Label + (optional) href */}
      <div class="flex-1 min-w-0 space-y-1">
        <input
          class="field-input !p-1.5 text-sm"
          placeholder={KIND_PLACEHOLDER[item.type]}
          value={item.label}
          onInput$={(_, el) => props.onPatch$({ label: (el as HTMLInputElement).value })}
        />
        {item.type !== "string" && (
          <input
            class="field-input !p-1.5 text-xs font-mono"
            placeholder={`href — overrides default ${item.type === "url" ? "https://" : item.type + ":"} link (optional)`}
            value={item.href || ""}
            onInput$={(_, el) => props.onPatch$({ href: (el as HTMLInputElement).value })}
          />
        )}
      </div>
      <button type="button" title="Remove" onClick$={props.onRemove$}
        class="h-6 w-6 mt-1 inline-flex items-center justify-center rounded text-brand-slate hover:bg-red-50 hover:text-red-600 flex-shrink-0">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
});
