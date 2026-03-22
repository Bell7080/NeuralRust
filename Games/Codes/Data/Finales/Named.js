// ================================================================
//  Finales/Named.js
//  경로: Games/Codes/Data/Finales/Named.js
//
//  역할: 전용(named) 피날레 — Cog 9~10 네임드 캐릭터 전용
//        일반 가챠 풀에 포함되지 않음.
//        CharacterManager.createNamedCharacter() 또는
//        스토리 드레지(Dredge) 이벤트를 통해서만 부여.
//
//  주의: Named 피날레는 AbilityIndex 풀 구성에서 제외됨.
//        ABILITY_POOLS.finale.named 로 별도 관리.
// ================================================================

if (typeof FINALE_REGISTRY === 'undefined') var FINALE_REGISTRY = [];

// ── 네임드 피날레 ─────────────────────────────────────────────────
// id 앞에 'named_' 접두사를 붙여 일반 피날레와 구분
FINALE_REGISTRY.push(

  // ── Cog 9 : 전설급 ───────────────────────────────────────────
  {
    id:            'named_rust_tide',
    name:          '녹슨 조류',
    job:           'named',
    cogMin:        9,
    gaugeRequired: 300,
    description:   '게이지 300. 전장의 모든 이형에게 공격력의 800% 피해. 처치된 이형 수만큼 아군 전체 HP를 회복한다.',
    effect:        null,
  },
  {
    id:            'named_neural_surge',
    name:          '뇌신경 급류',
    job:           'named',
    cogMin:        9,
    gaugeRequired: 300,
    description:   '게이지 300. 아군 전체의 게이지를 MAX로 충전하고 모든 디버프를 제거한다. 이번 라운드 동안 피날레 재사용 가능.',
    effect:        null,
  },

  // ── Cog 10 : 전설 / 특이점 ────────────────────────────────────
  {
    id:            'named_abyss_singularity',
    name:          '심연의 특이점',
    job:           'named',
    cogMin:        10,
    gaugeRequired: 300,
    description:   '게이지 300. 전장의 시간을 멈춘다. 3턴간 아군만 행동 가능. 효과 중 처치한 이형 수만큼 추가 효과 발동.',
    effect:        null,
  },

);
