// ================================================================
//  CharacterManager.ts
//  경로: src/Managers/CharacterManager.ts
//
//  능력 슬롯 4종:
//    char.passive   : 상시 패시브
//    char.action    : 일반 행동 (매 사이클 자동)
//    char.enhanced  : 강화 행동 (조건부 자동)
//    char.finale    : 피날레 (게이지 MAX + 수동 클릭)
//
//  직업 3종: fisher / diver / helmsman
//  Cog: 1~10 (statSum 기반 계산)
// ================================================================

import type { JobId, AbilityType, AbilityJob, OverclockDefinition, Character, CharacterStats, StatBreakdown, CogColor, RecordChip, DeathLogEntry } from '../types';
import { CHARACTER_NAMES }        from '../Data/Data_CharacterNames';
import { JOB_DATA }               from '../Data/Data_Jobs';
import { AbilityIndex }           from '../Data/AbilityIndex';
import { OVERCLOCK_POOL }         from '../Data/Data_Overclock';
import { CharacterSpriteManager } from './CharacterSpriteManager';

// ── 스탯 색상 ────────────────────────────────────────────────────
export const STAT_COLORS: Record<keyof CharacterStats, string> = {
  hp:      '#ff88bb',
  health:  '#88ddaa',
  attack:  '#ff3333',
  agility: '#55ccff',
  luck:    '#ddcc44',
};

export const STAT_LABEL_MAP: Record<keyof CharacterStats, string> = {
  hp: '체력', health: '건강', attack: '공격', agility: '민첩', luck: '행운',
};

// ── 직업 레이블 (폴백 포함) ──────────────────────────────────────
export const JOB_LABEL: Record<string, string> = {
  fisher: '낚시꾼', diver: '잠수부', helmsman: '조타수',
};

function _getJobLabel(jobId: string): string {
  return JOB_DATA?.[jobId as JobId]?.label
    ?? JOB_LABEL[jobId]
    ?? jobId;
}

// ── Cog 계산 ─────────────────────────────────────────────────────
export function calcCog(s: number): number {
  if (s <=  25) return 1;  if (s <=  44) return 2;
  if (s <=  63) return 3;  if (s <=  82) return 4;
  if (s <= 100) return 5;  if (s <= 133) return 6;
  if (s <= 166) return 7;  if (s <= 200) return 8;
  if (s <= 250) return 9;  return 10;
}

// ── Cog 색상 ─────────────────────────────────────────────────────
export const COG_COLORS: Record<number, CogColor> = {
  1:  { css: '#7dff4f', phaser: 0x7dff4f, glow: 0x4acc20, label: '#4acc20', special: false },
  2:  { css: '#aaee22', phaser: 0xaaee22, glow: 0x77bb00, label: '#77bb00', special: false },
  3:  { css: '#ccdd00', phaser: 0xccdd00, glow: 0x99aa00, label: '#99aa00', special: false },
  4:  { css: '#ffdd00', phaser: 0xffdd00, glow: 0xccaa00, label: '#ccaa00', special: false },
  5:  { css: '#ffaa00', phaser: 0xffaa00, glow: 0xcc7700, label: '#cc7700', special: false },
  6:  { css: '#ff7700', phaser: 0xff7700, glow: 0xcc4400, label: '#cc4400', special: false },
  7:  { css: '#ff4400', phaser: 0xff4400, glow: 0xcc2200, label: '#cc2200', special: false },
  8:  { css: '#dd0000', phaser: 0xdd0000, glow: 0xaa0000, label: '#aa0000', special: false },
  9:  { css: '#ff2255', phaser: 0xff2255, glow: 0x000000, label: '#ff2255', border: 0x000000, special: true },
  10: { css: '#cc44ff', phaser: 0xcc44ff, glow: 0x000000, label: '#cc44ff', gradStart: 0x330066, gradEnd: 0x000000, special: true },
};

export function getCogColor(cog: number): CogColor {
  return COG_COLORS[cog] ?? COG_COLORS[1];
}

