// ================================================================
//  Passives/Enemy.ts
//  경로: src/Data/Passives/Enemy.ts
//
//  역할: 적 전용 패시브 — 적에게만 할당되는 수동 효과
//  구조: { id, name, job:'enemy', cogMin, description, effect }
// ================================================================

import type { PassiveDefinition } from '../../types';

const passivesEnemy: PassiveDefinition[] = [
  {
    id: 'depth_skin',
    name: '심해 표피',
    job: 'enemy',
    cogMin: 1,
    description: '받는 피해가 8% 감소한다.',
    effect: null,
  },
  {
    id: 'predator_instinct',
    name: '포식자 본능',
    job: 'enemy',
    cogMin: 1,
    description: '아군이 사망할 때마다 공격력이 8% 증가한다. (최대 3회 중첩)',
    effect: null,
  },
  {
    id: 'pack_hunt',
    name: '군집 사냥',
    job: 'enemy',
    cogMin: 2,
    description: '동종이 2마리 이상 생존 시 공격력이 10% 증가한다.',
    effect: null,
  },
  {
    id: 'toxic_blood',
    name: '독혈',
    job: 'enemy',
    cogMin: 3,
    description: '피격 시 공격자에게 소량의 독 피해를 반사한다.',
    effect: null,
  },
  {
    id: 'adaptive_shell',
    name: '적응 외피',
    job: 'enemy',
    cogMin: 4,
    description: '첫 번째 치명타를 받을 때 무효화한다. (1회)',
    effect: null,
  },
  {
    id: 'abyss_born',
    name: '심연의 자식',
    job: 'enemy',
    cogMin: 6,
    description: '최대 HP의 10%를 추가 HP로 가지고 전투에 진입한다.',
    effect: null,
  },
];

export default passivesEnemy;
