import ExcelJS from "exceljs";
import type { WorklogReport, WorklogRow } from "./report";

type Column = { header: string; key: keyof WorklogRow; width: number };

function addTable(book: ExcelJS.Workbook, name: string, columns: Column[], rows: WorklogRow[]) {
  const sheet = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  sheet.columns = columns;
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: columns.length } };
  styleHeader(sheet.getRow(1));
  for (const record of rows) {
    const row = sheet.addRow(record);
    row.alignment = { vertical: "middle", wrapText: true };
    row.height = Math.min(100, Math.max(24, ...columns.map(column => Math.ceil(String(record[column.key]).length / Math.max(8, column.width / 2)) * 16)));
    if (row.number % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FC" } };
    for (const [i, column] of columns.entries()) {
      if (column.key === "status" || (column.key === "blocker" && record.blocker)) {
        row.getCell(i + 1).font = { name: "맑은 고딕", bold: true, color: { argb: record.status === "완료" ? "FF138A68" : "FF8C4612" } };
      }
    }
  }
  return sheet;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 28;
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF241D48" } };
  row.font = { name: "맑은 고딕", bold: true, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle" };
}

export function createWorklogWorkbook(report: WorklogReport) {
  const book = new ExcelJS.Workbook();
  book.creator = "MD AI Agent";
  const summary = book.addWorksheet("요약", { views: [{ showGridLines: false }] });
  summary.columns = [{ width: 28 }, { width: 80 }];
  summary.mergeCells("A1:B1");
  summary.getCell("A1").value = report.label;
  styleHeader(summary.getRow(1));
  summary.addRows([
    ["보고 기간 (KST)", report.start + " ~ " + report.end],
    ["집계 시점 (KST)", report.asOf],
    ["완료 업무", report.completed],
    ["미완료 업무", report.pending],
    ["확인할 병목", report.blockers],
    ["캘린더 일정", report.calendar],
    ["이력 수집 시작일", report.trackingSince || "기록 없음"],
    ["완료 집계 기준", "기간 안에 완료됐고 집계 시점에도 완료 상태인 업무를 한 번만 셉니다."],
    [],
    ["주요 성과", "처리 결과"],
    ...report.achievements.map(value => ["완료", value]),
    ...(report.achievements.length ? [] : [["", "이 기간에 기록된 완료 업무가 없습니다."]]),
    [],
    ["병목 유형", "건수"],
    ...report.blockerGroups.map(group => [group.name, group.count]),
    [],
    ["다음 우선순위", "후속 행동"],
    ...report.followups.slice(0, 6).map(row => [row.title, [row.next, row.due].filter(Boolean).join(" · ")]),
  ]);
  summary.eachRow((row, index) => {
    if (index === 1) return;
    if (["주요 성과", "병목 유형", "다음 우선순위"].includes(String(row.getCell(1).value))) styleHeader(row);
    else {
      row.alignment = { vertical: "middle", wrapText: true };
      row.height = Math.min(100, Math.max(22, Math.ceil(String(row.getCell(2).value ?? "").length / 42) * 17));
      row.getCell(1).font = { name: "맑은 고딕", bold: true };
    }
  });
  addTable(book, "업무 상세", [
    { header: "업무명", key: "title", width: 34 }, { header: "구분", key: "type", width: 15 },
    { header: "상태", key: "status", width: 14 }, { header: "완료일 (KST)", key: "completedAt", width: 21 },
    { header: "마감·예정일 (KST)", key: "due", width: 23 }, { header: "처리 내용과 결과", key: "result", width: 55 },
    { header: "미완료 사유", key: "blocker", width: 29 }, { header: "연결된 기록", key: "source", width: 23 },
  ], report.rows);
  addTable(book, "후속 업무·일정", [
    { header: "업무·일정", key: "title", width: 35 }, { header: "상태", key: "status", width: 16 },
    { header: "병목", key: "blocker", width: 30 }, { header: "다음 행동", key: "next", width: 47 },
    { header: "담당자", key: "owner", width: 18 }, { header: "마감·캘린더 (KST)", key: "due", width: 24 },
    { header: "연결된 기록", key: "source", width: 23 },
  ], report.followups);
  return book;
}
