"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, isLocale, localeOptions, type Locale } from "@/lib/i18n";

const LOCALE_STORAGE_KEY = "plushvote_locale";
const LOCALE_COOKIE_KEY = "plushvote_locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      setLocale(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        if (!localeOptions.includes(next)) {
          return;
        }
        setLocale(next);
      }
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return context;
}
