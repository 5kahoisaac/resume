// ============================================================================
// linkify.ts — turn plain text into HTML with auto-detected hyperlinks, plus a
// small HTML sanitiser so we can safely render rich-text fields produced by
// TinyMCE.
// ----------------------------------------------------------------------------
// Why both? Rich-text fields (summary, descriptions, bullets) store HTML the
// user authored. Non-rich fields (location, reference contact, header email)
// are plain strings — but we still want clickable phones/emails/URLs in the
// preview. `autoLink` covers the latter; `sanitiseHtml` keeps the former safe.
// ============================================================================

const URL_RE = /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
// Conservative email pattern — good enough for resume contact strings
const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
// Phone pattern — international (+852), local digits, dashes/spaces/parens.
// Allow an optional leading "(" so "(+852) 6200-5806" matches in one piece.
const PHONE_RE = /(\(?\+?\d[\d\s().-]{6,}\d)/g;

// Escape HTML-significant characters so user content can't inject markup
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Convert plain text into an HTML string with detected URLs/emails/phones
 * wrapped in <a> tags. Safe to use with dangerouslySetInnerHTML because we
 * escape first, then inject only well-formed anchor tags.
 *
 * Implementation: instead of chained regex replaces (which double-fire inside
 * already-generated anchor tags), we scan the escaped text for *all* matches
 * across the three patterns, pick the earliest non-overlapping ones, and
 * stitch the output. Order of precedence when matches overlap:
 *   1. Email — most specific
 *   2. URL   — second most specific
 *   3. Phone — loosest pattern, lowest priority
 */
export function autoLink(text: string): string {
  if (!text) return "";
  const src = escapeHtml(text);

  interface Match {
    start: number;
    end: number;
    href: string;
    label: string;
    external: boolean;
  }
  const found: Match[] = [];

  // Email (highest priority)
  for (const m of src.matchAll(EMAIL_RE)) {
    if (m.index == null) continue;
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      href: `mailto:${m[0]}`,
      label: m[0],
      external: false,
    });
  }
  // URL
  for (const m of src.matchAll(URL_RE)) {
    if (m.index == null) continue;
    const url = m[0];
    const href = url.startsWith("http") ? url : `https://${url}`;
    found.push({
      start: m.index,
      end: m.index + url.length,
      href,
      label: url,
      external: true,
    });
  }
  // Phone (lowest priority)
  for (const m of src.matchAll(PHONE_RE)) {
    if (m.index == null) continue;
    const digits = m[0].replace(/[^\d+]/g, "");
    if (digits.length < 7) continue;
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      href: `tel:${digits}`,
      label: m[0],
      external: false,
    });
  }

  if (found.length === 0) return src;

  // Sort by start; for ties, the earlier-pushed (higher-priority) one wins
  found.sort((a, b) => a.start - b.start);

  // Drop overlaps — keep the higher-priority match (already first by push order)
  const kept: Match[] = [];
  let cursor = -1;
  for (const m of found) {
    if (m.start >= cursor) {
      kept.push(m);
      cursor = m.end;
    }
  }

  // Stitch output
  let out = "";
  let pos = 0;
  for (const m of kept) {
    out += src.slice(pos, m.start);
    const targetAttr = m.external ? ' target="_blank" rel="noopener noreferrer"' : "";
    out += `<a href="${m.href}"${targetAttr} class="resume-link">${m.label}</a>`;
    pos = m.end;
  }
  out += src.slice(pos);
  return out;
}

/**
 * Minimal HTML sanitiser. TinyMCE already produces sanitised output, but the
 * editor runs in the user's browser — anything reaching this point could in
 * principle have been crafted (e.g. via imported JSON). We:
 *   - Drop <script>, <style>, <iframe>, <object>, <embed>, <link>, <meta>
 *   - Strip on* event handlers
 *   - Strip javascript:/data: URLs from href/src
 * Returns sanitised HTML safe for dangerouslySetInnerHTML.
 */
export function sanitiseHtml(html: string): string {
  if (!html) return "";

  const DANGEROUS_TAGS = /<(script|style|iframe|object|embed|link|meta)\b/i;

  // Bypass class: tag-name obfuscation via interleaving — e.g.
  // `<scr<script>ipt>` where removing the inner tag reassembles a live one.
  // A single pass can't catch this, so we remove dangerous tags repeatedly
  // until the string stops changing (fixed point). The iteration cap guards
  // against pathological inputs; if we hit it we fall back to escaping the
  // whole string (safe default — renders as inert text, never as markup).
  let out = html;
  let iterations = 0;
  const MAX_ITERATIONS = 10;
  while (DANGEROUS_TAGS.test(out)) {
    if (iterations >= MAX_ITERATIONS) return escapeHtml(html);
    // Remove dangerous tags entirely (including their content)
    out = out.replace(
      /<(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    );
    // Self-closing / unpaired variants
    out = out.replace(
      /<(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi,
      "",
    );
    iterations++;
  }

  // Bypass class: inline event handlers — strip on* attributes whether the
  // value is double-quoted, single-quoted, or unquoted. `\s+` anchors to an
  // attribute boundary so we don't chew into tag/text content; the value
  // alternation tolerates newlines inside quoted values via [^"]/[^'].
  out = out.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Bypass class: dangerous URL schemes in href/src, QUOTED *or UNQUOTED*.
  // The old blocker only matched quoted values, so `href=javascript:alert(1)`
  // (no quotes) slipped through. Two passes cover both quoting styles:
  //   1. Quoted: value runs to the matching quote and may contain >/spaces
  //      (e.g. data:text/html,<h1>x</h1>), so we consume up to the quote.
  //   2. Unquoted: value is terminated by whitespace or `>`.
  out = out.replace(
    /\s(href|src)\s*=\s*(["'])\s*(?:javascript|data|vbscript):[^"']*\2/gi,
    " $1=$2#$2",
  );
  out = out.replace(
    /\s(href|src)\s*=\s*(?:javascript|data|vbscript):[^\s>]*/gi,
    " $1=#",
  );
  return out;
}

/**
 * Best-effort: take an HTML snippet and return a plain-text string. Used when
 * we migrate an imported JSON whose summary is HTML but the consumer expects
 * a quick text glance (none currently use it, but it's handy).
 */
export function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Heuristic: does this string look like HTML, or is it plain text that we
 * should run through autoLink? Anything containing an angle-bracket tag we
 * treat as HTML; otherwise we autolink.
 *
 * This is the bridge between old saved data (plain text) and new data
 * (HTML from TinyMCE) — both shapes render correctly without a migration.
 */
export function renderRichText(value: string): string {
  if (!value) return "";
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(value);
  return looksLikeHtml ? sanitiseHtml(value) : autoLink(value);
}
