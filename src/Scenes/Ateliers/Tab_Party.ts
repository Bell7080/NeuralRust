// ================================================================
//  Tab_Party.ts — 파티 탭 (캐릭터 목록 + 초상화 + 스탯/능력)
//  UI: 전체 CSS DOM  |  AtelierScene이 넘기는 contentEl 안에 빌드
//  Layout: [좌 목록 25%] [중 초상화 28%] [우 스탯+능력 47%]
// ================================================================

import './CharProfile.css';
import { CharacterManager, getCogColor, STAT_COLORS, STAT_LABEL_MAP } from '../../Managers/CharacterManager';
import { AbilityIndex } from '../../Data/AbilityIndex';
import { getStatTooltipDynamic, getJobTooltip } from '../../Data/Data_Tooltips';
import type { Character } from '../../types/index';
import type { StatKey } from '../../types';

const ABILITY_LABELS: Record<string, string> = {
  passive: 'PASSIVE',
  action: 'ACTION',
  enhanced: 'ENHANCED',
  finale: 'FINALE',
};

// AtelierScene 호환용 null 필드 선언
export class Tab_Party {
  readonly _container:   null = null;
  readonly _headerPanel: null = null;
  readonly _listPanel:   null = null;
  readonly _centerPanel: null = null;
  readonly _rightPanel:  null = null;
  readonly _backBtn:     null = null;
  readonly _cardObjs:    never[] = [];

  private _scene:    Phaser.Scene;
  private _el:       HTMLDivElement;
  private _onBack:   () => void;
  private _selected: Character | null = null;

  // DOM refs
  private _listEl!:   HTMLElement;
  private _centerEl!: HTMLElement;
  private _rightEl!:  HTMLElement;
  private _tip:       HTMLElement | null = null;

  constructor(scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    this._scene  = scene;
    this._onBack = () => { /* no-op: party tab has no back navigation */ };

    const el = document.createElement('div');
    el.className = 'atelier-tab-panel party-panel';
    contentEl.appendChild(el);
    this._el = el as HTMLDivElement;

    this._build();
  }

  private _build(): void {
    this._el.innerHTML = '';

    // ── 메인 레이아웃 ────────────────────────────────────────────
    const layout = document.createElement('div');
    layout.className = 'mng-layout';

    const listEl   = document.createElement('div'); listEl.className   = 'mng-list';
    const centerEl = document.createElement('div'); centerEl.className = 'mng-center';
    const rightEl  = document.createElement('div'); rightEl.className  = 'mng-right';
    centerEl.innerHTML = '';
    rightEl.innerHTML  = '';
    layout.append(listEl, centerEl, rightEl);
    this._el.appendChild(layout);

    this._listEl   = listEl;
    this._centerEl = centerEl;
    this._rightEl  = rightEl;

    this._renderList();

    // 첫 번째 캐릭터 자동 선택
    const chars = CharacterManager.loadAll() ?? [];
    if (chars.length > 0) {
      this._selectChar(chars[0]);
    }
  }

  private _renderList(): void {
    this._listEl.innerHTML = '';
    const chars = CharacterManager.loadAll() ?? [];

    if (!chars.length) {
      this._listEl.innerHTML = '<div class="mng-empty">캐릭터 없음</div>';
      return;
    }

    chars.forEach(char => {
      const cogC   = getCogColor(char.cog);
      const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 0;
      const card   = document.createElement('div');
      card.className = 'mng-card';
      if (this._selected?.id === char.id) card.classList.add('selected');
      card.style.setProperty('--card-cog', cogC.css);

      const jobCol = char.job === 'fisher' ? '#c8a070'
        : char.job === 'diver' ? '#7ab0c8' : '#a080e0';

      card.innerHTML = `
        <div class="mng-card-sprite" id="mng-spr-${char.id}"></div>
        <div class="mng-card-info">
          <div class="mng-card-name">${char.name}</div>
          <div class="mng-card-job" style="color:${jobCol}">${char.jobLabel}</div>
          <div class="mng-card-cog" style="color:${cogC.css}">Cog ${char.cog}  ·  합계 ${char.statSum}</div>
          <div class="mng-card-hpbar"><div class="mng-card-hpfill" style="width:${Math.round(hpPct*100)}%;background:${hpPct>0.6?'#306030':hpPct>0.3?'#806020':'#803020'}"></div></div>
          <div class="mng-card-hptxt">${char.currentHp} / ${char.maxHp}</div>
        </div>
      `;

      // 스프라이트 (canvas 텍스처 대응)
      if (this._scene.textures.exists(char.spriteKey)) {
        const raw = this._scene.textures.get(char.spriteKey).getSourceImage();
        const src = raw instanceof HTMLCanvasElement
          ? raw.toDataURL()
          : (raw as HTMLImageElement).src;
        if (src) {
          const img = document.createElement('img');
          img.src = src;
          img.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:pixelated';
          card.querySelector(`#mng-spr-${char.id}`)?.appendChild(img);
        }
      }

      card.addEventListener('click', () => this._selectChar(char));
      this._listEl.appendChild(card);
    });
  }

