// Pages runtime only: this file is never imported into the browser bundle.
function jsonError(message, code, status) {
  return Response.json({ error: message, code }, { status, headers: { "Cache-Control": "private, no-store" } });
}

/**
 * @param {Request} request
 * @param {{ BACKEND_ORIGIN?: string, ASSETS?: { fetch(request: Request): Promise<Response> } }} env
 * @param {(request: Request, init?: RequestInit) => Promise<Response>} fetcher
 */
export async function proxyApi(request, env, fetcher = fetch) {
  const page = new URL(request.url);
  const isApi = page.pathname === "/api" || page.pathname.startsWith("/api/");
  if (!isApi) return env.ASSETS.fetch(request);

  // Preserve same-origin cookie auth; reject cross-site state-changing requests.
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.headers.get("Origin") !== page.origin) {
    return jsonError("허용되지 않은 요청입니다.", "ORIGIN_NOT_ALLOWED", 403);
  }

  let backend;
  try {
    backend = new URL(env.BACKEND_ORIGIN);
    if (backend.protocol !== "https:" || backend.username || backend.password || backend.pathname !== "/" || backend.search || backend.hash || backend.origin === page.origin) throw new Error();
  } catch {
    return jsonError("백엔드 연결이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.", "BACKEND_NOT_CONFIGURED", 503);
  }

  // Only /api goes upstream; the destination is server configuration, never user input.
  const target = new URL(page.pathname + page.search, backend.origin);
  const upstreamRequest = new Request(target, request);
  for (const header of ["host", "forwarded", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-for", "connection"]) upstreamRequest.headers.delete(header);
  upstreamRequest.headers.set("X-Forwarded-Host", page.host);
  upstreamRequest.headers.set("X-Forwarded-Proto", "https");
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) upstreamRequest.headers.set("X-Forwarded-For", clientIp);

  try {
    const upstream = await fetcher(upstreamRequest, { redirect: "manual" });
    const headers = new Headers(upstream.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.delete("CDN-Cache-Control");
    headers.delete("Cloudflare-CDN-Cache-Control");
    const location = headers.get("Location");
    if (location) {
      const redirect = new URL(location, backend.origin);
      if (redirect.origin === backend.origin) headers.set("Location", page.origin + redirect.pathname + redirect.search + redirect.hash);
    }
    // Keep Set-Cookie, file download headers and the streaming response intact.
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  } catch {
    return jsonError("백엔드 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.", "BACKEND_UNAVAILABLE", 502);
  }
}

export default { fetch: proxyApi };
