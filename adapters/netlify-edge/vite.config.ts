import { netlifyEdgeAdapter } from "@builder.io/qwik-city/adapters/netlify-edge/vite";
import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";

export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      // Netlify discovers edge functions under `netlify/edge-functions/`.
      // The adapter walks up from this outDir to find that ancestor.
      outDir: "netlify/edge-functions/entry.netlify-edge",
      rollupOptions: {
        input: ["src/entry.netlify-edge.tsx", "@qwik-city-plan"],
      },
    },
    plugins: [netlifyEdgeAdapter()],
  };
});