// ── 능력 풀 폴백 ─────────────────────────────────────────────────
const _FALLBACK_PASSIVE:  Record<number, string[]> = { 1:['tough_body','sharp_sense'], 2:['lucky','fast_regen'], 3:['fighting_spirit','focus'], 4:['poison_resist','focus'], 5:['aqua_adapt','fighting_spirit'], 6:['aqua_adapt','fast_regen'], 7:['unyielding','aqua_adapt'], 8:['unyielding','fighting_spirit'], 9:['absolute_will','unyielding'], 10:['absolute_will'] };
const _FALLBACK_ACTION:   Record<number, string[]> = { 1:['strike'], 2:['strike'], 3:['rapid_strike','strike'], 4:['rapid_strike'], 5:['heavy_strike','rapid_strike'], 6:['heavy_strike'], 7:['wide_strike','heavy_strike'], 8:['wide_strike'], 9:['wide_strike'], 10:['wide_strike'] };
const _FALLBACK_ENHANCED: Record<number, string[]> = { 1:['combo_hit'], 2:['combo_hit'], 3:['combo_hit','evasion'], 4:['burst_speed','combo_hit'], 5:['burst_speed'], 6:['iron_wall','burst_speed'], 7:['abyss_roar','iron_wall'], 8:['abyss_roar'], 9:['abyss_roar'], 10:['abyss_roar'] };
const _FALLBACK_FINALE:   Record<number, string[]> = { 1:['quick_stab'], 2:['guard_stance','quick_stab'], 3:['heavy_blow','guard_stance'], 4:['aoe_strike','heavy_blow'], 5:['explosion_hit','aoe_strike'], 6:['explosion_hit'], 7:['core_overload','explosion_hit'], 8:['core_overload'], 9:['core_overload'], 10:['core_overload'] };

function _getAbilityPool(type: AbilityType, job: string, cog: number): string[] {
  const pool = AbilityIndex.getPool(type, job as AbilityJob, cog);
  if (pool && pool.length > 0) return pool;
  const fb = ({ passive: _FALLBACK_PASSIVE, action: _FALLBACK_ACTION, enhanced: _FALLBACK_ENHANCED, finale: _FALLBACK_FINALE })[type];
  return fb?.[cog] ?? fb?.[1] ?? [];
}

// ── 유틸 ─────────────────────────────────────────────────────────
function _pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

function _jobSpriteKey(job: string): string {
  return CharacterSpriteManager.getPortraitKey(job);
}

// ── 스탯 생성 ────────────────────────────────────────────────────
function _randStats(): CharacterStats {
  const total  = 10 + Math.floor(Math.random() * 41);
  const mins   = [1, 0, 1, 5, 0];
  const remain = Math.max(0, total - mins.reduce((a, b) => a + b, 0));
  const b      = [0, 0, 0, 0, 0];
  for (let i = 0; i < remain; i++) b[Math.floor(Math.random() * 5)]++;
  return {
    hp:      mins[0] + b[0],
    health:  mins[1] + b[1],
    attack:  mins[2] + b[2],
    agility: mins[3] + b[3],
    luck:    mins[4] + b[4],
  };
}

function _randStatsBySum(total: number): CharacterStats {
  const mins = [1, 0, 1, 5, 0];
  const keys: (keyof CharacterStats)[] = ['hp', 'health', 'attack', 'agility', 'luck'];
  const rem  = Math.max(0, total - mins.reduce((a, b) => a + b, 0));
  const b    = [0, 0, 0, 0, 0];
  for (let i = 0; i < rem; i++) b[Math.floor(Math.random() * 5)]++;
  const r = {} as CharacterStats;
  keys.forEach((k, i) => { r[k] = mins[i] + b[i]; });
  return r;
}

const COG_STAT_RANGE: Record<number, { min: number; max: number }> = {
  1:{min:7,max:25},   2:{min:26,max:44},  3:{min:45,max:63},
  4:{min:64,max:82},  5:{min:83,max:100}, 6:{min:101,max:133},
  7:{min:134,max:166},8:{min:167,max:200},9:{min:201,max:250},
  10:{min:251,max:300},
};

// ── 스탯 최종값 계산 ─────────────────────────────────────────────
export function getEffectiveStat(char: Character, key: keyof CharacterStats): number {
  const base        = char.stats[key] ?? 0;
  const ocBonus     = (char.overclock && char.overclock.statKey === key)
    ? Math.floor(base * char.overclock.bonus) : 0;
  const itemBonus   = char.itemBonuses?.[key]   ?? 0;
  const recordBonus = char.recordBonuses?.[key] ?? 0;
  return base + ocBonus + itemBonus + recordBonus;
}

export function getEffectiveStats(char: Character): CharacterStats {
  const keys: (keyof CharacterStats)[] = ['hp', 'health', 'attack', 'agility', 'luck'];
  const r = {} as CharacterStats;
  keys.forEach(k => { r[k] = getEffectiveStat(char, k); });
  return r;
}

