import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [
    // Teacher pages are dark by default; add `light:` overrides that only kick in
    // when a `.light` class is toggled on an ancestor (e.g. <html>).
    plugin(({ addVariant }) => {
      addVariant("light", ":is(.light &)");
    }),
  ],
};
export default config;
