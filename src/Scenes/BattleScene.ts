// ================================================================
//  BattleScene.ts
//  경로: src/Scenes/BattleScene.ts
//
//  역할: 전투 씬 스텁
//        원본: 편성(setup) + 자동전투(battle) + 결산
//        스텁: 기본 HUD + 결과 버튼
// ================================================================

import { FontManager }  from '../Managers/FontManager';
import { InputManager } from '../Managers/InputManager';
import { SaveManager }  from '../Managers/SaveManager';

interface BattleInitData {
  cogMax?:      number;
  battleParty?: string[];
  round?:       number;
  battleType?:  string;
  maxRound?:    number;
  deepCoin?:    number;
  log?:         unknown[];
  inventory?:   unknown;
  submarine?:   unknown;
  shopItems?:   unknown;
}

export class BattleScene extends Phaser.Scene {
  constructor() { super({ key: 'BattleScene' }); }

  private _cogMax      = 1;
  private _battleParty: string[] = [];
  private _round       = 1;
  private _battleType  = 'normal';
  private _maxRound    = 5;
  private _deepCoin    = 0;
  private _log:        unknown[] = [];
  private _inventory:  unknown = null;
  private _submarine:  unknown = null;
  private _shopItems:  unknown = null;
  private W = 0;
  private H = 0;

  init(data: BattleInitData): void {
    this._cogMax      = data.cogMax      ?? 1;
    this._battleParty = data.battleParty ?? [];
    this._round       = data.round       ?? 1;
    this._battleType  = data.battleType  ?? 'normal';
    this._maxRound    = data.maxRound    ?? 5;
    this._deepCoin    = data.deepCoin    ?? 0;
    this._log         = data.log         ?? [];
    this._inventory   = data.inventory   ?? null;
    this._submarine   = data.submarine   ?? null;
    this._shopItems   = data.shopItems   ?? null;
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

    this._buildBackground(W, H);
    this._buildHUD(W, H);
    this._buildStub(W, H);
  }

  private _buildBackground(W: number, H: number): void {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    const grid = this.add.graphics();
    const step = Math.round(W / 60);
    grid.lineStyle(1, 0x0d0a06, 0.5);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    this.add.text(W / 2, H / 2, 'BATTLE', {
      fontSize: FontManager.adjustedSize(100, this.scale),
      color: '#0a0705', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.05);
  }

  private _buildHUD(W: number, H: number): void {
    this.add.text(W * 0.05, H * 0.04, `ROUND  ${this._round} / ${this._maxRound}`, {
      fontSize: FontManager.adjustedSize(14, this.scale),
      color: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const typeLabel: Record<string, string> = { normal: '일반', wave: '웨이브', raid: '레이드' };
    this.add.text(W * 0.5, H * 0.04,
      `COG ${this._cogMax}  ·  ${typeLabel[this._battleType] || this._battleType}`, {
      fontSize: FontManager.adjustedSize(14, this.scale),
      color: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0.5);

    this.add.text(W * 0.95, H * 0.04, `심해화폐 ${this._deepCoin}`, {
      fontSize: FontManager.adjustedSize(13, this.scale),
      color: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);
  }

  private _buildStub(W: number, H: number): void {
    // 중앙 스텁 패널
    const cx = W / 2, cy = H / 2;
    const pw = W * 0.42, ph = H * 0.50;

    const panel = this.add.graphics();
    panel.fillStyle(0x0e0905, 0.96);
    panel.lineStyle(2, 0x3a2010, 0.9);
    panel.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);
    panel.fillRect  (cx - pw / 2, cy - ph / 2, pw, ph);

    this.add.text(cx, cy - ph / 2 + parseInt(FontManager.adjustedSize(24, this.scale)), '[ 전  투 ]', {
      fontSize: FontManager.adjustedSize(12, this.scale),
      color: '#7a5028', fontFamily: FontManager.MONO, letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(cx, cy - ph * 0.12, '— 개발 중 —', {
      fontSize: FontManager.adjustedSize(18, this.scale),
      color: '#3a2010', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    this.add.text(cx, cy + ph * 0.05,
      `파티 ${this._battleParty.length}명  vs  Cog ${this._cogMax}`, {
      fontSize: FontManager.adjustedSize(14, this.scale),
      color: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    // 승리 / 패배 버튼
    const bw = W * 0.13, bh = H * 0.06;
    const winX  = cx - bw * 0.75;
    const loseX = cx + bw * 0.75;

    this._makeBtn(winX,  cy + ph * 0.30, bw, bh, '승  리', '#6b8040', () => {
      this._deepCoin += this._cogMax * 5;
      this._goBack(this._round + 1);
    });
    this._makeBtn(loseX, cy + ph * 0.30, bw, bh, '패  배', '#883020', () => {
      this._goBack(this._maxRound + 1);
    });
  }

  private _makeBtn(
    bx: number, by: number, bw: number, bh: number,
    label: string, color: string, onClick: () => void
  ): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0e0905, 1);
    bg.lineStyle(1, 0x2a1a0a, 0.9);
    bg.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);
    bg.fillRect  (bx - bw / 2, by - bh / 2, bw, bh);

    const txt = this.add.text(bx, by, label, {
      fontSize:   FontManager.adjustedSize(17, this.scale),
      color,
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const hit = this.add.rectangle(bx, by, bw, bh, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);
    hit.on('pointerover',  () => txt.setAlpha(0.7));
    hit.on('pointerout',   () => txt.setAlpha(1));
    hit.on('pointerdown',  onClick);
  }

  private _goBack(nextRound: number): void {
    const fl = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: fl, alpha: 1, duration: 350, ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.start('DiveScene', {
          cogMax:      this._cogMax,
          round:       nextRound,
          maxRound:    this._maxRound,
          deepCoin:    this._deepCoin,
          log:         this._log,
          battleParty: this._battleParty,
          inventory:   this._inventory,
          submarine:   this._submarine,
          shopItems:   this._shopItems,
        });
      },
    });
  }
}
