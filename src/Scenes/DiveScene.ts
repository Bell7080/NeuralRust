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

    this._sceneHits = [];
    this._hudTexts  = [];
    this._tabBtns   = new Map();
    this._activeTab = null;
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
  //  Phaser: 배틀 슬롯 3개
  // ================================================================
  private _buildSlots(W: number, H: number): void {
    const types: Array<['normal' | 'wave' | 'raid', string, number]> = [
      ['normal', '일반 전투', 0x6a4820],
      ['wave',   '웨이브',   0x6a6020],
      ['raid',   '레이드',   0x8a2020],
    ];
    const shuffled = [...types].sort(() => Math.random() - 0.5);
    const tabColW  = W * 0.095;
    const slotW    = W * 0.20;
    const slotH    = H * 0.55;
    const gap      = W * 0.04;
    const usableW  = W - tabColW;
    const totalW   = slotW * 3 + gap * 2;
    const startX   = tabColW + (usableW - totalW) / 2;
    const cy       = H * 0.54;

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

      const hexCol = `#${color.toString(16).padStart(6, '0')}`;
      this.add.text(cx, cy - slotH * 0.32, label, {
        fontSize: FontManager.adjustedSize(13, this.scale),
        color: hexCol, fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(3);
      this.add.text(cx, cy, `COG ${this._cogMax}`, {
        fontSize: FontManager.adjustedSize(30, this.scale),
        color: hexCol, fontFamily: FontManager.TITLE,
      }).setOrigin(0.5).setDepth(3);
      this.add.text(cx, cy + slotH * 0.28, '클릭하여 진입', {
        fontSize: FontManager.adjustedSize(10, this.scale),
        color: '#3a2010', fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(3);

      const hit = this.add.rectangle(cx, cy, slotW, slotH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(5);
      hit.on('pointerover',  () => draw(true));
      hit.on('pointerout',   () => draw(false));
      hit.on('pointerdown',  () => { hit.disableInteractive(); this._enterBattle(battleType); });
      this._sceneHits.push(hit);
    });
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
