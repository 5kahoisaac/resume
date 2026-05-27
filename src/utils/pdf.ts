// ============================================================================
// PDF Export
// ----------------------------------------------------------------------------
// Strategy: rasterize the live preview node with html2canvas and stitch it
// into a multi-page A4 jsPDF document. Pixel-faithful — what you see really
// is what you get — at the cost of slightly larger files than text-native PDF.
//
// Libraries are dynamically imported so the editor's initial bundle stays
// small; users only pay the download cost when they actually export.
//
// ⚠️ Web fonts must be fully loaded BEFORE rasterizing. If they aren't,
//   html2canvas measures with one font (the loaded one) but draws with the
//   fallback, producing horrible letter-overlap where wide characters are
//   squeezed into narrow slots. We wait on `document.fonts.ready` + an
//   explicit `fonts.load()` for every face the preview actually renders.
// ============================================================================

/** A4 dimensions in millimetres — the page size jsPDF expects. */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export interface ExportOptions {
  /** The DOM node containing the resume preview to capture. */
  node: HTMLElement;
  /** Filename without the `.pdf` extension. */
  fileName: string;
  /** Rasterization scale — 2 = retina-sharp text, ~2x file size. */
  scale?: number;
}

/**
 * Wait for every @font-face referenced on the page to finish loading.
 * Without this, html2canvas can rasterize with the fallback font even though
 * the layout was computed with the real one — producing text where every
 * letter overlaps its neighbour.
 *
 * We additionally explicitly `load()` the specific font/weight combos the
 * preview uses, because `document.fonts.ready` only awaits fonts the browser
 * decided to fetch — and a font defined in CSS but never actually rendered
 * yet might still be unloaded.
 */
async function waitForFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;

  // Once a font face is loaded at any size, all sizes use the same file (size
  // is CSS scaling). So we just need to load each *weight* once. We over-cover
  // to be safe — `fonts.load()` is a no-op for already-loaded faces.
  const fontsToPrime = [
    '300 16px "Plus Jakarta Sans"',
    '400 16px "Plus Jakarta Sans"',
    '500 16px "Plus Jakarta Sans"',
    '600 16px "Plus Jakarta Sans"',
    '700 16px "Plus Jakarta Sans"',
    'italic 400 16px "Plus Jakarta Sans"',
    '400 16px "Fraunces"',
    '600 16px "Fraunces"',
    '700 16px "Fraunces"',
    '400 16px "JetBrains Mono"',
  ];
  try {
    await Promise.all(fontsToPrime.map((f) => (document as any).fonts.load(f)));
  } catch {
    /* best effort — fonts.load throws on truly missing families; we don't care */
  }

  // Wait for any other fonts the browser is currently fetching.
  try {
    await (document as any).fonts.ready;
  } catch {
    /* ignore */
  }

  // Two animation frames — first lets the browser process the loaded fonts,
  // second guarantees a paint with the real fonts before we capture.
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

/**
 * Scan a vertical strip of the canvas and report the row index of every
 * non-empty horizontal line plus the longest whitespace runs. Used to find
 * "section gaps" (long contiguous whitespace) for clean page breaks.
 */
