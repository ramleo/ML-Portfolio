"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const urlTheme = params.get("theme");
    let dark: boolean;
    if (urlTheme === "light" || urlTheme === "dark") {
      dark = urlTheme === "dark";
      localStorage.setItem("theme", urlTheme);
      params.delete("theme");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
    } else {
      const stored = localStorage.getItem("theme");
      dark = stored !== "light";
    }
    setIsDark(dark);
    document.documentElement.classList.toggle("light", !dark);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("light", !next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "1px solid var(--border2)",
        background: "var(--border)",
        color: "var(--text2)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1rem",
        transition: "background 0.2s, border-color 0.2s",
        flexShrink: 0,
      }}
    >
      {isDark ? "☀" : "☾"}
    </button>
  );
}