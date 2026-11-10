import { Component, Suspense, lazy, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { LoginForm } from "@/app/login/login-form";
import { SessionProvider, useSession } from "./compat/auth";
import { safeReturnPath } from "./auth-protocol";
import { legacyRedirect } from "./routes";
import "../../app/globals.css";
import "./pages.css";

const Home = lazy(() => import("@/features/home/home-page").then((module) => ({ default: module.HomePage })));
const Tasks = lazy(() => import("./pages/tasks"));
const Sales = lazy(() => import("./pages/sales"));
const Market = lazy(() => import("./pages/market"));
const Promotions = lazy(() => import("./pages/promotions"));
const Records = lazy(() => import("./pages/records"));
const Registry = lazy(() => import("./pages/registry"));
const Data = lazy(() => import("@/features/data/data-connections").then((module) => ({ default: module.DataConnections })));

function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return <main className="pages-notice"><h1>{title}</h1>{children}</main>;
}

function Login() {
  const session = useSession();
  const [params] = useSearchParams();
  const redirectTo = safeReturnPath(params.get("callbackUrl"), window.location.origin);
  if (session.status === "authenticated") return <Navigate replace to={redirectTo === "/login" ? "/" : redirectTo} />;
  return <>
    {session.error && <div className="pages-connection-alert" role="alert">{session.error}<button type="button" onClick={() => void session.update()}>다시 연결</button></div>}
    <LoginForm redirectTo={redirectTo} hasLoginError={Boolean(params.get("error"))} />
  </>;
}

function Workspace() {
  const session = useSession();
  const location = useLocation();
  const redirect = legacyRedirect(location.pathname, new URLSearchParams(location.search));
  if (redirect) return <Navigate replace to={redirect} />;
  if (session.status === "loading") return <Notice title="로그인 상태를 확인하고 있습니다." />;
  if (!session.data) return <Navigate replace to={"/login?callbackUrl=" + encodeURIComponent(location.pathname + location.search)} />;
  return <AppShell><Suspense fallback={<Notice title="화면을 불러오고 있습니다." />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/market" element={<Market />} />
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/records" element={<Records />} />
      <Route path="/registry" element={<Registry />} />
      <Route path="/data" element={<Data />} />
      <Route path="*" element={<Notice title="페이지를 찾을 수 없습니다."><Link to="/">홈으로 이동</Link></Notice>} />
    </Routes>
  </Suspense></AppShell>;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <Notice title="화면을 불러오지 못했습니다."><p>새로고침한 뒤 다시 시도해주세요.</p><button onClick={() => window.location.reload()}>새로고침</button></Notice> : this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary><BrowserRouter><SessionProvider><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="*" element={<Workspace />} />
  </Routes></SessionProvider></BrowserRouter></AppErrorBoundary>,
);
