// ================================================================
//  Enhanced/Helmsman.js
//  경로: Games/Codes/Data/Enhanced/Helmsman.js
//
//  역할: 조타수 전용 강화 행동
// ================================================================

if (typeof ENHANCED_REGISTRY === 'undefined') var ENHANCED_REGISTRY = [];

ENHANCED_REGISTRY.push(
  { id:'signal_boost',  name:'신호 증폭',  job:'helmsman', cogMin:1, triggerType:'attack_count', triggerValue:3,  description:'공격 3회마다 발동. 아군 1명의 게이지를 50 충전한다.',         effect:null },
  { id:'static_field',  name:'정전기장',   job:'helmsman', cogMin:3, triggerType:'on_hit',       triggerValue:1,  description:'피격 시 발동. 공격자에게 2턴간 행동 불능 확률 20% 부여.',      effect:null },
  { id:'current_read',  name:'해류 읽기',  job:'helmsman', cogMin:5, triggerType:'attack_count', triggerValue:5,  description:'공격 5회마다 발동. 적 전체 디버프 1개 연장.',                 effect:null },
  { id:'arc_surge',     name:'전류 폭주',  job:'helmsman', cogMin:7, triggerType:'kill',         triggerValue:1,  description:'적 처치 시 발동. 아군 전체 게이지를 100 충전한다.',            effect:null },
);
