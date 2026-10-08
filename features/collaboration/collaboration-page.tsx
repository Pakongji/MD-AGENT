"use client";

import { useState } from "react";
import { Bot, Copy, Plus, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataBoundary, Modal, SectionTitle } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";

const states = ["대기", "진행", "승인 대기", "완료"] as const;

export function CollaborationPage() {
  const { data, command, busy, showToast } = useAppStore();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [task, setTask] = useState("립 기획전 배너"); const [team, setTeam] = useState("디자인"); const [owner, setOwner] = useState("김OO"); const [due, setDue] = useState("2026-10-10T11:00");
  const purpose = "11월 립오일·플럼핑 집중전의 핵심 혜택을 고객에게 명확히 전달";
  const deliverable = "PC 1440×480 배너 1종, MO 750×900 배너 1종";
  const requestText = `안녕하세요. ${task} 제작을 요청드립니다.\n\n목적: ${purpose}\n마감: ${new Date(due).toLocaleString("ko-KR")}\n필요 산출물: ${deliverable}\n필수 문구: 검색 관심도 상승이 아닌 고객 혜택 중심 메시지\n참고 자료: 립오일·플럼핑 집중전 기획안`;

  return <DataBoundary><div className="stack">
    <div className="grid-4"><BadgeCard label="대기" value={data.collaborationRequests.filter((item) => item.status === "대기").length} tone="neutral" /><BadgeCard label="진행" value={data.collaborationRequests.filter((item) => item.status === "진행").length} tone="blue" /><BadgeCard label="승인 대기" value={data.collaborationRequests.filter((item) => item.status === "승인 대기").length} tone="orange" /><BadgeCard label="완료" value={data.collaborationRequests.filter((item) => item.status === "완료").length} tone="green" /></div>
    <Card className="card-purple"><div className="grid-main-side"><div><Badge tone="purple"><Sparkles size={11} /> AI 요청서</Badge><h2 style={{ margin: "10px 0 6px" }}>업무만 입력하면 요청 목적·산출물·마감 문구를 정리해요</h2><p>디자인, 마케팅, SCM, 법무, 브랜드사 요청에 맞는 구조로 생성합니다.</p></div><div className="actions" style={{ justifyContent: "flex-end" }}><Button onClick={() => setGeneratorOpen(true)}><Bot size={13} /> AI 요청서 생성</Button></div></div></Card>
    <Card><SectionTitle title="협업 요청 관리" description="요청 후 완료까지 상태를 직접 변경할 수 있습니다." action={<Button variant="secondary" onClick={() => setGeneratorOpen(true)}><Plus size={13} /> 새 요청</Button>} /><div className="table-wrap"><table className="data-table"><thead><tr><th>요청명</th><th>요청팀</th><th>담당자</th><th>마감</th><th>필요 산출물</th><th>상태</th></tr></thead><tbody>{data.collaborationRequests.map((request) => <tr key={request.id}><td><strong>{request.title}</strong><div className="tiny">{request.purpose}</div></td><td>{request.team}</td><td>{request.owner}</td><td>{new Date(request.dueAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td><td>{request.deliverable}</td><td><select className="status-select" value={request.status} onChange={(event) => void command({ type: "UPDATE_COLLAB", id: request.id, status: event.target.value })} aria-label={`${request.title} 상태`}>{states.map((state) => <option key={state}>{state}</option>)}</select></td></tr>)}</tbody></table></div></Card>
    <Modal open={generatorOpen} title="AI 협업 요청서 생성" onClose={() => setGeneratorOpen(false)}><div className="form-grid"><div className="field"><label>업무</label><input value={task} onChange={(event) => setTask(event.target.value)} /></div><div className="field"><label>요청팀</label><select value={team} onChange={(event) => setTeam(event.target.value)}><option>디자인</option><option>마케팅</option><option>SCM</option><option>법무</option><option>브랜드사</option></select></div><div className="field"><label>담당자</label><input value={owner} onChange={(event) => setOwner(event.target.value)} /></div><div className="field"><label>마감</label><input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} /></div></div><div className="divider" /><span className="answer-label">생성된 요청 문구</span><div className="request-preview">{requestText}</div><div className="modal-actions"><Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(requestText); showToast("요청 문구를 복사했습니다.", "success"); }}><Copy size={13} /> 복사</Button><Button disabled={!task || busy} onClick={async () => { if (await command({ type: "CREATE_COLLAB", title: task, team, owner, dueAt: new Date(due).toISOString(), purpose, deliverable, reference: "립오일·플럼핑 집중전 기획안", requestText })) setGeneratorOpen(false); }}>협업 요청 생성</Button></div></Modal>
  </div></DataBoundary>;
}

function BadgeCard({ label, value, tone }: { label: string; value: number; tone: "neutral" | "blue" | "orange" | "green" }) { return <Card><span className="metric-label">{label}</span><strong style={{ display: "block", margin: "10px 0", fontSize: 24 }}>{value}건</strong><Badge tone={tone}>{label}</Badge></Card>; }
