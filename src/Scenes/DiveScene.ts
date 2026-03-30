// ================================================================
//  DiveScene.ts
//  경로: src/Scenes/DiveScene.ts
//
//  역할: 탐사 로비 씬
//        Phaser3: 배경 그리드, 상단 HUD, 배틀슬롯 3개, 탈출 버튼
//        CSS DOM:  좌측 탭 컬럼, 슬라이딩 패널 (인벤/잠수정/상점/파티/일지)
// ================================================================

import { FontManager }      from '../Managers/FontManager';
import { InputManager }     from '../Managers/InputManager';
import { SaveManager }      from '../Managers/SaveManager';
import { CharacterManager } from '../Managers/CharacterManager';
import { clearAllSceneDom } from '../utils/sceneCleanup';
import {
  renderInventory, renderSubmarine, renderShop,
  renderParty, renderJournal,
  SHOP_DEFAULTS, INV_MAX, SUB_COLS, SUB_ROWS,
  type InventoryItem, type AugmentItem, type ShopItem,
  type LogEntry, type SubmarineData,
} from './Dives/DivePanels';

// ── 슬롯 카드 정의 ───────────────────────────────────────────────
const DIVE_SLOT_STATE_KEY = 'nr_dive_slot_state';

interface SlotCard {
  type:      'normal' | 'wave' | 'raid';
  label:     string;
  desc:      string;
  color:     string;
  borderHex: number;
  weight:    number;
}

const DIVE_SLOT_CARDS: SlotCard[] = [
  { type: 'normal', label: '일  반  전', desc: '무작위 이형이 출현한다',               color: '#8a9060', borderHex: 0x505828, weight: 5 },
  { type: 'wave',   label: '웨  이  브', desc: '다수의 이형이 떼를 지어 몰려온다',    color: '#406090', borderHex: 0x284868, weight: 3 },
  { type: 'raid',   label: '레  이  드', desc: '강대한 이형 하나가 단독으로 나타난다', color: '#904030', borderHex: 0x682818, weight: 2 },
];

interface SlotObj {
  frame:      Phaser.GameObjects.Graphics;
  emptyBg:    Phaser.GameObjects.Graphics;
  stripCt:    Phaser.GameObjects.Container;
  cx: number; cy: number; cw: number; ch: number;
  stopped:    boolean;
  targetCard: SlotCard | null;
  hitArea:    Phaser.GameObjects.Rectangle;
}

// ── 초기화 데이터 ───────────────────────────────────────────────
interface DiveInitData {
  cogMax?:      number;
  round?:       number;
  maxRound?:    number;
  deepCoin?:    number;
  log?:         LogEntry[];
  battleParty?: string[];
  inventory?:   (InventoryItem | null)[] | null;
  submarine?:   SubmarineData | null;
  shopItems?:   ShopItem[] | null;
}

type TabId = 'inventory' | 'submarine' | 'shop' | 'party' | 'journal';
const TAB_LABELS: Record<TabId, string> = {
  inventory: '인벤토리',
  submarine: '잠수정',
  shop:      '심해 상점',
  party:     '파티 관리',
  journal:   '탐사 일지',
};
const WIDE_TABS = new Set<TabId>(['submarine', 'shop']);

// ================================================================
//  DiveScene
// ================================================================
export class DiveScene extends Phaser.Scene {
  constructor() { super({ key: 'DiveScene' }); }

  // ── 상태 ─────────────────────────────────────────────────────
  private _cogMax      = 1;
  private _round       = 1;
  private _maxRound    = 5;
  private _deepCoin    = 0;
  private _log:        LogEntry[]              = [];
  private _battleParty: string[]              = [];
  private _inventory:  (InventoryItem | null)[] = [];
  private _submarine:  SubmarineData          = { pending: [], grid: [] };
  private _shopItems:  ShopItem[]             = [];

  // ── Phaser 오브젝트 ──────────────────────────────────────────
  W = 0; H = 0;
  private _sceneHits: Phaser.GameObjects.GameObject[] = [];
  private _hudTexts:  Phaser.GameObjects.Text[]       = [];

