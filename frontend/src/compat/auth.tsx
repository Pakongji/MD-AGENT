import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authJson, safeReturnPath, signInResult } from "../auth-protocol";

type Session = { user?: { id?: string; name?: string | null; email?: string | null }; expires: string };
type SessionState = {
  data: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  update: () => Promise<void>;
};
const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const parent = useContext(SessionContext);
  return parent ? <>{children}</> : <SessionRoot>{children}</SessionRoot>;
}

function SessionRoot({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const update = useCallback(async () => {
    try {
      const session: Session | null = await authJson("/api/auth/session");
      setData(session?.user ? session : null);
      setStatus(session?.user ? "authenticated" : "unauthenticated");
      setError(null);
    } catch (failure) {
      setData(null);
      setError(failure instanceof Error ? failure.message : "로그인 상태를 확인하지 못했습니다.");
      setStatus("unauthenticated");
    }
  }, []);
  useEffect(() => {
    void update();
    const onFocus = () => { void update(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [update]);
  return <SessionContext.Provider value={{ data, status, error, update }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("SessionProvider is required");
  return session;
}

export async function signIn(provider: string, options: { email: string; password: string; redirect?: boolean; redirectTo?: string }) {
  if (provider !== "credentials") throw new Error("지원하지 않는 로그인 방식입니다.");
  const origin = window.location.origin;
  const callbackUrl = new URL(safeReturnPath(options.redirectTo, origin), origin).href;
  const { csrfToken } = await authJson("/api/auth/csrf");
  if (!csrfToken) throw new Error("로그인 보안 확인에 실패했습니다. 페이지를 새로고침해주세요.");
  const response = await fetch("/api/auth/callback/credentials", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ csrfToken, callbackUrl, email: options.email, password: options.password }),
  });
  const payload = await response.json().catch(() => null);
  if (typeof payload?.url !== "string") throw new Error(payload?.error || "로그인 서버에 연결하지 못했습니다.");
  const result = signInResult(payload.url, origin, response.status);
  if (options.redirect !== false && result.ok && result.url) window.location.assign(result.url);
  return result;
}

export async function signOut(options: { redirectTo?: string } = {}) {
  const { csrfToken } = await authJson("/api/auth/csrf");
  if (!csrfToken) throw new Error("로그아웃 보안 확인에 실패했습니다.");
  const path = safeReturnPath(options.redirectTo, window.location.origin, "/login");
  await authJson("/api/auth/signout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ csrfToken, callbackUrl: new URL(path, window.location.origin).href }),
  });
  window.location.assign(path);
}
