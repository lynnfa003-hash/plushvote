"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import VoteButton from "@/components/VoteButton";
import type { ToyCategory } from "@/lib/supabase";

type ToyCardProps = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  category: ToyCategory;
  initialVoteCount: number;
};

const categoryStyles: Record<ToyCategory, string> = {
  已量产: "bg-mint/70 text-slate-800",
  设计稿: "bg-lavender/70 text-slate-800",
  同人创作: "bg-blush/70 text-slate-800"
};

export default function ToyCard({
  id,
  name,
  description,
  imageUrl,
  category,
  initialVoteCount
}: ToyCardProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);

  const categoryClassName = useMemo(() => categoryStyles[category], [category]);

  const handleVoteResult = (isNewVote: boolean) => {
    if (isNewVote) {
      setVoteCount((current) => current + 1);
    }
  };

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-square">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">{name}</h2>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${categoryClassName}`}>
            {category}
          </span>
        </div>

        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{description || "暂无描述"}</p>

        <div className="flex items-center justify-between rounded-2xl bg-cream px-3 py-2 text-sm text-slate-700">
          <span>想养它人数</span>
          <strong className="text-base text-slate-900">{voteCount}</strong>
        </div>

        <VoteButton toyId={id} onVoteResult={handleVoteResult} />
      </div>
    </article>
  );
}
