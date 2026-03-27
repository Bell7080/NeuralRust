// ================================================================
//  Finales/Diver.ts
//  경로: src/Data/Finales/Diver.ts
//
//  역할: 잠수부 전용 피날레 — 방어/생존 특화
// ================================================================

import type { FinaleDefinition } from '../../types';

const finalesDiver: FinaleDefinition[] = [
  { id:'emergency_patch', name:'긴급 패치',        job:'diver', cogMin:1, gaugeRequired:100, description:'게이지 100. 자신의 HP를 최대 HP의 30% 회복한다.',                              effect:null },
  { id:'bulwark',         name:'방벽',             job:'diver', cogMin:3, gaugeRequired:200, description:'게이지 200. 3턴간 파티 전체 받는 피해 40% 감소.',                             effect:null },
  { id:'pressure_crush',  name:'수압 분쇄',         job:'diver', cogMin:5, gaugeRequired:200, description:'게이지 200. 적 1체에 공격력의 300% 피해. 대상을 2턴간 행동 불능.',            effect:null },
  { id:'leviathan_hide',  name:'리바이어던의 갑옷', job:'diver', cogMin:7, gaugeRequired:300, description:'게이지 300. 5턴간 받는 피해 80% 감소. 효과 종료 후 감소된 피해량만큼 반사.', effect:null },
];

export default finalesDiver;
