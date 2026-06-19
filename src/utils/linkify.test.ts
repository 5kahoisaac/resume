import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  autoLink,
  sanitiseHtml,
  renderRichText,
} from "~/utils/linkify";

// ============================================================================
// escapeHtml
// ============================================================================
describe("escapeHtml", () => {
  it("escapes ampersand to &amp;", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than to &lt;", () => {
    expect(escapeHtml("<tag>")).toBe("&lt;tag&gt;");
  });

  it("escapes greater-than to &gt;", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes double-quote to &quot;", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single-quote to &#39;", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes all special chars in a combined string", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });
});

// ============================================================================
// autoLink
// ============================================================================
describe("autoLink", () => {
  it("returns empty string for falsy input", () => {
    expect(autoLink("")).toBe("");
  });

  it("returns escaped plain text unchanged (no links)", () => {
    const result = autoLink("Hello World");
    expect(result).toBe("Hello World");
  });

  it("escapes HTML characters in plain text input", () => {
    const result = autoLink("5 < 10 & 3 > 1");
    expect(result).toBe("5 &lt; 10 &amp; 3 &gt; 1");
  });

  it("wraps an email in a mailto: anchor", () => {
    const result = autoLink("Contact me at user@example.com please");
    expect(result).toContain('href="mailto:user@example.com"');
    expect(result).toContain(">user@example.com<");
    // email links are not external — no target attribute
    expect(result).not.toContain("target=");
  });

  it("wraps a bare www. URL with https:// href and external attributes", () => {
    const result = autoLink("Visit www.example.com for details");
    expect(result).toContain('href="https://www.example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain("class=\"resume-link\"");
  });

  it("wraps an https:// URL with the original href and external attributes", () => {
    const result = autoLink("See https://example.com/page");
    expect(result).toContain('href="https://example.com/page"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it("wraps a phone number in a tel: anchor with digits-only href", () => {
    const result = autoLink("+852 6200-5806");
    expect(result).toContain('href="tel:+85262005806"');
    // label should be the original matched text (escaped)
    expect(result).toContain("+852 6200-5806");
  });

  it("input containing < is escaped, producing no executable tag", () => {
    const result = autoLink("<script>alert(1)</script>");
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("email takes priority over URL when they would overlap", () => {
    // An email-like address should not also be wrapped as a URL
    const result = autoLink("me@example.com");
    const anchorCount = (result.match(/<a /g) ?? []).length;
    expect(anchorCount).toBe(1);
    expect(result).toContain("mailto:");
  });
});

// ============================================================================
// sanitiseHtml
// ============================================================================
describe("sanitiseHtml", () => {
  it("returns empty string for falsy input", () => {
    expect(sanitiseHtml("")).toBe("");
  });

  it("removes <script> tags and their content", () => {
    const result = sanitiseHtml("<script>alert(1)</script>");
    expect(result).toBe("");
  });

  it("removes <style> tags and their content", () => {
    const result = sanitiseHtml("<style>body{color:red}</style>");
    expect(result).toBe("");
  });

  it("removes <iframe> tags", () => {
    const result = sanitiseHtml('<iframe src="evil.html"></iframe>');
    expect(result).toBe("");
  });

  it("strips on* event handlers from tags", () => {
    const result = sanitiseHtml('<img src="x.jpg" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
    // The <img> tag itself should still be present
    expect(result).toContain("<img");
  });

  it("neutralizes javascript: href scheme", () => {
    const result = sanitiseHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
  });

  it("neutralizes data: src scheme", () => {
    const result = sanitiseHtml('<img src="data:text/html,<h1>x</h1>">');
    expect(result).not.toMatch(/src\s*=\s*["']?\s*data:/i);
  });

  it("passes through benign <strong> and <em> tags untouched", () => {
    const input = "<strong>bold</strong> and <em>italic</em>";
    expect(sanitiseHtml(input)).toBe(input);
  });

  it("passes through <ul><li> list markup untouched", () => {
    const input = "<ul><li>First</li><li>Second</li></ul>";
    expect(sanitiseHtml(input)).toBe(input);
  });

  it("passes through <a href> with safe https: URL untouched", () => {
    const input = '<a href="https://example.com">link</a>';
    expect(sanitiseHtml(input)).toBe(input);
  });
});

// ============================================================================
// sanitiseHtml bypass resistance — each case targets a known regex-sanitizer
// bypass class. See plan 004.
// ============================================================================
describe("sanitiseHtml bypass resistance", () => {
  it("neutralizes an UNQUOTED javascript: scheme in href", () => {
    // Bypass class: unquoted attribute value — the old scheme blocker only
    // matched quoted values, so href=javascript:... slipped through.
    const result = sanitiseHtml("<a href=javascript:alert(1)>x</a>");
    expect(result).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
  });

  it("neutralizes a mixed-case JavaScript: scheme in a quoted href", () => {
    const result = sanitiseHtml('<a href="JavaScript:alert(1)">x</a>');
    expect(result).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
  });

  it("does not leave a live <script> after removing an interleaved inner tag", () => {
    // Bypass class: tag-name obfuscation — removing the inner <script>
    // reassembles <script> from <scr ...ipt>. Single-pass replace misses it.
    const result = sanitiseHtml("<scr<script>ipt>alert(1)</script>");
    expect(result.toLowerCase()).not.toContain("<script");
  });

  it("strips onerror from <img> (unquoted handler value)", () => {
    const result = sanitiseHtml("<img src=x onerror=alert(1)>");
    expect(result).not.toMatch(/onerror/i);
  });

  it("strips onload from a script-capable <svg> tag", () => {
    const result = sanitiseHtml("<svg onload=alert(1)>");
    expect(result).not.toMatch(/onload/i);
  });

  it("benign control: formatting markup passes through unchanged (no over-stripping)", () => {
    const input = "<strong>hi</strong> <ul><li>a</li></ul>";
    expect(sanitiseHtml(input)).toBe(input);
  });
});

// ============================================================================
// renderRichText
// ============================================================================
describe("renderRichText", () => {
  it("returns empty string for falsy input", () => {
    expect(renderRichText("")).toBe("");
  });

  it("routes plain text through autoLink (returns escaped text)", () => {
    const result = renderRichText("Hello World");
    // No tags inserted; plain text returned
    expect(result).toBe("Hello World");
  });

  it("routes a string containing an HTML tag through sanitiseHtml", () => {
    const input = "<strong>bold</strong>";
    const result = renderRichText(input);
    // sanitiseHtml passes benign markup through
    expect(result).toBe(input);
  });

  it("sanitises dangerous tags when value looks like HTML", () => {
    const input = "<script>evil()</script>";
    const result = renderRichText(input);
    expect(result).not.toContain("<script>");
  });

  it("auto-links email addresses in plain text", () => {
    const result = renderRichText("user@example.com");
    expect(result).toContain("mailto:user@example.com");
  });
});
