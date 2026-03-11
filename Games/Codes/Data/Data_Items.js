// ================================================================
//  Data_Items.js
//  경로: Games/Codes/Data/Data_Items.js
//
//  역할: 모든 아이템 정의 (처치보상·이벤트보상·상점 판매)
//
//  effect.type:
//    'stat_boost'       — 특정 스탯 수치 증가
//    'heal'             — HP 즉시 회복 (value = 회복량)
//    'gauge_boost'      — 전투 게이지 즉시 충전 (value = 충전량)
//    'passive_override' — 패시브 범위를 특정 RANGE로 교체
//    'weight_boost'     — 직업 특성 획득 가중치 증가
//
//  source 목록:
//    'diver_reward'   — 잠수부 처치 보상
//    'event_salvage'  — 잔해 수집 이벤트
//    'event_drifter'  — 표류체 발견 이벤트
//    'deep_shop'      — 심해 상점 구매
// ================================================================

const ITEM_DATA = [

  // ── 소모품 — 회복 ────────────────────────────────────────────

  {
    id: 'stim_pack',
    name: '자극제',
    rarity: 'common',
    effect: { type: 'heal', stat: null, value: 30 },
    source: ['diver_reward', 'event_salvage', 'deep_shop'],
    description: '즉시 HP 30 회복.',
  },
  {
    id: 'repair_kit',
    name: '수리 키트',
    rarity: 'common',
    effect: { type: 'heal', stat: null, value: 60 },
    source: ['event_salvage', 'deep_shop'],
    description: '즉시 HP 60 회복.',
  },
  {
    id: 'deep_serum',
    name: '심해 혈청',
    rarity: 'rare',
    effect: { type: 'heal', stat: null, value: 150 },
    source: ['deep_shop', 'event_drifter'],
    description: '즉시 HP 150 회복. 심해에서만 구할 수 있는 귀한 약물.',
  },

  // ── 소모품 — 게이지 ──────────────────────────────────────────

  {
    id: 'arc_cell',
    name: '아크 셀',
    rarity: 'common',
    effect: { type: 'gauge_boost', stat: null, value: 100 },
    source: ['diver_reward', 'event_salvage'],
    description: '전투 게이지 100 즉시 충전.',
  },
  {
    id: 'overcharge_chip',
    name: '과충전 칩',
    rarity: 'rare',
    effect: { type: 'gauge_boost', stat: null, value: 300 },
    source: ['deep_shop'],
    description: '전투 게이지 300 즉시 충전. 즉시 강 스킬 발동 가능.',
  },

  // ── 장비 — 스탯 강화 ─────────────────────────────────────────

  {
    id: 'rusty_blade',
    name: '녹슨 날',
    rarity: 'common',
    effect: { type: 'stat_boost', stat: 'attack', value: 5 },
    source: ['event_salvage', 'diver_reward'],
    description: '공격 +5. 부식됐지만 아직 쓸 만하다.',
  },
  {
    id: 'pressure_suit',
    name: '압력 수트',
    rarity: 'common',
    effect: { type: 'stat_boost', stat: 'hp', value: 20 },
    source: ['event_salvage', 'deep_shop'],
    description: '체력 +20. 심해 압력을 버티는 낡은 장비.',
  },
  {
    id: 'gyro_module',
    name: '자이로 모듈',
    rarity: 'common',
    effect: { type: 'stat_boost', stat: 'agility', value: 8 },
    source: ['diver_reward', 'deep_shop'],
    description: '민첩 +8. 관절 움직임을 보정한다.',
  },
  {
    id: 'salvage_lens',
    name: '인양 렌즈',
    rarity: 'rare',
    effect: { type: 'stat_boost', stat: 'luck', value: 15 },
    source: ['event_drifter', 'deep_shop'],
    description: '행운 +15. 낡은 광학 장치. 상황 판단을 돕는다.',
  },
  {
    id: 'cog_brace',
    name: '코그 보강재',
    rarity: 'rare',
    effect: { type: 'stat_boost', stat: 'hp', value: 50 },
    source: ['deep_shop'],
    description: '체력 +50. 고급 합금 외피 보강재.',
  },
  {
    id: 'deep_core',
    name: '심해 코어',
    rarity: 'unique',
    effect: { type: 'stat_boost', stat: 'attack', value: 20 },
    source: ['event_drifter'],
    description: '공격 +20. 정체불명의 발광 코어. 출처가 불분명하다.',
  },

  // ── 장비 — 가중치 강화 ───────────────────────────────────────

  {
    id: 'collector_tag',
    name: '수집가 인식표',
    rarity: 'rare',
    effect: {
      type: 'weight_boost',
      stat: 'diver_reward_tier4',   // 잠수부 아이템 4개 획득 가중치
      value: 0.5,                   // 가중치 +0.5
    },
    source: ['deep_shop'],
    description: '잠수부 아이템 최대 획득 확률 증가.',
  },
  {
    id: 'arc_amplifier',
    name: '아크 증폭기',
    rarity: 'rare',
    effect: {
      type: 'weight_boost',
      stat: 'ai_reward_tier4',      // AI 아크 50개 획득 가중치
      value: 0.5,
    },
    source: ['deep_shop'],
    description: 'AI 최대 아크 획득 확률 증가.',
  },
];

// ──────────────────────────────────────────────────────────────
//  헬퍼: getItemById(id)
// ──────────────────────────────────────────────────────────────
function getItemById(id) {
  return ITEM_DATA.find(item => item.id === id) || null;
}

// ──────────────────────────────────────────────────────────────
//  헬퍼: getItemsBySource(source)
//  — 특정 획득처에서 드롭 가능한 아이템 목록 반환
// ──────────────────────────────────────────────────────────────
function getItemsBySource(source) {
  return ITEM_DATA.filter(item => item.source.includes(source));
}
