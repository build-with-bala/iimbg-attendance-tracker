import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0d12",
        panel: "#12151d",
        line: "#242b39",
        accent: "#7c8cff",
        good: "#4bc46e",
        warn: "#e3ac35",
        bad: "#f26144",
        paper: "#ece9df",
      },
    },
  },
  plugins: [],
};
export default config;