  // ── 슬롯 머신 상태 ────────────────────────────────────────────
  private _phase:     'idle' | 'spinning' | 'stopped' | 'chosen' = 'idle';
  private _slots:     SlotObj[]         = [];
  private _results:   (SlotCard|null)[] = [null, null, null];
  private _chosen     = -1;
  private _canChoose  = false;
  private _spinTimer: Phaser.Time.TimerEvent | null = null;
  private _hintText!: Phaser.GameObjects.Text;
  private _leverX     = 0;
  private _leverCY    = 0;
  private _leverW     = 0;
  private _leverH     = 0;
  private _leverKnobY = 0;
  private _leverKnob!:     Phaser.GameObjects.Graphics;
  private _leverHit!:      Phaser.GameObjects.Rectangle;
  private _leverLabelTxt!: Phaser.GameObjects.Text;
  private _rerollTxt!:     Phaser.GameObjects.Text;
  private _drawLever!:     (state: 'idle'|'hover'|'active'|'pulling'|'disabled') => void;
  private _deepCoinTxt:    Phaser.GameObjects.Text | null = null;

  // ── CSS DOM ───────────────────────────────────────────────────
  private _rootEl!:   HTMLElement;
  private _dimEl!:    HTMLElement;
  private _panelEl!:  HTMLElement;
  private _bodyEl!:   HTMLElement;
  private _titleEl!:  HTMLElement;
  private _closeBtn!: HTMLElement;
  private _tabBtns:   Map<TabId, HTMLElement> = new Map();
  private _activeTab: TabId | null            = null;

  // ================================================================
  //  init / create / shutdown
  // ================================================================
  init(data: DiveInitData): void {
    this._cogMax      = data.cogMax      ?? 1;
    this._round       = data.round       ?? 1;
    this._maxRound    = data.maxRound    ?? 5;
    this._deepCoin    = data.deepCoin    ?? 0;
    this._log         = data.log         ?? [];
    this._battleParty = data.battleParty?.length
      ? data.battleParty
      : ((CharacterManager as unknown as { loadParty?: () => string[] }).loadParty?.() ?? []);

    this._inventory = Array.isArray(data.inventory) && data.inventory.length === INV_MAX
      ? data.inventory
      : new Array(INV_MAX).fill(null);

    this._submarine = data.submarine && Array.isArray(data.submarine.grid)
      ? data.submarine
      : { pending: [], grid: new Array(SUB_COLS * SUB_ROWS).fill(null) };

    this._shopItems = Array.isArray(data.shopItems) && data.shopItems.length
      ? data.shopItems
      : SHOP_DEFAULTS.map(i => ({ ...i }));

    this._sceneHits  = [];
    this._hudTexts   = [];
    this._tabBtns    = new Map();
    this._activeTab  = null;
    this._phase      = 'idle';
    this._slots      = [];
    this._results    = [null, null, null];
    this._chosen     = -1;
    this._canChoose  = false;
    this._spinTimer  = null;
    this._deepCoinTxt = null;
  }

  create(): void {
    clearAllSceneDom();
    const { width: W, height: H } = this.scale;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    SaveManager.saveCurrentScene('DiveScene', {
      cogMax: this._cogMax, round: this._round, maxRound: this._maxRound,
      deepCoin: this._deepCoin, log: this._log, battleParty: this._battleParty,
      inventory: this._inventory, submarine: this._submarine, shopItems: this._shopItems,
    });

    if (this._round > this._maxRound) {
      this.time.delayedCall(300, () => this._exitExpedition());
      return;
    }

    this._buildBackground(W, H);
    this._buildTopPanel(W, H);
    this._buildSlots(W, H);
    this._buildExitBtn(W, H);
    this._buildTabSystem();
  }

  shutdown(): void {
    this._sceneHits.forEach(h => { try { h.destroy(); } catch (_) {} });
    this._sceneHits = [];
    this._rootEl?.remove();
  }

  // ================================================================
  //  Phaser: 배경
  // ================================================================
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

