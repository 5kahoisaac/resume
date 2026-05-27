import { component$ } from "@builder.io/qwik";
import type {
  Resume,
  ResumeSection,
  ExperienceItem,
  EducationItem,
  CertificationItem,
  AwardItem,
  ReferenceItem,
  SkillGroup,
  ExpertiseItem,
  LanguageItem,
} from "~/data/resume";
import { renderRichText, autoLink } from "~/utils/linkify";

interface Props {
  resume: Resume;
}

/**
 * The print-ready preview. Everything inside `.resume-page` is meant to mirror
 * the look of the original Enhancv-exported PDF: orange section headings,
 * outlined skill chips, dot proficiency rows, timeline dots on experience,
 * and a faint paper grain with decorative wave lines.
 *
 * Lays sections out in the order they appear in `resume.sections` — so the
 * drag-and-drop reorder in the editor is reflected here with no extra logic.
 */
export const ResumePreview = component$<Props>(({ resume }) => {
  const accent = resume.theme?.accent ?? "#E67E22";
  const text = resume.theme?.text ?? "#1F3A5F";
  const paper = resume.theme?.paper ?? "#ffffff";

  return (
    <div
      id="resume-preview-page"
      class="resume-page paper-texture paper-decorations shadow-paper"
      style={{ color: text, background: paper }}
    >
      <Header resume={resume} accent={accent} text={text} />
      <div class="mt-6 space-y-7">
        {resume.sections
          .filter((s) => s.visible)
          .map((section) => (
            <SectionRenderer key={section.id} section={section} accent={accent} text={text} />
          ))}
      </div>
    </div>
  );
});

// ============================================================================
// Header — name, title, contact row. Matches the Enhancv PDF exactly:
//   * Name in navy (text color), large and bold
//   * Title/tagline in orange (accent color)
//   * Contact row: orange icons + navy bold text, all wrapped in <a> tags
//     with mailto:/tel:/https:// schemes where appropriate
// ============================================================================
const Header = component$<{ resume: Resume; accent: string; text: string }>(
  ({ resume, accent, text }) => {
    const { header } = resume;
    return (
      <header class="pb-3">
        <h1
          class="font-sans font-bold leading-[1.05] tracking-tight"
          style={{ color: text, fontSize: "26pt", letterSpacing: "0.01em" }}
        >
          {header.name || "YOUR NAME"}
        </h1>
        <p
          class="mt-1 font-sans font-bold"
          style={{ color: accent, fontSize: "12pt", lineHeight: 1.3 }}
        >
          {header.title}
        </p>
        <div
          class="mt-3 font-sans font-bold"
          style={{ fontSize: "8.5pt", color: text, lineHeight: 1.6 }}
        >
          {header.email && (
            <ContactItem
              icon="email"
              value={header.email}
              href={`mailto:${header.email}`}
              accent={accent}
              text={text}
            />
          )}
          {header.phone && (
            <ContactItem
              icon="phone"
              value={header.phone}
              href={`tel:${header.phone.replace(/[^\d+]/g, "")}`}
              accent={accent}
              text={text}
            />
          )}
          {header.website && (
            <ContactItem
              icon="link"
              value={header.website}
              href={ensureHttp(header.website)}
              accent={accent}
              text={text}
              external
            />
          )}
          {header.linkedin && (
            <ContactItem
              icon="link"
              value={header.linkedin}
              href={ensureHttp(header.linkedin)}
              accent={accent}
              text={text}
              external
            />
          )}
          {header.location && (
            <ContactItem
              icon="pin"
              value={header.location}
              accent={accent}
              text={text}
            />
          )}
        </div>
      </header>
    );
  },
);

