// ================================================================
//  Recruit_Data.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Data.js
//
//  역할: 영입 탭 전용 상수 + 가챠 유틸 함수
//
//  ── 변경 이력 ────────────────────────────────────────────────
//    v5: ai → helmsman (조타수), skill → action/enhanced/finale 3슬롯 분리
//        position 필드 완전 제거
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

// ── 직업 목록 ─────────────────────────────────────────────────────
const RECRUIT_JOBS = ['fisher', 'diver', 'helmsman'];
const RECRUIT_JOB_LABEL = { fisher: '낚시꾼', diver: '잠수부', helmsman: '조타수' };

const _RECRUIT_NAME_POOL = (typeof CHARACTER_NAMES !== 'undefined' && CHARACTER_NAMES.length > 0)
  ? CHARACTER_NAMES
  : ['볼트','기어','러스트','뎁스','아크','스팀','드릴','앵커','크롬','스크랩'];

const RECRUIT_NAMES = {
  fisher:   _RECRUIT_NAME_POOL,
  diver:    _RECRUIT_NAME_POOL,
  helmsman: _RECRUIT_NAME_POOL,
};

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
  const lv = Math.max(0, Math.floor((currentPrice - RECRUIT_BASE_PRICE) / RECRUIT_PRICE_STEP));
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
  if (typeof OVERCLOCK_CHANCE === 'undefined' || Math.random() >= OVERCLOCK_CHANCE) return null;
  return OVERCLOCK_POOL[Math.floor(Math.random() * OVERCLOCK_POOL.length)];
}

// ── 능력 풀 헬퍼 ─────────────────────────────────────────────────
function _rAbility(type, job, cog) {
  if (typeof CharacterManager !== 'undefined' && CharacterManager.getAbilityPool) {
    const pool = CharacterManager.getAbilityPool(type, job, cog);
    if (pool && pool.length) return _rFrom(pool);
  }
  // 최소 폴백
  const fb = {
    passive:  { 1:'tough_body',  3:'fighting_spirit', 5:'aqua_adapt', 7:'unyielding'   },
    action:   { 1:'strike',      3:'rapid_strike',    5:'heavy_strike',7:'wide_strike'  },
    enhanced: { 1:'combo_hit',   3:'evasion',         5:'burst_speed', 7:'iron_wall'    },
    finale:   { 1:'quick_stab',  3:'heavy_blow',      5:'explosion_hit',7:'core_overload'},
  };
  const tbl = fb[type] || {};
  const key = [7,5,3,1].find(k => cog >= k) || 1;
  return tbl[key] || 'strike';
}

// ── 직업 다양성 강제 ─────────────────────────────────────────────
//  3장 중 모두 같은 직업이면 3번째를 다른 직업으로 교체
function _ensureJobDiversity(rolls) {
  const jobs = rolls.map(r => r.job);
  if (jobs.every(j => j === jobs[0])) {
    const altJobs = RECRUIT_JOBS.filter(j => j !== jobs[0]);
    rolls[2].job      = _rFrom(altJobs);
    rolls[2].jobLabel = RECRUIT_JOB_LABEL[rolls[2].job];
    // 직업 바뀌면 능력도 재롤
    const j = rolls[2].job, cog = rolls[2].cog;
    rolls[2].passive  = _rAbility('passive',  j, cog);
    rolls[2].action   = _rAbility('action',   j, cog);
    rolls[2].enhanced = _rAbility('enhanced', j, cog);
    rolls[2].finale   = _rAbility('finale',   j, cog);
  }
  return rolls;
}

// ── 가챠 1회 결과 생성 ───────────────────────────────────────────
function _rRoll(currentPrice) {
  const price     = currentPrice ?? RECRUIT_BASE_PRICE;
  const entry     = _rWPick(_buildGachaTable(price));
  const statSum   = _rBiasedInRange(entry.min, entry.max);
  const cog       = entry.cog;
  const job       = _rFrom(RECRUIT_JOBS);
  const baseStats = _rDist(statSum);
  const overclock = _rOverclock();

  return {
    name:      _rFrom(_RECRUIT_NAME_POOL),
    job,
    jobLabel:  RECRUIT_JOB_LABEL[job],
    stats:     baseStats,
    statSum,
    cog,
    passive:   _rAbility('passive',  job, cog),
    action:    _rAbility('action',   job, cog),
    enhanced:  _rAbility('enhanced', job, cog),
    finale:    _rAbility('finale',   job, cog),
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
