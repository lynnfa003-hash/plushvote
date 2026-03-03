"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import VoteButton from "@/components/VoteButton";
import { categoryLabels, uiCopy } from "@/lib/i18n";
import type { ToyCategory } from "@/lib/supabase";

type ToyCardProps = {
  id: string | number;
  name: string;
  description: string | null;
  imageUrl: string;
  category: ToyCategory;
  initialVoteCount: number;
};

const categoryStyles: Record<ToyCategory, string> = {
  已量产: "bg-emerald-100 text-emerald-700",
  设计稿: "bg-purple-100 text-purple-700",
  同人创作: "bg-amber-100 text-amber-700"
};

export default function ToyCard({
  id,
  name,
  description,
  imageUrl,
  category,
  initialVoteCount
}: ToyCardProps) {
  const { locale } = useLocale();
  const text = uiCopy[locale];
  const [voteCount, setVoteCount] = useState(initialVoteCount);

  const categoryClassName = useMemo(() => categoryStyles[category], [category]);

  const handleVoteResult = (isNewVote: boolean, newCount?: number) => {
    if (isNewVote) {
      setVoteCount(newCount ?? (current => current + 1));
    }
  };

  return (
    <article className="group relative flex flex-col rounded-3xl bg-white shadow-card transition-all duration-300 hover:-translate-y-2 hover:shadow-soft overflow-hidden">
      {/* 图片区域 */}
      <Link href={`/toys/${id}`} className="relative aspect-square overflow-hidden">
        <Image
          src={imageUrl}
          alt={name}
          fill
          unoptimized
          className="object-cover transition duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* 分类标签 - 左上角 */}
        <span className={`absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-bold ${categoryClassName} backdrop-blur-sm`}>
          {categoryLabels[locale][category]}
        </span>

        {/* 票数 - 右上角 */}
        <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-brand-textDark shadow-sm">
          <span className="text-rose-500">❤</span>
          <span>{voteCount.toLocaleString()}</span>
        </div>
      </Link>

      {/* 内容区域 */}
      <div className="flex flex-col flex-1 p-5">
        <Link href={`/toys/${id}`}>
          <h2 className="text-lg font-black text-brand-textDark line-clamp-1 group-hover:text-brand-primary transition-colors">
            {name}
          </h2>
        </Link>

        <p className="mt-2 line-clamp-2 text-sm font-medium text-brand-textMuted/80 leading-relaxed flex-1">
          {description || text.cardNoDescription}
        </p>

        <div className="mt-4">
          <VoteButton toyId={id} onVoteResult={handleVoteResult} currentVotes={voteCount} />
        </div>
      </div>
    </article>
  );
}