function findBreakRow(
  canvas: HTMLCanvasElement,
  desiredY: number,
  searchWindow: number,
): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  if (!ctx) return desiredY;

  const minY = Math.max(0, desiredY - searchWindow);
  const stripHeight = desiredY - minY;
  if (stripHeight <= 0) return desiredY;
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, minY, canvas.width, stripHeight).data;
  } catch {
    return desiredY;
  }
  const W = canvas.width;

  // Build a per-row "is whitespace" array: row is whitespace if >98.5% of
  // its sampled pixels are near-white.
  const isWhite: boolean[] = new Array(stripHeight);
  for (let y = 0; y < stripHeight; y++) {
    const rowStart = y * W * 4;
    let whiteCount = 0;
    let sampled = 0;
    for (let x = 0; x < W; x += 4) {
      const i = rowStart + x * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 16 || r + g + b > 720) whiteCount++;
      sampled++;
    }
    isWhite[y] = whiteCount / sampled > 0.985;
  }

  // Find the LONGEST contiguous run of whitespace in the search window
  // — that's most likely a gap between sections (rather than line-leading).
  // Walk back from desiredY (=stripHeight-1) and track all whitespace runs.
  const runs: { start: number; end: number; len: number }[] = [];
  let runStart = -1;
  for (let y = stripHeight - 1; y >= 0; y--) {
    if (isWhite[y]) {
      if (runStart === -1) runStart = y;
    } else {
      if (runStart !== -1) {
        runs.push({ start: y + 1, end: runStart, len: runStart - y });
        runStart = -1;
      }
    }
  }
  if (runStart !== -1) {
    runs.push({ start: 0, end: runStart, len: runStart + 1 });
  }

  if (runs.length === 0) return desiredY;

  // Heuristic: prefer the longest gap that's at least 12px tall (≈ a real
  // section gap, not just inter-line spacing). If none qualify, take the
  // first whitespace row encountered closest to desiredY (least content loss).
  const sectionGaps = runs.filter((r) => r.len >= 12);
  if (sectionGaps.length > 0) {
    // Pick the gap closest to the bottom (i.e., least content loss) among
    // the section-sized ones. They're already ordered top-down from our walk
    // back, so the FIRST in `runs` is the bottom-most. Filter preserves order.
    const chosen = sectionGaps[0];
    // Cut at the bottom of the gap so the next page starts at the section
    // heading without orphaning it.
    return minY + chosen.end;
  }

  // Fallback: first whitespace row closest to desiredY
  for (let y = stripHeight - 1; y >= 0; y--) {
    if (isWhite[y]) return minY + y;
  }
  return desiredY;
}

/**
 * Slice a single tall canvas into A4-sized pieces and draw each onto its own
 * PDF page. Each PDF page has top/bottom margins so content doesn't go
 * edge-to-edge. Smart breaks prefer section-boundary whitespace gaps.
 */
function paginate(canvas: HTMLCanvasElement, pdf: any): void {
  const pxPerMm = canvas.width / A4_WIDTH_MM;
  const pageHeightPx = Math.floor(A4_HEIGHT_MM * pxPerMm);

  // Margin reserved at TOP of every page after the first (to prevent content
  // from butting up against the page edge). The first page's top margin comes
  // from .resume-page's own padding-top. The bottom margin is implicit via
  // the search window — we cut shy of the page bottom.
  const TOP_MARGIN_MM = 10;
  const BOTTOM_MARGIN_MM = 10;
  const topMarginPx = Math.floor(TOP_MARGIN_MM * pxPerMm);
  const bottomMarginPx = Math.floor(BOTTOM_MARGIN_MM * pxPerMm);

  // Usable image height per page (after subtracting top/bottom margins on
  // pages 2+; page 1 uses the full height because the source canvas already
  // has its own top padding from .resume-page's padding-top).
  const usableHeightPx = pageHeightPx - bottomMarginPx;
  const usableHeightPxAfterFirst = pageHeightPx - topMarginPx - bottomMarginPx;

  const totalHeightPx = canvas.height;

  // Single-page short-circuit
  if (totalHeightPx <= pageHeightPx) {
    const heightMm = totalHeightPx / pxPerMm;
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      A4_WIDTH_MM,
      heightMm,
    );
    return;
  }

  const slice = document.createElement("canvas");
  slice.width = canvas.width;
  const ctx = slice.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  if (!ctx) {
    const heightMm = totalHeightPx / pxPerMm;
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      A4_WIDTH_MM,
      heightMm,
    );
    return;
  }

  // Search window for the smart break — ~20% of a page so we can find real
  // section gaps without truncating too much content.
  const searchWindow = Math.floor(pageHeightPx * 0.2);

  let drawnPx = 0;
  let isFirst = true;
  while (drawnPx < totalHeightPx) {
    const remaining = totalHeightPx - drawnPx;
    const pageBudget = isFirst ? usableHeightPx : usableHeightPxAfterFirst;
    let captureHeightPx: number;

    if (remaining <= pageBudget) {
      // Last page — take everything that's left
      captureHeightPx = remaining;
    } else {
      const desiredEnd = drawnPx + pageBudget;
      const breakRow = findBreakRow(canvas, desiredEnd, searchWindow);
      captureHeightPx = Math.max(breakRow - drawnPx, pageBudget - searchWindow);
    }

    // The slice canvas mirrors the on-page layout: top margin (only after the
    // first page) of blank space, then the captured slice.
    const topOffset = isFirst ? 0 : topMarginPx;
    slice.height = topOffset + captureHeightPx;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      canvas,
      0,
      drawnPx,
      canvas.width,
      captureHeightPx,
      0,
      topOffset,
      canvas.width,
      captureHeightPx,
    );

    // Check if the captured region is essentially blank — if so, don't add a
    // page for it. Happens when the preview's `.resume-page` has min-height
    // padding extending past the actual content.
    let hasContent = false;
    try {
      const sliceData = ctx.getImageData(0, topOffset, slice.width, captureHeightPx).data;
      for (let i = 0; i < sliceData.length; i += 16) {
        const r = sliceData[i], g = sliceData[i + 1], b = sliceData[i + 2], a = sliceData[i + 3];
        if (a > 16 && r + g + b < 720) {
          hasContent = true;
          break;
        }
      }
    } catch {
      hasContent = true; // assume content if we can't check
    }

    if (!hasContent) {
      // Just advance past the blank content without adding a page
      drawnPx += captureHeightPx;
      continue;
    }

    const sliceHeightMm = slice.height / pxPerMm;
    if (!isFirst) pdf.addPage();
    pdf.addImage(
      slice.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      A4_WIDTH_MM,
      sliceHeightMm,
    );
    isFirst = false;
    drawnPx += captureHeightPx;
  }
}

