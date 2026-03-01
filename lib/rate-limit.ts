const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

type RateLimitEntry = {
  count: number;
  windowStartAt: number;
};

const ipRequestMap = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries(now: number) {
  for (const [ip, entry] of ipRequestMap.entries()) {
    if (now - entry.windowStartAt >= RATE_LIMIT_WINDOW_MS * 2) {
      ipRequestMap.delete(ip);
    }
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function checkRateLimit(ip: string) {
  const now = Date.now();
  const existing = ipRequestMap.get(ip);

  if (!existing || now - existing.windowStartAt >= RATE_LIMIT_WINDOW_MS) {
    ipRequestMap.set(ip, {
      count: 1,
      windowStartAt: now
    });

    cleanupExpiredEntries(now);

    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
    };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - existing.windowStartAt)) / 1000)
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    remaining: Math.max(MAX_REQUESTS_PER_WINDOW - existing.count, 0),
    retryAfterSeconds: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - existing.windowStartAt)) / 1000)
  };
}
