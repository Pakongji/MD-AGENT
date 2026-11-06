/* global figma, __html__ */
figma.showUI(__html__, { width: 360, height: 238 });

const navy = { r: 0.08, g: 0.10, b: 0.20 };
const muted = { r: 0.34, g: 0.39, b: 0.52 };
const accent = { r: 0.29, g: 0.25, b: 0.63 };
const blue = { r: 0.89, g: 0.94, b: 0.99 };
const white = { r: 1, g: 1, b: 1 };
const fill = color => [{ type: "SOLID", color }];

function block(name, width, color, parent) {
  const frame = figma.createFrame();
  frame.name = name;
  if (parent) parent.appendChild(frame);
  frame.layoutMode = "VERTICAL";
  frame.resize(width, 1);
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = 12;
  frame.paddingLeft = frame.paddingRight = frame.paddingTop = frame.paddingBottom = 24;
  frame.cornerRadius = 14;
  frame.fills = fill(color);
  return frame;
}

function text(parent, name, value, font, size, color) {
  const layer = figma.createText();
  parent.appendChild(layer);
  layer.name = name;
  layer.fontName = font;
  layer.fontSize = size;
  layer.textAutoResize = "HEIGHT";
  layer.resize(parent.width - parent.paddingLeft - parent.paddingRight, layer.height);
  layer.characters = value;
  layer.fills = fill(color);
}

let creating = false;
figma.ui.onmessage = async message => {
  if (message.type !== "create" || creating) return;
  creating = true;
  const added = [];
  try {
    const data = message.data;
    const required = ["title", "headline", "products", "benefit", "audience", "notes"];
    if (!data || data.format !== "md-agent-promotion" || data.version !== 1
      || required.some(key => typeof data[key] !== "string" || data[key].length > 1800)
      || !data.title || !data.headline || !Number.isInteger(data.revision)) {
      throw new Error("MD AGENT에서 받은 확정 기획안 JSON인지 확인해주세요.");
    }
    const regular = { family: "Noto Sans KR", style: "Regular" };
    const bold = { family: "Noto Sans KR", style: "Bold" };
    await Promise.all([figma.loadFontAsync(regular), figma.loadFontAsync(bold)]);
    const center = figma.viewport.center;
    const banner = block(data.title + " · 배너 · v" + data.revision, 640, blue);
    added.push(banner);
    banner.x = Math.round(center.x - 610);
    banner.y = Math.round(center.y - 150);
    text(banner, "기획명", data.title, bold, 15, accent);
    text(banner, "메인 카피", data.headline, bold, 44, navy);
    text(banner, "상품 구성", data.products, regular, 20, muted);
    text(banner, "상품 이미지 자리", "승인된 상품 이미지 배치", regular, 14, muted);

    const detail = block(data.title + " · 상세페이지 · v" + data.revision, 480, white);
    added.push(detail);
    detail.x = banner.x + banner.width + 32;
    detail.y = banner.y;
    text(detail, "기획명", data.title, bold, 15, accent);
    text(detail, "메인 카피", data.headline, bold, 34, navy);
    const sections = [["01 · 누구를 위한 기획전인가요", data.audience], ["02 · 상품 구성", data.products], ["03 · 구매 혜택", data.benefit]];
    if (data.notes) sections.push(["04 · 제작 메모", data.notes]);
    for (const [label, copy] of sections) {
      const section = block(label, 432, blue, detail);
      text(section, "섹션 제목", label, bold, 18, navy);
      text(section, "본문", copy, regular, 15, muted);
    }
    figma.currentPage.selection = added;
    figma.viewport.scrollAndZoomIntoView(added);
    figma.ui.postMessage({ type: "done", text: "배너와 상세페이지 프레임을 만들었습니다." });
  } catch (error) {
    added.forEach(node => node.remove());
    figma.ui.postMessage({ type: "error", text: error.message || "기획안을 가져오지 못했습니다." });
  } finally {
    creating = false;
  }
};