export async function exportResumePDF(opts: ExportOptions): Promise<void> {
  const { node, fileName, scale = 2 } = opts;

  // CRITICAL: web fonts must be ready or text will overlap (see file header)
  await waitForFonts();

  // Lazy-load the heavy deps — keeps the first paint snappy
  const [{ default: html2canvas }, jspdfMod] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const jsPDF = (jspdfMod as any).jsPDF ?? (jspdfMod as any).default;

  // The preview node lives inside a `transform: scale(...)` wrapper (the zoom
  // feature). We capture the un-transformed paper at its natural size by
  // passing explicit width/height and stripping any transform on the cloned
  // capture node.
  const naturalWidth = node.scrollWidth;
  const naturalHeight = node.scrollHeight;

  const canvas = await html2canvas(node, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    width: naturalWidth,
    height: naturalHeight,
    windowWidth: naturalWidth,
    windowHeight: naturalHeight,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    // html2canvas clones the document for the off-screen render. We use that
    // clone hook to drop transforms on the preview and all of its ancestors
    // (the zoom wrapper applies `transform: scale(...)`, which html2canvas
    // would otherwise apply on top of our explicit width/height, producing a
    // shrunk or stretched capture). We also lock the preview width to its
    // natural size so text wrapping matches the on-screen preview exactly.
    onclone: (doc) => {
      const cloned = doc.getElementById(node.id);
      if (!cloned) return;
      const el = cloned as HTMLElement;
      el.style.width = `${naturalWidth}px`;
      el.style.transform = "none";
      el.style.transition = "none";
      // Walk up the ancestor chain and clear any transform — primarily the
      // zoom wrapper, but defensive against any other ancestor transforms.
      let ancestor: HTMLElement | null = el.parentElement;
      while (ancestor && ancestor !== doc.body) {
        ancestor.style.transform = "none";
        ancestor.style.transition = "none";
        ancestor = ancestor.parentElement;
      }
    },
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  paginate(canvas, pdf);
  pdf.save(`${fileName}.pdf`);
}