  private _selectChar(char: Character): void {
    this._selected = char;
    // selected 클래스 갱신
    const chars = CharacterManager.loadAll() ?? [];
    this._listEl.querySelectorAll('.mng-card').forEach((c, i) => {
      c.classList.toggle('selected', chars[i]?.id === char.id);
    });
    this._renderCenter(char);
    this._renderRight(char);
  }

  private _renderCenter(char: Character): void {
    const cogC   = getCogColor(char.cog);
    const jobCol = char.job === 'fisher' ? '#c8a070'
      : char.job === 'diver' ? '#7ab0c8' : '#a080e0';

    const hpRatio    = char.maxHp > 0 ? char.currentHp / char.maxHp : 0;
    const hpBarColor = hpRatio > 0.6 ? '#306030' : hpRatio > 0.3 ? '#806020' : '#803020';
    const masteryColor = (char.mastery || 0) > 0 ? '#e8c070' : '#555544';

    this._centerEl.innerHTML = `
      <div class="party-portrait-panel">
        <div class="party-portrait-sprite" id="party-spr-${char.id}"></div>
        <div class="party-portrait-footer">
          <div class="party-portrait-name">${char.name}</div>
          <div class="party-portrait-job" style="color:${jobCol}" data-job="${char.job}">${char.jobLabel}</div>
          <div class="party-portrait-cog" style="color:${cogC.css}">Cog ${char.cog}</div>
          <div class="party-portrait-mastery" style="color:${masteryColor}">숙련도  Lv.${char.mastery || 0}</div>
          <div class="party-portrait-hprow">
            <div class="party-portrait-hpbar"><div class="party-portrait-hpfill" style="width:${Math.round(hpRatio*100)}%;background:${hpBarColor}"></div></div>
            <span class="party-portrait-hptxt">HP ${char.currentHp} / ${char.maxHp}</span>
          </div>
        </div>
      </div>
    `;

    // 스프라이트
    if (this._scene.textures.exists(char.spriteKey)) {
      const raw = this._scene.textures.get(char.spriteKey).getSourceImage();
      const src = raw instanceof HTMLCanvasElement
        ? raw.toDataURL()
        : (raw as HTMLImageElement).src;
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:pixelated';
        this._centerEl.querySelector(`#party-spr-${char.id}`)?.appendChild(img);
      }
    }

