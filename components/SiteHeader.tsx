"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { uiCopy } from "@/lib/i18n";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type AuthState = {
  email: string;
  isLoading: boolean;
};

function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl bg-white/70 p-1 text-sm shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-xl px-3 py-1.5 font-bold transition ${
          locale === "en" ? "bg-brand-primary text-white" : "text-brand-textMuted hover:text-brand-textDark"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("zh")}
        className={`rounded-xl px-3 py-1.5 font-bold transition ${
          locale === "zh" ? "bg-brand-primary text-white" : "text-brand-textMuted hover:text-brand-textDark"
        }`}
      >
        中
      </button>
    </div>
  );
}

export default function SiteHeader() {
  const { locale } = useLocale();
  const text = uiCopy[locale];
  const [authState, setAuthState] = useState<AuthState>({ email: "", isLoading: true });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthState({ email: "", isLoading: false });
      return;
    }

    const supabase = createBrowserSupabaseClient();

    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      setAuthState({ email: data.user?.email ?? "", isLoading: false });
    };

    void syncUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({ email: session?.user?.email ?? "", isLoading: false });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setAuthState({ email: "", isLoading: false });
  };

  const signedInLabel = useMemo(() => {
    if (!authState.email) {
      return "";
    }

    return `${text.navSignedIn}: ${authState.email}`;
  }, [authState.email, text.navSignedIn]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-brand-bg/90 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="text-2xl font-black tracking-tight text-brand-primary">
          {text.brand}
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {authState.email ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-2xl border border-brand-shapeBlue bg-white px-4 py-2 text-sm font-bold text-brand-textDark transition hover:border-brand-primary hover:text-brand-primary"
              title={signedInLabel}
            >
              {text.navSignOut}
            </button>
          ) : (
            <Link
              href="/login"
              aria-disabled={authState.isLoading}
              className={`rounded-2xl bg-brand-primary px-4 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-brand-primaryHover ${
                authState.isLoading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {text.navSignIn}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
