"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    void reportError(error, {
      where: "app/error.tsx",
      digest: error.digest
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900">页面出了点问题</h1>
      <p className="mt-3 text-sm text-slate-600">我们已经记录错误，请稍后重试。</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-lavender px-5 py-2 text-sm font-semibold text-slate-900"
      >
        重新加载
      </button>
    </main>
  );
}
