"use client";

import { useEffect, useState } from "react";

export type Locale = "en" | "es" | "pt";

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "es" || value === "pt";
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("aa-locale");
    const initial = isLocale(saved) ? saved : "en";
    document.documentElement.lang = initial === "pt" ? "pt-BR" : initial;
    const task = window.setTimeout(() => setLocaleState(initial), 0);
    return () => window.clearTimeout(task);
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem("aa-locale", next);
    document.documentElement.lang = next === "pt" ? "pt-BR" : next;
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
      {(["en", "es", "pt"] as const).map((item) => (
        <button
          type="button"
          className={locale === item ? "active" : ""}
          aria-pressed={locale === item}
          onClick={() => onChange(item)}
          key={item}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function LanguageControl({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  return <LanguageToggle locale={locale} onChange={setLocale} compact={compact} />;
}