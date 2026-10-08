const date = (iso: string) => new Date(iso);

export const demoData = {
  user: { name: "김민지", role: "Beauty MD", category: "뷰티 전체" },
  taskGroups: [
    { key: "morning", goal: "오늘 핵심 이슈 대응", reason: "매출·재고·경쟁사 신호 중 오늘 결정이 필요한 항목을 묶었습니다." },
  ],
  tasks: [
    { title: "A 립밤 추가 발주 여부 결정", description: "재고 4일분과 리드타임 7일을 함께 검토", category: "재고/발주", priority: "HIGH", dueAt: date("2026-10-08T11:00:00+09:00"), dueLabel: "오늘 11:00", status: "진행중", aiExecutable: false, source: "SYSTEM_SIGNAL", reason: "입고 전 품절 가능성이 높아 오늘 결정이 필요합니다.", groupKey: "morning" },
    { title: "10월 립 기획전 배너 최종 검수", description: "가격·기간·필수 고지 확인", category: "프로모션", priority: "HIGH", dueAt: date("2026-10-08T16:00:00+09:00"), dueLabel: "오늘 16:00", status: "진행중", aiExecutable: false, source: "USER_INPUT", reason: "오늘 운영 채널 전달 전 최종 검수가 필요합니다." },
    { title: "B사 립 20% 할인 대응안 확인", description: "실구매가와 중복 프로모션 기간 비교", category: "경쟁사", priority: "MEDIUM", dueAt: date("2026-10-08T17:00:00+09:00"), dueLabel: "오늘", status: "대기", aiExecutable: true, source: "AI_INFERRED", reason: "자사 행사와 4일 겹쳐 영향을 함께 확인해야 합니다." },
    { title: "지난주 매출 리포트 초안", description: "상승·하락 기여 요인 정리", category: "성과", priority: "MEDIUM", dueAt: date("2026-10-09T15:00:00+09:00"), dueLabel: "내일 15:00", status: "대기", aiExecutable: true, source: "USER_INPUT", reason: "주간 회의 전에 공유할 자료입니다." },
  ],
  brands: [
    { key: "a", name: "A 뷰티", status: "성장" },
    { key: "b", name: "B 코스메틱", status: "안정" },
    { key: "c", name: "C 더마", status: "성장" },
    { key: "d", name: "D 클린", status: "관리 필요" },
  ],
  products: [
    { key: "lipbalm", name: "A 립밤", category: "립", lifecycle: "성장", revenue: 184000000, salesQty: 6320, marginRate: 34.2, risk: "품절 위험", brandKey: "a" },
    { key: "cushion", name: "B 쿠션", category: "베이스", lifecycle: "안정", revenue: 143000000, salesQty: 4280, marginRate: 31.5, risk: "관찰", brandKey: "b" },
    { key: "serum", name: "C 저자극 세럼", category: "스킨케어", lifecycle: "성장", revenue: 217000000, salesQty: 7020, marginRate: 38.6, risk: "양호", brandKey: "c" },
    { key: "cleanser", name: "D 클렌저", category: "클렌징", lifecycle: "감소", revenue: 62000000, salesQty: 1930, marginRate: 24.8, risk: "과재고", brandKey: "d" },
    { key: "lipoil", name: "A 글로우 립오일", category: "립", lifecycle: "신규", revenue: 73000000, salesQty: 2480, marginRate: 36.1, risk: "SKU 확장 검토", brandKey: "a" },
  ],
  inventory: [
    { productKey: "lipbalm", stockQty: 720, dailySales: 180, stockDays: 4, leadTimeDays: 7, safetyStock: 540, expectedStockoutDate: date("2026-10-12T09:00:00+09:00"), status: "발주 필요", recommendedOrderQty: 1200, orderStatus: "미발주" },
    { productKey: "cushion", stockQty: 570, dailySales: 95, stockDays: 6, leadTimeDays: 10, safetyStock: 380, expectedStockoutDate: date("2026-10-14T09:00:00+09:00"), status: "주의", recommendedOrderQty: 700, orderStatus: "미발주" },
    { productKey: "serum", stockQty: 558, dailySales: 62, stockDays: 9, leadTimeDays: 12, safetyStock: 248, expectedStockoutDate: date("2026-10-17T09:00:00+09:00"), status: "주의", recommendedOrderQty: 500, orderStatus: "미발주" },
    { productKey: "cleanser", stockQty: 1260, dailySales: 28, stockDays: 45, leadTimeDays: 6, safetyStock: 112, expectedStockoutDate: date("2026-11-22T09:00:00+09:00"), status: "과재고", recommendedOrderQty: 0, orderStatus: "보류" },
    { productKey: "lipoil", stockQty: 690, dailySales: 76, stockDays: 9, leadTimeDays: 8, safetyStock: 304, expectedStockoutDate: date("2026-10-17T09:00:00+09:00"), status: "관찰", recommendedOrderQty: 500, orderStatus: "미발주" },
  ],
  marketKeywords: [
    { keyword: "립오일", monthlyVolume: 48200, yearOverYear: 109, judgment: "진짜 상승", currentIndex: 92, tenWeeksChange: 70, risingSince: "8월 4주", weeklySeries: JSON.stringify([22, 28, 34, 41, 53, 65, 74, 84, 89, 92]) },
    { keyword: "립플럼퍼", monthlyVolume: 31900, yearOverYear: 82, judgment: "진짜 상승", currentIndex: 81, tenWeeksChange: 47, risingSince: "9월 1주", weeklySeries: JSON.stringify([34, 37, 41, 45, 48, 57, 64, 72, 78, 81]) },
    { keyword: "쿠션", monthlyVolume: 112000, yearOverYear: 12, judgment: "시즌성", currentIndex: 69, tenWeeksChange: 8, risingSince: "9월 3주", weeklySeries: JSON.stringify([61, 58, 55, 57, 60, 63, 66, 71, 73, 69]) },
    { keyword: "저자극 세럼", monthlyVolume: 27500, yearOverYear: 24, judgment: "관찰", currentIndex: 63, tenWeeksChange: 17, risingSince: "9월 2주", weeklySeries: JSON.stringify([46, 48, 47, 51, 52, 55, 58, 61, 64, 63]) },
  ],
  marketTrends: [
    { title: "립오일 관심 증가", event: "립오일 검색 관심도가 7주 연속 상승", impact: "자사 관련 SKU 2개, A 글로우 립오일 재고 9일", recommendation: "추가 발주와 신규 브랜드 소싱을 함께 검토", evidence: "네이버 데이터랩 검색 관심도 전년 동기 대비 +109%; 검색광고 월 검색량 48,200회" },
    { title: "30대 립 관심 비중 확대", event: "30대 관심 비중이 작년 24%에서 올해 32%로 변화", impact: "기존 20대 중심 메시지의 확장 가능성", recommendation: "보습·광택 중심 30대 메시지 A/B안 기획", evidence: "연령별 검색 관심 비중 +8%p" },
  ],
  articles: [
    { publisher: "뷰티인사이트", publishedAt: date("2026-10-08T08:20:00+09:00"), title: "가을 립 시장, 오일·플럼핑 제형 관심 확대", summary: "보습과 광택 니즈가 동시에 늘며 립오일 신제품 출시가 증가하고 있습니다.", recommendationWhy: "자사 립 SKU 구성과 11월 프로모션 기획에 직접 참고할 수 있습니다." },
    { publisher: "커머스데일리", publishedAt: date("2026-10-08T07:45:00+09:00"), title: "뷰티 플랫폼 블랙프라이데이 일정 공개", summary: "주요 플랫폼 행사가 11월 첫째 주부터 순차적으로 시작될 예정입니다.", recommendationWhy: "자사 프로모션과 경쟁사 할인 일정 중복을 미리 점검할 수 있습니다." },
  ],
  competitors: [
    { key: "a", name: "A사" },
    { key: "b", name: "B사" },
    { key: "c", name: "C사" },
  ],
  competitorEvents: [
    { competitorKey: "b", type: "할인", title: "B사 립 전 상품 20% 할인", detail: "회원 쿠폰 포함 시 대표 틴트 실구매가 15,900원", impactEstimate: -6800000, affectedSkuCount: 14, overlapDescription: "자사 립 기획전과 4일 겹침", startAt: date("2026-10-08T00:00:00+09:00"), endAt: date("2026-10-14T23:59:00+09:00") },
    { competitorKey: "c", type: "신상품", title: "C사 저자극 세럼 신상품 출시", detail: "민감성·장벽 케어 메시지, 30ml 28,000원", impactEstimate: -2100000, affectedSkuCount: 6, overlapDescription: "C 저자극 세럼과 핵심 효능 메시지 유사", startAt: date("2026-10-07T00:00:00+09:00"), endAt: date("2026-10-31T23:59:00+09:00") },
  ],
  promotions: [
    { name: "립오일·플럼핑 집중전", goal: "성장 검색 수요를 신규 매출로 전환", period: "11/03–11/09", targetSkus: "A 글로우 립오일 외 7개", benefit: "세트 12% + 앱 쿠폰", budget: 18000000, expectedEffect: "추가 매출 2,100만원", collaboration: "디자인, 마케팅, SCM", deliverables: "PC/MO 배너, CRM, 상품 묶음", rationale: "검색 관심도 +109%, 자사 립오일 매출 +26%, 플럼핑 니즈 +82%", stage: "아이디어" },
    { name: "블프 선제 방어전", goal: "경쟁사 행사 기간 매출 하락 방어", period: "11/06–11/20", targetSkus: "립·쿠션 핵심 14개", benefit: "선착순 쿠폰 + 단독 세트", budget: 25000000, expectedEffect: "추가 매출 1,800만원", collaboration: "마케팅, 디자인", deliverables: "기획전 페이지, 광고 소재", rationale: "작년 같은 시기 할인 이력과 금주 B사 할인 시작이 함께 관찰됨", stage: "기획" },
    { name: "A 브랜드데이", goal: "브랜드 성장세 확대", period: "10/14–10/20", targetSkus: "A 브랜드 12개", benefit: "최대 18% + GWP", budget: 12000000, expectedEffect: "매출 +24%", collaboration: "디자인, 브랜드사", deliverables: "브랜드관, 배너, 라이브 소재", rationale: "최근 4주 A 브랜드 매출 +18%", stage: "디자인" },
  ],
  calendarEvents: [
    { title: "립 기획전 시작", type: "프로모션", startAt: date("2026-10-12T09:00:00+09:00"), endAt: date("2026-10-12T10:00:00+09:00"), status: "예정", description: "가격·쿠폰·진열 최종 확인" },
    { title: "상세페이지 최종 마감", type: "마감", startAt: date("2026-10-12T09:30:00+09:00"), endAt: date("2026-10-12T11:00:00+09:00"), status: "예정", description: "디자인팀 최종 파일 수신" },
    { title: "A 브랜드데이", type: "프로모션", startAt: date("2026-10-14T00:00:00+09:00"), endAt: date("2026-10-20T23:59:00+09:00"), status: "예정", description: "A 브랜드 통합 행사" },
    { title: "C 세럼 입고", type: "입고", startAt: date("2026-10-17T14:00:00+09:00"), endAt: date("2026-10-17T15:00:00+09:00"), status: "예정", description: "500개 입고 예정" },
  ],
  collaborationRequests: [
    { title: "10월 립 기획전 배너 수정", team: "디자인", owner: "김OO", dueAt: date("2026-10-08T16:00:00+09:00"), status: "진행", purpose: "립 기획전 메시지와 가격 혜택 반영", deliverable: "PC/MO 배너 2종", reference: "10월 립 기획전 기획안", requestText: "가격 혜택과 립오일 키비주얼을 반영한 PC/MO 배너 수정을 요청드립니다." },
    { title: "A 립밤 발주 승인", team: "SCM", owner: "박OO", dueAt: date("2026-10-08T14:00:00+09:00"), status: "승인 대기", purpose: "품절 가능성 축소", deliverable: "1,200개 발주 승인", reference: "재고/발주 AI 권장", requestText: "A 립밤 1,200개 발주 승인 요청드립니다. 현재 재고는 4일분이고 리드타임은 7일입니다." },
  ],
  reports: [
    { title: "2026년 9월 MD 성과 리포트", period: "2026-09", achievement: 96, summary: "스킨케어와 A 브랜드데이가 성장을 이끌었고 메이크업은 경쟁사 할인 시점과 하락이 함께 관찰됐습니다.", wins: "스킨케어 세트 매출 +31%; A 브랜드데이 +2.8%p 기여", misses: "메이크업 -1.5%p; 품절 손실 -0.8%p", nextActions: "립 실구매가 모니터링; 품절 위험 SKU 조기 발주" },
  ],
  knowledge: [
    { title: "2025.10 립 기획전 성과 리포트", type: "성과", content: "립 기획전 매출 +24%, 객단가 +12%. 단품보다 세트상품 반응이 우수했고 오후 8시 CRM 유입의 구매전환율이 높았습니다.", source: "성과 분석", tags: "립,프로모션,성과" },
    { title: "A 브랜드 상품 운영 가이드", type: "브랜드", content: "핵심 립 SKU의 기본 리드타임은 7일이며 판매 급증기에는 안전재고 3일분을 권장합니다.", source: "브랜드 운영 문서", tags: "A브랜드,발주,재고" },
    { title: "2026 블랙프라이데이 사전 회의록", type: "회의", content: "11월 첫째 주부터 경쟁사 모니터링을 강화하고 가격 대응보다 단독 세트 차별화를 우선 검토합니다.", source: "회의록", tags: "블랙프라이데이,경쟁사,프로모션" },
  ],
  insights: [
    { type: "INVENTORY", title: "A 립밤 입고 전 품절 가능성", interpretation: "현재 판매 속도가 유지되면 4일 뒤 재고가 소진될 수 있습니다.", impact: "리드타임 7일로 예상 품절일보다 입고가 늦습니다.", evidence: "재고 720개 · 일평균 판매 180개 · 안전재고 540개", actionLabel: "발주 검토", actionTarget: "/inventory", severity: "CRITICAL" },
    { type: "MARKET", title: "립오일 검색 관심 증가", interpretation: "단기 이슈보다 7주 연속 상승 흐름이 관찰됩니다.", impact: "자사 관련 SKU가 2개뿐이라 구색 확대 기회가 있습니다.", evidence: "검색 관심도 전년 대비 +109% · 월 검색량 48,200회", actionLabel: "상세 분석", actionTarget: "/market", severity: "HIGH" },
    { type: "COMPETITOR", title: "B사 립 20% 할인 시작", interpretation: "자사 립 기획전과 행사 기간이 일부 겹칩니다.", impact: "직접 경쟁 SKU 14개의 주 매출 영향은 -680만원으로 추정됩니다.", evidence: "대표 상품 실구매가 자사 18,000원 · 경쟁사 15,900원", actionLabel: "대응안 보기", actionTarget: "/competitors", severity: "HIGH" },
  ],
  notifications: [
    { title: "A 립밤 재고 경고", detail: "재고가 4일분 남았습니다.", target: "/inventory" },
    { title: "경쟁사 할인 감지", detail: "B사 립 카테고리 20% 할인이 시작됐습니다.", target: "/competitors" },
    { title: "오늘 마감", detail: "16:00 립 기획전 배너 최종 검수", target: "/tasks" },
  ],
};

