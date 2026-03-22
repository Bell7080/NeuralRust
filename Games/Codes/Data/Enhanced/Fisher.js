// ================================================================
//  Enhanced/Fisher.js
//  경로: Games/Codes/Data/Enhanced/Fisher.js
//
//  역할: 낚시꾼 전용 강화 행동
// ================================================================

if (typeof ENHANCED_REGISTRY === 'undefined') var ENHANCED_REGISTRY = [];

ENHANCED_REGISTRY.push(
  { id:'evasion',       name:'회피 기동',  job:'fisher', cogMin:1, triggerType:'on_hit',       triggerValue:1, description:'피격 시 발동. 1턴간 회피율 50% 증가.',                 effect:null },
  { id:'front_scan',    name:'전방 스캔',  job:'fisher', cogMin:3, triggerType:'attack_count',  triggerValue:5, description:'공격 5회마다 발동. 대상 공격력 20% 감소 2턴.',          effect:null },
  { id:'armor_pierce',  name:'철갑 관통',  job:'fisher', cogMin:5, triggerType:'kill',          triggerValue:1, description:'적 처치 시 발동. 다음 공격이 방어를 무시한다.',           effect:null },
  { id:'bloodlust',     name:'살기',       job:'fisher', cogMin:7, triggerType:'kill',          triggerValue:1, description:'적 처치 시 발동. 공격력 20%, 크리티컬 확률 10% 증가.',   effect:null },
);
