// ================================================================
//  CharacterManager.js
//  경로: Games/Codes/Managers/CharacterManager.js
//
//  [로드 순서 — HTML]
//    1. Games/Codes/Data/Data_CharacterNames.js   ← CHARACTER_NAMES
//    2. Games/Codes/Data/Data_Jobs.js              ← JOB_DATA
//    3. Games/Codes/Data/Data_Positions.js         ← POSITION_DATA, POSITION_POOL, RANGE
//    4. Games/Codes/Data/Data_Passives.js          ← PASSIVE_DATA, PASSIVE_POOL
//    5. Games/Codes/Data/Data_Skills.js            ← SKILL_DATA, SKILL_POOL
//    6. Games/Codes/Managers/CharacterManager.js
//
//  ── 숙련도(Mastery) 시스템 ───────────────────────────────────
//    · char.mastery       : 누적 숙련도 레벨 (무제한, 기본 0)
//    · char.pendingStats  : 미배분 잔여 스탯 포인트 (기본 0)
//    · 탐험 귀환 시 CharacterManager.gainMastery(char, cogLevel) 호출
//      → mastery += cogLevel, pendingStats += cogLevel
//    · 플레이어가 Tab_CharProfile의 + 버튼으로 스탯에 직접 배분
//
//  ── 오버클럭(Overclock) 적용 순서 ────────────────────────────
//    · (기본스탯 + mastery 배분) 합산 후 × (1 + bonus)
//    · 무기/장비는 이 함수 밖에서 별도 가산
//    · getEffectiveStat(char, key) 로 최종값 계산
// ================================================================

