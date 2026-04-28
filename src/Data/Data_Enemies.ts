// ================================================================
//  Data_Enemies.ts
//  경로: src/Data/Data_Enemies.ts
//
//  역할: 이형(적) 종류·스탯·능력·행동패턴·처치보상 정의
//
//  스탯 체계:
//    baseStats — Cog 1 기준값
//    statScaling — Cog 등급 1 오를 때마다 곱해지는 배율
//    라운드 스케일 — 라운드마다 ROUND_SCALE% 증가 (getEnemyScaledStats 참고)
//
//  behavior (타겟 선택):
//    'random'        — 무작위 대상 공격
//    'target_weak'   — HP 가장 낮은 아군 우선
//    'target_strong' — HP 가장 높은 아군 우선
//    'wave'          — 다수 등장, 주변 동종 수에 따라 스탯 증가
//
//  능력 구조 (아군과 동일):
//    passive  — 수동 효과 (common 또는 enemy 전용)
//    action   — 기본 행동 (common 또는 enemy 전용)
//    enhanced — 트리거 조건부 강화 행동
//    ※ 피날레 없음
// ================================================================

import type { EnemyDefinition, EnemyBaseStats } from '../types';

// 라운드당 스탯 증가율 (12%)
export const ENEMY_ROUND_SCALE = 0.12;

export const ENEMY_DATA: EnemyDefinition[] = [

  // ────────────────────────────────────────────────────────────
  //  심해어  (Deep Fish)
  //  Cog 1~4 등장. 기본형. 받는 피해 감소 + 체력 위기 시 광분.
  // ────────────────────────────────────────────────────────────
  {
    id:          'deep_fish',
    name:        '심해어',
    cogMin:      1,
    cogMax:      4,
    baseStats:   { hp: 80, attack: 12, agility: 8, luck: 5 },
    statScaling: 1.25,
    behavior:    'random',
    passive:     'depth_skin',
    action:      'chomp',
    enhanced:    'blood_frenzy',
    spawnCount:  [1, 2],
    spawnWeight: 4,
    reward:      { type: 'none', value: 0 },
    description: '기본형 이형. 심해 표피로 피해를 줄이고, 체력이 위태로워지면 광분한다.',
  },

  // ────────────────────────────────────────────────────────────
  //  야생 AI  (Wild AI)
  //  Cog 2~7 등장. HP 낮은 대상 우선 공격. 아군 사망마다 강해짐.
  // ────────────────────────────────────────────────────────────
  {
    id:          'wild_ai',
    name:        '야생 AI',
    cogMin:      2,
    cogMax:      7,
    baseStats:   { hp: 60, attack: 18, agility: 12, luck: 10 },
    statScaling: 1.30,
    behavior:    'target_weak',
    passive:     'predator_instinct',
    action:      'lunge',
    enhanced:    'last_stand',
    spawnCount:  [1, 2],
    spawnWeight: 3,
    reward:      { type: 'currency', value: 5 },
    description: '빈틈 공략형. 약자를 우선 노리며, 아군을 쓰러뜨릴수록 강해진다.',
  },

  // ────────────────────────────────────────────────────────────
  //  침수자  (Drowned)
  //  Cog 3+ 등장. 다수 등장, 군집할수록 강해짐.
  // ────────────────────────────────────────────────────────────
  {
    id:          'drowned',
    name:        '침수자',
    cogMin:      3,
    cogMax:      null,
    baseStats:   { hp: 50, attack: 10, agility: 6, luck: 3 },
    statScaling: 1.20,
    behavior:    'wave',
    passive:     'pack_hunt',
    action:      'spew_ink',
    enhanced:    'pack_signal',
    spawnCount:  [3, 5],
    spawnWeight: 3,
    waveBonus:   { attackBonus: 0.05, hpBonus: 0.05 },
    reward:      { type: 'item', value: 1 },
    description: '웨이브형. 무리를 지을수록 강해지며, 공격 신호로 동료를 강화한다.',
  },
];

// ──────────────────────────────────────────────────────────────
//  getEnemyScaledStats(enemyId, cogLevel, round?)
//  — Cog 등급 + 라운드에 따라 최종 스탯 반환
//
//  스탯 공식:
//    cogScale   = statScaling ^ (cogLevel - cogMin)
//    roundScale = 1 + ENEMY_ROUND_SCALE × (round - 1)
//    finalStat  = baseStat × cogScale × roundScale
// ──────────────────────────────────────────────────────────────
export function getEnemyScaledStats(
  enemyId: string,
  cogLevel: number,
  round = 1,
): EnemyBaseStats | null {
  const def = ENEMY_DATA.find(e => e.id === enemyId);
  if (!def) return null;
  const cogScale   = Math.pow(def.statScaling, cogLevel - def.cogMin);
  const roundScale = 1 + ENEMY_ROUND_SCALE * (round - 1);
  const s          = cogScale * roundScale;
  return {
    hp:      Math.round(def.baseStats.hp      * s),
    attack:  Math.round(def.baseStats.attack  * s),
    agility: Math.round(def.baseStats.agility * s),
    luck:    Math.round(def.baseStats.luck    * s),
  };
}

// ──────────────────────────────────────────────────────────────
//  getEnemyAbilities(enemyId)
//  — 해당 적의 passive / action / enhanced id 반환
// ──────────────────────────────────────────────────────────────
export function getEnemyAbilities(enemyId: string): {
  passive: string; action: string; enhanced: string;
} | null {
  const def = ENEMY_DATA.find(e => e.id === enemyId);
  if (!def) return null;
  return { passive: def.passive, action: def.action, enhanced: def.enhanced };
}
