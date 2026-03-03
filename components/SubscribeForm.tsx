"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { uiCopy } from "@/lib/i18n";

export default function SubscribeForm() {
  const { locale } = useLocale();
  const text = uiCopy[locale];
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError(text.subscriptionInvalid);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: normalizedEmail,
          locale
        })
      });

      if (response.ok) {
        setEmail("");
        setMessage(text.subscriptionSuccess);
        return;
      }

      if (response.status === 409) {
        setError(text.subscriptionExists);
        return;
      }

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || text.subscriptionFailed);
    } catch {
      setError(text.subscriptionFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/65 p-2 shadow-soft backdrop-blur-md sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={text.subscriptionPlaceholder}
          className="w-full rounded-2xl border border-transparent bg-transparent px-5 py-3 font-semibold text-brand-textDark outline-none transition focus:border-brand-shapeBlue sm:min-w-[20rem]"
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-brand-primary px-6 py-3 font-bold text-white transition hover:bg-brand-primaryHover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? text.subscriptionSubmitting : text.subscriptionButton}
        </button>
      </div>

      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
    </form>
  );
}
