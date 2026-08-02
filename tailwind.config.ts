import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0e1116",
        panel: "#161b22",
        line: "#232a34",
        accent: "#4f8cff",
        good: "#2ecc71",
        warn: "#f1c40f",
        bad: "#e74c3c",
      },
    },
  },
  plugins: [],
};
export default config;
