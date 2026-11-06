import { redirect } from "next/navigation";

// 메뉴 개편으로 '업무' 화면 안의 탭으로 옮겼습니다. 예전 주소로 들어와도 같은 화면이 열립니다.
export default function Page() { redirect("/tasks?tab=collab"); }