const CharacterManager = (() => {

  // ── 스탯 색상 ────────────────────────────────────────────────────
  // 전역에서 Tab_CharProfile, Recruit_Custom 등이 참조
  const STAT_COLORS = {
    hp:      '#ff88bb',
    health:  '#ff4466',
    attack:  '#ff3333',
    agility: '#55ccff',
    luck:    '#88ff88',
  };

  const STAT_LABEL_MAP = {
    hp: '체력', health: '건강', attack: '공격', agility: '민첩', luck: '행운',
  };

  // ── 이름 풀 ──────────────────────────────────────────────────────
  // Data_CharacterNames.js → CHARACTER_NAMES
  function _getNamePool() {
    return (typeof CHARACTER_NAMES !== 'undefined' && CHARACTER_NAMES.length > 0)
      ? CHARACTER_NAMES
      : ['볼트','기어','러스트','뎁스','아크','스팀','드릴','앵커',
         '크롬','스크랩','파이퍼','드리프터','글리치','넥서스','타이드',
         '코그','플럭스','스파크','베인','어비스'];
  }

  // ── 직업 라벨 ────────────────────────────────────────────────────
  // Data_Jobs.js → JOB_DATA
  function _getJobLabel(jobId) {
    if (typeof JOB_DATA !== 'undefined' && JOB_DATA[jobId])
      return JOB_DATA[jobId].label;
    return ({ fisher: '낚시꾼', diver: '잠수부', ai: 'A.I' })[jobId] || jobId;
  }

  const JOB_LABEL = { fisher: '낚시꾼', diver: '잠수부', ai: 'A.I' };

  // ── Cog 계산 ─────────────────────────────────────────────────────
  function calcCog(s) {
    if (s <=  25) return 1;  if (s <=  44) return 2;
    if (s <=  63) return 3;  if (s <=  82) return 4;
    if (s <= 100) return 5;  if (s <= 133) return 6;
    if (s <= 166) return 7;  if (s <= 200) return 8;
    if (s <= 250) return 9;  return 10;
  }

  // ── Cog 색상 ─────────────────────────────────────────────────────
  const COG_COLORS = {
    1:  { css: '#7dff4f', phaser: 0x7dff4f, glow: 0x4acc20, label: '#4acc20', special: false },
    2:  { css: '#aaee22', phaser: 0xaaee22, glow: 0x77bb00, label: '#77bb00', special: false },
    3:  { css: '#ccdd00', phaser: 0xccdd00, glow: 0x99aa00, label: '#99aa00', special: false },
    4:  { css: '#ffdd00', phaser: 0xffdd00, glow: 0xccaa00, label: '#ccaa00', special: false },
    5:  { css: '#ffaa00', phaser: 0xffaa00, glow: 0xcc7700, label: '#cc7700', special: false },
    6:  { css: '#ff7700', phaser: 0xff7700, glow: 0xcc4400, label: '#cc4400', special: false },
    7:  { css: '#ff4400', phaser: 0xff4400, glow: 0xcc2200, label: '#cc2200', special: false },
    8:  { css: '#dd0000', phaser: 0xdd0000, glow: 0xaa0000, label: '#aa0000', special: false },
    9:  { css: '#ff2255', phaser: 0xff2255, glow: 0x000000, label: '#ff2255',
          border: 0x000000, special: true },
    10: { css: '#cc44ff', phaser: 0xcc44ff, glow: 0x000000, label: '#cc44ff',
          gradStart: 0x330066, gradEnd: 0x000000, special: true },
  };

  function getCogColor(cog) { return COG_COLORS[cog] || COG_COLORS[1]; }

  // ── 어빌리티 풀 폴백 ─────────────────────────────────────────────
  // Data_Positions.js / Data_Passives.js 로드 실패 시 대비
  const _POSITION_POOL_FALLBACK = {
    1: ['윗칸 타격', '앞칸 타격'],
    2: ['앞칸 타격', '현재 칸 타격'],
    3: ['현재 칸 타격', '대각 타격', '윗칸 타격'],
    4: ['전열 전체 타격', '대각 타격', '앞칸 타격'],
    5: ['전열 전체 타격', '현재 칸 타격', '후열 타격'],
    6: ['전/후열 동시 타격', '후열 타격', '전열 전체 타격'],
    7: ['전체 칸 타격', '전/후열 동시 타격'],
    8: ['전체 칸 타격', '전/후열 동시 타격'],
    9: ['전체 칸 타격', '전/후열 동시 타격'],
    10: ['전체 칸 타격'],
  };

  const _PASSIVE_POOL_FALLBACK = {
    1:  ['강인한 체질', '예리한 감각'],
    2:  ['예리한 감각', '행운아'],
    3:  ['투지', '빠른 회복'],
    4:  ['집중력', '도발'],
    5:  ['강철 피부', '수중 적응'],
    6:  ['야간 작전', '저격 자세'],
    7:  ['전술 눈빛', '심해의 숨결'],
    8:  ['불굴', '반격 본능'],
    9:  ['절대 의지', '반격 본능'],
    10: ['절대 의지', '코어 공명'],
  };

  // ── SKILL_POOL ────────────────────────────────────────────────────
  // Data_Skills.js → SKILL_DATA (배열) 로드 시 id 기반 풀 자동 생성
  // 로드 실패 시 id 기반 폴백으로 대체
  const SKILL_POOL = (() => {
    if (typeof SKILL_DATA !== 'undefined' && Array.isArray(SKILL_DATA)) {
      const pool = {};
      for (let cog = 1; cog <= 10; cog++) pool[cog] = [];
      SKILL_DATA.forEach(s => {
        for (let cog = s.cogMin; cog <= 10; cog++) pool[cog].push(s.id);
      });
      return pool;
    }
    // 폴백 — id 기반
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

  // ── 포지션 풀 참조 ────────────────────────────────────────────────
  // Data_Positions.js → POSITION_POOL 우선 참조
  function _getPositionPool(cog) {
    const p = (typeof POSITION_POOL !== 'undefined')
      ? POSITION_POOL
      : _POSITION_POOL_FALLBACK;
    return p[cog] || p[1];
  }

  // ── 패시브 풀 참조 ────────────────────────────────────────────────
  // Data_Passives.js → PASSIVE_POOL 우선 참조
  function _getPassivePool(cog) {
    if (typeof PASSIVE_POOL !== 'undefined') return PASSIVE_POOL[cog] || PASSIVE_POOL[1];
    return _PASSIVE_POOL_FALLBACK[cog] || _PASSIVE_POOL_FALLBACK[1];
  }

  // ── 풀 유효성 검사 ────────────────────────────────────────────────
  // 새 파일명 기준: Data_Positions.js → POSITION_DATA
  //                Data_Passives.js  → PASSIVE_DATA
  //                Data_Skills.js    → SKILL_DATA (배열)
  function _validatePools() {
    // POSITION_DATA 검사 (Data_Positions.js)
    if (typeof POSITION_DATA !== 'undefined') {
      Object.values(_POSITION_POOL_FALLBACK).flat().forEach(name => {
        if (!POSITION_DATA[name])
          console.warn(`[CharacterManager] POSITION_DATA 누락: "${name}"`);
      });
    }
    // PASSIVE_DATA 검사 (Data_Passives.js)
    if (typeof PASSIVE_DATA !== 'undefined') {
      Object.values(_PASSIVE_POOL_FALLBACK).flat().forEach(name => {
        if (!PASSIVE_DATA[name])
          console.warn(`[CharacterManager] PASSIVE_DATA 누락: "${name}"`);
      });
    }
    // SKILL_DATA 검사 (Data_Skills.js) — id 기반
    if (typeof SKILL_DATA !== 'undefined' && Array.isArray(SKILL_DATA)) {
      const skillIds = new Set(SKILL_DATA.map(s => s.id));
      Object.values(SKILL_POOL).flat().forEach(id => {
        if (!skillIds.has(id))
          console.warn(`[CharacterManager] SKILL_DATA id 누락: "${id}"`);
      });
    }
    // JOB_DATA 검사 (Data_Jobs.js)
    if (typeof JOB_DATA !== 'undefined') {
      ['fisher', 'diver', 'ai'].forEach(jobId => {
        if (!JOB_DATA[jobId])
          console.warn(`[CharacterManager] JOB_DATA 누락: "${jobId}"`);
      });
    }
  }

  // ── 유틸 ─────────────────────────────────────────────────────────
  function _pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  const SPRITE_COUNT = 72;
  function _randSpriteKey() {
    return `char_${String(Math.floor(Math.random() * SPRITE_COUNT)).padStart(3, '0')}`;
  }

  function _randStats() {
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

  function _randStatsBySum(total) {
    const mins = [1, 0, 1, 5, 0];
    const keys = ['hp', 'health', 'attack', 'agility', 'luck'];
    const rem  = Math.max(0, total - mins.reduce((a, b) => a + b, 0));
    const b    = [0, 0, 0, 0, 0];
    for (let i = 0; i < rem; i++) b[Math.floor(Math.random() * 5)]++;
    const r = {};
    keys.forEach((k, i) => { r[k] = mins[i] + b[i]; });
    return r;
  }

  const COG_STAT_RANGE = {
    1:  { min: 7,   max: 25  },
    2:  { min: 26,  max: 44  },
    3:  { min: 45,  max: 63  },
    4:  { min: 64,  max: 82  },
    5:  { min: 83,  max: 100 },
    6:  { min: 101, max: 133 },
    7:  { min: 134, max: 166 },
    8:  { min: 167, max: 200 },
    9:  { min: 201, max: 250 },
    10: { min: 251, max: 300 },
  };

  // ── 오버클럭 최종 스탯 계산 ──────────────────────────────────────
  function getEffectiveStat(char, key) {
    const base = char.stats[key] ?? 0;
    if (char.overclock && char.overclock.statKey === key)
      return Math.floor(base * (1 + char.overclock.bonus));
    return base;
  }

  function getEffectiveStats(char) {
    const keys = ['hp', 'health', 'attack', 'agility', 'luck'];
    const r = {};
    keys.forEach(k => { r[k] = getEffectiveStat(char, k); });
    return r;
  }

  // ── 숙련도(Mastery) 시스템 ───────────────────────────────────────
  function gainMastery(char, cogLevel) {
    char.mastery      = (char.mastery      || 0) + cogLevel;
    char.pendingStats = (char.pendingStats || 0) + cogLevel;
    return char;
  }

  function spendStat(char, key) {
    if (!char.pendingStats || char.pendingStats <= 0) return false;
    char.stats[key]    = (char.stats[key] || 0) + 1;
    char.pendingStats -= 1;
    if (key === 'hp') {
      char.maxHp     = (char.maxHp     || 0) + 10;
      char.currentHp = Math.min((char.currentHp || 0) + 10, char.maxHp);
    }
    char.statSum = Object.values(char.stats).reduce((a, v) => a + v, 0);
    updateCharacter(char);
    return true;
  }

  // ── 캐릭터 생성 ──────────────────────────────────────────────────
  function createCharacter(job) {
    const stats   = _randStats();
    const statSum = Object.values(stats).reduce((a, v) => a + v, 0);
    const cog     = calcCog(statSum);
    return {
      id:           `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name:         _pick(_getNamePool()),
      age:          16 + Math.floor(Math.random() * 10),
      job,
      jobLabel:     _getJobLabel(job),
      stats,
      statSum,
      cog,
      position:     _pick(_getPositionPool(cog)),
      passive:      _pick(_getPassivePool(cog)),
      skill:        _pick(SKILL_POOL[cog] || SKILL_POOL[1]),
      overclock:    null,
      mastery:      0,
      pendingStats: 0,
      currentHp:    stats.hp * 10,
      maxHp:        stats.hp * 10,
      spriteKey:    _randSpriteKey(),
    };
  }

  function createCharacterOfCog(job, cog) {
    const range   = COG_STAT_RANGE[cog] || COG_STAT_RANGE[1];
    const statSum = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    const stats   = _randStatsBySum(statSum);
    return {
      id:           `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name:         _pick(_getNamePool()),
      age:          16 + Math.floor(Math.random() * 10),
      job,
      jobLabel:     _getJobLabel(job),
      stats,
      statSum,
      cog,
      position:     _pick(_getPositionPool(cog)),
      passive:      _pick(_getPassivePool(cog)),
      skill:        _pick(SKILL_POOL[cog] || SKILL_POOL[1]),
      overclock:    null,
      mastery:      0,
      pendingStats: 0,
      currentHp:    stats.hp * 10,
      maxHp:        stats.hp * 10,
      spriteKey:    _randSpriteKey(),
    };
  }

  // ── 스토리지 ─────────────────────────────────────────────────────
  const KEY       = 'nr_characters';
  const SQUAD_KEY = 'nr_squad';

  function saveAll(chars)  { localStorage.setItem(KEY, JSON.stringify(chars)); }
  function loadAll() {
    try {
      const r = localStorage.getItem(KEY);
      return r ? JSON.parse(r) : null;
    } catch { return null; }
  }

  function addCharacter(char) {
    const chars = loadAll() || [];
    chars.push(char);
    saveAll(chars);
  }

  function removeCharacter(id) {
    saveAll((loadAll() || []).filter(c => c.id !== id));
    saveSquad(loadSquad().map(s => s.filter(x => x !== id)));
  }

  function updateCharacter(updated) {
    const chars = loadAll() || [];
    const idx   = chars.findIndex(c => c.id === updated.id);
    if (idx !== -1) { chars[idx] = updated; saveAll(chars); }
  }

  // ── 초기화 ───────────────────────────────────────────────────────
  function initIfEmpty() {
    _validatePools();
    const ex = loadAll();

    if (ex && ex.length > 0) {
      let dirty = false;

      // 구버전 passive가 포지션 이름이었을 때 이관용 목록
      const oldPosNames = [
        '윗칸 타격', '앞칸 타격', '현재 칸 타격', '대각 타격',
        '전열 전체 타격', '후열 타격', '전/후열 동시 타격', '전체 칸 타격',
      ];

      ex.forEach(c => {
        // 스프라이트 키 유효성
        const idx = parseInt((c.spriteKey || '').replace('char_', ''), 10);
        if (!c.spriteKey || isNaN(idx) || idx >= SPRITE_COUNT) {
          c.spriteKey = _randSpriteKey(); dirty = true;
        }

        // 직업 라벨 동기
        const fl = _getJobLabel(c.job);
        if (c.jobLabel !== fl) { c.jobLabel = fl; dirty = true; }

        // Cog 재계산
        const fc = calcCog(c.statSum || 0);
        if (c.cog !== fc) { c.cog = fc; dirty = true; }

        // position 누락 보정
        if (!c.position) {
          c.position = _pick(_getPositionPool(c.cog)); dirty = true;
        }

        // overclock 필드 누락 보정
        if (c.overclock === undefined) { c.overclock = null; dirty = true; }

        // 구버전 passive(포지션명) → position 이관
        if (oldPosNames.includes(c.passive)) {
          if (!c.position) c.position = c.passive;
          c.passive = _pick(_getPassivePool(c.cog));
          dirty = true;
        }

        // mastery / pendingStats 누락 보정
        if (c.mastery      === undefined) { c.mastery      = 0; dirty = true; }
        if (c.pendingStats === undefined) { c.pendingStats = 0; dirty = true; }
      });

      if (dirty) saveAll(ex);
      return ex;
    }

    // 저장 데이터 없음 — 초기 캐릭터 생성
    const chars = [];
    const sj = ['fisher', 'diver', 'ai'];
    for (let cog = 1; cog <= 10; cog++)
      chars.push(createCharacterOfCog(sj[Math.floor(Math.random() * 3)], cog));
    for (let i = 0; i < 10; i++) chars.push(createCharacter('fisher'));
    for (let i = 0; i < 10; i++) chars.push(createCharacter('diver'));
    saveAll(chars);
    return chars;
  }

  // ── 스쿼드 (폐기 — 하위호환용) ──────────────────────────────────
  function loadSquad() {
    try {
      const r = localStorage.getItem(SQUAD_KEY);
      if (!r) return Array(10).fill(null).map(() => []);
      const raw = JSON.parse(r);
      return Array(10).fill(null).map((_, i) => {
        const v = raw[i];
        return !v ? [] : Array.isArray(v) ? v : [v];
      });
    } catch { return Array(10).fill(null).map(() => []); }
  }

  function saveSquad(grid) {
    localStorage.setItem(SQUAD_KEY, JSON.stringify(
      grid.map(v => Array.isArray(v) ? v : [v])
    ));
  }

  // ── 파티 (탐사 진입 전 편성) ─────────────────────────────────────
  const PARTY_KEY = 'nr_party';

  function saveParty(charIds) {
    localStorage.setItem(PARTY_KEY, JSON.stringify(charIds || []));
  }

  function loadParty() {
    try {
      const r = localStorage.getItem(PARTY_KEY);
      return r ? JSON.parse(r) : [];
    } catch { return []; }
  }

  // ── 기록칩 ───────────────────────────────────────────────────────
  const RECORD_KEY = 'nr_record_chips';

  function loadRecordChips() {
    try {
      const r = localStorage.getItem(RECORD_KEY);
      return r ? JSON.parse(r) : {};
    } catch { return {}; }
  }

  function getRecordChip(spriteKey) {
    return loadRecordChips()[spriteKey] || null;
  }

  function updateRecordChip(spriteKey, delta) {
    const chips = loadRecordChips();
    if (!chips[spriteKey]) chips[spriteKey] = {
      expeditions: 0, kills: 0, deaths: 0,
      highestRegion: '', highestCog: 0,
      veteran: false, firstDay: 0, deathLog: [],
    };
    const c = chips[spriteKey];
    if (delta.expeditions)   c.expeditions += delta.expeditions;
    if (delta.kills)         c.kills       += delta.kills;
    if (delta.highestRegion && delta.highestRegion > c.highestRegion)
      c.highestRegion = delta.highestRegion;
    if (delta.highestCog && delta.highestCog > c.highestCog)
      c.highestCog = delta.highestCog;
    if (c.expeditions >= 10 && !c.veteran) c.veteran = true;
    localStorage.setItem(RECORD_KEY, JSON.stringify(chips));
    return c;
  }

  function recordDeath(spriteKey, { day, cog, round, killedBy }) {
    const chips = loadRecordChips();
    if (!chips[spriteKey]) chips[spriteKey] = {
      expeditions: 0, kills: 0, deaths: 0,
      highestRegion: '', highestCog: 0,
      veteran: false, firstDay: 0, deathLog: [],
    };
    const c = chips[spriteKey];
    c.deaths += 1;
    c.deathLog.unshift({ death: c.deaths, day, cog, round, killedBy });
    localStorage.setItem(RECORD_KEY, JSON.stringify(chips));
    return c;
  }

  function recordFirstDay(spriteKey, day) {
    const chips = loadRecordChips();
    if (!chips[spriteKey]) chips[spriteKey] = {
      expeditions: 0, kills: 0, deaths: 0,
      highestRegion: '', highestCog: 0,
      veteran: false, firstDay: 0, deathLog: [],
    };
    if (!chips[spriteKey].firstDay) chips[spriteKey].firstDay = day;
    localStorage.setItem(RECORD_KEY, JSON.stringify(chips));
  }

  // ── 공개 API ─────────────────────────────────────────────────────
  return {
    initIfEmpty,
    loadAll, saveAll,
    createCharacter, createCharacterOfCog,
    addCharacter, removeCharacter, updateCharacter,
    loadSquad, saveSquad,           // 폐기 예정 — 하위호환용
    saveParty, loadParty,
    getRecordChip, updateRecordChip, recordDeath, recordFirstDay,
    calcCog, getCogColor, COG_COLORS,
    SKILL_POOL, JOB_LABEL,
    STAT_COLORS, STAT_LABEL_MAP,
    getPositionPool:  _getPositionPool,
    getPassivePool:   _getPassivePool,
    getEffectiveStat,
    getEffectiveStats,
    gainMastery,
    spendStat,
  };

})();
