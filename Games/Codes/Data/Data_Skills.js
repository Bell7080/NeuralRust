// ================================================================
//  Data_Skills.js
//  경로: Games/Codes/Data/Data_Skills.js
//
//  역할: 스킬 전체 정의
//        id, name, cogMin, type, gaugeRequired, triggerType,
//        triggerValue, effect, description
//
//  type:
//    'auto'   — 조건 충족 시 자동 발동 (triggerType/triggerValue 참조)
//    'manual' — 게이지 소모 후 초상화 클릭으로 수동 발동
//
//  triggerType:
//    'attack_count' — 공격 N회마다 발동
//    'on_hit'       — 피격 시 발동
//    'hp_below'     — HP N% 이하 시 발동
//    null           — manual 전용
//
//  gaugeRequired: 100 / 200 / 300 (manual 스킬 전용)
//
//  로드 순서: Data_Positions.js → Data_Passives.js → Data_Skills.js
//             → CharacterManager.js
//  의존: 없음
// ================================================================

const SKILL_DATA = [

  // ── Cog 1 ────────────────────────────────────────────────────────
  {
    id:            'basic_strike',
    name:          '기본 일격',
    cogMin:        1,
    type:          'auto',
    gaugeRequired: null,
    triggerType:   'attack_count',
    triggerValue:  3,
    effect:        { type: 'damage', target: 'enemy', value: 1.5, duration: null },
    description:   '공격 3회마다 자동 발동. 공격력의 150% 피해.',
  },
  {
    id:            'quick_stab',
    name:          '빠른 찌르기',
    cogMin:        1,
    type:          'manual',
    gaugeRequired: 100,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'damage', target: 'enemy', value: 1.2, duration: null },
    description:   '게이지 100 소모. 공격력의 120% 피해.',
  },

  // ── Cog 2 ────────────────────────────────────────────────────────
  {
    id:            'combo_hit',
    name:          '연속 타격',
    cogMin:        2,
    type:          'auto',
    gaugeRequired: null,
    triggerType:   'attack_count',
    triggerValue:  4,
    effect:        { type: 'damage', target: 'enemy', value: 2.0, duration: null },
    description:   '공격 4회마다 자동 발동. 공격력의 200% 피해.',
  },
  {
    id:            'guard_stance',
    name:          '방어 자세',
    cogMin:        2,
    type:          'manual',
    gaugeRequired: 100,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'buff', target: 'self', value: 0.3, duration: 2 },
    description:   '게이지 100 소모. 2턴간 받는 피해 30% 감소.',
  },

  // ── Cog 3 ────────────────────────────────────────────────────────
  {
    id:            'heavy_blow',
    name:          '강타',
    cogMin:        3,
    type:          'manual',
    gaugeRequired: 200,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'damage', target: 'enemy', value: 3.0, duration: null },
    description:   '게이지 200 소모. 공격력의 300% 피해.',
  },
  {
    id:            'evasion',
    name:          '회피 기동',
    cogMin:        3,
    type:          'auto',
    gaugeRequired: null,
    triggerType:   'on_hit',
    triggerValue:  1,
    effect:        { type: 'buff', target: 'self', value: 0.5, duration: 1 },
    description:   '피격 시 발동. 1턴간 회피율 50% 증가.',
  },
  {
    id:            'poison_coat',
    name:          '독 도포',
    cogMin:        3,
    type:          'manual',
    gaugeRequired: 100,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'debuff', target: 'enemy', value: 0.1, duration: 3 },
    description:   '게이지 100 소모. 3턴간 매 턴 공격력의 10% 독 피해.',
  },

  // ── Cog 4 ────────────────────────────────────────────────────────
  {
    id:            'aoe_strike',
    name:          '광역 타격',
    cogMin:        4,
    type:          'manual',
    gaugeRequired: 200,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'damage', target: 'all_enemies', value: 1.5, duration: null },
    description:   '게이지 200 소모. 모든 이형에게 공격력의 150% 피해.',
  },
  {
    id:            'strong_poison',
    name:          '강화 독',
    cogMin:        4,
    type:          'manual',
    gaugeRequired: 200,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'debuff', target: 'enemy', value: 0.2, duration: 4 },
    description:   '게이지 200 소모. 4턴간 매 턴 공격력의 20% 독 피해.',
  },
  {
    id:            'burst_speed',
    name:          '순간 가속',
    cogMin:        4,
    type:          'auto',
    gaugeRequired: null,
    triggerType:   'hp_below',
    triggerValue:  50,
    effect:        { type: 'buff', target: 'self', value: 0.5, duration: 3 },
    description:   'HP 50% 이하 시 자동 발동. 3턴간 공격속도 50% 증가.',
  },

  // ── Cog 5 ────────────────────────────────────────────────────────
  {
    id:            'explosion_hit',
    name:          '폭발 타격',
    cogMin:        5,
    type:          'manual',
    gaugeRequired: 200,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'damage', target: 'all_enemies', value: 2.5, duration: null },
    description:   '게이지 200 소모. 모든 이형에게 공격력의 250% 피해.',
  },
  {
    id:            'front_scan',
    name:          '전방 스캔',
    cogMin:        5,
    type:          'auto',
    gaugeRequired: null,
    triggerType:   'attack_count',
    triggerValue:  5,
    effect:        { type: 'debuff', target: 'enemy', value: 0.2, duration: 2 },
    description:   '공격 5회마다 발동. 대상 공격력 20% 감소 2턴.',
  },
  {
    id:            'armor_pierce',
    name:          '철갑 관통',
    cogMin:        5,
    type:          'manual',
    gaugeRequired: 300,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'damage', target: 'enemy', value: 5.0, duration: null },
    description:   '게이지 300 소모. 방어 무시. 공격력의 500% 피해.',
  },

  // ── Cog 6 ────────────────────────────────────────────────────────
  {
    id:            'deep_pressure',
    name:          '심해 압박',
    cogMin:        6,
    type:          'manual',
    gaugeRequired: 300,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'debuff', target: 'all_enemies', value: 0.3, duration: 3 },
    description:   '게이지 300 소모. 모든 이형 공격력 30% 감소 3턴.',
  },
  {
    id:            'electric_shock',
    name:          '전기 충격',
    cogMin:        6,
    type:          'manual',
    gaugeRequired: 200,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'damage', target: 'all_enemies', value: 2.0, duration: 1 },
    description:   '게이지 200 소모. 모든 이형에게 공격력의 200% 피해 + 1턴 경직.',
  },
  {
    id:            'iron_wall',
    name:          '철벽 방어',
    cogMin:        6,
    type:          'auto',
    gaugeRequired: null,
    triggerType:   'hp_below',
    triggerValue:  30,
    effect:        { type: 'buff', target: 'self', value: 0.6, duration: 2 },
    description:   'HP 30% 이하 시 자동 발동. 2턴간 받는 피해 60% 감소.',
  },

  // ── Cog 7+ ───────────────────────────────────────────────────────
  {
    id:            'core_overload',
    name:          '코어 오버로드',
    cogMin:        7,
    type:          'manual',
    gaugeRequired: 300,
    triggerType:   null,
    triggerValue:  null,
    effect:        { type: 'damage', target: 'all_enemies', value: 6.0, duration: null },
    description:   '게이지 300 소모. 모든 이형에게 공격력의 600% 피해. 시전 후 HP 10% 감소.',
  },
  {
    id:            'abyss_roar',
    name:          '심연의 포효',
    cogMin:        7,
    type:          'auto',
    gaugeRequired: null,
    triggerType:   'attack_count',
    triggerValue:  10,
    effect:        { type: 'buff', target: 'all_allies', value: 0.3, duration: 3 },
    description:   '공격 10회마다 발동. 아군 전체 공격력 30% 증가 3턴.',
  },

];

// ── Cog 등급별 스킬 풀 ────────────────────────────────────────────
// CharacterManager의 SKILL_POOL 대체용
const SKILL_POOL = (() => {
  const pool = {};
  for (let cog = 1; cog <= 10; cog++) pool[cog] = [];
  SKILL_DATA.forEach(s => {
    for (let cog = s.cogMin; cog <= 10; cog++) pool[cog].push(s.id);
  });
  return pool;
})();

// ── 편의 함수 ─────────────────────────────────────────────────────

function getSkillById(id) {
  return SKILL_DATA.find(s => s.id === id) || null;
}

function getSkillByName(name) {
  return SKILL_DATA.find(s => s.name === name) || null;
}

function getSkillDescription(id) {
  return getSkillById(id)?.description || '';
}

function getSkillPool(cog) {
  return SKILL_POOL[cog] || SKILL_POOL[1];
}
