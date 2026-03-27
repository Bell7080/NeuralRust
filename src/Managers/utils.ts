// ================================================================
//  utils.ts
//  경로: src/Managers/utils.ts
//
//  역할: 어느 씬에서도 사용하는 전역 유틸 함수
//
//  기준 해상도: GAME_BASE_W × GAME_BASE_H (1920 × 1080)
//  하한선 GAME_MIN_SCALE (0.67) — 1280×720 이하에서도 최소 가독성 보장
// ================================================================

import { GAME_BASE_W, GAME_BASE_H, GAME_MIN_SCALE } from '../constants';

interface SceneLike { width: number; height: number; }

/**
 * 해상도에 비례하는 폰트 크기 반환
 * @param basePx     - 1920×1080 기준 폰트 크기(px)
 * @param sceneScale - Phaser scene.scale 객체 (선택)
 * @returns '24px' 형태 문자열
 */
export function scaledFontSize(basePx: number, sceneScale?: SceneLike): string {
  const s = sceneScale ?? { width: window.innerWidth, height: window.innerHeight };
  const ratio = Math.min(s.width / GAME_BASE_W, s.height / GAME_BASE_H);
  return `${Math.round(basePx * Math.max(ratio, GAME_MIN_SCALE))}px`;
}

/**
 * 해상도 비율 반환 (레이아웃 계산용)
 * @param sceneScale - Phaser scene.scale 객체
 * @returns GAME_MIN_SCALE 이상으로 클램핑된 비율
 */
export function scaleRatio(sceneScale?: SceneLike): number {
  const s = sceneScale ?? { width: window.innerWidth, height: window.innerHeight };
  return Math.max(Math.min(s.width / GAME_BASE_W, s.height / GAME_BASE_H), GAME_MIN_SCALE);
}

/**
 * Phaser Graphics 객체에 4코너 장식 그리기
 */
export function drawCornerDeco(
  gfx:   Phaser.GameObjects.Graphics,
  x:     number,
  y:     number,
  w:     number,
  h:     number,
  cs:    number,
  color: number,
  alpha: number = 0.7,
): void {
  gfx.lineStyle(1, color, alpha);
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
