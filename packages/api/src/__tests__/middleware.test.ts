import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { rateLimit, validateFileSize } from "../middleware.js";

describe("rateLimit", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const app = new Hono();
    app.use("/x", rateLimit({ max: 2, windowMs: 60_000 }));
    app.get("/x", (c) => c.json({ ok: true }));

    const req = (ip: string) => app.request("/x", { headers: { "x-forwarded-for": ip } });

    expect((await req("10.0.0.1")).status).toBe(200);
    expect((await req("10.0.0.1")).status).toBe(200);
    expect((await req("10.0.0.1")).status).toBe(429);
  });

  it("tracks different IPs independently", async () => {
    const app = new Hono();
    app.use("/x", rateLimit({ max: 1, windowMs: 60_000 }));
    app.get("/x", (c) => c.json({ ok: true }));

    const req = (ip: string) => app.request("/x", { headers: { "x-forwarded-for": ip } });

    expect((await req("10.0.0.2")).status).toBe(200);
    expect((await req("10.0.0.3")).status).toBe(200);
    expect((await req("10.0.0.2")).status).toBe(429);
  });
});

describe("validateFileSize", () => {
  it("rejects requests over the maximum file size", async () => {
    const app = new Hono();
    app.use("/x", validateFileSize);
    app.get("/x", (c) => c.json({ ok: true }));

    const res = await app.request("/x", {
      headers: { "content-length": String(51 * 1024 * 1024) },
    });
    expect(res.status).toBe(413);
  });

  it("allows requests under the maximum file size", async () => {
    const app = new Hono();
    app.use("/x", validateFileSize);
    app.get("/x", (c) => c.json({ ok: true }));

    const res = await app.request("/x", {
      headers: { "content-length": String(1024) },
    });
    expect(res.status).toBe(200);
  });
});
