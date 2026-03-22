// ================================================================
//  CharacterManager.js
//  경로: Games/Codes/Managers/CharacterManager.js
//
//  [로드 순서 — HTML]
//    1. Games/Codes/Data/CharacterNames.js
//    2. Games/Codes/Data/Data_Jobs.js
//    3. Games/Codes/Data/Data_Overclock.js
//    4. Games/Codes/Data/Passives/Common.js ~ Helmsman.js
//    5. Games/Codes/Data/Actions/Common.js  ~ Helmsman.js
//    6. Games/Codes/Data/Enhanced/Common.js ~ Helmsman.js
//    7. Games/Codes/Data/Finales/Common.js  ~ Named.js
//    8. Games/Codes/Data/AbilityIndex.js
//    9. Games/Codes/Managers/CharacterManager.js
//
//  ── 능력 슬롯 4종 ────────────────────────────────────────────
//    char.passive   : 상시 패시브 (조건 없음)
//    char.action    : 일반 행동  (매 사이클 자동)
//    char.enhanced  : 강화 행동  (조건부 자동)
//    char.finale    : 피날레     (게이지 MAX + 수동 클릭)
//
//  ── 직업 3종 ─────────────────────────────────────────────────
//    fisher    낚시꾼  — 공격 특화
//    diver     잠수부  — 방어/생존 특화
//    helmsman  조타수  — 유틸/지원 특화
//
//  ── 숙련도(Mastery) 시스템 ───────────────────────────────────
//    char.mastery       : 누적 숙련도 레벨 (무제한, 기본 0)
//    char.pendingStats  : 미배분 잔여 스탯 포인트 (기본 0)
//
//  ── 오버클럭(Overclock) 적용 순서 ────────────────────────────
//    char.stats[key] = 순수 기본값 (보정 없음, 절대 변경 금지)
//    getEffectiveStat(char, key) = 기본 + 오버클럭 + 아이템 + 기록칩
// ================================================================