/** Prepend https:// if the URL is missing a scheme. */
function ensureHttp(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

type IconKind = "email" | "phone" | "link" | "pin";

/** Plain text glyph for each contact kind. We deliberately avoid emoji or
 *  fancy Unicode (html2canvas can't access system color emoji fonts and falls
 *  back to invisible boxes). These render as orange text in the page font. */
const ICON_GLYPH: Record<IconKind, string> = {
  email: "@",
  phone: "T:",
  link: "↗",  // ASCII-printable arrow — renders as text glyph
  pin: "◆",  // diamond — renders cleanly as a glyph
};

interface ContactItemProps {
  icon: IconKind;
  value: string;
  accent: string;
  text: string;
  href?: string;
  external?: boolean;
}
const ContactItem = component$<ContactItemProps>(
  ({ icon, value, accent, text, href, external }) => {
    const inner = (
      <>
        <span
          style={{
            color: accent,
            fontSize: "10pt",
            lineHeight: 1,
            marginRight: "4px",
            display: "inline-block",
            verticalAlign: "middle",
          }}
          aria-hidden="true"
        >
          {ICON_GLYPH[icon]}
        </span>
        <span style={{ color: text, verticalAlign: "middle" }}>{value}</span>
      </>
    );
    const itemStyle = { textDecoration: "none", whiteSpace: "nowrap", marginRight: "18px" };
    if (href) {
      return (
        <a
          class="inline-block"
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          style={itemStyle}
        >
          {inner}
        </a>
      );
    }
    return (
      <span class="inline-block" style={itemStyle}>
        {inner}
      </span>
    );
  },
);

// ============================================================================
// Section dispatcher — picks the right renderer based on the discriminated union
// ============================================================================
const SectionRenderer = component$<{
  section: ResumeSection;
  accent: string;
  text: string;
}>(({ section, accent, text }) => {
  return (
    <section class="break-inside-avoid">
      <h2
        class="font-sans font-bold uppercase tracking-wider"
        style={{ color: text, fontSize: "13pt", marginBottom: "10px", letterSpacing: "0.06em" }}
      >
        {section.title}
      </h2>
      {section.type === "summary" && <SummaryBlock text={section.data.text} />}
      {section.type === "languages" && (
        <LanguagesBlock items={section.data.items} accent={accent} />
      )}
      {section.type === "skills" && (
        <SkillsBlock groups={section.data.groups} accent={accent} />
      )}
      {section.type === "expertise" && (
        <ExpertiseBlock items={section.data.items} accent={accent} />
      )}
      {section.type === "experience" && (
        <ExperienceBlock items={section.data.items} accent={accent} text={text} />
      )}
      {section.type === "education" && <EducationBlock items={section.data.items} accent={accent} text={text} />}
      {section.type === "certifications" && (
        <CertificationsBlock items={section.data.items} />
      )}
      {section.type === "awards" && <AwardsBlock items={section.data.items} accent={accent} />}
      {section.type === "references" && <ReferencesBlock items={section.data.items} />}
    </section>
  );
});

// ============================================================================
// Block components — one per section type. Kept small and prop-driven so the
// preview is essentially declarative and easy to restyle.
// ============================================================================

const SummaryBlock = component$<{ text: string }>(({ text }) => (
  <div
    class="font-sans leading-relaxed rich-content"
    style={{ fontSize: "10pt" }}
    dangerouslySetInnerHTML={renderRichText(text)}
  />
));

const LanguagesBlock = component$<{ items: LanguageItem[]; accent: string }>(
  ({ items, accent }) => (
    <div class="grid grid-cols-3 gap-x-6 gap-y-3">
      {items.map((lang) => (
        <div key={lang.id} class="flex items-center justify-between">
          <div>
            <div class="font-sans" style={{ fontSize: "10.5pt", opacity: 0.78 }}>
              {lang.name}
            </div>
            <div class="font-sans" style={{ fontSize: "9pt", opacity: 0.55 }}>
              {lang.level}
            </div>
          </div>
          <div class="flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                class="prof-dot"
                style={{ background: i < lang.proficiency ? accent : "#E5E9F0" }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
);

const SkillsBlock = component$<{ groups: SkillGroup[]; accent: string }>(({ groups, accent }) => (
  <div class="space-y-3">
    {groups.map((g) => (
      <div key={g.id}>
        <div
          class="font-sans mb-1.5"
          style={{ fontSize: "10pt", color: accent }}
        >
          {g.label}
        </div>
        <div>
          {g.skills.map((s, i) => (
            <span key={i} class="skill-chip">
              {s}
            </span>
          ))}
        </div>
      </div>
    ))}
  </div>
));

const ExpertiseBlock = component$<{ items: ExpertiseItem[]; accent: string }>(
  ({ items, accent }) => (
    <div class="grid grid-cols-3 gap-x-8 gap-y-5">
      {items.map((item) => (
        <div key={item.id}>
          <div class="font-sans mb-2" style={{ fontSize: "10pt", opacity: 0.78 }}>
            {item.label}
          </div>
          <div class="expertise-track">
            <div
              class="expertise-fill"
              style={{ width: `${Math.max(0, Math.min(100, item.level))}%`, background: accent }}
            />
          </div>
        </div>
      ))}
    </div>
  ),
);

const ExperienceBlock = component$<{ items: ExperienceItem[]; accent: string; text: string }>(
  ({ items, accent, text }) => (
    <div class="relative">
      {/* Vertical timeline rail — positioned at the horizontal center of the
          dot column below. Date column is 88px, gap is 16px, dot column is
          12px wide starting at x=104, so its center is at x=110. */}
      <div
        class="absolute w-px"
        style={{
          left: "110px",
          top: "10px",
          bottom: "10px",
          background: "#D1D9E5",
        }}
      />
      <div class="space-y-5">
        {items.map((item) => (
          <ExperienceEntry key={item.id} item={item} accent={accent} text={text} />
        ))}
      </div>
    </div>
  ),
);

const ExperienceEntry = component$<{ item: ExperienceItem; accent: string; text: string }>(
  ({ item, accent, text }) => (
    <div class="flex">
      {/* Date column — 88px wide */}
      <div class="w-[88px] flex-shrink-0 pt-0.5" style={{ color: text }}>
        <div class="font-sans font-bold leading-tight" style={{ fontSize: "8.5pt", wordSpacing: "-1px" }}>
          {item.end ? `${item.start} – ${item.end}` : item.start}
        </div>
        {item.location && (
          <div
            class="mt-1.5 font-sans leading-tight"
            style={{ fontSize: "8.5pt", opacity: 0.75 }}
          >
            {item.location}
          </div>
        )}
      </div>

      {/* Gap column — 16px */}
      <div class="w-[16px] flex-shrink-0" />

      {/* Dot column — 12px wide; dot centred horizontally on the rail (x=110) */}
      <div class="w-[12px] flex-shrink-0 pt-[7px] flex justify-center">
        <span
          class="block rounded-full"
          style={{
            width: "9px",
            height: "9px",
            background: text,
            position: "relative",
            zIndex: 2,
            // White ring masks the rail behind the dot for a cleaner look
            boxShadow: "0 0 0 2px #ffffff",
          }}
        />
      </div>

      {/* Content column — fills remaining width */}
      <div class="flex-1 pl-3">
        <h3 class="font-sans" style={{ fontSize: "11.5pt", color: text, opacity: 0.92 }}>
          {item.title}
        </h3>
        {item.company && (
          <div class="font-sans font-bold" style={{ fontSize: "10.5pt", color: accent }}>
            {item.company}
          </div>
        )}
        {item.description && (
          <div
            class="mt-1 font-sans leading-relaxed rich-content"
            style={{ fontSize: "9.5pt", opacity: 0.85 }}
            dangerouslySetInnerHTML={renderRichText(item.description)}
          />
        )}
      </div>
    </div>
  ),
);

const EducationBlock = component$<{ items: EducationItem[]; accent: string; text: string }>(
  ({ items, text }) => (
    <div class="space-y-3">
      {items.map((e) => (
        <div key={e.id} class="flex">
          <div class="w-[88px] flex-shrink-0 pt-0.5">
            <div class="font-sans font-bold leading-tight" style={{ fontSize: "8.5pt" }}>
              {e.end ? `${e.start} – ${e.end}` : e.start}
            </div>
          </div>
          <div class="w-[16px] flex-shrink-0" />
          <div class="w-[12px] flex-shrink-0 pt-[7px] flex justify-center">
            <span
              class="block rounded-full"
              style={{
                width: "9px",
                height: "9px",
                background: text,
                position: "relative",
                zIndex: 2,
                boxShadow: "0 0 0 2px #ffffff",
              }}
            />
          </div>
          <div class="flex-1 pl-3">
            <div class="font-sans" style={{ fontSize: "10.5pt", opacity: 0.92 }}>
              {e.degree}
            </div>
            <div class="font-sans font-bold" style={{ fontSize: "10.5pt" }}>
              {e.school}
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
);

const CertificationsBlock = component$<{ items: CertificationItem[] }>(({ items }) => (
  <div class="grid grid-cols-2 gap-x-8 gap-y-3">
    {items.map((c) => (
      <div key={c.id}>
        <div class="font-sans font-bold" style={{ fontSize: "10pt" }}>
          {c.name}
        </div>
        <div class="font-sans" style={{ fontSize: "9pt", opacity: 0.75 }}>
          {c.issuer}
        </div>
      </div>
    ))}
  </div>
));

const AwardsBlock = component$<{ items: AwardItem[]; accent: string }>(({ items, accent }) => (
  <div class="grid grid-cols-2 gap-x-8 gap-y-3">
    {items.map((a) => (
      <div key={a.id} class="flex gap-2.5">
        <span class="text-lg leading-none mt-0.5" style={{ color: accent }}>
          ◆
        </span>
        <div>
          <div class="font-sans font-bold" style={{ fontSize: "10pt" }}>
            {a.name}
          </div>
          <div
            class="mt-1 font-sans leading-relaxed rich-content"
            style={{ fontSize: "9pt", opacity: 0.85 }}
            dangerouslySetInnerHTML={renderRichText(a.description)}
          />
        </div>
      </div>
    ))}
  </div>
));

const ReferencesBlock = component$<{ items: ReferenceItem[] }>(({ items }) => (
  <div class="grid grid-cols-2 gap-x-8 gap-y-3">
    {items.map((r) => (
      <div key={r.id}>
        <div class="font-sans font-bold" style={{ fontSize: "10pt" }}>
          {r.name}
          {r.role && <span class="font-normal">, {r.role}</span>}
        </div>
        <div
          class="font-sans rich-content"
          style={{ fontSize: "9pt", opacity: 0.75 }}
          dangerouslySetInnerHTML={autoLink(r.contact)}
        />
      </div>
    ))}
  </div>
));
