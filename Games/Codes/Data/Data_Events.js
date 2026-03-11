// ================================================================
//  Data_Events.js
//  경로: Games/Codes/Data/Data_Events.js
//
//  역할: 라운드 슬롯 결과 정의 (출현 가중치·강제 조건·연관 직업·보상)
//
//  전체 슬롯 추첨 흐름:
//    1. forcedCondition 충족 이벤트가 있으면 슬롯 중 1개에 강제 배정
//    2. 나머지 슬롯은 weight 기반 가중치 추첨
//
//  requiredJob:
//    null   — 직업 무관
//    string — 해당 직업 파티 보유 시 수집 효율 100%
//             미보유 시 efficiencyPenalty 배율 적용
// ================================================================

const EVENT_TYPE = {
  COMBAT:       'combat',
  FISHING:      'fishing',
  SALVAGE:      'salvage',
  WIRE:         'wire_connect',
  DEEP_SHOP:    'deep_shop',
  DRIFTER:      'drifter',
  SIGNAL:       'signal',
  REPAIR:       'repair',
  RETREAT:      'retreat',
};

const EVENT_DATA = [

  // ────────────────────────────────────────────────────────────
  //  전투
  // ────────────────────────────────────────────────────────────
  {
    id: EVENT_TYPE.COMBAT,
    name: '전투',
    weight: 4,
    forcedCondition: null,
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: {
      type: 'enemy_drop',           // 처치한 이형 종류에 따라 보상
    },
    description: '이형과 전투가 발생한다. 코그 상한 기준으로 이형이 등장.',
  },

  // ────────────────────────────────────────────────────────────
  //  낚시 이벤트
  // ────────────────────────────────────────────────────────────
  {
    id: EVENT_TYPE.FISHING,
    name: '낚시',
    weight: 2,
    forcedCondition: null,
    requiredJob: 'fisher',
    efficiencyPenalty: 0.3,         // 낚시꾼 없으면 성공률 30%
    reward: {
      type: 'currency',
      baseValue: 10,                // 낚시꾼 있을 때 기본 획득 화폐
      minigame: true,               // 타이밍 기반 미니게임 포함
    },
    description: '낚시꾼이 있으면 풍성한 수확. 없으면 성공률이 대폭 낮아진다.',
  },

  // ────────────────────────────────────────────────────────────
  //  잔해 수집
  // ────────────────────────────────────────────────────────────
  {
    id: EVENT_TYPE.SALVAGE,
    name: '잔해 수집',
    weight: 2,
    forcedCondition: null,
    requiredJob: 'diver',
    efficiencyPenalty: 0.2,         // 잠수부 없으면 채굴 속도 20%
    reward: {
      type: 'item_pool',
      pool: 'event_salvage',        // Data_Items.js source 키
    },
    description: '침몰 잔해에서 고철과 아이템을 수집한다. 잠수부가 있어야 효율적이다.',
  },

  // ────────────────────────────────────────────────────────────
  //  전선 연결
  // ────────────────────────────────────────────────────────────
  {
    id: EVENT_TYPE.WIRE,
    name: '전선 연결',
    weight: 2,
    forcedCondition: null,
    requiredJob: 'ai',
    efficiencyPenalty: 0.1,         // AI 없으면 복구 속도 10%
    reward: {
      type: 'currency',
      baseValue: 15,
    },
    description: '끊어진 전선을 복구한다. AI가 있어야 빠르게 완료된다.',
  },

  // ────────────────────────────────────────────────────────────
  //  심해 상점
  // ────────────────────────────────────────────────────────────
  {
    id: EVENT_TYPE.DEEP_SHOP,
    name: '심해 상점',
    weight: 1,
    forcedCondition: null,
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: {
      type: 'shop',
      currency: 'deep_currency',    // 심해화폐 전용
      pool: 'deep_shop',
    },
    description: '심해화폐로 아이템을 구매할 수 있다.',
  },

  // ────────────────────────────────────────────────────────────
  //  표류체 발견  (즉발형 도박)
  // ────────────────────────────────────────────────────────────
  {
    id: EVENT_TYPE.DRIFTER,
    name: '표류체 발견',
    weight: 1,
    forcedCondition: null,
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: {
      type: 'gamble',
      outcomes: [
        { weight: 3, type: 'item',     value: 'random_rare',  label: '아이템 획득' },
        { weight: 2, type: 'currency', value: 20,             label: '화폐 획득' },
        { weight: 1, type: 'trap',     value: 'damage_party', label: '함정 — 파티 피해' },
      ],
    },
    description: '정체불명의 표류물. 열면 보상 또는 위험이 즉시 발생한다.',
  },

  // ────────────────────────────────────────────────────────────
  //  추적 신호  (선택형 도박)
  // ────────────────────────────────────────────────────────────
  {
    id: EVENT_TYPE.SIGNAL,
    name: '추적 신호',
    weight: 1,
    forcedCondition: null,
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: {
      type: 'choice_gamble',
      choices: [
        {
          label: '신호 추적',
          outcomes: [
            { weight: 2, type: 'item', value: 'random_unique', label: '고보상' },
            { weight: 1, type: 'combat_ambush', value: null,   label: '기습 전투' },
          ],
        },
        {
          label: '무시하고 통과',
          outcomes: [
            { weight: 1, type: 'nothing', value: null, label: '아무 일 없음' },
          ],
        },
      ],
    },
    description: '미지의 신호를 감지했다. 추적할 경우 고보상 또는 기습 전투.',
  },

  // ────────────────────────────────────────────────────────────
  //  긴급 정비
  // ────────────────────────────────────────────────────────────
  {
    id: EVENT_TYPE.REPAIR,
    name: '긴급 정비',
    weight: 0.5,
    forcedCondition: null,
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: {
      type: 'ship_heal',
      value: 0.1,                   // 잠수정 최대 HP의 10% 회복
    },
    description: '잠수정을 긴급 수리한다. 체력을 소량 회복한다.',
  },

  // ────────────────────────────────────────────────────────────
  //  철수  (강제 포함 조건 있음)
  // ────────────────────────────────────────────────────────────
  {
    id: EVENT_TYPE.RETREAT,
    name: '철수',
    weight: 1,
    forcedCondition: [
      // 아래 조건 중 하나라도 충족 시 다음 라운드 슬롯 3개 중 1개를 강제로 배정
      { type: 'party_half_down' },          // 파티 절반 이상 전투불능
      { type: 'ship_hp_below', value: 0.5 }, // 잠수정 HP 50% 이하
    ],
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: {
      type: 'end_expedition',               // 즉시 탐사 종료 후 결산
    },
    description: '탐사를 즉시 종료하고 결산한다. 조건 충족 시 슬롯에 강제 포함.',
  },
];

