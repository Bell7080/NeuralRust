// ================================================================
//  AudioManager.ts
//  경로: src/Managers/AudioManager.ts
//
//  역할: 마스터 / BGM / SFX 볼륨 중앙 관리
//
//  볼륨 계산 방식:
//    실제 볼륨 = (채널 볼륨) × (마스터 볼륨)
//
//  사용 예:
//    AudioManager.init(scene);
//    AudioManager.playBGM('lobby_bgm');
//    AudioManager.playSFX('glitch');
//    AudioManager.setMaster(0.8);
// ================================================================

export const AudioManager = {

  STORAGE_KEY: 'neural_rust_audio',

  _master: 1.0,
  _bgm:    0.7,
  _sfx:    1.0,

  _currentBGM:    null as Phaser.Sound.BaseSound | null,
  _currentBGMKey: null as string | null,

  _scene: null as Phaser.Scene | null,

  // ── 초기화 ────────────────────────────────────────────────────
  init(scene: Phaser.Scene): void {
    this._scene = scene;
    this._load();
  },

  reinit(scene: Phaser.Scene): void {
    this._scene = scene;
  },

  // ── 볼륨 getter ───────────────────────────────────────────────
  get masterVolume(): number { return this._master; },
  get bgmVolume():    number { return this._bgm; },
  get sfxVolume():    number { return this._sfx; },
  get effectiveBGM(): number { return this._bgm * this._master; },
  get effectiveSFX(): number { return this._sfx * this._master; },

  // ── 볼륨 setter ───────────────────────────────────────────────
  setMaster(v: number): void {
    this._master = Math.max(0, Math.min(1, v));
    this._applyBGMVolume();
    this._save();
  },
  setBGM(v: number): void {
    this._bgm = Math.max(0, Math.min(1, v));
    this._applyBGMVolume();
    this._save();
  },
  setSFX(v: number): void {
    this._sfx = Math.max(0, Math.min(1, v));
    this._save();
  },

  // ── BGM ───────────────────────────────────────────────────────
  playBGM(key: string, fadeMs: number = 800): void {
    if (!this._scene) return;
    const current = this._currentBGM as (Phaser.Sound.BaseSound & { isPlaying?: boolean }) | null;
    if (this._currentBGMKey === key && current?.isPlaying) return;

    this.stopBGM(fadeMs);

    if (!this._scene.sound) return;
    if (!this._scene.cache.audio.has(key)) {
      console.warn(`[AudioManager] BGM 키 없음: ${key}`);
      return;
    }

    const sound = this._scene.sound.add(key, { volume: 0, loop: true });
    (sound as Phaser.Sound.BaseSound & { play(): void }).play();

    this._scene.tweens.add({
      targets:  sound,
      volume:   this.effectiveBGM,
      duration: fadeMs,
      ease:     'Sine.easeInOut',
    });

    this._currentBGM    = sound;
    this._currentBGMKey = key;
  },

  stopBGM(fadeMs: number = 800): void {
    if (!this._currentBGM) return;
    const s = this._currentBGM as Phaser.Sound.BaseSound & { destroy(): void };

    if (this._scene && fadeMs > 0) {
      this._scene.tweens.add({
        targets:    s,
        volume:     0,
        duration:   fadeMs,
        ease:       'Sine.easeOut',
        onComplete: () => { s.destroy(); },
      });
    } else {
      s.destroy();
    }

    this._currentBGM    = null;
    this._currentBGMKey = null;
  },

  pauseBGM(): void {
    (this._currentBGM as (Phaser.Sound.BaseSound & { pause(): void }) | null)?.pause();
  },

  resumeBGM(): void {
    (this._currentBGM as (Phaser.Sound.BaseSound & { resume(): void }) | null)?.resume();
  },

  _applyBGMVolume(): void {
    if (this._currentBGM) {
      (this._currentBGM as Phaser.Sound.BaseSound & { setVolume(v: number): void })
        .setVolume(this.effectiveBGM);
    }
  },

  // ── SFX ───────────────────────────────────────────────────────
  playSFX(key: string, options: { volume?: number; rate?: number; detune?: number; loop?: boolean } = {}): void {
    if (!this._scene) return;
    if (!this._scene.sound) return;
    if (!this._scene.cache.audio.has(key)) return;

    const vol = this.effectiveSFX * (options.volume ?? 1.0);
    this._scene.sound.play(key, {
      volume: vol,
      rate:   options.rate   ?? 1.0,
      detune: options.detune ?? 0,
      loop:   options.loop   ?? false,
    });
  },

  // ── 퍼센트 편의 메서드 (UI용 0~100 정수) ─────────────────────
  getMasterPct(): number { return Math.round(this._master * 100); },
  getBGMPct():    number { return Math.round(this._bgm    * 100); },
  getSFXPct():    number { return Math.round(this._sfx    * 100); },
  setMasterPct(pct: number): void { this.setMaster(pct / 100); },
  setBGMPct(pct: number):    void { this.setBGM(pct    / 100); },
  setSFXPct(pct: number):    void { this.setSFX(pct    / 100); },

  // ── 저장 / 불러오기 ───────────────────────────────────────────
  _save(): void {
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

  _load(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as { master?: number; bgm?: number; sfx?: number };
      if (typeof d.master === 'number') this._master = d.master;
      if (typeof d.bgm    === 'number') this._bgm    = d.bgm;
      if (typeof d.sfx    === 'number') this._sfx    = d.sfx;
    } catch (e) {
      console.warn('[AudioManager] 불러오기 실패', e);
    }
  },
};