export function getStatBreakdown(char: Character, key: keyof CharacterStats): StatBreakdown {
  const base        = char.stats[key] ?? 0;
  const ocBonus     = (char.overclock && char.overclock.statKey === key)
    ? Math.floor(base * char.overclock.bonus) : 0;
  const itemBonus   = char.itemBonuses?.[key]   ?? 0;
  const recordBonus = char.recordBonuses?.[key] ?? 0;
  return { base, overclock: ocBonus, item: itemBonus, record: recordBonus, total: base + ocBonus + itemBonus + recordBonus };
}

// ── 숙련도(Mastery) ───────────────────────────────────────────────
export function gainMastery(char: Character, cogLevel: number): Character {
  char.mastery      = (char.mastery      || 0) + cogLevel;
  char.pendingStats = (char.pendingStats || 0) + cogLevel;
  return char;
}

export function spendStat(char: Character, key: keyof CharacterStats): boolean {
  if (!char.pendingStats || char.pendingStats <= 0) return false;
  char.stats[key]    = (char.stats[key] || 0) + 1;
  char.pendingStats -= 1;
  if (key === 'hp') {
    char.maxHp     = (char.maxHp     || 0) + 5;
    char.currentHp = Math.min((char.currentHp || 0) + 5, char.maxHp);
  }
  char.statSum = (Object.values(char.stats) as number[]).reduce((a, v) => a + v, 0);
  updateCharacter(char);
  return true;
}

// ── 오버클럭 롤 ──────────────────────────────────────────────────
function _rollInitialOverclock(): OverclockDefinition | null {
  if (!Array.isArray(OVERCLOCK_POOL)) return null;
  if (Math.random() >= 0.50) return null;
  return OVERCLOCK_POOL[Math.floor(Math.random() * OVERCLOCK_POOL.length)] ?? null;
}

// ── 이름 풀 ──────────────────────────────────────────────────────
function _getNamePool(): string[] {
  return (Array.isArray(CHARACTER_NAMES) && CHARACTER_NAMES.length > 0)
    ? CHARACTER_NAMES
    : ['볼트','기어','러스트','뎁스','아크','스팀','드릴','앵커',
       '크롬','스크랩','파이퍼','드리프터','글리치','넥서스','타이드',
       '코그','플럭스','스파크','베인','어비스'];
}

// ── 캐릭터 생성 ───────────────────────────────────────────────────
export function createCharacter(job: JobId): Character {
  const stats   = _randStats();
  const statSum = (Object.values(stats) as number[]).reduce((a, v) => a + v, 0);
  const cog     = calcCog(statSum);
  return {
    id:           `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name:         _pick(_getNamePool()),
    age:          16 + Math.floor(Math.random() * 10),
    job,
    jobLabel:     _getJobLabel(job),
    stats, statSum, cog,
    passive:      _pick(_getAbilityPool('passive',  job, cog)),
    action:       _pick(_getAbilityPool('action',   job, cog)),
    enhanced:     _pick(_getAbilityPool('enhanced', job, cog)),
    finale:       _pick(_getAbilityPool('finale',   job, cog)),
    overclock:    _rollInitialOverclock(),
    mastery:      0,
    pendingStats: 0,
    currentHp:    stats.hp * 5,
    maxHp:        stats.hp * 5,
    status:       'alive',
    spriteKey:    _jobSpriteKey(job),
  };
}

export function createCharacterOfCog(job: JobId, cog: number): Character {
  const range   = COG_STAT_RANGE[cog] ?? COG_STAT_RANGE[1];
  const statSum = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
  const stats   = _randStatsBySum(statSum);
  return {
    id:           `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name:         _pick(_getNamePool()),
    age:          16 + Math.floor(Math.random() * 10),
    job,
    jobLabel:     _getJobLabel(job),
    stats, statSum, cog,
    passive:      _pick(_getAbilityPool('passive',  job, cog)),
    action:       _pick(_getAbilityPool('action',   job, cog)),
    enhanced:     _pick(_getAbilityPool('enhanced', job, cog)),
    finale:       _pick(_getAbilityPool('finale',   job, cog)),
    overclock:    _rollInitialOverclock(),
    mastery:      0,
    pendingStats: 0,
    currentHp:    stats.hp * 5,
    maxHp:        stats.hp * 5,
    status:       'alive',
    spriteKey:    _jobSpriteKey(job),
  };
}

