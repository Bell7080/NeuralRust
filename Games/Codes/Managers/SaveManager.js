// ================================================================
//  SaveManager.js
//  경로: Games/Codes/Managers/SaveManager.js
//
//  역할: 게임 세이브 데이터 관리 (localStorage 기반)
//
//  저장 키 구조:
//    neural_rust_save     — 게임 진행 데이터 (런, 인게임 상태)
//    neural_rust_settings — 설정 데이터 (폰트 등)
//    neural_rust_story    — 스토리 진행 데이터 (플래그, 로그, 로어)
//
//  TODO(Electron):
//    localStorage → fs.readFileSync / fs.writeFileSync 교체
//    _read() / _write() 두 함수만 수정하면 전체 반영됨
// ================================================================

const STORY_SAVE_DEFAULT = {
  progress: {
    day:   1,
    phase: 'start',
  },
  flags: {},
  log: [],
  unlockedLore: [],
  readLore: [],
};

const SaveManager = {

  SAVE_KEY:     'neural_rust_save',
  SETTINGS_KEY: 'neural_rust_settings',
  STORY_KEY:    'neural_rust_story',

  _read(key, fallback) {
    try {
      const r = localStorage.getItem(key);
      return r ? JSON.parse(r) : fallback;
    } catch (e) {
      console.warn(`[SaveManager] 읽기 실패: ${key}`, e);
      return fallback;
    }
  },

  _write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`[SaveManager] 쓰기 실패: ${key}`, e);
    }
  },

  // ── 게임 데이터 ───────────────────────────────────────────────
  hasSave()    { return localStorage.getItem(this.SAVE_KEY) !== null; },
  save(data)   { this._write(this.SAVE_KEY, data); },
  load()       { return this._read(this.SAVE_KEY, null); },
  deleteSave() { localStorage.removeItem(this.SAVE_KEY); },

  // 새 게임 시작 시 호출 — 기본 인게임 데이터 초기화
  // arc: 999999 는 테스트용. 정식 빌드 시 0 으로 변경
  newGame() {
    const data = {
      arc: 999999,
      day: 1,
      recruitPrice_fisher: 5,
      recruitPrice_diver:  5,
    };
    this._write(this.SAVE_KEY, data);
    return data;
  },

  // ── 현재 진행 씬 저장/로드 ───────────────────────────────────
  // 로비 "돌아가기" 시 중단된 씬으로 바로 복귀하기 위해 사용
  // sceneKey: 'AtelierScene' | 'DiveScene' | 'BattleScene' 등
  // sceneData: 해당 씬 init()에 전달할 데이터 (라운드, cogMax 등)
  saveCurrentScene(sceneKey, sceneData) {
    const d = this.load() || {};
    d._currentScene     = sceneKey;
    d._currentSceneData = sceneData || {};
    this._write(this.SAVE_KEY, d);
  },

  loadCurrentScene() {
    const d = this.load();
    if (!d) return null;
    return {
      scene: d._currentScene     || 'AtelierScene',
      data:  d._currentSceneData || {},
    };
  },

  // ── 게임 진행 전체 초기화 (설정·기록칩 유지) ─────────────────
  // 새로하기에서 호출 — 인게임 데이터만 삭제, 설정/기록칩은 남김
  newGameFull() {
    this.deleteSave();
    this.deleteStory();
    localStorage.removeItem('nr_characters');
    localStorage.removeItem('nr_party');
    localStorage.removeItem('nr_gone_sprites');
    localStorage.removeItem('nr_squad');
    return this.newGame();
  },


  // arc 단독 읽기 / 쓰기 (HUD, Tab_Recruit 등에서 사용)
  getArc() {
    const d = this.load();
    return d ? (d.arc ?? 0) : 0;
  },
  setArc(value) {
    const d = this.load() || {};
    d.arc = value;
    this._write(this.SAVE_KEY, d);
  },
  // arc 차감 — 잔액 부족 시 false 반환
  // 탐사 출발 비용: 파티 캐릭터 cog 합산 (추후 음식 시스템 개발 후 대체 예정)
  spendArc(amount) {
    const current = this.getArc();
    if (current < amount) return false;
    this.setArc(current - amount);
    return true;
  },

  // ── 설정 데이터 ───────────────────────────────────────────────
  saveSettings(patch) {
    const next = Object.assign({}, this.loadSettings(), patch);
    this._write(this.SETTINGS_KEY, next);
  },
  loadSettings() { return this._read(this.SETTINGS_KEY, {}); },
  deleteSettings() { localStorage.removeItem(this.SETTINGS_KEY); },

  // ── 스토리 데이터 ─────────────────────────────────────────────
  loadStory() {
    const saved = this._read(this.STORY_KEY, null);
    if (!saved) return JSON.parse(JSON.stringify(STORY_SAVE_DEFAULT));
    return Object.assign({}, JSON.parse(JSON.stringify(STORY_SAVE_DEFAULT)), saved);
  },

  _saveStory(data) {
    this._write(this.STORY_KEY, data);
  },

  setProgress(day, phase) {
    const s = this.loadStory();
    s.progress = { day, phase };
    this._saveStory(s);
  },

  getProgress() {
    return this.loadStory().progress;
  },

  setFlag(key, value) {
    const s = this.loadStory();
    s.flags[key] = value;
    this._saveStory(s);
  },

  getFlag(key) {
    return this.loadStory().flags[key] ?? false;
  },

  setFlags(patch) {
    const s = this.loadStory();
    Object.assign(s.flags, patch);
    this._saveStory(s);
  },

  checkFlags(keys) {
    const flags = this.loadStory().flags;
    return keys.every(k => !!flags[k]);
  },

  checkAnyFlag(keys) {
    const flags = this.loadStory().flags;
    return keys.some(k => !!flags[k]);
  },

  addLog(eventId) {
    const s = this.loadStory();
    if (!s.log.includes(eventId)) s.log.push(eventId);
    this._saveStory(s);
  },

  hasEvent(eventId) {
    return this.loadStory().log.includes(eventId);
  },

  happenedBefore(eventId, otherEventId) {
    const log = this.loadStory().log;
    return log.indexOf(eventId) < log.indexOf(otherEventId);
  },

  unlockLore(loreId) {
    const s = this.loadStory();
    if (!s.unlockedLore.includes(loreId)) s.unlockedLore.push(loreId);
    this._saveStory(s);
  },

  isLoreUnlocked(loreId) {
    return this.loadStory().unlockedLore.includes(loreId);
  },

  markLoreRead(loreId) {
    const s = this.loadStory();
    if (!s.readLore.includes(loreId)) s.readLore.push(loreId);
    this._saveStory(s);
  },

  getUnreadLore() {
    const s = this.loadStory();
    return s.unlockedLore.filter(id => !s.readLore.includes(id));
  },

  deleteStory() {
    localStorage.removeItem(this.STORY_KEY);
  },

  // ── 전체 초기화 ───────────────────────────────────────────────
  deleteAll() {
    this.deleteSave();
    this.deleteSettings();
    this.deleteStory();
    localStorage.removeItem('settings_font');
    localStorage.removeItem('neural_rust_keybinds');
    localStorage.removeItem('neural_rust_audio');
    // 캐릭터 & 탐사대·파티·gone 데이터도 초기화
    localStorage.removeItem('nr_characters');
    localStorage.removeItem('nr_squad');
    localStorage.removeItem('nr_party');
    localStorage.removeItem('nr_gone_sprites');
    // 구버전 키 정리
    localStorage.removeItem('project001_keybinds');
    localStorage.removeItem('project001_save');
    localStorage.removeItem('project001_settings');
    localStorage.removeItem('project001_story');
  },
};
