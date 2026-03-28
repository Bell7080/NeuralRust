// ================================================================
//  BattleScene_Setup.ts
//  경로: src/Scenes/BattleScene_Setup.ts
//
//  역할: Phase 1 — 전투 편성
//        UI(편성 패널·슬롯·진행 버튼) → CSS DOM 오버레이
//        게임 비주얼(적 박스·HP 바) → Phaser 3
//
//  상속: abstract BattleSceneSetup extends Phaser.Scene
//        → BattleScene_Battle → BattleScene
// ================================================================

import Phaser from 'phaser';
import type { Character } from '../types';
import { CharacterManager } from '../Managers/CharacterManager';
import { FontManager }      from '../Managers/FontManager';

// ── 공유 런타임 타입 (하위 클래스에서 import) ────────────────────

export interface EnemyInstance {
  _uid:         string;
  id:           string;
  name:         string;
  behavior:     string;
  _hp:          number;
  _maxHp:       number;
  attack:       number;
  agility:      number;
  luck:         number;
  _dead:        boolean;
  _attackCount: number;
}

export type AllyInstance = Character & {
  _hp:          number;
  _maxHp:       number;
  _gauge:       number;
  _dead:        boolean;
  _attackCount: number;
};

export interface EnemyUnitObjs {
  enemy:     EnemyInstance;
  shape:     Phaser.GameObjects.Graphics;
  nameTxt:   Phaser.GameObjects.Text;
  hpBg:      Phaser.GameObjects.Graphics;
  hpFg:      Phaser.GameObjects.Graphics;
  hpNumTxt:  Phaser.GameObjects.Text;
  refreshHp: () => void;
  cx: number; cy: number; half: number;
}

export interface AllyUnitObjs {
  ally:         AllyInstance;
  shape:        Phaser.GameObjects.Graphics;
  spriteImg:    Phaser.GameObjects.Image | null;
  nameTxt:      Phaser.GameObjects.Text;
  hpBg:         Phaser.GameObjects.Graphics;
  hpFg:         Phaser.GameObjects.Graphics;
  hpTxt:        Phaser.GameObjects.Text;
  gaugeBg:      Phaser.GameObjects.Graphics;
  gaugeFg:      Phaser.GameObjects.Graphics;
  gaugeTxt:     Phaser.GameObjects.Text;
  skillHit:     Phaser.GameObjects.Arc;
  refreshHp:    () => void;
  refreshGauge: () => void;
  destroyAll:   () => void;
  cx: number; cy: number; rad: number;
}

export interface BattleInitData {
  cogMax?:      number;
  battleParty?: string[];
  round?:       number;
  battleType?:  'normal' | 'wave' | 'raid';
  maxRound?:    number;
  deepCoin?:    number;
  log?:         Array<{ result?: string }>;
  inventory?:   unknown;
  submarine?:   unknown;
  shopItems?:   unknown;
}

// ── Abstract Base 클래스 ─────────────────────────────────────────

export abstract class BattleSceneSetup extends Phaser.Scene {

  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  // ── 진입 데이터 ──────────────────────────────────────────────
  protected _cogMax:      number   = 1;
  protected _battleParty: string[] = [];
  protected _round:       number   = 1;
  protected _battleType:  'normal' | 'wave' | 'raid' = 'normal';
  protected _maxRound:    number   = 5;
  protected _deepCoin:    number   = 0;
  protected _log:         Array<{ result?: string }> = [];
  protected _inventory:   unknown  = null;
  protected _submarine:   unknown  = null;
  protected _shopItems:   unknown  = null;

  // ── 씬 공유 ─────────────────────────────────────────────────
  protected _allChars:    Character[] = [];
  protected _partyChars:  Character[] = [];
  protected _combatParty: string[]    = [];
  protected _sceneHits:   Phaser.GameObjects.Rectangle[] = [];

  // ── DOM refs ─────────────────────────────────────────────────
  protected _setupEl!:    HTMLDivElement;
  private   _goBtn!:      HTMLButtonElement;
  private   _goSub!:      HTMLSpanElement;
  private   _slotsRow!:   HTMLDivElement;
  private   _cardEls:     Array<{
    el:      HTMLDivElement;
    mark:    HTMLSpanElement;
    hpFill:  HTMLDivElement;
    charId:  string;
  }> = [];
  private _slotEls: Array<{
    el:      HTMLDivElement;
    sprite:  HTMLImageElement;
    nameTxt: HTMLSpanElement;
    plus:    HTMLSpanElement;
  }> = [];

