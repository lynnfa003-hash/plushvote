"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { uiCopy } from "@/lib/i18n";
import { createBrowserSupabaseClient, getSupabaseConfigError, isSupabaseConfigured } from "@/lib/supabase";

function normalizeNextPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }

  return path;
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const text = uiCopy[locale];
  const [error, setError] = useState("");

  const code = useMemo(() => searchParams.get("code"), [searchParams]);
  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);

  useEffect(() => {
    const completeAuth = async () => {
      if (!isSupabaseConfigured) {
        setError(getSupabaseConfigError() ?? text.authFailed);
        return;
      }

      if (!code) {
        setError(text.authFailed);
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setError(exchangeError.message || text.authFailed);
        return;
      }

      router.replace(nextPath);
    };

    void completeAuth();
  }, [code, nextPath, router, text.authFailed]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-14 sm:px-6 lg:px-8">
      <section className="rounded-[2.4rem] bg-white p-8 shadow-soft sm:p-10">
        <h1 className="text-2xl font-black text-brand-textDark">{text.authTitle}</h1>
        {error ? (
          <>
            <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
            <div className="mt-6 text-sm font-semibold text-brand-textMuted">
              <Link href="/login" className="transition hover:text-brand-primary">
                {text.navSignIn}
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm font-semibold text-brand-textMuted">{text.authSending}</p>
        )}
      </section>
    </main>
  );
}


export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
