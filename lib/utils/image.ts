/** 상품 썸네일 저장 한도(문자 수). 정사각 320px WebP는 보통 10~40KB입니다. */
export const MAX_THUMB_LENGTH = 400_000;
export const THUMB_SIZE = 320;

/**
 * 고른 이미지를 가운데 기준 정사각형으로 잘라 작은 썸네일(data URL)로 줄입니다.
 * 원본을 그대로 저장하지 않아 DB와 화면 로딩이 가볍습니다.
 */
export async function imageFileToThumbnail(file: File, size = THUMB_SIZE): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일(JPG·PNG·WebP 등)만 넣을 수 있어요.");
  if (file.size > 15 * 1024 * 1024) throw new Error("15MB 이하 이미지만 넣을 수 있어요.");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("이미지를 읽지 못했어요. 다른 파일을 골라주세요."));
      element.src = url;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 처리하지 못했어요.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    let result = canvas.toDataURL("image/webp", 0.82);
    if (!result.startsWith("data:image/webp")) result = canvas.toDataURL("image/jpeg", 0.85);
    if (result.length > MAX_THUMB_LENGTH) result = canvas.toDataURL("image/jpeg", 0.6);
    if (result.length > MAX_THUMB_LENGTH) throw new Error("이미지가 너무 복잡해 줄이지 못했어요. 다른 이미지를 골라주세요.");
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 저장 가능한 이미지 값인지: 줄인 data URL(png·jpeg·webp·gif) 또는 https 주소. */
export function isAllowedImageValue(value: string) {
  if (!value) return true;
  if (value.length > MAX_THUMB_LENGTH) return false;
  return /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) || /^https:\/\/[^\s"'<>]+$/.test(value);
}
