// ================================================================
//  Recruit_Data.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Data.js
//
//  역할: 영입 탭 전용 상수 + 가챠 유틸 함수
//  의존: Data_CharacterNames.js (CHARACTER_NAMES)
//        Data_Overclock.js      (OVERCLOCK_CHANCE, OVERCLOCK_POOL)
//        PositionData.js        (POSITION_POOL)
//        PassiveData.js         (PASSIVE_POOL)
//
//  ── 스탯 저장 방식 ────────────────────────────────────────────
//    · result.stats  = 순수 기본값 (오버클럭 보정 없음)
//    · 오버클럭 보정은 CharacterManager.getEffectiveStat() 에서만 계산
//    · 표시 예: 공격 10 → 오버클럭 +5 → 아이템 +3 → 합계 18
//
//  ── 변경 이력 ────────────────────────────────────────────────
//    v2: 어빌리티 3분리 / 오버클럭 / 스탯 편향 / 직업 다양성 / 가격 연동 가중치
//    v3: OVERCLOCK_CHANCE / OVERCLOCK_POOL → Data_Overclock.js 로 분리
//    v4: stats = 순수 기본값으로 변경 (_applyOverclock 제거)
//        오버클럭 보정은 getEffectiveStat 에서만 적용
// ================================================================


// ── Cog 10등급 체계 ───────────────────────────────────────────────
const RECRUIT_GACHA_BASE = [
  { cog: 1,  baseW: 9490, min:   7, max:  25 },
  { cog: 2,  baseW:  350, min:  26, max:  44 },
  { cog: 3,  baseW:  100, min:  45, max:  63 },
  { cog: 4,  baseW:   30, min:  64, max:  82 },
  { cog: 5,  baseW:   15, min:  83, max: 100 },
  { cog: 6,  baseW:    3, min: 101, max: 133 },
  { cog: 7,  baseW:    2, min: 134, max: 166 },
  { cog: 8,  baseW:    1, min: 167, max: 200 },
  { cog: 9,  baseW:    0, min: 201, max: 250 },
  { cog: 10, baseW:    0, min: 251, max: 300 },
];

const RECRUIT_COG_SCALE = {
  1:  { type: 'down',  rate: 0.05 },
  2:  { type: 'down',  rate: 0.03 },
  3:  { type: 'down',  rate: 0.01 },
  4:  { type: 'up',    rate: 0.20 },
  5:  { type: 'up',    rate: 0.35 },
  6:  { type: 'up',    rate: 0.55 },
  7:  { type: 'up',    rate: 0.75 },
  8:  { type: 'up',    rate: 1.00 },
  9:  { type: 'fixed', val:  0    },
  10: { type: 'fixed', val:  0    },
};

const RECRUIT_STAT_MINS   = [1, 0, 1, 5, 0];
const RECRUIT_STAT_LABELS = ['체력', '건강', '공격', '민첩', '행운'];
const RECRUIT_STAT_KEYS   = ['hp', 'health', 'attack', 'agility', 'luck'];

const RECRUIT_COG_COLORS = {
  1:'#7dff4f', 2:'#aaee22', 3:'#ccdd00', 4:'#ffdd00', 5:'#ffaa00',
  6:'#ff7700', 7:'#ff4400', 8:'#dd0000', 9:'#ff2255', 10:'#cc44ff',
};

// ── 스킬 풀 — Data_Skills.js 로드 시 id 기반 자동 빌드, 실패 시 id 폴백 ─
const RECRUIT_SKILL_POOL = (() => {
  if (typeof SKILL_DATA !== 'undefined' && Array.isArray(SKILL_DATA)) {
    const pool = {};
    for (let cog = 1; cog <= 10; cog++) pool[cog] = [];
    SKILL_DATA.forEach(s => {
      for (let cog = s.cogMin; cog <= 10; cog++) pool[cog].push(s.id);
    });
    return pool;
  }
  // Data_Skills.js 미로드 시 id 폴백
  return {
    1:  ['basic_strike', 'quick_stab'],
    2:  ['basic_strike', 'quick_stab', 'combo_hit', 'guard_stance'],
    3:  ['combo_hit', 'guard_stance', 'heavy_blow', 'evasion', 'poison_coat'],
    4:  ['heavy_blow', 'evasion', 'poison_coat', 'aoe_strike', 'strong_poison', 'burst_speed'],
    5:  ['aoe_strike', 'strong_poison', 'burst_speed', 'explosion_hit', 'front_scan', 'armor_pierce'],
    6:  ['explosion_hit', 'front_scan', 'armor_pierce', 'deep_pressure', 'electric_shock', 'iron_wall'],
    7:  ['deep_pressure', 'electric_shock', 'iron_wall', 'core_overload', 'abyss_roar'],
    8:  ['core_overload', 'abyss_roar'],
    9:  ['core_overload', 'abyss_roar'],
    10: ['core_overload', 'abyss_roar'],
  };
})();

const _RECRUIT_NAME_POOL = (typeof CHARACTER_NAMES !== 'undefined' && CHARACTER_NAMES.length > 0)
  ? CHARACTER_NAMES
  : ['볼트','기어','러스트','뎁스','아크','스팀','드릴','앵커','크롬','스크랩'];