  // ================================================================
  //  Phaser: 상단 HUD
  // ================================================================
  private _buildTopPanel(W: number, H: number): void {
    const topH    = H * 0.08;
    const tabColW = W * 0.095;
    this.add.rectangle(0, 0, W, topH, 0x0a0805, 0.95).setOrigin(0);
    this.add.graphics().setDepth(1).lineStyle(1, 0x2a1a0a, 0.8)
      .lineBetween(0, topH, W, topH);

    const items: [number, string][] = [
      [0.20, `심해화폐  ${this._deepCoin}`],
      [0.38, `ROUND  ${this._round} / ${this._maxRound}`],
      [0.58, `COG  ${this._cogMax}`],
      [0.76, `파티  ${this._battleParty.length}명`],
    ];
    items.forEach(([xRatio, label]) => {
      const txt = this.add.text(
        tabColW + (W - tabColW) * xRatio, topH / 2, label, {
          fontSize: FontManager.adjustedSize(13, this.scale),
          color: '#5a3a18', fontFamily: FontManager.MONO,
        }).setOrigin(0, 0.5).setDepth(2);
      this._hudTexts.push(txt);
    });
  }

  // ================================================================
  //  Phaser: 슬롯 머신 영역
  // ================================================================
  private _buildSlots(W: number, H: number): void {
    const fs     = (n: number) => FontManager.adjustedSize(n, this.scale);
    const tabW   = W * 0.10;
    const topH   = H * 0.13;
    const areaX  = tabW;
    const areaY  = topH;
    const areaW  = W - tabW;
    const areaH  = H - topH;

    // 라운드 헤더
    this.add.text(areaX + areaW * 0.44, areaY + areaH * 0.04,
      `ROUND  ${this._round}  —  SELECT ENCOUNTER`, {
        fontSize: fs(10), color: '#1e1008', fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(2);

    // 힌트 텍스트
    this._hintText = this.add.text(areaX + areaW * 0.44, areaY + areaH * 0.10,
      '슬롯을 돌려 라운드를 결정하십시오', {
        fontSize: fs(12), color: '#2a1508', fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(2);

    // 구분선
    this.add.graphics().setDepth(2)
      .lineStyle(1, 0x2a1a0a, 0.6)
      .lineBetween(areaX + W * 0.004, areaY + areaH * 0.16, areaX + areaW * 0.88, areaY + areaH * 0.16);

    // 슬롯 3개
    const slotZoneW = areaW * 0.86;
    const cw  = Math.round(slotZoneW * 0.26);
    const ch  = Math.min(Math.round(areaH * 0.62), Math.round(H * 0.55));
    const cy  = areaY + areaH * 0.50;
    const gap = (slotZoneW - cw * 3) / 4;
    const startX = areaX + gap + cw / 2;

    this._slots = [];
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cw + gap);
      this._slots.push(this._buildOneSlot(cx, cy, cw, ch));
    }

    // 레버
    this._buildLever(areaX, areaY, areaW, areaH, fs);

    // 저장된 결과 복원
    this._restoreSlotState();
  }

  private _buildOneSlot(cx: number, cy: number, cw: number, ch: number): SlotObj {
    const frame = this.add.graphics().setDepth(3);
    frame.lineStyle(1, 0x2a1a0a, 0.6);
    frame.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);

    const emptyBg = this.add.graphics().setDepth(3);
    emptyBg.fillStyle(0x080806, 1);
    emptyBg.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);

    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    const geomMask = maskShape.createGeometryMask();

    const stripCt = this.add.container(cx, cy - ch / 2).setDepth(4);
    stripCt.setMask(geomMask);

    const hitArea = this.add.rectangle(cx, cy, cw, ch, 0, 0).setDepth(6);
    return { frame, emptyBg, stripCt, cx, cy, cw, ch, stopped: false, targetCard: null, hitArea };
  }

