export function safeReturnPath(value: string | null | undefined, origin: string, fallback = "/") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, origin);
    return url.origin === origin ? url.pathname + url.search + url.hash : fallback;
  } catch { return fallback; }
}

export async function authJson(path: string, init: RequestInit = {}) {
  const response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store" });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error("서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요."); }
  if (!response.ok) {
    throw new Error(payload?.error || "서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  return payload;
}

export function signInResult(url: string, origin: string, status: number) {
  const target = new URL(url, origin);
  if (target.origin !== origin) throw new Error("로그인 연결 주소가 일치하지 않습니다. 서비스 관리자에게 문의해주세요.");
  const error = target.searchParams.get("error") || undefined;
  const code = target.searchParams.get("code") || undefined;
  return { ok: status < 400 && !error, status, error, code, url: error ? null : target.href };
}
