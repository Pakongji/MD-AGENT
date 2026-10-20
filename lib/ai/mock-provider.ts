import type { AIProvider, CopilotAnswer } from "@/lib/ai/provider";
import type { DashboardData, TaskPlanGoal, TaskPlanResult, TaskPlanTask } from "@/lib/types/domain";

function dueFrom(input: string) {
  const match = input.match(/(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/);
  if (!match) return /내일/.test(input) ? "내일" : "오늘";
  let hour = Number(match[2]);
  if (match[1] === "오후" && hour < 12) hour += 12;
  if (match[1] === "오전" && hour === 12) hour = 0;
  return `오늘 ${String(hour).padStart(2, "0")}:${String(Number(match[3] || 0)).padStart(2, "0")}`;
}

function lastDueFrom(input: string) {
  const matches = [...input.matchAll(/(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/g)];
  const match = matches.at(-1);
  if (!match) return dueFrom(input);
  let hour = Number(match[2]);
  if (match[1] === "오후" && hour < 12) hour += 12;
  if (match[1] === "오전" && hour === 12) hour = 0;
  return `오늘 ${String(hour).padStart(2, "0")}:${String(Number(match[3] || 0)).padStart(2, "0")}`;
}

const task = (title: string, category: string, due: string, source: TaskPlanTask["source"], reason: string, aiExecutable = false, priority: TaskPlanTask["priority"] = "MEDIUM"): TaskPlanTask => ({
  title, category, due, source, reason, aiExecutable, priority,
});

function designFlow(input: string): TaskPlanGoal | null {
  if (!/(디자인|배너|시안|상세페이지|썸네일|소재)/.test(input)) return null;
  const noun = /추석/.test(input) ? "추석 프로모션 배너" : /상세페이지/.test(input) ? "상세페이지" : "디자인 시안";
  const due = dueFrom(input);
  return {
    goal: `${noun} 디자인 업무 완료`,
    reason: "요청 준비부터 전달, 수신 확인, 검수와 운영 반영까지 하나의 워크플로로 보았습니다.",
    tasks: [
      task(`${noun} 요청 목적 정리`, "협업 요청", "전달 전", "AI_INFERRED", "디자인 방향이 목적과 어긋나지 않도록 먼저 정리합니다.", true, "HIGH"),
      task("노출 위치·규격·필수 문구 확인", "협업 요청", "전달 전", "AI_INFERRED", "재작업이 잦은 필수 입력값을 먼저 확인합니다.", true, "HIGH"),
      task(`${noun} 디자인 브리프 작성`, "협업 요청", "전달 전", "AI_INFERRED", "디자인팀이 바로 착수할 수 있는 요청서가 필요합니다.", true, "HIGH"),
      task(`디자인팀에 ${noun} 자료 전달`, "협업 요청", due, "USER_INPUT", "사용자 입력에서 파악한 핵심 마감 업무입니다.", false, "HIGH"),
      task("디자인팀 수신 여부 확인", "협업 요청", "전달 직후", "AI_INFERRED", "전달 누락을 막기 위해 추가했습니다."),
      task("1차 시안 일정 확인", "협업 요청", "수신 확인 후", "AI_INFERRED", "후속 검수 시간을 확보하기 위해 추가했습니다."),
      task("검수 체크리스트 준비", "프로모션", "1차 시안 전", "AI_INFERRED", "가격·기간·문구·브랜드 가이드 누락을 줄입니다.", true),
      task("1차 시안 검수", "프로모션", "시안 수신 후", "AI_INFERRED", "시안 수신을 완료로 착각하지 않도록 추가했습니다.", false, "HIGH"),
      task("수정 피드백 전달", "협업 요청", "검수 직후", "AI_INFERRED", "수정 사항을 실행 가능한 형태로 전달하기 위해 추가했습니다."),
      task("최종 시안 확정", "프로모션", "수정본 수신 후", "AI_INFERRED", "운영 반영 전 최종 승인 단계입니다.", false, "HIGH"),
      task("운영 채널 전달", "프로모션", "확정 직후", "AI_INFERRED", "산출물이 실제 집행으로 이어지도록 추가했습니다."),
    ],
  };
}

function reportFlow(input: string): TaskPlanGoal | null {
  if (!/(매출|실적).*(보고|자료|리포트)|보고자료/.test(input)) return null;
  const due = lastDueFrom(input);
  return {
    goal: "월 매출 보고자료 작성 및 보고",
    reason: "숫자 집계가 아니라 비교 기준 확인, 원인 해석, 메시지 검수와 보고 후속조치까지 포함했습니다.",
    tasks: [
      task("보고 기간·목표·전월/전년 비교 기준 확정", "성과", "보고 전", "AI_INFERRED", "수치 기준이 달라지는 오류를 방지합니다.", true, "HIGH"),
      task("매출·주문·객단가·목표달성률 집계", "성과", "보고 전", "AI_INFERRED", "보고에 필요한 핵심 지표를 확보합니다.", true, "HIGH"),
      task("카테고리·브랜드별 변화 요인 분석", "성과", "보고 전", "AI_INFERRED", "숫자 나열을 의사결정 정보로 바꿉니다.", true, "HIGH"),
      task("월 매출 보고자료 초안 작성", "성과", "보고 전", "AI_INFERRED", "결론과 근거를 보고 구조로 만듭니다.", true, "HIGH"),
      task("보고자료 수치·문구 최종 검수", "성과", "보고 30분 전", "AI_INFERRED", "임원 보고 전 오류를 줄입니다.", false, "HIGH"),
      task("이사님께 월 매출 보고자료 전달", "성과", due, "USER_INPUT", "사용자 입력에서 파악한 최종 산출물과 마감입니다.", false, "HIGH"),
      task("보고 후 추가 요청을 업무로 등록", "성과", "보고 후", "AI_INFERRED", "보고에서 나온 후속 액션이 사라지지 않게 합니다."),
    ],
  };
}

function inventoryFlow(input: string): TaskPlanGoal | null {
  if (!/(재고|발주|입고|품절)/.test(input)) return null;
  return {
    goal: "재고·발주 의사결정 완료",
    reason: "현재 재고뿐 아니라 판매 속도, 리드타임, 안전재고와 입고 추적까지 연결했습니다.",
    tasks: [
      task("현재 재고·일평균 판매량·재고일수 확인", "재고/발주", "먼저", "AI_INFERRED", "품절 시점 계산에 필요한 기본값입니다.", true, "HIGH"),
      task("공급사 리드타임·입고 가능일 확인", "재고/발주", "먼저", "AI_INFERRED", "소진 전 입고 가능 여부를 확인합니다.", false, "HIGH"),
      task("안전재고 포함 권장 발주수량 산정", "재고/발주", "결정 전", "AI_INFERRED", "과소·과다 발주를 줄입니다.", true, "HIGH"),
      task("발주 여부와 수량 최종 결정", "재고/발주", dueFrom(input), "USER_INPUT", "MD 최종 판단 업무입니다.", false, "HIGH"),
      task("발주 등록 후 입고 예정일 추적", "재고/발주", "발주 후", "AI_INFERRED", "발주에서 실제 입고까지 닫힌 흐름으로 관리합니다."),
    ],
  };
}

function competitorFlow(input: string): TaskPlanGoal | null {
  if (!/(경쟁사|B사|할인.*대응|가격.*비교)/.test(input)) return null;
  return {
    goal: "경쟁사 변화 영향 확인 및 대응안 결정",
    reason: "변화 수집에서 끝내지 않고 직접 경쟁 SKU, 실구매가, 영향 추정과 대응 실행까지 연결했습니다.",
    tasks: [
      task("경쟁사 할인율·쿠폰·세트·행사기간 확인", "경쟁사", "먼저", "AI_INFERRED", "고객이 실제로 받는 혜택을 비교합니다.", true, "HIGH"),
      task("자사 직접 경쟁 SKU 매칭", "경쟁사", "분석 전", "AI_INFERRED", "영향 범위를 좁힙니다.", true, "HIGH"),
      task("자사와 경쟁사 실구매가 비교", "경쟁사", "분석 전", "AI_INFERRED", "표면 할인율 대신 실제 가격을 확인합니다.", true, "HIGH"),
      task("매출·구매전환율 영향 추정", "경쟁사", "대응 전", "AI_INFERRED", "대응 우선순위를 수치로 판단합니다.", true),
      task("가격·쿠폰·세트 대응안 결정", "경쟁사", dueFrom(input), "USER_INPUT", "사용자가 요청한 핵심 판단입니다.", false, "HIGH"),
      task("확정 대응안을 프로모션에 반영", "프로모션", "결정 후", "AI_INFERRED", "분석을 실제 실행으로 연결합니다."),
    ],
  };
}

function promotionFlow(input: string): TaskPlanGoal | null {
  if (!/(프로모션|기획전|행사|딜)/.test(input) || /(디자인|배너|시안)/.test(input)) return null;
  return {
    goal: "프로모션 기획 및 실행 준비",
    reason: "목표, 상품, 혜택, 수익성, 협업, 세팅과 성과 확인을 한 흐름으로 만들었습니다.",
    tasks: [
      task("프로모션 목표와 KPI 정의", "프로모션", "기획 시작", "AI_INFERRED", "매출·재고·신규고객 중 목표를 먼저 고정합니다.", true, "HIGH"),
      task("대상 SKU 선정 및 재고 확인", "프로모션", "기획 초반", "AI_INFERRED", "판매 가능한 재고를 확인합니다.", true, "HIGH"),
      task("혜택·할인·세트 구성 초안", "프로모션", "기획 초반", "AI_INFERRED", "목표에 맞는 혜택안을 만듭니다.", true, "HIGH"),
      task("예산과 마진 영향 검토", "프로모션", "확정 전", "AI_INFERRED", "매출 증가와 수익성을 함께 봅니다.", true, "HIGH"),
      task("디자인·CRM·운영 협업 요청", "협업 요청", "확정 후", "AI_INFERRED", "실행 산출물 누락을 방지합니다."),
      task("프로모션 세팅 및 오픈 전 QA", "프로모션", dueFrom(input), "USER_INPUT", "사용자 목표를 실제 오픈까지 연결합니다.", false, "HIGH"),
      task("오픈 후 매출·구매전환율·재고 모니터링", "성과", "오픈 후", "AI_INFERRED", "행사 중 대응과 회고를 위해 추가했습니다.", true),
    ],
  };
}

function sourcingFlow(input: string): TaskPlanGoal | null {
  if (!/(소싱|입점|신규 상품|신규 브랜드)/.test(input)) return null;
  return {
    goal: "신규 상품 소싱 검토",
    reason: "시장 수요 확인부터 후보 비교, 수익성·운영 조건 검토와 입점 결정까지 확장했습니다.",
    tasks: [
      task("수요 근거와 구색 공백 정리", "상품/브랜드", "먼저", "AI_INFERRED", "왜 소싱하는지 판단 근거를 만듭니다.", true, "HIGH"),
      task("후보 브랜드·상품 5개 리서치", "상품/브랜드", "리서치", "AI_INFERRED", "비교 가능한 후보군을 확보합니다.", true),
      task("마진·MOQ·리드타임 비교", "상품/브랜드", "검토", "AI_INFERRED", "판매성뿐 아니라 운영 가능성을 확인합니다.", true, "HIGH"),
      task("브랜드사 미팅 및 샘플 요청", "협업 요청", dueFrom(input), "USER_INPUT", "실제 소싱 실행 단계입니다.", false, "HIGH"),
      task("입점 여부 결정과 상품 등록 일정 확정", "상품/브랜드", "미팅 후", "AI_INFERRED", "검토 결과를 실행 일정으로 연결합니다."),
    ],
  };
}

function genericFlow(input: string): TaskPlanGoal {
  const clean = input.replace(/\s+/g, " ").trim();
  return {
    goal: clean.length > 42 ? `${clean.slice(0, 42)}… 완료` : `${clean} 완료`,
    reason: "입력한 목표를 준비, 실행, 확인의 세 단계로 확장했습니다.",
    tasks: [
      task(`${clean}에 필요한 자료와 완료 기준 확인`, "일반", "먼저", "AI_INFERRED", "시작 전에 필요한 조건을 확인합니다.", true),
      task(clean, "일반", dueFrom(input), "USER_INPUT", "사용자 입력에서 파악한 핵심 업무입니다.", false, "HIGH"),
      task(`${clean} 결과 확인 및 후속 조치`, "일반", "완료 후", "AI_INFERRED", "실행 결과가 다음 업무로 이어지도록 확인합니다."),
    ],
  };
}

export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async planTasks(input: string): Promise<TaskPlanResult> {
    const candidates = [designFlow(input), reportFlow(input), inventoryFlow(input), competitorFlow(input), promotionFlow(input), sourcingFlow(input)].filter(Boolean) as TaskPlanGoal[];
    const unique = candidates.filter((goal, index) => candidates.findIndex((item) => item.goal === goal.goal) === index);
    return { goals: unique.length ? unique : [genericFlow(input)] };
  }

  async answer(question: string, page: string, data: DashboardData): Promise<CopilotAnswer> {
    if (/(재고|발주|A 립밤)/.test(question)) {
      const item = data.inventory.find((inventory) => inventory.product?.name === "A 립밤");
      const order = item?.purchaseOrders?.[0];
      if (item?.orderStatus === "발주 완료" && order) {
        const arrival = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(order.expectedArrival));
        const overdue = new Date(order.expectedArrival) < new Date();
        return {
          conclusion: overdue ? `A 립밤 ${order.quantity.toLocaleString()}개 발주는 완료됐지만 ${arrival} 입고 예정일이 지나 실제 입고 여부 확인이 우선입니다.` : `A 립밤은 ${order.quantity.toLocaleString()}개 발주가 완료되어 추가 발주보다 입고 추적이 우선입니다.`,
          evidence: [`발주 상태 ${order.status} · 입고 예정 ${arrival}`, `현재 재고 ${item.stockQty.toLocaleString()}개 · 일평균 판매 ${item.dailySales.toLocaleString()}개`, `현재 재고 ${item.stockDays}일분과 리드타임 ${item.leadTimeDays}일 사이 공백 가능성은 계속 관찰해야 합니다.`],
          impact: overdue ? "같은 발주를 다시 만들 필요는 없습니다. 입고 미반영인지 실제 지연인지 확인하고, 지연이면 품절 대응 일정을 조정해야 합니다." : "같은 발주를 다시 만들 필요는 없지만, 입고 전 품절 가능성이 남아 있어 공급사 일정 확인이 필요합니다.",
          actions: [{ label: "입고 추적 확인", target: "/inventory" }, { label: "캘린더 보기", target: "/calendar" }],
        };
      }
      return {
        conclusion: "A 립밤은 오늘 추가 발주 결정을 권장합니다.",
        evidence: [`현재 재고 ${item?.stockQty ?? 720}개 · 일평균 판매 ${item?.dailySales ?? 180}개`, `재고 ${item?.stockDays ?? 4}일분보다 리드타임 ${item?.leadTimeDays ?? 7}일이 깁니다.`, `안전재고를 포함한 권장 수량은 ${item?.recommendedOrderQty.toLocaleString() ?? "1,200"}개입니다.`],
        impact: "현재 판매 속도가 유지되면 입고 전 약 3일간 품절 가능성이 있습니다.",
        actions: [{ label: "발주 검토", target: "/inventory", taskTitle: "A 립밤 1,200개 발주 진행" }],
      };
    }
    if (/(립오일|트렌드|검색)/.test(question)) return {
      conclusion: "립오일은 단기 노이즈보다 지속 상승 신호에 가깝지만, 매입 확대 전 재고 회전 검증이 필요합니다.",
      evidence: ["검색 관심도가 전년 동기 대비 +109%", "7주 연속 상승, 월 검색량 48,200회", "30대 관심 비중 +8%p"],
      impact: "자사 관련 SKU가 2개뿐이고 A 글로우 립오일 재고는 9일분입니다.",
      actions: [{ label: "트렌드 상세", target: "/market" }, { label: "발주 업무 추가", target: "/tasks", taskTitle: "립오일 추가 발주 검토" }],
    };
    if (/(경쟁|B사|할인)/.test(question)) return {
      conclusion: "즉시 가격을 내리기보다 직접 경쟁 SKU 14개의 실구매가와 행사 중복 기간을 먼저 확인하세요.",
      evidence: ["B사 립 20% 할인", "자사 행사와 4일 겹침", "주 매출 영향 -680만원 추정"],
      impact: "대표 틴트는 자사가 경쟁사보다 2,100원 비쌉니다.",
      actions: [{ label: "가격 비교", target: "/competitors" }, { label: "대응 업무 추가", target: "/tasks", taskTitle: "B사 립 할인 대응안 결정" }],
    };
    if (/(작년|과거|뭐가 잘|지식)/.test(question)) {
      const terms = [...new Set(question.replace(/[^0-9A-Za-z가-힣\s]/g, " ").split(/\s+/).filter((term) => term.length >= 2))];
      const doc = data.knowledgeDocuments
        .map((document) => {
          const searchable = `${document.title} ${document.tags} ${document.content}`.toLowerCase();
          let score = terms.reduce((total, term) => total + (searchable.includes(term.toLowerCase()) ? 2 : 0), 0);
          if (/립/.test(question) && searchable.includes("립")) score += 5;
          if (/프로모션|기획전/.test(question) && /(프로모션|기획전)/.test(searchable)) score += 4;
          if (/작년/.test(question) && /2025/.test(document.title)) score += 4;
          return { document, score };
        })
        .sort((a, b) => b.score - a.score)[0]?.document;
      return {
        conclusion: "작년 10월 립 기획전에서는 단품보다 세트상품 반응이 좋았습니다.",
        evidence: ["매출 +24%", "객단가 +12%", "오후 8시 CRM 유입의 구매전환율이 높았음"],
        impact: "이번 립오일 기획에도 세트 구성과 CRM 타이밍을 재검증할 가치가 있습니다.",
        actions: [{ label: "지식 저장소", target: "/knowledge" }],
        sources: doc ? [doc.title] : [],
      };
    }
    if (/(매출|이번주|왜)/.test(question)) return {
      conclusion: "전체 매출은 증가했지만 메이크업 하락 요인을 별도로 관리해야 합니다.",
      evidence: ["최근 30일 총 매출 12.4억원", "스킨케어 +4.2%p 기여", "메이크업 -1.5%p 기여"],
      impact: "경쟁사 할인과 립 구매전환율 하락이 같은 시기에 관찰됐으나 인과관계는 확정할 수 없습니다.",
      actions: [{ label: "매출 분석", target: "/sales" }],
    };
    return {
      conclusion: `${page === "/" ? "홈" : page}의 현재 데이터에서는 ${data.inventory.find((item) => item.product?.name === "A 립밤")?.orderStatus === "발주 완료" ? "A 립밤 입고 추적" : "A 립밤 발주 결정"}·립오일 트렌드·B사 할인 대응이 우선입니다.`,
      evidence: [`A 립밤 ${data.inventory.find((item) => item.product?.name === "A 립밤")?.orderStatus === "발주 완료" ? "발주 완료·입고 추적 중" : "재고 4일분"}`, "립오일 검색 관심도 7주 연속 상승", "B사 립 20% 할인 시작"],
      impact: "재고 실행 상태와 경쟁사 대응을 함께 확인하면 중복 업무를 줄이면서 품절과 매출 하락 가능성을 관리할 수 있습니다.",
      actions: [{ label: "오늘의 업무", target: "/tasks" }],
    };
  }
}
