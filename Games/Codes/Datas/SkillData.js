// ================================================================
//  SkillData.js
//  경로: Games/Codes/Data/SkillData.js
//
//  역할: 스킬 정의 데이터
//        id, name, description, effect(추후 구현)
//  의존: 없음
// ================================================================

const SKILL_DATA = {

  '기본 일격': {
    id:          'basic_strike',
    name:        '기본 일격',
    description: '기본 공격력으로 단일 대상을 타격합니다.',
    // 추후 구현 — 스킬 효과
    effect:      null,
  },

  '빠른 찌르기': {
    id:          'quick_stab',
    name:        '빠른 찌르기',
    description: '공격 속도가 증가하여 빠르게 단일 대상을 찌릅니다.',
    effect:      null,
  },

  '연속 타격': {
    id:          'combo_strike',
    name:        '연속 타격',
    description: '같은 대상을 2회 연속으로 타격합니다.',
    effect:      null,
  },

  '방어 자세': {
    id:          'guard_stance',
    name:        '방어 자세',
    description: '일정 시간 동안 받는 피해를 20% 감소시킵니다.',
    effect:      null,
  },

  '강타': {
    id:          'heavy_blow',
    name:        '강타',
    description: '공격력의 150%로 단일 대상을 강하게 타격합니다.',
    effect:      null,
  },

  '회피 기동': {
    id:          'evasive_move',
    name:        '회피 기동',
    description: '다음 공격을 1회 회피할 확률이 크게 증가합니다.',
    effect:      null,
  },

  '독 도포': {
    id:          'apply_poison',
    name:        '독 도포',
    description: '대상에게 독을 부여해 지속 피해를 입힙니다.',
    effect:      null,
  },

  '광역 타격': {
    id:          'aoe_strike',
    name:        '광역 타격',
    description: '인접한 모든 적에게 피해를 입힙니다.',
    effect:      null,
  },

  '강화 독': {
    id:          'enhanced_poison',
    name:        '강화 독',
    description: '더욱 강력한 독을 부여해 큰 지속 피해를 입힙니다.',
    effect:      null,
  },

  '순간 가속': {
    id:          'burst_speed',
    name:        '순간 가속',
    description: '민첩이 일시적으로 크게 상승합니다.',
    effect:      null,
  },

  '폭발 타격': {
    id:          'explosive_strike',
    name:        '폭발 타격',
    description: '공격력의 200%로 단일 대상을 폭발적으로 타격합니다.',
    effect:      null,
  },

  '전방 스캔': {
    id:          'front_scan',
    name:        '전방 스캔',
    description: '앞열 전체의 적 정보를 스캔하고 약점을 파악합니다.',
    effect:      null,
  },

  '철갑 관통': {
    id:          'armor_pierce',
    name:        '철갑 관통',
    description: '방어를 무시하고 순수 공격력으로 타격합니다.',
    effect:      null,
  },

  '심해 압박': {
    id:          'deep_pressure',
    name:        '심해 압박',
    description: '수압으로 대상의 이동 속도와 공격력을 감소시킵니다.',
    effect:      null,
  },

  '전기 충격': {
    id:          'electric_shock',
    name:        '전기 충격',
    description: '전기 충격으로 대상을 잠시 경직시키고 피해를 입힙니다.',
    effect:      null,
  },

  '철벽 방어': {
    id:          'iron_wall',
    name:        '철벽 방어',
    description: '받는 피해를 50% 감소시키는 강력한 방어 태세를 취합니다.',
    effect:      null,
  },

  '코어 오버로드': {
    id:          'core_overload',
    name:        '코어 오버로드',
    description: '자신의 코어를 과부하시켜 극대 피해를 입히지만 HP가 감소합니다.',
    effect:      null,
  },

  '심연의 포효': {
    id:          'abyss_roar',
    name:        '심연의 포효',
    description: '주변 모든 적에게 공포를 부여하고 대미지를 입힙니다.',
    effect:      null,
  },

};

// 편의 함수
function getSkillData(name) {
  return SKILL_DATA[name] || null;
}

function getSkillDescription(name) {
  return SKILL_DATA[name]?.description || '';
}
