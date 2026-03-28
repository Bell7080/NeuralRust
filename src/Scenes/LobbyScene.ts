// ================================================================
//  LobbyScene.ts
//  경로: src/Scenes/LobbyScene.ts
//
//  역할: NEURAL RUST 메인 타이틀 / 로비 화면
//  의존: FontManager, SaveManager, AudioManager, GAME_VERSION
// ================================================================

import { FontManager }     from '../Managers/FontManager';
import { SaveManager }     from '../Managers/SaveManager';
import { AudioManager }    from '../Managers/AudioManager';
import { GAME_VERSION }    from '../constants';
import { clearAllSceneDom } from '../utils/sceneCleanup';

export class LobbyScene extends Phaser.Scene {
  constructor() { super({ key: 'LobbyScene' }); }

  preload(): void {
    if (!this.textures.exists('bg_lobby')) {
      this.load.image('bg_lobby', 'Games/Assets/Sprites/Background_006.png');
    }
  }

  create(): void {
    clearAllSceneDom();

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
  private _buildBackground(W: number, H: number, cx: number): void {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    if (this.textures.exists('bg_lobby')) {
      const bg     = this.add.image(cx, H / 2, 'bg_lobby');
      const scaleX = W / bg.width;
      const scaleY = H / bg.height;
      bg.setScale(Math.max(scaleX, scaleY)).setDepth(0);
    }

    this.add.rectangle(0, 0, W, H, 0x050407, 0.52).setOrigin(0).setDepth(1);

    const scan = this.add.graphics().setDepth(2);
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x000000, 0.18);
      scan.lineBetween(0, y, W, y);
    }

