// ================================================================
//  Actions/Diver.js
//  경로: Games/Codes/Data/Actions/Diver.js
//
//  역할: 잠수부 전용 일반 행동 — 방어/생존 특화
// ================================================================

if (typeof ACTION_REGISTRY === 'undefined') var ACTION_REGISTRY = [];

ACTION_REGISTRY.push(
  { id:'guard',         name:'방어',     job:'diver', cogMin:1, description:'이번 턴 받는 피해를 30% 감소시키는 자세를 취한다.',     effect:null },
  { id:'cover',         name:'엄호',     job:'diver', cogMin:3, description:'아군 1명 앞에 서서 대신 피해를 받는다.',                 effect:null },
  { id:'repair',        name:'응급 수리',job:'diver', cogMin:5, description:'자신의 HP를 공격력의 50%만큼 회복한다.',                 effect:null },
  { id:'fortify',       name:'요새화',   job:'diver', cogMin:7, description:'2턴간 받는 피해 60% 감소. 공격 불가.',                   effect:null },
);
