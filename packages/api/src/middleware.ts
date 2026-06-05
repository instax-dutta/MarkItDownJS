import type { Context, Next } from "hono";

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: { windowMs?: number; max?: number } = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 100;

  return async (c: Context, next: Next): Promise<void | Response> => {
    const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > max) {
      return c.json({ error: "Too many requests" }, 429);
    }

    return next();
  };
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function validateFileSize(c: Context, next: Next): Promise<void | Response> {
  const contentLength = c.req.header("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
    return c.json({ error: "File too large. Maximum size is 50MB" }, 413);
  }
  return next();
}
