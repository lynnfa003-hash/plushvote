type ErrorContext = Record<string, unknown>;

type ParsedSentryDsn = {
  dsn: string;
  envelopeUrl: string;
};

const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "";

function parseSentryDsn(dsn: string): ParsedSentryDsn | null {
  try {
    const url = new URL(dsn);
    if (!url.username) {
      return null;
    }

    const path = url.pathname.replace(/^\/+/, "");
    if (!path) {
      return null;
    }

    const parts = path.split("/");
    const projectId = parts.pop();

    if (!projectId) {
      return null;
    }

    const prefix = parts.length > 0 ? `/${parts.join("/")}` : "";
    const envelopeUrl = `${url.protocol}//${url.host}${prefix}/api/${projectId}/envelope/`;

    return {
      dsn,
      envelopeUrl
    };
  } catch {
    return null;
  }
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error("Unknown error");
}

async function sendToSentry(error: Error, context: ErrorContext) {
  const parsed = parseSentryDsn(sentryDsn);
  if (!parsed) {
    return;
  }

  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    level: "error",
    platform: "javascript",
    message: error.message,
    exception: {
      values: [
        {
          type: error.name,
          value: error.message,
          stacktrace: error.stack
            ? {
                frames: error.stack.split("\n").map((line) => ({
                  filename: "unknown",
                  function: line.trim(),
                  in_app: true
                }))
              }
            : undefined
        }
      ]
    },
    extra: context
  };

  const envelope = `${JSON.stringify({ dsn: parsed.dsn, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;

  try {
    await fetch(parsed.envelopeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope"
      },
      body: envelope
    });
  } catch (sendError) {
    console.error("[monitoring] Failed to send event to Sentry", sendError);
  }
}

export async function reportError(error: unknown, context: ErrorContext = {}) {
  const normalizedError = normalizeError(error);

  console.error("[plushvote]", normalizedError.message, {
    stack: normalizedError.stack,
    ...context
  });

  if (!sentryDsn) {
    return;
  }

  await sendToSentry(normalizedError, context);
}
