/**
 * Dev-mode client entry. Vite uses this to render the app during `npm run dev`.
 */
import { render, type RenderOptions } from "@builder.io/qwik";
import Root from "./root";

export default function (opts: RenderOptions) {
  return render(document, <Root />, opts);
}
