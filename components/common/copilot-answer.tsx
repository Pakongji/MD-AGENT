"use client";

import { Database } from "lucide-react";
import { Button } from "@/components/common/ui";
import type { CopilotAnswer } from "@/lib/ai/provider";

export function UnderstoodChips({ answer, onEdit }: { answer: CopilotAnswer; onEdit?: () => void }) {
  if (!answer.understood) return null;
  const { intent, period, scope } = answer.understood;
  return <div className="rd-understood">
    <div className="rd-understood-head"><strong>이렇게 이해했어요</strong>{onEdit && <button type="button" onClick={onEdit}>다르면 고쳐서 다시 묻기 →</button>}</div>
    <div className="rd-chips"><span>의도: {intent}</span><span>기간: {period}</span><span>범위: {scope}</span></div>
  </div>;
}

/** AI 답변: 이해한 내용 → 결론 → 근거 → 자사 영향 → 실행 버튼 */
export function CopilotAnswerView({ answer, onAction, onEdit, renderActions }: {
  answer: CopilotAnswer;
  onAction?: (action: CopilotAnswer["actions"][number], index: number) => void;
  onEdit?: () => void;
  renderActions?: () => React.ReactNode;
}) {
  return <div className="rd-answer-wrap">
    <UnderstoodChips answer={answer} onEdit={onEdit} />
    <div className={`rd-answer ${answer.unknown ? "is-unknown" : ""}`}>
      {answer.unknown && <span className="rd-answer-unknown"><Database size={13} /> 모르는 건 모른다고 답해요</span>}
      <span className="answer-label">결론</span>
      <h3>{answer.conclusion}</h3>
      <span className="answer-label">{answer.unknown ? "확인한 것" : "근거"}</span>
      <ul>{answer.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="rd-answer-impact"><strong>{answer.unknown ? "다음에 할 수 있는 것" : "자사 영향"}</strong><p>{answer.impact}</p></div>
      {answer.sources?.length ? <div className="chat-sources"><span>근거 문서</span>{answer.sources.map((source) => <strong key={source}>{source}</strong>)}</div> : null}
      <div className="chat-actions">{renderActions ? renderActions() : answer.actions.map((action, index) => <Button key={`${action.label}-${index}`} variant={action.command || action.taskTitle ? "purple" : "secondary"} onClick={() => onAction?.(action, index)}>{action.label}</Button>)}</div>
    </div>
  </div>;
}
