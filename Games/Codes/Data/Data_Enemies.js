// ================================================================
//  Data_Enemies.js
//  경로: Games/Codes/Data/Data_Enemies.js
//
//  역할: 이형(적) 종류·스탯·행동패턴·처치보상 정의
//
//  behavior 타입:
//    'random'      — 무작위 대상 공격
//    'target_weak' — HP 가장 낮은 아군 우선 공격
//    'wave'        — 다수 등장, 주변 동종 수에 따라 스탯 증가
//
//  행동 가중치 (behaviorWeights):
//    attack / move / skill 각 가중치. 합산 랜덤으로 행동 결정.
//    (move는 전투 씬에 별도 이동 로직 없으면 attack으로 fallback)
// ================================================================

const ENEMY_DATA = [

  // ────────────────────────────────────────────────────────────
  //  심해어  (Deep Fish)
  //  Cog 1~4 등장. 기본형. 특수 패턴 없음.
  // ────────────────────────────────────────────────────────────
  {
    id: 'deep_fish',
    name: '심해어',
    cogMin: 1,
    cogMax: 4,
    baseStats: {
      hp: 80,
      attack: 12,
      agility: 8,
      luck: 5,
    },
    statScaling: 1.25,      // 코그 등급 1 오를 때마다 스탯 ×1.25
    behavior: 'random',
    behaviorWeights: {
      attack: 7,
      move:   2,
      skill:  1,
    },
    spawnCount: [1, 2],     // 등장 수 범위 [min, max]
    spawnWeight: 4,         // 조우 추첨 가중치
    reward: {
      type: 'none',
      value: 0,
    },
    description: '기본형 이형. 별다른 전술 없이 공격한다.',
  },

  // ────────────────────────────────────────────────────────────
  //  야생 AI  (Wild AI)
  //  Cog 2~7 등장. HP 낮은 대상 우선 공격.
  //  아군 처치 시 화폐 보상 발동 (잠수부·AI 직업 공통 처치 보상 규칙).
  // ────────────────────────────────────────────────────────────
  {
    id: 'wild_ai',
    name: '야생 AI',
    cogMin: 2,
    cogMax: 7,
    baseStats: {
      hp: 60,
      attack: 18,
      agility: 12,
      luck: 10,
    },
    statScaling: 1.3,
    behavior: 'target_weak',
    behaviorWeights: {
      attack: 6,
      move:   1,
      skill:  3,
    },
    spawnCount: [1, 2],
    spawnWeight: 3,
    reward: {
      type: 'currency',   // 처치 시 화폐 지급 (AI 처치 보상 규칙)
      value: 5,           // 기본값. Cog 등급에 따라 배율 적용 예정
    },
    description: '빈틈 공략형. HP가 낮은 아군을 우선 노린다.',
  },

  // ────────────────────────────────────────────────────────────
  //  침수자  (Drowned)
  //  Cog 3~10 등장. 다수 등장, 주변 침수자 수에 따라 스탯 증가.
  //  아군 처치 시 아이템 보상 발동 (잠수부 직업 처치 보상 규칙).
  // ────────────────────────────────────────────────────────────
  {
    id: 'drowned',
    name: '침수자',
    cogMin: 3,
    cogMax: null,           // 코그 제한 없음
    baseStats: {
      hp: 50,
      attack: 10,
      agility: 6,
      luck: 3,
    },
    statScaling: 1.2,
    behavior: 'wave',
    behaviorWeights: {
      attack: 8,
      move:   2,
      skill:  0,
    },
    spawnCount: [3, 5],     // 다수 등장
    spawnWeight: 3,
    waveBonus: {            // wave 전용: 주변 동종 1마리당 스탯 증가율
      attackBonus: 0.05,    // 공격력 +5%/마리
      hpBonus: 0.05,        // HP +5%/마리
    },
    reward: {
      type: 'item',         // 처치 시 아이템 획득 (잠수부 처치 보상 규칙)
      value: 1,
    },
    description: '웨이브형. 무리를 지을수록 강해진다.',
  },
];

// ──────────────────────────────────────────────────────────────
//  헬퍼 함수
//  getCogScaledStats(enemyId, cogLevel)
//  — 해당 코그 등급에서 실제 적용될 스탯을 반환
// ──────────────────────────────────────────────────────────────
function getEnemyScaledStats(enemyId, cogLevel) {
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
