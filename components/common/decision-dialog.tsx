"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardCheck, History, Lightbulb } from "lucide-react";
import { Badge, Button, Modal } from "./ui";
import { useAppStore, type DecisionTarget } from "@/lib/store/app-store";
import { lastRejected, latestConfirmed, outcomeLabels, pendingApproval, validateDecision } from "@/lib/decisions/shared";
import { hasPermission } from "@/lib/auth/permissions";
import type { DecisionOutcome, TaskDecisionItem } from "@/lib/types/domain";

function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export function DecisionDialog() {
  const target = useAppStore((state) => state.decisionTarget);
  return target ? <DecisionDialogContent key={target.nonce} target={target} /> : null;
}

function DecisionDialogContent({ target }: { target: DecisionTarget }) {
  const { data, busy, command, closeDecision, openPurchaseOrder } = useAppStore();
  const task = target.taskId ? data.tasks.find((item) => item.id === target.taskId)
    : data.tasks.find((item) => item.inventoryId === target.inventoryId && item.requiresDecision);
  const inventory = data.inventory.find((item) => item.id === (task?.inventoryId ?? target.inventoryId));
  const records = task?.decisions ?? [];
  const confirmed = task ? latestConfirmed(task) : undefined;
  const ownDraft = records.find((item) => item.status === "DRAFT" && item.authorId === data.meta.viewerId);
  const pending = task ? pendingApproval(task) : undefined;
  const rejected = task ? lastRejected(task) : undefined;
  const canApprove = hasPermission(data.meta.viewer, "approve");
  // 승인할 다른 사람이 있을 때만 승인 요청으로 올라갑니다(서버와 같은 규칙).
  const needsApproval = !canApprove && data.members.some((member) => member.active && member.id !== data.meta.viewerId && member.permissions.includes("approve"));
  const [approvalComment, setApprovalComment] = useState("");
  const selected = target.selectedId ? records.find((item) => item.id === target.selectedId)
    : target.startNew || (target.outcome && confirmed && (confirmed.outcome !== target.outcome || (target.quantity && target.quantity !== confirmed.quantity))) ? undefined : ownDraft ?? pending ?? confirmed ?? rejected;
  const [viewingId, setViewingId] = useState(selected?.status === "CONFIRMED" || (selected && selected.authorId !== data.meta.viewerId) ? selected.id : null);
  const initialForm = (record?: TaskDecisionItem) => ({
    id: record?.id ?? crypto.randomUUID(), outcome: record?.outcome ?? target.outcome ?? "PROCEED" as DecisionOutcome,
    content: record?.content ?? target.suggestedContent ?? "", rationale: record?.rationale ?? "", alternatives: record?.alternatives ?? target.contextNote ?? "",
    followUp: record?.followUp ?? "", reviewAt: localDate(record?.reviewAt),
    quantity: String(record?.quantity ?? target.quantity ?? inventory?.recommendedOrderQty ?? ""),
  });
  const [form, setForm] = useState(() => initialForm(selected));
  const [error, setError] = useState("");
  // 발주 등록 시 입고 예정일: 기본은 오늘 + 리드타임(KST), 공급사와 합의한 납기가 있으면 고쳐서 등록합니다.
  const [todayKst] = useState(() => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10));
  const [arrival, setArrival] = useState(() => inventory ? new Date(Date.now() + 9 * 3600000 + inventory.leadTimeDays * 86400000).toISOString().slice(0, 10) : "");
  const record = records.find((item) => item.id === viewingId);
  const readOnly = Boolean(record);
  const title = task?.title ?? `${inventory?.product?.name ?? "상품"} 발주 여부 결정`;
  const evidence = record?.evidence;
  const stock = evidence?.inventory ?? (inventory ? { ...inventory, productName: inventory.product?.name ?? "상품" } : undefined);

  // 발주 등록 직후 바로 거래처 발주서 창으로 이어갑니다.
  async function registerOrder(quantity: number, decisionId: string) {
    if (!inventory) return;
    if (!await command({ type: "CREATE_ORDER", inventoryId: inventory.id, quantity, decisionId, expectedArrival: arrival })) return;
    const po = useAppStore.getState().data.inventory.find((item) => item.id === inventory.id)?.purchaseOrders?.[0];
    closeDecision();
    if (po) openPurchaseOrder(po.id);
  }
  const openPo = inventory?.purchaseOrders?.find((po) => po.status !== "입고 완료" && po.status !== "취소");

  function edit<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value })); setError("");
  }
  async function save(status: "DRAFT" | "CONFIRMED") {
    const value = {
      ...form, quantity: form.quantity ? Number(form.quantity) : null,
      reviewAt: form.reviewAt ? new Date(form.reviewAt).toISOString() : null,
    };
    const validation = status === "CONFIRMED" ? validateDecision(value, Boolean(inventory)) : null;
    if (validation) {
      setError(validation);
      document.getElementById(!form.content.trim() ? "decision-content" : !form.rationale.trim() ? "decision-rationale" : form.outcome === "HOLD" ? "decision-review" : "decision-quantity")?.focus();
      return;
    }
    const ok = await command({ type: "SAVE_DECISION", ...value, status, taskId: task?.id, inventoryId: inventory?.id });
    if (ok && status === "CONFIRMED") setViewingId(form.id);
  }
  function selectHistory(item: TaskDecisionItem) {
    if (item.status === "DRAFT" && item.authorId === data.meta.viewerId) { setForm(initialForm(item)); setViewingId(null); }
    else setViewingId(item.id);
    setError("");
  }

  return <Modal open title="업무 의사결정" onClose={() => { if (!busy) closeDecision(); }} width="940px">
    <div className="decision-heading"><span className="decision-icon"><ClipboardCheck size={21} /></span><div><span className="eyebrow">의사결정 기록</span><h3>{title}</h3><p>어떤 결정을 했는지, 왜 그렇게 판단했는지 업무와 함께 남깁니다.</p></div><Badge tone={record?.approvalStatus === "PENDING" ? "orange" : record?.approvalStatus === "REJECTED" ? "red" : record?.status === "CONFIRMED" ? "green" : "purple"}>{record?.approvalStatus === "PENDING" ? "승인 대기" : record?.approvalStatus === "REJECTED" ? "반려됨" : record?.status === "CONFIRMED" ? "결정 확정됨" : "검토 중"}</Badge></div>
    {record?.approvalStatus === "PENDING" && <div className="decision-approval is-pending">
      <div><strong>팀장 승인 대기</strong><span>{record.authorName}님이 {record.confirmedAt ? dateLabel(record.confirmedAt) : ""}에 승인을 요청했어요. 승인되면 업무가 완료되고{inventory && record.outcome === "PROCEED" ? " 발주를 등록할 수 있어요" : " 결정이 기록돼요"}.</span></div>
      {canApprove && record.authorId !== data.meta.viewerId && <div className="decision-approval-actions">
        <textarea value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} placeholder="코멘트 (반려할 때는 사유 필수)" aria-label="승인 코멘트" maxLength={1000} />
        <div><Button variant="danger" disabled={busy || approvalComment.trim().length < 2} onClick={() => void command({ type: "REJECT_DECISION", decisionId: record.id, comment: approvalComment })}>반려</Button><Button disabled={busy} onClick={() => void command({ type: "APPROVE_DECISION", decisionId: record.id, comment: approvalComment })}>승인</Button></div>
      </div>}
      {!canApprove && <small className="rd-muted">승인 권한이 있는 사람이 확인할 때까지 기다려주세요.</small>}
    </div>}
    {record?.approvalStatus === "REJECTED" && <div className="decision-approval is-rejected"><div><strong>반려됨 · {record.approverName}</strong><span>사유: {record.approvalComment || "사유 없음"}</span><small className="rd-muted">사유를 반영해 ‘새 결정 작성’으로 다시 올려주세요.</small></div></div>}
    {record?.approvalStatus === "APPROVED" && <div className="decision-approval is-approved"><div><strong>승인됨 · {record.approverName}</strong><span>{record.approvalAt ? dateLabel(record.approvalAt) : ""}{record.approvalComment ? ` · ${record.approvalComment}` : ""}</span></div></div>}
    {!readOnly && needsApproval && <div className="decision-notice">‘결정 확정’ 대신 <strong>승인 요청</strong>으로 올라갑니다. 팀장이 승인하면 업무가 완료되고 발주 등록이 열립니다.</div>}
    {task?.status === "완료" && !confirmed && <div className="decision-notice">이 업무는 완료됐지만 결정 기록이 없습니다. 당시 결정을 직접 확인해 보완해주세요.</div>}
    {target.contextNote && !readOnly && <div className="decision-notice">상품 진단의 계산 기준과 가정을 ‘검토한 대안’에 첨부했습니다. 가정과 실제 납기를 확인하고 판단 근거를 직접 입력해주세요.</div>}
    <div className="decision-layout">
      <div className="decision-fields">
        <div className="field"><label>결정 방향</label><div className="decision-choices">{(Object.keys(outcomeLabels) as DecisionOutcome[]).map((outcome) => <button type="button" key={outcome} aria-pressed={(record?.outcome ?? form.outcome) === outcome} disabled={readOnly || busy} onClick={() => edit("outcome", outcome)}>{outcomeLabels[outcome]}</button>)}</div></div>
        <div className="field"><label htmlFor="decision-content">결정 내용 <span className="red">*</span></label><textarea id="decision-content" value={record?.content ?? form.content} readOnly={readOnly} onChange={(event) => edit("content", event.target.value)} maxLength={2000} placeholder={inventory ? "예: A 립밤 1,200개를 추가 발주하기로 결정" : "예: 행사 대상 상품을 8개 SKU로 확정"} /></div>
        <div className="field"><label htmlFor="decision-rationale">판단 근거 <span className="red">*</span></label><textarea id="decision-rationale" value={record?.rationale ?? form.rationale} readOnly={readOnly} onChange={(event) => edit("rationale", event.target.value)} maxLength={4000} placeholder="검토 자료와 대안을 비교해 이 결정을 선택한 이유를 적어주세요." /></div>
        {inventory && (record?.outcome ?? form.outcome) === "PROCEED" && <div className="field"><label htmlFor="decision-quantity">발주 결정 수량 <span className="red">*</span></label><input id="decision-quantity" type="number" min={1} max={10000000} value={record ? record.quantity ?? "" : form.quantity} readOnly={readOnly} onChange={(event) => edit("quantity", event.target.value)} /></div>}
        {(record?.outcome ?? form.outcome) === "HOLD" && <div className="field"><label htmlFor="decision-review">재검토 일시 <span className="red">*</span></label><input id="decision-review" type="datetime-local" value={record ? localDate(record.reviewAt) : form.reviewAt} readOnly={readOnly} onChange={(event) => edit("reviewAt", event.target.value)} /><small>확정하면 재검토 일정이 캘린더에 등록됩니다.</small></div>}
        <details className="decision-extra" open={readOnly || Boolean(target.contextNote) || undefined}><summary>검토한 대안 · 후속 업무 (선택)</summary><div className="field"><label htmlFor="decision-alternatives">검토한 대안</label><textarea id="decision-alternatives" value={record?.alternatives ?? form.alternatives} readOnly={readOnly} maxLength={2000} onChange={(event) => edit("alternatives", event.target.value)} placeholder="예: 소량 발주, 공급사 긴급 출고, 발주 보류" /></div><div className="field"><label htmlFor="decision-followup">후속 업무</label><input id="decision-followup" value={record?.followUp ?? form.followUp} readOnly={readOnly} maxLength={1000} onChange={(event) => edit("followUp", event.target.value)} placeholder="입력하면 확정 시 업무로 추가됩니다." /></div></details>
      </div>
      <aside className="decision-context"><div className="decision-evidence"><h4><Lightbulb size={15} /> 검토 자료</h4><p>판단 당시 수치를 기록과 함께 보관합니다.</p>{stock ? <dl><div><dt>상품</dt><dd>{stock.productName}</dd></div><div><dt>현재 재고</dt><dd>{stock.stockQty.toLocaleString()}개</dd></div><div><dt>일평균 판매</dt><dd>{stock.dailySales.toLocaleString()}개</dd></div><div><dt>재고일수 / 리드타임</dt><dd>{stock.stockDays}일 / {stock.leadTimeDays}일</dd></div><div><dt>안전재고</dt><dd>{stock.safetyStock.toLocaleString()}개</dd></div><div><dt>추천 발주 수량</dt><dd>{stock.recommendedOrderQty.toLocaleString()}개</dd></div></dl> : <p className="decision-reason">{evidence?.taskReason || task?.reason || "검토한 자료와 수치를 판단 근거에 입력해주세요."}</p>}{evidence && <small>자료 기록: {dateLabel(evidence.capturedAt)}</small>}</div>
        <div className="decision-evidence"><h4>기록과 실행</h4><p>{inventory ? `현재 실행 상태: ${inventory.orderStatus === "발주 완료" ? "발주 등록 완료" : inventory.orderStatus}` : "결정을 확정하면 업무에 연결하고 기록 > 지식 문서에 저장합니다."}</p>{record?.confirmedAt && <><p><strong>{record.authorName}</strong> · {dateLabel(record.confirmedAt)}</p><Link href="/records?tab=knowledge" onClick={closeDecision}>기록에서 보기 →</Link></>}<small>결정 확정 후에도 새 결정을 작성해 변경 이력을 남길 수 있습니다.</small></div>
      </aside>
    </div>
    {records.length > 0 && <div className="decision-history"><h4><History size={15} /> 결정 이력</h4>{records.map((item) => <button type="button" key={item.id} className={item.id === viewingId ? "active" : ""} onClick={() => selectHistory(item)} disabled={busy}><Badge tone={item.approvalStatus === "PENDING" ? "orange" : item.approvalStatus === "REJECTED" ? "red" : item.status === "CONFIRMED" ? "green" : "neutral"}>{item.approvalStatus === "PENDING" ? "승인 대기" : item.approvalStatus === "REJECTED" ? "반려" : item.status === "CONFIRMED" ? outcomeLabels[item.outcome] : "초안"}</Badge><span>{item.content || "작성 중인 결정"}</span><small>{item.authorName} · {dateLabel(item.confirmedAt ?? item.updatedAt)}</small></button>)}</div>}
    {error && <p className="decision-error" role="alert">{error}</p>}
    <div className="modal-actions decision-footer"><Button variant="secondary" onClick={closeDecision} disabled={busy}>닫기</Button>{openPo && <Button variant="purple" onClick={() => { closeDecision(); openPurchaseOrder(openPo.id); }}>발주서 · 거래처 진행</Button>}{readOnly ? <><Button variant="secondary" disabled={busy} onClick={() => { setForm(initialForm()); setViewingId(null); setError(""); }}>새 결정 작성</Button>{record?.status === "CONFIRMED" && record.outcome === "PROCEED" && inventory && confirmed?.id === record.id && inventory.orderStatus !== "발주 완료" && <><label className="decision-arrival">입고 예정일<input type="date" value={arrival} min={todayKst} onChange={(event) => setArrival(event.target.value)} aria-label="입고 예정일" title={`기본값은 리드타임 ${inventory.leadTimeDays}일 기준입니다. 긴급 납기를 합의했다면 날짜를 바꾸세요.`} /></label><Button disabled={busy || !arrival} onClick={() => void registerOrder(record.quantity!, record.id)}>{record.quantity?.toLocaleString()}개 발주 등록</Button></>}</> : <><Button variant="secondary" disabled={busy} onClick={() => void save("DRAFT")}>초안 저장</Button><Button disabled={busy} onClick={() => void save("CONFIRMED")}>{busy ? "저장 중…" : needsApproval ? "승인 요청" : "결정 확정"}</Button></>}</div>
  </Modal>;
}
