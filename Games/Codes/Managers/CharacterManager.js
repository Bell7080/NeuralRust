// ================================================================
//  CharacterManager.js
//  경로: Games/Codes/Managers/CharacterManager.js
//
//  [로드 순서 — HTML]
//    1. Games/Codes/Data/CharacterNames.js
//    2. Games/Codes/Data/JobData.js
//    3. Games/Codes/Data/PositionData.js   ← 신규 (구 PassiveData 공격범위)
//    4. Games/Codes/Data/PassiveData.js    ← 패시브 특성 (내용 변경)
//    5. Games/Codes/Data/SkillData.js
//    6. Games/Codes/Managers/CharacterManager.js
// ================================================================

const CharacterManager = (() => {

  // ── 이름 풀 ──────────────────────────────────────────────────────
  function _getNamePool() {
    return (typeof CHARACTER_NAMES !== 'undefined' && CHARACTER_NAMES.length > 0)
      ? CHARACTER_NAMES
      : ['볼트','기어','러스트','뎁스','아크','스팀','드릴','앵커',
         '크롬','스크랩','파이퍼','드리프터','글리치','넥서스','타이드',
         '코그','플럭스','스파크','베인','어비스'];
  }

  function _getJobLabel(jobId) {
    if (typeof JOB_DATA !== 'undefined' && JOB_DATA[jobId]) {
      return JOB_DATA[jobId].label;
    }
    const fallback = { fisher: '낚시꾼', diver: '잠수부', ai: 'A.I' };
    return fallback[jobId] || jobId;
  }

  const JOB_LABEL = { fisher: '낚시꾼', diver: '잠수부', ai: 'A.I' };
  const JOBS      = ['fisher', 'diver', 'ai'];

  // ── Cog 계산 ─────────────────────────────────────────────────────
  function calcCog(s) {
    if (s <=  25) return 1;
    if (s <=  44) return 2;
    if (s <=  63) return 3;
    if (s <=  82) return 4;
    if (s <= 100) return 5;
    if (s <= 133) return 6;
    if (s <= 166) return 7;
    if (s <= 200) return 8;
    if (s <= 250) return 9;
    return 10;
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
    9:  { css: '#ff2255', phaser: 0xff2255, glow: 0x000000, label: '#ff2255', border: 0x000000, special: true },
    10: { css: '#cc44ff', phaser: 0xcc44ff, glow: 0x000000, label: '#cc44ff',
          gradStart: 0x330066, gradEnd: 0x000000, special: true },
  };

  function getCogColor(cog) {
    return COG_COLORS[cog] || COG_COLORS[1];
  }

  // ── 어빌리티 풀 ──────────────────────────────────────────────────
  // PositionData.js / PassiveData.js에 POSITION_POOL / PASSIVE_POOL이
  // 정의되어 있으면 그것을 사용, 없으면 내부 폴백 사용

  const _POSITION_POOL_FALLBACK = {
    1:  ['윗칸 타격', '앞칸 타격'],
    2:  ['앞칸 타격', '현재 칸 타격'],
    3:  ['현재 칸 타격', '대각 타격'],
    4:  ['대각 타격', '윗칸 타격'],
    5:  ['전열 전체 타격', '후열 타격'],
    6:  ['전열 전체 타격', '현재 칸 타격'],
    7:  ['전/후열 동시 타격', '후열 타격'],
    8:  ['전/후열 동시 타격', '전열 전체 타격'],
    9:  ['전체 칸 타격', '전/후열 동시 타격'],
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

  const SKILL_POOL = {
    1:  ['기본 일격', '빠른 찌르기'],
    2:  ['연속 타격', '방어 자세'],
    3:  ['강타', '회피 기동'],
    4:  ['독 도포', '광역 타격'],
    5:  ['강화 독', '순간 가속'],
    6:  ['폭발 타격', '전방 스캔'],
    7:  ['철갑 관통', '심해 압박'],
    8:  ['전기 충격', '철벽 방어'],
    9:  ['코어 오버로드', '심연의 포효'],
    10: ['코어 오버로드', '심연의 포효'],
  };

  function _getPositionPool(cog) {
    const pool = (typeof POSITION_POOL !== 'undefined') ? POSITION_POOL : _POSITION_POOL_FALLBACK;
    return pool[cog] || pool[1];
  }

  function _getPassivePool(cog) {
    const pool = (typeof PASSIVE_POOL !== 'undefined') ? PASSIVE_POOL : _PASSIVE_POOL_FALLBACK;
    return pool[cog] || pool[1];
  }

  // ── 풀 유효성 검증 ───────────────────────────────────────────────
  function _validatePools() {
    if (typeof POSITION_DATA !== 'undefined') {
      Object.values(_POSITION_POOL_FALLBACK).flat().forEach(name => {
        if (!POSITION_DATA[name])
          console.warn(`[CharacterManager] PositionData 누락: "${name}"`);
      });
    }
    if (typeof PASSIVE_DATA !== 'undefined') {
      Object.values(_PASSIVE_POOL_FALLBACK).flat().forEach(name => {
        if (!PASSIVE_DATA[name])
          console.warn(`[CharacterManager] PassiveData 누락: "${name}"`);
      });
    }
    if (typeof SKILL_DATA !== 'undefined') {
      Object.values(SKILL_POOL).flat().forEach(name => {
        if (!SKILL_DATA[name])
          console.warn(`[CharacterManager] SkillData 누락: "${name}"`);
      });
    }
  }

  // ── 유틸 ─────────────────────────────────────────────────────────
  function _pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  const SPRITE_COUNT = 72;
  function _randSpriteKey() {
    return `char_${String(Math.floor(Math.random() * SPRITE_COUNT)).padStart(3, '0')}`;
  }

  // 스탯 랜덤 생성 (총합 랜덤, 제한 없는 극단 분배 허용)
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

  // 지정 스탯합으로 스탯 분배 (극단 특화 허용)
  function _randStatsBySum(total) {
    const mins = [1, 0, 1, 5, 0];
    const keys = ['hp', 'health', 'attack', 'agility', 'luck'];
    const rem  = Math.max(0, total - mins.reduce((a, b) => a + b, 0));
    const b    = [0, 0, 0, 0, 0];
    for (let i = 0; i < rem; i++) b[Math.floor(Math.random() * 5)]++;
    const result = {};
    keys.forEach((k, i) => { result[k] = mins[i] + b[i]; });
    return result;
  }

  const COG_STAT_RANGE = {
    1:  { min:   7, max:  25 },
    2:  { min:  26, max:  44 },
    3:  { min:  45, max:  63 },
    4:  { min:  64, max:  82 },
    5:  { min:  83, max: 100 },
    6:  { min: 101, max: 133 },
    7:  { min: 134, max: 166 },
    8:  { min: 167, max: 200 },
    9:  { min: 201, max: 250 },
    10: { min: 251, max: 300 },
  };

  // ── 캐릭터 생성 ──────────────────────────────────────────────────
  function createCharacter(job) {
    const stats   = _randStats();
    const statSum = Object.values(stats).reduce((a, v) => a + v, 0);
    const cog     = calcCog(statSum);
    return {
      id:        `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name:      _pick(_getNamePool()),
      age:       16 + Math.floor(Math.random() * 10),
      job,
      jobLabel:  _getJobLabel(job),
      stats,
      statSum,
      cog,
      position:  _pick(_getPositionPool(cog)),   // ← 신규
      passive:   _pick(_getPassivePool(cog)),    // ← 분리된 패시브
      skill:     _pick(SKILL_POOL[cog] || SKILL_POOL[1]),
      overclock: null,                            // ← 신규 (가챠 외 생성은 null)
      currentHp: stats.hp * 10,
      maxHp:     stats.hp * 10,
      spriteKey: _randSpriteKey(),
    };
  }

  function createCharacterOfCog(job, cog) {
    const range   = COG_STAT_RANGE[cog] || COG_STAT_RANGE[1];
    const statSum = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    const stats   = _randStatsBySum(statSum);
    return {
      id:        `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name:      _pick(_getNamePool()),
      age:       16 + Math.floor(Math.random() * 10),
      job,
      jobLabel:  _getJobLabel(job),
      stats,
      statSum,
      cog,
      position:  _pick(_getPositionPool(cog)),
      passive:   _pick(_getPassivePool(cog)),
      skill:     _pick(SKILL_POOL[cog] || SKILL_POOL[1]),
      overclock: null,
      currentHp: stats.hp * 10,
      maxHp:     stats.hp * 10,
      spriteKey: _randSpriteKey(),
    };
  }

  // ── 스토리지 ─────────────────────────────────────────────────────
  const KEY       = 'nr_characters';
  const SQUAD_KEY = 'nr_squad';

  function saveAll(chars) { localStorage.setItem(KEY, JSON.stringify(chars)); }

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
    const chars = (loadAll() || []).filter(c => c.id !== id);
    saveAll(chars);
    const squad   = loadSquad();
    const cleaned = squad.map(slot => slot.filter(sid => sid !== id));
    saveSquad(cleaned);
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
      ex.forEach(c => {
        // spriteKey 범위 재할당
        const idx = parseInt((c.spriteKey || '').replace('char_', ''), 10);
        if (!c.spriteKey || isNaN(idx) || idx >= SPRITE_COUNT) {
          c.spriteKey = _randSpriteKey(); dirty = true;
        }
        // jobLabel 최신화
        const freshLabel = _getJobLabel(c.job);
        if (c.jobLabel !== freshLabel) { c.jobLabel = freshLabel; dirty = true; }
        // cog 재계산
        const freshCog = calcCog(c.statSum || 0);
        if (c.cog !== freshCog) { c.cog = freshCog; dirty = true; }
        // 구버전 마이그레이션: position 필드 없으면 추가
        if (!c.position) {
          c.position = _pick(_getPositionPool(c.cog));
          dirty = true;
        }
        // 구버전 마이그레이션: overclock 필드 없으면 null 추가
        if (c.overclock === undefined) {
          c.overclock = null;
          dirty = true;
        }
        // 구버전 마이그레이션: passive가 공격범위 이름이면 새 패시브로 교체
        const oldPositionNames = [
          '윗칸 타격','앞칸 타격','현재 칸 타격','대각 타격',
          '전열 전체 타격','후열 타격','전/후열 동시 타격','전체 칸 타격'
        ];
        if (oldPositionNames.includes(c.passive)) {
          // 기존 passive 값을 position으로 이동
          if (!c.position) c.position = c.passive;
          c.passive = _pick(_getPassivePool(c.cog));
          dirty = true;
        }
      });
      if (dirty) saveAll(ex);
      return ex;
    }

    // 최초 실행 — 30명 생성
    const chars = [];
    const startJobs = ['fisher', 'diver', 'ai'];
    for (let cog = 1; cog <= 10; cog++) {
      const job = startJobs[Math.floor(Math.random() * startJobs.length)];
      chars.push(createCharacterOfCog(job, cog));
    }
    for (let i = 0; i < 10; i++) chars.push(createCharacter('fisher'));
    for (let i = 0; i < 10; i++) chars.push(createCharacter('diver'));
    saveAll(chars);
    return chars;
  }

  // ── 스쿼드 ───────────────────────────────────────────────────────
  function loadSquad() {
    try {
      const r = localStorage.getItem(SQUAD_KEY);
      if (!r) return Array(10).fill(null).map(() => []);
      const raw = JSON.parse(r);
      return Array(10).fill(null).map((_, i) => {
        const v = raw[i];
        if (!v) return [];
        if (Array.isArray(v)) return v.filter(Boolean);
        return [v];
      });
    } catch {
      return Array(10).fill(null).map(() => []);
    }
  }

  function saveSquad(s) {
    const normalized = Array(10).fill(null).map((_, i) => {
      const v = s[i];
      if (!v) return [];
      if (Array.isArray(v)) return v;
      return [v];
    });
    localStorage.setItem(SQUAD_KEY, JSON.stringify(normalized));
  }

  // ── 공개 API ─────────────────────────────────────────────────────
  return {
    initIfEmpty,
    loadAll,
    saveAll,
    createCharacter,
    createCharacterOfCog,
    addCharacter,
    removeCharacter,
    updateCharacter,
    loadSquad,
    saveSquad,
    calcCog,
    getCogColor,
    COG_COLORS,
    SKILL_POOL,
    JOB_LABEL,
    // 외부 참조용 풀 접근자
    getPositionPool: _getPositionPool,
    getPassivePool:  _getPassivePool,
  };

})();
