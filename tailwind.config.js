/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Enhancv-inspired palette derived from the source PDF
        brand: {
          orange: "#E67E22",
          "orange-soft": "#F4A261",
          navy: "#1F3A5F",
          "navy-deep": "#152B47",
          slate: "#4A5A6E",
          mist: "#F7F8FA",
          rule: "#E5E9F0",
        },
      },
      fontFamily: {
        // Distinctive, characterful pairing — avoids generic Inter/Roboto
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        paper:
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -8px rgba(15, 23, 42, 0.12)",
        "paper-lift":
          "0 4px 8px rgba(15, 23, 42, 0.06), 0 24px 48px -12px rgba(15, 23, 42, 0.18)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
