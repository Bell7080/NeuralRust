// ================================================================
//  Enhanced/Diver.js
//  경로: Games/Codes/Data/Enhanced/Diver.js
//
//  역할: 잠수부 전용 강화 행동
// ================================================================

if (typeof ENHANCED_REGISTRY === 'undefined') var ENHANCED_REGISTRY = [];

ENHANCED_REGISTRY.push(
  { id:'pressure_heal', name:'수압 치유',  job:'diver', cogMin:1, triggerType:'on_hit',       triggerValue:1, description:'피격 시 발동. HP를 피해량의 20%만큼 회복한다.',           effect:null },
  { id:'tidal_guard',   name:'조류 방벽',  job:'diver', cogMin:3, triggerType:'attack_count', triggerValue:4, description:'공격 4회마다 발동. 아군 전체 받는 피해 15% 감소 2턴.',    effect:null },
  { id:'anchor_hold',   name:'닻 고정',    job:'diver', cogMin:5, triggerType:'hp_below',     triggerValue:40, description:'HP 40% 이하 시 발동. 이동 불가 대신 피해 감소 50% 3턴.',  effect:null },
  { id:'salvage_surge', name:'인양 급류',  job:'diver', cogMin:7, triggerType:'on_hit',       triggerValue:1, description:'피격 시 발동. 아군 전체 게이지를 30 충전한다.',             effect:null },
);
