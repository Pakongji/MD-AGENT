"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Download, Mail, PackageCheck, Send, Truck } from "lucide-react";
import { Badge, Button, Modal } from "./ui";
import { useAppStore } from "@/lib/store/app-store";
import { latestConfirmed } from "@/lib/decisions/shared";
import { buildPurchaseOrderMail, emlFile, gmailComposeLink, mailtoLink, MAILTO_SAFE_LENGTH, outlookComposeLink, poNextStep, poNumber, poStage, PO_STAGES, resolveSupplier } from "@/lib/orders/purchase-order";
import { ProductThumb } from "./product-thumb";

/** 발주 등록 이후: 거래처에 발주서 메일 → 납기 회신 확정 → 입고 확인까지 한 창에서 진행합니다. */
export function PurchaseOrderDialog() {
  const target = useAppStore((state) => state.poTarget);
  return target ? <PurchaseOrderContent key={target} purchaseOrderId={target} /> : null;
}

const ymd = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));

function PurchaseOrderContent({ purchaseOrderId }: { purchaseOrderId: string }) {
  const { data, busy, command, closePurchaseOrder, showToast } = useAppStore();
  const inventory = data.inventory.find((item) => item.purchaseOrders?.some((po) => po.id === purchaseOrderId));
  const po = inventory?.purchaseOrders?.find((item) => item.id === purchaseOrderId);
  const product = data.products.find((item) => item.id === inventory?.productId);
  const brandName = product?.brand?.name;
  const supplier = resolveSupplier(brandName, data);
  const decision = data.tasks.filter((task) => task.inventoryId === inventory?.id).map(latestConfirmed).find((item) => item?.outcome === "PROCEED");
  // 이 상품과 연결된 공급사 품목(같은 거래처 우선) → 발주서에 공급가·품번이 들어갑니다.
  const linkedItems = data.supplierProducts.filter((item) => item.linkedProductId === inventory?.productId);
  const supplierItem = linkedItems.find((item) => item.supplierId === supplier?.supplierId) ?? linkedItems[0] ?? null;
  const mail = po && inventory ? buildPurchaseOrderMail({ po, productName: inventory.product?.name ?? "상품", brandName, supplier, senderName: data.meta.viewer?.name ?? decision?.authorName ?? "담당 MD", decision, supplierItem }) : null;

  const [to, setTo] = useState(mail?.to ?? "");
  const [subject, setSubject] = useState(mail?.subject ?? "");
  const [body, setBody] = useState(mail?.body ?? "");
  const [arrival, setArrival] = useState(po ? ymd(po.expectedArrival) : "");
  const [received, setReceived] = useState(String(po?.quantity ?? ""));

  if (!po || !inventory || !mail) {
    return <Modal open title="발주서" onClose={closePurchaseOrder} width="560px"><p>발주 정보를 찾지 못했습니다. 화면을 새로고침해주세요.</p></Modal>;
  }
  const stage = poStage(po.status);
  const stageIndex = PO_STAGES.indexOf(stage as (typeof PO_STAGES)[number]);
  const name = inventory.product?.name ?? "상품";
  const validTo = /\S+@\S+\.\S+/.test(to);

  function downloadEml() {
    const blob = new Blob([emlFile({ to, cc: mail?.cc, subject, body })], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${po ? poNumber(po) : "발주서"}.eml`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("메일 파일을 받았어요. 열면 내용이 채워진 메일 초안이 열립니다.", "success");
  }

  async function copyBody() {
    try { await navigator.clipboard.writeText(`받는 사람: ${to}\n제목: ${subject}\n\n${body}`); showToast("발주서 메일 내용을 복사했어요. 메일에 붙여넣으세요.", "success"); }
    catch { showToast("복사하지 못했어요. 본문을 직접 선택해 복사해주세요.", "error"); }
  }

  return <Modal open title="발주서 · 거래처 진행" onClose={closePurchaseOrder} width="720px">
    <div className="po-head">
      <div className="product-label"><ProductThumb name={name} src={product?.imageUrl} size={48} /><div><span className="rd-muted">{poNumber(po)}</span><h3>{name} {po.quantity.toLocaleString()}개</h3></div></div>
      <Badge tone={stage === "입고 완료" ? "green" : stage === "발주 등록" ? "orange" : "blue"}>{stage}</Badge>
    </div>
    <ol className="po-steps" aria-label="발주 진행 단계">
      {PO_STAGES.map((item, index) => <li key={item} className={index < stageIndex ? "done" : index === stageIndex ? "current" : ""}>{item}</li>)}
    </ol>
    <p className="po-next"><b>다음 할 일</b> {poNextStep[stage]}</p>

    <div className="po-supplier">
      <div><span>거래처</span><strong>{supplier?.company ?? brandName ?? "거래처 미등록"}</strong>{supplier?.sample ? <Badge tone="orange">샘플 거래처</Badge> : supplier ? <Badge tone="green">등록 거래처</Badge> : null}</div>
      <div><span>담당자</span><strong>{supplier?.contactName ?? "확인 필요"}</strong></div>
      <div><span>납품처</span><strong>{supplier?.deliverTo ?? "확인 필요"}</strong></div>
      <div><span>결제 조건</span><strong>{supplier?.paymentTerms ?? "확인 필요"}</strong></div>
    </div>
    {mail.belowMoq && <p className="decision-error">발주 수량 {po.quantity.toLocaleString()}개가 거래처 MOQ {mail.belowMoq.toLocaleString()}개보다 적어요. 거래처와 먼저 협의하세요.</p>}
    {supplierItem?.unitCost != null && <p className="pd-data-note">공급가 {supplierItem.unitCost.toLocaleString()}원 × {po.quantity.toLocaleString()}개 = <strong>{(supplierItem.unitCost * po.quantity).toLocaleString()}원</strong> (VAT 별도, 공급사 상품 ‘{supplierItem.name}’ 기준)</p>}
    {(!supplier || supplier.sample) && <p className="pd-data-note">{supplier ? "샘플 연락처예요(example.com). " : "이 브랜드에 연결된 거래처가 없어요. "}<Link className="rd-link" href="/registry?tab=suppliers" onClick={closePurchaseOrder}>데이터 등록 &gt; 거래처 등록</Link>에서 {brandName ?? "브랜드"}의 실제 거래처를 등록하면 다음부터 자동으로 들어갑니다.</p>}

    {stage === "발주 등록" && <>
      <div className="field"><label htmlFor="po-to">받는 사람</label><input id="po-to" type="email" value={to} onChange={(event) => setTo(event.target.value)} placeholder="거래처 담당자 이메일" /></div>
      <div className="field"><label htmlFor="po-subject">제목</label><input id="po-subject" value={subject} onChange={(event) => setSubject(event.target.value)} /></div>
      <div className="field"><label htmlFor="po-body">본문</label><textarea id="po-body" rows={14} value={body} onChange={(event) => setBody(event.target.value)} /></div>
      <p className="pd-data-note">앱이 메일을 직접 보내지는 않아요. 아래에서 쓰는 메일로 열어 내용 확인 후 보내고, ‘발송 완료로 표시’를 눌러주세요. 표시하면 다음 영업일까지 ‘납기 회신 확인’ 업무가 생깁니다.</p>
      <div className="po-compose" role="group" aria-label="메일 열기">
        <a className={`button button-secondary${validTo ? "" : " is-disabled"}`} aria-disabled={!validTo} href={validTo ? gmailComposeLink({ to, cc: mail.cc, subject, body }) : undefined} target="_blank" rel="noreferrer"><Mail size={13} /> Gmail로 쓰기</a>
        <a className={`button button-secondary${validTo ? "" : " is-disabled"}`} aria-disabled={!validTo} href={validTo ? outlookComposeLink({ to, cc: mail.cc, subject, body }) : undefined} target="_blank" rel="noreferrer"><Mail size={13} /> Outlook(회사 메일)로 쓰기</a>
        <Button variant="secondary" disabled={!validTo} onClick={downloadEml}><Download size={13} /> 메일 파일(.eml) 받기</Button>
        <a className={`button button-ghost${validTo ? "" : " is-disabled"}`} aria-disabled={!validTo} href={validTo ? mailtoLink({ to, cc: mail.cc, subject, body }) : undefined}>기본 메일 앱</a>
        <Button variant="ghost" onClick={() => void copyBody()}><Copy size={13} /> 전체 복사</Button>
      </div>
      {mailtoLink({ to, cc: mail.cc, subject, body }).length > MAILTO_SAFE_LENGTH && <p className="pd-data-note">‘기본 메일 앱’은 내용이 길어 본문이 비어 열릴 수 있어요. Outlook 프로그램을 쓰면 ‘메일 파일(.eml) 받기’로 여세요.</p>}
      <div className="modal-actions">
        <Button disabled={busy || !validTo || !subject.trim()} onClick={() => void command({ type: "SEND_PURCHASE_ORDER", purchaseOrderId: po.id, sentTo: to, subject })}><Send size={13} /> 발송 완료로 표시</Button>
      </div>
    </>}

    {(stage === "발주서 발송" || stage === "납기 확정") && <>
      <div className="po-confirm">
        <div className="field"><label htmlFor="po-arrival">{stage === "발주서 발송" ? "거래처가 회신한 입고일" : "확정된 입고일 (변경 시 수정)"}</label><input id="po-arrival" type="date" value={arrival} onChange={(event) => setArrival(event.target.value)} /></div>
        <Button disabled={busy || !arrival} onClick={() => void command({ type: "CONFIRM_PO_DELIVERY", purchaseOrderId: po.id, expectedArrival: arrival })}><Truck size={13} /> {stage === "발주서 발송" ? "납기 확정" : "입고일 변경"}</Button>
      </div>
      <p className="pd-data-note">희망 입고일 {ymd(po.expectedArrival)} · 확정하면 입고 추적 업무와 캘린더 입고 일정이 같은 날짜로 바뀝니다.</p>
      <div className="po-confirm">
        <div className="field"><label htmlFor="po-received">실제 입고 수량</label><input id="po-received" type="number" min={1} value={received} onChange={(event) => setReceived(event.target.value)} /></div>
        <Button variant="secondary" disabled={busy || !(Number(received) > 0)} onClick={() => void command({ type: "RECEIVE_PO", purchaseOrderId: po.id, receivedQty: Number(received) })}><PackageCheck size={13} /> 입고 확인</Button>
      </div>
    </>}

    {stage === "입고 완료" && <p>입고가 반영됐어요. 현재 재고 {inventory.stockQty.toLocaleString()}개 · {inventory.stockDays}일분.</p>}
  </Modal>;
}
