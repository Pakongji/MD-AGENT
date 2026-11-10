import ExcelJS from "exceljs";
import type { Table } from "./parse";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 20000;

/** CSV: 엑셀에서 저장한 한글 CSV(CP949/EUC-KR)도 읽습니다. 따옴표 안의 쉼표·줄바꿈을 지원합니다. */
export function decodeCsv(bytes: Uint8Array) {
  const utf8 = new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
  if (!utf8.includes("�")) return utf8;
  try { return new TextDecoder("euc-kr").decode(bytes); } catch { return utf8; }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** 첫 시트(또는 CSV)를 표로 읽습니다. 머리글은 비어 있지 않은 첫 줄입니다. */
export async function readTable(fileName: string, bytes: Uint8Array): Promise<Table> {
  let grid: unknown[][];
  if (/\.csv$/i.test(fileName)) {
    grid = parseCsv(decodeCsv(bytes));
  } else if (/\.xlsx$/i.test(fileName)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("엑셀 파일에 시트가 없어요.");
    grid = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = (row.values as unknown[]).slice(1).map((value) => {
        if (value && typeof value === "object" && !(value instanceof Date)) {
          const rich = value as { result?: unknown; text?: unknown; richText?: { text: string }[] };
          if (rich.result !== undefined) return rich.result;
          if (rich.richText) return rich.richText.map((part) => part.text).join("");
          if (rich.text !== undefined) return rich.text;
        }
        return value;
      });
      grid.push(values);
    });
  } else {
    throw new Error("엑셀(.xlsx) 또는 CSV(.csv) 파일만 올릴 수 있어요. (.xls는 엑셀에서 .xlsx로 저장해주세요)");
  }
  const start = grid.findIndex((row) => row.some((value) => value !== null && value !== undefined && String(value).trim() !== ""));
  if (start < 0) throw new Error("파일이 비어 있어요.");
  const headers = grid[start].map((value) => String(value ?? "").trim());
  const rows = grid.slice(start + 1);
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`한 번에 ${MAX_IMPORT_ROWS.toLocaleString()}줄까지 올릴 수 있어요. 기간을 나눠 올려주세요.`);
  return { headers, rows };
}
