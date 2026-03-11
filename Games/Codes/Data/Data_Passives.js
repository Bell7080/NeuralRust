// ================================================================
//  Data_Passives.js
//  경로: Games/Codes/Data/Data_Passives.js
//
//  역할: 모든 패시브 정의 (공격 범위 결정)
//  참조: CharacterManager.PASSIVE_POOL (id 매칭)
//
//  RANGE enum:
//    UPPER      — 위 칸 타격
//    FRONT      — 바로 앞 칸 (이형 방향)
//    SELF       — 자신의 칸
//    DIAGONAL   — 대각선 칸
//    FRONT_ROW  — 전열 전체
//    REAR       — 후열 (자신 뒤)
//    FRONT_REAR — 전열 + 후열 동시
//    ALL        — 전체 칸
// ================================================================

const RANGE = {
  UPPER:      'upper',
  FRONT:      'front',
  SELF:       'self',
  DIAGONAL:   'diagonal',
  FRONT_ROW:  'front_row',
  REAR:       'rear',
  FRONT_REAR: 'front_rear',
  ALL:        'all',
};

const PASSIVE_DATA = [

  // ── Cog 1 ────────────────────────────────────────────────────
  {
    id: 'upper_strike',
    name: '윗칸 타격',
    cogMin: 1,
    range: RANGE.UPPER,
    description: '기본 공격이 위 칸의 이형에게도 적용된다.',
  },
  {
    id: 'front_strike',
    name: '앞칸 타격',
    cogMin: 1,
    range: RANGE.FRONT,
    description: '기본 공격이 바로 앞 칸의 이형에게 적용된다.',
  },

  // ── Cog 2 ────────────────────────────────────────────────────
  // front_strike는 Cog 1에서 재사용 (중복 등록 방지, PASSIVE_POOL에서 id로 참조)
  {
    id: 'self_strike',
    name: '현재 칸 타격',
    cogMin: 2,
    range: RANGE.SELF,
    description: '기본 공격이 자신이 있는 칸의 이형 전체에게 적용된다.',
  },

  // ── Cog 3 ────────────────────────────────────────────────────
  {
    id: 'diagonal_strike',
    name: '대각 타격',
    cogMin: 3,
    range: RANGE.DIAGONAL,
    description: '기본 공격이 대각선 방향 이형에게도 적용된다.',
  },

  // ── Cog 4 ────────────────────────────────────────────────────
  {
    id: 'front_row_strike',
    name: '전열 전체 타격',
    cogMin: 4,
    range: RANGE.FRONT_ROW,
    description: '기본 공격이 이형 전열 전체에게 동시에 적용된다.',
  },

  // ── Cog 5 ────────────────────────────────────────────────────
  {
    id: 'rear_strike',
    name: '후열 타격',
    cogMin: 5,
    range: RANGE.REAR,
    description: '기본 공격이 후열 이형에게도 적용된다.',
  },

  // ── Cog 6 ────────────────────────────────────────────────────
  {
    id: 'front_rear_strike',
    name: '전/후열 동시 타격',
    cogMin: 6,
    range: RANGE.FRONT_REAR,
    description: '기본 공격이 전열과 후열 이형 모두에게 동시에 적용된다.',
  },

  // ── Cog 7+ ───────────────────────────────────────────────────
  {
    id: 'all_strike',
    name: '전체 타격',
    cogMin: 7,
    range: RANGE.ALL,
    description: '기본 공격이 전장의 모든 이형에게 동시에 적용된다.',
  },
];

// ──────────────────────────────────────────────────────────────
//  PASSIVE_POOL  —  CharacterManager.PASSIVE_POOL 을 이 구조로 교체 예정
//  key: Cog 등급 / value: 해당 등급에서 뽑을 수 있는 패시브 id 목록
// ──────────────────────────────────────────────────────────────
const PASSIVE_POOL = {
  1: ['upper_strike', 'front_strike'],
  2: ['front_strike', 'self_strike'],
  3: ['self_strike', 'diagonal_strike', 'upper_strike'],
  4: ['front_row_strike', 'diagonal_strike', 'front_strike'],
  5: ['front_row_strike', 'self_strike', 'rear_strike'],
  6: ['front_rear_strike', 'rear_strike', 'front_row_strike'],
  7: ['all_strike', 'front_rear_strike'],
  8: ['all_strike', 'front_rear_strike'],
  9: ['all_strike', 'front_rear_strike'],
  10: ['all_strike'],
};
