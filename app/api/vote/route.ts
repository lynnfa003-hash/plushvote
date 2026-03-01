import { NextResponse } from "next/server";
import { reportError } from "@/lib/monitoring";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type VoteBody = {
  toyId?: unknown;
  voterId?: unknown;
};

const VOTER_ID_MAX_LENGTH = 128;

function createRateLimitHeaders(remaining: number, retryAfterSeconds: number) {
  return {
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": String(remaining),
    "Retry-After": String(retryAfterSeconds)
  };
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后重试。" },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "服务器未配置 Supabase。" },
      {
        status: 500,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  let payload: VoteBody;

  try {
    payload = (await request.json()) as VoteBody;
  } catch {
    return NextResponse.json(
      { error: "请求体格式不正确。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  const toyId = typeof payload.toyId === "string" ? payload.toyId.trim() : "";
  const voterId = typeof payload.voterId === "string" ? payload.voterId.trim() : "";

  if (!toyId || !voterId) {
    return NextResponse.json(
      { error: "toyId 和 voterId 为必填项。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  if (voterId.length > VOTER_ID_MAX_LENGTH) {
    return NextResponse.json(
      { error: "voterId 长度超出限制。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("votes").insert({
      toy_id: toyId,
      voter_id: voterId
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "你已经投过票了。" },
          {
            status: 409,
            headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
          }
        );
      }

      if (error.code === "23503") {
        return NextResponse.json(
          { error: "该作品不存在或暂不可投票。" },
          {
            status: 404,
            headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
          }
        );
      }

      if (error.code === "42501") {
        return NextResponse.json(
          { error: "该作品尚未开放投票。" },
          {
            status: 403,
            headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
          }
        );
      }

      await reportError(error, {
        endpoint: "/api/vote",
        clientIp,
        toyId
      });

      return NextResponse.json(
        { error: "投票失败，请稍后再试。" },
        {
          status: 500,
          headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
        }
      );
    }

    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  } catch (error) {
    await reportError(error, {
      endpoint: "/api/vote",
      clientIp,
      toyId
    });

    return NextResponse.json(
      { error: "服务暂时不可用，请稍后重试。" },
      {
        status: 500,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }
}
