// ================================================================
//  types/index.ts
//  경로: src/types/index.ts
//
//  역할: 게임 전역 TypeScript 인터페이스 & 타입 정의
//        모든 파일이 이곳에서 타입을 import
//
//  구조:
//    GameVersion, StatFormulas  — constants.ts 타입
//    JobId, JobData             — Data_Jobs.ts 타입
//    EnemyDefinition            — Data_Enemies.ts 타입
//    ItemDefinition             — Data_Items.ts 타입
//    EventDefinition            — Data_Events.ts 타입
//    OverclockDefinition        — Data_Overclock.ts 타입
//    Ability* 타입              — Passives/Actions/Enhanced/Finales 타입
// ================================================================

// ── 게임 버전 ─────────────────────────────────────────────────────
export interface GameVersion {
  number:      string;
  tag:         string;
  atmosphere:  string;
  stack:       string;
  readonly full:        string;
  readonly short:       string;
  readonly footerLeft:  string;
  readonly footerRight: string;
}

// ── 스탯 공식 ─────────────────────────────────────────────────────
export interface IStatFormulas {
  attackSpeed(agility: number): number;
  critRate(luck: number):       number;
  evasionRate(luck: number):    number;
}

// ── 직업 ─────────────────────────────────────────────────────────
export type JobId    = 'fisher' | 'diver' | 'helmsman' | 'ai';
export type JobShort = 'FISH' | 'DIVE' | 'HELM' | 'A·I';

export interface JobDefinition {
  id:          JobId;
  label:       string;
  short:       JobShort;
  description: string;
  traits:      unknown[];
}

export type JobDataMap = Record<JobId, JobDefinition>;

// ── 스탯 키 ──────────────────────────────────────────────────────
export type StatKey = 'hp' | 'health' | 'attack' | 'agility' | 'luck';

// ── 적 (이형) ─────────────────────────────────────────────────────
export type EnemyBehavior = 'random' | 'target_weak' | 'wave';

export interface EnemyBaseStats {
  hp:      number;
  attack:  number;
  agility: number;
  luck:    number;
}

export interface EnemyReward {
  type:  'none' | 'currency' | 'item';
  value: number;
}

export interface WaveBonus {
  attackBonus: number;
  hpBonus:     number;
}

export interface EnemyDefinition {
  id:              string;
  name:            string;
  cogMin:          number;
  cogMax:          number | null;
  baseStats:       EnemyBaseStats;
  statScaling:     number;
  behavior:        EnemyBehavior;
  behaviorWeights: { attack: number; move: number; skill: number };
  spawnCount:      [number, number];
  spawnWeight:     number;
  waveBonus?:      WaveBonus;
  reward:          EnemyReward;
  description:     string;
}

// ── 아이템 ────────────────────────────────────────────────────────
export type ItemRarity     = 'common' | 'rare' | 'unique';
export type ItemEffectType = 'stat_boost' | 'heal' | 'gauge_boost' | 'passive_override' | 'weight_boost';
export type ItemSource     = 'diver_reward' | 'event_salvage' | 'event_drifter' | 'deep_shop';

export interface ItemEffect {
  type:  ItemEffectType;
  stat:  StatKey | string | null;
  value: number;
}

export interface ItemDefinition {
  id:          string;
  name:        string;
  rarity:      ItemRarity;
  effect:      ItemEffect;
  source:      ItemSource[];
  description: string;
}

// ── 이벤트 ────────────────────────────────────────────────────────
export type EventId =
  | 'combat' | 'fishing' | 'salvage' | 'wire_connect'
  | 'deep_shop' | 'drifter' | 'signal' | 'repair' | 'retreat';

export type EventRewardType =
  | 'enemy_drop' | 'currency' | 'item_pool' | 'shop'
  | 'gamble' | 'choice_gamble' | 'ship_heal' | 'end_expedition';

export interface GambleOutcome {
  weight: number;
  type:   string;
  value:  string | number | null;
  label:  string;
}

export interface GambleChoice {
  label:    string;
  outcomes: GambleOutcome[];
}

export interface EventReward {
  type:      EventRewardType;
  baseValue?: number;
  value?:    number | string;
  pool?:     string;
  currency?: string;
  outcomes?: GambleOutcome[];
  choices?:  GambleChoice[];
  minigame?: boolean;
}

export interface ForcedCondition {
  type:   string;
  value?: number;
}

