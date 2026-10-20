"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/common/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="state-box state-error" role="alert">
    <AlertTriangle size={24} />
    <strong>화면을 표시하는 중 문제가 발생했습니다</strong>
    <span>입력한 데이터는 유지됩니다. 다시 시도해도 계속되면 개발자 콘솔의 오류를 확인해주세요.</span>
    <Button onClick={reset}><RotateCcw size={14} /> 다시 시도</Button>
  </div>;
}
