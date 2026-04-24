// ================================================================
//  PartyScene.ts
//  경로: src/Scenes/PartyScene.ts
//
//  역할: 탐사 파티 편성 씬 (HTML DOM 오버레이)
//        [좌 목록] — 캐릭터 카드 그리드 (초상화 + 기본정보)
//        [중 프로필] — 선택된 캐릭터 상세 (초상화 + 스탯/능력)
//        [우 편성] — 파티 슬롯 + 출발 버튼
// ================================================================

import Phaser from 'phaser';
import { InputManager }     from '../Managers/InputManager';
import { SaveManager }      from '../Managers/SaveManager';
import {
  CharacterManager, getCogColor, STAT_COLORS, STAT_LABEL_MAP,
} from '../Managers/CharacterManager';
import { AbilityIndex }     from '../Data/AbilityIndex';
import { getStatTooltipDynamic, getJobTooltip } from '../Data/Data_Tooltips';
import { CharProfile }      from './Ateliers/CharProfile';
import { clearAllSceneDom } from '../utils/sceneCleanup';
import type { Character, StatKey } from '../types';
import './Ateliers/CharProfile.css';
import './PartyScene.css';

const MAX_PARTY = 4;
const ABILITY_LABELS: Record<string, string> = {
  passive: 'PASSIVE', action: 'ACTION', enhanced: 'ENHANCED', finale: 'FINALE',
};

export class PartyScene extends Phaser.Scene {
  constructor() { super({ key: 'PartyScene' }); }

  private _from = 'AtelierScene';
  private _party: string[] = [];
  private _selected: Character | null = null;

  // DOM refs
  private _rootEl!:   HTMLDivElement;
  private _listEl!:   HTMLElement;
  private _centerEl!: HTMLElement;
  private _rightEl!:  HTMLElement;
  private _slotsEl!:  HTMLElement;
  private _departBtn!: HTMLButtonElement;
  private _costEl!:   HTMLElement;
  private _tip:       HTMLElement | null = null;

  preload(): void {
    if (!this.textures.exists('bg_party'))
      this.load.image('bg_party', 'Games/Assets/Sprites/Background_007.png');
  }

  init(data: { from?: string }): void {
    this._from  = data.from || 'AtelierScene';
    this._party = [];
    this._selected = null;
  }

  create(): void {
    clearAllSceneDom();
    InputManager.reinit(this);
    CharacterManager.initIfEmpty();

    this._buildBackground();
    this._buildDOM();
    this._renderList();
    this._renderSlots();
    this._refreshDepartState();

    // 첫 번째 캐릭터 자동 선택
    const chars = this._aliveChars();
    if (chars.length > 0) this._selectChar(chars[0]);
  }

  // ── 배경 (Phaser) ─────────────────────────────────────────────
  private _buildBackground(): void {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    if (this.textures.exists('bg_party')) {
      const bg = this.add.image(W / 2, H / 2, 'bg_party');
      const scale = Math.max(W / bg.width, H / bg.height);
      bg.setScale(scale).setDepth(0);
    }
    this.add.rectangle(0, 0, W, H, 0x020103, 0.85).setOrigin(0).setDepth(1);

    const grid = this.add.graphics().setDepth(2);
    const step = Math.round(W / 60);
    grid.lineStyle(1, 0x0d0a06, 0.35);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
  }

  // ── DOM 빌드 ──────────────────────────────────────────────────
  private _buildDOM(): void {
    const root = document.createElement('div');
    root.id = 'party-scene';
    root.className = 'party-scene';
    root.innerHTML = `
      <div class="party-scene__header">
        <button class="party-scene__back" id="ps-back">← 돌아가기</button>
        <div class="party-scene__title-wrap">
          <div class="party-scene__title">파 티 편 성</div>
          <div class="party-scene__subtitle">PARTY SETUP</div>
        </div>
        <div class="party-scene__header-spacer"></div>
      </div>
      <div class="party-scene__body">
        <div class="party-scene__list" id="ps-list"></div>
        <div class="party-scene__center" id="ps-center"></div>
        <div class="party-scene__right">
          <div class="party-scene__slots-label">편 성 슬 롯  (${MAX_PARTY}명)</div>
          <div class="party-scene__slots" id="ps-slots"></div>
          <div class="party-scene__divider"></div>
          <div class="party-scene__cost" id="ps-cost">파티를 선택하세요</div>
          <button class="party-scene__depart" id="ps-depart" disabled>출  발</button>
        </div>
      </div>
    `;

    const container = document.getElementById('game-container') ?? document.body;
    container.appendChild(root);
    this._rootEl = root;

    this._listEl    = root.querySelector('#ps-list')!;
    this._centerEl  = root.querySelector('#ps-center')!;
    this._rightEl   = root.querySelector('.party-scene__right')!;
    this._slotsEl   = root.querySelector('#ps-slots')!;
    this._departBtn = root.querySelector('#ps-depart')!;
    this._costEl    = root.querySelector('#ps-cost')!;

    root.querySelector('#ps-back')!.addEventListener('click', () => {
      this.scene.start('AtelierScene', { skipWelcome: true, from: this._from });
    });
    this._departBtn.addEventListener('click', () => this._onDepart());
  }

