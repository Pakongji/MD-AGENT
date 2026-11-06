import { CHANNELS } from "@/lib/mock/samples";

export interface UnderstoodQuestion {
  intent: string;
  period: string;
  scope: string;
}

const intents: Array<[RegExp, string]> = [
  // "왜 그렇게 결정했어?"처럼 지난 결정을 묻는 질문은 주제(경쟁사·재고)보다 먼저 판별합니다.
  [/(결정|판단|보류).*(기록|이유|왜|근거)|왜.*(결정|판단|발주|보류)|지난.*결정|(결정|판단)(했|한).*(이유|배경)/, "지난 결정 확인"],
  [/(과재고|소진|악성\s*재고|재고가?\s*많|안\s*팔)/, "과재고 소진"],
  [/(재고|발주|입고|품절)/, "재고·발주 확인"],
  [/(경쟁|B사|C사|D사|A사|할인.*대응|가격.*비교)/, "경쟁사 대응"],
  [/(프로모션|기획전|행사|딜)/, "행사·프로모션 준비"],
  [/(리포트|보고서|회고)/, "보고서·회고"],
  [/(매출|실적|판매)/, "매출 확인"],
  [/(트렌드|검색|키워드)/, "시장 트렌드"],
  [/(일정|캘린더|충돌)/, "일정 확인"],
  [/(협업|요청서|디자인팀|SCM)/, "협업 요청"],
  [/(결정|보류|왜 .*했)/, "지난 결정 확인"],
  [/(업무|할 일|우선순위)/, "업무 정리"],
  [/(작년|과거|지식|사례)/, "과거 자료 찾기"],
];

const periods: Array<[RegExp, string]> = [
  [/오늘/, "오늘"], [/내일/, "내일"], [/이번\s?주/, "이번 주"], [/다음\s?주/, "다음 주"], [/지난\s?주/, "지난주"],
  [/이번\s?달/, "이번 달"], [/지난\s?달/, "지난달"], [/작년/, "작년"], [/(\d{1,2})월/, "$1월"],
];

/** 답하기 전에 질문을 어떻게 이해했는지 보여주기 위한 규칙 기반 해석입니다. */
export function understandQuestion(question: string, categories: string[] = [], productNames: string[] = []): UnderstoodQuestion {
  const intent = intents.find(([pattern]) => pattern.test(question))?.[1] ?? "일반 질문";
  const periodMatch = periods.find(([pattern]) => pattern.test(question));
  const period = periodMatch ? question.match(periodMatch[0])![0].replace(periodMatch[0], periodMatch[1]) : "최근 자료";
  const product = productNames.find((name) => question.includes(name));
  const category = categories.find((name) => name && question.includes(name));
  const channel = CHANNELS.find((name) => name !== "전체" && question.includes(name));
  const base = product ?? (category ? `${category} 카테고리` : channel ? "" : "뷰티 전체");
  const scope = [channel ? `${channel} 채널` : "", base].filter(Boolean).join(" · ");
  return { intent, period, scope };
}
