// ================================================================
//  PassiveData.js
//  경로: Games/Codes/Data/PassiveData.js
//
//  역할: 패시브 특성 정의 데이터
//        전투 중 상시 발동하는 고유 특성
//        (공격 범위는 PositionData.js로 분리됨)
//
//  ── 설계 의도 ────────────────────────────────────────────────
//    · 패시브는 "어떻게 싸우는가"를 결정하는 성격 특성
//    · Cog 등급이 높을수록 더 강력한 패시브 풀이 해금됨
//    · PASSIVE_POOL[cog] 에서 Cog별 후보 관리
//    · effect: null — 추후 전투 엔진에서 id 기반으로 연결 예정
//
//  ── 로드 순서 ────────────────────────────────────────────────
//    PositionData.js → PassiveData.js → SkillData.js
//                   → CharacterManager.js
//
//  의존: 없음
// ================================================================

const PASSIVE_DATA = {

  // ── Cog 1~2 : 기초 생존형 ──────────────────────────────────

  '강인한 체질': {
    id:          'pas_tough_body',
    name:        '강인한 체질',
    description: '전투 시작 시 최대 HP의 5%를 추가로 회복합니다.',
    tier:        1,
    effect:      null,
  },

  '예리한 감각': {
    id:          'pas_sharp_sense',
    name:        '예리한 감각',
    description: '회피율이 5% 증가합니다.',
    tier:        1,
    effect:      null,
  },

  '행운아': {
    id:          'pas_lucky',
    name:        '행운아',
    description: '크리티컬 발생 시 추가로 Arc를 획득합니다.',
    tier:        2,
    effect:      null,
  },

  '빠른 회복': {
    id:          'pas_fast_regen',
    name:        '빠른 회복',
    description: '매 전투 턴 종료 시 HP를 소량 회복합니다.',
    tier:        2,
    effect:      null,
  },

  // ── Cog 3~4 : 전투 적응형 ──────────────────────────────────

  '투지': {
    id:          'pas_fighting_spirit',
    name:        '투지',
    description: 'HP가 50% 이하일 때 공격력이 10% 증가합니다.',
    tier:        3,
    effect:      null,
  },

  '집중력': {
    id:          'pas_focus',
    name:        '집중력',
    description: '연속 공격 성공 시 다음 공격의 크리티컬 확률이 증가합니다.',
    tier:        3,
    effect:      null,
  },

  '독 저항': {
    id:          'pas_poison_resist',
    name:        '독 저항',
    description: '독 상태이상의 지속 시간이 50% 감소합니다.',
    tier:        4,
    effect:      null,
  },

  '도발': {
    id:          'pas_taunt',
    name:        '도발',
    description: '인접한 적의 공격을 자신에게 끌어당깁니다.',
    tier:        4,
    effect:      null,
  },

  // ── Cog 5~6 : 전문 전투형 ──────────────────────────────────

  '강철 피부': {
    id:          'pas_iron_skin',
    name:        '강철 피부',
    description: '받는 물리 피해를 5% 감소합니다.',
    tier:        5,
    effect:      null,
  },

  '수중 적응': {
    id:          'pas_aqua_adapt',
    name:        '수중 적응',
    description: '수중 구간에서 모든 스탯이 8% 증가합니다.',
    tier:        5,
    effect:      null,
  },

  '야간 작전': {
    id:          'pas_night_ops',
    name:        '야간 작전',
    description: '야간 미션에서 민첩이 15% 증가합니다.',
    tier:        6,
    effect:      null,
  },

  '저격 자세': {
    id:          'pas_snipe_stance',
    name:        '저격 자세',
    description: '원거리 공격 시 피해가 12% 증가합니다.',
    tier:        6,
    effect:      null,
  },

  // ── Cog 7~8 : 고급 전술형 ──────────────────────────────────

  '전술 눈빛': {
    id:          'pas_tactical_eye',
    name:        '전술 눈빛',
    description: '전투 시작 시 적 1체의 약점이 공개됩니다.',
    tier:        7,
    effect:      null,
  },

  '심해의 숨결': {
    id:          'pas_deep_breath',
    name:        '심해의 숨결',
    description: '잠수 중 스태미나 소모가 30% 감소합니다.',
    tier:        7,
    effect:      null,
  },

  '불굴': {
    id:          'pas_unyielding',
    name:        '불굴',
    description: '치명타를 받아도 HP 1을 유지하며 생존합니다. (1회)',
    tier:        8,
    effect:      null,
  },

  '반격 본능': {
    id:          'pas_counter_instinct',
    name:        '반격 본능',
    description: '피격 시 15% 확률로 즉시 반격합니다.',
    tier:        8,
    effect:      null,
  },

  // ── Cog 9~10 : 최정예형 ────────────────────────────────────

  '절대 의지': {
    id:          'pas_absolute_will',
    name:        '절대 의지',
    description: '상태이상에 완전히 면역입니다.',
    tier:        9,
    effect:      null,
  },

  '코어 공명': {
    id:          'pas_core_resonance',
    name:        '코어 공명',
    description: '아군이 스킬을 사용할 때마다 자신의 공격력이 소량 누적 증가합니다.',
    tier:        10,
    effect:      null,
  },

};

// Cog 등급별 패시브 풀 — 높은 Cog일수록 강력한 패시브 해금
const PASSIVE_POOL = {
  1:  ['강인한 체질', '예리한 감각'],
  2:  ['예리한 감각', '행운아'],
  3:  ['투지', '빠른 회복'],
  4:  ['집중력', '도발'],
  5:  ['강철 피부', '수중 적응'],
  6:  ['야간 작전', '저격 자세'],
  7:  ['전술 눈빛', '심해의 숨결'],
  8:  ['불굴', '반격 본능'],
  9:  ['절대 의지', '반격 본능'],
  10: ['절대 의지', '코어 공명'],
};

// ── 편의 함수 ─────────────────────────────────────────────────────

function getPassiveData(name) {
  return PASSIVE_DATA[name] || null;
}

function getPassiveDescription(name) {
  return PASSIVE_DATA[name]?.description || '';
}

function getPassivePool(cog) {
  return PASSIVE_POOL[cog] || PASSIVE_POOL[1];
}