    // 직업 툴팁 바인딩
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
  }

  private _renderRight(char: Character): void {
    const eff     = CharacterManager.getEffectiveStats(char) as unknown as Record<string, number>;
    const SC      = STAT_COLORS as Record<string, string>;
    const SL      = STAT_LABEL_MAP as Record<string, string>;
    const ocKey   = char.overclock?.statKey ?? null;
    const ocColor = char.overclock?.color ?? '#ff9900';

    const masteryColor = (char.mastery || 0) > 0 ? '#e8c070' : '#666655';
    const masteryText  = `숙련도  Lv.${char.mastery || 0}`;

    // 스탯 행 HTML
    const statsHtml = Object.entries(char.stats).map(([k, v]) => {
      const effV    = eff[k] ?? v;
      const isOc    = k === ocKey;

      if (isOc) {
        return `<div class="mng-stat-row mng-stat-row--oc" data-stat-key="${k}" data-stat-eff="${effV}" style="--oc-color:${ocColor}">
          <span class="mng-stat-key">${SL[k] ?? k}</span>
          <span class="mng-stat-val" style="color:${ocColor}">${v} → ${effV}</span>
        </div>`;
      }

      const bonus = effV - v;
      const bonusHtml = bonus > 0
        ? `<span class="mng-stat-bonus mng-stat-bonus--up">▲+${bonus}</span>`
        : bonus < 0
        ? `<span class="mng-stat-bonus mng-stat-bonus--dn">▼${bonus}</span>`
        : '';

      return `<div class="mng-stat-row" data-stat-key="${k}" data-stat-eff="${effV}">
        <span class="mng-stat-key">${SL[k] ?? k}</span>
        <span class="mng-stat-val" style="color:${SC[k] ?? '#c8bfb0'}">${effV}${bonusHtml}</span>
      </div>`;
    }).join('');

    // 능력 행 HTML
    const abilitiesHtml = (['passive', 'action', 'enhanced', 'finale'] as const).map(type => {
      const id  = char[type as keyof typeof char] as string;
      const nm  = AbilityIndex.getName(type, id) || id;
      const ds  = AbilityIndex.getDesc(type, id) || '';
      return `<div class="mng-ab-row" data-ab-type="${type}" data-ab-id="${id}">
        <span class="mng-ab-type">${ABILITY_LABELS[type]}</span>
        <span class="mng-ab-name">${nm}</span>
        ${ds ? `<span class="mng-ab-desc">${ds}</span>` : ''}
      </div>`;
    }).join('');

    // 오버클럭 블록
    const ocHtml = char.overclock ? `
      <div class="mng-detail-divider"></div>
      <div class="mng-overclock party-oc-pulse" style="color:${char.overclock.color}">[오버클럭]  ${char.overclock.label}</div>
    ` : '';

    this._rightEl.innerHTML = `
      <div class="mng-detail party-right-detail">
        <div class="party-right-name" style="color:#e8c070;font-size:1.15em;font-weight:bold;margin-bottom:0.3em">${char.name}</div>
        <div class="party-right-mastery" style="color:${masteryColor};font-size:0.85em;margin-bottom:0.2em">${masteryText}</div>
        <div class="mng-detail-job" style="color:${char.job === 'fisher' ? '#c8a070' : char.job === 'diver' ? '#7ab0c8' : '#a080e0'}" data-job-tip="${char.job}">${char.jobLabel}</div>
        ${ocHtml}
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-hprow" style="margin-bottom:0.4em">
          <div class="mng-detail-hpbar"><div class="mng-detail-hpfill" style="width:${Math.round(char.maxHp>0?char.currentHp/char.maxHp*100:0)}%;background:${char.currentHp/char.maxHp>0.6?'#306030':char.currentHp/char.maxHp>0.3?'#806020':'#803020'}"></div></div>
          <span class="mng-detail-hptxt">HP ${char.currentHp} / ${char.maxHp}</span>
        </div>
        <div class="mng-detail-cog" style="color:${getCogColor(char.cog).css};margin-bottom:0.4em">Cog ${char.cog}  ·  합계 ${char.statSum}</div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-stats">${statsHtml}</div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-abilities">${abilitiesHtml}</div>
      </div>
    `;

    // 직업 툴팁
    const jobTipEl = this._rightEl.querySelector<HTMLElement>('[data-job-tip]');
    if (jobTipEl) {
      jobTipEl.style.cursor = 'help';
      jobTipEl.addEventListener('mouseenter', e => {
        const tip = getJobTooltip(char.job);
        if (tip) this._showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, tip);
      });
      jobTipEl.addEventListener('mousemove', e => this._moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      jobTipEl.addEventListener('mouseleave', () => this._hideTip());
    }

    // 스탯 행 툴팁
    this._rightEl.querySelectorAll<HTMLElement>('.mng-stat-row[data-stat-key]').forEach(row => {
      const key  = row.dataset.statKey as StatKey;
      const effV = Number(row.dataset.statEff ?? 0);
      row.style.cursor = 'help';
      row.addEventListener('mouseenter', e => {
        const tip = getStatTooltipDynamic(key, effV);
        this._showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, tip);
      });
      row.addEventListener('mousemove', e => this._moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      row.addEventListener('mouseleave', () => this._hideTip());
    });

    // 능력 행 툴팁
    this._rightEl.querySelectorAll<HTMLElement>('.mng-ab-row[data-ab-id]').forEach(row => {
      const type = row.dataset.abType as 'passive' | 'action' | 'enhanced' | 'finale';
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

  // ── 툴팁 ────────────────────────────────────────────────────────

  private _showTip(x: number, y: number, text: string): void {
    if (!this._tip) {
      const el = document.createElement('div');
      el.className = 'mng-tooltip';
      document.getElementById('game-container')?.appendChild(el) ?? document.body.appendChild(el);
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const lx = x + 12 + W > vw ? x - W - 8 : x + 12;
    const ly = y + 8  + H > vh ? y - H - 8 : y + 8;
    this._tip.style.left = `${lx}px`;
    this._tip.style.top  = `${ly}px`;
  }

  private _hideTip(): void {
    if (this._tip) this._tip.style.display = 'none';
  }

  // ── 공개 메서드 ─────────────────────────────────────────────────

  show():    void { this._el.classList.add('active'); }
  hide():    void { this._el.classList.remove('active'); }
  destroy(): void {
    this._tip?.remove();
    this._tip = null;
    this._el.remove();
  }
}