// ──────────────────────────────────────────────────────────────
//  헬퍼: buildSlots(count, cogLevel, partyState)
//  — 라운드 슬롯 count개를 추첨해 이벤트 id 배열로 반환
//
//  partyState: { halfDown: bool, shipHpRatio: number }
// ──────────────────────────────────────────────────────────────
function buildSlots(count, partyState) {
  const slots = [];

  // 1. 강제 포함 처리
  const retreatDef = EVENT_DATA.find(e => e.id === EVENT_TYPE.RETREAT);
  const forceRetreat =
    partyState.halfDown ||
    partyState.shipHpRatio <= 0.5;

  if (forceRetreat) {
    // 슬롯 1개 고정, 나머지 count-1개 추첨
    slots.push(EVENT_TYPE.RETREAT);
    count -= 1;
  }

  // 2. 일반 가중치 추첨 (철수 제외)
  const pool = EVENT_DATA.filter(e => e.id !== EVENT_TYPE.RETREAT);
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);

  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalWeight;
    for (const ev of pool) {
      r -= ev.weight;
      if (r <= 0) { slots.push(ev.id); break; }
    }
  }

  // 철수가 있으면 앞으로 이동해 플레이어가 인지하기 쉽게
  slots.sort(a => a === EVENT_TYPE.RETREAT ? -1 : 0);
  return slots;
}
