"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Layers3, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import { Badge, Button, compactMoney, money } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { latestConfirmed, outcomeLabels } from "@/lib/decisions/shared";
import { diagnoseProduct, productInventory, relatedProductTasks, simulateProductScenario, type ProductScenarioKey, holdReorderGap } from "@/lib/services/product-diagnostics";
import type { ProductItem } from "@/lib/types/domain";

const scenarioNames: Record<ProductScenarioKey, string> = { STANDARD: "일반 발주", EXPEDITED: "긴급 입고 가정", HOLD: "발주 보류" };
const days = (value: number | null | undefined) => value === null || value === undefined ? "계산 불가" : `${value.toFixed(1)}일`;
const dateTime = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "미제공";
const numberValue = (value: string) => value.trim() ? Number(value) : NaN;

export function ProductDiagnosisPanel({ productId, productIds, onSelect, onClose }: { productId: string; productIds: string[]; onSelect: (id: string) => void; onClose: () => void }) {
  const product = useAppStore((state) => state.data.products.find((item) => item.id === productId));
  return product ? <DiagnosisContent key={productId} product={product} productIds={productIds} onSelect={onSelect} onClose={onClose} /> : null;
}

function DiagnosisContent({ product, productIds, onSelect, onClose }: { product: ProductItem; productIds: string[]; onSelect: (id: string) => void; onClose: () => void }) {
  const { data, busy, command, openDecision } = useAppStore();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeCallback = useRef(onClose);
  useEffect(() => { closeCallback.current = onClose; }, [onClose]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected && (document.activeElement === document.body || panel?.contains(document.activeElement))) opener.focus();
    };
  }, []);
  const inventory = productInventory(product, data.inventory);
  const diagnosis = diagnoseProduct(product, data.products, inventory);
  const { benchmark, stock } = diagnosis;
  const tasks = relatedProductTasks(product, inventory, data.tasks);
  const history = tasks.flatMap((task) => task.decisions.filter((item) => item.status === "CONFIRMED").map((record) => ({ task, record })))
    .sort((a, b) => (b.record.confirmedAt ?? b.record.createdAt).localeCompare(a.record.confirmedAt ?? a.record.createdAt));
  const priorDecision = history[0]?.record;
  const [dailySales, setDailySales] = useState(String(inventory?.dailySales ?? ""));
  const [quantity, setQuantity] = useState(priorDecision?.outcome === "PROCEED" && priorDecision.quantity ? String(priorDecision.quantity) : inventory?.recommendedOrderQty ? String(inventory.recommendedOrderQty) : "");
  const [urgentDays, setUrgentDays] = useState("");
  const [holdDays, setHoldDays] = useState("3");
  const [selected, setSelected] = useState<ProductScenarioKey>(priorDecision?.outcome === "HOLD" || priorDecision?.outcome === "DECLINE" || diagnosis.issue === "OVERSTOCK" ? "HOLD" : "STANDARD");
  const scenarioEnabled = Boolean(inventory && stock && inventory.stockQty >= 0);
  const results = {
    STANDARD: inventory ? simulateProductScenario(inventory.stockQty, numberValue(dailySales), numberValue(quantity), inventory.leadTimeDays, "STANDARD") : null,
    EXPEDITED: inventory ? simulateProductScenario(inventory.stockQty, numberValue(dailySales), numberValue(quantity), numberValue(urgentDays), "EXPEDITED") : null,
    HOLD: inventory ? simulateProductScenario(inventory.stockQty, numberValue(dailySales), 0, numberValue(holdDays), "HOLD") : null,
  };
  const holdReorder = inventory ? holdReorderGap(inventory.stockQty, numberValue(dailySales), numberValue(holdDays), inventory.leadTimeDays) : null;
  const current = results[selected];
  const index = productIds.indexOf(product.id);
  const danger = diagnosis.priority >= 4;
  const caution = diagnosis.priority > 0;
  const peerProducts = data.products.filter((item) => item.category === product.category).sort((a, b) => b.revenue - a.revenue);
  const leadingPeers = peerProducts.slice(0, 5);
  const comparison = leadingPeers.some((item) => item.id === product.id) ? leadingPeers : [...leadingPeers, product];

  function contextNote() {
    const note = [
      `[상품 진단에서 검토한 자료 · ${dateTime(new Date().toISOString())}]`,
      `상품: ${product.name} / 진단: ${diagnosis.headline}`,
      `등록 상품 집계 기준: ${product.category} 매출 ${benchmark.rank ?? "-"}위 / ${benchmark.categorySize}개, 마진율 ${product.marginRate}% (상품별 집계기간 미제공)`,
    ];
    if (inventory) note.push(`재고 ${inventory.stockQty}개, 등록 일평균 판매 ${inventory.dailySales}개, 일반 리드타임 ${inventory.leadTimeDays}일, 안전재고 ${inventory.safetyStock}개`);
    if (scenarioEnabled && current) {
      note.push(`선택한 검토안: ${scenarioNames[selected]} / 하루 판매 ${current.dailySales}개 가정`);
      for (const kind of Object.keys(scenarioNames) as ProductScenarioKey[]) {
        const result = results[kind];
        if (result) note.push(`${scenarioNames[kind]}: ${kind === "HOLD" ? "재검토" : "입고"} ${days(result.days)}, 추가 ${result.quantity}개, 그전 공백 ${days(result.gapDays)}, 미충족 수요 ${result.unmetUnits}개 추정, 시점 직후 재고 ${Math.round(result.unitsAfter)}개${kind === "HOLD" && holdReorder ? `, 재검토 후 발주 시 입고 전 공백 ${days(holdReorder.gapDays)}(미충족 약 ${holdReorder.unmetUnits}개)` : ""}`);
      }
      note.push("위 값은 수요 일정·단일 입고의 독립 가정이며 기존 입고와 합산하지 않음. 긴급 납기는 미확정 가정. 미충족 수요는 실제 취소·손실 실적이 아님.");
    }
    return note.join("\n").slice(0, 1900);
  }

  async function recordDecision() {
    if (inventory?.orderStatus === "발주 완료") {
      onClose();
      const latest = history[0];
      openDecision(latest ? { taskId: latest.task.id, selectedId: latest.record.id } : { inventoryId: inventory.id });
      return;
    }
    let taskId = tasks.find((task) => task.requiresDecision)?.id;
    if (!inventory && !taskId) {
      const title = `${product.name} 상품 운영 결정`;
      const ok = await command({ type: "ADD_TASK", title, category: "상품 운영", priority: "MEDIUM", due: "오늘", reason: contextNote(), requiresDecision: true });
      if (!ok) return;
      taskId = useAppStore.getState().data.tasks.find((task) => task.title === title)?.id;
      if (!taskId) return;
    }
    onClose();
    openDecision({ taskId, inventoryId: inventory?.id, startNew: true,
      outcome: inventory && selected === "HOLD" ? "HOLD" : "PROCEED",
      quantity: current && selected !== "HOLD" ? current.quantity : undefined,
      suggestedContent: inventory ? selected === "HOLD" ? `${product.name} 발주를 보류하고 재검토` : selected === "EXPEDITED" ? `${product.name} ${current?.quantity.toLocaleString() ?? ""}개 발주 검토 · 긴급 납기 가능 여부 확인` : `${product.name} ${current?.quantity.toLocaleString() ?? ""}개 일반 발주 검토` : `${product.name} 상품 운영 방안 검토`,
      contextNote: contextNote(),
    });
  }
  async function addTask() {
    await command({ type: "ADD_TASK", title: `${product.name} ${diagnosis.actionTask}`, category: inventory ? "재고/발주" : "상품 운영", priority: danger ? "HIGH" : "MEDIUM", due: "오늘", reason: contextNote(), requiresDecision: false });
  }

  return <div className="product-diagnosis-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <aside ref={panelRef} className="product-diagnosis-panel" role="dialog" aria-modal="true" aria-label={`${product.name} 상품 진단`} onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); closeCallback.current(); }
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary') ?? []).filter((element) => element.getClientRects().length > 0);
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1]?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0]?.focus(); }
    }}>
      <header className="pd-header"><div><span className="eyebrow">상품 진단</span><h2>{product.name}</h2><p>{product.brand.name} · {product.category} · {product.lifecycle}</p></div><div className="pd-navigation"><span>{index + 1} / {productIds.length}</span><button className="icon-button" disabled={index <= 0} onClick={() => onSelect(productIds[index - 1])} aria-label="이전 상품"><ChevronLeft size={17} /></button><button className="icon-button" disabled={index < 0 || index >= productIds.length - 1} onClick={() => onSelect(productIds[index + 1])} aria-label="다음 상품"><ChevronRight size={17} /></button><button ref={closeRef} className="icon-button" onClick={onClose} aria-label="상품 진단 닫기"><X size={18} /></button></div></header>
      <div className="pd-body">
        <section className={`pd-verdict ${danger ? "urgent" : caution ? "caution" : "calm"}`}><div className="pd-section-kicker">{danger ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />} 지금 확인할 문제 <Badge tone={danger ? "red" : caution ? "orange" : "green"}>{danger ? "우선 확인" : caution ? "검토 필요" : "관찰"}</Badge></div><h3>{diagnosis.headline}</h3><p>{diagnosis.explanation}</p><small>등록 자료에 규칙을 적용한 진단입니다. 판매 증감의 원인을 확정하는 분석은 아닙니다.</small></section>

        <section className="pd-section"><div className="pd-section-title"><h3><Layers3 size={16} /> 판단 근거</h3><Badge tone="neutral">등록값과 계산 구분</Badge></div>
          {inventory ? <><div className="pd-stock-facts"><div><span>현재 재고 · 등록값</span><strong>{money(inventory.stockQty)}개</strong></div><div><span>일평균 판매 · 등록값</span><strong>{money(inventory.dailySales)}개</strong></div><div><span>리드타임 · 등록값</span><strong>{inventory.leadTimeDays}일</strong></div></div>{stock && <div className="pd-stock-chart"><div><span>재고 커버 · 계산</span><div className="pd-track"><i style={{ width: `${stock.coverageDays / Math.max(stock.coverageDays, inventory.leadTimeDays, 1) * 100}%` }} /></div><strong>{days(stock.coverageDays)}</strong></div><div><span>일반 발주 입고</span><div className="pd-track lead"><i style={{ width: `${inventory.leadTimeDays / Math.max(stock.coverageDays, inventory.leadTimeDays, 1) * 100}%` }} /></div><strong>{days(inventory.leadTimeDays)}</strong></div><p>안전재고 {money(inventory.safetyStock)}개에 도달하기까지 약 <strong>{days(stock.safetyDays)}</strong>. 현재 재고를 판매 가능한 물량으로 가정했습니다.</p></div>}{!stock && <p className="pd-data-note">유효한 일평균 판매량과 납기가 있어야 재고 전망을 계산할 수 있습니다.</p>}{diagnosis.nextOrder && <div className="pd-inbound"><Clock3 size={15} /><div><strong>기존 미입고 발주 {money(diagnosis.nextOrder.quantity)}개</strong><p>{dateTime(diagnosis.nextOrder.expectedArrival)} 예정 · {diagnosis.arrivalDays !== null && diagnosis.arrivalDays < 0 ? "예정일 경과 · 실제 입고 확인 필요" : "기존 입고 일정부터 확인하세요."}</p>{diagnosis.activeOrderCount > 1 && <small>미입고 {diagnosis.activeOrderCount}건 중 가장 이른 1건입니다.</small>}</div></div>}</> : <p className="pd-data-note">재고가 연결되지 않았습니다. 품절 시점은 계산하지 않습니다.</p>}
        </section>

        <section className="pd-section"><div className="pd-section-title"><h3>같은 카테고리에서의 위치</h3><Badge tone="blue">{product.category} {benchmark.categorySize}개</Badge></div><div className="pd-peer-metrics"><div><span>등록 매출 순위</span><strong>{benchmark.rank ?? "-"}<small> / {benchmark.categorySize}위</small></strong></div><div><span>카테고리 매출 비중</span><strong>{benchmark.revenueShare === null ? "비교 불가" : `${benchmark.revenueShare.toFixed(1)}%`}</strong></div><div><span>비교 상품 대비 마진율</span><strong className={(benchmark.marginGap ?? 0) < 0 ? "red" : "green"}>{benchmark.marginGap === null ? "비교 불가" : `${benchmark.marginGap > 0 ? "+" : ""}${benchmark.marginGap.toFixed(1)}%p`}</strong></div></div><div className="table-wrap"><table className="data-table pd-peer-table"><thead><tr><th>상품</th><th>등록 매출</th><th>마진율</th></tr></thead><tbody>{comparison.map((item) => <tr key={item.id} className={item.id === product.id ? "selected" : ""}><td>{item.name}{item.id === product.id && <Badge tone="purple">선택</Badge>}</td><td>{compactMoney(item.revenue)}</td><td>{item.marginRate}%</td></tr>)}</tbody></table></div><p className="pd-data-note">선택 상품을 제외한 비교 상품 {benchmark.peerCount}개{benchmark.peerMargin === null ? ": 비교 표본이 없습니다." : `의 마진율 중앙값은 ${benchmark.peerMargin.toFixed(1)}%입니다.`} 상품별 집계기간은 미제공이며, 마진율의 비용 포함 기준도 확인이 필요합니다.</p></section>

        <section className="pd-section"><div className="pd-section-title"><h3><SlidersHorizontal size={16} /> 대응안 비교</h3><Badge tone="purple">가정에 따른 단순 추정</Badge></div>
          {scenarioEnabled && inventory ? <>{priorDecision && <p className="pd-data-note pd-existing-decision">최근 확정: {outcomeLabels[priorDecision.outcome]}{priorDecision.quantity ? ` · ${money(priorDecision.quantity)}개` : ""}. 아래 입력은 별도로 비교하는 가정이며 기존 결정을 변경하지 않습니다.</p>}<div className="pd-assumptions"><div className="field"><label htmlFor="pd-daily">하루 판매량 가정 (개)</label><input id="pd-daily" type="number" min={1} value={dailySales} onChange={(event) => setDailySales(event.target.value)} /></div><div className="field"><label htmlFor="pd-quantity">발주 수량 가정 (개)</label><input id="pd-quantity" type="number" min={1} max={10000000} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div><div className="field"><label htmlFor="pd-urgent">긴급 입고 가정 (일)</label><input id="pd-urgent" type="number" min={0} max={365} step="0.5" value={urgentDays} onChange={(event) => setUrgentDays(event.target.value)} placeholder="가능한 납기 직접 입력" /></div><div className="field"><label htmlFor="pd-hold">보류 후 재검토 가정 (일)</label><input id="pd-hold" type="number" min={0} max={365} step="0.5" value={holdDays} onChange={(event) => setHoldDays(event.target.value)} /></div></div>
            <div className="table-wrap"><table className="data-table pd-scenario-table"><caption>각 행은 서로 독립된 가정입니다. 기존 미입고 물량과 합산하지 않습니다.</caption><thead><tr><th>검토안 선택</th><th>입고 / 재검토</th><th>그전 재고 공백</th><th>시점 직후 재고</th></tr></thead><tbody>{(Object.keys(scenarioNames) as ProductScenarioKey[]).map((kind) => { const result = results[kind]; return <tr key={kind} className={selected === kind ? "selected" : ""}><td><label><input type="radio" name="product-scenario" checked={selected === kind} disabled={!result} onChange={() => setSelected(kind)} aria-label={`${scenarioNames[kind]} 선택`} />{scenarioNames[kind]}</label></td><td>{result ? `${days(result.days)} 후` : kind === "EXPEDITED" && !urgentDays ? "납기 입력 필요" : "가정값 확인"}</td><td className={result && (result.gapDays > 0 || (kind === "HOLD" && (holdReorder?.gapDays ?? 0) > 0)) ? "red" : ""}>{result ? days(result.gapDays) : "—"}{kind === "HOLD" && result && holdReorder ? <small>재검토 후 발주 시 입고 전 {days(holdReorder.gapDays)}</small> : null}</td><td>{result ? <>{money(Math.floor(result.unitsAfter))}개<small>약 {days(result.coverageAfter)}분</small></> : "—"}</td></tr>; })}</tbody></table></div>
            {current ? <div className="pd-scenario-result"><strong>{scenarioNames[selected]} · 검토 가정</strong><p>{selected === "HOLD" ? `추가 입고 없이 ${days(current.days)} 뒤 재검토한다면, 그때 남는 재고는 약 ${money(Math.floor(current.unitsAfter))}개입니다.` : `${days(current.days)} 뒤 ${money(current.quantity)}개가 입고되는 가정에서, 입고 직후 약 ${days(current.coverageAfter)}분의 재고가 남습니다.`}</p><p>그전 미충족 수요는 약 <strong>{money(current.unmetUnits)}개</strong>로 추정됩니다. 실제 취소나 매출 손실 실적은 아닙니다.</p>{selected === "EXPEDITED" && <p>긴급 납기는 공급사와 확인되지 않은 가정입니다. 먼저 가능 여부를 확인하세요.</p>}{selected === "HOLD" && holdReorder && holdReorder.gapDays > 0 && <p className="red">재검토 후 바로 발주해도 리드타임 {days(inventory!.leadTimeDays)} 때문에 입고까지 약 <strong>{days(holdReorder.gapDays)}</strong> 재고 공백(미충족 약 {money(holdReorder.unmetUnits)}개)이 생깁니다.</p>}</div> : <p className="pd-data-note" role="status">선택한 검토안의 판매량·수량·납기 가정값을 확인해주세요.</p>}
            <p className="pd-data-note">판매 속도 일정, 재고 전량 판매 가능, 단일 입고를 가정합니다. 반품·예약 재고·품절 후 이월 주문은 반영하지 않습니다. 발주량을 늘려도 입고 전 공백은 줄어들지 않습니다.</p>
          </> : <p className="pd-data-note">판매 속도와 재고 자료가 충분하지 않아 시뮬레이션을 제공하지 않습니다. 자료 확인 업무를 먼저 등록할 수 있습니다.</p>}
        </section>

        <section className="pd-section"><div className="pd-section-title"><h3><ClipboardCheck size={16} /> 관련 업무 · 결정 · 실행</h3><Badge tone="neutral">{tasks.length}개 업무</Badge></div>{tasks.length ? tasks.map((task) => { const latest = latestConfirmed(task); return <div className="pd-related-task" key={task.id}><div><strong>{task.title}</strong><p>{task.status} · {latest ? `결정: ${outcomeLabels[latest.outcome]}` : task.requiresDecision ? "결정 기록 없음" : "확인 업무"}</p></div>{task.requiresDecision ? <Button variant="secondary" onClick={() => { onClose(); openDecision({ taskId: task.id }); }}>{latest ? "결정 기록 보기" : "결정 검토"}</Button> : <Link href="/tasks" onClick={onClose}>업무 목록 <ArrowRight size={13} /></Link>}</div>; }) : <p className="pd-data-note">아직 연결된 업무가 없습니다. 상품 연결 또는 상품명 일치 기준으로 찾습니다.</p>}{history.slice(0, 3).map(({ task, record }) => <div className="pd-decision-record" key={record.id}><div><Badge tone="green">{outcomeLabels[record.outcome]}</Badge><small>{record.authorName} · {dateTime(record.confirmedAt)}</small></div><strong>{record.content}</strong><p>{record.rationale}</p><Button variant="ghost" onClick={() => { onClose(); openDecision({ taskId: task.id, selectedId: record.id }); }}>결정 원본 보기</Button></div>)}{!history.length && <p className="pd-data-note">이 상품과 연결된 확정 결정 기록은 아직 없습니다.</p>}{inventory && <div className="pd-execution"><span>현재 실행 상태</span><strong>{inventory.orderStatus === "발주 완료" ? "발주 등록 완료" : inventory.orderStatus}</strong><Link href="/sales?tab=inventory" onClick={onClose}>재고·입고 화면 열기 →</Link></div>}</section>

        <details className="pd-scope"><summary>분석 범위와 자료 기준</summary><dl><div><dt>상품 매출·판매량 집계기간</dt><dd>등록되어 있지 않음 · 기간 비교 불가</dd></div><div><dt>일평균 판매량 산정 기간</dt><dd>미제공 · 재고에 등록된 판매 속도 사용</dd></div><div><dt>재고 자료 수정 시각</dt><dd>{dateTime(inventory?.updatedAt)} · 실제 실사 시점과 다를 수 있음</dd></div><div><dt>자료 조회 시각</dt><dd>{dateTime(data.meta.lastUpdated)}</dd></div></dl><p>상품별 일별 추이, 앱·웹별 매출, 조회→구매 전환, 할인·반품 영향은 추가 자료 연결이 필요합니다. 현재 화면은 이를 원인 분석으로 생성하지 않습니다.</p></details>
      </div>
      <footer className="pd-footer"><div><span>다음 행동</span><small>검토 가정은 결정 기록의 대안에 함께 첨부됩니다.</small></div><div><Button variant="secondary" disabled={busy} onClick={() => void addTask()}>{diagnosis.actionTask.includes("자료") ? "자료 확인 업무 추가" : "확인 업무 추가"}</Button><Button disabled={busy || (scenarioEnabled && !current)} onClick={() => void recordDecision()}>{inventory?.orderStatus === "발주 완료" ? "기존 결정 확인" : "진단 근거로 결정 기록"}<ArrowRight size={14} /></Button></div></footer>
    </aside>
  </div>;
}
