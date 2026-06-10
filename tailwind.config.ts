import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        background: "#000000",
        foreground: "#FFFFFF",
        card: "#0A0A0A",
        "card-foreground": "#FFFFFF",
        border: "#1A1A1A",
        input: "#1A1A1A",
        ring: "#2563EB",
        muted: "#0A0A0A",
        "muted-foreground": "#A1A1AA",
        accent: "#2563EB",
        "accent-foreground": "#FFFFFF",
        primary: "#2563EB",
        "primary-foreground": "#FFFFFF",
        secondary: "#0A0A0A",
        "secondary-foreground": "#FFFFFF",
        destructive: "#EF4444",
        "destructive-foreground": "#FFFFFF",
        success: "#22C55E",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["JetBrains Mono", "ui-monospace", "monospace"],
        display: ["Space Grotesk", "system-ui", "sans-serif"],
      },
      borderRadius: { lg: "12px", md: "8px", sm: "6px" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
