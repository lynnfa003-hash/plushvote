import { NextResponse } from "next/server";
import { categoryValues } from "@/lib/i18n";
import { reportError } from "@/lib/monitoring";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createServiceRoleSupabaseClient,
  getSupabaseAdminConfigError,
  isSupabaseAdminConfigured,
  type ToyCategory
} from "@/lib/supabase";

type SubmissionBody = {
  name?: unknown;
  description?: unknown;
  imageUrl?: unknown;
  imageUrls?: unknown[];
  category?: unknown;
};

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 600;

function createRateLimitHeaders(remaining: number, retryAfterSeconds: number) {
  return {
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": String(remaining),
    "Retry-After": String(retryAfterSeconds)
  };
}

function getAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function isValidCategory(category: string): category is ToyCategory {
  return categoryValues.some((value) => value === category);
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
      { error: getSupabaseAdminConfigError() ?? "服务器缺少投稿配置。" },
      {
        status: 500,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "请先登录后再投稿。" },
      {
        status: 401,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  let payload: SubmissionBody;

  try {
    payload = (await request.json()) as SubmissionBody;
  } catch {
    return NextResponse.json(
      { error: "请求体格式不正确。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.filter((url): url is string => typeof url === "string" && url.trim() !== "")
    : [];
  const category = typeof payload.category === "string" ? payload.category.trim() : "";

  // Support both single imageUrl and multiple imageUrls
  const hasValidImage = imageUrl || imageUrls.length > 0;

  if (!name || !hasValidImage || !isValidCategory(category)) {
    return NextResponse.json(
      { error: "名称、图片和分类为必填项。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  if (name.length > NAME_MAX_LENGTH || description.length > DESCRIPTION_MAX_LENGTH) {
    return NextResponse.json(
      { error: "内容长度超出限制。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  // Validate image URLs
  const urlsToValidate = imageUrls.length > 0 ? imageUrls : [imageUrl];
  for (const url of urlsToValidate) {
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "图片地址格式不正确。" },
        {
          status: 400,
          headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
        }
      );
    }
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "登录状态已失效，请重新登录。" },
        {
          status: 401,
          headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
        }
      );
    }

    // Use first image from imageUrls as the main image, or fall back to legacy imageUrl
    const mainImageUrl = imageUrls.length > 0 ? imageUrls[0] : imageUrl;

    const insertData = {
      name,
      description: description || null,
      image_url: mainImageUrl,
      category,
      is_approved: false
    };

    const { data, error } = await supabase
      .from("plush_toys")
      .insert(insertData as any)
      .select("id")
      .single();

    if (error) {
      await reportError(error, {
        endpoint: "/api/submissions",
        clientIp,
        userId: user.id
      });

      return NextResponse.json(
        { error: "投稿失败，请稍后再试。" },
        {
          status: 500,
          headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
        }
      );
    }

    const toyId = (data as any)?.id;

    // Insert additional images if provided
    if (imageUrls.length > 0 && toyId) {
      const imageRecords = imageUrls.map((url, index) => ({
        toy_id: toyId,
        image_url: url,
        display_order: index
      }));

      const { error: imagesError } = await supabase
        .from("plush_toy_images")
        .insert(imageRecords as any);

      if (imagesError) {
        await reportError(imagesError, {
          endpoint: "/api/submissions",
          clientIp,
          userId: user.id,
          toyId
        });
        // Continue even if image insertion fails - the main toy was created
      }
    }

    return NextResponse.json(
      {
        ok: true,
        id: toyId
      },
      {
        status: 200,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  } catch (error) {
    await reportError(error, {
      endpoint: "/api/submissions",
      clientIp
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