  private _renderStrip(container: Phaser.GameObjects.Container, strip: SlotCard[], cw: number, ch: number): void {
    const fs = (n: number) => FontManager.adjustedSize(n, this.scale);
    strip.forEach((card, j) => {
      const cardY = j * ch;
      const bg = this.add.graphics();
      bg.fillStyle(0x0e0c08, 1);
      bg.lineStyle(1, card.borderHex, 0.5);
      bg.fillRect(-cw / 2, cardY, cw, ch);
      bg.strokeRect(-cw / 2, cardY, cw, ch);
      const mainTxt = this.add.text(0, cardY + ch * 0.38, card.label, {
        fontSize: fs(16), color: card.color, fontFamily: FontManager.TITLE,
        align: 'center', wordWrap: { width: cw * 0.85 },
      }).setOrigin(0.5);
      const descTxt = this.add.text(0, cardY + ch * 0.62, card.desc, {
        fontSize: fs(9), color: card.color, fontFamily: FontManager.MONO,
        align: 'center', wordWrap: { width: cw * 0.82 },
      }).setOrigin(0.5).setAlpha(0.7);
      container.add([bg, mainTxt, descTxt]);
    });
  }

  private _drawCard(slot: SlotObj, card: SlotCard): void {
    const fs = (n: number) => FontManager.adjustedSize(n, this.scale);
    slot.stripCt.removeAll(true);
    const bg = this.add.graphics();
    bg.fillStyle(0x0e0c08, 1);
    bg.lineStyle(1, card.borderHex, 0.8);
    bg.fillRect(-slot.cw / 2, 0, slot.cw, slot.ch);
    bg.strokeRect(-slot.cw / 2, 0, slot.cw, slot.ch);
    const mainTxt = this.add.text(0, slot.ch * 0.38, card.label, {
      fontSize: fs(16), color: card.color, fontFamily: FontManager.TITLE,
      align: 'center', wordWrap: { width: slot.cw * 0.85 },
    }).setOrigin(0.5);
    const descTxt = this.add.text(0, slot.ch * 0.62, card.desc, {
      fontSize: fs(9), color: card.color, fontFamily: FontManager.MONO,
      align: 'center', wordWrap: { width: slot.cw * 0.82 },
    }).setOrigin(0.5).setAlpha(0.7);
    slot.stripCt.add([bg, mainTxt, descTxt]);
    slot.stripCt.setY(slot.cy - slot.ch / 2);
  }

