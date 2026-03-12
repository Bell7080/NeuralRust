// ================================================================
//  Recruit_Data.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Data.js
//
//  역할: 영입 탭 전용 상수 + 가챠 유틸 함수
//
//  의존 (로드 순서):
//    Data_CharacterNames.js  → CHARACTER_NAMES
//    Data_Jobs.js            → JOB_DATA (직업 라벨)
//    Data_Positions.js       → POSITION_POOL
//    Data_Passives.js        → PASSIVE_POOL
//    Data_Skills.js          → SKILL_DATA (배열, id 기반)
//
//  ── 변경 이력 (v3) ───────────────────────────────────────────
//    1. RECRUIT_SKILL_POOL — 이름 기반 → id 기반으로 교체
//       Data_Skills.js 의 SKILL_POOL 을 직접 참조
//       로드 실패 시 id 기반 폴백으로 대체
//    2. 의존 파일명 주석 갱신 (Data_ 접두사 통일)
//    3. _rRoll 내부 포지션·패시브 풀 참조 변수명 갱신
//       POSITION_POOL → Data_Positions.js 기준
//       PASSIVE_POOL  → Data_Passives.js 기준
// ================================================================


// ── Cog 10등급 체계 ───────────────────────────────────────────────
//   Cog 1:   7~ 25   Cog 2:  26~ 44   Cog 3:  45~ 63
//   Cog 4:  64~ 82   Cog 5:  83~100   Cog 6: 101~133
//   Cog 7: 134~166   Cog 8: 167~200   Cog 9: 201~250
//   Cog10: 251~300
//
// ── 기준 가중치 (가격=5, RECRUIT_BASE_PRICE일 때) ────────────────
//   Cog 1: ~94.9%  Cog 2: ~3.5%  Cog 3: ~1.0%
//   Cog 4: ~0.30%  Cog 5: ~0.15% Cog 6~8: <0.05%
//   Cog 9·10: 0% (별도 경로 전용)

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

// ── 가격 연동 가중치 보정 계수 ────────────────────────────────────
const RECRUIT_COG_SCALE = {
  1:  { type: 'down',  rate: 0.05 },
  2:  { type: 'down',  rate: 0.03 },
  3:  { type: 'down',  rate: 0.01 },
  4:  { type: 'up',    rate: 0.20 },
  5:  { type: 'up',    rate: 0.35 },
  6:  { type: 'up',    rate: 0.55 },
  7:  { type: 'up',    rate: 0.75 },
  8:  { type: 'up',    rate: 1.00 },
  9:  { type: 'fixed', val: 0 },
  10: { type: 'fixed', val: 0 },
};

// ── 스탯 최솟값 ──────────────────────────────────────────────────
const RECRUIT_STAT_MINS   = [1, 0, 1, 5, 0];
const RECRUIT_STAT_LABELS = ['체력', '건강', '공격', '민첩', '행운'];
const RECRUIT_STAT_KEYS   = ['hp', 'health', 'attack', 'agility', 'luck'];

// ── Cog 등급 색상 ─────────────────────────────────────────────────
const RECRUIT_COG_COLORS = {
  1:  '#7dff4f',
  2:  '#aaee22',
  3:  '#ccdd00',
  4:  '#ffdd00',
  5:  '#ffaa00',
  6:  '#ff7700',
  7:  '#ff4400',
  8:  '#dd0000',
  9:  '#ff2255',
  10: '#cc44ff',
};

