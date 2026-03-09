// ================================================================
//  PositionData.js
//  경로: Games/Codes/Data/PositionData.js
//
//  역할: 포지션 정의 데이터 — 캐릭터의 공격이 닿는 칸 범위
//        (구 PassiveData.js의 공격범위 내용을 분리·이전)
//
//  ── 설계 의도 ────────────────────────────────────────────────
//    · 포지션은 "어디를 때리는가"를 결정하는 전투 배치 속성
//    · Cog 등급이 높을수록 더 넓은 범위의 포지션이 해금됨
//    · Recruit_Data.js의 POSITION_POOL[cog]에서 참조
//    · CharacterManager, Tab_CharProfile 등 전역에서 사용
//
//  의존: 없음
// ================================================================

const POSITION_DATA = {

  '윗칸 타격': {
    id:          'pos_above',
    name:        '윗칸 타격',
    description: '자신의 바로 위 칸에 있는 적을 공격합니다.',
    range:       'above',
    effect:      null,
  },

  '앞칸 타격': {
    id:          'pos_front',
    name:        '앞칸 타격',
    description: '자신의 바로 앞 칸에 있는 적을 공격합니다.',
    range:       'front',
    effect:      null,
  },

  '현재 칸 타격': {
    id:          'pos_current',
    name:        '현재 칸 타격',
    description: '자신이 위치한 칸의 적을 공격합니다.',
    range:       'current',
    effect:      null,
  },

  '대각 타격': {
    id:          'pos_diagonal',
    name:        '대각 타격',
    description: '대각선 방향의 칸에 있는 적을 공격합니다.',
    range:       'diagonal',
    effect:      null,
  },

  '전열 전체 타격': {
    id:          'pos_front_all',
    name:        '전열 전체 타격',
    description: '앞쪽 세 칸 전체의 적을 동시에 공격합니다.',
    range:       'front_all',
    effect:      null,
  },

  '후열 타격': {
    id:          'pos_rear',
    name:        '후열 타격',
    description: '자신의 뒤쪽 칸에 있는 적을 공격합니다.',
    range:       'rear',
    effect:      null,
  },

  '전/후열 동시 타격': {
    id:          'pos_both_rows',
    name:        '전/후열 동시 타격',
    description: '앞열과 뒷열 양쪽을 동시에 공격합니다.',
    range:       'both_rows',
    effect:      null,
  },

  '전체 칸 타격': {
    id:          'pos_all',
    name:        '전체 칸 타격',
    description: '배치판의 모든 칸에 있는 적을 공격합니다.',
    range:       'all',
    effect:      null,
  },

};

// Cog 등급별 포지션 풀 — 높은 Cog일수록 더 넓은 범위 해금
const POSITION_POOL = {
  1:  ['윗칸 타격', '앞칸 타격'],
  2:  ['앞칸 타격', '현재 칸 타격'],
  3:  ['현재 칸 타격', '대각 타격'],
  4:  ['대각 타격', '윗칸 타격'],
  5:  ['전열 전체 타격', '후열 타격'],
  6:  ['전열 전체 타격', '현재 칸 타격'],
  7:  ['전/후열 동시 타격', '후열 타격'],
  8:  ['전/후열 동시 타격', '전열 전체 타격'],
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
