// ================================================================
//  ExploreScene.ts
//  경로: src/Scenes/ExploreScene.ts
//
//  역할: 탐사 난이도 선택 — 3-슬롯 회전 + 카드 선택
//        전부 Phaser 캔버스 (슬롯머신 비주얼)
// ================================================================

import { FontManager }     from '../Managers/FontManager';
import { InputManager }    from '../Managers/InputManager';
import { clearAllSceneDom } from '../utils/sceneCleanup';

interface ExploreCard {
  type: 'combat';
  cog:  number;
  label: string;
  mainText: string;
  color: string;
  border: number;
  weight: number;
}

const EXPLORE_CARDS: ExploreCard[] = [
  { type:'combat', cog:1,  label:'전  투', mainText:'1',  color:'#6b8040', border:0x4a5828, weight:14 },
  { type:'combat', cog:2,  label:'전  투', mainText:'2',  color:'#6b8040', border:0x4a5828, weight:13 },
  { type:'combat', cog:3,  label:'전  투', mainText:'3',  color:'#7a8030', border:0x505820, weight:12 },
  { type:'combat', cog:4,  label:'전  투', mainText:'4',  color:'#8a7828', border:0x605018, weight:10 },
  { type:'combat', cog:5,  label:'전  투', mainText:'5',  color:'#9a6820', border:0x6a4810, weight:9  },
  { type:'combat', cog:6,  label:'전  투', mainText:'6',  color:'#a85820', border:0x783810, weight:7  },
  { type:'combat', cog:7,  label:'전  투', mainText:'7',  color:'#b84820', border:0x803010, weight:6  },
  { type:'combat', cog:8,  label:'전  투', mainText:'8',  color:'#c03828', border:0x882018, weight:4  },
  { type:'combat', cog:9,  label:'전  투', mainText:'9',  color:'#cc2828', border:0x901818, weight:3  },
  { type:'combat', cog:10, label:'전  투', mainText:'10', color:'#e01818', border:0xa80808, weight:2  },
];

function drawCard(): ExploreCard {
  const total = EXPLORE_CARDS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const card of EXPLORE_CARDS) { r -= card.weight; if (r <= 0) return card; }
  return EXPLORE_CARDS[0];
}

function makeSlotStrip(count: number): ExploreCard[] {
  return Array.from({ length: count }, () => drawCard());
}

interface SlotObj {
  cx: number; cy: number; cw: number; ch: number;
  frame:    Phaser.GameObjects.Graphics;
  strip:    ExploreCard[];
  stripCt:  Phaser.GameObjects.Container;
  maskShape: Phaser.GameObjects.Graphics;
  hitArea:  Phaser.GameObjects.Rectangle;
  targetCard: ExploreCard | null;
  stopped:  boolean;
  idx:      number;
}

export class ExploreScene extends Phaser.Scene {
  constructor() { super({ key: 'ExploreScene' }); }

  private _from = 'AtelierScene';
  private W = 0;
  private H = 0;
  private _phase:     string = 'spinning';
  private _results:   (ExploreCard | null)[] = [null, null, null];
  private _chosen     = -1;
  private _canChoose  = false;
  private _slots:     SlotObj[] = [];
  private _hintText!: Phaser.GameObjects.Text;
  private _spinTimer!: Phaser.Time.TimerEvent;

  init(data: { from?: string }): void {
    this._from = data.from || 'AtelierScene';
  }

  create(): void {
    clearAllSceneDom();

    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    this._phase    = 'spinning';
    this._results  = [null, null, null];
    this._chosen   = -1;
    this._canChoose = false;

    this._buildBackground(W, H);
    this._buildHeader(W, H);
    this._buildSlots(W, H);
    this._startSpin();
  }

