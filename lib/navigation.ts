export type NavKey = "home" | "work" | "analysis" | "market" | "promotions" | "records";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  sub: string;
  subtitle: string;
}

export const navSections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "오늘",
    items: [
      { key: "home", href: "/", label: "홈", sub: "브리핑 · AI 대화", subtitle: "오늘 판단할 것부터 보여주고, 대화로 바로 실행해요" },
      { key: "work", href: "/tasks", label: "업무", sub: "업무 · 일정 · 협업 · 업무일지", subtitle: "업무·일정·협업 요청을 한 화면에서 — 결정이 필요한 것부터" },
    ],
  },
  {
    label: "분석",
    items: [
      { key: "analysis", href: "/sales", label: "매출·재고", sub: "채널별 매출 · 재고 · 발주", subtitle: "채널별로 쪼개서 보고, 재고 위험은 바로 발주까지" },
      { key: "market", href: "/market", label: "시장·경쟁", sub: "트렌드 · 경쟁사 가격", subtitle: "시장 신호와 경쟁사 변화를 '우리에게 미치는 영향' 순으로" },
    ],
  },
  {
    label: "실행 · 기록",
    items: [
      { key: "promotions", href: "/promotions", label: "프로모션", sub: "조사 → 개요 → 확정 → 일정", subtitle: "시장 조사 → 행사 개요 → 3안 비교 → 확정 → 일정·시안까지 한 흐름으로" },
      { key: "records", href: "/records", label: "기록", sub: "결정 · 성과 · 지식", subtitle: "왜 그렇게 결정했는지, 무엇이 효과 있었는지 다시 찾기" },
    ],
  },
];

const allItems = navSections.flatMap((section) => section.items);

export const dataConnectionMeta = {
  href: "/data",
  label: "데이터 연결",
  subtitle: "지금은 샘플 데이터예요. 하나씩 연결하면 그 화면부터 실데이터로 바뀌어요",
};

export function routeMeta(pathname: string) {
  if (pathname.startsWith(dataConnectionMeta.href)) return { key: null, label: dataConnectionMeta.label, subtitle: dataConnectionMeta.subtitle };
  const match = allItems.find((item) => item.href !== "/" && pathname.startsWith(item.href)) ?? allItems[0];
  return { key: match.key, label: match.label, subtitle: match.subtitle };
}
