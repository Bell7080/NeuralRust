// ================================================================
//  Enhanced/Enemy.ts
//  경로: src/Data/Enhanced/Enemy.ts
//
//  역할: 적 전용 강화 행동 — 특정 트리거 조건 충족 시 자동 발동
//        공통 Enhanced/Common.ts 강화행동도 적이 사용 가능
//
//  triggerType:
//    'attack_count' — 공격 N회마다
//    'on_hit'       — 피격 N회마다
//    'hp_below'     — HP N% 이하 시 (1회)
//    'kill'         — 아군 처치 시
// ================================================================

import type { EnhancedDefinition } from '../../types';

const enhancedEnemy: EnhancedDefinition[] = [
  {
    id: 'blood_frenzy',
    name: '혈전 광기',
    job: 'enemy',
    cogMin: 1,
    triggerType: 'hp_below',
    triggerValue: 40,
    description: 'HP 40% 이하 시 발동. 공격속도가 40% 증가한다.',
    effect: null,
  },
  {
    id: 'pack_signal',
    name: '군집 신호',
    job: 'enemy',
    cogMin: 2,
    triggerType: 'attack_count',
    triggerValue: 4,
    description: '공격 4회마다 발동. 동종에게 신호를 보내 다음 공격의 피해가 30% 증가한다.',
    effect: null,
  },
  {
    id: 'deep_scream',
    name: '심연의 절규',
    job: 'enemy',
    cogMin: 3,
    triggerType: 'on_hit',
    triggerValue: 3,
    description: '피격 3회마다 발동. 아군 전체의 공격력이 2턴간 20% 감소한다.',
    effect: null,
  },
  {
    id: 'last_stand',
    name: '최후의 발악',
    job: 'enemy',
    cogMin: 4,
    triggerType: 'hp_below',
    triggerValue: 20,
    description: 'HP 20% 이하 시 발동. 공격력이 50% 증가한다.',
    effect: null,
  },
  {
    id: 'death_lash',
    name: '사멸 반격',
    job: 'enemy',
    cogMin: 5,
    triggerType: 'kill',
    triggerValue: 1,
    description: '아군을 처치할 때마다 발동. 즉시 추가 공격을 1회 가한다.',
    effect: null,
  },
  {
    id: 'abyss_surge',
    name: '심연 급류',
    job: 'enemy',
    cogMin: 6,
    triggerType: 'attack_count',
    triggerValue: 6,
    description: '공격 6회마다 발동. 전체 아군에게 공격력 100% 피해를 가한다.',
    effect: null,
  },
];

export default enhancedEnemy;
