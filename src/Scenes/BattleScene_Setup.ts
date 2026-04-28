// ================================================================
//  BattleScene_Setup.ts
//  경로: src/Scenes/BattleScene_Setup.ts
//
//  역할: Phase 1 — 전투 편성
//        3열 레이아웃: 좌(캐릭터 그리드) | 중(진행+슬롯) | 우(정보 패널)
//        단일 클릭 → 우측 정보 표시 / 더블클릭 → 배치 추가/제거
//
//  상속: abstract BattleSceneSetup extends Phaser.Scene
//        → BattleScene_Battle → BattleScene
// ================================================================

import Phaser from 'phaser';
import type { Character, StatKey } from '../types';
import { CharacterManager }        from '../Managers/CharacterManager';
import { CharacterSpriteManager }  from '../Managers/CharacterSpriteManager';
import { FontManager }             from '../Managers/FontManager';
import { AbilityIndex }            from '../Data/AbilityIndex';
import { getStatTooltipDynamic, getJobTooltip } from '../Data/Data_Tooltips';
import type { BattleEffects3D }    from '../Effects/BattleEffects3D';

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
  spriteKey?:   string;
  passive:      string;
  action:       string;
  enhanced:     string;
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
  spriteImg: Phaser.GameObjects.Image | null;
  nameTxt:   Phaser.GameObjects.Text;
  hpBg:      Phaser.GameObjects.Graphics;
  hpFg:      Phaser.GameObjects.Graphics;
  hpNumTxt:  Phaser.GameObjects.Text;
  hit:       Phaser.GameObjects.Rectangle;
  refreshHp: () => void;
  destroyAll:() => void;
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
  skillHit:     Phaser.GameObjects.Rectangle;
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
  protected _effects3d:   BattleEffects3D | null = null;
  protected _bgKey:       string  = '';

  // ── DOM refs ─────────────────────────────────────────────────
  protected _setupEl!:     HTMLDivElement;
  private _setupPanelEl!:  HTMLDivElement;
  private _setupInfoEl!:   HTMLDivElement;
  private _goBtn!:         HTMLButtonElement;
  private _goSub!:         HTMLSpanElement;
  private _slotsRow!:      HTMLDivElement;
  private _cardEls: Array<{
    el:     HTMLDivElement;
    mark:   HTMLSpanElement;
    charId: string;
  }> = [];
  private _slotEls: Array<{
    el:     HTMLDivElement;
    sprite: HTMLImageElement;
    info:   HTMLDivElement;
    plus:   HTMLSpanElement;
  }> = [];

  // ── 클릭 상태 ────────────────────────────────────────────────
  private _selectedChar:  Character | null = null;
  protected _selectedEnemy: EnemyInstance | null = null;
  private _lastClickMs  = 0;
  private _lastClickId  = '';

  // ── 툴팁 ────────────────────────────────────────────────────
  private _tipEl: HTMLElement | null = null;

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
    // 라운드 간 재진입 시 이전 DOM 참조 배열 초기화
    this._cardEls = [];
    this._slotEls = [];
    this._selectedChar  = null;
    this._selectedEnemy = null;
    this._lastClickMs   = 0;
    this._lastClickId   = '';

    const canvas = this.sys.game.canvas;

    /* ── 루트 (3열 그리드) ─────────────────────────────────── */
    const root = document.createElement('div');
    root.id = 'battle-setup';

    /* ── 좌측 패널 (캐릭터 그리드) ─────────────────────────── */
    const panel = document.createElement('div');
    panel.className = 'battle-setup__panel';
    this._setupPanelEl = panel;

    const title = document.createElement('div');
    title.className = 'battle-setup__title';
    title.textContent = '전  투  편  성';

    const sub = document.createElement('div');
    sub.className = 'battle-setup__sub';
    sub.textContent = '클릭: 정보  ·  더블클릭: 배치/해제';

    const grid = document.createElement('div');
    grid.className = 'battle-setup__grid';

    this._partyChars.forEach(char => {
      const cogC   = CharacterManager.getCogColor(char.cog);
      const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
      const hpCol  = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';
      const jobCol = char.job === 'fisher' ? '#c8a070' : char.job === 'diver' ? '#7ab0c8' : '#a080e0';

      const card = document.createElement('div');
      card.className = 'battle-setup__card';
      card.style.setProperty('--card-cog-color', cogC.css);

      const mark = document.createElement('span');
      mark.className = 'battle-setup__card-mark';
      mark.textContent = '▶';

      const spriteEl = document.createElement('img');
      spriteEl.className = 'battle-setup__card-sprite';
      const _cardSrc = CharacterSpriteManager.getDomSrc(char.spriteKey);
      if (_cardSrc) { spriteEl.src = _cardSrc; } else { spriteEl.style.opacity = '0'; }

      const info = document.createElement('div');
      info.className = 'battle-setup__card-info';
      info.innerHTML = `
        <div class="battle-setup__card-name">${char.name}</div>
        <div class="battle-setup__card-job" style="color:${jobCol}">${char.jobLabel}</div>
        <div class="battle-setup__card-cog" style="color:${cogC.css}">Cog ${char.cog} · 합계 ${char.statSum}</div>
        <div class="battle-setup__card-hp"><div class="battle-setup__card-hp-fill" style="width:${Math.round(hpPct * 100)}%;background:${hpCol}"></div></div>
        <div class="battle-setup__card-hptxt">${char.currentHp} / ${char.maxHp}</div>
      `;

      card.append(mark, spriteEl, info);

      // 단일 클릭 → 정보 표시 / 더블클릭 → 배치 토글
      card.addEventListener('click', () => {
        const now = Date.now();
        if (this._lastClickId === char.id && now - this._lastClickMs < 350) {
          this._lastClickMs = 0;
          this._lastClickId = '';
          this._combatParty.includes(char.id)
            ? this._removeFromCombat(char.id)
            : this._addToCombat(char.id);
        } else {
          this._lastClickMs = now;
          this._lastClickId = char.id;
          this._selectedChar = char;
          this._selectedEnemy = null;
          this._cardEls.forEach(c => c.el.classList.remove('info-selected'));
          card.classList.add('info-selected');
          this._refreshInfoPanel();
        }
      });

      grid.appendChild(card);
      this._cardEls.push({ el: card, mark, charId: char.id });
    });

    panel.append(title, sub, grid);

    /* ── 중앙 영역 (진행 버튼 + 배치 슬롯) ─────────────────── */
    const center = document.createElement('div');
    center.className = 'battle-setup__center';

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

      const spriteEl = document.createElement('img');
      spriteEl.className = 'battle-setup__slot-sprite';
      spriteEl.style.display = 'none';

      const info = document.createElement('div');
      info.className = 'battle-setup__slot-info';
      info.style.display = 'none';

      slot.append(numEl, plus, spriteEl, info);
      slot.addEventListener('click', () => {
        const charId = this._combatParty[i];
        if (!charId) return;
        const char = this._partyChars.find(c => c.id === charId);
        if (!char) return;
        const now = Date.now();
        const slotKey = `__slot_${i}`;
        if (this._lastClickId === slotKey && now - this._lastClickMs < 350) {
          this._lastClickMs = 0;
          this._lastClickId = '';
          this._removeFromCombatBySlot(i);
        } else {
          this._lastClickMs = now;
          this._lastClickId = slotKey;
          this._selectedChar = char;
          this._selectedEnemy = null;
          this._cardEls.forEach(c => c.el.classList.remove('info-selected'));
          const cardRef = this._cardEls.find(c => c.charId === char.id);
          cardRef?.el.classList.add('info-selected');
          this._refreshInfoPanel();
        }
      });

      slotsRow.appendChild(slot);
      this._slotEls.push({ el: slot, sprite: spriteEl, info, plus });
    }

    slotsWrap.append(slotsLabel, slotsRow);
    center.append(goWrap, slotsWrap);

    /* ── 우측 정보 패널 ─────────────────────────────────────── */
    const infoPanel = document.createElement('div');
    infoPanel.className = 'battle-setup__info-panel';
    this._setupInfoEl = infoPanel;

    const infoEmpty = document.createElement('div');
    infoEmpty.className = 'bs-info-empty';
    infoEmpty.textContent = '캐릭터를 클릭하면\n정보가 표시됩니다';
    infoPanel.appendChild(infoEmpty);

    root.append(panel, center, infoPanel);
    canvas.parentElement?.appendChild(root);
    this._setupEl = root;

    // 첫 캐릭터를 기본 선택해 우측 정보 패널을 채움
    if (this._partyChars.length > 0) {
      this._selectedChar = this._partyChars[0];
      this._cardEls[0]?.el.classList.add('info-selected');
      this._refreshInfoPanel();
    }
  }

  // ════════════════════════════════════════════════════════════
  //  우측 정보 패널 렌더
  // ════════════════════════════════════════════════════════════
  private _refreshInfoPanel(): void {
    const char = this._selectedChar;
    if (!char) return;

    const cogC    = CharacterManager.getCogColor(char.cog);
    const jobCol  = char.job === 'fisher' ? '#c8a070' : char.job === 'diver' ? '#7ab0c8' : '#a080e0';
    const hpPct   = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol   = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';
    const inParty = this._combatParty.includes(char.id);
    const eff     = CharacterManager.getEffectiveStats(char) as unknown as Record<string, number>;
    const SC      = CharacterManager.STAT_COLORS as Record<string, string>;
    const SL: Record<string, string> = { hp:'체력', health:'건강', attack:'공격', agility:'민첩', luck:'행운' };
    const AL: Record<string, string> = { passive:'패시브', action:'행동', enhanced:'강화', finale:'피날레' };

    const statRows = Object.entries(char.stats).map(([k, v]) => {
      const effV  = eff[k] ?? v;
      const bonus = effV - v;
      const isOc  = char.overclock?.statKey === k;
      const ocCol = char.overclock?.color ?? SC[k];
      const bHtml = isOc && bonus > 0
        ? `<span class="mng-stat-bonus mng-stat-bonus--oc" style="color:${ocCol}">+${bonus}</span>`
        : bonus > 0
        ? `<span class="mng-stat-bonus mng-stat-bonus--up">+${bonus}</span>`
        : '';
      return `<div class="mng-stat-row" data-stat-key="${k}" data-stat-eff="${effV}">
        <span class="mng-stat-key">${SL[k] ?? k}</span>
        <span class="mng-stat-val" style="color:${SC[k] ?? '#c8bfb0'}">${v}${bHtml}</span>
      </div>`;
    }).join('');

    const abilRows = (['passive', 'action', 'enhanced', 'finale'] as const).map(type => {
      const id = char[type];
      const nm = id ? (AbilityIndex.getName(type, id) || id) : '—';
      const ds = id ? (AbilityIndex.getDesc(type, id) || '') : '';
      return `<div class="mng-ab-row" data-ab-type="${type}" data-ab-id="${id ?? ''}">
        <span class="mng-ab-type">${AL[type]}</span>
        <span class="mng-ab-name">${nm}</span>
        ${ds ? `<span class="mng-ab-desc">${ds}</span>` : ''}
      </div>`;
    }).join('');

    const videoPath = CharacterSpriteManager.getVideoPath(char.job);
    const pngPath   = CharacterSpriteManager.getDomSrc(char.spriteKey);

    this._setupInfoEl.innerHTML = `
      <div class="bs-info-portrait-wrap">
        ${videoPath
          ? `<video class="bs-info-portrait-media" autoplay loop muted playsinline></video>`
          : pngPath
          ? `<img class="bs-info-portrait-media" src="${pngPath}" alt="" />`
          : `<div class="bs-info-portrait-fallback"></div>`}
        <div class="bs-info-portrait-overlay">
          <div class="mng-detail-name">${char.name}</div>
          <div class="mng-detail-job" style="color:${jobCol}" data-job="${char.job}">${char.jobLabel}</div>
          <div class="mng-detail-cog" style="color:${cogC.css}">Cog ${char.cog}  ·  합계 ${char.statSum}</div>
        </div>
      </div>
      <div class="mng-right-detail bs-mng-detail">
        <div class="mng-detail-hprow">
          <div class="mng-detail-hpbar"><div class="mng-detail-hpfill" style="width:${Math.round(hpPct*100)}%;background:${hpCol}"></div></div>
          <span class="mng-detail-hptxt">HP ${char.currentHp} / ${char.maxHp}</span>
        </div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-stats">${statRows}</div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-abilities">${abilRows}</div>
        ${char.overclock ? `<div class="mng-detail-divider"></div><div class="mng-overclock" style="color:${char.overclock.color}">${char.overclock.label}</div>` : ''}
        <div class="mng-detail-divider"></div>
        <button class="mng-action-btn bs-info-toggle-btn${inParty ? ' in-party' : ''}">
          ${inParty ? '▶ 배치 제거' : '+ 배치 추가'}
        </button>
      </div>
    `;

    // 동영상 src/load/play를 명시적으로 호출 (라운드 2 이후에도 안정 재생)
    if (videoPath) {
      const vid = this._setupInfoEl.querySelector<HTMLVideoElement>('.bs-info-portrait-media');
      if (vid) {
        vid.src = videoPath;
        vid.load();
        vid.play().catch(() => {});
      }
    }

    this._setupInfoEl.querySelector<HTMLButtonElement>('.bs-info-toggle-btn')
      ?.addEventListener('click', () => {
        this._combatParty.includes(char.id)
          ? this._removeFromCombat(char.id)
          : this._addToCombat(char.id);
        this._refreshInfoPanel();
      });

    this._bindInfoTooltips(char);
  }

  // ── 툴팁 헬퍼 ─────────────────────────────────────────────────
  private _ensureTipEl(): HTMLElement {
    if (this._tipEl) return this._tipEl;
    const el = document.createElement('div');
    el.className = 'mng-tooltip';
    (document.getElementById('game-container') ?? document.body).appendChild(el);
    this._tipEl = el;
    return el;
  }
  private _showTip(x: number, y: number, text: string): void {
    const el = this._ensureTipEl();
    el.innerHTML = text.replace(/\n/g, '<br>');
    el.style.display = 'block';
    this._moveTip(x, y);
  }
  private _moveTip(x: number, y: number): void {
    if (!this._tipEl) return;
    const W  = this._tipEl.offsetWidth || 160;
    const H  = this._tipEl.offsetHeight || 60;
    const vw = window.innerWidth, vh = window.innerHeight;
    this._tipEl.style.left = `${x + 12 + W > vw ? x - W - 8 : x + 12}px`;
    this._tipEl.style.top  = `${y + 8  + H > vh ? y - H - 8 : y + 8}px`;
  }
  private _hideTip(): void { if (this._tipEl) this._tipEl.style.display = 'none'; }

  private _bindInfoTooltips(char: Character): void {
    const root = this._setupInfoEl;
    if (!root) return;

    const jobEl = root.querySelector<HTMLElement>('[data-job]');
    if (jobEl) {
      jobEl.style.cursor = 'help';
      jobEl.addEventListener('mouseenter', e => {
        const t = getJobTooltip(char.job);
        if (t) this._showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, t);
      });
      jobEl.addEventListener('mousemove', e => this._moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      jobEl.addEventListener('mouseleave', () => this._hideTip());
    }

    root.querySelectorAll<HTMLElement>('.mng-stat-row[data-stat-key]').forEach(row => {
      const key  = row.dataset.statKey as StatKey;
      const effV = Number(row.dataset.statEff ?? 0);
      row.style.cursor = 'help';
      row.addEventListener('mouseenter', e => {
        this._showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, getStatTooltipDynamic(key, effV));
      });
      row.addEventListener('mousemove', e => this._moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      row.addEventListener('mouseleave', () => this._hideTip());
    });

    root.querySelectorAll<HTMLElement>('.mng-ab-row[data-ab-id]').forEach(row => {
      const type = row.dataset.abType as 'passive'|'action'|'enhanced'|'finale';
      const id   = row.dataset.abId!;
      if (!id) return;
      const desc = AbilityIndex.getDesc(type, id);
      if (!desc) return;
      row.style.cursor = 'help';
      row.addEventListener('mouseenter', e => {
        const nm = AbilityIndex.getName(type, id) || id;
        this._showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, `${nm}\n${desc}`);
      });
      row.addEventListener('mousemove', e => this._moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      row.addEventListener('mouseleave', () => this._hideTip());
    });
  }

  // ════════════════════════════════════════════════════════════
  //  우측 정보 패널 — 적 정보 렌더
  // ════════════════════════════════════════════════════════════
  protected _showEnemyInfo(enemy: EnemyInstance): void {
    if (!this._setupInfoEl) return;
    this._selectedEnemy = enemy;
    this._selectedChar  = null;
    this._cardEls.forEach(c => c.el.classList.remove('info-selected'));

    const hpPct  = enemy._maxHp > 0 ? enemy._hp / enemy._maxHp : 0;
    const hpCol  = hpPct > 0.6 ? '#8a2010' : hpPct > 0.3 ? '#804018' : '#501010';
    const BL: Record<string, string> = {
      random: '무작위', target_weak: '약체 우선', wave: '파상 공격',
      target_strong: '강자 우선', defensive: '방어형',
    };
    const SC: Record<string, string> = {
      hp: '#ff88bb', attack: '#ff3333', agility: '#55ccff', luck: '#ddcc44',
    };
    const SL: Record<string, string> = {
      hp: '체력', attack: '공격', agility: '민첩', luck: '행운',
    };
    const AL: Record<string, string> = {
      passive: '패시브', action: '행동', enhanced: '강화',
    };

    const bgUrl    = this._bgKey      ? `Games/Assets/Sprites/${this._bgKey}.png`        : '';
    const enemySrc = enemy.spriteKey  ? `Games/Assets/Sprites/${enemy.spriteKey}.png`    : '';

    // 스탯 행 (HP 포함)
    const statEntries: [string, number][] = [
      ['hp',      enemy._maxHp],
      ['attack',  enemy.attack],
      ['agility', enemy.agility],
      ['luck',    enemy.luck],
    ];
    const statRows = statEntries.map(([k, v]) =>
      `<div class="mng-stat-row" data-stat-key="${k}" data-stat-eff="${v}">
        <span class="mng-stat-key">${SL[k] ?? k}</span>
        <span class="mng-stat-val" style="color:${SC[k] ?? '#c8bfb0'}">${v}</span>
      </div>`
    ).join('');

    // 능력 행 (아군 동일 구조)
    const abilEntries: [string, string][] = [
      ['passive',  enemy.passive],
      ['action',   enemy.action],
      ['enhanced', enemy.enhanced],
    ];
    const abilRows = abilEntries.map(([type, id]) => {
      const nm = id ? (AbilityIndex.getName(type as 'passive'|'action'|'enhanced', id) || id) : '—';
      const ds = id ? (AbilityIndex.getDesc(type as 'passive'|'action'|'enhanced', id) || '') : '';
      return `<div class="mng-ab-row" data-ab-type="${type}" data-ab-id="${id}">
        <span class="mng-ab-type">${AL[type] ?? type}</span>
        <span class="mng-ab-name">${nm}</span>
        ${ds ? `<span class="mng-ab-desc">${ds}</span>` : ''}
      </div>`;
    }).join('');

    this._setupInfoEl.innerHTML = `
      <div class="bs-info-portrait-wrap bs-info-portrait-wrap--enemy">
        ${bgUrl ? `<div class="bs-info-portrait-enemy-bg" style="background-image:url('${bgUrl}')"></div>` : ''}
        <div class="bs-info-portrait-enemy-bg-shade"></div>
        ${enemySrc
          ? `<img class="bs-info-portrait-enemy-img" src="${enemySrc}" alt="${enemy.name}"/>`
          : `<div class="bs-info-portrait-fallback">적</div>`}
        <div class="bs-info-portrait-overlay">
          <div class="mng-detail-name" style="color:#e08070">${enemy.name}</div>
          <div class="mng-detail-job" style="color:#a86850">${BL[enemy.behavior] ?? enemy.behavior}</div>
        </div>
      </div>
      <div class="mng-right-detail bs-mng-detail">
        <div class="mng-detail-hprow">
          <div class="mng-detail-hpbar">
            <div class="mng-detail-hpfill" style="width:${Math.round(hpPct*100)}%;background:${hpCol}"></div>
          </div>
          <span class="mng-detail-hptxt">HP ${enemy._hp} / ${enemy._maxHp}</span>
        </div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-stats">${statRows}</div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-abilities">${abilRows}</div>
      </div>
    `;

    this._bindEnemyInfoTooltips(enemy);
  }

  // ── 적 정보 패널 툴팁 바인딩 ─────────────────────────────────
  private _bindEnemyInfoTooltips(enemy: EnemyInstance): void {
    const root = this._setupInfoEl;
    if (!root) return;

    root.querySelectorAll<HTMLElement>('.mng-stat-row[data-stat-key]').forEach(row => {
      const key  = row.dataset.statKey!;
      const effV = Number(row.dataset.statEff ?? 0);
      const TIPS: Record<string, string> = {
        hp:      `체력 ${effV}\n전투 시작 시 최대 HP로 설정됩니다.`,
        attack:  `공격 ${effV}\n기본 공격 피해량의 기준이 됩니다.`,
        agility: `민첩 ${effV}\n공격 간격을 결정합니다. 높을수록 빠릅니다.`,
        luck:    `행운 ${effV}\n치명타 발생 확률에 영향을 줍니다.`,
      };
      const tip = TIPS[key];
      if (!tip) return;
      row.style.cursor = 'help';
      row.addEventListener('mouseenter', e => this._showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, tip));
      row.addEventListener('mousemove',  e => this._moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      row.addEventListener('mouseleave', () => this._hideTip());
    });

    root.querySelectorAll<HTMLElement>('.mng-ab-row[data-ab-id]').forEach(row => {
      const type = row.dataset.abType as 'passive'|'action'|'enhanced';
      const id   = row.dataset.abId!;
      if (!id) return;
      const desc = AbilityIndex.getDesc(type, id);
      if (!desc) return;
      row.style.cursor = 'help';
      row.addEventListener('mouseenter', e => {
        const nm = AbilityIndex.getName(type, id) || id;
        this._showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, `${nm}\n${desc}`);
      });
      row.addEventListener('mousemove',  e => this._moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      row.addEventListener('mouseleave', () => this._hideTip());
    });

    void enemy;
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
        const jobCol = char.job === 'fisher' ? '#c8a070' : char.job === 'diver' ? '#7ab0c8' : '#a080e0';
        const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
        const hpCol  = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';
        slot.plus.style.display = 'none';
        slot.info.style.display = 'flex';
        slot.info.innerHTML = `
          <div class="battle-setup__slot-name">${char.name}</div>
          <div class="battle-setup__slot-job" style="color:${jobCol}">${char.jobLabel}</div>
          <div class="battle-setup__slot-cog" style="color:${cogC?.css}">Cog ${char.cog} · 합계 ${char.statSum}</div>
          <div class="battle-setup__slot-hp"><div class="battle-setup__slot-hp-fill" style="width:${Math.round(hpPct*100)}%;background:${hpCol}"></div></div>
          <div class="battle-setup__slot-hptxt">${char.currentHp} / ${char.maxHp}</div>
        `;
        const _slotSrc = CharacterSpriteManager.getDomSrc(char.spriteKey);
        if (_slotSrc) { slot.sprite.src = _slotSrc; slot.sprite.style.display = 'block'; }
      } else {
        slot.plus.style.display = 'block';
        slot.info.style.display = 'none';
        slot.sprite.style.display = 'none';
      }
    });

    // ── 진행 버튼 상태 ────────────────────────────────────────
    this._goBtn.disabled = !has;
    this._goBtn.classList.toggle('active', has);
    this._goSub.textContent = has
      ? `${this._combatParty.length}명 편성  —  진행 버튼으로 시작`
      : '1명 이상 배치 후 시작';
    this._goSub.classList.toggle('has-party', has);

    // ── 정보 패널 배치 버튼 상태 갱신 ────────────────────────
    if (this._selectedChar) this._refreshInfoPanel();
  }

  // ── 편성 패널 슬라이드 아웃 후 콜백 ──────────────────────────
  protected _slideOutSetup(onDone: () => void): void {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this._setupEl.style.display = 'none';
      onDone();
    };
    this._setupPanelEl.classList.add('slide-out-left');
    this._setupInfoEl.classList.add('slide-out-right');
    this._setupPanelEl.addEventListener('transitionend', finish, { once: true });
    // fallback: 500ms 후 강제 실행
    this.time.delayedCall(500, finish);
  }
}
