"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarPlus, Check, Database, Download, ExternalLink, Link2, Search, Sparkles } from "lucide-react";
import { Badge, Button, Card, SectionTitle } from "@/components/common/ui";
import { draftSchema, fields, milestones, overviewConfirmed, overviewKeys, overviewLabels, readPromotionPeriod, type Brief, type OverviewKey, type PlannerRecord, type PromotionDraft, type PromotionMilestone } from "@/lib/promotion-planner/model";
import { useAppStore } from "@/lib/store/app-store";
import { suggestMilestones } from "@/lib/promotion-planner/schedule";

const emptyPeriod = { start: "", end: "" };
const steps = ["시장 조사", "행사 개요", "3안 비교", "조합·확정", "일정·Figma 시안"];
const channelPresets = ["올리브영", "쿠팡", "자사몰", "네이버"];
const timeLabel = (value: string) => new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });
const localTime = (value: string) => new Date(Date.parse(value) + 9 * 3_600_000).toISOString().slice(0, 16);
const won = (value: number | null) => value == null ? "미정" : value >= 10000 ? `${new Intl.NumberFormat("ko-KR").format(Math.round(value / 10000))}만원` : `${value}원`;

function fileDownload(name: string, contents: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(contents, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stageOf(plan: PlannerRecord) {
  if (plan.promotionId) return 4;
  if (plan.draft) return 3;
  return overviewConfirmed(plan) ? 2 : 1;
}

export function PromotionPlanner({ initialTopic }: { initialTopic?: string }) {
  const reloadDashboard = useAppStore(state => state.load);
  const dashboard = useAppStore(state => state.data);
  const calendarEvents = dashboard.calendarEvents;
  const [query, setQuery] = useState({ topic: initialTopic ?? "", channel: "올리브영" });
  const [brief, setBrief] = useState<Brief>({ topic: "", channel: "", period: "", goal: "", budget: null });
  const [period, setPeriod] = useState(emptyPeriod);
  const [plans, setPlans] = useState<PlannerRecord[]>([]);
  const [plan, setPlan] = useState<PlannerRecord>();
  const [draft, setDraft] = useState<PromotionDraft>();
  const [stage, setStage] = useState(0);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dates, setDates] = useState<Partial<Record<PromotionMilestone, string>>>({});
  const [figmaUrl, setFigmaUrl] = useState("");
  const confirmed = plan?.promotionId ? [...plan.revisions].reverse().find(item => item.action === "기획 확정") : undefined;
  const hasPeriod = Boolean(period.start || period.end);
  const formattedPeriod = `${period.start} ~ ${period.end}`;
  const periodError = hasPeriod && !readPromotionPeriod(formattedPeriod)
    ? "시작일과 종료일을 모두 선택해주세요."
    : period.end < period.start ? "종료일을 시작일과 같거나 이후로 선택해주세요." : "";
  const overview = plan?.research.overview;

  // 자사 데이터에서 주제와 관련된 상품의 재고를 함께 보여줍니다(근거 번호와 구분해 '자사'로 표시).
  const internalFacts = useMemo(() => {
    const topic = plan?.brief.topic ?? query.topic;
    const tokens = topic.replace(/기획전|행사|프로모션/g, " ").split(/\s+/).filter(token => token.length >= 2);
    const matched = dashboard.products.filter(product => tokens.some(token => product.name.includes(token) || product.category.includes(token) || token.includes(product.category))).slice(0, 3);
    const facts = matched.map(product => {
      const stock = dashboard.inventory.find(item => item.productId === product.id);
      return stock
        ? `${product.name} 재고 ${stock.stockDays}일분 · 리드타임 ${stock.leadTimeDays}일${stock.stockDays < stock.leadTimeDays ? " — 행사 전 발주 확인 필요" : ""}`
        : `${product.name} · 재고 자료 없음`;
    });
    const report = dashboard.performanceReports[0];
    if (report) facts.push(`${report.title} · 달성률 ${report.achievement}%`);
    return facts;
  }, [dashboard.inventory, dashboard.performanceReports, dashboard.products, plan?.brief.topic, query.topic]);

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/promotion-planner", { cache: "no-store", signal: abort.signal }).then(async result => {
      const body = await result.json();
      if (!result.ok) throw new Error(body.error);
      setPlans(body.plans);
      setLive(body.liveAvailable);
    }).catch(reason => { if (!abort.signal.aborted) setError(reason.message || "기획안을 불러오지 못했습니다."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, []);

  function updatePlan(next: PlannerRecord) {
    setPlan(next);
    setPlans(values => [next, ...values.filter(item => item.id !== next.id)]);
  }

  function openPlan(next: PlannerRecord) {
    const schedule = [...next.revisions].reverse().find(item => item.schedule)?.schedule ?? {};
    const savedPeriod = readPromotionPeriod(next.brief.period);
    updatePlan(next);
    setBrief({ ...next.brief, period: savedPeriod ? "" : next.brief.period });
    setPeriod(savedPeriod ?? emptyPeriod);
    setDraft(next.draft ?? undefined);
    setFigmaUrl(next.draft?.figmaUrl ?? "");
    setDates(Object.fromEntries(Object.entries(schedule).map(([key, value]) => [key, localTime(value)])));
    setStage(stageOf(next));
    setError("");
    setMessage("");
  }

  async function send(payload: object, label: string, onSuccess: (next: PlannerRecord) => void) {
    setBusy(label);
    setError("");
    setMessage("");
    try {
      const result = await fetch("/api/promotion-planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await result.json();
      if (!result.ok) throw new Error(body.error);
      onSuccess(body.plan);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "요청을 처리하지 못했습니다.");
    } finally { setBusy(""); }
  }

  function research(mode: "live" | "reference") {
    void send({ action: "research", id: crypto.randomUUID(), query: { topic: query.topic.trim(), channel: query.channel.trim() }, mode },
      mode === "live" ? "공개 자료를 조사하는 중…" : "참고 자료로 조사하는 중…", openPlan);
  }

  function confirmOverview() {
    if (!plan || periodError) return;
    const input = { ...brief, period: hasPeriod ? formattedPeriod : brief.period };
    if (input.topic.trim().length < 3) { setError("주제를 3자 이상 입력해주세요."); return; }
    void send({ action: "overview", id: plan.id, version: plan.version, brief: input }, "행사 개요로 3안을 준비하는 중…", next => {
      openPlan(next);
      setStage(2);
      setMessage("행사 개요를 확정했어요. 개요가 바뀐 경우 3안을 다시 만들었어요.");
    });
  }

  function selectOption(index: number) {
    if (!plan) return;
    setDraft({ ...plan.research.options[index], origin: Object.fromEntries(fields.map(([key]) => [key, index + 1])), notes: draft?.notes ?? "", figmaUrl: draft?.figmaUrl ?? "" });
    setStage(3);
  }

  function save(shouldConfirm: boolean, value = draft) {
    if (!plan || !value) return;
    const checked = draftSchema.safeParse(value);
    if (!checked.success) { setError("모든 기획 항목을 채우고 Figma 링크 형식을 확인해주세요."); return; }
    void send({ action: "save", id: plan.id, version: plan.version, draft: checked.data, confirm: shouldConfirm }, "기획안을 저장하는 중…", next => {
      updatePlan(next);
      setDraft(next.draft ?? undefined);
      setFigmaUrl(next.draft?.figmaUrl ?? "");
      setMessage(shouldConfirm ? "기획을 확정했습니다. ‘진행 중인 프로모션’에서 확인할 수 있어요." : "변경 이력을 저장했습니다.");
      if (shouldConfirm) {
        setDates(current => Object.values(current).some(Boolean) ? current : suggestMilestones(calendarEvents, new Date(), readPromotionPeriod(next.brief.period)?.start));
        setStage(4);
        void reloadDashboard();
      }
    });
  }

  function schedule() {
    if (!plan) return;
    const slots = Object.fromEntries(Object.entries(dates).filter(([, value]) => value).map(([key, value]) => [key, new Date(value + ":00+09:00").toISOString()]));
    void send({ action: "schedule", id: plan.id, version: plan.version, schedule: slots }, "캘린더에 등록하는 중…", next => {
      updatePlan(next);
      setMessage("캘린더에 등록했습니다. 같은 제작 단계의 기존 일정은 갱신됩니다.");
      void reloadDashboard();
    });
  }

  function evidenceLabel(key: OverviewKey) {
    const refs = overview?.evidence[key] ?? [];
    return refs.length ? `근거 ${refs.join(" · ")}` : null;
  }

  const canOpen = (i: number) => i === 0 || (i === 1 && Boolean(plan)) || (i === 2 && Boolean(plan) && overviewConfirmed(plan!)) || (i === 3 && Boolean(draft)) || (i === 4 && Boolean(confirmed));

  return <div className="stack md-feature-body">
    <Card>
      <div className="rd-stepper" role="list">
        {steps.map((label, i) => <button key={label} role="listitem" className={stage === i ? "now" : i < stage ? "done" : ""} disabled={Boolean(busy) || !canOpen(i)} aria-current={stage === i ? "step" : undefined}
          onClick={() => { setStage(i); setError(""); setMessage(""); }}>
          <span>{i < stage ? <Check size={12} /> : i + 1}</span>{label}
        </button>)}
      </div>
      <div className="md-feature-toolbar">
        <Badge tone={live ? "purple" : "neutral"}>{live ? "웹 조사 연결됨" : "참고 자료 모드 (웹 조사 미연결)"}</Badge>
        <label className="md-date-control md-end">저장한 기획안
          <select value={plan?.id ?? ""} disabled={loading || Boolean(busy)} onChange={event => { const saved = plans.find(item => item.id === event.target.value); if (saved) openPlan(saved); }}>
            <option value="" disabled>{loading ? "불러오는 중…" : plans.length ? "선택" : "저장한 기획안 없음"}</option>
            {plans.map(item => <option key={item.id} value={item.id}>{item.draft?.title || item.brief.topic}</option>)}
          </select>
        </label>
      </div>
      {busy && <p role="status">{busy}</p>}
      {error && <p className="md-feature-error" role="alert">{error}</p>}
      {message && <p className="md-feature-success" role="status">{message}</p>}
    </Card>

    {stage === 0 && <div className="md-worklog-grid">
      <Card><SectionTitle title="① 무엇을 조사할까요?" description="주제와 채널만 넣으면 공개 자료를 먼저 조사하고, 그 근거로 행사 개요를 제안해요." />
        <div className="stack">
          <label className="field">조사 주제 <input placeholder="예: 겨울 립케어 · 12월" maxLength={120} value={query.topic} onChange={e => setQuery({ ...query, topic: e.target.value })} /></label>
          <div className="field"><span>채널</span>
            <div className="rd-filter-chips">{channelPresets.map(channel => <button key={channel} type="button" aria-pressed={query.channel === channel} onClick={() => setQuery({ ...query, channel })}>{channel}</button>)}</div>
            <input aria-label="채널 직접 입력" placeholder="다른 채널이면 직접 입력" maxLength={80} value={query.channel} onChange={e => setQuery({ ...query, channel: e.target.value })} />
          </div>
          <div className="actions">
            <Button onClick={() => research("live")} disabled={!live || loading || !!busy || query.topic.trim().length < 2}><Search size={15} /> 시장 조사 시작</Button>
            <Button variant="secondary" onClick={() => research("reference")} disabled={loading || !!busy || query.topic.trim().length < 2}>참고 자료로 조사</Button>
          </div>
          {!live && <p className="rd-muted">웹 조사 API가 연결되지 않아 ‘참고 자료로 조사’만 쓸 수 있어요. 이 경우 근거 없는 칸(기간·목표)은 비워 두고 직접 입력을 요청해요.</p>}
        </div>
      </Card>
      <Card><SectionTitle title="이렇게 진행돼요" />
        <ol className="md-followups"><li>① 시장 조사 — 공식 기획전·브랜드 페이지를 확인하고 원문 링크와 확인 시각을 남겨요</li><li>② 행사 개요 — 조사 근거로 주제·채널·기간·목표를 제안해요. 칸마다 근거 번호가 붙어요</li><li>③ 3안 비교 — 개요에 맞춘 서로 다른 3가지 안</li><li>④ 조합·확정 → ⑤ 일정·Figma 시안</li></ol>
        <p className="rd-muted">웹 조사에는 주제와 채널만 전달돼요. 예산·목표 같은 내부 정보는 앱 안에서만 관리해요.</p>
      </Card>
    </div>}

    {stage === 1 && plan && <div className="rd-columns">
      <Card className="rd-col-main">
        <div className="rd-card-head"><div className="rd-card-title"><h3>① 시장 조사 결과</h3><Badge tone={plan.research.mode === "live" ? "green" : "orange"}>{plan.research.mode === "live" ? "공개 웹 조사" : "참고 자료"}</Badge></div><span className="rd-muted">{timeLabel(plan.research.checkedAt)}</span></div>
        <p>{plan.research.summary}</p>
        <span className="rd-label">시장에서 확인한 사실</span>
        {plan.research.sources.map((source, index) => <div className="rd-finding" key={source.url}>
          <span className="rd-finding-no">{index + 1}</span>
          <div><strong>{source.finding}</strong><a href={source.url} target="_blank" rel="noreferrer" className="rd-link"><Link2 size={12} /> {source.title} <ExternalLink size={11} /></a></div>
        </div>)}
        {!plan.research.sources.length && <p className="rd-muted">원문을 확인한 시장 자료가 없어요. 아래 행사 개요는 입력한 주제만으로 만든 초안이에요.</p>}
        {internalFacts.length > 0 && <>
          <span className="rd-label">자사 데이터에서 확인한 것</span>
          {internalFacts.map((fact) => <div className="rd-finding internal" key={fact}><span className="rd-finding-no"><Database size={11} /></span><div><strong>{fact}</strong><small className="rd-muted">샘플 데이터</small></div></div>)}
        </>}
      </Card>
      <Card className="rd-col-side rd-col-wide">
        <div className="rd-card-head"><h3>② 행사 개요 · AI 제안</h3><span className="rd-muted">칸마다 근거 번호가 붙어요</span></div>
        {overviewKeys.filter(key => key !== "period").map((key) => <div key={key} className={`rd-ov-field ${!brief[key] ? "need" : ""}`}>
          <div className="rd-ov-head"><span>{overviewLabels[key]}</span>{evidenceLabel(key) ? <Badge tone="purple">AI 제안</Badge> : <Badge tone="orange">{brief[key] ? "직접 확인" : "입력 필요"}</Badge>}</div>
          <input value={brief[key] as string} maxLength={key === "topic" ? 300 : key === "goal" ? 150 : 80} onChange={e => setBrief({ ...brief, [key]: e.target.value })} aria-label={overviewLabels[key]} placeholder={key === "goal" ? "예: 립오일 신규 고객 2,000명" : undefined} />
          <small>{evidenceLabel(key) ?? "확인된 근거가 없어요 — 직접 확인해주세요"}</small>
        </div>)}
        <div className={`rd-ov-field ${!hasPeriod && !brief.period ? "need" : ""}`}>
          <div className="rd-ov-head"><span>기간</span>{evidenceLabel("period") ? <Badge tone="purple">AI 제안</Badge> : <Badge tone="orange">{hasPeriod || brief.period ? "직접 확인" : "입력 필요"}</Badge>}</div>
          <div className="form-grid">
            <input type="date" aria-label="시작일" max="9999-12-31" value={period.start} onInput={e => setPeriod({ ...period, start: e.currentTarget.value })} />
            <input type="date" aria-label="종료일" min={period.start || undefined} max="9999-12-31" value={period.end} onInput={e => setPeriod({ ...period, end: e.currentTarget.value })} />
          </div>
          <small className={periodError ? "md-feature-error" : undefined}>{periodError || (brief.period && !hasPeriod ? `제안: ${brief.period}` : evidenceLabel("period") ?? "확인된 근거가 없어요 — 직접 정해주세요")}</small>
        </div>
        <div className={`rd-ov-field ${brief.budget == null ? "need" : ""}`}>
          <div className="rd-ov-head"><span>예산 (원)</span><Badge tone="orange">직접 입력</Badge></div>
          <input type="number" min={0} max={2_000_000_000} value={brief.budget ?? ""} onChange={e => setBrief({ ...brief, budget: e.target.value === "" ? null : Number(e.target.value) })} aria-label="예산" placeholder="예: 5000000" />
          <small><Database size={11} /> 예산은 내부 정보라 AI가 추정하지 않아요</small>
        </div>
        <p className="rd-muted"><Sparkles size={12} /> 근거 없는 숫자는 만들지 않아요. 개요를 고치면 확인한 근거 안에서 3안을 다시 만들어요.</p>
        <div className="actions"><Button variant="purple" disabled={!!busy || !!periodError} onClick={confirmOverview}>이 개요로 3안 만들기 <ArrowRight size={14} /></Button></div>
      </Card>
    </div>}

    {stage === 2 && plan && <>
      <div className="rd-overview-bar">
        <div className="rd-overview-label"><strong>행사 개요</strong>{plan.research.sources.length ? <Badge tone="green">시장 조사 {plan.research.sources.length}건 근거로 작성</Badge> : <Badge tone="orange">시장 근거 없음 · 입력한 주제로 작성</Badge>}</div>
        {[["주제", plan.brief.topic], ["채널", plan.brief.channel || "미정"], ["기간", plan.brief.period || "미정"], ["목표", plan.brief.goal || "미정"], ["예산", won(plan.brief.budget)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        <Button variant="ghost" disabled={!!plan.promotionId} onClick={() => setStage(1)}>조건 수정</Button>
      </div>
      <div className="rd-card-head"><h3>3가지 안 비교 — 항목별로 골라 섞을 수 있어요</h3><span className="rd-muted">‘확인할 조건’은 재고·발주 상황과 함께 검토하세요</span></div>
      <div className="grid-3 md-planner-options">{plan.research.options.map((option, index) => <Card key={index}>
        <Badge tone="purple">{index + 1}안</Badge><h2>{option.title}</h2>
        <dl>{fields.slice(1, 5).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{option[key]}</dd></div>)}</dl>
        <div className="rd-risk"><AlertTriangle size={14} /><div><span>확인할 조건</span><p>{option.risk}</p></div></div>
        <Button variant="secondary" onClick={() => selectOption(index)}>{index + 1}안으로 편집 <ArrowRight size={14} /></Button>
      </Card>)}</div>
      {plan.research.sources.length > 0 && <Card><SectionTitle title={`행사 개요의 근거 · 시장 조사 ${plan.research.sources.length}건`} description={`조사 ${timeLabel(plan.research.checkedAt)} · 원문 확인된 링크만`} />
        <ul className="md-followups">{plan.research.sources.map((source, index) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="md-source">{index + 1}. {source.title} <ExternalLink size={12} /></a><p>{source.finding}</p></li>)}</ul>
      </Card>}
    </>}

    {stage === 3 && plan && draft && <div className="md-worklog-grid">
      <Card><SectionTitle title="기획안 편집" description="항목별로 다른 안의 내용을 가져오고, 선택한 내용을 직접 수정할 수 있습니다." />
        <div className="stack">
          {fields.map(([key, label]) => <div className="md-plan-field" key={key}>
            <label className="field">{label}<textarea rows={2} maxLength={600} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>
            <label className="field">가져올 안
              <select aria-label={label + " 가져올 안"} value={draft.origin[key] ?? ""} onChange={e => {
                const index = Number(e.target.value) - 1;
                const option = plan.research.options[index];
                if (option) setDraft({ ...draft, [key]: option[key], origin: { ...draft.origin, [key]: index + 1 } });
              }}><option value="" disabled>선택</option>{plan.research.options.map((_, i) => <option key={i} value={i + 1}>{i + 1}안</option>)}</select>
            </label>
          </div>)}
          <label className="field">직접 추가한 내용 <textarea rows={3} maxLength={1800} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
          <div className="actions">
            <Button variant="secondary" disabled={!!busy} onClick={() => save(false)}>초안 저장</Button>
            <Button disabled={!!busy} onClick={() => save(true)}>기획 확정하고 제작으로 <ArrowRight size={14} /></Button>
          </div>
        </div>
      </Card>
      <Card><SectionTitle title="변경 이력" />
        <p>{timeLabel(plan.research.checkedAt)} · 시장 조사와 3개 원안 생성</p>
        <ul className="md-followups">{[...plan.revisions].reverse().map(item => <li key={item.version}>
          <strong>v{item.version} · {item.action}</strong><p>{timeLabel(item.at)}{item.draft ? " · " + item.draft.title : item.brief ? " · " + item.brief.topic : ""}</p>
          {item.draft && <details><summary>이 버전 내용</summary><p>{item.draft.products} · {item.draft.benefit}</p><p>{item.draft.message}</p></details>}
        </li>)}</ul>
      </Card>
    </div>}

    {stage === 4 && plan && confirmed?.draft && <div className="md-worklog-grid">
      <Card><SectionTitle title="Figma 시안 제작" description="확정안으로 배너와 상세페이지 초안을 준비합니다." action={<Badge tone="green">기획 확정 · v{confirmed.version}</Badge>} />
        <div className="md-creative-preview"><small>배너 카피</small><h2>{confirmed.draft.message}</h2><p>{confirmed.draft.products}</p></div>
        <div className="actions">
          <Button onClick={() => fileDownload("MD-Figma-기획안-v" + confirmed.version + ".json", {
            format: "md-agent-promotion", version: 1, planId: plan.id, revision: confirmed.version,
            title: confirmed.draft!.title, headline: confirmed.draft!.message, products: confirmed.draft!.products,
            benefit: confirmed.draft!.benefit, notes: confirmed.draft!.notes, audience: confirmed.draft!.audience,
          })}><Download size={15} /> Figma용 기획안 다운로드</Button>
          <a className="md-source" href="/figma-promotion/setup.html" target="_blank" rel="noreferrer">Figma 가져오기 안내 <ExternalLink size={13} /></a>
        </div>
        <div className="md-feature-toolbar">
          <label className="field md-grow">Figma 시안 링크 <input type="url" placeholder="https://www.figma.com/design/…" value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)} /></label>
          <Button variant="secondary" disabled={!!busy} onClick={() => draft && save(false, { ...draft, figmaUrl: figmaUrl.trim() })}>시안 링크 저장</Button>
        </div>
        {plan.draft?.figmaUrl && <a className="md-source" href={plan.draft.figmaUrl} target="_blank" rel="noreferrer">저장한 Figma 시안 열기 <ExternalLink size={13} /></a>}
      </Card>
      <Card><SectionTitle title="캘린더 일정" description="기존 일정과 겹치지 않는 한국시간 추천을 확인하고 수정할 수 있습니다." action={<Button variant="secondary" disabled={!!busy} onClick={() => setDates(suggestMilestones(calendarEvents, new Date(), readPromotionPeriod(plan?.brief.period ?? "")?.start))}>일정 추천</Button>} />
        <div className="stack">
          {Object.entries(milestones).map(([key, label]) => <label className="field" key={key}>{label}<input type="datetime-local" value={dates[key as PromotionMilestone] ?? ""} onChange={e => setDates({ ...dates, [key]: e.target.value })} /></label>)}
          <Button disabled={!!busy || !Object.values(dates).some(Boolean)} onClick={schedule}><CalendarPlus size={15} /> 캘린더에 등록</Button>
          <Link className="md-source" href="/tasks?tab=calendar">캘린더 열기 <ArrowRight size={13} /></Link>
        </div>
      </Card>
    </div>}
  </div>;
}
