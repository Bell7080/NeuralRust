// ================================================================
//  Passives/Common.js
//  경로: Games/Codes/Data/Passives/Common.js
//
//  역할: 공통 패시브 — 모든 직업 사용 가능
//  등록: PASSIVE_REGISTRY 배열에 push
//  구조: { id, name, job, cogMin, description, effect }
// ================================================================

if (typeof PASSIVE_REGISTRY === 'undefined') var PASSIVE_REGISTRY = [];

PASSIVE_REGISTRY.push(
  { id:'tough_body',      name:'강인한 체질', job:'common', cogMin:1, description:'전투 시작 시 최대 HP의 5%를 추가로 회복한다.',                   effect:null },
  { id:'sharp_sense',     name:'예리한 감각', job:'common', cogMin:1, description:'회피율이 5% 증가한다.',                                          effect:null },
  { id:'lucky',           name:'행운아',      job:'common', cogMin:2, description:'크리티컬 발생 시 추가로 Arc를 획득한다.',                         effect:null },
  { id:'fast_regen',      name:'빠른 회복',   job:'common', cogMin:2, description:'매 전투 턴 종료 시 HP를 소량 회복한다.',                          effect:null },
  { id:'fighting_spirit', name:'투지',        job:'common', cogMin:3, description:'HP가 50% 이하일 때 공격력이 10% 증가한다.',                       effect:null },
  { id:'focus',           name:'집중력',      job:'common', cogMin:3, description:'연속 공격 성공 시 다음 공격의 크리티컬 확률이 증가한다.',           effect:null },
  { id:'poison_resist',   name:'독 저항',     job:'common', cogMin:4, description:'독 상태이상의 지속 시간이 50% 감소한다.',                         effect:null },
  { id:'aqua_adapt',      name:'수중 적응',   job:'common', cogMin:5, description:'수중 구간에서 모든 스탯이 8% 증가한다.',                          effect:null },
  { id:'unyielding',      name:'불굴',        job:'common', cogMin:8, description:'치명타를 받아도 HP 1을 유지하며 생존한다. (1회)',                  effect:null },
  { id:'absolute_will',   name:'절대 의지',   job:'common', cogMin:9, description:'상태이상에 완전히 면역이다.',                                     effect:null },
);
