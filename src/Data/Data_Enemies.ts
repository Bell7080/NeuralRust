// ================================================================
//  Data_Enemies.ts
//  경로: src/Data/Data_Enemies.ts
//
//  역할: 이형(적) 종류·스탯·행동패턴·처치보상 정의
//
//  behavior 타입:
//    'random'      — 무작위 대상 공격
//    'target_weak' — HP 가장 낮은 아군 우선 공격
//    'wave'        — 다수 등장, 주변 동종 수에 따라 스탯 증가
// ================================================================

import type { EnemyDefinition, EnemyBaseStats } from '../types';

export const ENEMY_DATA: EnemyDefinition[] = [

  // ────────────────────────────────────────────────────────────
  //  심해어  (Deep Fish)
  //  Cog 1~4 등장. 기본형. 특수 패턴 없음.
  // ────────────────────────────────────────────────────────────
  {
    id: 'deep_fish',
    name: '심해어',
    cogMin: 1,
    cogMax: 4,
    baseStats: { hp: 80, attack: 12, agility: 8, luck: 5 },
    statScaling: 1.25,
    behavior: 'random',
    behaviorWeights: { attack: 7, move: 2, skill: 1 },
    spawnCount: [1, 2],
    spawnWeight: 4,
    reward: { type: 'none', value: 0 },
    description: '기본형 이형. 별다른 전술 없이 공격한다.',
  },

  // ────────────────────────────────────────────────────────────
  //  야생 AI  (Wild AI)
  //  Cog 2~7 등장. HP 낮은 대상 우선 공격.
  // ────────────────────────────────────────────────────────────
  {
    id: 'wild_ai',
    name: '야생 AI',
    cogMin: 2,
    cogMax: 7,
    baseStats: { hp: 60, attack: 18, agility: 12, luck: 10 },
    statScaling: 1.3,
    behavior: 'target_weak',
    behaviorWeights: { attack: 6, move: 1, skill: 3 },
    spawnCount: [1, 2],
    spawnWeight: 3,
    reward: { type: 'currency', value: 5 },
    description: '빈틈 공략형. HP가 낮은 아군을 우선 노린다.',
  },

  // ────────────────────────────────────────────────────────────
  //  침수자  (Drowned)
  //  Cog 3+ 등장. 다수 등장, 주변 침수자 수에 따라 스탯 증가.
  // ────────────────────────────────────────────────────────────
  {
    id: 'drowned',
    name: '침수자',
    cogMin: 3,
    cogMax: null,
    baseStats: { hp: 50, attack: 10, agility: 6, luck: 3 },
    statScaling: 1.2,
    behavior: 'wave',
    behaviorWeights: { attack: 8, move: 2, skill: 0 },
    spawnCount: [3, 5],
    spawnWeight: 3,
    waveBonus: { attackBonus: 0.05, hpBonus: 0.05 },
    reward: { type: 'item', value: 1 },
    description: '웨이브형. 무리를 지을수록 강해진다.',
  },
];

// ──────────────────────────────────────────────────────────────
//  헬퍼: getEnemyScaledStats(enemyId, cogLevel)
//  — 해당 코그 등급에서 실제 적용될 스탯 반환
// ──────────────────────────────────────────────────────────────
export function getEnemyScaledStats(enemyId: string, cogLevel: number): EnemyBaseStats | null {
  const def = ENEMY_DATA.find(e => e.id === enemyId);
  if (!def) return null;
  const scale = Math.pow(def.statScaling, cogLevel - def.cogMin);
  return {
    hp:      Math.round(def.baseStats.hp      * scale),
    attack:  Math.round(def.baseStats.attack  * scale),
    agility: Math.round(def.baseStats.agility * scale),
    luck:    Math.round(def.baseStats.luck    * scale),
  };
}
