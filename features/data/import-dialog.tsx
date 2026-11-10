"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Badge, Button, Modal, money } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import type { DataSourceSlot } from "@/lib/mock/samples";

type SalesSample = { row: number; date: string; channel: string; sku: string; productName: string; productId: string | null; revenue: number; orders: number; quantity: number };
type InventorySample = { row: number; productName: string; stockQty: number; dailySales: number | null; leadTimeDays: number | null; safetyStock: number | null; before: number | null };
type Preview = {
  kind: "sales" | "inventory"; fileName: string; headers: string[]; totalRows: number; applicable: number; unmatched: number; missing: string[];
  issues: { row: number; reason: string }[]; issueCount: number; period: { start: string; end: string } | null; channels: { channel: string; revenue: number }[];
  sample: Array<SalesSample | InventorySample>; firstSalesImport: boolean;
};

/** 매출·재고 엑셀 업로드: 파일 선택 → 미리보기(맞는 상품·건너뛸 줄) → 반영 */
export function ImportDialog({ slot, onClose, onTemplate }: { slot: DataSourceSlot & { key: "sales" | "inventory" }; onClose: () => void; onTemplate: () => void }) {
  const { load, showToast } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [replaceSample, setReplaceSample] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function send(mode: "preview" | "apply", target = file) {
    if (!target) return;
    setBusy(true); setError("");
    try {
      const body = new FormData();
      body.set("file", target); body.set("kind", slot.key); body.set("mode", mode); body.set("replaceSample", String(replaceSample));
      const response = await fetch("/api/data-import", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "파일을 처리하지 못했어요.");
      if (mode === "preview") { setPreview(payload.preview); return; }
      showToast(payload.message, "success");
      await load();
      onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "파일을 처리하지 못했어요."); }
    finally { setBusy(false); }
  }

  function pick(next?: File | null) {
    if (!next) return;
    setFile(next); setPreview(null);
    void send("preview", next);
    if (input.current) input.current.value = "";
  }

  const isSales = slot.key === "sales";
  return <Modal open title={`${slot.name} 엑셀 올리기`} onClose={() => { if (!busy) onClose(); }} width="860px">
    <div className="im-steps">
      <div><b>1</b> 양식 확인 <Button variant="ghost" onClick={onTemplate}><Download size={13} /> 양식 받기</Button></div>
      <div><b>2</b> 파일 선택 (엑셀 .xlsx · CSV)</div>
      <div><b>3</b> 미리보기 확인 후 반영</div>
    </div>
    <p className="rd-muted">필요한 열: {slot.columns.join(" · ")}. 열 이름이 조금 달라도(예: 일자/날짜/주문일, 매출액/결제금액) 읽어요. 첫 시트의 첫 줄을 머리글로 봅니다.</p>

    <button type="button" className={`im-drop${busy ? " is-busy" : ""}`} onClick={() => input.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); pick(event.dataTransfer.files?.[0]); }}>
      <FileSpreadsheet size={22} />
      <span>{file ? <><strong>{file.name}</strong> · {Math.max(1, Math.round(file.size / 1024))}KB {busy ? "· 읽는 중…" : "· 다른 파일로 바꾸려면 클릭"}</> : "클릭하거나 파일을 끌어다 놓으세요"}</span>
    </button>
    <input ref={input} type="file" accept=".xlsx,.csv" hidden onChange={(event) => pick(event.target.files?.[0])} />

    {error && <p className="decision-error" role="alert">{error}</p>}

    {preview && <div className="im-preview">
      {preview.missing.length > 0 ? <div className="decision-approval is-rejected"><div><strong><AlertTriangle size={14} /> 필요한 열을 찾지 못했어요: {preview.missing.join(", ")}</strong><span>파일의 머리글: {preview.headers.filter(Boolean).join(" · ") || "(없음)"}</span><small className="rd-muted">양식의 열 이름으로 바꾸거나 머리글 줄을 첫 줄로 옮긴 뒤 다시 올려주세요.</small></div></div> : <>
        <div className="im-summary">
          <div><span>파일의 줄</span><strong>{money(preview.totalRows)}</strong></div>
          <div><span>반영</span><strong className="green">{money(preview.applicable)}</strong></div>
          <div><span>건너뜀</span><strong className={preview.issueCount ? "red" : ""}>{money(preview.issueCount)}</strong></div>
          {isSales && <div><span>미등록 상품</span><strong className={preview.unmatched ? "orange" : ""}>{money(preview.unmatched)}</strong></div>}
          {preview.period && <div><span>기간</span><strong>{preview.period.start} ~ {preview.period.end}</strong></div>}
        </div>
        {isSales && preview.channels.length > 0 && <p className="im-channels">{preview.channels.map((item) => <Badge key={item.channel}>{item.channel} {money(Math.round(item.revenue / 10000))}만원</Badge>)}</p>}
        {isSales && preview.unmatched > 0 && <p className="pd-data-note">등록되지 않은 상품 {preview.unmatched}줄은 일별·채널 합계에는 들어가지만 상품별 매출에는 빠져요. 데이터 등록 &gt; 상품 등록에서 품번(SKU)을 맞추면 다음 업로드부터 연결됩니다.</p>}
        <div className="table-wrap"><table className="data-table">
          <thead>{isSales ? <tr><th>줄</th><th>일자</th><th>채널</th><th>상품</th><th>매출</th><th>주문</th><th>수량</th></tr> : <tr><th>줄</th><th>상품</th><th>현재고</th><th>일평균 판매</th><th>리드타임</th><th>안전재고</th></tr>}</thead>
          <tbody>{preview.sample.map((raw) => isSales ? (() => { const row = raw as SalesSample; return <tr key={`${row.row}-${row.channel}`}><td>{row.row}</td><td>{row.date}</td><td>{row.channel}</td><td>{row.productName || row.sku}{!row.productId && <Badge tone="orange">미등록</Badge>}</td><td>{money(row.revenue)}원</td><td>{money(row.orders)}</td><td>{money(row.quantity)}</td></tr>; })() : (() => { const row = raw as InventorySample; return <tr key={row.row}><td>{row.row}</td><td>{row.productName}</td><td>{row.before !== null && row.before !== row.stockQty ? <><span className="rd-muted">{money(row.before)} → </span><strong>{money(row.stockQty)}</strong></> : money(row.stockQty)}</td><td>{row.dailySales ?? <span className="rd-muted">기존 유지</span>}</td><td>{row.leadTimeDays ?? <span className="rd-muted">기존 유지</span>}</td><td>{row.safetyStock ?? <span className="rd-muted">기존 유지</span>}</td></tr>; })())}</tbody>
        </table></div>
        {preview.applicable > preview.sample.length && <p className="rd-muted">앞의 {preview.sample.length}줄만 보여줘요.</p>}
        {preview.issueCount > 0 && <details className="im-issues"><summary>건너뛸 줄 {preview.issueCount}개 보기</summary><ul>{preview.issues.map((issue, index) => <li key={index}>{issue.row}번째 줄: {issue.reason}</li>)}{preview.issueCount > preview.issues.length && <li>… 외 {preview.issueCount - preview.issues.length}줄</li>}</ul></details>}
        {isSales && preview.firstSalesImport && <label className="md-check"><input type="checkbox" checked={replaceSample} onChange={(event) => setReplaceSample(event.target.checked)} /> 첫 업로드: 샘플 일별 매출(데모 60일)을 지우고 업로드한 매출만 쓰기 <small className="rd-muted">(끄면 샘플과 섞여 합계가 부정확해요)</small></label>}
        {isSales && <p className="pd-data-note">같은 기간·채널을 다시 올리면 그 기간을 새 파일 내용으로 바꿔요(두 번 더해지지 않음).</p>}
      </>}
    </div>}

    <div className="modal-actions">
      <Button variant="secondary" disabled={busy} onClick={onClose}>닫기</Button>
      <Button disabled={busy || !preview || preview.missing.length > 0 || preview.applicable === 0} onClick={() => void send("apply")}><Upload size={13} /> {busy && preview ? "반영 중…" : preview ? `${money(preview.applicable)}줄 반영` : "반영"}</Button>
    </div>
  </Modal>;
}
