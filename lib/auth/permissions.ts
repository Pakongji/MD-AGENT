/**
 * 사용자 권한. 로그인한 사용자는 모든 화면을 볼 수 있고, 저장·실행은 아래 권한이 있어야 합니다.
 * 서버(/api/command 등)가 최종으로 검사하고, 화면은 같은 표를 써서 버튼을 막습니다.
 */
export const PERMISSIONS = [
  { key: "task", label: "업무", description: "업무·일정·협업 요청 추가와 수정, 리포트·지식 문서 저장" },
  { key: "decide", label: "결정", description: "결정 기록 작성·확정(승인 권한이 없으면 승인 요청으로 올라감)" },
  { key: "approve", label: "승인", description: "다른 사람의 결정 승인·반려, 내 결정은 승인 없이 바로 확정" },
  { key: "order", label: "발주", description: "발주 등록, 발주서 발송·납기 확정·입고 확인" },
  { key: "promotion", label: "프로모션", description: "프로모션 기획·단계 변경·일정 등록" },
  { key: "master", label: "데이터 등록", description: "거래처·상품·경쟁사 변화 등록과 수정, 엑셀 업로드" },
  { key: "users", label: "사용자 관리", description: "사용자 추가, 역할·권한 설정, 사용 중지" },
  { key: "reset", label: "데모 초기화", description: "데모 데이터 전체 초기화" },
] as const;
export type Permission = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMISSIONS = PERMISSIONS.map((item) => item.key) as Permission[];

export const ROLES = [
  { key: "ADMIN", label: "관리자", description: "모든 기능과 사용자 관리", permissions: ALL_PERMISSIONS },
  { key: "LEAD", label: "팀장", description: "MD 권한 + 결정 승인·반려", permissions: ["task", "decide", "approve", "order", "promotion", "master"] as Permission[] },
  { key: "MD", label: "MD", description: "업무·결정·발주·프로모션·데이터 등록 (결정은 팀장 승인 필요)", permissions: ["task", "decide", "order", "promotion", "master"] as Permission[] },
  { key: "MEMBER", label: "협업자", description: "업무·일정·협업 요청만 (예: 디자인·SCM 담당자)", permissions: ["task"] as Permission[] },
  { key: "VIEWER", label: "조회 전용", description: "보기만 가능", permissions: [] as Permission[] },
] as const;
export type Role = (typeof ROLES)[number]["key"];
export const roleLabel = (role: string) => ROLES.find((item) => item.key === role)?.label ?? role;
export const permissionLabel = (key: string) => PERMISSIONS.find((item) => item.key === key)?.label ?? key;

/** 명령마다 필요한 권한. null은 로그인만 하면 되는 명령(읽음 표시, 화면 열기 등)입니다. */
const COMMAND_PERMISSION: Record<string, Permission | null> = {
  ADD_TASKS: "task", ADD_TASK: "task", TOGGLE_TASK: "task", UPDATE_TASK: "task", REVIEW_TASK: null,
  ADD_CALENDAR: "task", UPDATE_CALENDAR: "task", COMPLETE_CALENDAR: "task", CREATE_COLLAB: "task", UPDATE_COLLAB: "task",
  GENERATE_REPORT: "task", ADD_KNOWLEDGE: "task", ARTICLE_FEEDBACK: "task", SAVE_ARTICLE: "task",
  SAVE_DECISION: "decide", APPROVE_DECISION: "approve", REJECT_DECISION: "approve", ASSIGN_TASK: "task",
  CREATE_ORDER: "order", HOLD_ORDER: "decide", SEND_PURCHASE_ORDER: "order", CONFIRM_PO_DELIVERY: "order", RECEIVE_PO: "order", OPEN_PURCHASE_ORDER: null,
  ADVANCE_PROMOTION: "promotion", CREATE_PROMOTION: "promotion", SCHEDULE_PROMOTION: "promotion",
  SAVE_SUPPLIER: "master", DELETE_SUPPLIER: "master", SAVE_PRODUCT: "master", SAVE_SUPPLIER_PRODUCT: "master", DELETE_SUPPLIER_PRODUCT: "master", SAVE_COMPETITOR_EVENT: "master", DELETE_COMPETITOR_EVENT: "master",
  READ_NOTIFICATIONS: null,
  RESET_DEMO: "reset",
};

/** 알 수 없는 명령은 안전하게 '업무' 권한을 요구합니다. */
export function commandPermission(type: string): Permission | null {
  return type in COMMAND_PERMISSION ? COMMAND_PERMISSION[type] : "task";
}

export function hasPermission(viewer: { permissions?: string[] | null; active?: boolean } | null | undefined, permission: Permission | null) {
  if (!viewer || viewer.active === false) return false;
  return permission === null || Boolean(viewer.permissions?.includes(permission));
}

export function denyMessage(permission: Permission) {
  return `‘${permissionLabel(permission)}’ 권한이 없어요. 관리자에게 권한을 요청하세요.`;
}

/** 저장할 권한 목록 정리: 알려진 키만, 중복 없이. */
export function normalizePermissions(values: string[]): Permission[] {
  return ALL_PERMISSIONS.filter((key) => values.includes(key));
}
