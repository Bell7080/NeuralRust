// ================================================================
//  PassiveData.js
//  경로: Games/Codes/Data/PassiveData.js
//
//  역할: 패시브 정의 데이터
//        id, name, description, effect(추후 구현)
//  의존: 없음
// ================================================================

const PASSIVE_DATA = {

  '윗칸 타격': {
    id:          'hit_above',
    name:        '윗칸 타격',
    description: '자신의 바로 위 칸에 있는 적을 공격합니다.',
    // 추후 구현
    effect:      null,
  },

  '앞칸 타격': {
    id:          'hit_front',
    name:        '앞칸 타격',
    description: '자신의 바로 앞 칸에 있는 적을 공격합니다.',
    effect:      null,
  },

  '현재 칸 타격': {
    id:          'hit_current',
    name:        '현재 칸 타격',
    description: '자신이 위치한 칸의 적을 공격합니다.',
    effect:      null,
  },

  '대각 타격': {
    id:          'hit_diagonal',
    name:        '대각 타격',
    description: '대각선 방향의 칸에 있는 적을 공격합니다.',
    effect:      null,
  },

  '전열 전체 타격': {
    id:          'hit_front_all',
    name:        '전열 전체 타격',
    description: '앞쪽 세 칸 전체의 적을 동시에 공격합니다.',
    effect:      null,
  },

  '후열 타격': {
    id:          'hit_rear',
    name:        '후열 타격',
    description: '자신의 뒤쪽 칸에 있는 적을 공격합니다.',
    effect:      null,
  },

  '전/후열 동시 타격': {
    id:          'hit_both_rows',
    name:        '전/후열 동시 타격',
    description: '앞열과 뒷열 양쪽을 동시에 공격합니다.',
    effect:      null,
  },

  '전체 칸 타격': {
    id:          'hit_all',
    name:        '전체 칸 타격',
    description: '배치판의 모든 칸에 있는 적을 공격합니다.',
    effect:      null,
  },

};

// 편의 함수
function getPassiveData(name) {
  return PASSIVE_DATA[name] || null;
}

function getPassiveDescription(name) {
  return PASSIVE_DATA[name]?.description || '';
}
