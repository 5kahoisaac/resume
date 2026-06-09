/// <reference types="vite/client" />

// ============================================================================
// Custom env vars exposed to the client bundle.
//
// Anything prefixed with `VITE_` is inlined into the browser bundle at build
// time. Don't put secrets here — only domain-scoped public keys (like Tiny
// Cloud's frontend API key, Stripe publishable key, etc.).
// ============================================================================
interface ImportMetaEnv {
  /**
   * TinyMCE Cloud API key. Optional — defaults to "no-api-key" if unset, which
   * still loads a working editor with a small footer notice. Get yours at
   * https://www.tiny.cloud/auth/signup/ and put it in `.env.local`:
   *
   *   VITE_TINYMCE_API_KEY=your-key-here
   */
  readonly VITE_TINYMCE_API_KEY?: string;

  /**
   * Optional URL to fetch the default resume JSON from at runtime. When set,
   * `loadDefaultResume()` fetches this URL (used as the seed and on Reset);
   * when unset or the fetch fails, it falls back to the bundled
   * `src/data/default-resume.json`. Example:
   *
   *   VITE_RESUME_DATA_URL=https://example.com/resume.json
   */
  readonly VITE_RESUME_DATA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