  private _buildLever(areaX: number, areaY: number, areaW: number, areaH: number, fs: (n: number) => string): void {
    const leverX  = areaX + areaW * 0.92;
    const leverCY = areaY + areaH * 0.52;
    const leverW  = Math.round(areaW * 0.075);
    const leverH  = Math.round(areaH * 0.55);

    this._leverX      = leverX;
    this._leverCY     = leverCY;
    this._leverW      = leverW;
    this._leverH      = leverH;
    this._leverKnobY  = leverCY - leverH * 0.35;

    const leverBg = this.add.graphics().setDepth(3);
    this._drawLever = (state) => {
      leverBg.clear();
      if      (state === 'disabled') { leverBg.fillStyle(0x080a08, 1); leverBg.lineStyle(1, 0x1a2a1a, 0.4); }
      else if (state === 'hover')    { leverBg.fillStyle(0x1a3a1a, 1); leverBg.lineStyle(2, 0x70d070, 1);   }
      else if (state === 'active')   { leverBg.fillStyle(0x142014, 1); leverBg.lineStyle(2, 0x50a050, 0.9); }
      else                           { leverBg.fillStyle(0x0a280a, 1); leverBg.lineStyle(2, 0x80ff80, 1);   }
      leverBg.fillRect(leverX - leverW / 2, leverCY - leverH / 2, leverW, leverH);
      leverBg.strokeRect(leverX - leverW / 2, leverCY - leverH / 2, leverW, leverH);
    };
    this._drawLever('active');

    // 기둥
    this.add.graphics().setDepth(3)
      .lineStyle(3, 0x305030, 0.8)
      .lineBetween(leverX, leverCY - leverH * 0.35, leverX, leverCY + leverH * 0.1);

    // 손잡이
    this._leverKnob = this.add.graphics().setDepth(4);
    this._drawKnob(this._leverKnobY);

    // 라벨
    this._leverLabelTxt = this.add.text(leverX, leverCY + leverH * 0.38, '▶ 당기기', {
      fontSize: fs(9), color: '#50a050', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(4);

    this._rerollTxt = this.add.text(leverX, leverCY + leverH * 0.52, `◈ ${this._deepCoin}`, {
      fontSize: fs(9), color: '#2a3a50', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(4).setAlpha(0);

    const hit = this.add.rectangle(leverX, leverCY, leverW, leverH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(10);
    this._leverHit = hit;
    this._sceneHits.push(hit);

    hit.on('pointerover', () => {
      if (this._phase === 'idle')    { this._drawLever('hover'); this._leverLabelTxt.setStyle({ color: '#80ff80' }); }
      if (this._phase === 'stopped' && this._deepCoin > 0) { this._drawLever('hover'); this._rerollTxt.setStyle({ color: '#6ab0e0' }); }
    });
    hit.on('pointerout', () => {
      if (this._phase === 'idle')    { this._drawLever('active'); this._leverLabelTxt.setStyle({ color: '#50a050' }); }
      if (this._phase === 'stopped') { this._drawLever('active'); this._rerollTxt.setStyle({ color: '#2a3a50' }); }
    });
    hit.on('pointerdown', () => {
      if (this._phase === 'idle') {
        this._drawLever('pulling');
        this._animLeverPull(() => this._startSpin());
      } else if (this._phase === 'stopped' && this._deepCoin > 0) {
        this._deepCoin -= 1;
        this._rerollTxt.setText(`◈ ${this._deepCoin}`);
        this._updateDeepCoinHUD();
        this._resetSlots();
        this._animLeverPull(() => this._startSpin());
      }
    });
  }

  private _drawKnob(y: number): void {
    this._leverKnob.clear();
    this._leverKnob.fillStyle(0x60a060, 1);
    this._leverKnob.fillCircle(this._leverX, y, this._leverW * 0.28);
    this._leverKnob.lineStyle(2, 0x80d080, 0.8);
    this._leverKnob.strokeCircle(this._leverX, y, this._leverW * 0.28);
  }

  private _animLeverPull(onComplete: () => void): void {
    const startY   = this._leverKnobY;
    const pullY    = this._leverCY + this._leverH * 0.1;
    let   progress = 0;
    this.time.addEvent({
      delay: 16, repeat: 18,
      callback: () => {
        progress++;
        const y = progress <= 9
          ? startY + (pullY - startY) * (progress / 9)
          : pullY  + (startY - pullY) * ((progress - 9) / 9);
        this._drawKnob(y);
        if (progress >= 18) { this._drawKnob(startY); onComplete(); }
      },
    });
  }

  private _diveDrawCard(total?: number): SlotCard {
    const tot = total ?? DIVE_SLOT_CARDS.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * tot;
    for (const card of DIVE_SLOT_CARDS) { r -= card.weight; if (r <= 0) return card; }
    return DIVE_SLOT_CARDS[0];
  }

  private _makeStrip(count: number): SlotCard[] {
    return Array.from({ length: count }, () => this._diveDrawCard());
  }

  private _startSpin(): void {
    this._phase     = 'spinning';
    this._results   = [null, null, null];
    this._chosen    = -1;
    this._canChoose = false;

    this._drawLever('disabled');
    this._leverHit.disableInteractive();
    this._leverLabelTxt.setStyle({ color: '#2a4a2a' });
    this._rerollTxt.setAlpha(0);
    this._hintText.setText('라운드를 결정하는 중...');
    this._hintText.setStyle({ color: '#2a1508' });

    const stopDelays = [1400, 2200, 3000];
    this._slots.forEach((slot, i) => {
      if (slot.emptyBg) slot.emptyBg.setVisible(false);
      const strip    = this._makeStrip(22);
      slot.stopped   = false;
      slot.targetCard = strip[strip.length - 2];
      slot.stripCt.removeAll(true);
      this._renderStrip(slot.stripCt, strip, slot.cw, slot.ch);
      slot.stripCt.setY(slot.cy - slot.ch / 2);

      this.tweens.add({
        targets:  slot.stripCt,
        y:        slot.cy - slot.ch / 2 - slot.ch * (strip.length - 2),
        duration: stopDelays[i] + 600,
        ease:     'Cubic.easeOut',
        onComplete: () => {
          slot.stopped    = true;
          this._results[i] = slot.targetCard;
          this._onSlotStopped(i);
        },
      });
    });

    let dotCount = 0;
    this._spinTimer = this.time.addEvent({
      delay: 400, loop: true,
      callback: () => {
        this._hintText.setText('라운드를 결정하는 중  ' + ['·', '· ·', '· · ·'][dotCount++ % 3]);
      },
    });
  }

  private _onSlotStopped(idx: number): void {
    const slot = this._slots[idx];
    slot.frame.clear();
    slot.frame.lineStyle(2, slot.targetCard!.borderHex, 1);
    slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);

    if (!this._slots.every(s => s.stopped)) return;

    if (this._spinTimer) { this._spinTimer.remove(); this._spinTimer = null; }
    this._phase     = 'stopped';
    this._canChoose = true;
    this._hintText.setText('라운드 유형을 선택하십시오');
    this._hintText.setStyle({ color: '#8a6040' });

    if (this._deepCoin > 0) {
      this._drawLever('active');
      this._leverLabelTxt.setText('◈ 재굴림').setStyle({ color: '#2a3a50' });
      this._rerollTxt.setText(`심해화폐 ${this._deepCoin}`).setAlpha(1);
      this._leverHit.setInteractive({ useHandCursor: true });
    } else {
      this._drawLever('disabled');
      this._leverLabelTxt.setText('재굴림 불가').setStyle({ color: '#2a1a0a' });
    }

    this._saveSlotState();
    this._enableCardSelection();
  }

  private _enableCardSelection(): void {
    this._slots.forEach((slot, i) => {
      const hit = slot.hitArea;
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => {
        if (this._chosen >= 0) return;
        slot.frame.clear();
        slot.frame.lineStyle(2, slot.targetCard!.borderHex, 1);
        slot.frame.fillStyle(0x140c05, 0.3);
        slot.frame.fillRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
        slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      });
      hit.on('pointerout', () => {
        if (this._chosen >= 0) return;
        slot.frame.clear();
        slot.frame.lineStyle(2, slot.targetCard!.borderHex, 1);
        slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      });
      hit.on('pointerdown', () => {
        if (!this._canChoose || this._chosen >= 0) return;
        this._chooseCard(i);
      });
    });
  }

  private _chooseCard(idx: number): void {
    this._chosen    = idx;
    this._canChoose = false;
    this._phase     = 'chosen';

    this._drawLever('disabled');
    this._leverHit.disableInteractive();
    this._rerollTxt.setAlpha(0);

    const chosen = this._slots[idx];
    chosen.frame.clear();
    chosen.frame.lineStyle(3, chosen.targetCard!.borderHex, 1);
    chosen.frame.fillStyle(0x1e1008, 0.4);
    chosen.frame.fillRect(chosen.cx - chosen.cw / 2, chosen.cy - chosen.ch / 2, chosen.cw, chosen.ch);
    chosen.frame.strokeRect(chosen.cx - chosen.cw / 2, chosen.cy - chosen.ch / 2, chosen.cw, chosen.ch);

    this._slots.forEach((slot, i) => {
      if (i === idx) return;
      slot.frame.clear();
      slot.frame.lineStyle(1, 0x1a1008, 0.3);
      slot.frame.fillStyle(0x000000, 0.55);
      slot.frame.fillRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      slot.hitArea.disableInteractive();
    });

    const card = chosen.targetCard!;
    this._hintText.setText(`${card.label.replace(/\s/g, '')}  —  전투 진입`);
    this._hintText.setStyle({ color: card.color });

    this._log.push({
      round: this._round, type: card.type as 'normal' | 'wave' | 'raid',
      result: 'pending', note: `R${this._round}  ${card.label.replace(/\s/g, '')}`,
    } as unknown as LogEntry);

    this._clearSlotState();
    this.time.delayedCall(800, () => this._enterBattle(card.type));
  }

  private _resetSlots(): void {
    this._clearSlotState();
    this._slots.forEach(slot => {
      slot.stopped    = false;
      slot.targetCard = null;
      slot.stripCt.removeAll(true);
      if (slot.emptyBg) slot.emptyBg.setVisible(true);
      slot.frame.clear();
      slot.frame.lineStyle(1, 0x2a1a0a, 0.6);
      slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      slot.hitArea.disableInteractive();
    });
    this._phase = 'idle';
    this._drawLever('active');
    this._leverLabelTxt.setText('▶ 당기기').setStyle({ color: '#50a050' });
    this._leverHit.setInteractive({ useHandCursor: true });
  }

  private _restoreSlotState(): void {
    try {
      const raw = localStorage.getItem(DIVE_SLOT_STATE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as { phase: string; results: (string|null)[] };
      if (state.phase !== 'stopped' || !Array.isArray(state.results)) return;
      const restored = state.results.map(t => t ? DIVE_SLOT_CARDS.find(c => c.type === t) ?? null : null);
      if (!restored.every(c => c !== null)) return;

      this._slots.forEach((slot, i) => {
        const card = restored[i]!;
        slot.targetCard = card;
        slot.stopped    = true;
        if (slot.emptyBg) slot.emptyBg.setVisible(false);
        this._drawCard(slot, card);
        slot.frame.clear();
        slot.frame.lineStyle(2, card.borderHex, 1);
        slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      });

      this._results   = restored;
      this._phase     = 'stopped';
      this._canChoose = true;
      this._hintText.setText('라운드 유형을 선택하십시오');
      this._hintText.setStyle({ color: '#8a6040' });

      if (this._deepCoin > 0) {
        this._drawLever('active');
        this._leverLabelTxt.setText('◈ 재굴림').setStyle({ color: '#2a3a50' });
        this._rerollTxt.setText(`심해화폐 ${this._deepCoin}`).setAlpha(1);
        this._leverHit.setInteractive({ useHandCursor: true });
      } else {
        this._drawLever('disabled');
        this._leverLabelTxt.setText('재굴림 불가').setStyle({ color: '#2a1a0a' });
      }
      this._enableCardSelection();
    } catch (_) {}
  }

  private _saveSlotState(): void {
    const state = {
      phase:   this._phase,
      chosen:  this._chosen,
      results: this._results.map(r => r?.type ?? null),
    };
    localStorage.setItem(DIVE_SLOT_STATE_KEY, JSON.stringify(state));
  }

  private _clearSlotState(): void {
    localStorage.removeItem(DIVE_SLOT_STATE_KEY);
  }

  private _updateDeepCoinHUD(): void {
    if (this._hudTexts[0]) this._hudTexts[0].setText(`심해화폐  ${this._deepCoin}`);
    if (this._deepCoinTxt) this._deepCoinTxt.setText(`${this._deepCoin}`);
  }

  // ================================================================
  //  Phaser: 탈출 버튼
  // ================================================================
  private _buildExitBtn(W: number, H: number): void {
    const tabColW = W * 0.095;
    const bx = tabColW + (W - tabColW) / 2;
    const by = H * 0.90;
    const txt = this.add.text(bx, by, '[ 탐사 철수 ]', {
      fontSize: FontManager.adjustedSize(13, this.scale),
      color: '#3a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });
    txt.on('pointerover', () => txt.setStyle({ color: '#c8a070' }));
    txt.on('pointerout',  () => txt.setStyle({ color: '#3a2a10' }));
    txt.on('pointerdown', () => this._exitExpedition());
    this._sceneHits.push(txt);
  }

  // ================================================================
  //  CSS DOM: 탭 시스템
  // ================================================================
  private _buildTabSystem(): void {
    const root = document.createElement('div');
    root.id = 'dive-root';
    this._rootEl = root;

    // 딤
    const dim = document.createElement('div');
    dim.id = 'dive-dim';
    dim.addEventListener('click', () => this._closeTab());
    this._dimEl = dim;

    // 탭 컬럼
    const col = document.createElement('div');
    col.id = 'dive-tab-col';
    (['inventory','submarine','shop','party','journal'] as TabId[]).forEach(id => {
      const btn = document.createElement('button');
      btn.className = 'dive-tab-btn';
      btn.textContent = TAB_LABELS[id];
      btn.addEventListener('click', () => this._toggleTab(id));
      this._tabBtns.set(id, btn);
      col.appendChild(btn);
    });
    col.appendChild(Object.assign(document.createElement('div'), { className: 'dive-tab-spacer' }));

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dive-close-btn';
    closeBtn.textContent = '닫  기';
    closeBtn.addEventListener('click', () => this._closeTab());
    this._closeBtn = closeBtn;
    col.appendChild(closeBtn);

    // 슬라이딩 패널
    const panel = document.createElement('div');
    panel.id = 'dive-panel';
    this._panelEl = panel;

    const header = document.createElement('div');
    header.className = 'dive-panel__header';
    const title  = document.createElement('div');
    title.className = 'dive-panel__title';
    this._titleEl = title;
    header.appendChild(title);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'dive-panel__body';
    this._bodyEl = body;
    panel.appendChild(body);

    root.appendChild(dim);
    root.appendChild(col);
    root.appendChild(panel);
    document.body.appendChild(root);
  }

  // ================================================================
  //  탭 열기 / 닫기
  // ================================================================
  private _toggleTab(id: TabId): void {
    if (this._activeTab === id && this._panelEl.classList.contains('open')) {
      this._closeTab();
    } else {
      this._openTab(id);
    }
  }

  private _openTab(id: TabId): void {
    this._activeTab = id;
    this._titleEl.textContent = TAB_LABELS[id].split('').join('  ');
    this._panelEl.classList.toggle('wide', WIDE_TABS.has(id));
    this._bodyEl.innerHTML = '';
    this._fillPanel(id, this._bodyEl);
    this._panelEl.classList.add('open');
    this._dimEl.classList.add('visible');
    this._closeBtn.classList.add('visible');
    this._refreshTabBtns();
  }

  private _closeTab(): void {
    this._activeTab = null;
    this._panelEl.classList.remove('open');
    this._dimEl.classList.remove('visible');
    this._closeBtn.classList.remove('visible');
    this._refreshTabBtns();
  }

  private _refreshTabBtns(): void {
    this._tabBtns.forEach((btn, id) =>
      btn.classList.toggle('active', id === this._activeTab)
    );
  }

  // ================================================================
  //  패널 내용
  // ================================================================
  private _fillPanel(id: TabId, el: HTMLElement): void {
    switch (id) {
      case 'inventory':
        renderInventory(el, this._inventory);
        break;
      case 'submarine':
        renderSubmarine(el, this._submarine, () => this._openTab('submarine'));
        break;
      case 'shop':
        renderShop(el, this._shopItems, this._deepCoin, (item, coinEl) => {
          if (this._deepCoin < item.price) return;
          this._deepCoin -= item.price;
          item.sold = true;
          coinEl.textContent = `보유 심해화폐 ◈ ${this._deepCoin}`;
          this._hudTexts[0]?.setText(`심해화폐  ${this._deepCoin}`);
          if (item.type === 'consumable') {
            const slot = this._inventory.findIndex(s => s === null);
            if (slot !== -1) this._inventory[slot] = { id: item.id, name: item.name, desc: item.desc, color: item.color };
          } else {
            const aug: AugmentItem = { id: item.id, name: item.name, desc: item.desc, color: item.color, shape: item.shape };
            this._submarine.pending.push(aug);
          }
          this._openTab('shop');
        });
        break;
      case 'party':
        renderParty(el, this._battleParty, this);
        break;
      case 'journal':
        renderJournal(el, this._log);
        break;
    }
  }

  // ================================================================
  //  씬 전환
  // ================================================================
  private _enterBattle(battleType: 'normal' | 'wave' | 'raid'): void {
    const fl = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: fl, alpha: 1, duration: 350, ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.start('BattleScene', {
          cogMax: this._cogMax, battleParty: this._battleParty,
          round: this._round, battleType, maxRound: this._maxRound,
          deepCoin: this._deepCoin, log: this._log,
          inventory: this._inventory, submarine: this._submarine, shopItems: this._shopItems,
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
}