const CharacterManager = (() => {

  // ── 스탯 색상 ────────────────────────────────────────────────────
  const STAT_COLORS = {
    hp:      '#ff88bb',
    health:  '#88ddaa',
    attack:  '#ff3333',
    agility: '#55ccff',
    luck:    '#ddcc44',
  };

  const STAT_LABEL_MAP = {
    hp: '체력', health: '건강', attack: '공격', agility: '민첩', luck: '행운',
  };

  // ── 이름 풀 ──────────────────────────────────────────────────────
  function _getNamePool() {
    return (typeof CHARACTER_NAMES !== 'undefined' && CHARACTER_NAMES.length > 0)
      ? CHARACTER_NAMES
      : ['볼트','기어','러스트','뎁스','아크','스팀','드릴','앵커',
         '크롬','스크랩','파이퍼','드리프터','글리치','넥서스','타이드',
         '코그','플럭스','스파크','베인','어비스'];
  }

  function _getJobLabel(jobId) {
    if (typeof JOB_DATA !== 'undefined' && JOB_DATA[jobId])
      return JOB_DATA[jobId].label;
    return ({ fisher: '낚시꾼', diver: '잠수부', helmsman: '조타수' })[jobId] || jobId;
  }

  const JOB_LABEL = { fisher: '낚시꾼', diver: '잠수부', helmsman: '조타수' };

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
    9:  { css: '#ff2255', phaser: 0xff2255, glow: 0x000000, label: '#ff2255', border: 0x000000, special: true },
    10: { css: '#cc44ff', phaser: 0xcc44ff, glow: 0x000000, label: '#cc44ff', gradStart: 0x330066, gradEnd: 0x000000, special: true },
  };

  function getCogColor(cog) { return COG_COLORS[cog] || COG_COLORS[1]; }

  // ── 능력 풀 헬퍼 ─────────────────────────────────────────────────
  //  AbilityIndex 로드 여부에 따라 분기
  //  미로드 시 최소 폴백으로 작동

  const _FALLBACK_PASSIVE  = { 1:['tough_body','sharp_sense'], 2:['lucky','fast_regen'], 3:['fighting_spirit','focus'], 4:['poison_resist','focus'], 5:['aqua_adapt','fighting_spirit'], 6:['aqua_adapt','fast_regen'], 7:['unyielding','aqua_adapt'], 8:['unyielding','fighting_spirit'], 9:['absolute_will','unyielding'], 10:['absolute_will'] };
  const _FALLBACK_ACTION   = { 1:['strike'], 2:['strike'], 3:['rapid_strike','strike'], 4:['rapid_strike'], 5:['heavy_strike','rapid_strike'], 6:['heavy_strike'], 7:['wide_strike','heavy_strike'], 8:['wide_strike'], 9:['wide_strike'], 10:['wide_strike'] };
  const _FALLBACK_ENHANCED = { 1:['combo_hit'], 2:['combo_hit'], 3:['combo_hit','evasion'], 4:['burst_speed','combo_hit'], 5:['burst_speed'], 6:['iron_wall','burst_speed'], 7:['abyss_roar','iron_wall'], 8:['abyss_roar'], 9:['abyss_roar'], 10:['abyss_roar'] };
  const _FALLBACK_FINALE   = { 1:['quick_stab'], 2:['guard_stance','quick_stab'], 3:['heavy_blow','guard_stance'], 4:['aoe_strike','heavy_blow'], 5:['explosion_hit','aoe_strike'], 6:['explosion_hit'], 7:['core_overload','explosion_hit'], 8:['core_overload'], 9:['core_overload'], 10:['core_overload'] };

  function _getAbilityPool(type, job, cog) {
    if (typeof AbilityIndex !== 'undefined') {
      const pool = AbilityIndex.getPool(type, job, cog);
      if (pool && pool.length > 0) return pool;
    }
    // 폴백
    const fb = ({ passive: _FALLBACK_PASSIVE, action: _FALLBACK_ACTION, enhanced: _FALLBACK_ENHANCED, finale: _FALLBACK_FINALE })[type];
    return fb?.[cog] || fb?.[1] || [];
  }

  // ── 유틸 ─────────────────────────────────────────────────────────
  function _pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  const SPRITE_COUNT = 72;

  // ── gone 블랙리스트 ───────────────────────────────────────────────
  const GONE_KEY = 'nr_gone_sprites';

  function loadGoneSprites() {
    try { return new Set(JSON.parse(localStorage.getItem(GONE_KEY) || '[]')); }
    catch { return new Set(); }
  }
  function addGoneSprite(spriteKey) {
    const s = loadGoneSprites(); s.add(spriteKey);
    localStorage.setItem(GONE_KEY, JSON.stringify([...s]));
  }
  function clearGoneSprites() { localStorage.removeItem(GONE_KEY); }

  // ── 중복 없는 spriteKey ──────────────────────────────────────────
  function _uniqueSpriteKey(extraExclude) {
    const used    = new Set((loadAll() || []).map(c => c.spriteKey).filter(Boolean));
    const gone    = loadGoneSprites();
    const exclude = new Set([...used, ...gone, ...(extraExclude || [])]);
    const available = [];
    for (let i = 0; i < SPRITE_COUNT; i++) {
      const k = `char_${String(i).padStart(3, '0')}`;
      if (!exclude.has(k)) available.push(k);
    }
    if (available.length) return available[Math.floor(Math.random() * available.length)];
    const fallback = [];
    for (let i = 0; i < SPRITE_COUNT; i++) {
      const k = `char_${String(i).padStart(3, '0')}`;
      if (!gone.has(k)) fallback.push(k);
    }
    if (fallback.length) return fallback[Math.floor(Math.random() * fallback.length)];
    return `char_${String(Math.floor(Math.random() * SPRITE_COUNT)).padStart(3, '0')}`;
  }

  // ── 스탯 생성 ────────────────────────────────────────────────────
  function _randStats() {
    const total  = 10 + Math.floor(Math.random() * 41);
    const mins   = [1, 0, 1, 5, 0];
    const remain = Math.max(0, total - mins.reduce((a, b) => a + b, 0));
    const b      = [0, 0, 0, 0, 0];
    for (let i = 0; i < remain; i++) b[Math.floor(Math.random() * 5)]++;
    return {
      hp:      Math.floor(mins[0]+b[0]),
      health:  Math.floor(mins[1]+b[1]),
      attack:  Math.floor(mins[2]+b[2]),
      agility: Math.floor(mins[3]+b[3]),
      luck:    Math.floor(mins[4]+b[4]),
    };
  }

  function _randStatsBySum(total) {
    const mins = [1, 0, 1, 5, 0];
    const keys = ['hp','health','attack','agility','luck'];
    const rem  = Math.max(0, total - mins.reduce((a, b) => a + b, 0));
    const b    = [0, 0, 0, 0, 0];
    for (let i = 0; i < rem; i++) b[Math.floor(Math.random() * 5)]++;
    const r = {};
    keys.forEach((k, i) => { r[k] = Math.floor(mins[i] + b[i]); });
    return r;
  }

  const COG_STAT_RANGE = {
    1:{min:7,max:25},   2:{min:26,max:44},  3:{min:45,max:63},
    4:{min:64,max:82},  5:{min:83,max:100}, 6:{min:101,max:133},
    7:{min:134,max:166},8:{min:167,max:200},9:{min:201,max:250},
    10:{min:251,max:300},
  };

  // ════════════════════════════════════════════════════════════════
  //  스탯 최종값 계산
  // ════════════════════════════════════════════════════════════════
  function getEffectiveStat(char, key) {
    const base        = char.stats[key] ?? 0;
    const ocBonus     = (char.overclock && char.overclock.statKey === key)
      ? Math.floor(base * char.overclock.bonus) : 0;
    const itemBonus   = char.itemBonuses?.[key]   ?? 0;
    const recordBonus = char.recordBonuses?.[key] ?? 0;
    return base + ocBonus + itemBonus + recordBonus;
  }

  function getEffectiveStats(char) {
    const keys = ['hp', 'health', 'attack', 'agility', 'luck'];
    const r = {};
    keys.forEach(k => { r[k] = getEffectiveStat(char, k); });
    return r;
  }

  function getStatBreakdown(char, key) {
    const base        = char.stats[key] ?? 0;
    const ocBonus     = (char.overclock && char.overclock.statKey === key)
      ? Math.floor(base * char.overclock.bonus) : 0;
    const itemBonus   = char.itemBonuses?.[key]   ?? 0;
    const recordBonus = char.recordBonuses?.[key] ?? 0;
    return { base, overclock: ocBonus, item: itemBonus, record: recordBonus, total: base + ocBonus + itemBonus + recordBonus };
  }

  // ════════════════════════════════════════════════════════════════
  //  숙련도(Mastery)
  // ════════════════════════════════════════════════════════════════
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
      char.maxHp     = (char.maxHp     || 0) + 5;
      char.currentHp = Math.min((char.currentHp || 0) + 5, char.maxHp);
    }
    char.statSum = Object.values(char.stats).reduce((a, v) => a + v, 0);
    updateCharacter(char);
    return true;
  }

  // ── 오버클럭 롤 ──────────────────────────────────────────────────
  function _rollInitialOverclock() {
    if (typeof OVERCLOCK_POOL === 'undefined' || !Array.isArray(OVERCLOCK_POOL)) return null;
    if (Math.random() >= 0.50) return null;
    return OVERCLOCK_POOL[Math.floor(Math.random() * OVERCLOCK_POOL.length)];
  }

  // ════════════════════════════════════════════════════════════════
  //  캐릭터 생성
  //  · position 필드 없음 (4슬롯: passive / action / enhanced / finale)
  //  · job: 'fisher' | 'diver' | 'helmsman'
  // ════════════════════════════════════════════════════════════════
  function createCharacter(job) {
    const stats   = _randStats();
    const statSum = Object.values(stats).reduce((a, v) => a + v, 0);
    const cog     = calcCog(statSum);
    return {
      id:           `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
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
      spriteKey:    _uniqueSpriteKey(),
    };
  }

  function createCharacterOfCog(job, cog) {
    const range   = COG_STAT_RANGE[cog] || COG_STAT_RANGE[1];
    const statSum = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    const stats   = _randStatsBySum(statSum);
    return {
      id:           `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
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
      spriteKey:    _uniqueSpriteKey(),
    };
  }

  // ── 스토리지 ─────────────────────────────────────────────────────
  const KEY       = 'nr_characters';
  const SQUAD_KEY = 'nr_squad';

  function saveAll(chars)  { localStorage.setItem(KEY, JSON.stringify(chars)); }
  function loadAll() {
    try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }
  function addCharacter(char) { const chars = loadAll() || []; chars.push(char); saveAll(chars); }
  function removeCharacter(id) {
    saveAll((loadAll() || []).filter(c => c.id !== id));
    saveSquad(loadSquad().map(s => s.filter(x => x !== id)));
  }
  function updateCharacter(updated) {
    const chars = loadAll() || [];
    const idx   = chars.findIndex(c => c.id === updated.id);
    if (idx !== -1) { chars[idx] = updated; saveAll(chars); }
  }

  // ── 전투 사망 처리 ───────────────────────────────────────────────
  function killCharacter(char, { day, cog, round, killedBy }) {
    recordDeath(char.spriteKey, { day, cog, round, killedBy });
    // helmsman도 alive 취급 → dead_chip으로 전환
    char.status    = 'dead_chip';
    char.currentHp = 0;
    updateCharacter(char);
  }

  // ════════════════════════════════════════════════════════════════
  //  초기화 + 마이그레이션
  // ════════════════════════════════════════════════════════════════
  function initIfEmpty() {
    const ex = loadAll();

    if (ex && ex.length > 0) {
      let dirty = false;

      ex.forEach(c => {
        // ── spriteKey 검증 ────────────────────────────────────
        const idx = parseInt((c.spriteKey||'').replace('char_',''), 10);
        if (!c.spriteKey || isNaN(idx) || idx >= SPRITE_COUNT)
          { c.spriteKey = _uniqueSpriteKey(); dirty = true; }

        // ── status ────────────────────────────────────────────
        if (!c.status) { c.status = 'alive'; dirty = true; }

        // ── 직업 마이그레이션: ai → helmsman ─────────────────
        if (c.job === 'ai') {
          c.job      = 'helmsman';
          c.jobLabel = _getJobLabel('helmsman');
          dirty = true;
        } else {
          const fl = _getJobLabel(c.job);
          if (c.jobLabel !== fl) { c.jobLabel = fl; dirty = true; }
        }

        // ── Cog 재계산 ────────────────────────────────────────
        const fc = calcCog(c.statSum || 0);
        if (c.cog !== fc) { c.cog = fc; dirty = true; }

        // ── position 필드 제거 ────────────────────────────────
        if ('position' in c) { delete c.position; dirty = true; }

        // ── 4슬롯 마이그레이션 ────────────────────────────────
        // action / enhanced / finale 없으면 부여
        // skill 필드가 있으면 finale로 이전 후 제거
        if (c.skill && !c.finale) {
          c.finale = c.skill;
          dirty = true;
        }
        if ('skill' in c) { delete c.skill; dirty = true; }

        if (!c.action)   { c.action   = _pick(_getAbilityPool('action',   c.job, c.cog)); dirty = true; }
        if (!c.enhanced) { c.enhanced = _pick(_getAbilityPool('enhanced', c.job, c.cog)); dirty = true; }
        if (!c.finale)   { c.finale   = _pick(_getAbilityPool('finale',   c.job, c.cog)); dirty = true; }
        if (!c.passive)  { c.passive  = _pick(_getAbilityPool('passive',  c.job, c.cog)); dirty = true; }

        // ── 오버클럭 ──────────────────────────────────────────
        if (c.overclock === undefined || c.overclock === null) {
          c.overclock = _rollInitialOverclock();
          dirty = true;
        }

        // ── 숙련도 마이그레이션 ───────────────────────────────
        if ((c.mastery === undefined || c.mastery === 0) && !c._masteryMigrated) {
          c.mastery = Math.random() < 0.5 ? 1 + Math.floor(Math.random() * 40) : 0;
          c._masteryMigrated = true;
          c.pendingStats = c.mastery;
          dirty = true;
        }
        if (c.pendingStats === undefined) { c.pendingStats = 0; dirty = true; }

        // ── HP 스케일 마이그레이션 (×10 → ×5) ────────────────
        if (!c._hpMigrated && c.stats && c.stats.hp != null) {
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

    // ── 첫 실행: 초기 캐릭터 생성 ────────────────────────────
    const chars = [];
    const jobs  = ['fisher', 'diver', 'helmsman'];
    // Cog 1~10 각 1명
    for (let cog = 1; cog <= 10; cog++)
      chars.push(createCharacterOfCog(jobs[Math.floor(Math.random() * 3)], cog));
    // 직업별 10명씩
    for (let i = 0; i < 10; i++) chars.push(createCharacter('fisher'));
    for (let i = 0; i < 10; i++) chars.push(createCharacter('diver'));
    for (let i = 0; i < 10; i++) chars.push(createCharacter('helmsman'));
    saveAll(chars);
    return chars;
  }

  // ── 스쿼드 (폐기 — 하위호환) ─────────────────────────────────────
  function loadSquad() {
    try {
      const r = localStorage.getItem(SQUAD_KEY);
      if (!r) return Array(10).fill(null).map(() => []);
      const raw = JSON.parse(r);
      return Array(10).fill(null).map((_,i) => {
        const v = raw[i];
        return !v ? [] : Array.isArray(v) ? v.filter(Boolean) : [v];
      });
    } catch { return Array(10).fill(null).map(() => []); }
  }
  function saveSquad(s) {
    localStorage.setItem(SQUAD_KEY, JSON.stringify(
      Array(10).fill(null).map((_,i) => {
        const v = s[i]; return !v ? [] : Array.isArray(v) ? v : [v];
      })
    ));
  }

  // ── 파티 ─────────────────────────────────────────────────────────
  const PARTY_KEY = 'nr_party';
  function saveParty(charIds) { localStorage.setItem(PARTY_KEY, JSON.stringify(charIds || [])); }
  function loadParty() {
    try { const r = localStorage.getItem(PARTY_KEY); return r ? JSON.parse(r) : []; }
    catch { return []; }
  }

  // ── 기록칩 ───────────────────────────────────────────────────────
  const RECORD_KEY = 'nr_record_chips';

  function loadRecordChips() {
    try { const r = localStorage.getItem(RECORD_KEY); return r ? JSON.parse(r) : {}; }
    catch { return {}; }
  }
  function getRecordChip(spriteKey) { return loadRecordChips()[spriteKey] || null; }
  function updateRecordChip(spriteKey, delta) {
    const chips = loadRecordChips();
    if (!chips[spriteKey]) chips[spriteKey] = { expeditions:0, kills:0, deaths:0, highestRegion:'', highestCog:0, veteran:false, firstDay:0, deathLog:[] };
    const c = chips[spriteKey];
    if (delta.expeditions) c.expeditions += delta.expeditions;
    if (delta.kills)       c.kills       += delta.kills;
    if (delta.highestRegion && delta.highestRegion > c.highestRegion) c.highestRegion = delta.highestRegion;
    if (delta.highestCog   && delta.highestCog   > c.highestCog)     c.highestCog   = delta.highestCog;
    if (c.expeditions >= 10 && !c.veteran) c.veteran = true;
    localStorage.setItem(RECORD_KEY, JSON.stringify(chips));
    return c;
  }
  function recordDeath(spriteKey, { day, cog, round, killedBy }) {
    const chips = loadRecordChips();
    if (!chips[spriteKey]) chips[spriteKey] = { expeditions:0, kills:0, deaths:0, highestRegion:'', highestCog:0, veteran:false, firstDay:0, deathLog:[] };
    const c = chips[spriteKey];
    c.deaths += 1;
    c.deathLog.unshift({ death: c.deaths, day, cog, round, killedBy });
    localStorage.setItem(RECORD_KEY, JSON.stringify(chips));
    return c;
  }
  function recordFirstDay(spriteKey, day) {
    const chips = loadRecordChips();
    if (!chips[spriteKey]) chips[spriteKey] = { expeditions:0, kills:0, deaths:0, highestRegion:'', highestCog:0, veteran:false, firstDay:0, deathLog:[] };
    if (!chips[spriteKey].firstDay) chips[spriteKey].firstDay = day;
    localStorage.setItem(RECORD_KEY, JSON.stringify(chips));
  }

  // ── 공개 API ─────────────────────────────────────────────────────
  return {
    initIfEmpty,
    loadAll, saveAll,
    createCharacter, createCharacterOfCog,
    addCharacter, removeCharacter, updateCharacter,
    killCharacter,
    loadSquad, saveSquad,
    saveParty, loadParty,
    getRecordChip, updateRecordChip, recordDeath, recordFirstDay,
    loadGoneSprites, addGoneSprite, clearGoneSprites,
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

})();
