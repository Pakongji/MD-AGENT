const date = (iso: string) => new Date(iso);

export const demoData = {
  user: { name: "김민지", role: "Beauty MD", category: "뷰티 전체" },
  taskGroups: [
    { key: "morning", goal: "오늘 핵심 이슈 대응", reason: "매출·재고·경쟁사 신호 중 오늘 결정이 필요한 항목을 묶었습니다." },
    { key: "launch", goal: "다음 주 프로모션 실행 준비", reason: "기획 이후 누락되기 쉬운 디자인·세팅·검수 업무를 연결했습니다." },
    { key: "report", goal: "주간 성과 공유", reason: "숫자 확인부터 보고서 공유까지 필요한 흐름을 묶었습니다." },
  ],
  tasks: [
    { title: "A 립밤 추가 발주 여부 결정", description: "재고 4일분과 리드타임 7일을 함께 검토", category: "재고/발주", priority: "HIGH", dueAt: date("2026-10-21T11:00:00+09:00"), dueLabel: "오늘 11:00", status: "진행중", aiExecutable: false, source: "SYSTEM_SIGNAL", reason: "입고 전 품절 가능성이 높아 오늘 결정이 필요합니다.", groupKey: "morning" },
    { title: "B사 립 20% 할인 대응안 확인", description: "실구매가와 중복 프로모션 기간 비교", category: "경쟁사", priority: "HIGH", dueAt: date("2026-10-21T14:00:00+09:00"), dueLabel: "오늘 14:00", status: "대기", aiExecutable: true, source: "AI_INFERRED", reason: "자사 행사와 4일 겹쳐 영향을 함께 확인해야 합니다.", groupKey: "morning" },
    { title: "립오일 추가 발주 수량 검토", description: "최근 7일 판매 속도와 11월 기획전 수요 반영", category: "재고/발주", priority: "MEDIUM", dueAt: date("2026-10-21T16:00:00+09:00"), dueLabel: "오늘 16:00", status: "대기", aiExecutable: true, source: "AI_INFERRED", reason: "검색 관심도 상승과 프로모션 일정이 함께 있어 행사 전 재고 확인이 필요합니다.", groupKey: "morning" },
    { title: "립오일 집중전 대상 SKU 확정", description: "판매·마진·재고를 기준으로 8개 SKU 확정", category: "프로모션", priority: "HIGH", dueAt: date("2026-10-22T10:30:00+09:00"), dueLabel: "내일 10:30", status: "진행중", aiExecutable: false, source: "USER_INPUT", reason: "디자인 브리프 전에 상품 구성이 확정되어야 합니다.", groupKey: "launch" },
    { title: "프로모션 디자인 브리프 전달", description: "핵심 메시지·규격·필수 고지 포함", category: "협업 요청", priority: "HIGH", dueAt: date("2026-10-22T15:00:00+09:00"), dueLabel: "내일 15:00", status: "대기", aiExecutable: true, source: "AI_INFERRED", reason: "10월 23일 시안 마감을 맞추려면 사전 전달이 필요합니다.", groupKey: "launch" },
    { title: "CRM 세그먼트 조건 확인", description: "최근 90일 립 구매자와 관심 고객 중복 제외", category: "마케팅", priority: "MEDIUM", dueAt: date("2026-10-23T13:00:00+09:00"), dueLabel: "10/23 13:00", status: "대기", aiExecutable: true, source: "AI_INFERRED", reason: "동일 고객에게 메시지가 중복 발송되는 것을 방지하기 위해 추가했습니다.", groupKey: "launch" },
    { title: "지난주 매출 이상 구간 확인", description: "10/17 메이크업 하락과 유입·구매전환율 함께 확인", category: "매출 분석", priority: "MEDIUM", dueAt: date("2026-10-21T10:00:00+09:00"), dueLabel: "오늘 10:00", status: "완료", aiExecutable: true, source: "USER_INPUT", reason: "주간 보고서의 하락 원인을 단정하지 않고 근거를 정리하기 위한 업무입니다.", groupKey: "report" },
    { title: "주간 MD 리포트 초안 작성", description: "성과 기여 요인과 다음 액션 포함", category: "성과", priority: "MEDIUM", dueAt: date("2026-10-22T17:00:00+09:00"), dueLabel: "내일 17:00", status: "대기", aiExecutable: true, source: "AI_INFERRED", reason: "금요일 회의 전에 검토 시간을 확보하기 위해 추가했습니다.", groupKey: "report" },
    { title: "C 세럼 입고 수량 확인", description: "입고 500개 검수 결과 SCM 공유", category: "재고/발주", priority: "LOW", dueAt: date("2026-10-20T15:00:00+09:00"), dueLabel: "어제 15:00", status: "완료", aiExecutable: false, source: "SYSTEM_SIGNAL", reason: "입고 완료 후 수량 확인 업무입니다.", groupKey: "morning" },
  ],
  brands: [
    { key: "a", name: "A 뷰티", status: "성장" },
    { key: "b", name: "B 코스메틱", status: "안정" },
    { key: "c", name: "C 더마", status: "성장" },
    { key: "d", name: "D 클린", status: "관리 필요" },
    { key: "e", name: "E 컬러랩", status: "신규" },
    { key: "f", name: "F 헤어", status: "안정" },
  ],
  products: [
    { key: "lipbalm", name: "A 립밤", category: "립", lifecycle: "성장", revenue: 165000000, salesQty: 6320, marginRate: 34.2, risk: "품절 위험", brandKey: "a" },
    { key: "lipoil", name: "A 글로우 립오일", category: "립", lifecycle: "신규", revenue: 104000000, salesQty: 3940, marginRate: 36.1, risk: "SKU 확장 검토", brandKey: "a" },
    { key: "cushion", name: "B 쿠션", category: "베이스", lifecycle: "안정", revenue: 128000000, salesQty: 4280, marginRate: 31.5, risk: "관찰", brandKey: "b" },
    { key: "primer", name: "B 모공 프라이머", category: "베이스", lifecycle: "안정", revenue: 64000000, salesQty: 2680, marginRate: 35.4, risk: "양호", brandKey: "b" },
    { key: "serum", name: "C 저자극 세럼", category: "스킨케어", lifecycle: "성장", revenue: 194000000, salesQty: 7020, marginRate: 38.6, risk: "주의", brandKey: "c" },
    { key: "cream", name: "C 장벽 크림", category: "스킨케어", lifecycle: "성장", revenue: 147000000, salesQty: 5180, marginRate: 37.8, risk: "양호", brandKey: "c" },
    { key: "cleanser", name: "D 약산성 클렌저", category: "클렌징", lifecycle: "감소", revenue: 55000000, salesQty: 1930, marginRate: 24.8, risk: "과재고", brandKey: "d" },
    { key: "cleansingbalm", name: "D 클렌징밤", category: "클렌징", lifecycle: "안정", revenue: 52000000, salesQty: 1640, marginRate: 29.3, risk: "관찰", brandKey: "d" },
    { key: "plumper", name: "E 볼륨 립플럼퍼", category: "립", lifecycle: "신규", revenue: 81000000, salesQty: 3160, marginRate: 39.2, risk: "품절 위험", brandKey: "e" },
    { key: "palette", name: "E 뉴트럴 아이팔레트", category: "아이", lifecycle: "신규", revenue: 68000000, salesQty: 1820, marginRate: 33.7, risk: "양호", brandKey: "e" },
    { key: "scalp", name: "F 두피 앰플", category: "헤어", lifecycle: "성장", revenue: 78000000, salesQty: 2380, marginRate: 32.4, risk: "주의", brandKey: "f" },
    { key: "hairmask", name: "F 단백질 헤어마스크", category: "헤어", lifecycle: "감소", revenue: 48000000, salesQty: 1560, marginRate: 27.6, risk: "과재고", brandKey: "f" },
  ],
  inventory: [
    { productKey: "lipbalm", stockQty: 720, dailySales: 180, stockDays: 4, leadTimeDays: 7, safetyStock: 540, expectedStockoutDate: date("2026-10-25T09:00:00+09:00"), status: "발주 필요", recommendedOrderQty: 1200, orderStatus: "미발주" },
    { productKey: "lipoil", stockQty: 684, dailySales: 76, stockDays: 9, leadTimeDays: 8, safetyStock: 304, expectedStockoutDate: date("2026-10-30T09:00:00+09:00"), status: "관찰", recommendedOrderQty: 500, orderStatus: "미발주" },
    { productKey: "cushion", stockQty: 570, dailySales: 95, stockDays: 6, leadTimeDays: 10, safetyStock: 380, expectedStockoutDate: date("2026-10-27T09:00:00+09:00"), status: "주의", recommendedOrderQty: 700, orderStatus: "미발주" },
    { productKey: "primer", stockQty: 1176, dailySales: 49, stockDays: 24, leadTimeDays: 9, safetyStock: 196, expectedStockoutDate: date("2026-11-14T09:00:00+09:00"), status: "안정", recommendedOrderQty: 0, orderStatus: "미발주" },
    { productKey: "serum", stockQty: 558, dailySales: 62, stockDays: 9, leadTimeDays: 12, safetyStock: 248, expectedStockoutDate: date("2026-10-30T09:00:00+09:00"), status: "주의", recommendedOrderQty: 500, orderStatus: "미발주" },
    { productKey: "cream", stockQty: 882, dailySales: 49, stockDays: 18, leadTimeDays: 11, safetyStock: 196, expectedStockoutDate: date("2026-11-08T09:00:00+09:00"), status: "안정", recommendedOrderQty: 0, orderStatus: "미발주" },
    { productKey: "cleanser", stockQty: 1260, dailySales: 28, stockDays: 45, leadTimeDays: 6, safetyStock: 112, expectedStockoutDate: date("2026-12-05T09:00:00+09:00"), status: "과재고", recommendedOrderQty: 0, orderStatus: "보류" },
    { productKey: "cleansingbalm", stockQty: 840, dailySales: 30, stockDays: 28, leadTimeDays: 7, safetyStock: 120, expectedStockoutDate: date("2026-11-18T09:00:00+09:00"), status: "안정", recommendedOrderQty: 0, orderStatus: "미발주" },
    { productKey: "plumper", stockQty: 532, dailySales: 76, stockDays: 7, leadTimeDays: 9, safetyStock: 304, expectedStockoutDate: date("2026-10-28T09:00:00+09:00"), status: "발주 필요", recommendedOrderQty: 800, orderStatus: "미발주" },
    { productKey: "palette", stockQty: 756, dailySales: 36, stockDays: 21, leadTimeDays: 10, safetyStock: 144, expectedStockoutDate: date("2026-11-11T09:00:00+09:00"), status: "안정", recommendedOrderQty: 0, orderStatus: "미발주" },
    { productKey: "scalp", stockQty: 484, dailySales: 44, stockDays: 11, leadTimeDays: 14, safetyStock: 176, expectedStockoutDate: date("2026-11-01T09:00:00+09:00"), status: "주의", recommendedOrderQty: 600, orderStatus: "미발주" },
    { productKey: "hairmask", stockQty: 1352, dailySales: 26, stockDays: 52, leadTimeDays: 8, safetyStock: 104, expectedStockoutDate: date("2026-12-12T09:00:00+09:00"), status: "과재고", recommendedOrderQty: 0, orderStatus: "보류" },
  ],
  marketKeywords: [
    { keyword: "립오일", monthlyVolume: 48200, yearOverYear: 109, judgment: "진짜 상승", currentIndex: 92, tenWeeksChange: 70, risingSince: "8월 4주", weeklySeries: JSON.stringify([22, 28, 34, 41, 53, 65, 74, 84, 89, 92]) },
    { keyword: "립플럼퍼", monthlyVolume: 31900, yearOverYear: 82, judgment: "진짜 상승", currentIndex: 81, tenWeeksChange: 47, risingSince: "9월 1주", weeklySeries: JSON.stringify([34, 37, 41, 45, 48, 57, 64, 72, 78, 81]) },
    { keyword: "장벽 크림", monthlyVolume: 67400, yearOverYear: 41, judgment: "진짜 상승", currentIndex: 78, tenWeeksChange: 29, risingSince: "9월 2주", weeklySeries: JSON.stringify([49, 51, 54, 57, 61, 65, 69, 73, 76, 78]) },
    { keyword: "쿠션", monthlyVolume: 112000, yearOverYear: 12, judgment: "시즌성", currentIndex: 69, tenWeeksChange: 8, risingSince: "9월 3주", weeklySeries: JSON.stringify([61, 58, 55, 57, 60, 63, 66, 71, 73, 69]) },
    { keyword: "저자극 세럼", monthlyVolume: 27500, yearOverYear: 24, judgment: "관찰", currentIndex: 63, tenWeeksChange: 17, risingSince: "9월 2주", weeklySeries: JSON.stringify([46, 48, 47, 51, 52, 55, 58, 61, 64, 63]) },
    { keyword: "두피 앰플", monthlyVolume: 18400, yearOverYear: 18, judgment: "관찰", currentIndex: 57, tenWeeksChange: 11, risingSince: "9월 4주", weeklySeries: JSON.stringify([46, 45, 48, 49, 50, 52, 55, 56, 58, 57]) },
    { keyword: "헤어 마스크", monthlyVolume: 35600, yearOverYear: -9, judgment: "하락", currentIndex: 43, tenWeeksChange: -12, risingSince: "-", weeklySeries: JSON.stringify([55, 54, 53, 51, 50, 49, 47, 46, 44, 43]) },
  ],
  marketTrends: [
    { title: "립오일 관심 증가", event: "립오일 검색 관심도가 7주 연속 상승", impact: "자사 관련 SKU 3개, A 글로우 립오일 재고 9일", recommendation: "추가 발주와 신규 브랜드 소싱을 함께 검토", evidence: "네이버 데이터랩 검색 관심도 전년 동기 대비 +109%; 검색광고 월 검색량 48,200회" },
    { title: "30대 립 관심 비중 확대", event: "30대 관심 비중이 작년 24%에서 올해 32%로 변화", impact: "기존 20대 중심 메시지의 확장 가능성", recommendation: "보습·광택 중심 30대 메시지 A/B안 기획", evidence: "연령별 검색 관심 비중 +8%p" },
    { title: "장벽 크림 수요 확대", event: "환절기 진입 후 장벽 크림 월 검색량이 67,400회로 증가", impact: "C 장벽 크림 최근 30일 매출 1.47억원", recommendation: "세럼과 묶은 장벽 케어 세트 검토", evidence: "월 검색량 전년 대비 +41%; 자사 재고 18일" },
    { title: "헤어 마스크 관심 둔화", event: "헤어 마스크 검색 관심도가 6주 연속 완만하게 하락", impact: "F 헤어마스크 재고 52일로 과재고 상태", recommendation: "추가 발주 보류와 소진 프로모션 검토", evidence: "검색 관심도 10주 전 대비 -12; 재고 1,352개" },
  ],
  articles: [
    { publisher: "뷰티인사이트", publishedAt: date("2026-10-21T08:20:00+09:00"), title: "가을 립 시장, 오일·플럼핑 제형 관심 확대", summary: "보습과 광택 니즈가 동시에 늘며 립오일 신제품 출시가 증가하고 있습니다.", recommendationWhy: "자사 립 SKU 구성과 11월 프로모션 기획에 직접 참고할 수 있습니다." },
    { publisher: "커머스데일리", publishedAt: date("2026-10-21T07:45:00+09:00"), title: "뷰티 플랫폼 블랙프라이데이 일정 공개", summary: "주요 플랫폼 행사가 11월 첫째 주부터 순차적으로 시작될 예정입니다.", recommendationWhy: "자사 프로모션과 경쟁사 할인 일정 중복을 미리 점검할 수 있습니다." },
    { publisher: "리테일뷰", publishedAt: date("2026-10-20T17:10:00+09:00"), title: "환절기 스킨케어, 장벽 케어 검색량 증가", summary: "저자극과 장벽 회복 키워드를 함께 강조한 상품의 노출이 늘고 있습니다.", recommendationWhy: "C 세럼·장벽 크림 묶음 구성을 검토할 근거가 됩니다." },
    { publisher: "브랜드브리프", publishedAt: date("2026-10-20T14:30:00+09:00"), title: "라이브커머스 뷰티 객단가 상승", summary: "단독 세트와 방송 한정 사은품을 결합한 구성이 객단가 상승에 함께 관찰됐습니다.", recommendationWhy: "A 브랜드데이의 혜택 구조를 점검하는 데 참고할 수 있습니다." },
  ],
  competitors: [
    { key: "a", name: "A사" },
    { key: "b", name: "B사" },
    { key: "c", name: "C사" },
    { key: "d", name: "D사" },
  ],
  competitorEvents: [
    { competitorKey: "b", type: "할인", title: "B사 립 전 상품 20% 할인", detail: "회원 쿠폰 포함 시 대표 틴트 실구매가 15,900원", impactEstimate: -6800000, affectedSkuCount: 14, overlapDescription: "자사 립 기획전과 4일 겹침", startAt: date("2026-10-20T00:00:00+09:00"), endAt: date("2026-10-26T23:59:00+09:00") },
    { competitorKey: "c", type: "신상품", title: "C사 저자극 세럼 신상품 출시", detail: "민감성·장벽 케어 메시지, 30ml 28,000원", impactEstimate: -2100000, affectedSkuCount: 6, overlapDescription: "C 저자극 세럼과 핵심 효능 메시지 유사", startAt: date("2026-10-18T00:00:00+09:00"), endAt: date("2026-11-15T23:59:00+09:00") },
    { competitorKey: "a", type: "프로모션", title: "A사 라이브커머스 단독 세트", detail: "립 2종 세트 25%와 사은품 제공", impactEstimate: -3600000, affectedSkuCount: 9, overlapDescription: "10월 24일 저녁 CRM 발송 시간과 겹침", startAt: date("2026-10-24T19:00:00+09:00"), endAt: date("2026-10-24T21:00:00+09:00") },
    { competitorKey: "d", type: "가격", title: "D사 클렌저 묶음 가격 변경", detail: "2개 세트 단위가격이 자사보다 11% 낮음", impactEstimate: -1400000, affectedSkuCount: 4, overlapDescription: "D 약산성 클렌저 과재고 소진 계획과 비교 필요", startAt: date("2026-10-19T00:00:00+09:00"), endAt: date("2026-10-31T23:59:00+09:00") },
  ],
  promotions: [
    { name: "립오일·플럼핑 집중전", goal: "성장 검색 수요를 신규 매출로 전환", period: "11/03–11/09", targetSkus: "A 글로우 립오일 외 7개", benefit: "세트 12% + 앱 쿠폰", budget: 18000000, expectedEffect: "추가 매출 2,100만원", collaboration: "디자인, 마케팅, SCM", deliverables: "PC/MO 배너, CRM, 상품 묶음", rationale: "검색 관심도 +109%, 자사 립오일 매출 +26%, 플럼핑 니즈 +82%", stage: "아이디어" },
    { name: "블프 선제 방어전", goal: "경쟁사 행사 기간 매출 하락 방어", period: "11/06–11/20", targetSkus: "립·쿠션 핵심 14개", benefit: "선착순 쿠폰 + 단독 세트", budget: 25000000, expectedEffect: "추가 매출 1,800만원", collaboration: "마케팅, 디자인", deliverables: "기획전 페이지, 광고 소재", rationale: "작년 같은 시기 할인 이력과 금주 B사 할인 시작이 함께 관찰됨", stage: "기획" },
    { name: "A 브랜드데이", goal: "브랜드 성장세 확대", period: "10/28–11/01", targetSkus: "A 브랜드 12개", benefit: "최대 18% + GWP", budget: 12000000, expectedEffect: "매출 +24%", collaboration: "디자인, 브랜드사", deliverables: "브랜드관, 배너, 라이브 소재", rationale: "최근 4주 A 브랜드 매출 +18%", stage: "디자인" },
    { name: "장벽 케어 루틴전", goal: "환절기 스킨케어 수요 확보", period: "10/24–10/31", targetSkus: "C 세럼·크림 외 6개", benefit: "2개 구매 시 15%", budget: 9000000, expectedEffect: "추가 매출 1,400만원", collaboration: "마케팅, SCM", deliverables: "세트 구성, CRM", rationale: "장벽 크림 월 검색량 전년 대비 +41%, 스킨케어 매출 +13%", stage: "세팅" },
    { name: "클렌징 재고 소진전", goal: "45일 이상 재고의 건전성 개선", period: "10/12–10/18", targetSkus: "D 클렌저 외 4개", benefit: "2개 세트 20%", budget: 6000000, expectedEffect: "재고일수 8일 감소", collaboration: "마케팅", deliverables: "세트 딜, 앱 배너", rationale: "D 클렌저 재고 45일, 검색 관심도 보합", stage: "완료" },
  ],
  calendarEvents: [
    { title: "주간 상품 운영 회의", type: "회의", startAt: date("2026-10-21T10:30:00+09:00"), endAt: date("2026-10-21T11:20:00+09:00"), status: "예정", description: "매출·재고·경쟁사 주요 이슈 결정" },
    { title: "A 립밤 발주 마감", type: "발주", startAt: date("2026-10-21T14:00:00+09:00"), endAt: date("2026-10-21T14:30:00+09:00"), status: "예정", description: "SCM 당일 발주 접수 마감" },
    { title: "립오일 집중전 디자인 브리프", type: "협업 요청", startAt: date("2026-10-22T15:00:00+09:00"), endAt: date("2026-10-22T15:30:00+09:00"), status: "예정", description: "디자인팀 브리프 전달 및 일정 합의" },
    { title: "프로모션 배너 1차 시안 마감", type: "마감", startAt: date("2026-10-23T13:00:00+09:00"), endAt: date("2026-10-23T14:00:00+09:00"), status: "예정", description: "PC/MO 배너 1차 시안 수신" },
    { title: "CRM 세그먼트 최종 세팅", type: "마감", startAt: date("2026-10-23T13:30:00+09:00"), endAt: date("2026-10-23T14:30:00+09:00"), status: "예정", description: "립 관심 고객 세그먼트 확정" },
    { title: "C 세럼 500개 입고", type: "입고", startAt: date("2026-10-24T14:00:00+09:00"), endAt: date("2026-10-24T15:00:00+09:00"), status: "예정", description: "입고 수량과 유통기한 검수" },
    { title: "A 브랜드데이", type: "프로모션", startAt: date("2026-10-28T00:00:00+09:00"), endAt: date("2026-11-01T23:59:00+09:00"), status: "예정", description: "A 브랜드 통합 행사" },
    { title: "립오일·플럼핑 집중전", type: "프로모션", startAt: date("2026-11-03T09:00:00+09:00"), endAt: date("2026-11-09T23:59:00+09:00"), status: "예정", description: "검색 수요 상승 대응 집중전" },
  ],
  collaborationRequests: [
    { title: "립오일 집중전 배너 제작", team: "디자인", owner: "김OO", dueAt: date("2026-10-23T13:00:00+09:00"), status: "진행", purpose: "립오일·플럼핑 성장 신호를 행사 메시지에 반영", deliverable: "PC/MO 배너 각 2종", reference: "립오일 집중전 기획안", requestText: "검색 관심도 상승과 광택·플럼핑 메시지를 반영한 PC/MO 배너 제작을 요청드립니다." },
    { title: "A 립밤 발주 승인", team: "SCM", owner: "박OO", dueAt: date("2026-10-21T14:00:00+09:00"), status: "승인 대기", purpose: "입고 전 품절 가능성 축소", deliverable: "1,200개 발주 승인", reference: "재고/발주 AI 권장", requestText: "A 립밤 1,200개 발주 승인 요청드립니다. 현재 재고는 4일분이고 리드타임은 7일입니다." },
    { title: "장벽 케어전 CRM 발송", team: "마케팅", owner: "이OO", dueAt: date("2026-10-23T16:00:00+09:00"), status: "진행", purpose: "환절기 스킨케어 관심 고객 유입", deliverable: "앱푸시·알림톡 각 1종", reference: "장벽 케어 루틴전 기획안", requestText: "최근 스킨케어 관심 고객을 대상으로 장벽 케어 세트 혜택 발송을 요청드립니다." },
    { title: "립 세트 필수 고지 검토", team: "법무", owner: "최OO", dueAt: date("2026-10-26T11:00:00+09:00"), status: "대기", purpose: "세트 할인과 사은품 고지 문구 확인", deliverable: "고지 문구 검토 의견", reference: "A 브랜드데이 혜택안", requestText: "세트 할인율과 사은품 소진 시 안내 문구의 법무 검토를 요청드립니다." },
  ],
  reports: [
    { title: "2026년 9월 MD 성과 리포트", period: "2026-09", achievement: 96, summary: "스킨케어와 A 브랜드데이가 성장을 이끌었고 메이크업은 경쟁사 할인 시점과 하락이 함께 관찰됐습니다.", wins: "스킨케어 세트 매출 +31%; A 브랜드데이 +2.8%p 기여", misses: "메이크업 -1.5%p; 품절 손실 -0.8%p", nextActions: "립 실구매가 모니터링; 품절 위험 SKU 조기 발주" },
    { title: "2026년 10월 2주차 MD 주간 리포트", period: "2026-W42", achievement: 101, summary: "립오일과 장벽 케어가 목표 초과에 기여했고 클렌징은 과재고 부담이 이어졌습니다.", wins: "립오일 매출 +26%; 장벽 크림 매출 +18%", misses: "클렌징 매출 -7%; B 쿠션 재고일수 6일", nextActions: "립오일 행사 물량 확보; 클렌징 소진안 실행" },
  ],
  knowledge: [
    { title: "2025.10 립 기획전 성과 리포트", type: "성과", content: "립 기획전 매출 +24%, 객단가 +12%. 단품보다 세트상품 반응이 우수했고 오후 8시 CRM 유입의 구매전환율이 높았습니다.", source: "성과 분석", tags: "립,프로모션,성과" },
    { title: "A 브랜드 상품 운영 가이드", type: "브랜드", content: "핵심 립 SKU의 기본 리드타임은 7일이며 판매 급증기에는 안전재고 3일분을 권장합니다.", source: "브랜드 운영 문서", tags: "A브랜드,발주,재고" },
    { title: "2026 블랙프라이데이 사전 회의록", type: "회의", content: "11월 첫째 주부터 경쟁사 모니터링을 강화하고 가격 대응보다 단독 세트 차별화를 우선 검토합니다.", source: "회의록", tags: "블랙프라이데이,경쟁사,프로모션" },
    { title: "2026.08 장벽 케어 세트 성과", type: "성과", content: "세럼과 크림 세트는 단품 동시 구매보다 객단가가 17% 높았습니다. 민감성 피부 메시지보다 환절기 장벽 루틴 메시지의 클릭률이 높았습니다.", source: "프로모션 성과 분석", tags: "스킨케어,세트,장벽" },
    { title: "B사 가격 모니터링 기록", type: "리서치", content: "B사는 2025년과 2026년 모두 10월 셋째 주에 립 할인을 진행했습니다. 반복 가능성은 있으나 기간과 할인율은 매년 달랐습니다.", source: "경쟁사 모니터링", tags: "B사,가격,립" },
    { title: "클렌징 재고 소진 회고", type: "의사결정", content: "할인율을 높인 단품 행사보다 클렌저와 클렌징밤을 묶은 루틴 세트가 마진 방어와 재고 소진에 더 유리했습니다.", source: "MD 의사결정 기록", tags: "클렌징,재고,세트" },
  ],
  insights: [
    { type: "INVENTORY", title: "A 립밤 입고 전 품절 가능성", interpretation: "현재 판매 속도가 유지되면 4일 뒤 재고가 소진될 수 있습니다.", impact: "리드타임 7일로 예상 품절일보다 입고가 늦습니다.", evidence: "재고 720개 · 일평균 판매 180개 · 안전재고 540개", actionLabel: "발주 검토", actionTarget: "/inventory", severity: "CRITICAL" },
    { type: "MARKET", title: "립오일 검색 관심 증가", interpretation: "단기 이슈보다 7주 연속 상승 흐름이 관찰됩니다.", impact: "자사 관련 SKU가 3개뿐이라 구색 확대 기회가 있습니다.", evidence: "검색 관심도 전년 대비 +109% · 월 검색량 48,200회", actionLabel: "상세 분석", actionTarget: "/market", severity: "HIGH" },
    { type: "COMPETITOR", title: "B사 립 20% 할인 시작", interpretation: "자사 립 기획전과 행사 기간이 일부 겹칩니다.", impact: "직접 경쟁 SKU 14개의 주 매출 영향은 -680만원으로 추정됩니다.", evidence: "대표 상품 실구매가 자사 18,000원 · 경쟁사 15,900원", actionLabel: "대응안 보기", actionTarget: "/competitors", severity: "HIGH" },
    { type: "INVENTORY", title: "F 헤어마스크 재고 52일", interpretation: "최근 판매 속도 기준으로 두 달 가까운 재고가 남아 있습니다.", impact: "추가 발주보다 기존 재고 소진이 우선입니다.", evidence: "재고 1,352개 · 일평균 판매 26개 · 검색 관심도 하락", actionLabel: "소진안 검토", actionTarget: "/inventory", severity: "MEDIUM" },
  ],
  notifications: [
    { title: "A 립밤 재고 경고", detail: "재고가 4일분 남았습니다.", target: "/inventory" },
    { title: "경쟁사 할인 감지", detail: "B사 립 카테고리 20% 할인이 시작됐습니다.", target: "/competitors" },
    { title: "오늘 발주 마감", detail: "14:00까지 A 립밤 발주 여부를 결정해야 합니다.", target: "/tasks" },
    { title: "일정 충돌 감지", detail: "10/23 배너 시안과 CRM 세팅 시간이 겹칩니다.", target: "/calendar" },
  ],
};

