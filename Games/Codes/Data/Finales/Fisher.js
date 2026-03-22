// ================================================================
//  Finales/Fisher.js
//  경로: Games/Codes/Data/Finales/Fisher.js
//
//  역할: 낚시꾼 전용 피날레 — 공격 특화
// ================================================================

if (typeof FINALE_REGISTRY === 'undefined') var FINALE_REGISTRY = [];

FINALE_REGISTRY.push(
  { id:'deep_fang',     name:'심해의 송곳니', job:'fisher', cogMin:1, gaugeRequired:100, description:'게이지 100. 적 1체에 공격력의 200% 피해. 크리티컬 확률 +20%.',                 effect:null },
  { id:'predator',      name:'포식자',        job:'fisher', cogMin:3, gaugeRequired:200, description:'게이지 200. 적 1체에 공격력의 400% 피해. HP 30% 이하면 즉사 확률 15%.',       effect:null },
  { id:'storm_blade',   name:'폭풍 검',        job:'fisher', cogMin:5, gaugeRequired:200, description:'게이지 200. 전열 전체에 공격력의 200% 피해. 크리티컬 시 후열도 관통.',         effect:null },
  { id:'death_current', name:'죽음의 기류',    job:'fisher', cogMin:7, gaugeRequired:300, description:'게이지 300. 전체에 공격력의 500% 피해. 처치한 수만큼 추가 피해 스택.',         effect:null },
);
