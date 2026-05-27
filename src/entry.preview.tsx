/**
 * Production preview entry — launched by `npm run preview` after building.
 * Spins up a tiny Node server that serves the built bundle for verification.
 */
import { createQwikCity } from "@builder.io/qwik-city/middleware/node";
import qwikCityPlan from "@qwik-city-plan";
import { manifest } from "@qwik-client-manifest";
import render from "./entry.ssr";

export default createQwikCity({ render, qwikCityPlan, manifest });
