import { createQwikCity } from "@builder.io/qwik-city/middleware/netlify-edge";
import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";

// Netlify Edge Functions invoke the module's DEFAULT export as the handler.
// createQwikCity returns the (request, context) => Response handler.
export default createQwikCity({ render, qwikCityPlan });
