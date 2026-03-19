// ================================================================
//  constants.js
//  경로: Games/Codes/constants.js
//
//  역할: 게임 전역 상수 — 모든 파일이 로드되기 전에 먼저 정의됨
//
//  로드 순서: index.html에서 Phaser 직후, 다른 모든 스크립트보다 먼저
// ================================================================

const GAME_BASE_W    = 1920;         // 기준 해상도 가로
const GAME_BASE_H    = 1080;         // 기준 해상도 세로
const GAME_MIN_SCALE = 0.67;         // 최소 스케일 비율 (1280×720 기준)
const GAME_VERSION   = {

  // ── 버전 번호 ─────────────────────────────────────────────────
  number: 'v0.0.5533335',

  // ── 빌드 태그 (prototype / alpha / beta / release) ────────────
  tag: 'prototype',

  // ── 로비 화면 좌측 하단 분위기 텍스트 ─────────────────────────
  atmosphere: 'YEAR 102  ·  POST-COLLAPSE',

  // ── 로비 화면 우측 하단에 표시되는 기술 스택 ──────────────────
  stack: 'PHASER 3  ·  WEB',

  // ── 조합 헬퍼 (직접 수정 불필요) ─────────────────────────────
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
const StatFormulas = {

  /** 민첩 → 공격속도 (회/s)  상한 5.00 */
  attackSpeed(agility) {
    return parseFloat((0.5 + 4.5 * (1 - Math.exp(-agility / 90))).toFixed(2));
  },

  /** 행운 → 크리티컬 확률 (%)  상한 100% 미달 */
  critRate(luck) {
    return parseFloat((100 * (1 - Math.exp(-luck / 70))).toFixed(1));
  },

  /** 행운 → 회피율 (%)  상한 50% 미달 */
  evasionRate(luck) {
    return parseFloat((50 * (1 - Math.exp(-luck / 80))).toFixed(1));
  },
};