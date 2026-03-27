// ================================================================
//  constants.ts
//  경로: src/constants.ts
//
//  역할: 게임 전역 상수 — 모든 파일이 이곳에서 import
//
//  변환 전: Games/Codes/constants.js (전역 var)
//  변환 후: export const (ES 모듈)
// ================================================================

import type { GameVersion, IStatFormulas } from './types';

export const GAME_BASE_W:    number = 1920;
export const GAME_BASE_H:    number = 1080;
export const GAME_MIN_SCALE: number = 0.67;   // 최소 스케일 비율 (1280×720 기준)

export const GAME_VERSION: GameVersion = {

  // ── 버전 번호 ───────────────────────────────────────────────
  number: 'v0.0.11',

  // ── 빌드 태그 (prototype / alpha / beta / release) ─────────
  tag: 'prototype',

  // ── 로비 화면 좌측 하단 분위기 텍스트 ─────────────────────
  atmosphere: 'YEAR 102  ·  POST-COLLAPSE',

  // ── 로비 화면 우측 하단 기술 스택 ──────────────────────────
  stack: 'PHASER 3  ·  TS  ·  VITE',

  // ── 조합 헬퍼 ──────────────────────────────────────────────
  get full()        { return `${this.number}  ${this.tag}`; },
  get short()       { return this.number; },
  get footerLeft()  { return `${this.number}  ${this.tag}`; },
  get footerRight() { return this.stack; },
};

// ================================================================
//  StatFormulas
//  역할: 스탯 수치 → 파생 전투 수치 계산
//
//  공식: 지수 감쇠 (1 − e^(−x/τ)) 기반 점근선 수렴
//  상한:
//    공격속도  → 5.00회/s  (민첩 100 ≈ 2.84회/s)
//    크리티컬  → 100%      (행운 100 ≈ 76.3%)
//    회피율    → 50%       (행운 100 ≈ 28.3%)
// ================================================================
export const StatFormulas: IStatFormulas = {

  /** 민첩 → 공격속도 (회/s)  상한 5.00 */
  attackSpeed(agility: number): number {
    return parseFloat((0.5 + 4.5 * (1 - Math.exp(-agility / 90))).toFixed(2));
  },

  /** 행운 → 크리티컬 확률 (%)  상한 100% 미달 */
  critRate(luck: number): number {
    return parseFloat((100 * (1 - Math.exp(-luck / 70))).toFixed(1));
  },

  /** 행운 → 회피율 (%)  상한 50% 미달 */
  evasionRate(luck: number): number {
    return parseFloat((50 * (1 - Math.exp(-luck / 80))).toFixed(1));
  },
};
