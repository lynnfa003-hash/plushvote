import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reportError } from "@/lib/monitoring";
import { createServerSupabaseClient, isSupabaseConfigured, type Database } from "@/lib/supabase";

type ToyDetailRow = Pick<
  Database["public"]["Tables"]["plush_toys"]["Row"],
  "id" | "name" | "description" | "image_url" | "category" | "vote_count"
>;

type ToyDetailPageProps = {
  params: {
    id: string;
  };
};

export const revalidate = 300;

async function fetchApprovedToyById(id: string) {
  if (!isSupabaseConfigured) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("plush_toys")
    .select("id, name, description, image_url, category, vote_count")
    .eq("id", id)
    .eq("is_approved", true)
    .maybeSingle();

  if (error) {
    await reportError(error, {
      where: "app/toys/[id]/page.tsx",
      action: "fetchApprovedToyById",
      id
    });
    return null;
  }

  return data as ToyDetailRow | null;
}

function createSeoDescription(toy: ToyDetailRow) {
  const trimmed = toy.description?.trim();
  if (trimmed) {
    return trimmed.slice(0, 150);
  }

  return `${toy.name} is one of the trending plush concepts on PlushVote.`;
}

export async function generateMetadata({ params }: ToyDetailPageProps): Promise<Metadata> {
  const toy = await fetchApprovedToyById(params.id);

  if (!toy) {
    return {
      title: "Plush Idea Not Found | PlushVote",
      description: "The plush idea you are looking for is unavailable."
    };
  }

  const description = createSeoDescription(toy);

  return {
    title: `${toy.name} | PlushVote`,
    description,
    alternates: {
      canonical: `/toys/${toy.id}`
    },
    openGraph: {
      title: `${toy.name} | PlushVote`,
      description,
      type: "article",
      images: [
        {
          url: toy.image_url,
          alt: toy.name
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: `${toy.name} | PlushVote`,
      description,
      images: [toy.image_url]
    }
  };
}

export default async function ToyDetailPage({ params }: ToyDetailPageProps) {
  const toy = await fetchApprovedToyById(params.id);

  if (!toy) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex rounded-2xl border border-brand-shapeBlue bg-white px-4 py-2 text-sm font-bold text-brand-textDark transition hover:border-brand-primary hover:text-brand-primary"
      >
        Back to Home
      </Link>

      <article className="mt-6 overflow-hidden rounded-[2.4rem] bg-white shadow-soft md:grid md:grid-cols-[1.15fr_1fr]">
        <div className="relative aspect-square w-full bg-brand-shapeBlue">
          <Image
            src={toy.image_url}
            alt={toy.name}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 55vw"
          />
        </div>

        <div className="space-y-5 p-7 sm:p-9">
          <p className="inline-flex rounded-full bg-brand-shapePurple px-3 py-1 text-xs font-bold text-brand-textDark">
            {toy.category}
          </p>
          <h1 className="text-3xl font-black text-brand-textDark">{toy.name}</h1>
          <p className="text-sm font-semibold leading-relaxed text-brand-textMuted">
            {toy.description || "No description yet for this plush idea."}
          </p>
          <div className="rounded-2xl bg-brand-shapeBlue/70 px-4 py-3 text-sm font-bold text-brand-textDark">
            Current votes: <span className="text-base">{toy.vote_count}</span>
          </div>
        </div>
      </article>
    </main>
  );
}