  // ── 폰트 헬퍼 ───────────────────────────────────────────────
  protected _fs(base: number): string {
    return FontManager.adjustedSize(base, this.scale);
  }

  // ── 하위 클래스 구현 필수 ────────────────────────────────────
  protected abstract _startCombatPhase(): void;

  // ════════════════════════════════════════════════════════════
  //  Phase 1 UI 빌드 (CSS DOM)
  // ════════════════════════════════════════════════════════════
  protected _buildSetupUI(): void {
    const canvas = this.sys.game.canvas;

    /* ── 루트 오버레이 ─────────────────────────────────────── */
    const root = document.createElement('div');
    root.id = 'battle-setup';

    /* ── 좌측 패널 ─────────────────────────────────────────── */
    const panel = document.createElement('div');
    panel.className = 'battle-setup__panel';

    const title = document.createElement('div');
    title.className = 'battle-setup__title';
    title.textContent = '전  투  편  성';

    const sub = document.createElement('div');
    sub.className = 'battle-setup__sub';
    sub.textContent = '클릭으로 배치 / 제거';

    const grid = document.createElement('div');
    grid.className = 'battle-setup__grid';

    this._partyChars.forEach(char => {
      const cogC  = CharacterManager.getCogColor(char.cog);
      const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
      const hpCol = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';

      const card = document.createElement('div');
      card.className = 'battle-setup__card';
      card.style.setProperty('--card-cog-color', cogC.css);

      // Cog 뱃지
      const cogBadge = document.createElement('span');
      cogBadge.className = 'battle-setup__card-cog';
      cogBadge.style.color = cogC.css;
      cogBadge.textContent = `C${char.cog}`;

      // 편성 마크
      const mark = document.createElement('span');
      mark.className = 'battle-setup__card-mark';
      mark.textContent = '▶';

      // 스프라이트
      const spriteEl = document.createElement('img');
      spriteEl.className = 'battle-setup__card-sprite';
      if (this.textures.exists(char.spriteKey)) {
        const raw = this.textures.get(char.spriteKey).getSourceImage();
        const src = raw instanceof HTMLCanvasElement ? raw.toDataURL() : (raw as HTMLImageElement).src;
        if (src) spriteEl.src = src; else spriteEl.style.opacity = '0';
      } else {
        spriteEl.style.opacity = '0';
      }

      // 이름
      const nameEl = document.createElement('span');
      nameEl.className = 'battle-setup__card-name';
      nameEl.textContent = char.name;

      // HP 바
      const hpWrap = document.createElement('div');
      hpWrap.className = 'battle-setup__card-hp';
      const hpFill = document.createElement('div');
      hpFill.className = 'battle-setup__card-hp-fill';
      hpFill.style.width = `${Math.round(hpPct * 100)}%`;
      hpFill.style.background = hpCol;
      hpWrap.appendChild(hpFill);

      card.append(cogBadge, mark, spriteEl, nameEl, hpWrap);
      card.addEventListener('click', () => {
        this._combatParty.includes(char.id)
          ? this._removeFromCombat(char.id)
          : this._addToCombat(char.id);
      });

      grid.appendChild(card);
      this._cardEls.push({ el: card, mark, hpFill, charId: char.id });
    });

    panel.append(title, sub, grid);

    /* ── 우측 영역 (진행 버튼 + 슬롯) ─────────────────────── */
    const right = document.createElement('div');
    right.className = 'battle-setup__right';

    // 진행 버튼
    const goWrap = document.createElement('div');
    goWrap.className = 'battle-setup__go-wrap';

    const goBtn = document.createElement('button');
    goBtn.className = 'battle-setup__go-btn';
    goBtn.textContent = '진  행';
    goBtn.disabled = true;
    goBtn.addEventListener('click', () => {
      if (!goBtn.classList.contains('active')) return;
      goBtn.disabled = true;
      this._startCombatPhase();
    });
    this._goBtn = goBtn;

    const goSub = document.createElement('span');
    goSub.className = 'battle-setup__go-sub';
    goSub.textContent = '1명 이상 배치 후 시작';
    this._goSub = goSub;

    goWrap.append(goBtn, goSub);

    // 배치 슬롯
    const slotsWrap = document.createElement('div');
    slotsWrap.className = 'battle-setup__slots-wrap';

    const slotsLabel = document.createElement('div');
    slotsLabel.className = 'battle-setup__slots-label';
    slotsLabel.textContent = '전  투  배  치  순  서';

    const slotsRow = document.createElement('div');
    slotsRow.className = 'battle-setup__slots';
    this._slotsRow = slotsRow;

    const maxSlots = Math.max(1, this._partyChars.length);
    for (let i = 0; i < maxSlots; i++) {
      const slot = document.createElement('div');
      slot.className = 'battle-setup__slot';

      const numEl = document.createElement('span');
      numEl.className = 'battle-setup__slot-num';
      numEl.textContent = `${i + 1}`;

      const plus = document.createElement('span');
      plus.className = 'battle-setup__slot-plus';
      plus.textContent = '+';

      const nameEl = document.createElement('span');
      nameEl.className = 'battle-setup__slot-name';
      nameEl.style.display = 'none';

      const spriteEl = document.createElement('img');
      spriteEl.className = 'battle-setup__slot-sprite';
      spriteEl.style.display = 'none';

      slot.append(numEl, plus, spriteEl, nameEl);
      slot.addEventListener('click', () => {
        if (this._combatParty[i]) this._removeFromCombatBySlot(i);
      });

      slotsRow.appendChild(slot);
      this._slotEls.push({ el: slot, sprite: spriteEl, nameTxt: nameEl, plus });
    }

    slotsWrap.append(slotsLabel, slotsRow);
    right.append(goWrap, slotsWrap);
    root.append(panel, right);

    canvas.parentElement?.appendChild(root);
    this._setupEl = root;
  }

