// ================================================================
//  Finales/Common.js
//  경로: Games/Codes/Data/Finales/Common.js
//
//  역할: 공통 피날레 — 게이지 MAX 후 초상화 클릭으로 수동 발동
//  등록: FINALE_REGISTRY 배열에 push
//  구조: { id, name, job, cogMin, gaugeRequired, description, effect }
//
//  gaugeRequired: 100 / 200 / 300
//    100 — 약: 자주 쓰지만 효과 낮음
//    200 — 중
//    300 — 강: 드물지만 강력
// ================================================================

if (typeof FINALE_REGISTRY === 'undefined') var FINALE_REGISTRY = [];

FINALE_REGISTRY.push(
  { id:'quick_stab',      name:'빠른 찌르기',  job:'common', cogMin:1, gaugeRequired:100, description:'게이지 100. 공격력의 120% 피해.',                             effect:null },
  { id:'guard_stance',    name:'방어 자세',    job:'common', cogMin:2, gaugeRequired:100, description:'게이지 100. 2턴간 받는 피해 30% 감소.',                       effect:null },
  { id:'heavy_blow',      name:'강타',         job:'common', cogMin:3, gaugeRequired:200, description:'게이지 200. 공격력의 300% 피해.',                             effect:null },
  { id:'aoe_strike',      name:'광역 타격',    job:'common', cogMin:4, gaugeRequired:200, description:'게이지 200. 모든 이형에게 공격력의 150% 피해.',               effect:null },
  { id:'explosion_hit',   name:'폭발 타격',    job:'common', cogMin:5, gaugeRequired:200, description:'게이지 200. 모든 이형에게 공격력의 250% 피해.',               effect:null },
  { id:'core_overload',   name:'코어 오버로드',job:'common', cogMin:7, gaugeRequired:300, description:'게이지 300. 모든 이형에게 공격력의 600% 피해. 이후 HP 10% 감소.', effect:null },
);
