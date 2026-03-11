// ================================================================
//  LobbyScene.js
//  경로: Games/Codes/Scenes/LobbyScene.js
//
//  역할: NEURAL RUST 메인 타이틀 / 로비 화면
//  의존: FontManager, SaveManager, AudioManager, utils.js
//
//  폰트 수치 기준: 1280×720 basePx × 1.5 (가시성 개선)
//  배경 전략: Background_002.png ENVELOP(cover) — 방식 2
// ================================================================

class LobbyScene extends Phaser.Scene {
  constructor() { super({ key: 'LobbyScene' }); }

  preload() {
    if (!this.textures.exists('bg_lobby')) {
      this.load.image('bg_lobby', 'Games/Assets/Sprites/Background_002.png');
    }
  }

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const cx = W / 2;

    AudioManager.reinit(this);

    this._buildBackground(W, H, cx);
    this._buildTitle(W, H, cx);
    this._buildMenu(W, H);
    this._buildFooter(W, H);
  }

  // ── 배경 ──────────────────────────────────────────────────────
  _buildBackground(W, H, cx) {
    // ① 검은 베이스 (이미지 로드 실패 시 fallback)
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    // ② 배경 이미지 — ENVELOP(cover): 비율 유지하며 화면 꽉 채움
    if (this.textures.exists('bg_lobby')) {
      const bg     = this.add.image(cx, H / 2, 'bg_lobby');
      const scaleX = W / bg.width;
      const scaleY = H / bg.height;
      bg.setScale(Math.max(scaleX, scaleY)).setDepth(0);
    }

    // ③ 어두운 반투명 오버레이
    this.add.rectangle(0, 0, W, H, 0x050407, 0.52).setOrigin(0).setDepth(1);

    // ④ 스캔라인
    const scan = this.add.graphics().setDepth(2);
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x000000, 0.18);
      scan.lineBetween(0, y, W, y);
    }

    // ⑤ 수평 데코 선
    const deco  = this.add.graphics().setDepth(2);
    const lineY = H * 0.78;
    deco.lineStyle(1, 0x2a1a0a, 1);
    deco.lineBetween(W * 0.03, lineY,     W * 0.40, lineY);
    deco.lineBetween(W * 0.60, lineY,     W * 0.97, lineY);
    deco.lineStyle(1, 0x1a0e06, 1);
    deco.lineBetween(W * 0.03, lineY + 3, W * 0.40, lineY + 3);
    deco.lineBetween(W * 0.60, lineY + 3, W * 0.97, lineY + 3);

    // ⑥ 코너 장식
    const corner = this.add.graphics().setDepth(2);
    corner.lineStyle(1, 0x2a1a0a, 0.8);
    const cs = Math.round(W * 0.025);
    const px = Math.round(W * 0.025);
    const py = Math.round(H * 0.035);
    corner.lineBetween(px,     py,     px + cs, py    );
    corner.lineBetween(px,     py,     px,      py + cs);
    corner.lineBetween(W - px, py,     W - px - cs, py);
    corner.lineBetween(W - px, py,     W - px, py + cs);
    corner.lineBetween(px,     H - py, px + cs, H - py);
    corner.lineBetween(px,     H - py, px,      H - py - cs);
    corner.lineBetween(W - px, H - py, W - px - cs, H - py);
    corner.lineBetween(W - px, H - py, W - px,      H - py - cs);
  }

  // ── 타이틀 ────────────────────────────────────────────────────
  // basePx × 1.5 적용 (가시성 개선)
  _buildTitle(W, H, cx) {
    const SX     = 0.75;
    const SY     = 1.30;
    const FS     = scaledFontSize(102, this.scale);  // 68 × 1.5
    const titleY = H * 0.355;

    const label = this.add.text(cx, H * 0.20, 'P  R  O  J  E  C  T    0  0  1', {
      fontSize: scaledFontSize(18, this.scale),  // 12 × 1.5
      fill: '#5a3d1a',
      fontFamily: FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(3);

    const glow1 = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS,
      fill: '#a05018',
      fontFamily: FontManager.TITLE,
      stroke: '#7a3010',
      strokeThickness: 26,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(3);

    const glow2 = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS,
      fill: '#c87030',
      fontFamily: FontManager.TITLE,
      stroke: '#8a4010',
      strokeThickness: 12,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(3);

    const outline = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS,
      fill: '#0a0604',
      fontFamily: FontManager.TITLE,
      stroke: '#7a4015',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(3);

    const title = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS,
      fill: '#c8bfb0',
      fontFamily: FontManager.TITLE,
      stroke: '#2a1408',
      strokeThickness: 1,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(3);

    const subKo = this.add.text(cx, H * 0.48, '뉴  럴  러  스  트', {
      fontSize: scaledFontSize(29, this.scale),  // 19 × 1.5
      fill: '#6b4a28',
      fontFamily: FontManager.MONO,
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(3);

    const tagline = this.add.text(cx, H * 0.54, '녹 슨  닻 으 로  전 선 을  끊 어 내 라 .', {
      fontSize: scaledFontSize(21, this.scale),  // 14 × 1.5
      fill: '#4a3018',
      fontFamily: FontManager.MONO,
      letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0).setDepth(3);

    this.tweens.add({ targets: label,   alpha: 1,    duration: 900,  delay: 300,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: glow1,   alpha: 0.12, duration: 1800, delay: 400,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: glow2,   alpha: 0.28, duration: 1600, delay: 500,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: outline, alpha: 0.90, duration: 1200, delay: 600,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: title,   alpha: 1,    duration: 1200, delay: 650,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: subKo,   alpha: 1,    duration: 900,  delay: 1000, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: tagline, alpha: 1,    duration: 800,  delay: 1300, ease: 'Sine.easeOut' });

    // 글리치 레이어
    const glitchOrange = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS, fill: '#c85018', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(10);

    const glitchBlue = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS, fill: '#1850a0', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(9);

    const fireGlitch = () => {
      AudioManager.playSFX('glitch_title');
      glitchOrange.setAlpha(0.6).setX(cx - 4);
      this.time.delayedCall(45,  () => { glitchOrange.setX(cx + 5); });
      this.time.delayedCall(95,  () => { glitchOrange.setX(cx - 2); });
      this.time.delayedCall(130, () => { glitchOrange.setAlpha(0).setX(cx); });
      this.time.delayedCall(30, () => {
        glitchBlue.setAlpha(0.35).setX(cx + 6);
        this.time.delayedCall(55,  () => { glitchBlue.setX(cx - 3); });
        this.time.delayedCall(110, () => { glitchBlue.setAlpha(0).setX(cx); });
      });
    };
    this.time.delayedCall(800, () => {
      fireGlitch();
      this.time.addEvent({ delay: 3000, loop: true, callback: fireGlitch });
    });
  }

  // ── 메뉴 ──────────────────────────────────────────────────────
  // basePx × 1.5 적용
  _buildMenu(W, H) {
    const hasSave = SaveManager.hasSave();
    const x     = W * 0.07;
    const baseY = H * 0.68;
    const gap   = parseInt(scaledFontSize(66, this.scale));  // 44 × 1.5

    const items = hasSave
      ? [
          { label: '새로 시작하기',  key: 'new',      delay: 900  },
          { label: '불러오기',       key: 'load',     delay: 1050 },
          { label: '설    정',       key: 'settings', delay: 1200 },
          { label: '나가기',         key: 'quit',     delay: 1350 },
        ]
      : [
          { label: '시    작',       key: 'new',      delay: 900  },
          { label: '설    정',       key: 'settings', delay: 1050 },
          { label: '나가기',         key: 'quit',     delay: 1200 },
        ];

    items.forEach((item, i) => {
      this._makeMenuButton(item.label, x, baseY + gap * i, item.key, item.delay);
    });
  }

  _makeMenuButton(label, x, y, key, delay) {
    const indent = parseInt(scaledFontSize(27, this.scale));  // 18 × 1.5
    const shift  = parseInt(scaledFontSize(12, this.scale));  // 8 × 1.5

    const marker = this.add.text(x - indent, y, '│', {
      fontSize: scaledFontSize(26, this.scale),  // 17 × 1.5
      fill: '#4a2a10',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setAlpha(0).setDepth(3);

    const btn = this.add.text(x, y, label, {
      fontSize: scaledFontSize(36, this.scale),  // 24 × 1.5
      fill: '#7a5530',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5).setAlpha(0).setInteractive({ useHandCursor: true }).setDepth(3);

    this.tweens.add({ targets: [btn, marker], alpha: 1, duration: 500, delay, ease: 'Sine.easeOut' });

    const origX = x;
    btn.on('pointerover', () => {
      this.tweens.killTweensOf(btn);
      this.tweens.add({ targets: btn, x: origX + shift, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#e8c090' });
      marker.setStyle({ fill: '#c06020' });
    });
    btn.on('pointerout', () => {
      this.tweens.killTweensOf(btn);
      this.tweens.add({ targets: btn, x: origX, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#7a5530' });
      marker.setStyle({ fill: '#4a2a10' });
    });
    btn.on('pointerdown', () => this._onMenuClick(key));
  }

  _onMenuClick(key) {
    switch (key) {
      case 'new':
        SaveManager.deleteSave();
        SaveManager.deleteStory();
        SaveManager.newGame();
        SaveManager.setProgress(1, 'start');
        this._transition(() => this.scene.start('LoadingScene', { next: 'AtelierScene' }));
        break;
      case 'load':
        if (SaveManager.hasSave())
          this._transition(() => this.scene.start('LoadingScene', { next: 'AtelierScene' }));
        break;
      case 'settings':
        this._transition(() => this.scene.start('SettingsScene', { from: 'LobbyScene' }));
        break;
      case 'quit':
        window.close();
        break;
    }
  }

  _transition(callback) {
    const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 400, ease: 'Sine.easeIn',
      onComplete: callback,
    });
  }

  // ── 푸터 ──────────────────────────────────────────────────────
  _buildFooter(W, H) {
    this.add.text(W - 14, H - 12, 'v0.0.1  prototype', {
      fontSize: scaledFontSize(18, this.scale),  // 12 × 1.5
      fill: '#3a2510',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 1).setDepth(3);

    this.add.text(14, H - 12, 'YEAR 102  ·  POST-COLLAPSE', {
      fontSize: scaledFontSize(18, this.scale),  // 12 × 1.5
      fill: '#3a2510',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 1).setDepth(3);
  }
}
