// ================================================================
//  SaveManager.js
//  경로: Games/Codes/Managers/SaveManager.js
//
//  역할: 게임 세이브 데이터 관리 (localStorage 기반)
//
//  저장 키 구조:
//    project001_save     — 게임 진행 데이터
//    project001_settings — 설정 데이터 (폰트 등)
// ================================================================

const SaveManager = {
  SAVE_KEY:     'project001_save',
  SETTINGS_KEY: 'project001_settings',

  // ── 게임 데이터 ───────────────────────────────────────────────
  hasSave()    { return localStorage.getItem(this.SAVE_KEY) !== null; },
  save(data)   { localStorage.setItem(this.SAVE_KEY, JSON.stringify(data)); },
  load()       { const r = localStorage.getItem(this.SAVE_KEY); return r ? JSON.parse(r) : null; },
  deleteSave() { localStorage.removeItem(this.SAVE_KEY); },

  // ── 설정 데이터 ───────────────────────────────────────────────
  saveSettings(patch) {
    const cur  = this.loadSettings();
    const next = Object.assign({}, cur, patch);
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(next));
  },
  loadSettings() {
    const r = localStorage.getItem(this.SETTINGS_KEY);
    return r ? JSON.parse(r) : {};
  },
  deleteSettings() { localStorage.removeItem(this.SETTINGS_KEY); },

  // ── 전체 초기화 ───────────────────────────────────────────────
  deleteAll() {
    this.deleteSave();
    this.deleteSettings();
    localStorage.removeItem('settings_font');
  },
};
