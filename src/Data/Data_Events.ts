// ================================================================
//  Data_Events.ts
//  경로: src/Data/Data_Events.ts
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

import type { EventDefinition, EventId, PartyState } from '../types';

export const EVENT_TYPE: Record<string, EventId> = {
  COMBAT:    'combat',
  FISHING:   'fishing',
  SALVAGE:   'salvage',
  WIRE:      'wire_connect',
  DEEP_SHOP: 'deep_shop',
  DRIFTER:   'drifter',
  SIGNAL:    'signal',
  REPAIR:    'repair',
  RETREAT:   'retreat',
};

export const EVENT_DATA: EventDefinition[] = [

  // ── 전투 ─────────────────────────────────────────────────────
  {
    id: 'combat',
    name: '전투',
    weight: 4,
    forcedCondition: null,
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: { type: 'enemy_drop' },
    description: '이형과 전투가 발생한다. 코그 상한 기준으로 이형이 등장.',
  },

  // ── 낚시 이벤트 ──────────────────────────────────────────────
  {
    id: 'fishing',
    name: '낚시',
    weight: 2,
    forcedCondition: null,
    requiredJob: 'fisher',
    efficiencyPenalty: 0.3,
    reward: { type: 'currency', baseValue: 10, minigame: true },
    description: '낚시꾼이 있으면 풍성한 수확. 없으면 성공률이 대폭 낮아진다.',
  },

  // ── 잔해 수집 ─────────────────────────────────────────────────
  {
    id: 'salvage',
    name: '잔해 수집',
    weight: 2,
    forcedCondition: null,
    requiredJob: 'diver',
    efficiencyPenalty: 0.2,
    reward: { type: 'item_pool', pool: 'event_salvage' },
    description: '침몰 잔해에서 고철과 아이템을 수집한다. 잠수부가 있어야 효율적이다.',
  },

  // ── 전선 연결 ─────────────────────────────────────────────────
  {
    id: 'wire_connect',
    name: '전선 연결',
    weight: 2,
    forcedCondition: null,
    requiredJob: 'ai',
    efficiencyPenalty: 0.1,
    reward: { type: 'currency', baseValue: 15 },
    description: '끊어진 전선을 복구한다. AI가 있어야 빠르게 완료된다.',
  },

  // ── 심해 상점 ─────────────────────────────────────────────────
  {
    id: 'deep_shop',
    name: '심해 상점',
    weight: 1,
    forcedCondition: null,
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: { type: 'shop', currency: 'deep_currency', pool: 'deep_shop' },
    description: '심해화폐로 아이템을 구매할 수 있다.',
  },

  // ── 표류체 발견 (즉발형 도박) ─────────────────────────────────
  {
    id: 'drifter',
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

  // ── 추적 신호 (선택형 도박) ──────────────────────────────────
  {
    id: 'signal',
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
            { weight: 2, type: 'item',          value: 'random_unique', label: '고보상' },
            { weight: 1, type: 'combat_ambush', value: null,            label: '기습 전투' },
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

  // ── 긴급 정비 ─────────────────────────────────────────────────
  {
    id: 'repair',
    name: '긴급 정비',
    weight: 0.5,
    forcedCondition: null,
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: { type: 'ship_heal', value: 0.1 },
    description: '잠수정을 긴급 수리한다. 체력을 소량 회복한다.',
  },

  // ── 철수 (강제 포함 조건) ─────────────────────────────────────
  {
    id: 'retreat',
    name: '철수',
    weight: 1,
    forcedCondition: [
      { type: 'party_half_down' },
      { type: 'ship_hp_below', value: 0.5 },
    ],
    requiredJob: null,
    efficiencyPenalty: 1.0,
    reward: { type: 'end_expedition' },
    description: '탐사를 즉시 종료하고 결산한다. 조건 충족 시 슬롯에 강제 포함.',
  },
];

// ──────────────────────────────────────────────────────────────
//  헬퍼: buildSlots(count, partyState)
//  — 라운드 슬롯 count개를 추첨해 이벤트 id 배열로 반환
// ──────────────────────────────────────────────────────────────
export function buildSlots(count: number, partyState: PartyState): EventId[] {
  const slots: EventId[] = [];
  let remaining = count;

  // 1. 강제 포함 처리
  const forceRetreat = partyState.halfDown || partyState.shipHpRatio <= 0.5;
  if (forceRetreat) {
    slots.push('retreat');
    remaining -= 1;
  }

  // 2. 일반 가중치 추첨 (철수 제외)
  const pool        = EVENT_DATA.filter(e => e.id !== 'retreat');
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);

  for (let i = 0; i < remaining; i++) {
    let r = Math.random() * totalWeight;
    for (const ev of pool) {
      r -= ev.weight;
      if (r <= 0) { slots.push(ev.id); break; }
    }
  }

  // 철수가 있으면 앞으로 이동
  slots.sort(a => (a === 'retreat' ? -1 : 0));
  return slots;
}
