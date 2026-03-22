// ================================================================
//  Passives/Helmsman.js
//  경로: Games/Codes/Data/Passives/Helmsman.js
//
//  역할: 조타수 전용 패시브 — 유틸/지원 특화
//  등록: PASSIVE_REGISTRY 배열에 push
// ================================================================

if (typeof PASSIVE_REGISTRY === 'undefined') var PASSIVE_REGISTRY = [];

PASSIVE_REGISTRY.push(
  { id:'navigator',     name:'항법사',      job:'helmsman', cogMin:1, description:'파티 전체의 탐사 이동 효율이 소폭 증가한다.',                    effect:null },
  { id:'signal_read',   name:'신호 감지',   job:'helmsman', cogMin:2, description:'이벤트 슬롯에서 위험 신호를 미리 감지할 확률이 있다.',            effect:null },
  { id:'rally',         name:'집결',        job:'helmsman', cogMin:3, description:'전투 시작 시 아군 전체의 게이지를 소량 충전한다.',                 effect:null },
  { id:'debuff_extend', name:'약점 심화',   job:'helmsman', cogMin:4, description:'자신이 적용한 디버프의 지속 시간이 1턴 증가한다.',                 effect:null },
  { id:'arc_conductor', name:'전류 전도체', job:'helmsman', cogMin:5, description:'Arc 채굴 이벤트에서 수집량이 10% 증가한다.',                      effect:null },
  { id:'core_resonance',name:'코어 공명',   job:'helmsman', cogMin:6, description:'아군이 스킬을 사용할 때마다 자신의 공격력이 소량 누적 증가한다.',  effect:null },
);
