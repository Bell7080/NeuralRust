// ================================================================
//  Finales/Helmsman.ts
//  경로: src/Data/Finales/Helmsman.ts
//
//  역할: 조타수 전용 피날레 — 유틸/지원 특화
// ================================================================

import type { FinaleDefinition } from '../../types';

const finalesHelmsman: FinaleDefinition[] = [
  { id:'rally_call',     name:'집결 신호',   job:'helmsman', cogMin:1, gaugeRequired:100, description:'게이지 100. 아군 전체의 게이지를 100 즉시 충전한다.',                           effect:null },
  { id:'static_burst',   name:'정전기 폭발', job:'helmsman', cogMin:3, gaugeRequired:200, description:'게이지 200. 적 전체에 공격력의 150% 피해. 3턴간 공격력 30% 감소.',             effect:null },
  { id:'override',       name:'오버라이드',  job:'helmsman', cogMin:5, gaugeRequired:200, description:'게이지 200. 아군 전체 모든 디버프 제거. 다음 턴 공격력 50% 증가.',             effect:null },
  { id:'dead_reckoning', name:'추측 항법',   job:'helmsman', cogMin:7, gaugeRequired:300, description:'게이지 300. 적 전체에 누적된 디버프 수 × 공격력의 100% 피해.',                  effect:null },
];

export default finalesHelmsman;
