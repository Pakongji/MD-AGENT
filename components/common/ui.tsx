"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAppStore } from "@/lib/store/app-store";

export function Button({ variant = "primary", className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "purple" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <section
    className={`card ${onClick ? "card-clickable" : ""} ${className}`}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } } : undefined}
  >{children}</section>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "red" | "orange" | "blue" | "green" | "purple" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="section-title"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

export function Metric({ label, value, delta, tone = "neutral" }: { label: string; value: string; delta?: string; tone?: "neutral" | "up" | "down" | "good" | "bad" }) {
  return <Card className="metric-card"><span className="metric-label">{label}</span><strong>{value}</strong>{delta && <span className={`metric-delta ${tone}`}>{delta}</span>}</Card>;
}

export function Modal({ open, title, children, onClose, width = "680px" }: { open: boolean; title: string; children: ReactNode; onClose: () => void; width?: string }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }}>
      <div className="modal-header"><h2>{title}</h2><button ref={closeRef} className="icon-button" onClick={onClose} aria-label="닫기"><X size={18} /></button></div>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}

export function DataBoundary({ children }: { children: ReactNode }) {
  const { loading, error, load } = useAppStore();
  if (loading) return <div className="state-box"><LoaderCircle className="spin" /><strong>업무 데이터를 불러오는 중입니다</strong><span>SQLite 데모 데이터를 확인하고 있어요.</span></div>;
  if (error) return <div className="state-box state-error"><strong>데이터를 불러오지 못했습니다</strong><span>{error}</span><Button onClick={() => void load()}>다시 시도</Button></div>;
  return <>{children}</>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><strong>{title}</strong><span>{description}</span></div>;
}

export function money(value: number) { return new Intl.NumberFormat("ko-KR").format(value); }
export function compactMoney(value: number) { return `${(value / 100000000).toFixed(1)}억원`; }
export function koDate(value: string) { return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(value)); }
