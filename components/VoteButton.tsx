"use client";

import { useEffect, useState } from "react";
import { reportError } from "@/lib/monitoring";

type VoteButtonProps = {
  toyId: string;
  onVoteResult: (isNewVote: boolean) => void;
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

function generateVoterId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // Fallback
  }
  return "voter_" + Date.now() + "_" + Math.random().toString(36).substring(2, 15);
}

export default function VoteButton({ toyId, onVoteResult }: VoteButtonProps) {
  const [voterId, setVoterId] = useState<string>("");
  const [voted, setVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let localVoterId = localStorage.getItem(VOTER_ID_KEY);
    if (!localVoterId) {
      localVoterId = generateVoterId();
      localStorage.setItem(VOTER_ID_KEY, localVoterId);
    }

    setVoterId(localVoterId);
    setVoted(getVotedToyIds().has(toyId));
  }, [toyId]);

  const handleVote = async () => {
    if (voted || isSubmitting || !voterId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ toyId, voterId })
      });

      if (response.ok) {
        saveVotedToyId(toyId);
        setVoted(true);
        setAnimate(true);
        onVoteResult(true);
        window.setTimeout(() => setAnimate(false), 320);
        return;
      }

      if (response.status === 409) {
        saveVotedToyId(toyId);
        setVoted(true);
        return;
      }

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setErrorMessage(payload?.error ?? "投票失败，请稍后再试。");
    } catch (error) {
      setErrorMessage("网络异常，请检查连接后重试。");
      await reportError(error, {
        where: "components/VoteButton.tsx",
        action: "handleVote"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleVote}
        disabled={voted || isSubmitting}
        className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ${
          voted
            ? "cursor-not-allowed bg-slate-200 text-slate-500"
            : "bg-blush text-slate-900 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
        } ${animate ? "scale-105" : ""}`}
      >
        {voted ? "已投票 ❤️" : isSubmitting ? "投票中..." : "想养它 ❤️"}
      </button>
      {errorMessage ? <p className="mt-2 text-xs text-rose-600">{errorMessage}</p> : null}
    </div>
  );
}
