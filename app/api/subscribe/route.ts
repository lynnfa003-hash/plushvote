import { NextResponse } from "next/server";
import { reportError } from "@/lib/monitoring";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createServiceRoleSupabaseClient,
  getSupabaseAdminConfigError,
  isSupabaseAdminConfigured
} from "@/lib/supabase";

type SubscribeBody = {
  email?: unknown;
  locale?: unknown;
};

type PostgrestLikeError = {
  code?: string;
  message?: string;
};

const EMAIL_MAX_LENGTH = 320;

function createRateLimitHeaders(remaining: number, retryAfterSeconds: number) {
  return {
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": String(remaining),
    "Retry-After": String(retryAfterSeconds)
  };
}

function isValidEmail(email: string) {
  if (email.length > EMAIL_MAX_LENGTH) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isMissingSubscriptionTableError(error: PostgrestLikeError | null) {
  return Boolean(
    error &&
      error.code === "PGRST205" &&
      typeof error.message === "string" &&
      error.message.includes("email_subscriptions")
  );
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

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      { error: getSupabaseAdminConfigError() ?? "服务器缺少订阅配置。" },
      {
        status: 500,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  let payload: SubscribeBody;

  try {
    payload = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json(
      { error: "请求体格式不正确。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  const normalizedEmail = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const locale = payload.locale === "zh" ? "zh" : "en";

  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "邮箱格式不正确。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  console.log("[API/Subscribe] Attempting to insert email:", normalizedEmail, "locale:", locale);

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { error } = await supabase.from("email_subscriptions").insert({
      email: normalizedEmail,
      locale
    } as any);

    console.log("[API/Subscribe] Insert result - error:", error);

    if (error) {
      if (error.code === "23505") {
        console.log("[API/Subscribe] Email already exists");
        return NextResponse.json(
          { error: "该邮箱已经订阅。" },
          {
            status: 409,
            headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
          }
        );
      }

      if (isMissingSubscriptionTableError(error)) {
        console.log("[API/Subscribe] email_subscriptions table is missing");
        await reportError(error, {
          endpoint: "/api/subscribe",
          clientIp,
          locale
        });

        return NextResponse.json(
          { error: "订阅服务尚未初始化，请联系管理员执行最新数据库迁移。" },
          {
            status: 503,
            headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
          }
        );
      }

      console.log("[API/Subscribe] Unknown error:", error);
      await reportError(error, {
        endpoint: "/api/subscribe",
        clientIp,
        locale
      });

      return NextResponse.json(
        { error: "订阅失败，请稍后再试。" },
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
      endpoint: "/api/subscribe",
      clientIp
    });

    return NextResponse.json(
      { error: "服务暂时不可用，请稍后再试。" },
      {
        status: 500,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }
}
