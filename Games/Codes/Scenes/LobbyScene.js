// ================================================================
//  LobbyScene.js
//  경로: Games/Codes/Scenes/LobbyScene.js
//
//  역할: NEURAL RUST 메인 타이틀 / 로비 화면
//  의존: FontManager, SaveManager, utils.js
// ================================================================

class LobbyScene extends Phaser.Scene {
  constructor() { super({ key: 'LobbyScene' }); }

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const cx = W / 2;

    this._buildBackground(W, H, cx);
    this._buildTitle(W, H, cx);
    this._buildMenu(W, H);
    this._buildFooter(W, H);
  }

  _buildBackground(W, H, cx) {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x1a0e06, 0.35);
      scan.lineBetween(0, y, W, y);
    }

    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    for (let x = 0; x <= W; x += step) {
      grid.lineStyle(1, 0x0f0a05, 0.7);
      grid.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y <= H; y += step) {
      grid.lineStyle(1, 0x0f0a05, 0.7);
      grid.lineBetween(0, y, W, y);
    }

    const glow = this.add.graphics();
    const glowColors = [0xa05018, 0x6b3010, 0x3d1a08];
    glowColors.forEach((col, i) => {
      glow.fillStyle(col, 0.012 * (5 - i));
      glow.fillEllipse(cx, H * 0.38, W * 0.7, H * 0.55);
    });

    const deco = this.add.graphics();
    const lineY = H * 0.78;
    deco.lineStyle(1, 0x2a1a0a, 1);
    deco.lineBetween(W * 0.03, lineY,     W * 0.40, lineY);
    deco.lineBetween(W * 0.60, lineY,     W * 0.97, lineY);
    deco.lineStyle(1, 0x1a0e06, 1);
    deco.lineBetween(W * 0.03, lineY + 3, W * 0.40, lineY + 3);
    deco.lineBetween(W * 0.60, lineY + 3, W * 0.97, lineY + 3);

    const corner = this.add.graphics();
    corner.lineStyle(1, 0x2a1a0a, 0.8);
    const cs = Math.round(W * 0.025);
    const px = Math.round(W * 0.025);
    const py = Math.round(H * 0.035);
    corner.lineBetween(px, py, px + cs, py);
    corner.lineBetween(px, py, px, py + cs);
    corner.lineBetween(W - px, py, W - px - cs, py);
    corner.lineBetween(W - px, py, W - px, py + cs);
    corner.lineBetween(px, H - py, px + cs, H - py);
    corner.lineBetween(px, H - py, px, H - py - cs);
    corner.lineBetween(W - px, H - py, W - px - cs, H - py);
    corner.lineBetween(W - px, H - py, W - px, H - py - cs);
  }

  _buildTitle(W, H, cx) {
    const SX     = 0.75;
    const SY     = 1.30;
    const FS     = scaledFontSize(68, this.scale);
    const titleY = H * 0.355;

    const label = this.add.text(cx, H * 0.20, 'P  R  O  J  E  C  T    0  0  1', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#3a2510',
      fontFamily: FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0.5).setAlpha(0);

    const glow1 = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS,
      fill: '#a05018',
      fontFamily: FontManager.TITLE,
      stroke: '#7a3010',
      strokeThickness: 26,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY);

    const glow2 = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS,
      fill: '#c87030',
      fontFamily: FontManager.TITLE,
      stroke: '#8a4010',
      strokeThickness: 12,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY);

    const outline = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS,
      fill: '#0a0604',
      fontFamily: FontManager.TITLE,
      stroke: '#7a4015',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY);

    const title = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS,
      fill: '#c8bfb0',
      fontFamily: FontManager.TITLE,
      stroke: '#2a1408',
      strokeThickness: 1,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY);

    const subKo = this.add.text(cx, H * 0.51, '뉴  럴  러  스  트', {
      fontSize: scaledFontSize(17, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    const tagline = this.add.text(cx, H * 0.58, '소프트웨어만 살아남은 세계  —  붕괴 후 102년', {
      fontSize: scaledFontSize(14, this.scale),
      fill: '#251508',
      fontFamily: FontManager.MONO,
      letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: label,   alpha: 1,    duration: 900,  delay: 300,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: glow1,   alpha: 0.12, duration: 1800, delay: 400,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: glow2,   alpha: 0.28, duration: 1600, delay: 500,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: outline, alpha: 0.90, duration: 1200, delay: 600,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: title,   alpha: 1,    duration: 1200, delay: 650,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: subKo,   alpha: 1,    duration: 900,  delay: 1000, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: tagline, alpha: 1,    duration: 800,  delay: 1300, ease: 'Sine.easeOut' });
  }

  _buildMenu(W, H) {
    const hasSave = SaveManager.hasSave();
    const x     = W * 0.07;
    const baseY = H * 0.68;
    const gap   = parseInt(scaledFontSize(44, this.scale));

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
    const indent = parseInt(scaledFontSize(18, this.scale));

    const marker = this.add.text(x - indent, y, '│', {
      fontSize: scaledFontSize(17, this.scale),
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setAlpha(0);

    const btn = this.add.text(x, y, label, {
      fontSize: scaledFontSize(22, this.scale),
      fill: '#4a3020',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    const underline = this.add.graphics().setAlpha(0);

    this.tweens.add({ targets: [btn, marker, underline], alpha: 1, duration: 500, delay, ease: 'Sine.easeOut' });

    const origX = x;
    const shift = parseInt(scaledFontSize(8, this.scale));

    btn.on('pointerover', () => {
      this.tweens.add({ targets: btn, x: origX + shift, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#c8a070' });
      marker.setStyle({ fill: '#a05018' });
      underline.clear();
      underline.lineStyle(1, 0x6b3010, 0.8);
      underline.lineBetween(
        x, y + parseInt(scaledFontSize(16, this.scale)),
        x + btn.width + shift + 4, y + parseInt(scaledFontSize(16, this.scale))
      );
    });

    btn.on('pointerout', () => {
      this.tweens.add({ targets: btn, x: origX, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#4a3020' });
      marker.setStyle({ fill: '#2a1508' });
      underline.clear();
    });

    btn.on('pointerdown', () => this._onMenuClick(key));
  }

  _onMenuClick(key) {
    switch (key) {
      case 'new':
        // 기존 세이브 초기화 후 Day 1 / phase 'start' 로 새 게임 시작
        SaveManager.deleteSave();
        SaveManager.deleteStory();
        SaveManager.save({ arc: 0 });
        SaveManager.setProgress(1, 'start');
        this._transition(() => this.scene.start('LoadingScene', { next: 'AtelierScene' }));
        break;

      case 'load':
        // 세이브가 있으면 그대로 공방으로
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

  _buildFooter(W, H) {
    this.add.text(W - 14, H - 12, 'v0.0.1  prototype', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#1e1008',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 1);

    this.add.text(14, H - 12, 'YEAR 102  ·  POST-COLLAPSE', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#1e1008',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 1);
  }
}
