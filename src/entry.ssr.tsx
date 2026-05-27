/**
 * Server-side render entry. Used by the Node/Edge adapter to generate HTML.
 * Mirrors the standard Qwik City starter; nothing custom here on purpose so
 * it stays compatible with future Qwik adapter updates.
 */
import {
  renderToStream,
  type RenderToStreamOptions,
} from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";
import Root from "./root";

export default function (opts: RenderToStreamOptions) {
  return renderToStream(<Root />, {
    manifest,
    ...opts,
    containerAttributes: {
      lang: "en-us",
      ...opts.containerAttributes,
    },
  });
}
