"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "teacher-theme";

// Teacher pages are dark by default; this only toggles a `.light` class on
// <html> so the `light:` Tailwind variant (see tailwind.config.ts) can apply.
export function useTeacherTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as "dark" | "light" | null;
    const initial = stored || "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("light", initial === "light");
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.classList.toggle("light", next === "light");
      return next;
    });
  }

  return { theme, toggleTheme };
}
