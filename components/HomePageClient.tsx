"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale } from "@/components/LocaleProvider";
import SubscribeForm from "@/components/SubscribeForm";
import ToyCard from "@/components/ToyCard";
import { uiCopy } from "@/lib/i18n";
import type { ToyCategory } from "@/lib/supabase";

type ToyItem = {
  id: string | number;
  name: string;
  description: string | null;
  image_url: string;
  category: ToyCategory;
  vote_count: number;
};

type HomePageClientProps = {
  toys: ToyItem[];
  isSupabaseReady: boolean;
  supabaseConfigError: string | null;
};

// 领奖台单品组件
function PodiumItem({
  toy,
  rank,
  height,
  bgColor,
  isCenter = false
}: {
  toy: ToyItem;
  rank: number;
  height: string;
  bgColor: string;
  isCenter?: boolean;
}) {
  const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const rankColors = rank === 1
    ? "from-yellow-400 to-amber-500 shadow-yellow-200"
    : rank === 2
    ? "from-gray-300 to-gray-400 shadow-gray-200"
    : "from-amber-600 to-amber-700 shadow-amber-200";

  return (
    <div className={`flex flex-col items-center ${isCenter ? "z-10" : "z-0"}`}>
      {/* 玩具卡片 */}
      <div className={`relative ${isCenter ? "-mt-8" : ""}`}>
        {/* 排名徽章 */}
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br ${rankColors}
            flex items-center justify-center text-white font-black text-sm shadow-lg z-20`}
        >
          {rank}
        </div>

        {/* 玩具图片容器 */}
        <Link
          href={`/toys/${toy.id}`}
          className={`block w-24 h-24 sm:w-28 sm:h-28 rounded-3xl ${bgColor} flex items-center justify-center
            shadow-lg hover:scale-105 transition-transform duration-300 overflow-hidden border-4 border-white`}
        >
          {toy.image_url ? (
            <Image
              src={toy.image_url}
              alt={toy.name}
              width={112}
              height={112}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl">🧸</span>
          )}
        </Link>

        {/* 票数气泡 */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
          <span className="text-xs font-black text-brand-primary">{toy.vote_count.toLocaleString()} ❤️</span>
        </div>
      </div>

      {/* 领奖台底座 */}
      <div
        className={`w-20 sm:w-24 ${height} mt-4 rounded-t-2xl bg-gradient-to-b ${rankColors} opacity-90
          flex items-end justify-center pb-2 shadow-lg`}
      >
        <span className="text-2xl">{rankEmoji}</span>
      </div>

      {/* 玩具名称 */}
      <Link href={`/toys/${toy.id}`} className="mt-2 text-center max-w-[100px]">
        <p className="text-xs font-bold text-brand-textDark truncate hover:text-brand-primary transition">
          {toy.name}
        </p>
      </Link>
    </div>
  );
}

// 领奖台组件
function PodiumTop3({ toys }: { toys: ToyItem[] }) {
  if (toys.length === 0) return null;

  const top3 = toys.slice(0, 3);
  // 领奖台顺序: 第2名(左), 第1名(中), 第3名(右)
  const [first, second, third] = [
    top3[0], // 第1名
    top3[1], // 第2名
    top3[2]  // 第3名
  ];

  const bgColors = [
    "bg-gradient-to-br from-brand-shapePurple to-purple-100",
    "bg-gradient-to-br from-brand-shapeBlue to-blue-100",
    "bg-gradient-to-br from-brand-shapeGreen to-green-100"
  ];

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6 pb-2">
      {second && (
        <PodiumItem
          toy={second}
          rank={2}
          height="h-20 sm:h-24"
          bgColor={bgColors[1]}
        />
      )}
      {first && (
        <PodiumItem
          toy={first}
          rank={1}
          height="h-32 sm:h-40"
          bgColor={bgColors[0]}
          isCenter
        />
      )}
      {third && (
        <PodiumItem
          toy={third}
          rank={3}
          height="h-16 sm:h-20"
          bgColor={bgColors[2]}
        />
      )}
    </div>
  );
}

export default function HomePageClient({ toys, isSupabaseReady, supabaseConfigError }: HomePageClientProps) {
  const { locale } = useLocale();
  const text = uiCopy[locale];

  const totalVotes = toys.reduce((sum, toy) => sum + toy.vote_count, 0);
  const fanCount = Math.max(1200, toys.length * 37);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      {/* Hero Section - 参考 demo.html 风格 */}
      <section className="relative overflow-hidden rounded-[2.8rem] bg-white px-6 py-10 sm:px-10 sm:py-14 lg:py-16 shadow-soft">
        {/* 背景装饰 */}
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-shapeBlue blur-3xl opacity-60" />
        <div className="absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-brand-shapePurple blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-brand-shapeYellow blur-3xl opacity-40" />

        <div className="relative lg:flex lg:items-center lg:justify-between gap-12">
          {/* 左侧文字区 */}
          <div className="lg:w-1/2 relative z-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-brand-textDark">
              {text.heroTitleLine1}
              <br />
              {text.heroTitleLine2}
              <br />
              <span className="text-brand-primary">{text.heroTitleLine3}</span>
            </h1>
            <p className="mt-6 max-w-lg text-base sm:text-lg font-semibold leading-relaxed text-brand-textMuted">
              {text.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="#trending"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-primary px-7 py-4 text-base font-black text-white shadow-soft transition hover:bg-brand-primaryHover hover:-translate-y-0.5"
              >
                {text.heroPrimaryCta}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                href="/submit"
                className="inline-flex items-center rounded-2xl border-2 border-brand-shapeBlue bg-white px-7 py-4 text-base font-black text-brand-textDark transition hover:border-brand-primary hover:text-brand-primary"
              >
                {text.heroSecondaryCta}
              </Link>
            </div>

            {/* 统计卡片 - 参考 demo.html 风格 */}
            <div className="mt-12 bg-gradient-to-r from-brand-primary to-[#8A85FF] rounded-[2rem] p-6 sm:p-8 text-white shadow-soft relative overflow-hidden max-w-md">
              {/* 装饰波点 */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "radial-gradient(circle at 20% 80%, white 2px, transparent 2px), radial-gradient(circle at 80% 20%, white 2px, transparent 2px)",
                backgroundSize: "60px 60px"
              }} />

              <div className="relative z-10 flex justify-between items-center">
                <div className="text-center">
                  <div className="text-xs font-bold opacity-80 mb-1">{text.statDesigns}</div>
                  <div className="text-2xl sm:text-3xl font-black">{toys.length}</div>
                </div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center">
                  <div className="text-xs font-bold opacity-80 mb-1">{text.statFans}</div>
                  <div className="text-2xl sm:text-3xl font-black">{fanCount.toLocaleString()}+</div>
                </div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center">
                  <div className="text-xs font-bold opacity-80 mb-1">{text.statVotes}</div>
                  <div className="text-2xl sm:text-3xl font-black">{totalVotes.toLocaleString()}+</div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧领奖台 Top 3 */}
          <div className="lg:w-1/2 mt-12 lg:mt-0 relative">
            {/* 背景光晕 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-brand-shapeBlue blur-3xl opacity-50" />
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-brand-shapeYellow blur-3xl opacity-40" />

            {/* 领奖台区域 */}
            <div className="relative z-10">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-2 bg-brand-shapePurple px-4 py-2 rounded-full">
                  <span className="text-lg">🏆</span>
                  <span className="text-sm font-black text-brand-textDark">TOP 3 热门设计</span>
                </span>
              </div>

              {toys.length >= 3 ? (
                <PodiumTop3 toys={toys} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-brand-textMuted">
                  <span className="text-6xl mb-4">🧸</span>
                  <p className="font-semibold">快来投出第一票吧！</p>
                </div>
              )}

              {/* 底部装饰线 */}
              <div className="mt-8 flex justify-center">
                <div className="w-32 h-1 rounded-full bg-gradient-to-r from-transparent via-brand-primary/30 to-transparent" />
              </div>
            </div>

            {/* 浮动装饰元素 */}
            <div className="absolute top-4 right-8 text-3xl animate-bounce">✨</div>
            <div className="absolute bottom-20 left-4 text-2xl animate-pulse">🎈</div>
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section id="trending" className="mt-16">
        <h2 className="text-center text-3xl font-black text-brand-textDark sm:text-4xl">{text.sectionTrending}</h2>

        {!isSupabaseReady ? (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
            {supabaseConfigError ?? text.sectionMissingConfig}
          </div>
        ) : toys.length === 0 ? (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-brand-shapeBlue bg-white p-8 text-center font-semibold text-brand-textMuted">
            {text.sectionEmpty}
          </div>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {toys.map((toy) => (
              <ToyCard
                key={toy.id}
                id={toy.id}
                name={toy.name}
                description={toy.description}
                imageUrl={toy.image_url}
                category={toy.category}
                initialVoteCount={toy.vote_count}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-20 rounded-[2.8rem] bg-gradient-to-r from-[#A5F3FC] to-[#D8B4FE] p-8 shadow-soft sm:p-12">
        <div className="mx-auto max-w-4xl">
          <h3 className="text-3xl font-black text-brand-textDark">{text.subscriptionTitle}</h3>
          <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-brand-textDark/80">
            {text.subscriptionBody}
          </p>
          <div className="mt-8">
            <SubscribeForm />
          </div>
        </div>
      </section>
    </main>
  );
}
