// ================================================================
//  AudioManager.js
//  경로: Games/Codes/Managers/AudioManager.js
//
//  역할: 마스터 / BGM / SFX 볼륨 중앙 관리
//
//  볼륨 계산 방식:
//    실제 볼륨 = (채널 볼륨) × (마스터 볼륨)
//    예) BGM 50% × 마스터 50% = 실제 25%
//
//  사용 예:
//    AudioManager.init(scene);
//    AudioManager.playBGM('lobby_bgm');
//    AudioManager.playSFX('glitch');
//    AudioManager.setMaster(0.8);
//    AudioManager.setBGM(0.5);
//    AudioManager.setSFX(1.0);
// ================================================================

const AudioManager = {

  STORAGE_KEY: 'neural_rust_audio',

  // 볼륨 상태 (0.0 ~ 1.0)
  _master: 1.0,
  _bgm:    0.7,
  _sfx:    1.0,

  // 현재 재생 중인 BGM
  _currentBGM:    null,
  _currentBGMKey: null,

  // Phaser scene 참조
  _scene: null,

  // ── 초기화 ────────────────────────────────────────────────────
  init(scene) {
    this._scene = scene;
    this._load();
  },

  // scene이 바뀔 때 참조만 교체
  reinit(scene) {
    this._scene = scene;
  },

  // ── 볼륨 getter ───────────────────────────────────────────────
  get masterVolume() { return this._master; },
  get bgmVolume()    { return this._bgm; },
  get sfxVolume()    { return this._sfx; },

  // 실제 적용 볼륨 (곱연산)
  get effectiveBGM() { return this._bgm * this._master; },
  get effectiveSFX() { return this._sfx * this._master; },

  // ── 볼륨 setter ───────────────────────────────────────────────
  setMaster(v) {
    this._master = Math.max(0, Math.min(1, v));
    this._applyBGMVolume();
    this._save();
  },

  setBGM(v) {
    this._bgm = Math.max(0, Math.min(1, v));
    this._applyBGMVolume();
    this._save();
  },

  setSFX(v) {
    this._sfx = Math.max(0, Math.min(1, v));
    this._save();
  },

  // ── BGM ───────────────────────────────────────────────────────
  playBGM(key, fadeMs = 800) {
    if (!this._scene) return;
    if (this._currentBGMKey === key && this._currentBGM?.isPlaying) return;

    this.stopBGM(fadeMs);

    const vol = this.effectiveBGM;

    // Phaser 사운드 시스템이 준비됐는지 확인
    if (!this._scene.sound) return;
    if (!this._scene.cache.audio.has(key)) {
      console.warn(`[AudioManager] BGM 키 없음: ${key}`);
      return;
    }

    const sound = this._scene.sound.add(key, {
      volume: 0,
      loop:   true,
    });

    sound.play();
    this._scene.tweens.add({
      targets: sound,
      volume:  vol,
      duration: fadeMs,
      ease: 'Sine.easeInOut',
    });

    this._currentBGM    = sound;
    this._currentBGMKey = key;
  },

  stopBGM(fadeMs = 800) {
    if (!this._currentBGM) return;
    const s = this._currentBGM;

    if (this._scene && fadeMs > 0) {
      this._scene.tweens.add({
        targets: s,
        volume:  0,
        duration: fadeMs,
        ease: 'Sine.easeOut',
        onComplete: () => { s.destroy(); },
      });
    } else {
      s.destroy();
    }

    this._currentBGM    = null;
    this._currentBGMKey = null;
  },

  pauseBGM() {
    this._currentBGM?.pause();
  },

  resumeBGM() {
    this._currentBGM?.resume();
  },

  _applyBGMVolume() {
    if (this._currentBGM) {
      this._currentBGM.setVolume(this.effectiveBGM);
    }
  },

  // ── SFX ───────────────────────────────────────────────────────
  playSFX(key, options = {}) {
    if (!this._scene) return;
    if (!this._scene.sound) return;
    if (!this._scene.cache.audio.has(key)) {
      // 파일이 없어도 오류 없이 무시 (추후 에셋 추가 시 자동 적용)
      return;
    }

    const vol = this.effectiveSFX * (options.volume ?? 1.0);
    this._scene.sound.play(key, {
      volume:    vol,
      rate:      options.rate    ?? 1.0,
      detune:    options.detune  ?? 0,
      loop:      options.loop    ?? false,
    });
  },

  // ── 퍼센트 편의 메서드 (UI용 0~100 정수) ─────────────────────
  getMasterPct() { return Math.round(this._master * 100); },
  getBGMPct()    { return Math.round(this._bgm    * 100); },
  getSFXPct()    { return Math.round(this._sfx    * 100); },

  setMasterPct(pct) { this.setMaster(pct / 100); },
  setBGMPct(pct)    { this.setBGM(pct    / 100); },
  setSFXPct(pct)    { this.setSFX(pct    / 100); },

  // ── 저장 / 불러오기 ───────────────────────────────────────────
  _save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        master: this._master,
        bgm:    this._bgm,
        sfx:    this._sfx,
      }));
    } catch (e) {
      console.warn('[AudioManager] 저장 실패', e);
    }
  },

  _load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.master === 'number') this._master = d.master;
      if (typeof d.bgm    === 'number') this._bgm    = d.bgm;
      if (typeof d.sfx    === 'number') this._sfx    = d.sfx;
    } catch (e) {
      console.warn('[AudioManager] 불러오기 실패', e);
    }
  },
};
