/**
 * 발주 이후 흐름: 발주 등록 → 발주서 발송 → 납기 확정 → 입고 완료.
 * 상태는 PurchaseOrder.status 문자열에 저장합니다.
 */
import { SUPPLIER_DIRECTORY, type SupplierContact } from "@/lib/mock/samples";
import type { ProductItem, SupplierItem } from "@/lib/types/domain";

export const PO_STAGES = ["발주 등록", "발주서 발송", "납기 확정", "입고 완료"] as const;
export type PoStage = (typeof PO_STAGES)[number] | "취소";

/** 예전 데이터의 "발주 완료"는 거래처에 보내기 전 상태(발주 등록)로 봅니다. */
export function poStage(status: string): PoStage {
  if (status === "발주 완료") return "발주 등록";
  if ((PO_STAGES as readonly string[]).includes(status) || status === "취소") return status as PoStage;
  return "발주 등록";
}

export const poNextStep: Record<PoStage, string> = {
  "발주 등록": "거래처에 발주서 메일 보내기",
  "발주서 발송": "거래처 납기 회신 받기",
  "납기 확정": "입고일에 실제 입고 확인",
  "입고 완료": "완료",
  "취소": "—",
};

/** 샘플 거래처 목록에서만 찾습니다(등록한 거래처가 없을 때의 대체값). */
export function supplierFor(brandName?: string | null): SupplierContact | undefined {
  return brandName ? SUPPLIER_DIRECTORY.find((item) => item.brand === brandName) : undefined;
}

export type ResolvedSupplier = SupplierContact & { sample: boolean; supplierId?: string };

/** 브랜드의 거래처: 거래처·상품 등록 탭에서 연결한 거래처가 우선이고, 없으면 샘플 거래처입니다. */
export function resolveSupplier(brandName: string | null | undefined, data?: { suppliers?: SupplierItem[]; products?: ProductItem[] }): ResolvedSupplier | undefined {
  if (!brandName) return undefined;
  const supplierId = data?.products?.find((product) => product.brand?.name === brandName && product.brand.supplierId)?.brand.supplierId
    ?? data?.suppliers?.find((supplier) => supplier.brands.some((brand) => brand.name === brandName))?.id;
  const registered = supplierId ? data?.suppliers?.find((supplier) => supplier.id === supplierId) : undefined;
  if (registered) {
    return { brand: brandName, company: registered.name, contactName: registered.contactName, email: registered.email, cc: registered.cc || undefined, deliverTo: registered.deliverTo, paymentTerms: registered.paymentTerms, sample: false, supplierId: registered.id };
  }
  const sample = supplierFor(brandName);
  return sample ? { ...sample, sample: true } : undefined;
}

