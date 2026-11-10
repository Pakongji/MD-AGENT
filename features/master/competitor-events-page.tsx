"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, DataBoundary, EmptyState, Modal, SectionTitle, money } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { hasPermission } from "@/lib/auth/permissions";
import { eventPhase, rankCompetitorEvents } from "@/lib/services/competitor";
import type { CompetitorEventItem } from "@/lib/types/domain";

const TYPES = ["할인", "가격", "신상품", "프로모션", "기타"] as const;
type Form = { id?: string; competitorName: string; eventType: (typeof TYPES)[number]; title: string; detail: string; overlapDescription: string; startDate: string; endDate: string; affectedSkuCount: string; impactManwon: string };
const ymd = (value: string) => new Date(Date.parse(value) + 9 * 3_600_000).toISOString().slice(0, 10);
const md = (value: string) => { const day = ymd(value); return `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`; };

/** 관리 > 데이터 등록 > 경쟁사 변화: 경쟁사 행사·가격·신상품을 등록하면 홈 카드와 시장·경쟁 대응안에 반영됩니다. */
export function CompetitorEventsPage() {
  const { data, command, busy } = useAppStore();
  const canEdit = hasPermission(data.meta.viewer, "master");
  const now = Date.parse(data.meta.lastUpdated) || 0;
  const events = rankCompetitorEvents(data.competitorEvents, now);
  const competitorNames = [...new Set(data.competitorEvents.map((event) => event.competitor.name))];
  const [form, setForm] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState<CompetitorEventItem | null>(null);
  const [error, setError] = useState("");
  const [todayKst] = useState(() => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10));

  function edit(event?: CompetitorEventItem) {
    setError("");
    setForm(event
      ? { id: event.id, competitorName: event.competitor.name, eventType: (TYPES as readonly string[]).includes(event.type) ? event.type as Form["eventType"] : "기타", title: event.title, detail: event.detail, overlapDescription: event.overlapDescription, startDate: ymd(event.startAt), endDate: ymd(event.endAt), affectedSkuCount: event.affectedSkuCount ? String(event.affectedSkuCount) : "", impactManwon: event.impactEstimate ? String(Math.round(Math.abs(event.impactEstimate) / 10000)) : "" }
      : { competitorName: "", eventType: "할인", title: "", detail: "", overlapDescription: "", startDate: todayKst, endDate: todayKst, affectedSkuCount: "", impactManwon: "" });
  }

  async function save() {
    if (!form) return;
    if (!form.competitorName.trim() || form.title.trim().length < 2) return setError("경쟁사와 변화 내용(제목)을 입력해주세요.");
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) return setError("기간을 확인해주세요. 종료일은 시작일 이후여야 해요.");
    const ok = await command({
      type: "SAVE_COMPETITOR_EVENT", id: form.id, competitorName: form.competitorName, eventType: form.eventType, title: form.title, detail: form.detail, overlapDescription: form.overlapDescription,
      startDate: form.startDate, endDate: form.endDate, affectedSkuCount: form.affectedSkuCount ? Number(form.affectedSkuCount) : null, impactEstimate: form.impactManwon ? Number(form.impactManwon) * 10000 : null,
    });
    if (ok) setForm(null);
  }
  const set = (key: keyof Form, value: string) => setForm((current) => (current ? { ...current, [key]: value } : current));

  return <DataBoundary><div className="stack">
    {!canEdit && <p className="md-readonly"><Lock size={13} /> 보기만 가능해요. 등록·수정하려면 관리자에게 ‘데이터 등록’ 권한을 요청하세요.</p>}
    <Card>
      <SectionTitle title="경쟁사 변화" description="경쟁사 할인·가격 변경·신상품·행사를 등록하면 홈 ‘오늘 결정할 3가지’와 시장·경쟁의 대응안·결과 확인에 반영돼요. 진행 중 → 예정 → 최근 종료 순으로 보여줍니다." action={<Button disabled={!canEdit} onClick={() => edit()}><Plus size={13} /> 경쟁사 변화 등록</Button>} />
      {events.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>상태</th><th>경쟁사 · 변화</th><th>유형</th><th>기간</th><th>겹치는 자사 상품·행사</th><th>예상 영향</th><th /></tr></thead><tbody>
        {events.map((event) => { const phase = eventPhase(event, now); return <tr key={event.id}>
          <td><Badge tone={phase === "active" ? "red" : phase === "upcoming" ? "orange" : "neutral"}>{phase === "active" ? "진행 중" : phase === "upcoming" ? "예정" : "종료"}</Badge></td>
          <td><Link className="rd-link-strong" href={`/market?tab=overview&focus=${phase === "ended" ? "result" : "competitor"}&event=${event.id}`}>{event.title}</Link><div className="tiny">{event.competitor.name}{event.detail ? ` · ${event.detail}` : ""}</div></td>
          <td>{event.type}</td><td>{md(event.startAt)} ~ {md(event.endAt)}</td><td>{event.overlapDescription || <span className="rd-muted">—</span>}</td>
          <td>{event.impactEstimate ? `주 -${money(Math.round(Math.abs(event.impactEstimate) / 10000))}만원` : <span className="rd-muted">미입력</span>}{event.affectedSkuCount ? <div className="tiny">영향 상품 {event.affectedSkuCount}개</div> : null}</td>
          <td className="md-row-actions"><button className="icon-button" disabled={!canEdit} onClick={() => edit(event)} aria-label={`${event.title} 수정`}><Pencil size={14} /></button><button className="icon-button" disabled={!canEdit} onClick={() => setDeleting(event)} aria-label={`${event.title} 삭제`}><Trash2 size={14} /></button></td>
        </tr>; })}
      </tbody></table></div> : <EmptyState title="등록된 경쟁사 변화가 없어요" description="경쟁사 할인·행사를 발견하면 등록하세요. 홈과 시장·경쟁 화면에 대응안이 생깁니다." />}
    </Card>

    <Modal open={Boolean(form)} title={form?.id ? "경쟁사 변화 수정" : "경쟁사 변화 등록"} onClose={() => setForm(null)} width="640px">{form && <>
      <div className="form-grid">
        <div className="field"><label htmlFor="ce-competitor">경쟁사 *</label><input id="ce-competitor" list="ce-competitors" value={form.competitorName} onChange={(event) => set("competitorName", event.target.value)} placeholder="예: B사" /><datalist id="ce-competitors">{competitorNames.map((name) => <option key={name} value={name} />)}</datalist></div>
        <div className="field"><label htmlFor="ce-type">유형</label><select id="ce-type" value={form.eventType} onChange={(event) => set("eventType", event.target.value)}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
      </div>
      <div className="field" style={{ marginTop: 10 }}><label htmlFor="ce-title">변화 내용 *</label><input id="ce-title" value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="예: B사 립 전 상품 20% 할인" /></div>
      <div className="field" style={{ marginTop: 10 }}><label htmlFor="ce-detail">근거 · 상세</label><input id="ce-detail" value={form.detail} onChange={(event) => set("detail", event.target.value)} placeholder="예: 회원 쿠폰 포함 시 대표 틴트 실구매가 15,900원 (올리브영)" /></div>
      <div className="form-grid" style={{ marginTop: 10 }}>
        <div className="field"><label htmlFor="ce-start">시작일 *</label><input id="ce-start" type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} /></div>
        <div className="field"><label htmlFor="ce-end">종료일 *</label><input id="ce-end" type="date" value={form.endDate} min={form.startDate} onChange={(event) => set("endDate", event.target.value)} /></div>
        <div className="field"><label htmlFor="ce-overlap">겹치는 자사 상품·행사</label><input id="ce-overlap" value={form.overlapDescription} onChange={(event) => set("overlapDescription", event.target.value)} placeholder="예: 자사 립 기획전과 4일 겹침" /></div>
        <div className="field"><label htmlFor="ce-sku">영향 받는 자사 상품 수</label><input id="ce-sku" type="number" min={0} value={form.affectedSkuCount} onChange={(event) => set("affectedSkuCount", event.target.value)} /></div>
        <div className="field"><label htmlFor="ce-impact">예상 주 매출 영향(만원, 추정)</label><input id="ce-impact" type="number" min={0} value={form.impactManwon} onChange={(event) => set("impactManwon", event.target.value)} placeholder="모르면 비워두세요" /></div>
      </div>
      <p className="pd-data-note">진행 중이거나 2주 안에 시작하는 변화는 홈 카드에 ‘대응안 보기’로, 끝난 변화는 ‘결과 확인’(행사 전·중·후 매출 비교)으로 나와요.</p>
      {error && <p className="decision-error" role="alert">{error}</p>}
      <div className="modal-actions"><Button variant="secondary" onClick={() => setForm(null)}>취소</Button><Button disabled={busy} onClick={() => void save()}>저장</Button></div>
    </>}</Modal>

    <Modal open={Boolean(deleting)} title="경쟁사 변화 삭제" onClose={() => setDeleting(null)} width="460px">{deleting && <>
      <p>‘{deleting.title}’을(를) 삭제할까요? 이미 만든 대응 업무와 결정 기록은 그대로 남습니다.</p>
      <div className="modal-actions"><Button variant="secondary" onClick={() => setDeleting(null)}>취소</Button><Button variant="danger" disabled={busy} onClick={async () => { if (await command({ type: "DELETE_COMPETITOR_EVENT", id: deleting.id })) setDeleting(null); }}>삭제</Button></div>
    </>}</Modal>
  </div></DataBoundary>;
}
