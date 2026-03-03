"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { uiCopy } from "@/lib/i18n";
import { createBrowserSupabaseClient, getSupabaseConfigError, isSupabaseConfigured } from "@/lib/supabase";

function normalizeNextPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/submit";
  }

  return path;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const text = uiCopy[locale];
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError(text.subscriptionInvalid);
      return;
    }

    if (!isSupabaseConfigured) {
      setError(getSupabaseConfigError() ?? text.authFailed);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: callbackUrl.toString()
        }
      });

      if (signInError) {
        setError(signInError.message || text.authFailed);
      } else {
        setMessage(text.authSuccess);
      }
    } catch {
      setError(text.authFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
      <section className="rounded-[2.4rem] bg-white p-8 shadow-soft sm:p-10">
        <h1 className="text-3xl font-black text-brand-textDark">{text.authTitle}</h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-brand-textMuted">{text.authSubtitle}</p>

        <form className="mt-8 space-y-4" onSubmit={handleSignIn}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={text.authEmailPlaceholder}
            className="w-full rounded-2xl border border-brand-shapeBlue bg-brand-bg px-4 py-3 font-semibold text-brand-textDark outline-none transition focus:border-brand-primary"
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-brand-primary px-4 py-3 font-bold text-white shadow-soft transition hover:bg-brand-primaryHover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? text.authSending : text.authSendLink}
          </button>

          {message ? <p className="text-sm font-semibold text-emerald-600">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        </form>

        <div className="mt-6 text-sm font-semibold text-brand-textMuted">
          <Link href="/" className="transition hover:text-brand-primary">
            {text.submitBack}
          </Link>
        </div>
      </section>
    </main>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