// ── 스킬 풀 — id 기반 (Data_Skills.js 연동) ──────────────────────
// Data_Skills.js 의 SKILL_POOL(자동생성) 또는 SKILL_DATA 배열 참조
// 로드 실패 시 id 기반 폴백 사용
const RECRUIT_SKILL_POOL = (() => {
  // 1순위: Data_Skills.js 가 내보내는 SKILL_POOL 상수 직접 사용
  if (typeof SKILL_POOL !== 'undefined') return SKILL_POOL;

  // 2순위: SKILL_DATA 배열로 직접 빌드
  if (typeof SKILL_DATA !== 'undefined' && Array.isArray(SKILL_DATA)) {
    const pool = {};
    for (let cog = 1; cog <= 10; cog++) pool[cog] = [];
    SKILL_DATA.forEach(s => {
      for (let cog = s.cogMin; cog <= 10; cog++) pool[cog].push(s.id);
    });
    return pool;
  }

  // 3순위: id 기반 하드코딩 폴백
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

// ── 오버클럭 정의 ─────────────────────────────────────────────────
const OVERCLOCK_CHANCE = 0.50;   // ⚠️ 테스트 50% (실서비스: 0.05)

const OVERCLOCK_POOL = [
  {
    id:          'oc_attack',
    name:        '분노 회로',
    label:       '⚡ 오버클럭 : 공격',
    description: '공격 스탯이 50% 증가합니다.',
    statKey:     'attack',
    statIdx:     2,
    bonus:       0.50,
    color:       '#ff4400',
  },
  {
    id:          'oc_hp',
    name:        '강화 외피',
    label:       '⚡ 오버클럭 : 체력',
    description: '체력 스탯이 50% 증가합니다.',
    statKey:     'hp',
    statIdx:     0,
    bonus:       0.50,
    color:       '#44dd44',
  },
  {
    id:          'oc_health',
    name:        '자가 수복',
    label:       '⚡ 오버클럭 : 건강',
    description: '건강 스탯이 50% 증가합니다.',
    statKey:     'health',
    statIdx:     1,
    bonus:       0.50,
    color:       '#aaffaa',
  },
  {
    id:          'oc_agility',
    name:        '가속 구동계',
    label:       '⚡ 오버클럭 : 민첩',
    description: '민첩 스탯이 50% 증가합니다.',
    statKey:     'agility',
    statIdx:     3,
    bonus:       0.50,
    color:       '#44ccff',
  },
  {
    id:          'oc_luck',
    name:        '행운 코어',
    label:       '⚡ 오버클럭 : 행운',
    description: '행운 스탯이 50% 증가합니다.',
    statKey:     'luck',
    statIdx:     4,
    bonus:       0.50,
    color:       '#ffdd00',
  },
];

// ── 이름 풀 ──────────────────────────────────────────────────────
// Data_CharacterNames.js → CHARACTER_NAMES 참조
const _RECRUIT_NAME_POOL = (typeof CHARACTER_NAMES !== 'undefined' && CHARACTER_NAMES.length > 0)
  ? CHARACTER_NAMES
  : ['볼트', '기어', '러스트', '뎁스', '아크', '스팀', '드릴', '앵커', '크롬', '스크랩'];

const RECRUIT_NAMES = { fisher: _RECRUIT_NAME_POOL, diver: _RECRUIT_NAME_POOL };

const RECRUIT_JOB_LABEL = { fisher: '낚시꾼', diver: '잠수부' };
// ※ 'ai'는 가챠 획득 불가 — 시설 등 별도 경로로만 획득
const RECRUIT_JOBS = ['fisher', 'diver'];

// ── 기타 상수 ────────────────────────────────────────────────────
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
    if (sc.type === 'fixed') {
      w = sc.val;
    } else if (sc.type === 'down') {
      w = Math.round(w * Math.max(0.10, 1 - sc.rate * lv));
    } else {
      w = Math.round(w * (1 + sc.rate * lv));
    }
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
  const biased = Math.pow(Math.random(), 1.8);
  return min + Math.floor(biased * (max - min + 1));
}

function _rDist(total) {
  const s   = [...RECRUIT_STAT_MINS];
  let   rem = Math.max(0, total - s.reduce((a, b) => a + b, 0));
  for (let i = 0; i < rem; i++) s[Math.floor(Math.random() * 5)]++;
  return s;
}

function _rFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _rSpriteKey() {
  return `char_${String(Math.floor(Math.random() * RECRUIT_SPRITE_COUNT)).padStart(3, '0')}`;
}

function _rOverclock() {
  if (Math.random() >= OVERCLOCK_CHANCE) return null;
  return OVERCLOCK_POOL[Math.floor(Math.random() * OVERCLOCK_POOL.length)];
}

function _applyOverclock(stats, overclock) {
  if (!overclock) return stats;
  const result = [...stats];
  result[overclock.statIdx] = Math.floor(result[overclock.statIdx] * (1 + overclock.bonus));
  return result;
}

function _ensureJobDiversity(rolls) {
  const jobs = rolls.map(r => r.job);
  if (jobs.every(j => j === jobs[0])) {
    const altJobs  = RECRUIT_JOBS.filter(j => j !== jobs[0]);
    rolls[2].job   = _rFrom(altJobs);
    rolls[2].name  = _rFrom(RECRUIT_NAMES[rolls[2].job]);
  }
  return rolls;
}

// ── 가챠 1회 결과 생성 ───────────────────────────────────────────
function _rRoll(currentPrice) {
  const price      = currentPrice ?? RECRUIT_BASE_PRICE;
  const table      = _buildGachaTable(price);
  const entry      = _rWPick(table);
  const statSum    = _rBiasedInRange(entry.min, entry.max);
  const cog        = entry.cog;
  const job        = _rFrom(RECRUIT_JOBS);
  const baseStats  = _rDist(statSum);
  const overclock  = _rOverclock();
  const finalStats = _applyOverclock(baseStats, overclock);
  const finalSum   = finalStats.reduce((a, b) => a + b, 0);

  // 포지션 — Data_Positions.js → POSITION_POOL
  const posPool = (typeof POSITION_POOL !== 'undefined')
    ? (POSITION_POOL[cog] || POSITION_POOL[1])
    : ['앞칸 타격'];

  // 패시브 — Data_Passives.js → PASSIVE_POOL
  const pasPool = (typeof PASSIVE_POOL !== 'undefined')
    ? (PASSIVE_POOL[cog] || PASSIVE_POOL[1])
    : ['강인한 체질'];

  // 스킬 — RECRUIT_SKILL_POOL (id 기반)
  const sklPool = RECRUIT_SKILL_POOL[cog] || RECRUIT_SKILL_POOL[1];

  return {
    job,
    statSum:   finalSum,
    baseSum:   statSum,
    cog,
    stats:     finalStats,
    baseStats: baseStats,
    name:      _rFrom(RECRUIT_NAMES[job]),
    spriteKey: _rSpriteKey(),
    position:  _rFrom(posPool),
    passive:   _rFrom(pasPool),
    skill:     _rFrom(sklPool),
    overclock: overclock,
  };
}

function _rRollTriple(currentPrice) {
  return _ensureJobDiversity([
    _rRoll(currentPrice),
    _rRoll(currentPrice),
    _rRoll(currentPrice),
  ]);
}
