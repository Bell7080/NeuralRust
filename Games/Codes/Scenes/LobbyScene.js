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
    // 베이스 — 거의 검은 갈색빛
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    // 수평 스캔라인 (녹슨 CRT 느낌)
    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x1a0e06, 0.35);
      scan.lineBetween(0, y, W, y);
    }

    // 수직 그리드 (미세한 톱니바퀴 격자)
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

    // 중앙 앰비언트 글로우 (녹슨 주황-갈색)
    const glow = this.add.graphics();
    const glowColors = [0xa05018, 0x6b3010, 0x3d1a08];
    glowColors.forEach((col, i) => {
      glow.fillStyle(col, 0.012 * (5 - i));
      glow.fillEllipse(cx, H * 0.38, W * 0.7, H * 0.55);
    });

    // 하단 장식 수평선 (이중선)
    const deco = this.add.graphics();
    const lineY = H * 0.78;
    deco.lineStyle(1, 0x2a1a0a, 1);
    deco.lineBetween(W * 0.03, lineY,     W * 0.40, lineY);
    deco.lineBetween(W * 0.60, lineY,     W * 0.97, lineY);
    deco.lineStyle(1, 0x1a0e06, 1);
    deco.lineBetween(W * 0.03, lineY + 3, W * 0.40, lineY + 3);
    deco.lineBetween(W * 0.60, lineY + 3, W * 0.97, lineY + 3);

    // 코너 장식 (톱니 느낌)
    const corner = this.add.graphics();
    corner.lineStyle(1, 0x2a1a0a, 0.8);
    const cs = Math.round(W * 0.025);
    const px = Math.round(W * 0.025);
    const py = Math.round(H * 0.035);
    // TL
    corner.lineBetween(px, py, px + cs, py);
    corner.lineBetween(px, py, px, py + cs);
    // TR
    corner.lineBetween(W - px, py, W - px - cs, py);
    corner.lineBetween(W - px, py, W - px, py + cs);
    // BL
    corner.lineBetween(px, H - py, px + cs, H - py);
    corner.lineBetween(px, H - py, px, H - py - cs);
    // BR
    corner.lineBetween(W - px, H - py, W - px - cs, H - py);
    corner.lineBetween(W - px, H - py, W - px, H - py - cs);
  }

  _buildTitle(W, H, cx) {
    // 상단 PROJECT 001 레이블
    const label = this.add.text(cx, H * 0.20, 'P  R  O  J  E  C  T    0  0  1', {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#3a2510',
      fontFamily: FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0.5).setAlpha(0);

    // 메인 타이틀
    const title = this.add.text(cx, H * 0.35, 'NEURAL  RUST', {
      fontSize: scaledFontSize(68, this.scale),
      fill: '#c8bfb0',
      fontFamily: FontManager.TITLE,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: '#a05018',
        blur: 24,
        fill: false,
        stroke: false,
      },
    }).setOrigin(0.5).setAlpha(0);

    // 한글 부제
    const subKo = this.add.text(cx, H * 0.49, '뉴  럴  러  스  트', {
      fontSize: scaledFontSize(14, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    // 세계관 한 줄 요약
    const tagline = this.add.text(cx, H * 0.57, '소프트웨어만 살아남은 세계  —  붕괴 후 102년', {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#251508',
      fontFamily: FontManager.MONO,
      letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0);

    // 페이드인 트윈
    this.tweens.add({ targets: label,   alpha: 1, duration: 900,  delay: 300,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: title,   alpha: 1, duration: 1400, delay: 600,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: subKo,   alpha: 1, duration: 900,  delay: 1000, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: tagline, alpha: 1, duration: 800,  delay: 1300, ease: 'Sine.easeOut' });
  }

  _buildMenu(W, H) {
    const hasSave = SaveManager.hasSave();
    const x     = W * 0.07;
    const baseY = H * 0.68;
    const gap   = parseInt(scaledFontSize(40, this.scale));

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
    const indent = parseInt(scaledFontSize(16, this.scale));

    // 마커 (│)
    const marker = this.add.text(x - indent, y, '│', {
      fontSize: scaledFontSize(14, this.scale),
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setAlpha(0);

    // 버튼 텍스트
    const btn = this.add.text(x, y, label, {
      fontSize: scaledFontSize(18, this.scale),
      fill: '#4a3020',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    // 언더라인 그래픽
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
        x, y + parseInt(scaledFontSize(13, this.scale)),
        x + btn.width + shift + 4, y + parseInt(scaledFontSize(13, this.scale))
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
        this._transition(() => this.scene.start('LoadingScene', { next: 'GameScene' }));
        break;
      case 'load':
        if (SaveManager.hasSave())
          this._transition(() => this.scene.start('LoadingScene', { next: 'GameScene', save: SaveManager.load() }));
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
    // 버전
    this.add.text(W - 14, H - 12, 'v0.0.1  prototype', {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#1e1008',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 1);

    // 좌측 — 세계관 연도 표시
    this.add.text(14, H - 12, 'YEAR 102  ·  POST-COLLAPSE', {
      fontSize: scaledFontSize(9, this.scale),
      fill: '#1e1008',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 1);
  }
}
