"use client";
import { useEffect, useState } from "react";

const STORE_KEY = "sutraSprint.theme";
export type ThemeChoice = "system" | "light" | "dark";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY) as ThemeChoice | null;
      if (saved) apply(saved);
    } catch {}
  }, []);

  function apply(next: ThemeChoice) {
    setThemeState(next);
    try {
      localStorage.setItem(STORE_KEY, next);
    } catch {}
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
  }

  function cycle() {
    apply(theme === "system" ? "light" : theme === "light" ? "dark" : "system");
  }

  return { theme, setTheme: apply, cycle };
}
