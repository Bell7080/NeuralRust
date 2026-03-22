// ================================================================
//  Actions/Helmsman.js
//  경로: Games/Codes/Data/Actions/Helmsman.js
//
//  역할: 조타수 전용 일반 행동 — 유틸/지원 특화
// ================================================================

if (typeof ACTION_REGISTRY === 'undefined') var ACTION_REGISTRY = [];

ACTION_REGISTRY.push(
  { id:'disrupt',       name:'방해격',   job:'helmsman', cogMin:1, description:'적 1체를 공격하며 1턴간 행동을 방해한다.',           effect:null },
  { id:'debuff_strike', name:'약화격',   job:'helmsman', cogMin:3, description:'적 1체를 공격하며 공격력을 2턴간 20% 감소시킨다.',   effect:null },
  { id:'gauge_drain',   name:'게이지 탈취', job:'helmsman', cogMin:5, description:'적 1체의 게이지를 소량 감소시키고 아군에게 이전한다.', effect:null },
  { id:'chain_bind',    name:'연쇄 속박',job:'helmsman', cogMin:7, description:'적 전체에 1턴간 행동 불가를 부여한다.',               effect:null },
);
