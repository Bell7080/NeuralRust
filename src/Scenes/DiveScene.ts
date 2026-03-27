// ================================================================
//  DiveScene.ts
//  경로: src/Scenes/DiveScene.ts
//
//  역할: 탐사 로비 씬 스텁
//        원본: 슬롯 + 탭(인벤/잠수정/상점/파티/일지)
//        스텁: 상태 표시 + 슬롯 3개 (랜덤 배틀타입) + 탈출
// ================================================================

import { FontManager }      from '../Managers/FontManager';
import { InputManager }     from '../Managers/InputManager';
import { SaveManager }      from '../Managers/SaveManager';
import { CharacterManager } from '../Managers/CharacterManager';

interface DiveInitData {
  cogMax?:      number;
  round?:       number;
  maxRound?:    number;
  deepCoin?:    number;
  log?:         unknown[];
  battleParty?: string[];
  inventory?:   unknown;
  submarine?:   unknown;
  shopItems?:   unknown;
}

export class DiveScene extends Phaser.Scene {
  constructor() { super({ key: 'DiveScene' }); }

  private _cogMax      = 1;
  private _round       = 1;
  private _maxRound    = 5;
  private _deepCoin    = 0;
  private _log:        unknown[] = [];
  private _battleParty: string[] = [];
  private _inventory:  unknown = null;
  private _submarine:  unknown = null;
  private _shopItems:  unknown = null;
  private W = 0;
  private H = 0;
  private _sceneHits: Phaser.GameObjects.GameObject[] = [];

  init(data: DiveInitData): void {
    this._cogMax      = data.cogMax      ?? 1;
    this._round       = data.round       ?? 1;
    this._maxRound    = data.maxRound    ?? 5;
    this._deepCoin    = data.deepCoin    ?? 0;
    this._log         = data.log         ?? [];
    this._battleParty = data.battleParty?.length
      ? data.battleParty
      : ((CharacterManager as unknown as { loadParty?: () => string[] }).loadParty?.() ?? []);
    this._inventory   = data.inventory   ?? null;
    this._submarine   = data.submarine   ?? null;
    this._shopItems   = data.shopItems   ?? null;
    this._sceneHits   = [];
  }

  create(): void {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    SaveManager.saveCurrentScene('DiveScene', {
      cogMax:      this._cogMax,
      round:       this._round,
      maxRound:    this._maxRound,
      deepCoin:    this._deepCoin,
      log:         this._log,
      battleParty: this._battleParty,
      inventory:   this._inventory,
      submarine:   this._submarine,
      shopItems:   this._shopItems,
    });

    if (this._round > this._maxRound) {
      this.time.delayedCall(300, () => this._exitExpedition());
      return;
    }

    this._buildBackground(W, H);
    this._buildTopPanel(W, H);
    this._buildSlots(W, H);
    this._buildExitBtn(W, H);
  }