const RECRUIT_NAMES     = { fisher: _RECRUIT_NAME_POOL, diver: _RECRUIT_NAME_POOL };
const RECRUIT_JOB_LABEL = { fisher: '낚시꾼', diver: '잠수부' };
const RECRUIT_JOBS      = ['fisher', 'diver'];

const RECRUIT_BASE_PRICE   = 5;
const RECRUIT_PRICE_STEP   = 5;
const RECRUIT_MAX_REROLL   = 3;
const RECRUIT_SLOT_TICK    = 55;
const RECRUIT_SLOT_COUNT   = 30;
const RECRUIT_SPRITE_COUNT = 72;


// ════════════════════════════════════════════════════════════════
//  가챠 유틸 함수
// ════════════════════════════════════════════════════════════════

function _buildGachaTable(currentPrice) {
  const lv = Math.max(0, Math.floor(
    (currentPrice - RECRUIT_BASE_PRICE) / RECRUIT_PRICE_STEP
  ));
  return RECRUIT_GACHA_BASE.map(entry => {
    const sc = RECRUIT_COG_SCALE[entry.cog];
    let w = entry.baseW;
    if      (sc.type === 'fixed') { w = sc.val; }
    else if (sc.type === 'down')  { w = Math.round(w * Math.max(0.10, 1 - sc.rate * lv)); }
    else                          { w = Math.round(w * (1 + sc.rate * lv)); }
    return { cog: entry.cog, weight: w, min: entry.min, max: entry.max };
  });
}

function _rWPick(table) {
  const active = table.filter(e => e.weight > 0);
  const total  = active.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of active) { r -= e.weight; if (r <= 0) return e; }
  return active[active.length - 1];
}

function _rBiasedInRange(min, max) {
  return min + Math.floor(Math.pow(Math.random(), 1.8) * (max - min + 1));
}

function _rDist(total) {
  const s   = [...RECRUIT_STAT_MINS];
  let   rem = Math.max(0, total - s.reduce((a, b) => a + b, 0));
  for (let i = 0; i < rem; i++) s[Math.floor(Math.random() * 5)]++;
  return s;
}

function _rFrom(arr)   { return arr[Math.floor(Math.random() * arr.length)]; }
function _rSpriteKey() { return `char_${String(Math.floor(Math.random() * RECRUIT_SPRITE_COUNT)).padStart(3, '0')}`; }

// ── 오버클럭 롤 ─────────────────────────────────────────────────
function _rOverclock() {
  if (Math.random() >= OVERCLOCK_CHANCE) return null;
  return OVERCLOCK_POOL[Math.floor(Math.random() * OVERCLOCK_POOL.length)];
}

// ── 직업 다양성 강제 ─────────────────────────────────────────────
function _ensureJobDiversity(rolls) {
  const jobs = rolls.map(r => r.job);
  if (jobs.every(j => j === jobs[0])) {
    const altJobs = RECRUIT_JOBS.filter(j => j !== jobs[0]);
    rolls[2].job  = _rFrom(altJobs);
    rolls[2].name = _rFrom(RECRUIT_NAMES[rolls[2].job]);
  }
  return rolls;
}

// ── 가챠 1회 결과 생성 ───────────────────────────────────────────
// · result.stats  = 순수 기본값 (오버클럭 미적용)
// · 오버클럭 보정 수치는 CharacterManager.getEffectiveStat() 에서 계산
function _rRoll(currentPrice) {
  const price     = currentPrice ?? RECRUIT_BASE_PRICE;
  const entry     = _rWPick(_buildGachaTable(price));
  const statSum   = _rBiasedInRange(entry.min, entry.max);
  const cog       = entry.cog;
  const job       = _rFrom(RECRUIT_JOBS);
  const baseStats = _rDist(statSum);          // 순수 기본값 배열
  const overclock = _rOverclock();            // null 또는 OVERCLOCK_POOL 항목

  const posPool = (typeof POSITION_POOL !== 'undefined') ? (POSITION_POOL[cog] || POSITION_POOL[1]) : ['앞칸 타격'];
  const pasPool = (typeof PASSIVE_POOL  !== 'undefined') ? (PASSIVE_POOL[cog]  || PASSIVE_POOL[1])  : ['강인한 체질'];
  const sklPool = RECRUIT_SKILL_POOL[cog] || RECRUIT_SKILL_POOL[1];

  return {
    name:      _rFrom(_RECRUIT_NAME_POOL),
    job,
    stats:     baseStats,   // ← 순수 기본값, 오버클럭 보정 없음
    statSum,                 // 기본값 기준 합계
    cog,
    position:  _rFrom(posPool),
    passive:   _rFrom(pasPool),
    skill:     _rFrom(sklPool),
    overclock,
    spriteKey: _rSpriteKey(),
  };
}

// ── 3장 동시 뽑기 ────────────────────────────────────────────────
function _rRollTriple(currentPrice) {
  return _ensureJobDiversity([
    _rRoll(currentPrice),
    _rRoll(currentPrice),
    _rRoll(currentPrice),
  ]);
}
