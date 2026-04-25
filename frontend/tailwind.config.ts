import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        mint: "#98E5C8",
        peach: "#FFD6B8",
        softSky: "#A8D8EA",
        lavender: "#C9B1E8",
        cream: "#FFF9F0",
      },
      fontFamily: {
        friendly: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      keyframes: {
        "correct-bounce": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.08)" },
          "50%": { transform: "scale(0.95)" },
          "70%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)" },
        },
        "wrong-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "60%": { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "emoji-bounce": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-12px) rotate(-8deg)" },
          "50%": { transform: "translateY(0) rotate(0deg)" },
          "75%": { transform: "translateY(-6px) rotate(4deg)" },
        },
        "timer-danger-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0)" },
          "50%": { boxShadow: "0 0 0 12px rgba(239, 68, 68, 0.15)" },
        },
      },
      animation: {
        "correct-bounce": "correct-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "wrong-shake": "wrong-shake 0.4s ease",
        "pop-in": "pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "emoji-bounce": "emoji-bounce 1.5s ease-in-out infinite",
        "timer-danger": "timer-danger-pulse 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
