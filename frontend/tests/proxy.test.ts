import { test } from "node:test";
import assert from "node:assert/strict";
import { proxyApi } from "../public/_worker.js";

const origin = "https://md-agent.pages.dev";
const env = { BACKEND_ORIGIN: "https://backend.example.com", ASSETS: { fetch: async () => new Response("asset") } };

test("an unconfigured deployment keeps API responses JSON and does not call upstream", async () => {
  const response = await proxyApi(new Request(origin + "/api/auth/session"), {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "BACKEND_NOT_CONFIGURED");
});

test("reject insecure, credential-bearing, path-bearing and looping upstream origins", async () => {
  for (const value of ["http://backend.example.com", "https://user:password@backend.example.com", "https://backend.example.com/path", "https://backend.example.com/?key=x", origin]) {
    const response = await proxyApi(new Request(origin + "/api/health"), { ...env, BACKEND_ORIGIN: value });
    assert.equal(response.status, 503, value);
  }
});

test("proxy preserves query, status, download bytes and distinct cookies, and prevents caching", async () => {
  let seen: Request | undefined;
  const response = await proxyApi(new Request(origin + "/api/worklog?period=weekly&format=xlsx", {
    headers: { Cookie: "session=test", "X-Forwarded-Host": "evil.example", "X-Forwarded-For": "spoofed" },
  }), env, async (request: Request, init: RequestInit = {}) => {
    seen = request;
    assert.equal(init.redirect, "manual");
    const headers = new Headers({ "Content-Disposition": "attachment; filename=report.xlsx", "CDN-Cache-Control": "public" });
    headers.append("Set-Cookie", "first=one; HttpOnly; Secure");
    headers.append("Set-Cookie", "second=two; HttpOnly; Secure");
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers });
  });
  assert.equal(seen!.url, "https://backend.example.com/api/worklog?period=weekly&format=xlsx");
  assert.equal(seen!.headers.get("Cookie"), "session=test");
  assert.equal(seen!.headers.get("X-Forwarded-Host"), "md-agent.pages.dev");
  assert.equal(seen!.headers.get("X-Forwarded-Proto"), "https");
  assert.equal(seen!.headers.get("X-Forwarded-For"), null);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("CDN-Cache-Control"), null);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.match(response.headers.get("Content-Disposition")!, /report.xlsx/);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
});

test("cross-site writes never reach the authenticated backend", async () => {
  for (const headers of [new Headers(), new Headers({ Origin: "https://evil.example" })]) {
    const response = await proxyApi(new Request(origin + "/api/command", { method: "POST", headers, body: "{}" }), env);
    assert.equal(response.status, 403);
  }
});

test("same-origin POST streams the original body and upstream errors are preserved", async () => {
  const response = await proxyApi(new Request(origin + "/api/command", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: '{"type":"ADD_TASK"}',
  }), env, async (request: Request) => {
    assert.equal(request.method, "POST");
    assert.deepEqual(await request.json(), { type: "ADD_TASK" });
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "로그인이 필요합니다.");
});

test("upstream redirect locations stay on the Pages host", async () => {
  const response = await proxyApi(new Request(origin + "/api/auth/signout"), env,
    async () => new Response(null, { status: 302, headers: { Location: "https://backend.example.com/login?done=1" } }));
  assert.equal(response.headers.get("Location"), origin + "/login?done=1");
});

test("connection failures give a safe JSON error instead of upstream details", async () => {
  const response = await proxyApi(new Request(origin + "/api/bootstrap"), env, async () => { throw new Error("private connection detail"); });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private connection detail/);
});

test("non-API routes are delegated to static assets", async () => {
  assert.equal(await (await proxyApi(new Request(origin + "/login"), env)).text(), "asset");
});