export interface EventDefinition {
  id:                EventId;
  name:              string;
  weight:            number;
  forcedCondition:   ForcedCondition[] | null;
  requiredJob:       JobId | null;
  efficiencyPenalty: number;
  reward:            EventReward;
  description:       string;
}

export interface PartyState {
  halfDown:     boolean;
  shipHpRatio:  number;
}

// ── 오버클럭 ──────────────────────────────────────────────────────
export interface OverclockDefinition {
  id:          string;
  name:        string;
  label:       string;
  description: string;
  statKey:     StatKey;
  statIdx:     number;
  bonus:       number;
  color:       string;
}

// ── 능력 공통 ─────────────────────────────────────────────────────
export type AbilityJob  = 'common' | 'fisher' | 'diver' | 'helmsman' | 'named' | 'ai';
export type TriggerType = 'attack_count' | 'on_hit' | 'hp_below' | 'kill';
export type AbilityType = 'passive' | 'action' | 'enhanced' | 'finale';
export type GaugeLevel  = 100 | 200 | 300;

export interface PassiveDefinition {
  id:          string;
  name:        string;
  job:         AbilityJob;
  cogMin:      number;
  description: string;
  effect:      unknown;
}

export interface ActionDefinition {
  id:          string;
  name:        string;
  job:         AbilityJob;
  cogMin:      number;
  description: string;
  effect:      unknown;
}

export interface EnhancedDefinition {
  id:           string;
  name:         string;
  job:          AbilityJob;
  cogMin:       number;
  triggerType:  TriggerType;
  triggerValue: number;
  description:  string;
  effect:       unknown;
}

export interface FinaleDefinition {
  id:             string;
  name:           string;
  job:            AbilityJob;
  cogMin:         number;
  gaugeRequired:  GaugeLevel;
  description:    string;
  effect:         unknown;
}

// ── AbilityIndex 반환 타입 ────────────────────────────────────────
export interface IAbilityIndex {
  getPool(type: AbilityType, job: AbilityJob, cog: number): string[];
  getNamedFinales(cog: number): string[];
  getData(type: AbilityType, id: string): PassiveDefinition | ActionDefinition | EnhancedDefinition | FinaleDefinition | null;
  getDesc(type: AbilityType, id: string):  string;
  getName(type: AbilityType, id: string):  string;
  getGauge(id: string):                    number;
  clearCache():                            void;
  debug():                                 void;
}

// ── 캐릭터 ────────────────────────────────────────────────────────
export interface CharacterStats {
  hp:      number;
  health:  number;
  attack:  number;
  agility: number;
  luck:    number;
}

export interface Character {
  id:          string;
  name:        string;
  age:         number;
  job:         JobId;
  jobLabel:    string;
  stats:       CharacterStats;
  statSum:     number;
  cog:         number;
  passive:     string;
  action:      string;
  enhanced:    string;
  finale:      string;
  overclock:   OverclockDefinition | null;
  mastery:     number;
  pendingStats: number;
  currentHp:   number;
  maxHp:       number;
  status:      'alive' | 'dead_chip';
  spriteKey:   string;
  itemBonuses?:   Partial<CharacterStats>;
  recordBonuses?: Partial<CharacterStats>;
  _masteryMigrated?: boolean;
  _hpMigrated?:      boolean;
}

export interface StatBreakdown {
  base:      number;
  overclock: number;
  item:      number;
  record:    number;
  total:     number;
}

export interface CogColor {
  css:       string;
  phaser:    number;
  glow:      number;
  label:     string;
  special:   boolean;
  border?:   number;
  gradStart?: number;
  gradEnd?:   number;
}

export interface DeathLogEntry {
  death:     number;
  day:       number;
  cog:       number;
  round:     number;
  killedBy:  string;
  [key: string]: unknown;
}

export interface RecordChip {
  expeditions:    number;
  kills:          number;
  deaths:         number;
  highestRegion:  string;
  highestCog:     number;
  veteran:        boolean;
  firstDay:       number;
  deathLog:       DeathLogEntry[];
}

// ── 세이브 데이터 ─────────────────────────────────────────────────
export interface GameSaveData {
  arc:                  number;
  day:                  number;
  recruitPrice_fisher?: number;
  recruitPrice_diver?:  number;
  _currentScene?:       string;
  _currentSceneData?:   Record<string, unknown>;
  [key: string]:        unknown;
}

export interface StoryProgress {
  day:   number;
  phase: string;
}

export interface StorySave {
  progress:      StoryProgress;
  flags:         Record<string, unknown>;
  log:           string[];
  unlockedLore:  string[];
  readLore:      string[];
}