  // ── 배경 ──────────────────────────────────────────────────────
  private _buildBackground(W: number, H: number): void {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x1a0e06, 0.18);
      scan.lineBetween(0, y, W, y);
    }
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    grid.lineStyle(1, 0x0f0a05, 0.5);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);

    this.add.text(W / 2, H / 2, 'EXPLORE', {
      fontSize: FontManager.adjustedSize(90, this.scale),
      color: '#0a0705',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.08);
  }

  // ── 헤더 ──────────────────────────────────────────────────────
  private _buildHeader(W: number, H: number): void {
    this.add.text(W / 2, H * 0.09, '난이도  선택', {
      fontSize:   FontManager.adjustedSize(28, this.scale),
      color:      '#6b4020',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    this.add.text(
      W / 2,
      H * 0.09 + parseInt(FontManager.adjustedSize(26, this.scale)),
      'SELECT DIFFICULTY — COG LIMIT',
      {
        fontSize:      FontManager.adjustedSize(11, this.scale),
        color:         '#2a1508',
        fontFamily:    FontManager.MONO,
        letterSpacing: 4,
      }
    ).setOrigin(0.5);

    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x2a1a0a, 0.8);
    lineG.lineBetween(W * 0.05, H * 0.17, W * 0.95, H * 0.17);

    this._hintText = this.add.text(W / 2, H * 0.21, '난이도를 불러오는 중...', {
      fontSize:   FontManager.adjustedSize(13, this.scale),
      color:      '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
  }

  // ── 슬롯 빌드 ─────────────────────────────────────────────────
  private _buildSlots(W: number, H: number): void {
    const cardW  = W * 0.20;
    const cardH  = H * 0.58;
    const cardY  = H * 0.545;
    const gap    = W * 0.025;
    const totalW = cardW * 3 + gap * 2;
    const startX = W / 2 - totalW / 2;

    this._slots = [];
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + gap) + cardW / 2;
      this._slots.push(this._buildOneSlot(cx, cardY, cardW, cardH, i));
    }
  }

  private _buildOneSlot(cx: number, cy: number, cw: number, ch: number, idx: number): SlotObj {
    const frame = this.add.graphics();
    frame.lineStyle(1, 0x2a1a0a, 0.7);
    frame.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);

    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    const mask = maskShape.createGeometryMask();

    const strip   = makeSlotStrip(22);
    const stripCt = this.add.container(cx, cy - ch / 2);
    stripCt.setMask(mask);

    strip.forEach((card, i) => {
      this._buildCardInStrip(stripCt, card, i * ch + ch / 2, cw, ch);
    });

    const hitArea = this.add.rectangle(cx, cy, cw, ch, 0x000000, 0).setDepth(10);

    return { cx, cy, cw, ch, frame, strip, stripCt, maskShape, hitArea, targetCard: null, stopped: false, idx };
  }

  private _buildCardInStrip(
    container: Phaser.GameObjects.Container,
    card: ExploreCard, itemY: number, cw: number, ch: number
  ): void {
    const bg    = this.add.graphics();
    const inset = Math.round(cw * 0.004);
    bg.fillStyle(0x0c0a07, 1);
    bg.lineStyle(1, card.border, 0.35);
    bg.strokeRect(-cw / 2 + inset, itemY - ch / 2 + inset, cw - inset * 2, ch - inset * 2);
    bg.fillRect  (-cw / 2 + inset, itemY - ch / 2 + inset, cw - inset * 2, ch - inset * 2);
    container.add(bg);

    const cogLabel = this.add.text(0, itemY - ch * 0.25, 'COG', {
      fontSize: FontManager.adjustedSize(11, this.scale),
      color: card.color, fontFamily: FontManager.MONO, letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0.55);

    const numTxt = this.add.text(0, itemY - ch * 0.03, card.mainText, {
      fontSize: FontManager.adjustedSize(62, this.scale),
      color: card.color, fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const typeTxt = this.add.text(0, itemY + ch * 0.26, card.label, {
      fontSize: FontManager.adjustedSize(13, this.scale),
      color: card.color, fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0.8);

    const deco = this.add.graphics();
    deco.lineStyle(1, card.border, 0.35);
    deco.lineBetween(-cw * 0.25, itemY + ch * 0.20, cw * 0.25, itemY + ch * 0.20);

    container.add([cogLabel, numTxt, typeTxt, deco]);
  }

  // ── 스핀 시작 ─────────────────────────────────────────────────
  private _startSpin(): void {
    const stopDelays = [1400, 2200, 3000];

    this._slots.forEach((slot, i) => {
      const totalItems   = slot.strip.length;
      const finalCardIdx = totalItems - 2;
      slot.targetCard    = slot.strip[finalCardIdx];
      const spinDist     = slot.ch * (totalItems - 2);

      this.tweens.add({
        targets:  slot.stripCt,
        y:        slot.cy - slot.ch / 2 - spinDist,
        duration: stopDelays[i] + 600,
        ease:     'Cubic.easeOut',
        onComplete: () => {
          slot.stopped   = true;
          this._results[i] = slot.targetCard;
          this._onSlotStopped(i);
        },
      });
    });

    let dotCount = 0;
    this._spinTimer = this.time.addEvent({
      delay: 400, loop: true,
      callback: () => {
        this._hintText.setText(
          '난이도를 불러오는 중  ' + ['·', '· ·', '· · ·'][dotCount++ % 3]
        );
      },
    });
  }

  private _onSlotStopped(idx: number): void {
    const slot = this._slots[idx];
    slot.frame.clear();
    slot.frame.lineStyle(2, slot.targetCard!.border, 1);
    slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);

    if (!this._slots.every(s => s.stopped)) return;

    this._spinTimer.remove();
    this._phase    = 'stopped';
    this._canChoose = true;
    this._hintText.setText('난이도를 선택하십시오  —  선택 후 탐사 진입');
    this._hintText.setStyle({ color: '#8a6040' });
    this._enableCardSelection();
  }

  private _enableCardSelection(): void {
    this._slots.forEach((slot) => {
      const hit = slot.hitArea;
      hit.setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (this._chosen >= 0) return;
        slot.frame.clear();
        slot.frame.lineStyle(2, slot.targetCard!.border, 1);
        slot.frame.fillStyle(0x140c05, 0.35);
        slot.frame.fillRect  (slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
        slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      });
      hit.on('pointerout', () => {
        if (this._chosen >= 0) return;
        slot.frame.clear();
        slot.frame.lineStyle(2, slot.targetCard!.border, 1);
        slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      });
      hit.on('pointerdown', () => {
        if (!this._canChoose || this._chosen >= 0) return;
        this._chooseCard(slot.idx);
      });
    });
  }

  private _chooseCard(idx: number): void {
    this._chosen    = idx;
    this._canChoose = false;
    this._phase     = 'chosen';

    const chosen = this._slots[idx];
    chosen.frame.clear();
    chosen.frame.lineStyle(3, chosen.targetCard!.border, 1);
    chosen.frame.fillStyle(0x1e1008, 0.45);
    chosen.frame.fillRect  (chosen.cx - chosen.cw / 2, chosen.cy - chosen.ch / 2, chosen.cw, chosen.ch);
    chosen.frame.strokeRect(chosen.cx - chosen.cw / 2, chosen.cy - chosen.ch / 2, chosen.cw, chosen.ch);

    this._slots.forEach((slot, i) => {
      if (i === idx) return;
      slot.frame.clear();
      slot.frame.lineStyle(1, 0x1a1008, 0.3);
      slot.frame.fillStyle(0x000000, 0.55);
      slot.frame.fillRect  (slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      slot.hitArea.disableInteractive();
    });

    const card = chosen.targetCard!;
    this._hintText.setText(`Cog ${card.cog}  —  탐사 진입`);
    this._hintText.setStyle({ color: card.color });

    this.time.delayedCall(900, () => this._transitionToResult(card));
  }

  private _transitionToResult(card: ExploreCard): void {
    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 400, ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.start('DiveScene', {
          cogMax:   card.cog,
          round:    1,
          maxRound: 5,
          deepCoin: 0,
          log:      [],
        });
      },
    });
  }
}
