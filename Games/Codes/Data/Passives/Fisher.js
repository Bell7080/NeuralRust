// ================================================================
//  Passives/Fisher.js
//  경로: Games/Codes/Data/Passives/Fisher.js
//
//  역할: 낚시꾼 전용 패시브 — 공격 특화
//  등록: PASSIVE_REGISTRY 배열에 push
// ================================================================

if (typeof PASSIVE_REGISTRY === 'undefined') var PASSIVE_REGISTRY = [];

PASSIVE_REGISTRY.push(
  { id:'iron_skin',        name:'강철 피부',   job:'fisher', cogMin:1, description:'받는 물리 피해를 5% 감소한다.',                                  effect:null },
  { id:'crit_hunter',      name:'사냥꾼의 눈', job:'fisher', cogMin:2, description:'크리티컬 확률이 추가로 5% 증가한다.',                             effect:null },
  { id:'taunt',            name:'도발',        job:'fisher', cogMin:3, description:'인접한 적의 공격을 자신에게 끌어당긴다.',                         effect:null },
  { id:'snipe_stance',     name:'저격 자세',   job:'fisher', cogMin:4, description:'원거리 공격 시 피해가 12% 증가한다.',                             effect:null },
  { id:'tactical_eye',     name:'전술 눈빛',   job:'fisher', cogMin:5, description:'전투 시작 시 적 1체의 약점이 공개된다.',                          effect:null },
  { id:'counter_instinct', name:'반격 본능',   job:'fisher', cogMin:6, description:'피격 시 15% 확률로 즉시 반격한다.',                               effect:null },
);