// ── 스토리지 ─────────────────────────────────────────────────────
const KEY       = 'nr_characters';
const SQUAD_KEY = 'nr_squad';

function saveAll(chars: Character[]): void { localStorage.setItem(KEY, JSON.stringify(chars)); }
function loadAll(): Character[] | null {
  try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Character[]) : null; }
  catch { return null; }
}
function addCharacter(char: Character): void {
  const chars = loadAll() ?? []; chars.push(char); saveAll(chars);
}
function removeCharacter(id: string): void {
  saveAll((loadAll() ?? []).filter(c => c.id !== id));
  saveSquad(loadSquad().map(s => s.filter(x => x !== id)));
}
function updateCharacter(updated: Character): void {
  const chars = loadAll() ?? [];
  const idx   = chars.findIndex(c => c.id === updated.id);
  if (idx !== -1) { chars[idx] = updated; saveAll(chars); }
}

// ── 전투 사망 처리 ───────────────────────────────────────────────
function killCharacter(char: Character, { day, cog, round, killedBy }: { day: number; cog: number; round: number; killedBy: string }): void {
  recordDeath(char.id, { death: 0, day, cog, round, killedBy });
  char.status    = 'dead_chip';
  char.currentHp = 0;
  updateCharacter(char);
}

// ── 초기화 + 마이그레이션 ─────────────────────────────────────────
function initIfEmpty(): Character[] {
  const ex = loadAll();

  if (ex && ex.length > 0) {
    let dirty = false;

    ex.forEach(c => {
      if (!c.spriteKey || !c.spriteKey.startsWith('portrait_')) {
        c.spriteKey = CharacterSpriteManager.getPortraitKey(c.job);
        dirty = true;
      }

      if (!c.status) { c.status = 'alive'; dirty = true; }

      if ((c.job as string) === 'ai') {
        c.job      = 'helmsman';
        c.jobLabel = _getJobLabel('helmsman');
        dirty = true;
      } else {
        const fl = _getJobLabel(c.job);
        if (c.jobLabel !== fl) { c.jobLabel = fl; dirty = true; }
      }

      const fc = calcCog(c.statSum || 0);
      if (c.cog !== fc) { c.cog = fc; dirty = true; }

      type LegacyChar = Character & { position?: unknown; skill?: unknown };
      const lc = c as LegacyChar;
      if ('position' in lc) { delete lc.position; dirty = true; }

      if (lc.skill && !c.finale) {
        c.finale = lc.skill as string;
        dirty = true;
      }
      if ('skill' in lc) { delete lc.skill; dirty = true; }

      if (!c.action)   { c.action   = _pick(_getAbilityPool('action',   c.job, c.cog)); dirty = true; }
      if (!c.enhanced) { c.enhanced = _pick(_getAbilityPool('enhanced', c.job, c.cog)); dirty = true; }
      if (!c.finale)   { c.finale   = _pick(_getAbilityPool('finale',   c.job, c.cog)); dirty = true; }
      if (!c.passive)  { c.passive  = _pick(_getAbilityPool('passive',  c.job, c.cog)); dirty = true; }

      if (c.overclock === undefined || c.overclock === null) {
        c.overclock = _rollInitialOverclock();
        dirty = true;
      }

      if (c.mastery === undefined || c.mastery === 0) {
        c.mastery = 1 + Math.floor(Math.random() * 30);
        dirty = true;
      }
      if (!c.pendingStats) {          // 0 또는 undefined → mastery 포인트 부여
        c.pendingStats = c.mastery;
        dirty = true;
      }

      if (!c._hpMigrated && c.stats?.hp != null) {
        const expected5  = c.stats.hp * 5;
        const expected10 = c.stats.hp * 10;
        if (c.maxHp >= expected10 * 0.9) {
          const hpRatio = c.maxHp > 0 ? (c.currentHp / c.maxHp) : 1;
          c.maxHp       = expected5;
          c.currentHp   = Math.round(expected5 * hpRatio);
        }
        c._hpMigrated = true;
        dirty = true;
      }
    });

    if (dirty) saveAll(ex);
    return ex;
  }

  const chars: Character[] = [];
  const jobs: JobId[]      = ['fisher', 'diver', 'helmsman'];
  for (let cog = 1; cog <= 10; cog++)
    chars.push(createCharacterOfCog(jobs[Math.floor(Math.random() * 3)], cog));
  for (let i = 0; i < 10; i++) chars.push(createCharacter('fisher'));
  for (let i = 0; i < 10; i++) chars.push(createCharacter('diver'));
  for (let i = 0; i < 10; i++) chars.push(createCharacter('helmsman'));
  saveAll(chars);
  return chars;
}

