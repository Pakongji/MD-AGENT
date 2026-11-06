// 아직 연결되지 않은 데이터(채널별 실적, 채널별 경쟁사 가격)를 화면에서 보여주기 위한 샘플 값입니다.
// 실제 데이터를 연결하면 이 파일 대신 연결된 데이터 소스를 사용하도록 교체합니다.

export const CHANNELS = ["전체", "쿠팡", "올리브영", "자사몰", "네이버"] as const;
export type Channel = (typeof CHANNELS)[number];

export interface ChannelSample {
  channel: Exclude<Channel, "전체">;
  share: number; // 매출 비중 (0~1)
  changeRate: number; // 직전 기간 대비 %
  conversionRate: number; // 구매 전환율 %
  note: string;
  alert?: boolean;
}

export const CHANNEL_SAMPLES: ChannelSample[] = [
  { channel: "쿠팡", share: 0.42, changeRate: 8.3, conversionRate: 3.1, note: "A 립밤 판매가 매출을 끌어올림" },
  { channel: "올리브영", share: 0.29, changeRate: -12, conversionRate: 2.4, note: "B사 20% 할인 기간과 겹침 (추정)", alert: true },
  { channel: "자사몰", share: 0.18, changeRate: 3.2, conversionRate: 1.8, note: "" },
  { channel: "네이버", share: 0.11, changeRate: 1.1, conversionRate: 2, note: "" },
];

export function channelShare(channel: Channel) {
  if (channel === "전체") return 1;
  return CHANNEL_SAMPLES.find((item) => item.channel === channel)?.share ?? 1;
}

export interface PriceComparisonSample {
  channel: Exclude<Channel, "전체" | "자사몰">;
  competitorPrice: number;
  ourPrice: number;
  competitorEvent: string;
}

export const PRICE_COMPARISON_SAMPLE = {
  competitorProduct: "B사 대표 립 틴트",
  ourProduct: "A 글로우 립오일",
  basis: "같은 용량 · 쿠폰 적용 후 가격",
  rows: [
    { channel: "올리브영", competitorPrice: 15900, ourPrice: 17800, competitorEvent: "20% 할인 진행 중" },
    { channel: "쿠팡", competitorPrice: 16500, ourPrice: 16200, competitorEvent: "상시가" },
    { channel: "네이버", competitorPrice: 16900, ourPrice: 17500, competitorEvent: "쿠폰 행사" },
  ] satisfies PriceComparisonSample[],
};

export interface DataSourceSlot {
  key: "sales" | "inventory" | "competitor" | "trend" | "calendar";
  name: string;
  method: string;
  columns: string[];
  affects: string;
  recommended?: string;
  template: boolean;
}

export const DATA_SOURCES: DataSourceSlot[] = [
  { key: "sales", name: "매출", method: "채널 어드민 엑셀 업로드 (주 1회 또는 매일)", columns: ["일자", "채널", "상품코드", "매출액", "주문수"], affects: "홈 · 매출·재고 · 기록", recommended: "추천 1순위", template: true },
  { key: "inventory", name: "재고", method: "ERP 재고 엑셀 업로드", columns: ["상품코드", "현재고", "입고예정일", "리드타임", "안전재고"], affects: "홈 · 매출·재고 · 프로모션", recommended: "추천 2순위", template: true },
  { key: "competitor", name: "경쟁사 가격", method: "비교할 상품 URL 등록 → 매일 수집", columns: ["경쟁 상품 URL", "비교할 자사 상품"], affects: "시장·경쟁 · 프로모션", template: true },
  { key: "trend", name: "검색 트렌드", method: "네이버 데이터랩 API 키 입력", columns: ["관심 키워드", "비교 기간"], affects: "홈 · 시장·경쟁", template: false },
  { key: "calendar", name: "캘린더", method: "Google 캘린더 계정 연결", columns: ["캘린더 선택"], affects: "업무", template: false },
];

// 지금은 연결된 데이터가 없어서 모든 화면이 샘플 데이터로 동작합니다.
export const CONNECTED_SOURCES: DataSourceSlot["key"][] = [];