const salesStart = date("2026-08-23T12:00:00+09:00");
const revenueWave = [0, 1600000, -700000, 2300000, 900000, 3900000, 4800000];
const orderWave = [0, 35, -10, 50, 18, 70, 82];
const visitorWave = [0, 700, -250, 950, 300, 1400, 1750];

export const salesSeries = Array.from({ length: 60 }, (_, index) => {
  const currentPeriod = index >= 30;
  const periodIndex = currentPeriod ? index - 30 : index;
  return {
    date: new Date(salesStart.getTime() + index * 24 * 60 * 60 * 1000),
    category: "뷰티 전체",
    revenue: (currentPeriod ? 35100000 : 31800000) + periodIndex * (currentPeriod ? 180000 : 130000) + revenueWave[index % 7],
    orders: (currentPeriod ? 920 : 870) + periodIndex * (currentPeriod ? 6 : 5) + orderWave[index % 7],
    visitors: (currentPeriod ? 16200 : 15100) + periodIndex * (currentPeriod ? 55 : 42) + visitorWave[index % 7],
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
    { product: "클렌저 150ml", ours: 16800, competitor: 14900 },
  ],
  promotionHistory: [
    { period: "2025.10", competitor: "B사", event: "립 20% 할인", duration: "7일", note: "올해 반복 여부 모니터링 필요" },
    { period: "2026.03", competitor: "B사", event: "봄 메이크업 위크", duration: "10일", note: "쿠폰 중복 적용" },
    { period: "2026.07", competitor: "C사", event: "저자극 세럼 1+1", duration: "5일", note: "신규회원 한정" },
    { period: "2026.09", competitor: "A사", event: "라이브 단독 세트", duration: "2시간", note: "사은품 조기 소진" },
  ],
  promotionPerformance: {
    attributedRevenue: 94200000,
    spend: 30000000,
  },
};
