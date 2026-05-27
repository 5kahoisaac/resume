import { component$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet, ServiceWorkerRegister } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";

import "./global.css";

/**
 * The root component template. Qwik City injects manifest tags via the
 * `<head>` slot during SSR, so we don't manually mount scripts here.
 */
export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <RouterHead />
        <ServiceWorkerRegister />
      </head>
      <body lang="en" class="antialiased">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
