import { component$, type QRL } from "@builder.io/qwik";
import type { Header } from "~/data/resume";

interface Props {
  header: Header;
  onUpdate$: QRL<(next: Header) => void>;
}

/**
 * The header editor sits at the top of the editor pane — it's the first thing
 * a new user sees, so the layout is deliberately spacious and inviting.
 */
export const HeaderEditor = component$<Props>(({ header, onUpdate$ }) => {
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
          onInput$={(_, el) => onUpdate$({ ...header, name: (el as HTMLInputElement).value })}
        />
        <textarea
          class="field-input"
          rows={2}
          placeholder="Headline / role"
          value={header.title}
          onInput$={(_, el) => onUpdate$({ ...header, title: (el as HTMLTextAreaElement).value })}
        />
        <div class="grid grid-cols-2 gap-2">
          <input
            class="field-input"
            type="email"
            placeholder="Email"
            value={header.email}
            onInput$={(_, el) => onUpdate$({ ...header, email: (el as HTMLInputElement).value })}
          />
          <input
            class="field-input"
            type="tel"
            placeholder="Phone (e.g. +852 1234 5678)"
            value={header.phone}
            onInput$={(_, el) => onUpdate$({ ...header, phone: (el as HTMLInputElement).value })}
          />
        </div>
        <input
          class="field-input"
          placeholder="Location"
          value={header.location}
          onInput$={(_, el) => onUpdate$({ ...header, location: (el as HTMLInputElement).value })}
        />
        <input
          class="field-input"
          type="url"
          placeholder="Website (e.g. https://yourname.com)"
          value={header.website}
          onInput$={(_, el) => onUpdate$({ ...header, website: (el as HTMLInputElement).value })}
        />
        <input
          class="field-input"
          type="url"
          placeholder="LinkedIn URL"
          value={header.linkedin}
          onInput$={(_, el) => onUpdate$({ ...header, linkedin: (el as HTMLInputElement).value })}
        />
      </div>
    </div>
  );
});
