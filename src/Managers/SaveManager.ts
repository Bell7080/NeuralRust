// ================================================================
//  SaveManager.ts
//  경로: src/Managers/SaveManager.ts
//
//  역할: 게임 세이브 데이터 관리 (localStorage 기반)
//
//  저장 키 구조:
//    neural_rust_save     — 게임 진행 데이터 (런, 인게임 상태)
//    neural_rust_settings — 설정 데이터 (폰트 등)
//    neural_rust_story    — 스토리 진행 데이터 (플래그, 로그, 로어)
//
//  DONE(Electron):
//    localStorage → fs.readFileSync / fs.writeFileSync 교체
//    _read() / _write() 두 함수만 수정하면 전체 반영됨
// ================================================================

import type { GameSaveData, StorySave, StoryProgress } from '../types';

const STORY_SAVE_DEFAULT: StorySave = {
  progress: { day: 1, phase: 'start' },
  flags:    {},
  log:      [],
  unlockedLore: [],
  readLore:     [],
};

export const SaveManager = {

  SAVE_KEY:     'neural_rust_save',
  SETTINGS_KEY: 'neural_rust_settings',
  STORY_KEY:    'neural_rust_story',

  _read<T>(key: string, fallback: T): T {
    try {
      const r = localStorage.getItem(key);
      return r ? (JSON.parse(r) as T) : fallback;
    } catch (e) {
      console.warn(`[SaveManager] 읽기 실패: ${key}`, e);
      return fallback;
    }
  },

  _write(key: string, data: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`[SaveManager] 쓰기 실패: ${key}`, e);
    }
  },

  // ── 게임 데이터 ───────────────────────────────────────────────
  hasSave():    boolean         { return localStorage.getItem(this.SAVE_KEY) !== null; },
  save(data: GameSaveData):void { this._write(this.SAVE_KEY, data); },
  load():       GameSaveData | null { return this._read<GameSaveData | null>(this.SAVE_KEY, null); },
  deleteSave(): void           { localStorage.removeItem(this.SAVE_KEY); },

  newGame(): GameSaveData {
    const data: GameSaveData = {
      arc: 999999,
      day: 1,
      recruitPrice_fisher: 5,
      recruitPrice_diver:  5,
    };
    this._write(this.SAVE_KEY, data);
    return data;
  },

  saveCurrentScene(sceneKey: string, sceneData: Record<string, unknown>): void {
    const d: GameSaveData = this.load() ?? { arc: 0, day: 1 };
    d._currentScene     = sceneKey;
    d._currentSceneData = sceneData ?? {};
    this._write(this.SAVE_KEY, d);
  },

  loadCurrentScene(): { scene: string; data: Record<string, unknown> } | null {
    const d = this.load();
    if (!d) return null;
    return {
      scene: (d._currentScene as string | undefined)     ?? 'AtelierScene',
      data:  (d._currentSceneData as Record<string, unknown> | undefined) ?? {},
    };
  },

  newGameFull(): GameSaveData {
    this.deleteSave();
    this.deleteStory();
    localStorage.removeItem('nr_characters');
    localStorage.removeItem('nr_party');
    localStorage.removeItem('nr_gone_sprites');
    localStorage.removeItem('nr_squad');
    return this.newGame();
  },

  getArc(): number {
    const d = this.load();
    return d ? (d.arc ?? 0) : 0;
  },
  setArc(value: number): void {
    const d: GameSaveData = this.load() ?? { arc: 0, day: 1 };
    d.arc = value;
    this._write(this.SAVE_KEY, d);
  },
  spendArc(amount: number): boolean {
    const current = this.getArc();
    if (current < amount) return false;
    this.setArc(current - amount);
    return true;
  },

  // ── 설정 데이터 ───────────────────────────────────────────────
  saveSettings(patch: Record<string, unknown>): void {
    const next = Object.assign({}, this.loadSettings(), patch);
    this._write(this.SETTINGS_KEY, next);
  },
  loadSettings(): Record<string, unknown> { return this._read<Record<string, unknown>>(this.SETTINGS_KEY, {}); },
  deleteSettings(): void { localStorage.removeItem(this.SETTINGS_KEY); },

  // ── 스토리 데이터 ─────────────────────────────────────────────
  loadStory(): StorySave {
    const saved = this._read<StorySave | null>(this.STORY_KEY, null);
    if (!saved) return JSON.parse(JSON.stringify(STORY_SAVE_DEFAULT)) as StorySave;
    return Object.assign({}, JSON.parse(JSON.stringify(STORY_SAVE_DEFAULT)), saved) as StorySave;
  },

  _saveStory(data: StorySave): void { this._write(this.STORY_KEY, data); },

  setProgress(day: number, phase: string): void {
    const s = this.loadStory();
    s.progress = { day, phase };
    this._saveStory(s);
  },
  getProgress(): StoryProgress { return this.loadStory().progress; },

  setFlag(key: string, value: unknown): void {
    const s = this.loadStory();
    s.flags[key] = value;
    this._saveStory(s);
  },
  getFlag(key: string): unknown { return this.loadStory().flags[key] ?? false; },

  setFlags(patch: Record<string, unknown>): void {
    const s = this.loadStory();
    Object.assign(s.flags, patch);
    this._saveStory(s);
  },
  checkFlags(keys: string[]): boolean {
    const flags = this.loadStory().flags;
    return keys.every(k => !!flags[k]);
  },
  checkAnyFlag(keys: string[]): boolean {
    const flags = this.loadStory().flags;
    return keys.some(k => !!flags[k]);
  },

  addLog(eventId: string): void {
    const s = this.loadStory();
    if (!s.log.includes(eventId)) s.log.push(eventId);
    this._saveStory(s);
  },
  hasEvent(eventId: string): boolean { return this.loadStory().log.includes(eventId); },
  happenedBefore(eventId: string, otherEventId: string): boolean {
    const log = this.loadStory().log;
    return log.indexOf(eventId) < log.indexOf(otherEventId);
  },

  unlockLore(loreId: string): void {
    const s = this.loadStory();
    if (!s.unlockedLore.includes(loreId)) s.unlockedLore.push(loreId);
    this._saveStory(s);
  },
  isLoreUnlocked(loreId: string): boolean { return this.loadStory().unlockedLore.includes(loreId); },
  markLoreRead(loreId: string): void {
    const s = this.loadStory();
    if (!s.readLore.includes(loreId)) s.readLore.push(loreId);
    this._saveStory(s);
  },
  getUnreadLore(): string[] {
    const s = this.loadStory();
    return s.unlockedLore.filter(id => !s.readLore.includes(id));
  },
  deleteStory(): void { localStorage.removeItem(this.STORY_KEY); },

  // ── 전체 초기화 ───────────────────────────────────────────────
  deleteAll(): void {
    this.deleteSave();
    this.deleteSettings();
    this.deleteStory();
    localStorage.removeItem('settings_font');
    localStorage.removeItem('neural_rust_keybinds');
    localStorage.removeItem('neural_rust_audio');
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
