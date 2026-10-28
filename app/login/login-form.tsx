"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { KeyRound, LogIn, ShieldCheck, UserRoundPlus } from "lucide-react";

type LoginFormProps = { redirectTo: string; hasLoginError: boolean };

export function LoginForm({ redirectTo, hasLoginError }: LoginFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState(hasLoginError ? "이메일 또는 비밀번호를 확인해주세요." : "");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (mode === "register" && password !== confirmation) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "회원가입을 처리하지 못했습니다.");
      }

      const result = await signIn("credentials", { email, password, redirect: false, redirectTo });
      if (!result?.ok || !result.url) {
        setMessage("이메일 또는 비밀번호를 확인해주세요.");
        return;
      }
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setMessage("");
  }

  const isRegister = mode === "register";

  return (
    <main className="login-page">
      <section className="login-story" aria-label="MD AI Agent 소개">
        <div className="login-brand"><span className="login-brand-mark">MD</span><span>MD AI Agent</span></div>
        <div className="login-story-copy">
          <span className="login-kicker">MERCHANDISING WORKSPACE</span>
          <h1>데이터에서<br />다음 행동까지.</h1>
          <p>매출과 재고, 시장의 신호를 한곳에서 보고<br className="desktop-break" /> 판단과 실행으로 이어가세요.</p>
        </div>
        <div className="login-story-footer"><span className="login-status-dot" /> 업무 데이터 워크스페이스</div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <div className="login-mobile-brand"><span className="login-brand-mark">MD</span><span>MD AI Agent</span></div>
          <span className="login-kicker login-kicker-light">ACCOUNT ACCESS</span>
          <h2 id="login-title">{isRegister ? "계정 만들기" : "로그인"}</h2>
          <p className="login-intro">{isRegister ? "이메일로 계정을 만들고 업무 공간을 시작하세요." : "등록한 이메일과 비밀번호로 접속하세요."}</p>

          <div className="login-tabs" role="tablist" aria-label="계정 메뉴">
            <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? "active" : ""} onClick={() => changeMode("login")}><LogIn size={14} /> 로그인</button>
            <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? "active" : ""} onClick={() => changeMode("register")}><UserRoundPlus size={14} /> 회원가입</button>
          </div>

          <form className="login-fields" onSubmit={(event) => void submit(event)}>
            {isRegister && <label className="login-field">이름<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required /></label>}
            <label className="login-field">이메일<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label>
            <label className="login-field">비밀번호<input type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={isRegister ? 10 : 1} maxLength={128} required /><span>{isRegister ? "10자 이상 입력하세요." : ""}</span></label>
            {isRegister && <label className="login-field">비밀번호 확인<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={10} maxLength={128} required /></label>}

            {message && <div className="login-alert" role="alert">{message}</div>}

            <button className="account-submit-button" type="submit" disabled={busy}>
              {isRegister ? <UserRoundPlus size={17} /> : <KeyRound size={17} />}
              <span>{busy ? "처리 중..." : isRegister ? "계정 만들기" : "로그인"}</span>
            </button>
          </form>

          <div className="login-security-note"><ShieldCheck size={15} /><span>비밀번호는 암호화해 저장하며 원문을 보관하지 않습니다.</span></div>
          <p className="login-privacy">가입한 계정은 현재 MD AI Agent 워크스페이스 데이터를 함께 사용합니다.</p>
        </div>
        <footer className="login-footer">MD AI Agent <span>·</span> Secure workspace</footer>
      </section>
    </main>
  );
}