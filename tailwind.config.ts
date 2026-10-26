import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        ink: "var(--ink)",
        mut: "var(--mut)",
        pri: "var(--pri)",
        onp: "var(--onp)",
        acc: "var(--acc)",
        line: "var(--line)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        bad: "var(--bad)",
        emerald: {
          DEFAULT: "#0B6B4F",
          light: "#12946E",
          bright: "#1FB589",
          dark: "#063D2D",
        },
        gold: {
          DEFAULT: "#F5B83D",
          light: "#F8CC6E",
          dark: "#C98E18",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-jakarta)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "22px",
        "3xl": "28px",
      },
      boxShadow: {
        soft: "0 8px 24px -16px rgba(0, 0, 0, 0.25)",
        hero: "0 20px 40px -20px rgba(11, 107, 79, 0.6)",
        pri: "0 10px 20px -10px var(--pri)",
      },
    },
  },
  plugins: [],
};
export default config;
