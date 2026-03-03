"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { uiCopy } from "@/lib/i18n";
import { reportError } from "@/lib/monitoring";

type VoteButtonProps = {
  toyId: string | number;
  onVoteResult: (isNewVote: boolean, newCount?: number) => void;
  currentVotes?: number;
};

const VOTER_ID_KEY = "plushvote_voter_id";
const VOTED_TOYS_KEY = "plushvote_voted_toy_ids";

function getVotedToyIds() {
  try {
    const raw = localStorage.getItem(VOTED_TOYS_KEY);
    if (!raw) {
      return new Set<string>();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function saveVotedToyId(toyId: string) {
  const voted = getVotedToyIds();
  voted.add(toyId);
  localStorage.setItem(VOTED_TOYS_KEY, JSON.stringify(Array.from(voted)));
}

// 粒子组件
function Particles({ active }: { active: boolean }) {
  if (!active) return null;

  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360;
    const distance = 30 + Math.random() * 20;
    return { angle, distance, delay: i * 0.05 };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-particle"
          style={{
            background: `hsl(${Math.random() * 60 + 330}, 100%, 60%)`,
            transform: `translate(-50%, -50%)`,
            animationDelay: `${p.delay}s`,
            ['--angle' as string]: `${p.angle}deg`,
            ['--distance' as string]: `${p.distance}px`,
          }}
        />
      ))}
    </div>
  );
}

// 飘心组件
function FloatingHearts({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 text-lg animate-float-heart"
          style={{
            animationDelay: `${i * 0.15}s`,
            ['--offset-x' as string]: `${(i - 1) * 20}px`,
          }}
        >
          ❤️
        </span>
      ))}
    </div>
  );
}

export default function VoteButton({ toyId, onVoteResult, currentVotes }: VoteButtonProps) {
  const { locale } = useLocale();
  const text = uiCopy[locale];
  const [voterId, setVoterId] = useState<string>("");
  const [voted, setVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showHearts, setShowHearts] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let localVoterId = localStorage.getItem(VOTER_ID_KEY);
    if (!localVoterId) {
      localVoterId = crypto.randomUUID();
      localStorage.setItem(VOTER_ID_KEY, localVoterId);
    }

    setVoterId(localVoterId);
    const toyIdStr = String(toyId);
    setVoted(getVotedToyIds().has(toyIdStr));
  }, [toyId]);

  const triggerAnimations = useCallback(() => {
    setShowParticles(true);
    setShowHearts(true);
    setTimeout(() => setShowParticles(false), 800);
    setTimeout(() => setShowHearts(false), 1200);
  }, []);

  const handleVote = async () => {
    if (voted || isSubmitting || !voterId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const toyIdStr = String(toyId);
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ toyId, voterId })
      });

      if (response.ok) {
        const data = await response.json();
        saveVotedToyId(toyIdStr);
        setVoted(true);
        triggerAnimations();
        onVoteResult(true, data.newCount);
        return;
      }

      if (response.status === 409) {
        saveVotedToyId(toyIdStr);
        setVoted(true);
        return;
      }

      if (response.status === 429) {
        setErrorMessage(
          locale === "zh" ? "投票太频繁了，请稍后再试。" : "You are voting too quickly. Please try again soon."
        );
        return;
      }

      setErrorMessage(locale === "zh" ? "投票失败，请稍后再试。" : "Vote failed. Please try again.");
    } catch (error) {
      setErrorMessage(locale === "zh" ? "网络异常，请稍后重试。" : "Network error. Please retry.");
      await reportError(error, {
        where: "components/VoteButton.tsx",
        action: "handleVote"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleVote}
        disabled={voted || isSubmitting}
        className={`
          relative w-full rounded-xl px-4 py-2.5 text-sm font-black transition-all duration-200 overflow-hidden
          ${voted
            ? "bg-rose-50 text-rose-500 cursor-default"
            : "bg-brand-primary text-white shadow-soft hover:-translate-y-0.5 hover:bg-brand-primaryHover hover:shadow-lg active:translate-y-0"
          }
          ${isSubmitting ? "opacity-80 cursor-wait" : ""}
        `}
      >
        {/* 背景闪光效果 */}
        {!voted && !isSubmitting && (
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}

        {/* 已投票的心跳效果 */}
        {voted && (
          <span className="absolute inset-0 animate-heartbeat bg-rose-100/50 rounded-xl" />
        )}

        {/* 按钮内容 */}
        <span className="relative flex items-center justify-center gap-2">
          {voted ? (
            <>
              <span className="animate-bounce-subtle">❤️</span>
              <span>{text.cardVotedButton}</span>
            </>
          ) : isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{text.cardVoting}</span>
            </>
          ) : (
            <>
              <span className="text-base transition-transform group-hover:scale-110">🤍</span>
              <span>{text.cardVoteButton}</span>
            </>
          )}
        </span>

        {/* 粒子动画 */}
        <Particles active={showParticles} />

        {/* 飘心动画 */}
        <FloatingHearts active={showHearts} />
      </button>

      {errorMessage ? (
        <p className="mt-2 text-xs font-semibold text-rose-600 text-center animate-fade-in">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