export const salesSeries = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const base = 33500000 + index * 510000;
  const wave = [0, 1800000, -900000, 2600000, 1200000, 4200000, 5100000][index % 7];
  return {
    date: date(`2026-09-${String(day).padStart(2, "0")}T12:00:00+09:00`),
    category: "뷰티 전체",
    revenue: base + wave,
    orders: 890 + index * 7 + (index % 5) * 22,
    visitors: 12400 + index * 65 + (index % 6) * 310,
  };
});

export const mockAnalytics = {
  salesContribution: [
    { name: "스킨케어", value: 4.2 },
    { name: "주말 기획전", value: 2.8 },
    { name: "객단가", value: 1.9 },
    { name: "메이크업", value: -1.5 },
    { name: "품절", value: -0.8 },
  ],
  trendComparison: [
    { week: "8월 1주", thisYear: 38, lastYear: 31, sales: 32 },
    { week: "8월 3주", thisYear: 45, lastYear: 34, sales: 36 },
    { week: "9월 1주", thisYear: 57, lastYear: 38, sales: 44 },
    { week: "9월 3주", thisYear: 74, lastYear: 41, sales: 55 },
    { week: "10월 1주", thisYear: 92, lastYear: 44, sales: 66 },
  ],
  needs: [
    { name: "플럼핑", value: 82 },
    { name: "광택", value: 54 },
    { name: "보습", value: 37 },
    { name: "지속력", value: -18 },
  ],
  demographics: [
    { age: "20대", thisYear: 41, lastYear: 45 },
    { age: "30대", thisYear: 32, lastYear: 24 },
    { age: "40대", thisYear: 18, lastYear: 20 },
    { age: "50대+", thisYear: 9, lastYear: 11 },
  ],
  competitorPrices: [
    { product: "립 틴트 4g", ours: 18000, competitor: 15900 },
    { product: "쿠션 15g", ours: 32000, competitor: 29440 },
    { product: "저자극 세럼 30ml", ours: 29800, competitor: 28000 },
  ],
  promotionHistory: [
    { period: "2025.10", competitor: "B사", event: "립 20% 할인", duration: "7일", note: "올해 반복 여부 모니터링 필요" },
    { period: "2026.03", competitor: "B사", event: "봄 메이크업 위크", duration: "10일", note: "쿠폰 중복 적용" },
    { period: "2026.07", competitor: "C사", event: "저자극 세럼 1+1", duration: "5일", note: "신규회원 한정" },
  ],
};
