// ================================================================
//  Enhanced/Common.js
//  경로: Games/Codes/Data/Enhanced/Common.js
//
//  역할: 공통 강화 행동 — 조건 충족 시 자동 발동
//  등록: ENHANCED_REGISTRY 배열에 push
//  구조: { id, name, job, cogMin, triggerType, triggerValue, description, effect }
//
//  triggerType:
//    'attack_count' — 공격 N회마다
//    'on_hit'       — 피격 시
//    'hp_below'     — HP N% 이하 시
//    'kill'         — 적 처치 시
// ================================================================

if (typeof ENHANCED_REGISTRY === 'undefined') var ENHANCED_REGISTRY = [];

ENHANCED_REGISTRY.push(
  { id:'combo_hit',    name:'연속 타격', job:'common', cogMin:1, triggerType:'attack_count', triggerValue:3, description:'공격 3회마다 자동 발동. 공격력의 150% 피해.',         effect:null },
  { id:'burst_speed',  name:'순간 가속', job:'common', cogMin:4, triggerType:'hp_below',     triggerValue:50, description:'HP 50% 이하 시 자동 발동. 3턴간 공격속도 50% 증가.', effect:null },
  { id:'iron_wall',    name:'철벽 방어', job:'common', cogMin:6, triggerType:'hp_below',     triggerValue:30, description:'HP 30% 이하 시 자동 발동. 2턴간 받는 피해 60% 감소.', effect:null },
  { id:'abyss_roar',   name:'심연의 포효',job:'common',cogMin:7, triggerType:'attack_count', triggerValue:10, description:'공격 10회마다 발동. 아군 전체 공격력 30% 증가 3턴.',  effect:null },
);
