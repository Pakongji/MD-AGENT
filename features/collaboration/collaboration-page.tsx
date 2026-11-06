"use client";

import { useState } from "react";
import { Bot, Copy, Plus, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataBoundary, Modal, SectionTitle } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";

const states = ["대기", "진행", "승인 대기", "완료"] as const;

function defaultDue() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(11, 0, 0, 0);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** 요청팀마다 요청 동사·기본 산출물·추가 안내가 다릅니다. 디자인 배너 문구가 SCM 요청에 섞이지 않게 합니다. */
const TEAM_TEMPLATES: Record<string, { verb: string; deliverable: string; extra?: string }> = {
  디자인: { verb: "제작을", deliverable: "PC 1440×480 배너 1종, MO 750×900 배너 1종", extra: "필수 문구: 고객 혜택 중심 메시지" },
  마케팅: { verb: "진행을", deliverable: "CRM·광고 집행안과 발송 일정" },
  SCM: { verb: "확인을", deliverable: "가용 재고, 입고 가능일, 추가 발주 가능 수량" },
  법무: { verb: "검토를", deliverable: "표현·약관 검토 의견과 수정 필요 문구" },
  브랜드사: { verb: "협조를", deliverable: "행사 조건(공급가·증정·재고) 회신" },
};

export function CollaborationPage() {
  const { data, command, busy, showToast } = useAppStore();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [task, setTask] = useState("립 기획전 배너"); const [team, setTeam] = useState("디자인"); const [owner, setOwner] = useState("김OO"); const [due, setDue] = useState(defaultDue);
  const [purpose, setPurpose] = useState("11월 립오일·플럼핑 집중전의 핵심 혜택을 고객에게 명확히 전달");
  const [deliverable, setDeliverable] = useState(TEAM_TEMPLATES.디자인.deliverable);
  const [reference, setReference] = useState("립오일·플럼핑 집중전 기획안");
  const template = TEAM_TEMPLATES[team] ?? TEAM_TEMPLATES.디자인;
  const dueText = due ? new Date(due).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }) : "(마감 입력 필요)";
  const requestText = [`안녕하세요, ${team}팀 ${owner || "담당자"}님. ${task} ${template.verb} 요청드립니다.`, "", `목적: ${purpose || "(목적 입력 필요)"}`, `마감: ${dueText}`, `필요 산출물: ${deliverable || "(산출물 입력 필요)"}`, ...(template.extra ? [template.extra] : []), ...(reference ? [`참고 자료: ${reference}`] : [])].join("\n");
  function changeTeam(next: string) {
    // 사용자가 산출물을 고치지 않았다면 팀에 맞는 기본 산출물로 바꿉니다.
    if (!deliverable || Object.values(TEAM_TEMPLATES).some((item) => item.deliverable === deliverable)) setDeliverable(TEAM_TEMPLATES[next]?.deliverable ?? "");
    setTeam(next);
  }

  return <DataBoundary><div className="stack">
    <div className="grid-4"><BadgeCard label="대기" value={data.collaborationRequests.filter((item) => item.status === "대기").length} tone="neutral" /><BadgeCard label="진행" value={data.collaborationRequests.filter((item) => item.status === "진행").length} tone="blue" /><BadgeCard label="승인 대기" value={data.collaborationRequests.filter((item) => item.status === "승인 대기").length} tone="orange" /><BadgeCard label="완료" value={data.collaborationRequests.filter((item) => item.status === "완료").length} tone="green" /></div>
    <Card className="card-purple"><div className="grid-main-side"><div><Badge tone="purple"><Sparkles size={11} /> AI 요청서</Badge><h2 style={{ margin: "10px 0 6px" }}>업무만 입력하면 요청 목적·산출물·마감 문구를 정리해요</h2><p>디자인, 마케팅, SCM, 법무, 브랜드사 요청에 맞는 구조로 생성합니다.</p></div><div className="actions" style={{ justifyContent: "flex-end" }}><Button onClick={() => setGeneratorOpen(true)}><Bot size={13} /> AI 요청서 생성</Button></div></div></Card>
    <Card><SectionTitle title="협업 요청 관리" description="요청 후 완료까지 상태를 직접 변경할 수 있습니다." action={<Button variant="secondary" onClick={() => setGeneratorOpen(true)}><Plus size={13} /> 새 요청</Button>} /><div className="table-wrap"><table className="data-table"><thead><tr><th>요청명</th><th>요청팀</th><th>담당자</th><th>마감</th><th>필요 산출물</th><th>상태</th></tr></thead><tbody>{data.collaborationRequests.map((request) => <tr key={request.id}><td><strong>{request.title}</strong><div className="tiny">{request.purpose}</div></td><td>{request.team}</td><td>{request.owner}</td><td>{new Date(request.dueAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td><td>{request.deliverable}</td><td><select className="status-select" value={request.status} onChange={(event) => void command({ type: "UPDATE_COLLAB", id: request.id, status: event.target.value })} aria-label={`${request.title} 상태`}>{states.map((state) => <option key={state}>{state}</option>)}</select></td></tr>)}</tbody></table></div></Card>
    <Modal open={generatorOpen} title="AI 협업 요청서 생성" onClose={() => setGeneratorOpen(false)}><div className="form-grid"><div className="field"><label htmlFor="collab-task">업무</label><input id="collab-task" value={task} onChange={(event) => setTask(event.target.value)} /></div><div className="field"><label htmlFor="collab-team">요청팀</label><select id="collab-team" value={team} onChange={(event) => changeTeam(event.target.value)}><option>디자인</option><option>마케팅</option><option>SCM</option><option>법무</option><option>브랜드사</option></select></div><div className="field"><label htmlFor="collab-owner">담당자</label><input id="collab-owner" value={owner} onChange={(event) => setOwner(event.target.value)} /></div><div className="field"><label htmlFor="collab-due">마감</label><input id="collab-due" type="datetime-local" value={due} min={new Date().toLocaleDateString("en-CA") + "T00:00"} onChange={(event) => setDue(event.target.value)} /></div></div><div className="form-grid" style={{ marginTop: 12 }}><div className="field"><label htmlFor="collab-purpose">목적</label><input id="collab-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="예: 블프 대상 상품의 행사 기간 재고 확보" /></div><div className="field"><label htmlFor="collab-deliverable">필요 산출물</label><input id="collab-deliverable" value={deliverable} onChange={(event) => setDeliverable(event.target.value)} /></div><div className="field"><label htmlFor="collab-reference">참고 자료 (선택)</label><input id="collab-reference" value={reference} onChange={(event) => setReference(event.target.value)} /></div></div><div className="divider" /><span className="answer-label">생성된 요청 문구</span><div className="request-preview">{requestText}</div><div className="modal-actions"><Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(requestText); showToast("요청 문구를 복사했습니다.", "success"); }}><Copy size={13} /> 복사</Button><Button disabled={!task || !owner || !due || !purpose.trim() || !deliverable.trim() || busy} onClick={async () => { if (await command({ type: "CREATE_COLLAB", title: task, team, owner, dueAt: new Date(due).toISOString(), purpose, deliverable, reference, requestText })) setGeneratorOpen(false); }}>협업 요청 생성</Button></div></Modal>
  </div></DataBoundary>;
}

function BadgeCard({ label, value, tone }: { label: string; value: number; tone: "neutral" | "blue" | "orange" | "green" }) { return <Card><span className="metric-label">{label}</span><strong style={{ display: "block", margin: "10px 0", fontSize: 24 }}>{value}건</strong><Badge tone={tone}>{label}</Badge></Card>; }
