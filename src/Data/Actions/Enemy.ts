// ================================================================
//  Actions/Enemy.ts
//  경로: src/Data/Actions/Enemy.ts
//
//  역할: 적 전용 기본 행동 — 공격 패턴 정의
//        공통 Actions/Common.ts 행동도 적이 사용 가능
//  구조: { id, name, job:'enemy', cogMin, description, effect }
// ================================================================

import type { ActionDefinition } from '../../types';

const actionsEnemy: ActionDefinition[] = [
  {
    id: 'chomp',
    name: '물어뜯기',
    job: 'enemy',
    cogMin: 1,
    description: '단일 대상을 공격력의 120% 피해로 물어뜯는다.',
    effect: null,
  },
  {
    id: 'lunge',
    name: '돌진',
    job: 'enemy',
    cogMin: 1,
    description: '단일 대상을 향해 돌진하여 공격력의 150% 피해를 가한다.',
    effect: null,
  },
  {
    id: 'spew_ink',
    name: '먹물 분사',
    job: 'enemy',
    cogMin: 2,
    description: '전체 아군에게 공격력의 50% 피해를 가하는 먹물을 분사한다.',
    effect: null,
  },
  {
    id: 'double_bite',
    name: '이중 물기',
    job: 'enemy',
    cogMin: 3,
    description: '단일 대상을 연속으로 2회 공격한다. 각 70% 피해.',
    effect: null,
  },
  {
    id: 'deep_pulse',
    name: '심해 충격파',
    job: 'enemy',
    cogMin: 4,
    description: '전체 아군에게 공격력의 70% 피해를 가하고 민첩을 소폭 감소시킨다.',
    effect: null,
  },
  {
    id: 'siphon',
    name: '흡수',
    job: 'enemy',
    cogMin: 5,
    description: '단일 대상 공격력의 160% 피해를 가하고 피해의 30%를 HP로 회복한다.',
    effect: null,
  },
];

export default actionsEnemy;
