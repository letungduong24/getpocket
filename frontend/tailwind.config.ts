import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card-bg)",
          border: "var(--card-border)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          glow: "var(--primary-glow)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          hover: "var(--secondary-hover)",
          glow: "var(--secondary-glow)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        input: {
          bg: "var(--input-bg)",
          border: "var(--input-border)",
          focus: "var(--input-focus)",
        },
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        info: "var(--info)",
        border: "rgba(255, 255, 255, 0.08)",
        ring: "var(--primary)",
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      fontFamily: {
        sans: ["Roboto", "var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["Roboto", "var(--font-geist-mono)", "Courier New", "monospace"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s infinite",
        "slide-up": "slideInUp 0.3s ease-out forwards",
        "spin-slow": "spin 3s linear infinite",
      },
    },
  },
  plugins: [/* eslint-disable @typescript-eslint/no-require-imports */ require("tailwindcss-animate")],
  darkMode: "class",
};

export default config;
