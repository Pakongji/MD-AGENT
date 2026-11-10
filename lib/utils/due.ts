/**
 * 업무 마감 문구 ↔ 실제 마감 시각 변환. 모든 날짜는 한국 시간(KST) 기준입니다.
 * 저장된 문구("내일 10:30")는 만든 날 기준이라 시간이 지나면 틀려지므로,
 * 화면에는 항상 실제 마감 시각(dueAt)에서 다시 계산한 문구를 보여줍니다.
 */
const DAY = 86_400_000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DEFAULT_HOUR = 18;

function kstYmd(date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date).map((part) => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}
function kstMidnight(year: number, month: number, day: number) {
  return Date.parse(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+09:00`);
}
const weekdayOf = (midnight: number) => new Date(midnight + 9 * 3_600_000).getUTCDay();

function timeOf(text: string): { hour: number; minute: number } | null {
  const clock = text.match(/(?<!\d)(\d{1,2}):(\d{2})(?!\d)/);
  if (clock) return { hour: Number(clock[1]), minute: Number(clock[2]) };
  const korean = text.match(/(오전|오후|저녁|밤|아침)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?/);
  if (!korean) return null;
  let hour = Number(korean[2]);
  const meridiem = korean[1];
  if ((meridiem === "오후" || meridiem === "저녁" || meridiem === "밤") && hour < 12) hour += 12;
  if ((meridiem === "오전" || meridiem === "아침") && hour === 12) hour = 0;
  // "3시까지"처럼 오전/오후가 없고 업무 시간이 아닌 숫자는 오후로 봅니다.
  if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
  return { hour, minute: korean[4] ? 30 : Number(korean[3] ?? 0) };
}

/** 마감 문구를 실제 시각으로 바꿉니다. 날짜·시간 단서가 없으면 null입니다. */
export function parseDueText(text: string, now = new Date()): Date | null {
  const value = text.replace(/\s+/g, " ").trim();
  const today = kstYmd(now);
  const todayMidnight = kstMidnight(today.year, today.month, today.day);
  const time = timeOf(value);
  let midnight: number | null = null;

  const monthDay = value.match(/(?<!\d)(\d{1,2})\s*(?:월\s*|\/|\.\s*)(\d{1,2})\s*일?(?!\d|:)/);
  const weekday = value.match(/(다음\s*주\s*)?([월화수목금토일])요일/);
  if (monthDay) {
    let candidate = kstMidnight(today.year, Number(monthDay[1]), Number(monthDay[2]));
    if (candidate < todayMidnight - 60 * DAY) candidate = kstMidnight(today.year + 1, Number(monthDay[1]), Number(monthDay[2]));
    midnight = candidate;
  } else if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[2]);
    const current = weekdayOf(todayMidnight);
    // "다음 주 X요일"은 다음 주 월요일을 기준으로, 그냥 "X요일"은 오늘 이후 가장 가까운 X요일입니다.
    const diff = weekday[1] ? ((8 - current) % 7 || 7) + (target + 6) % 7 : (target - current + 7) % 7;
    midnight = todayMidnight + diff * DAY;
  } else if (/모레/.test(value)) midnight = todayMidnight + 2 * DAY;
  else if (/내일/.test(value)) midnight = todayMidnight + DAY;
  else if (/어제/.test(value)) midnight = todayMidnight - DAY;
  else if (/이번\s*주/.test(value)) midnight = todayMidnight + Math.max(0, 5 - weekdayOf(todayMidnight)) * DAY;
  else if (/오늘/.test(value) || time) midnight = todayMidnight;

  if (midnight === null || !Number.isFinite(midnight)) return null;
  const { hour, minute } = time ?? { hour: DEFAULT_HOUR, minute: 0 };
  return new Date(midnight + hour * 3_600_000 + minute * 60_000);
}

/**
 * 저장용 마감 시각. 시간을 말하지 않은 마감(예: "오늘")이 이미 지난 시각으로 계산되면
 * 만들자마자 기한 초과가 되므로 그날 23:59로 둡니다. 시간을 명시한 경우("오늘 오전 11시")는 그대로 둡니다.
 */
export function dueForStorage(label: string, now = new Date(), fallbackHour = DEFAULT_HOUR): Date {
  const parsed = parseDueText(label, now);
  const today = kstYmd(now);
  const base = parsed ?? new Date(kstMidnight(today.year, today.month, today.day) + fallbackHour * 3_600_000);
  if (base.getTime() >= now.getTime() || timeOf(label)) return base;
  const d = kstYmd(base);
  const endOfDay = kstMidnight(d.year, d.month, d.day) + 23 * 3_600_000 + 59 * 60_000;
  return endOfDay >= now.getTime() ? new Date(endOfDay) : base;
}

const hhmm = (date: Date) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);

/** 실제 마감 시각을 지금 기준 문구로 바꿉니다. 예: 기한 지남 · 10. 22. / 오늘 18:00 / 내일 14:00 / 11. 20.(금) 10:00 */
export function relativeDueLabel(dueAt: string | Date, now = new Date()) {
  const due = new Date(dueAt);
  if (due.getTime() < now.getTime()) { const d = kstYmd(due); return `기한 지남 · ${d.month}. ${d.day}.`; }
  return scheduleLabel(due, now);
}

/** 계획용 마감 문구(지났는지 따지지 않음). 예: 오늘 15:00 / 내일 14:00 / 11. 6.(금) 18:00 */
export function scheduleLabel(dueAt: string | Date, now = new Date()) {
  const due = new Date(dueAt);
  const d = kstYmd(due);
  const n = kstYmd(now);
  const days = Math.round((kstMidnight(d.year, d.month, d.day) - kstMidnight(n.year, n.month, n.day)) / DAY);
  if (days === 0) return `오늘 ${hhmm(due)}`;
  if (days === 1) return `내일 ${hhmm(due)}`;
  return `${d.month}. ${d.day}.(${WEEKDAYS[weekdayOf(kstMidnight(d.year, d.month, d.day))]}) ${hhmm(due)}`;
}

/** 문구가 날짜·시간을 뜻하는지(= dueAt에서 다시 계산해야 하는지) 판단합니다. */
export function isDateLikeLabel(label: string) {
  return /오늘|내일|모레|어제|요일|이번\s*주|\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*시|\d{1,2}\s*[./월]\s*\d{1,2}/.test(label);
}

/** 화면·AI 답변에 쓰는 마감 표시. "결정 재검토" 같은 단계 문구는 살리고 날짜만 다시 계산합니다. */
export function dueDisplay(task: { dueAt?: string | null; dueLabel?: string | null; status?: string }, now = new Date()) {
  const label = task.dueLabel?.trim() ?? "";
  if (!task.dueAt) return label || "마감 없음";
  if (task.status === "완료") {
    const d = kstYmd(new Date(task.dueAt));
    return label && !isDateLikeLabel(label) ? label : `${d.month}. ${d.day}. 마감`;
  }
  const relative = relativeDueLabel(task.dueAt, now);
  return label && !isDateLikeLabel(label) ? `${label} · ${relative}` : relative;
}

/** 다음 영업일(주말 제외) 지정 시각(KST). 거래처 회신처럼 주말에 오지 않는 마감에 씁니다. */
export function nextBusinessDay(now = new Date(), hour = DEFAULT_HOUR) {
  const today = kstYmd(now);
  let midnight = kstMidnight(today.year, today.month, today.day) + DAY;
  while ([0, 6].includes(weekdayOf(midnight))) midnight += DAY;
  return new Date(midnight + hour * 3_600_000);
}
