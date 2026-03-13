// ================================================================
//  utils.js
//  경로: Games/Codes/Managers/utils.js
//
//  역할: 어느 씬에서도 사용하는 전역 유틸 함수
//
//  기준 해상도: GAME_BASE_W × GAME_BASE_H (1920 × 1080, constants.js 참조)
//  하한선 GAME_MIN_SCALE (0.67) — 1280×720 이하에서도 최소 가독성 보장
//  상한 없음   — 4K 등 큰 화면에서는 자동으로 커짐
// ================================================================

/**
 * 해상도에 비례하는 폰트 크기 반환
 * @param {number} basePx     - 1920×1080 기준 폰트 크기(px)
 * @param {object} sceneScale - Phaser scene.scale 객체 (선택)
 * @returns {string}          - '24px' 형태 문자열
 */
function scaledFontSize(basePx, sceneScale) {
  const s = sceneScale || { width: window.innerWidth, height: window.innerHeight };
  const ratio = Math.min(s.width / GAME_BASE_W, s.height / GAME_BASE_H);
  return `${Math.round(basePx * Math.max(ratio, GAME_MIN_SCALE))}px`;
}

/**
 * 해상도 비율 반환 (레이아웃 계산용)
 * @param {object} sceneScale - Phaser scene.scale 객체
 * @returns {number}          - GAME_MIN_SCALE 이상으로 클램핑된 비율
 */
function scaleRatio(sceneScale) {
  const s = sceneScale || { width: window.innerWidth, height: window.innerHeight };
  return Math.max(Math.min(s.width / GAME_BASE_W, s.height / GAME_BASE_H), GAME_MIN_SCALE);
}

/**
 * Phaser Graphics 객체에 4코너 장식 그리기
 * @param {Phaser.GameObjects.Graphics} gfx
 * @param {number} x      - 장식 영역 좌상단 x
 * @param {number} y      - 장식 영역 좌상단 y
 * @param {number} w      - 장식 영역 너비
 * @param {number} h      - 장식 영역 높이
 * @param {number} cs     - 코너 선 길이 (px)
 * @param {number} color  - 선 색상 (0xRRGGBB)
 * @param {number} [alpha=0.7] - 선 투명도
 */
function drawCornerDeco(gfx, x, y, w, h, cs, color, alpha) {
  gfx.lineStyle(1, color, alpha !== undefined ? alpha : 0.7);
  const x2 = x + w, y2 = y + h;
  gfx.lineBetween(x,  y,  x  + cs, y      );
  gfx.lineBetween(x,  y,  x,       y + cs );
  gfx.lineBetween(x2, y,  x2 - cs, y      );
  gfx.lineBetween(x2, y,  x2,      y + cs );
  gfx.lineBetween(x,  y2, x  + cs, y2     );
  gfx.lineBetween(x,  y2, x,       y2 - cs);
  gfx.lineBetween(x2, y2, x2 - cs, y2     );
  gfx.lineBetween(x2, y2, x2,      y2 - cs);
}
