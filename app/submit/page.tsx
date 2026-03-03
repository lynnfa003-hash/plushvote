"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import ImageUpload, { UploadedImage } from "@/components/ImageUpload";
import { categoryValues, uiCopy } from "@/lib/i18n";
import { reportError } from "@/lib/monitoring";
import {
  createBrowserSupabaseClient,
  getSupabaseConfigError,
  isSupabaseConfigured,
  type ToyCategory
} from "@/lib/supabase";

type FormState = {
  name: string;
  description: string;
  category: ToyCategory;
};

const initialFormState: FormState = {
  name: "",
  description: "",
  category: "设计稿"
};

const MAX_IMAGES = 10;

export default function SubmitPage() {
  const { locale } = useLocale();
  const text = uiCopy[locale];
  const [form, setForm] = useState<FormState>(initialFormState);
  const [authEmail, setAuthEmail] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthEmail("");
      setIsAuthLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();

    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      setAuthEmail(data.user?.email ?? "");
      setIsAuthLoading(false);
    };

    void syncUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user?.email ?? "");
      setIsAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validImages = useMemo(() => images.filter((img) => img.status !== "error"), [images]);

  const canSubmit = useMemo(() => {
    return Boolean(form.name.trim() && validImages.length > 0 && !isSubmitting);
  }, [form.name, validImages.length, isSubmitting]);

  const resetForm = () => {
    setForm(initialFormState);
    images.forEach((img) => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
  };

  const uploadImages = async (): Promise<string[]> => {
    const pendingImages = validImages.filter((img) => img.status === "idle");

    if (pendingImages.length === 0) {
      // All images already uploaded
      return validImages.map((img) => img.url!).filter(Boolean);
    }

    const formData = new FormData();
    pendingImages.forEach((img) => {
      formData.append("files", img.file);
    });

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => null)) as
      | { images?: { url: string; path: string }[]; error?: string }
      | null;

    if (!response.ok || !payload?.images) {
      throw new Error(payload?.error || text.submitUploadFailed);
    }

    // Update images state with URLs
    const uploadedUrls: string[] = [];
    const newImages = images.map((img) => {
      const uploaded = payload.images!.find(
        (_, i) => pendingImages[i]?.id === img.id
      );
      if (uploaded) {
        uploadedUrls.push(uploaded.url);
        return { ...img, status: "done" as const, url: uploaded.url };
      }
      return img;
    });

    setImages(newImages);

    // Combine with already uploaded images
    const allUrls = validImages
      .map((img) => {
        if (img.status === "done" && img.url) return img.url;
        const uploaded = payload.images!.find(
          (_, i) => pendingImages[i]?.id === img.id
        );
        return uploaded?.url;
      })
      .filter((url): url is string => Boolean(url));

    return allUrls;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isSupabaseConfigured) {
      setError(getSupabaseConfigError() ?? text.submitFailed);
      return;
    }

    if (!authEmail) {
      setError(text.submitNeedsLogin);
      return;
    }

    if (validImages.length === 0) {
      setError(text.submitNeedsImage);
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      const imageUrls = await uploadImages();

      if (imageUrls.length === 0) {
        throw new Error(text.submitUploadFailed);
      }

      const supabase = createBrowserSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(text.submitNeedsLogin);
        return;
      }

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          imageUrl: imageUrls[0], // First image is the main one
          imageUrls: imageUrls, // All images
          category: form.category
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error || text.submitFailed);
        return;
      }

      resetForm();
      setMessage(text.submitSuccess);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : text.submitFailed);
      await reportError(submitError, {
        where: "app/submit/page.tsx",
        action: "submitToy"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-brand-textDark">{text.submitHeading}</h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-brand-textMuted">
          {text.submitSubheading}
        </p>
      </header>

      <section className="rounded-[2.4rem] bg-white p-6 shadow-soft sm:p-8">
        {!authEmail ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {isAuthLoading ? text.authSending : text.submitNeedsLogin}
            <div className="mt-3">
              <Link
                href="/login?next=%2Fsubmit"
                className="text-brand-primary underline underline-offset-4"
              >
                {text.navSignIn}
              </Link>
            </div>
          </div>
        ) : null}

        <form className="mt-5 space-y-6" onSubmit={handleSubmit}>
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-bold text-brand-textDark">
              {text.submitName}
            </label>
            <input
              id="name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-2xl border border-brand-shapeBlue bg-brand-bg px-4 py-2.5 outline-none transition focus:border-brand-primary"
              placeholder={text.submitNamePlaceholder}
              maxLength={80}
              required
            />
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-bold text-brand-textDark">
              {text.submitDescription}
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="min-h-28 w-full rounded-2xl border border-brand-shapeBlue bg-brand-bg px-4 py-2.5 outline-none transition focus:border-brand-primary"
              placeholder={text.submitDescriptionPlaceholder}
              maxLength={600}
            />
          </div>

          {/* Category Field */}
          <div>
            <label htmlFor="category" className="mb-2 block text-sm font-bold text-brand-textDark">
              {text.submitCategory}
            </label>
            <select
              id="category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as ToyCategory
                }))
              }
              className="w-full rounded-2xl border border-brand-shapeBlue bg-brand-bg px-4 py-2.5 outline-none transition focus:border-brand-primary"
            >
              {categoryValues.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Image Upload Field */}
          <div>
            <label className="mb-3 block text-sm font-bold text-brand-textDark">
              {text.submitImage}
            </label>
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              maxImages={MAX_IMAGES}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit || !authEmail}
              className="rounded-2xl bg-brand-primary px-6 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? text.submitSubmitting : text.submitButton}
            </button>
            <Link
              href="/"
              className="rounded-2xl border border-brand-shapeBlue bg-white px-6 py-2.5 text-sm font-bold text-brand-textDark transition hover:border-brand-primary hover:text-brand-primary"
            >
              {text.submitBack}
            </Link>
          </div>

          {/* Messages */}
          {message ? (
            <p className="text-sm font-semibold text-emerald-600">{message}</p>
          ) : null}
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