    const deco  = this.add.graphics().setDepth(2);
    const lineY = H * 0.78;
    deco.lineStyle(1, 0x2a1a0a, 1);
    deco.lineBetween(W * 0.03, lineY,     W * 0.40, lineY);
    deco.lineBetween(W * 0.60, lineY,     W * 0.97, lineY);
    deco.lineStyle(1, 0x1a0e06, 1);
    deco.lineBetween(W * 0.03, lineY + 3, W * 0.40, lineY + 3);
    deco.lineBetween(W * 0.60, lineY + 3, W * 0.97, lineY + 3);

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
  private _buildTitle(W: number, H: number, cx: number): void {
    const SX     = 0.75;
    const SY     = 1.30;
    const FS     = FontManager.adjustedSize(102, this.scale);
    const titleY = H * 0.355;

    const label = this.add.text(cx, H * 0.20, 'P  R  O  J  E  C  T    0  0  1', {
      fontSize:      FontManager.adjustedSize(22, this.scale),
      color:         '#5a3d1a',
      fontFamily:    FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(3);

    const glow1 = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize:        FS,
      color:           '#a05018',
      fontFamily:      FontManager.TITLE,
      stroke:          '#7a3010',
      strokeThickness: 26,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(3);

    const glow2 = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize:        FS,
      color:           '#c87030',
      fontFamily:      FontManager.TITLE,
      stroke:          '#8a4010',
      strokeThickness: 12,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(3);

    const outline = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize:        FS,
      color:           '#0a0604',
      fontFamily:      FontManager.TITLE,
      stroke:          '#7a4015',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(3);

    const title = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize:        FS,
      color:           '#c8bfb0',
      fontFamily:      FontManager.TITLE,
      stroke:          '#2a1408',
      strokeThickness: 1,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(3);

    const subKo = this.add.text(cx, H * 0.50, '뉴  럴  러  스  트', {
      fontSize:      FontManager.adjustedSize(32, this.scale),
      color:         '#6b4a28',
      fontFamily:    FontManager.MONO,
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(3);

    const tagline = this.add.text(cx, H * 0.57, '녹 슨  닻 으 로  전 선 을  끊 어 내 라 .', {
      fontSize:      FontManager.adjustedSize(22, this.scale),
      color:         '#4a3018',
      fontFamily:    FontManager.MONO,
      letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0).setDepth(3);

    this.tweens.add({ targets: label,   alpha: 1,    duration: 900,  delay: 300,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: glow1,   alpha: 0.12, duration: 1800, delay: 400,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: glow2,   alpha: 0.28, duration: 1600, delay: 500,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: outline, alpha: 0.90, duration: 1200, delay: 600,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: title,   alpha: 1,    duration: 1200, delay: 650,  ease: 'Sine.easeOut' });
    this.tweens.add({ targets: subKo,   alpha: 1,    duration: 900,  delay: 1000, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: tagline, alpha: 1,    duration: 800,  delay: 1300, ease: 'Sine.easeOut' });

    const glitchOrange = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS, color: '#c85018', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0).setScale(SX, SY).setDepth(10);

    const glitchBlue = this.add.text(cx, titleY, 'NEURAL  RUST', {
      fontSize: FS, color: '#1850a0', fontFamily: FontManager.TITLE,
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
  private _buildMenu(W: number, H: number): void {
    const hasSave = SaveManager.hasSave();
    const x     = W * 0.07;
    const baseY = H * 0.68;
    const gap   = Math.round(H * 0.075);

    const items = hasSave
      ? [
          { label: '새로 시작하기',  key: 'new',      delay: 900  },
          { label: '이어  하기',      key: 'load',     delay: 1050 },
          { label: '설    정',       key: 'settings', delay: 1200 },
          { label: '나가기',         key: 'quit',     delay: 1350 },
        ]
      : [
          { label: '시    작',       key: 'new',      delay: 900  },
          { label: '설    정',       key: 'settings', delay: 1050 },
          { label: '나가기',         key: 'quit',     delay: 1200 },
        ];

    items.forEach((item, i) => {
      this._makeMenuButton(item.label, x, baseY + gap * i, item.key, item.delay, W);
    });
  }

  private _makeMenuButton(label: string, x: number, y: number, key: string, delay: number, W: number): void {
    const indent = Math.round(W * 0.018);
    const shift  = Math.round(W * 0.008);

    const marker = this.add.text(x - indent, y, '│', {
      fontSize:   FontManager.adjustedSize(30, this.scale),
      color:      '#4a2a10',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setAlpha(0).setDepth(3);

    const btn = this.add.text(x, y, label, {
      fontSize:   FontManager.adjustedSize(36, this.scale),
      color:      '#7a5530',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5).setAlpha(0).setInteractive({ useHandCursor: true }).setDepth(3);

    this.tweens.add({ targets: [btn, marker], alpha: 1, duration: 500, delay, ease: 'Sine.easeOut' });

    const origX = x;
    btn.on('pointerover', () => {
      this.tweens.killTweensOf(btn);
      this.tweens.add({ targets: btn, x: origX + shift, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ color: '#e8c090' });
      marker.setStyle({ color: '#c06020' });
    });
    btn.on('pointerout', () => {
      this.tweens.killTweensOf(btn);
      this.tweens.add({ targets: btn, x: origX, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ color: '#7a5530' });
      marker.setStyle({ color: '#4a2a10' });
    });
    btn.on('pointerdown', () => this._onMenuClick(key));
  }

  private _onMenuClick(key: string): void {
    switch (key) {
      case 'new':
        SaveManager.newGameFull();
        SaveManager.setProgress(1, 'start');
        SaveManager.saveCurrentScene('AtelierScene', {});
        this._transition(() => this.scene.start('LoadingScene', { next: 'AtelierScene' }));
        break;
      case 'load': {
        const cur = SaveManager.loadCurrentScene();
        const targetScene = cur ? cur.scene : 'AtelierScene';
        const targetData  = cur ? cur.data  : {};
        const needsLoading = ['AtelierScene', 'PartyScene', 'ExploreScene'];
        if (needsLoading.includes(targetScene)) {
          this._transition(() => this.scene.start('LoadingScene', { next: targetScene, data: targetData }));
        } else {
          this._transition(() => this.scene.start(targetScene, targetData));
        }
        break;
      }
      case 'settings':
        this._transition(() => this.scene.start('SettingsScene', { from: 'LobbyScene' }));
        break;
      case 'quit':
        window.close();
        break;
    }
  }

  private _transition(callback: () => void): void {
    const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 400, ease: 'Sine.easeIn',
      onComplete: callback,
    });
  }

  // ── 푸터 ──────────────────────────────────────────────────────
  private _buildFooter(W: number, H: number): void {
    this.add.text(W - 14, H - 12, GAME_VERSION.full, {
      fontSize:   FontManager.adjustedSize(18, this.scale),
      color:      '#3a2510',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 1).setDepth(3);

    this.add.text(14, H - 12, GAME_VERSION.atmosphere, {
      fontSize:   FontManager.adjustedSize(18, this.scale),
      color:      '#3a2510',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 1).setDepth(3);
  }
}
