// ================================================================
//  Actions/Common.js
//  경로: Games/Codes/Data/Actions/Common.js
//
//  역할: 공통 일반 행동 — 매 사이클 자동 발동, 기본 공격
//  등록: ACTION_REGISTRY 배열에 push
//  구조: { id, name, job, cogMin, description, effect }
// ================================================================

if (typeof ACTION_REGISTRY === 'undefined') var ACTION_REGISTRY = [];

ACTION_REGISTRY.push(
  { id:'strike',       name:'일격',       job:'common', cogMin:1, description:'적 1체를 공격한다. 공격력의 100% 피해.',              effect:null },
  { id:'rapid_strike', name:'속타',       job:'common', cogMin:3, description:'적 1체를 빠르게 2회 공격한다. 각 50% 피해.',          effect:null },
  { id:'heavy_strike', name:'중타',       job:'common', cogMin:5, description:'적 1체를 강하게 공격한다. 공격력의 180% 피해.',        effect:null },
  { id:'wide_strike',  name:'광타',       job:'common', cogMin:7, description:'전열의 적 전체를 공격한다. 공격력의 80% 피해.',        effect:null },
);
