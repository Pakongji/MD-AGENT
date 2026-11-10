"use client";

import { useAppStore } from "@/lib/store/app-store";

const TINTS = ["#eef2ff", "#fdf2f8", "#ecfdf5", "#fff7ed", "#f0f9ff", "#faf5ff", "#fefce8"];
const INKS = ["#4338ca", "#be185d", "#047857", "#c2410c", "#0369a1", "#7e22ce", "#a16207"];

/** 상품명 첫 글자(브랜드 기호 제외)로 이미지가 없을 때의 자리 표시를 만듭니다. */
function initialOf(name: string) {
  const words = name.replace(/^\[[^\]]*\]\s*/, "").split(/\s+/).filter(Boolean);
  const word = words.length > 1 && /^[A-Z]$/.test(words[0]) ? words[1] : words[0] ?? "?";
  return word.slice(0, 1);
}

/** 상품 썸네일. 이미지가 없으면 상품명 첫 글자를 색 배경에 보여줍니다. */
export function ProductThumb({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const index = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TINTS.length;
  const style = { width: size, height: size, minWidth: size, borderRadius: Math.round(size / 4) };
  if (src) {
    // data URL·외부 주소 썸네일이라 next/image 최적화 대상이 아닙니다.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="product-thumb" src={src} alt={`${name} 이미지`} width={size} height={size} style={{ ...style, objectFit: "cover" }} loading="lazy" />;
  }
  return <span className="product-thumb is-empty" aria-hidden style={{ ...style, background: TINTS[index], color: INKS[index], fontSize: Math.round(size * 0.42) }}>{initialOf(name)}</span>;
}

/** 상품 ID(또는 이름)로 등록된 이미지를 찾아 썸네일을 보여줍니다. 재고·발주처럼 상품 객체가 없는 목록에서 씁니다. */
export function ProductThumbById({ productId, name, size }: { productId?: string | null; name: string; size?: number }) {
  const products = useAppStore((state) => state.data.products);
  const product = products.find((item) => item.id === productId) ?? products.find((item) => item.name === name);
  return <ProductThumb name={name} src={product?.imageUrl} size={size} />;
}

/** 썸네일 + 상품명(+보조 문구)을 한 줄로 묶어 표 셀에 씁니다. */
export function ProductLabel({ name, src, productId, sub, size = 32 }: { name: string; src?: string | null; productId?: string | null; sub?: React.ReactNode; size?: number }) {
  return <span className="product-label">
    {src !== undefined ? <ProductThumb name={name} src={src} size={size} /> : <ProductThumbById productId={productId} name={name} size={size} />}
    <span className="product-label-text"><strong>{name}</strong>{sub && <span className="tiny">{sub}</span>}</span>
  </span>;
}
