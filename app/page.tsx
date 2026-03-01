import Link from "next/link";
import { reportError } from "@/lib/monitoring";
import ToyCard from "@/components/ToyCard";
import {
  createServerSupabaseClient,
  getSupabaseConfigError,
  isSupabaseConfigured,
  type Database,
  type ToyCategory
} from "@/lib/supabase";

type ToyRow = Pick<
  Database["public"]["Tables"]["plush_toys"]["Row"],
  "id" | "name" | "description" | "image_url" | "category" | "vote_count"
>;

async function fetchApprovedToys(): Promise<ToyRow[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("plush_toys")
    .select("id, name, description, image_url, category, vote_count")
    .eq("is_approved", true)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    await reportError(error, {
      where: "app/page.tsx",
      action: "fetchApprovedToys"
    });
    return [];
  }

  return data ?? [];
}

export default async function HomePage() {
  const toys = await fetchApprovedToys();
  const supabaseConfigError = getSupabaseConfigError();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 rounded-3xl bg-white/85 p-8 shadow-soft backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">PlushVote</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">毛绒玩具创意投票平台</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          晒出你最心动的玩具创意，给它点一颗 "想养它" ❤️。按投票数实时排序，让更多人看见好设计。
        </p>
        <div className="mt-6">
          <Link
            href="/submit"
            className="inline-flex items-center rounded-full bg-lavender px-5 py-2.5 font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            我要投稿
          </Link>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
          {supabaseConfigError ?? "当前未配置 Supabase 环境变量。"} 请先复制 <code>.env.local.example</code> 到{" "}
          <code>.env.local</code> 并填写。
        </section>
      ) : toys.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          暂无已审核作品，快去投稿第一只毛绒玩具吧！
        </section>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {toys.map((toy) => (
            <ToyCard
              key={toy.id}
              id={toy.id}
              name={toy.name}
              description={toy.description}
              imageUrl={toy.image_url}
              category={toy.category as ToyCategory}
              initialVoteCount={toy.vote_count}
            />
          ))}
        </section>
      )}
    </main>
  );
}
