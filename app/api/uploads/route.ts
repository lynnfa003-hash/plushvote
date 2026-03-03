import { NextResponse } from "next/server";
import { reportError } from "@/lib/monitoring";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createServiceRoleSupabaseClient,
  getSupabaseAdminConfigError,
  isSupabaseAdminConfigured
} from "@/lib/supabase";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const BUCKET_NAME = "plush-images";
const MAX_FILES_PER_REQUEST = 5;

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function createRateLimitHeaders(remaining: number, retryAfterSeconds: number) {
  return {
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": String(remaining),
    "Retry-After": String(retryAfterSeconds)
  };
}

function sanitizeBaseName(filename: string) {
  const [rawName = "upload"] = filename.split(".");
  const sanitized = rawName.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "upload";
}

function extensionForType(contentType: string) {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

async function uploadSingleFile(file: File, supabase: ReturnType<typeof createServiceRoleSupabaseClient>) {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: `不支持的文件类型: ${file.name}` };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: `文件过大: ${file.name}` };
  }

  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}-${sanitizeBaseName(file.name)}.${extensionForType(file.type)}`;

  try {
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600"
    });

    if (uploadError) {
      return { success: false, error: `上传失败: ${file.name}` };
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

    return { success: true, path, imageUrl: data.publicUrl };
  } catch {
    return { success: false, error: `上传异常: ${file.name}` };
  }
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
      { error: getSupabaseAdminConfigError() ?? "服务器缺少上传配置。" },
      {
        status: 500,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "请求体格式不正确。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  const files = formData.getAll("files");

  if (files.length === 0) {
    return NextResponse.json(
      { error: "请上传图片文件。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `一次最多上传 ${MAX_FILES_PER_REQUEST} 张图片。` },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  const validFiles = files.filter((file): file is File => file instanceof File);

  if (validFiles.length === 0) {
    return NextResponse.json(
      { error: "请上传有效的图片文件。" },
      {
        status: 400,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  const supabase = createServiceRoleSupabaseClient();
  const results = await Promise.all(
    validFiles.map(file => uploadSingleFile(file, supabase))
  );

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (failed.length > 0 && successful.length === 0) {
    await reportError(new Error("All uploads failed"), {
      endpoint: "/api/uploads",
      clientIp,
      failedCount: failed.length
    });

    return NextResponse.json(
      { error: failed.map(f => f.error).join("；") },
      {
        status: 500,
        headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      images: successful.map(r => ({ path: r.path, url: r.imageUrl })),
      failed: failed.map(f => ({ error: f.error })),
      total: validFiles.length,
      successCount: successful.length,
      failedCount: failed.length
    },
    {
      status: 200,
      headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.retryAfterSeconds)
    }
  );
}
