// ================================================================
//  Passives/Diver.js
//  경로: Games/Codes/Data/Passives/Diver.js
//
//  역할: 잠수부 전용 패시브 — 방어/생존 특화
//  등록: PASSIVE_REGISTRY 배열에 push
// ================================================================

if (typeof PASSIVE_REGISTRY === 'undefined') var PASSIVE_REGISTRY = [];

PASSIVE_REGISTRY.push(
  { id:'deep_breath',   name:'심해의 숨결', job:'diver', cogMin:1, description:'잠수 중 스태미나 소모가 30% 감소한다.',                              effect:null },
  { id:'pressure_body', name:'수압 내성',   job:'diver', cogMin:2, description:'깊은 구역에서 피해 감소 효과가 5% 증가한다.',                        effect:null },
  { id:'salvage_eye',   name:'채굴사의 눈', job:'diver', cogMin:3, description:'잔해 수집 이벤트에서 아이템 획득 확률이 증가한다.',                  effect:null },
  { id:'bulkhead',      name:'격벽',        job:'diver', cogMin:4, description:'아군이 전투불능이 될 때 자신의 HP를 소량 회복한다.',                  effect:null },
  { id:'night_ops',     name:'야간 작전',   job:'diver', cogMin:5, description:'야간 미션에서 민첩이 15% 증가한다.',                                  effect:null },
  { id:'core_shield',   name:'코어 방벽',   job:'diver', cogMin:6, description:'라운드 시작 시 피해를 1회 무효화하는 보호막이 생긴다.',               effect:null },
);
