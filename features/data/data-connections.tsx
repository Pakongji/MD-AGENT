"use client";

import { useState } from "react";
import { Boxes, CalendarDays, ChartNoAxesCombined, Info, Tag, TrendingUp } from "lucide-react";
import { Badge, Button, Card, Modal } from "@/components/common/ui";
import { useAppStore } from "@/lib/store/app-store";
import { CONNECTED_SOURCES, DATA_SOURCES, type DataSourceSlot } from "@/lib/mock/samples";

const icons: Record<DataSourceSlot["key"], typeof Boxes> = { sales: ChartNoAxesCombined, inventory: Boxes, competitor: Tag, trend: TrendingUp, calendar: CalendarDays };

/** 데이터 연결: 어떤 데이터를 어떤 형태로 넣으면 어느 화면이 실데이터로 바뀌는지 안내합니다. */
export function DataConnections() {
  const { showToast } = useAppStore();
  const [connecting, setConnecting] = useState<DataSourceSlot | null>(null);
  const connected = CONNECTED_SOURCES.length;

  function downloadTemplate(slot: DataSourceSlot) {
    const csv = "﻿" + slot.columns.map((column) => `"${column}"`).join(",") + "\n";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `MD-Agent-${slot.name}-양식.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`${slot.name} 양식을 받았어요. 엑셀에서 열어 열 이름을 확인하세요.`, "success");
  }

  return <div className="stack">
    <Card className="rd-progress">
      <div><span className="rd-muted">연결된 데이터</span><strong>{connected} / {DATA_SOURCES.length}</strong></div>
      <div className="rd-progress-body">
        <div className="rd-progress-track"><span style={{ width: `${(connected / DATA_SOURCES.length) * 100}%` }} /></div>
        <p>매출 · 재고 두 개만 연결해도 홈 · 매출·재고 · 프로모션의 핵심 숫자가 실데이터로 바뀌어요. 추천 순서: 매출 → 재고 → 경쟁사 가격</p>
      </div>
      <Badge tone="orange">{connected ? "일부 화면 샘플 표시 중" : "모든 화면 샘플 표시 중"}</Badge>
    </Card>

    <div className="rd-slot-grid">
      {DATA_SOURCES.map((slot) => { const Icon = icons[slot.key]; const isConnected = CONNECTED_SOURCES.includes(slot.key); return <Card key={slot.key} className="rd-slot">
        <div className="rd-slot-head"><span className="rd-slot-icon"><Icon size={16} /></span><h3>{slot.name}</h3><Badge tone={isConnected ? "green" : "neutral"}>{isConnected ? "연결됨" : "샘플 사용 중"}</Badge></div>
        <div><span className="rd-label">연결 방식</span><p>{slot.method}</p></div>
        <div><span className="rd-label">필요한 열</span><div className="rd-column-chips">{slot.columns.map((column) => <span key={column}>{column}</span>)}</div></div>
        <p className="rd-affects"><span className="rd-label">바뀌는 화면</span><b>{slot.affects}</b></p>
        <div className="rd-inline-actions">
          <Button onClick={() => setConnecting(slot)}>연결하기</Button>
          {slot.template && <Button variant="secondary" onClick={() => downloadTemplate(slot)}>엑셀 양식 받기</Button>}
          {slot.recommended && <Badge tone="green">{slot.recommended}</Badge>}
        </div>
      </Card>; })}
      <div className="rd-slot rd-slot-info">
        <strong><Info size={16} /> 연결 전에도 모든 화면이 동작해요</strong>
        <p>샘플 숫자에는 ‘샘플’ 표시가 붙어요. 연결하면 그 데이터를 쓰는 화면부터 실데이터로 바뀌고, 기준 시각도 실제 업로드 시각으로 표시돼요.</p>
        <p>엑셀 열 이름이 달라도 업로드할 때 한 번만 맞춰두면 다음부터 자동으로 읽도록 만들 예정이에요.</p>
      </div>
    </div>

    <Modal open={Boolean(connecting)} title={`${connecting?.name ?? ""} 데이터 연결`} onClose={() => setConnecting(null)} width="520px">
      {connecting && <>
        <p>{connecting.name} 연결({connecting.method})은 아직 준비 중이에요. 지금은 샘플 데이터로 모든 화면을 확인할 수 있어요.</p>
        <p className="rd-muted">미리 해둘 수 있는 것: {connecting.template ? "엑셀 양식을 받아 실제 자료의 열 이름과 맞는지 확인해두세요." : "연결에 필요한 계정이나 API 키를 준비해두세요."}</p>
        <div className="modal-actions">
          {connecting.template && <Button variant="secondary" onClick={() => downloadTemplate(connecting)}>엑셀 양식 받기</Button>}
          <Button onClick={() => setConnecting(null)}>확인</Button>
        </div>
      </>}
    </Modal>
  </div>;
}
