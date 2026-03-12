// ================================================================
//  Data_Positions.js
//  경로: Games/Codes/Data/Data_Positions.js
//
//  역할: 포지션(공격 범위) 정의 데이터
//        캐릭터의 기본 공격이 닿는 칸 범위를 결정
//        구 Data_Passives.js(공격범위) + 구 PositionData.js 통합본
//
//  설계 의도:
//    · 포지션은 "어디를 때리는가"를 결정하는 전투 배치 속성
//    · Cog 등급이 높을수록 더 넓은 범위의 포지션 해금
//    · POSITION_POOL[cog] 에서 Cog별 후보 관리
//    · CharacterManager, PartyScene 등 전역에서 사용
//
//  로드 순서: Data_Positions.js → Data_Passives.js → Data_Skills.js
//             → CharacterManager.js
//  의존: 없음
// ================================================================

// ── 범위 enum ─────────────────────────────────────────────────────
const RANGE = {
  ABOVE:      'above',
  FRONT:      'front',
  CURRENT:    'current',
  DIAGONAL:   'diagonal',
  FRONT_ALL:  'front_all',
  REAR:       'rear',
  BOTH_ROWS:  'both_rows',
  ALL:        'all',
};

// ── 포지션 정의 ───────────────────────────────────────────────────
const POSITION_DATA = {

  '윗칸 타격': {
    id:          'pos_above',
    name:        '윗칸 타격',
    cogMin:      1,
    range:       RANGE.ABOVE,
    description: '기본 공격이 자신의 바로 위 칸에 있는 적에게 적용된다.',
    effect:      null,
  },

  '앞칸 타격': {
    id:          'pos_front',
    name:        '앞칸 타격',
    cogMin:      1,
    range:       RANGE.FRONT,
    description: '기본 공격이 자신의 바로 앞 칸에 있는 적에게 적용된다.',
    effect:      null,
  },

  '현재 칸 타격': {
    id:          'pos_current',
    name:        '현재 칸 타격',
    cogMin:      2,
    range:       RANGE.CURRENT,
    description: '기본 공격이 자신이 위치한 칸의 적 전체에게 적용된다.',
    effect:      null,
  },

  '대각 타격': {
    id:          'pos_diagonal',
    name:        '대각 타격',
    cogMin:      3,
    range:       RANGE.DIAGONAL,
    description: '기본 공격이 대각선 방향의 칸에 있는 적에게 적용된다.',
    effect:      null,
  },

  '전열 전체 타격': {
    id:          'pos_front_all',
    name:        '전열 전체 타격',
    cogMin:      4,
    range:       RANGE.FRONT_ALL,
    description: '기본 공격이 이형 전열 전체에게 동시에 적용된다.',
    effect:      null,
  },

  '후열 타격': {
    id:          'pos_rear',
    name:        '후열 타격',
    cogMin:      5,
    range:       RANGE.REAR,
    description: '기본 공격이 후열 이형에게도 적용된다.',
    effect:      null,
  },

  '전/후열 동시 타격': {
    id:          'pos_both_rows',
    name:        '전/후열 동시 타격',
    cogMin:      6,
    range:       RANGE.BOTH_ROWS,
    description: '기본 공격이 전열과 후열 이형 모두에게 동시에 적용된다.',
    effect:      null,
  },

  '전체 칸 타격': {
    id:          'pos_all',
    name:        '전체 칸 타격',
    cogMin:      7,
    range:       RANGE.ALL,
    description: '기본 공격이 전장의 모든 이형에게 동시에 적용된다.',
    effect:      null,
  },

};

// ── Cog 등급별 포지션 풀 ──────────────────────────────────────────
const POSITION_POOL = {
  1:  ['윗칸 타격', '앞칸 타격'],
  2:  ['앞칸 타격', '현재 칸 타격'],
  3:  ['현재 칸 타격', '대각 타격', '윗칸 타격'],
  4:  ['전열 전체 타격', '대각 타격', '앞칸 타격'],
  5:  ['전열 전체 타격', '현재 칸 타격', '후열 타격'],
  6:  ['전/후열 동시 타격', '후열 타격', '전열 전체 타격'],
  7:  ['전체 칸 타격', '전/후열 동시 타격'],
  8:  ['전체 칸 타격', '전/후열 동시 타격'],
  9:  ['전체 칸 타격', '전/후열 동시 타격'],
  10: ['전체 칸 타격'],
};

// ── 편의 함수 ─────────────────────────────────────────────────────

function getPositionData(name) {
  return POSITION_DATA[name] || null;
}

function getPositionDescription(name) {
  return POSITION_DATA[name]?.description || '';
}

function getPositionPool(cog) {
  return POSITION_POOL[cog] || POSITION_POOL[1];
}