const ymd = (value: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const longDate = (value: string | Date) => {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(date);
  return `${day}(${weekday})`;
};

/** 사람이 읽고 회신에 인용할 수 있는 발주 번호. 예: PO-20261106-8J8F */
export function poNumber(po: { id: string; createdAt: string | Date }) {
  return `PO-${ymd(po.createdAt).replaceAll("-", "")}-${po.id.slice(-4).toUpperCase()}`;
}

export interface PurchaseOrderMailInput {
  po: { id: string; quantity: number; expectedArrival: string; createdAt: string };
  productName: string;
  brandName?: string | null;
  supplier?: SupplierContact;
  senderName: string;
  decision?: { content: string; confirmedAt: string | null } | null;
  /** 연결된 공급사 품목(공급가·MOQ·공급사 품번) */
  supplierItem?: { name: string; supplierSku: string; unitCost: number | null; moq: number | null } | null;
}

/** 거래처에 보낼 발주서 메일 초안. 납기 가능 여부와 단가 확인 회신을 요청합니다. */
export function buildPurchaseOrderMail({ po, productName, brandName, supplier, senderName, supplierItem }: PurchaseOrderMailInput) {
  const number = poNumber(po);
  const company = supplier?.company ?? brandName ?? "거래처";
  const greeting = supplier?.contactName ? `${company} ${supplier.contactName}님` : `${company} 담당자님`;
  const subject = `[발주서] ${number} ${productName} ${po.quantity.toLocaleString("ko-KR")}개 · 희망 입고 ${ymd(po.expectedArrival).slice(5).replace("-", "/")}`;
  const body = [
    `안녕하세요, ${greeting}.`,
    `아래와 같이 발주드립니다. 납기 가능 여부를 회신 부탁드립니다.`,
    "",
    `■ 발주 번호: ${number}`,
    `■ 품목: ${productName}${brandName ? ` (${brandName})` : ""}`,
    ...(supplierItem ? [`■ 귀사 품목: ${supplierItem.name}${supplierItem.supplierSku ? ` (품번 ${supplierItem.supplierSku})` : ""}`] : []),
    `■ 수량: ${po.quantity.toLocaleString("ko-KR")}개`,
    ...(supplierItem?.unitCost != null ? [`■ 공급가: ${supplierItem.unitCost.toLocaleString("ko-KR")}원 × ${po.quantity.toLocaleString("ko-KR")}개 = ${(supplierItem.unitCost * po.quantity).toLocaleString("ko-KR")}원 (VAT 별도)`] : []),
    `■ 희망 입고일: ${longDate(po.expectedArrival)}`,
    `■ 납품처: ${supplier?.deliverTo ?? "자사 물류센터 (주소 확인 필요)"}`,
    ...(supplier?.paymentTerms ? [`■ 결제 조건: ${supplier.paymentTerms}`] : []),
    "",
    "회신 요청 사항",
    "1. 희망 입고일 납품 가능 여부 (불가 시 가능한 가장 빠른 날짜)",
    "2. 단가 및 거래 조건 변동 여부",
    "3. 분할 납품이 필요한 경우 일정",
    "",
    "감사합니다.",
    `${senderName} 드림`,
  ].join("\n");
  const belowMoq = supplierItem?.moq != null && po.quantity < supplierItem.moq ? supplierItem.moq : null;
  return { to: supplier?.email ?? "", cc: supplier?.cc ?? "", subject, body, number, belowMoq };
}

type MailDraft = { to: string; cc?: string; subject: string; body: string };
const enc = (value: string) => encodeURIComponent(value);
const crlf = (value: string) => value.replace(/\r?\n/g, "\r\n");

/**
 * 기본 메일 앱(mailto). 받는 사람 주소는 인코딩하지 않습니다(%40을 풀지 못하는 메일 앱이 있음).
 * Windows 메일 앱 상당수는 약 2,000자가 넘는 링크의 본문을 버리므로, 한글 본문은 Gmail·Outlook·메일 파일을 함께 제공합니다.
 */
export function mailtoLink(mail: MailDraft) {
  const query = [mail.cc ? `cc=${enc(mail.cc)}` : "", `subject=${enc(mail.subject)}`, `body=${enc(crlf(mail.body))}`].filter(Boolean).join("&");
  return `mailto:${mail.to.trim()}?${query}`;
}
/** 기본 메일 앱이 본문을 버릴 가능성이 큰 길이(Windows 기준 약 2,000자) */
export const MAILTO_SAFE_LENGTH = 1900;

/** Gmail 웹 작성 화면(받는 사람·제목·본문이 채워진 상태로 열림) */
export function gmailComposeLink(mail: MailDraft) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(mail.to)}${mail.cc ? `&cc=${enc(mail.cc)}` : ""}&su=${enc(mail.subject)}&body=${enc(mail.body)}`;
}

/** Outlook 웹(회사 Microsoft 365 계정) 작성 화면 */
export function outlookComposeLink(mail: MailDraft) {
  return `https://outlook.office.com/mail/deeplink/compose?to=${enc(mail.to)}${mail.cc ? `&cc=${enc(mail.cc)}` : ""}&subject=${enc(mail.subject)}&body=${enc(mail.body)}`;
}

/**
 * 메일 파일(.eml). Outlook·Windows 메일·Apple Mail에서 열면 받는 사람·제목·본문이 채워진 '보내기 전' 초안으로 열립니다.
 * 한글 제목은 RFC 2047(UTF-8 Base64), 본문은 Base64로 담습니다.
 */
export function emlFile(mail: MailDraft) {
  const b64 = (value: string) => typeof Buffer !== "undefined" ? Buffer.from(value, "utf-8").toString("base64") : btoa(String.fromCharCode(...new TextEncoder().encode(value)));
  const wrap = (value: string) => value.replace(/(.{76})/g, "$1\r\n");
  return [
    `To: ${mail.to}`,
    ...(mail.cc ? [`Cc: ${mail.cc}`] : []),
    `Subject: =?UTF-8?B?${b64(mail.subject)}?=`,
    "X-Unsent: 1",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap(b64(crlf(mail.body))),
    "",
  ].join("\r\n");
}
