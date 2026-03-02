"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
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
  imageUrl: string;
  category: ToyCategory;
};

const categories: ToyCategory[] = ["已量产", "设计稿", "同人创作"];

const initialState: FormState = {
  name: "",
  description: "",
  imageUrl: "",
  category: "设计稿"
};

export default function SubmitPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const canSubmit = useMemo(() => {
    return Boolean(form.name.trim() && form.imageUrl.trim());
  }, [form.imageUrl, form.name]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!canSubmit) {
      setError("请至少填写名称和图片 URL。");
      return;
    }

    try {
      new URL(form.imageUrl);
    } catch {
      setError("图片 URL 格式不正确。");
      return;
    }

    if (!isSupabaseConfigured) {
      setError(getSupabaseConfigError() ?? "缺少 Supabase 环境变量，请先配置 .env.local。");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: insertError } = await supabase.from("plush_toys").insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: form.imageUrl.trim(),
        category: form.category,
        is_approved: false
      } as any);

      if (insertError) {
        if (insertError.code === "42501") {
          setError("投稿功能当前仅管理员可用。");
        } else {
          setError(insertError.message || "提交失败，请稍后再试。");
          await reportError(insertError, {
            where: "app/submit/page.tsx",
            action: "submitToy"
          } as any);
        }
        return;
      }

      setForm(initialState);
      setMessage("投稿成功！作品已进入待审核列表。✨");
    } catch (submitError) {
      setError("提交失败，请稍后再试。");
      await reportError(submitError, {
        where: "app/submit/page.tsx",
        action: "submitToy"
      } as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-medium text-slate-500">投稿新作品</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">分享你的毛绒玩具创意</h1>
        <p className="mt-3 text-slate-600">填写信息后将进入待审核队列，审核通过后会出现在首页展示墙。</p>
      </header>

      <section className="rounded-3xl bg-white p-6 shadow-soft sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
              名称
            </label>
            <input
              id="name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-lavender"
              placeholder="例如：月亮狐"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-semibold text-slate-700">
              描述
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-lavender"
              placeholder="说说它的特色、材质、故事感..."
              maxLength={300}
            />
          </div>

          <div>
            <label htmlFor="imageUrl" className="mb-2 block text-sm font-semibold text-slate-700">
              图片 URL
            </label>
            <input
              id="imageUrl"
              type="url"
              value={form.imageUrl}
              onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-lavender"
              placeholder="https://..."
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="mb-2 block text-sm font-semibold text-slate-700">
              分类
            </label>
            <select
              id="category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value as ToyCategory }))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-lavender"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-blush px-6 py-2.5 font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "提交中..." : "提交投稿"}
            </button>
            <Link
              href="/"
              className="rounded-full border border-slate-300 px-6 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              返回首页
            </Link>
          </div>

          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