// ── 스쿼드 ───────────────────────────────────────────────────────
function loadSquad(): string[][] {
  try {
    const r = localStorage.getItem(SQUAD_KEY);
    if (!r) return Array(10).fill(null).map(() => []);
    const raw = JSON.parse(r) as unknown[];
    return Array(10).fill(null).map((_, i) => {
      const v = raw[i];
      return !v ? [] : Array.isArray(v) ? (v as string[]).filter(Boolean) : [v as string];
    });
  } catch { return Array(10).fill(null).map(() => []); }
}
function saveSquad(s: string[][]): void {
  localStorage.setItem(SQUAD_KEY, JSON.stringify(
    Array(10).fill(null).map((_, i) => {
      const v = s[i]; return !v ? [] : Array.isArray(v) ? v : [v];
    })
  ));
}

// ── 파티 ─────────────────────────────────────────────────────────
const PARTY_KEY = 'nr_party';
function saveParty(charIds: string[]): void { localStorage.setItem(PARTY_KEY, JSON.stringify(charIds ?? [])); }
function loadParty(): string[] {
  try { const r = localStorage.getItem(PARTY_KEY); return r ? (JSON.parse(r) as string[]) : []; }
  catch { return []; }
}

// ── 기록칩 ───────────────────────────────────────────────────────
const RECORD_KEY = 'nr_record_chips';

function loadRecordChips(): Record<string, RecordChip> {
  try { const r = localStorage.getItem(RECORD_KEY); return r ? (JSON.parse(r) as Record<string, RecordChip>) : {}; }
  catch { return {}; }
}

function _emptyChip(): RecordChip {
  return { expeditions: 0, kills: 0, deaths: 0, highestRegion: '', highestCog: 0, veteran: false, firstDay: 0, deathLog: [] };
}

function getRecordChip(spriteKey: string): RecordChip | null {
  return loadRecordChips()[spriteKey] ?? null;
}

function updateRecordChip(spriteKey: string, delta: Partial<RecordChip & { highestRegion: string; highestCog: number }>): RecordChip {
  const chips = loadRecordChips();
  if (!chips[spriteKey]) chips[spriteKey] = _emptyChip();
  const c = chips[spriteKey];
  if (delta.expeditions) c.expeditions += delta.expeditions;
  if (delta.kills)       c.kills       += delta.kills;
  if (delta.highestRegion && delta.highestRegion > c.highestRegion) c.highestRegion = delta.highestRegion;
  if (delta.highestCog   && delta.highestCog   > c.highestCog)     c.highestCog   = delta.highestCog;
  if (c.expeditions >= 10 && !c.veteran) c.veteran = true;
  localStorage.setItem(RECORD_KEY, JSON.stringify(chips));
  return c;
}

function recordDeath(spriteKey: string, { day, cog, round, killedBy }: DeathLogEntry & { death?: number }): RecordChip {
  const chips = loadRecordChips();
  if (!chips[spriteKey]) chips[spriteKey] = _emptyChip();
  const c = chips[spriteKey];
  c.deaths += 1;
  c.deathLog.unshift({ death: c.deaths, day, cog, round, killedBy });
  localStorage.setItem(RECORD_KEY, JSON.stringify(chips));
  return c;
}

function recordFirstDay(spriteKey: string, day: number): void {
  const chips = loadRecordChips();
  if (!chips[spriteKey]) chips[spriteKey] = _emptyChip();
  if (!chips[spriteKey].firstDay) chips[spriteKey].firstDay = day;
  localStorage.setItem(RECORD_KEY, JSON.stringify(chips));
}

// ── 공개 API ─────────────────────────────────────────────────────
export const CharacterManager = {
  initIfEmpty,
  loadAll, saveAll,
  createCharacter, createCharacterOfCog,
  addCharacter, removeCharacter, updateCharacter,
  killCharacter,
  loadSquad, saveSquad,
  saveParty, loadParty,
  getRecordChip, updateRecordChip, recordDeath, recordFirstDay,
  calcCog, getCogColor, COG_COLORS,
  JOB_LABEL,
  STAT_COLORS, STAT_LABEL_MAP,
  getAbilityPool:   _getAbilityPool,
  getEffectiveStat,
  getEffectiveStats,
  getStatBreakdown,
  gainMastery,
  spendStat,
};
