/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B0E14",
        surface: "#12161F",
        hairline: "#1F2530",
        accent: "#5865F2",
        danger: "#ED4245",
        success: "#57F287",
        lockdown: "#992D22",
        warning: "#F0B232",
        ink: "#E7E9EE",
        muted: "#8B93A7",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
