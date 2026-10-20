"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Bot, CalendarDays, PackageX, ShoppingBag, Sparkles, TrendingUp, Users } from "lucide-react";
import { Badge, Button, Card, DataBoundary, Metric, SectionTitle } from "@/components/common/ui";
import { TaskRow } from "@/components/common/task-row";
import { useAppStore } from "@/lib/store/app-store";

const insightIcon = { INVENTORY: PackageX, MARKET: TrendingUp, COMPETITOR: Users } as const;

export function HomePage() {
  const router = useRouter();
  const { data, command, busy } = useAppStore();
  const openTasks = data.tasks.filter((task) => task.status !== "완료");
  const inventory = data.inventory.find((item) => item.product?.name === "A 립밤");
  const order = inventory?.purchaseOrders?.[0];
  const ordered = inventory?.orderStatus === "발주 완료" && order;
  const arrivalOverdue = Boolean(ordered && new Date(order.expectedArrival) < new Date());
  const now = new Date();
  const upcomingEvents = data.calendarEvents.filter((event) => new Date(event.endAt) >= now).slice(0, 4);
  const scheduleEvents = upcomingEvents.length ? upcomingEvents : data.calendarEvents.slice(-4);

  return <DataBoundary><div className="stack">
    <div className="flow-strip" aria-label="MD 업무 흐름"><span>데이터</span><span>변화</span><span>AI 해석</span><span>자사 영향</span><span>MD 판단</span><span>실행</span></div>
    <div className="grid-4">
      <Metric label="현재 매출" value="12.4억원" delta="전월 대비 +8.4%" tone="up" />
      <Metric label="월 목표 달성률" value="78%" delta="계획 대비 +6%p" tone="good" />
      <Metric label="일 방문자 수" value="18,420명" delta="전주 같은 요일 대비 +5.1%" tone="up" />
      <Metric label="객단가" value="38,500원" delta="전월 대비 +7.8%" tone="up" />
    </div>
    <div className="grid-main-side">
      <Card>
        <SectionTitle title="오늘의 업무" description={`미완료 ${openTasks.length}건 · AI 실행 가능 ${openTasks.filter((task) => task.aiExecutable).length}건`} action={<Button variant="secondary" onClick={() => router.push("/tasks")}>전체 보기 <ArrowRight size={13} /></Button>} />
        {openTasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} onToggle={() => void command({ type: "TOGGLE_TASK", id: task.id })} />)}
      </Card>
      <Card className="card-dark decision-card">
        <div className="decision-icon"><Sparkles size={19} /></div>
        <h2>{arrivalOverdue ? "입고 확인이 필요해요" : ordered ? "입고를 추적하고 있어요" : "오늘 결정이 필요해요"}</h2>
        <h3>{ordered ? `A 립밤, ${order.quantity.toLocaleString()}개 발주 완료` : `A 립밤, ${inventory?.recommendedOrderQty.toLocaleString() ?? "1,200"}개 추가 발주할까요?`}</h3>
        <p style={{ marginTop: 8 }}>{ordered ? `${new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(order.expectedArrival))}${arrivalOverdue ? " 입고 예정일이 지났습니다. 실제 입고 여부와 지연 일정을 SCM에 확인하세요." : " 입고 예정입니다. 입고 전 재고 공백 가능성을 공급사 일정과 함께 확인하세요."}` : `현재 재고 ${inventory?.stockDays ?? 4}일분보다 리드타임 ${inventory?.leadTimeDays ?? 7}일이 깁니다. 판매 속도가 유지되면 입고 전 품절 가능성이 있어요.`}</p>
        <div className="actions"><Button variant="secondary" onClick={() => router.push("/inventory")}>{ordered ? "입고 추적 보기" : "근거 보기"}</Button>{ordered ? <Button variant="secondary" onClick={() => router.push("/calendar")}>캘린더 보기</Button> : <Button variant="secondary" disabled={busy || !inventory} onClick={() => inventory && void command({ type: "CREATE_ORDER", inventoryId: inventory.id, quantity: inventory.recommendedOrderQty })}>발주 진행</Button>}</div>
      </Card>
    </div>
    <div className="grid-3">
      {data.insights.slice(0, 3).map((insight, index) => {
        const Icon = insightIcon[insight.type as keyof typeof insightIcon] || AlertTriangle;
        const tone = index === 0 ? "red" : index === 1 ? "orange" : "purple";
        const inventoryTracking = insight.type === "INVENTORY" && ordered;
        return <Card key={insight.id} className="signal-card" onClick={() => router.push(insight.actionTarget)}>
          <header><span className={`insight-icon ${tone}`}><Icon size={17} /></span><Badge tone={index === 0 ? "red" : index === 1 ? "orange" : "purple"}>{insight.severity === "CRITICAL" ? "즉시 판단" : "중요"}</Badge></header>
          <div><h3>{inventoryTracking ? arrivalOverdue ? "A 립밤 입고 지연 여부 확인" : "A 립밤 입고 일정 추적" : insight.title}</h3><p>{inventoryTracking ? arrivalOverdue ? "입고 예정일이 지났습니다. 실제 입고 처리 여부와 변경 일정을 확인하세요." : "발주는 완료됐습니다. 입고 전 재고 공백 가능성과 공급사 일정을 확인하세요." : insight.impact}</p></div>
          <footer><span className="tiny">{inventoryTracking ? `${order.quantity.toLocaleString()}개 발주 완료 · 입고 예정 ${new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(order.expectedArrival))}` : insight.evidence}</span><ArrowRight size={15} /></footer>
        </Card>;
      })}
    </div>
    <div className="grid-2">
      <Card>
        <SectionTitle title="다가오는 일정" description="가장 가까운 마감과 실행 일정을 확인하세요." action={<Button variant="secondary" onClick={() => router.push("/calendar")}>캘린더 <CalendarDays size={13} /></Button>} />
        <div className="schedule-list">{scheduleEvents.map((event) => <div className="schedule-item" key={event.id}><span className="schedule-time">{new Date(event.startAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span><i className="schedule-dot" /><div><strong>{event.title}</strong><span>{event.type} · {event.status}</span></div></div>)}</div>
      </Card>
      <Card>
        <SectionTitle title="AI 작업 중" description="초안과 분석을 맡길 수 있는 업무" action={<Badge tone="purple"><Bot size={11} /> {openTasks.filter((task) => task.aiExecutable).length}건</Badge>} />
        <div className="insight-list">{openTasks.filter((task) => task.aiExecutable).slice(0, 3).map((task) => <div className="insight-item" key={task.id}><span className="insight-icon purple"><Bot size={16} /></span><div><strong>{task.title}</strong><p>{task.reason}</p></div><Badge tone="purple">초안 가능</Badge></div>)}</div>
        <div className="actions"><Button variant="purple" onClick={() => router.push("/tasks")}><ShoppingBag size={13} /> 업무에서 확인</Button></div>
      </Card>
    </div>
  </div></DataBoundary>;
}
