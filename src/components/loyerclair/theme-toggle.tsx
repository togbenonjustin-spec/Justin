"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("loyerclair-theme");
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const mode = next ? "dark" : "light";
    document.documentElement.dataset.theme = mode;
    localStorage.setItem("loyerclair-theme", mode);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Basculer le thème clair ou sombre"
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card text-ink shadow-xs transition hover:border-pri"
    >
      {dark ? <Sun className="h-5 w-5 text-acc" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