  // ════════════════════════════════════════════════════════════
  //  편성 조작
  // ════════════════════════════════════════════════════════════
  protected _addToCombat(charId: string): void {
    if (this._combatParty.includes(charId)) return;
    this._combatParty.push(charId);
    this._refreshSetupUI();
  }

  protected _removeFromCombat(charId: string): void {
    const idx = this._combatParty.indexOf(charId);
    if (idx !== -1) this._removeFromCombatBySlot(idx);
  }

  protected _removeFromCombatBySlot(slotIdx: number): void {
    if (this._combatParty[slotIdx] == null) return;
    this._combatParty.splice(slotIdx, 1);
    this._refreshSetupUI();
  }

  private _refreshSetupUI(): void {
    const has = this._combatParty.length > 0;

    // ── 카드 selected 클래스 ─────────────────────────────────
    this._cardEls.forEach(({ el, mark, charId }) => {
      const inParty = this._combatParty.includes(charId);
      el.classList.toggle('selected', inParty);
      mark.style.opacity = inParty ? '1' : '0';
    });

    // ── 슬롯 갱신 ────────────────────────────────────────────
    this._slotEls.forEach((slot, idx) => {
      const charId = this._combatParty[idx];
      const char   = charId
        ? this._partyChars.find(c => c.id === charId)
        : undefined;
      const cogC   = char ? CharacterManager.getCogColor(char.cog) : null;

      slot.el.classList.toggle('filled', !!char);
      slot.el.style.borderColor = cogC ? cogC.css : '';

      if (char) {
        slot.plus.style.display   = 'none';
        slot.nameTxt.style.display = 'block';
        slot.nameTxt.textContent   = char.name;
        if (this.textures.exists(char.spriteKey)) {
          const raw = this.textures.get(char.spriteKey).getSourceImage();
          const src = raw instanceof HTMLCanvasElement ? raw.toDataURL() : (raw as HTMLImageElement).src;
          if (src) { slot.sprite.src = src; slot.sprite.style.display = 'block'; }
        }
      } else {
        slot.plus.style.display    = 'block';
        slot.nameTxt.style.display = 'none';
        slot.sprite.style.display  = 'none';
      }
    });

    // ── 진행 버튼 상태 ────────────────────────────────────────
    this._goBtn.disabled = !has;
    this._goBtn.classList.toggle('active', has);
    this._goSub.textContent = has
      ? `${this._combatParty.length}명 편성  —  진행 버튼으로 시작`
      : '1명 이상 배치 후 시작';
    this._goSub.classList.toggle('has-party', has);
  }

  // ── 편성 패널 슬라이드 아웃 후 콜백 ──────────────────────────
  protected _slideOutSetup(onDone: () => void): void {
    this._setupEl.classList.add('slide-out');
    this._setupEl.addEventListener('transitionend', () => {
      this._setupEl.style.display = 'none';
      onDone();
    }, { once: true });
  }
}