  // ── 배경 ──────────────────────────────────────────────────────
  private _buildBackground(W: number, H: number): void {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    grid.lineStyle(1, 0x0d0a06, 0.4);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    this.add.text(W / 2, H / 2, 'DIVE', {
      fontSize: FontManager.adjustedSize(100, this.scale),
      color: '#0a0705', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.05);
  }

  // ── 상단 패널 ─────────────────────────────────────────────────
  private _buildTopPanel(W: number, H: number): void {
    const topH = H * 0.08;
    this.add.rectangle(0, 0, W, topH, 0x0a0805, 0.95).setOrigin(0);
    this.add.graphics().setDepth(1).lineStyle(1, 0x2a1a0a, 0.8)
      .lineBetween(0, topH, W, topH);

    const items: [number, string][] = [
      [0.08, `심해화폐  ${this._deepCoin}`],
      [0.30, `ROUND  ${this._round} / ${this._maxRound}`],
      [0.52, `COG  ${this._cogMax}`],
      [0.72, `파티  ${this._battleParty.length}명`],
    ];

    items.forEach(([xRatio, label]) => {
      this.add.text(W * xRatio, topH / 2, label, {
        fontSize: FontManager.adjustedSize(13, this.scale),
        color: '#5a3a18', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5).setDepth(2);
    });
  }

  // ── 슬롯 3개 ─────────────────────────────────────────────────
  private _buildSlots(W: number, H: number): void {
    const types: Array<['normal' | 'wave' | 'raid', string, number]> = [
      ['normal', '일반 전투', 0x6a4820],
      ['wave',   '웨이브',   0x6a6020],
      ['raid',   '레이드',   0x8a2020],
    ];

    const slotW = W * 0.22;
    const slotH = H * 0.55;
    const gap   = W * 0.04;
    const totalW = slotW * 3 + gap * 2;
    const startX = W / 2 - totalW / 2;
    const cy     = H * 0.55;

    // 랜덤으로 슬롯 배정
    const shuffled = [...types].sort(() => Math.random() - 0.5);

    shuffled.forEach(([battleType, label, color], i) => {
      const cx = startX + i * (slotW + gap) + slotW / 2;

      const bg = this.add.graphics().setDepth(2);
      const draw = (hover: boolean) => {
        bg.clear();
        bg.fillStyle(hover ? 0x1a1008 : 0x0e0905, 0.97);
        bg.lineStyle(hover ? 2 : 1, color, hover ? 0.85 : 0.5);
        bg.strokeRect(cx - slotW / 2, cy - slotH / 2, slotW, slotH);
        bg.fillRect  (cx - slotW / 2, cy - slotH / 2, slotW, slotH);
      };
      draw(false);

      this.add.text(cx, cy - slotH * 0.32, label, {
        fontSize: FontManager.adjustedSize(13, this.scale),
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(3);

      this.add.text(cx, cy, `COG ${this._cogMax}`, {
        fontSize: FontManager.adjustedSize(30, this.scale),
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5).setDepth(3);

      this.add.text(cx, cy + slotH * 0.28, '클릭하여 진입', {
        fontSize: FontManager.adjustedSize(10, this.scale),
        color: '#3a2010', fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(3);

      const hit = this.add.rectangle(cx, cy, slotW, slotH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(5);
      hit.on('pointerover',  () => draw(true));
      hit.on('pointerout',   () => draw(false));
      hit.on('pointerdown',  () => {
        hit.disableInteractive();
        this._enterBattle(battleType);
      });
      this._sceneHits.push(hit);
    });
  }

  // ── 탈출 버튼 ─────────────────────────────────────────────────
  private _buildExitBtn(W: number, H: number): void {
    const bx = W * 0.5;
    const by = H * 0.90;

    const txt = this.add.text(bx, by, '[ 탐사 철수 ]', {
      fontSize:   FontManager.adjustedSize(13, this.scale),
      color:      '#3a2a10',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });

    txt.on('pointerover',  () => txt.setStyle({ color: '#c8a070' }));
    txt.on('pointerout',   () => txt.setStyle({ color: '#3a2a10' }));
    txt.on('pointerdown',  () => this._exitExpedition());
    this._sceneHits.push(txt);
  }

  // ── 씬 전환 ──────────────────────────────────────────────────
  private _enterBattle(battleType: 'normal' | 'wave' | 'raid'): void {
    const fl = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: fl, alpha: 1, duration: 350, ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.start('BattleScene', {
          cogMax:      this._cogMax,
          battleParty: this._battleParty,
          round:       this._round,
          battleType,
          maxRound:    this._maxRound,
          deepCoin:    this._deepCoin,
          log:         this._log,
          inventory:   this._inventory,
          submarine:   this._submarine,
          shopItems:   this._shopItems,
        });
      },
    });
  }

  private _exitExpedition(): void {
    const fl = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: fl, alpha: 1, duration: 400, ease: 'Sine.easeIn',
      onComplete: () => this.scene.start('AtelierScene', { skipWelcome: true }),
    });
  }

  shutdown(): void {
    this._sceneHits.forEach(h => { try { h.destroy(); } catch (_) {} });
    this._sceneHits = [];
  }
}
