"use client";

import { useEffect, useState } from "react";

export type Locale = "en" | "es";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("aa-locale");
    const initial = saved === "es" ? "es" : "en";
    document.documentElement.lang = initial;
    const task = window.setTimeout(() => setLocaleState(initial), 0);
    return () => window.clearTimeout(task);
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem("aa-locale", next);
    document.documentElement.lang = next;
  }

  return { locale, setLocale };
}

export default function LanguageToggle({
  locale,
  onChange,
  compact = false,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  compact?: boolean;
}) {
  return (
    <div className={"language-toggle" + (compact ? " compact" : "")} aria-label="Language / Idioma">
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        aria-pressed={locale === "en"}
        onClick={() => onChange("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={locale === "es" ? "active" : ""}
        aria-pressed={locale === "es"}
        onClick={() => onChange("es")}
      >
        ES
      </button>
    </div>
  );
}