// ================================================================
//  Actions/Fisher.js
//  경로: Games/Codes/Data/Actions/Fisher.js
//
//  역할: 낚시꾼 전용 일반 행동 — 공격 특화
// ================================================================

if (typeof ACTION_REGISTRY === 'undefined') var ACTION_REGISTRY = [];

ACTION_REGISTRY.push(
  { id:'pierce',        name:'관통격',   job:'fisher', cogMin:1, description:'전열과 후열을 동시에 꿰뚫는다. 공격력의 90% 피해.',   effect:null },
  { id:'twin_slash',    name:'쌍검격',   job:'fisher', cogMin:3, description:'적 1체에 2회 연속 공격. 크리티컬 확률 +10%.',         effect:null },
  { id:'crit_slash',    name:'급소격',   job:'fisher', cogMin:5, description:'크리티컬 시 추가 피해가 50% 더 증가하는 공격.',        effect:null },
  { id:'execute',       name:'처형격',   job:'fisher', cogMin:7, description:'HP 30% 이하의 적에게 공격력 두 배 피해.',              effect:null },
);