  // ── 캐릭터 리스트 ────────────────────────────────────────────
  private _aliveChars(): Character[] {
    const chars = CharacterManager.loadAll() ?? [];
    return chars.filter(c => !c.status || c.status === 'alive');
  }

  private _renderList(): void {
    this._listEl.innerHTML = '';
    const chars = this._aliveChars();
    if (!chars.length) {
      this._listEl.innerHTML = '<div class="party-scene__empty">등록된 캐릭터가 없습니다.</div>';
      return;
    }

    chars.forEach(char => {
      const cogC  = getCogColor(char.cog);
      const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 0;
      const hpCol = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';
      const inParty = this._party.includes(char.id);

      const card = document.createElement('div');
      card.className = 'party-scene__card';
      if (inParty) card.classList.add('in-party');
      if (this._selected?.id === char.id) card.classList.add('selected');
      card.style.setProperty('--card-cog', cogC.css);

      card.innerHTML = `
        <div class="party-scene__card-mark">✓</div>
        <div class="party-scene__card-sprite" id="ps-spr-${char.id}"></div>
        <div class="party-scene__card-info">
          <div class="party-scene__card-name">${char.name}</div>
          <div class="party-scene__card-cog" style="color:${cogC.css}">C${char.cog}</div>
          <div class="party-scene__card-hpbar"><div style="width:${Math.round(hpPct*100)}%;background:${hpCol}"></div></div>
        </div>
      `;
      this._attachSprite(card.querySelector(`#ps-spr-${char.id}`)!, char.spriteKey);

      // 단일 클릭: 선택 (중앙 프로필 갱신) + 파티 토글
      // 더블 클릭: 상세 프로필 팝업
      let clickTimer: ReturnType<typeof setTimeout> | null = null;
      card.addEventListener('click', () => {
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
          CharProfile.open(char, { scene: this });
          return;
        }
        clickTimer = setTimeout(() => {
          clickTimer = null;
          this._selectChar(char);
          this._togglePartyMember(char);
        }, 220);
      });

      this._listEl.appendChild(card);
    });
  }

  private _attachSprite(host: Element, spriteKey: string): void {
    if (!this.textures.exists(spriteKey)) return;
    const raw = this.textures.get(spriteKey).getSourceImage();
    const src = raw instanceof HTMLCanvasElement ? raw.toDataURL() : (raw as HTMLImageElement).src;
    if (!src) return;
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:pixelated';
    host.appendChild(img);
  }

  // ── 중앙 패널: 선택된 캐릭터 상세 ─────────────────────────────
  private _selectChar(char: Character): void {
    this._selected = char;
    // 카드 selected 표시 갱신
    this._listEl.querySelectorAll('.party-scene__card').forEach(el => {
      el.classList.remove('selected');
    });
    const idx = this._aliveChars().findIndex(c => c.id === char.id);
    const cards = this._listEl.querySelectorAll('.party-scene__card');
    if (idx >= 0 && cards[idx]) cards[idx].classList.add('selected');

    this._renderCenter(char);
  }

  private _renderCenter(char: Character): void {
    const cogC   = getCogColor(char.cog);
    const jobCol = char.job === 'fisher' ? '#c8a070'
      : char.job === 'diver' ? '#7ab0c8' : '#a080e0';
    const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 0;
    const hpCol  = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';
    const masteryCol = (char.mastery || 0) > 0 ? '#e8c070' : '#555544';

    const eff  = CharacterManager.getEffectiveStats(char) as unknown as Record<string, number>;
    const SC   = STAT_COLORS as Record<string, string>;
    const SL   = STAT_LABEL_MAP as Record<string, string>;

    const statsHtml = Object.entries(char.stats).map(([k, v]) => {
      const effV  = eff[k] ?? v;
      const bonus = effV - v;
      const bHtml = bonus > 0 ? `<span class="ps-stat-bonus up">▲+${bonus}</span>`
        : bonus < 0 ? `<span class="ps-stat-bonus dn">▼${bonus}</span>` : '';
      return `<div class="ps-stat-row" data-stat-key="${k}" data-stat-eff="${effV}">
        <span class="ps-stat-key">${SL[k] ?? k}</span>
        <span class="ps-stat-val" style="color:${SC[k] ?? '#c8bfb0'}">${effV}${bHtml}</span>
      </div>`;
    }).join('');

    const abilitiesHtml = (['passive', 'action', 'enhanced', 'finale'] as const).map(type => {
      const id   = char[type] as string;
      const nm   = AbilityIndex.getName(type, id) || id;
      const desc = AbilityIndex.getDesc(type, id) || '';
      return `<div class="ps-ab-row" data-ab-type="${type}" data-ab-id="${id}">
        <span class="ps-ab-type">${ABILITY_LABELS[type]}</span>
        <span class="ps-ab-name">${nm}</span>
        ${desc ? `<span class="ps-ab-desc">${desc}</span>` : ''}
      </div>`;
    }).join('');

    const ocHtml = char.overclock ? `
      <div class="ps-detail-divider"></div>
      <div class="ps-overclock" style="color:${char.overclock.color}">[오버클럭] ${char.overclock.label}</div>
    ` : '';

    this._centerEl.innerHTML = `
      <div class="ps-portrait-wrap">
        <div class="ps-portrait" id="ps-portrait-${char.id}"></div>
      </div>
      <div class="ps-info">
        <div class="ps-name">${char.name}</div>
        <div class="ps-job" style="color:${jobCol}" data-job="${char.job}">${char.jobLabel}</div>
        <div class="ps-cog" style="color:${cogC.css}">Cog ${char.cog}  ·  합계 ${char.statSum}</div>
        <div class="ps-mastery" style="color:${masteryCol}">숙련도 Lv.${char.mastery || 0}</div>
        <div class="ps-hp-row">
          <div class="ps-hp-bar"><div class="ps-hp-fill" style="width:${Math.round(hpPct*100)}%;background:${hpCol}"></div></div>
          <span class="ps-hp-txt">HP ${char.currentHp} / ${char.maxHp}</span>
        </div>
        ${ocHtml}
        <div class="ps-detail-divider"></div>
        <div class="ps-stats">${statsHtml}</div>
        <div class="ps-detail-divider"></div>
        <div class="ps-abilities">${abilitiesHtml}</div>
      </div>
    `;
    this._attachSprite(this._centerEl.querySelector(`#ps-portrait-${char.id}`)!, char.spriteKey);

    // 툴팁 바인딩
    const jobEl = this._centerEl.querySelector<HTMLElement>('[data-job]');
    if (jobEl) {
      jobEl.style.cursor = 'help';
      jobEl.addEventListener('mouseenter', e => {
        const tip = getJobTooltip(char.job);
        if (tip) this._showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, tip);
      });
      jobEl.addEventListener('mousemove', e => this._moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      jobEl.addEventListener('mouseleave', () => this._hideTip());
    }
    this._centerEl.querySelectorAll<HTMLElement>('.ps-stat-row[data-stat-key]').forEach(row => {
      const key  = row.dataset.statKey as StatKey;
      const effV = Number(row.dataset.statEff ?? 0);
      row.style.cursor = 'help';
      row.addEventListener('mouseenter', e => {
        this._showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, getStatTooltipDynamic(key, effV));
      });
      row.addEventListener('mousemove', e => this._moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      row.addEventListener('mouseleave', () => this._hideTip());
    });
    this._centerEl.querySelectorAll<HTMLElement>('.ps-ab-row[data-ab-id]').forEach(row => {
      const type = row.dataset.abType as 'passive'|'action'|'enhanced'|'finale';
      const id   = row.dataset.abId!;
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

  // ── 우측 파티 슬롯 ───────────────────────────────────────────
  private _renderSlots(): void {
    this._slotsEl.innerHTML = '';
    for (let i = 0; i < MAX_PARTY; i++) {
      const id    = this._party[i];
      const chars = this._aliveChars();
      const char  = id ? chars.find(c => c.id === id) : null;
      const slot  = document.createElement('div');
      slot.className = 'party-scene__slot';
      if (char) {
        const cogC = getCogColor(char.cog);
        slot.classList.add('filled');
        slot.style.setProperty('--slot-cog', cogC.css);
        slot.innerHTML = `
          <span class="party-scene__slot-num">${i + 1}</span>
          <div class="party-scene__slot-sprite" id="ps-slotspr-${i}"></div>
          <div class="party-scene__slot-name">${char.name}</div>
        `;
        this._attachSprite(slot.querySelector(`#ps-slotspr-${i}`)!, char.spriteKey);
        slot.addEventListener('click', () => this._togglePartyMember(char));
      } else {
        slot.innerHTML = `
          <span class="party-scene__slot-num">${i + 1}</span>
          <span class="party-scene__slot-plus">+</span>
        `;
      }
      this._slotsEl.appendChild(slot);
    }
  }

  private _togglePartyMember(char: Character): void {
    const idx = this._party.indexOf(char.id);
    if (idx >= 0) {
      this._party.splice(idx, 1);
    } else if (this._party.length < MAX_PARTY) {
      this._party.push(char.id);
    }
    this._renderList();
    this._renderSlots();
    this._refreshDepartState();
  }

  // ── 출발 버튼 상태 / 비용 ────────────────────────────────────
  private _refreshDepartState(): void {
    const has = this._party.length > 0;
    this._departBtn.disabled = !has;
    this._departBtn.classList.toggle('active', has);
    if (!has) {
      this._costEl.textContent = '파티를 선택하세요';
      return;
    }
    const chars = this._aliveChars();
    const cost  = this._party.reduce((s, id) => {
      const c = chars.find(ch => ch.id === id);
      return s + (c?.cog ?? 0);
    }, 0);
    const arc = (SaveManager.getProgress() as { arc?: number })?.arc ?? 0;
    this._costEl.innerHTML = `편성 ${this._party.length} / ${MAX_PARTY}  ·  Arc ${arc} → 소비 <strong>${cost}</strong>`;
  }

  private _onDepart(): void {
    if (this._party.length === 0) return;
    const chars = this._aliveChars();
    const cost  = this._party.reduce((s, id) => {
      const c = chars.find(ch => ch.id === id);
      return s + (c?.cog ?? 0);
    }, 0);

    const ok = (SaveManager.spendArc as ((n: number) => boolean) | undefined)
      ? (SaveManager.spendArc as (n: number) => boolean)(cost) : true;
    if (!ok) { this._costEl.textContent = 'Arc 부족'; return; }

    const saveParty = (CharacterManager as unknown as { saveParty?: (p: string[]) => void }).saveParty;
    if (saveParty) saveParty(this._party);

    this._departBtn.disabled = true;
    const W = this.scale.width, H = this.scale.height;
    const flash = this.add.rectangle(0, 0, W, H, 0x050407, 0).setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 350, ease: 'Sine.easeIn',
      onComplete: () => this.scene.start('ExploreScene', { from: 'PartyScene' }),
    });
  }

  // ── 툴팁 ─────────────────────────────────────────────────────
  private _showTip(x: number, y: number, text: string): void {
    if (!this._tip) {
      const el = document.createElement('div');
      el.className = 'mng-tooltip';
      (document.getElementById('game-container') ?? document.body).appendChild(el);
      this._tip = el;
    }
    this._tip.innerHTML = text.replace(/\n/g, '<br>');
    this._tip.style.display = 'block';
    this._moveTip(x, y);
  }
  private _moveTip(x: number, y: number): void {
    if (!this._tip) return;
    const W  = this._tip.offsetWidth || 160;
    const H  = this._tip.offsetHeight || 60;
    const vw = window.innerWidth, vh = window.innerHeight;
    this._tip.style.left = `${x + 12 + W > vw ? x - W - 8 : x + 12}px`;
    this._tip.style.top  = `${y + 8  + H > vh ? y - H - 8 : y + 8}px`;
  }
  private _hideTip(): void { if (this._tip) this._tip.style.display = 'none'; }

  shutdown(): void {
    this._tip?.remove();
    this._tip = null;
    this._rootEl?.remove();
  }
}
