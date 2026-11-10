import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedImageValue, MAX_THUMB_LENGTH } from "../lib/utils/image";

test("저장 가능한 이미지: 줄인 data URL(png·jpeg·webp·gif) 또는 https 주소, 빈 값은 삭제", () => {
  assert.ok(isAllowedImageValue(""));
  assert.ok(isAllowedImageValue("data:image/webp;base64,UklGRhIAAABXRUJQ"));
  assert.ok(isAllowedImageValue("data:image/jpeg;base64,/9j/4AAQSkZJRg=="));
  assert.ok(isAllowedImageValue("https://cdn.example.com/a.jpg"));
});

test("막는 값: http·javascript·SVG·너무 큰 이미지", () => {
  assert.ok(!isAllowedImageValue("http://cdn.example.com/a.jpg"));
  assert.ok(!isAllowedImageValue("javascript:alert(1)"));
  assert.ok(!isAllowedImageValue("data:image/svg+xml;base64,PHN2Zz4="));
  assert.ok(!isAllowedImageValue("https://x.example.com/a.jpg\" onerror=\"x"));
  assert.ok(!isAllowedImageValue("data:image/png;base64," + "A".repeat(MAX_THUMB_LENGTH)));
});
