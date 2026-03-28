// ================================================================
//  Tab_Manage_Full.ts — 관리 탭 (캐릭터 목록 + 상세 + 행동)
//  UI: 전체 CSS DOM  |  AtelierScene이 넘기는 contentEl 안에 빌드
//  Layout: [좌 목록] [중 상세] [우 행동]
// ================================================================

import { CharacterManager, getCogColor } from '../../Managers/CharacterManager';
import { AbilityIndex } from '../../Data/AbilityIndex';
import { SaveManager }  from '../../Managers/SaveManager';
import { CharProfile }  from './CharProfile';
import type { Character } from '../../types/index';

// AtelierScene 호환용 null 필드 선언
export class Tab_Manage_Full {
  readonly _container:   null = null;
  readonly _headerPanel: null = null;
  readonly _listPanel:   null = null;
  readonly _centerPanel: null = null;
  readonly _rightPanel:  null = null;
  readonly _backBtn:     null = null;
  readonly _cardObjs:    never[] = [];

  private _scene:   Phaser.Scene;
  private _el:      HTMLDivElement;
  private _onBack:  () => void;
  private _timers:  Phaser.Time.TimerEvent[] = [];

  private _chars:    Character[] = [];
  private _filtered: Character[] = [];
  private _selected: Character | null = null;

  private _filterJob = 'all';
  private _filterCog = 'all';
  private _sortMode: 'none'|'stat'|'cog'|'name' = 'none';
  private _sortAsc  = false;

  // DOM refs
  private _listEl!:   HTMLElement;
  private _centerEl!: HTMLElement;
  private _rightEl!:  HTMLElement;

  constructor(
    scene: Phaser.Scene, _W: number, _H: number,
    onBack: () => void,
    contentEl: HTMLElement,
  ) {
    this._scene  = scene;
    this._onBack = onBack;
    this._chars  = CharacterManager.loadAll() ?? [];
    this._filtered = [...this._chars];

    const el = document.createElement('div');
    el.className = 'atelier-tab-panel manage-full-panel';
    contentEl.appendChild(el);
    this._el = el as HTMLDivElement;

    this._build();
  }

  private _build() {
    this._el.innerHTML = '';

    // ── 상단 필터/정렬 바 ────────────────────────────────────────
    const top = document.createElement('div');
    top.className = 'mng-topbar';
    top.innerHTML = `
      <div class="mng-filter-group">
        <span class="mng-filter-label">직업</span>
        <button class="mng-filter-btn active" data-job="all">전체</button>
        <button class="mng-filter-btn" data-job="fisher">낚시꾼</button>
        <button class="mng-filter-btn" data-job="diver">잠수부</button>
        <button class="mng-filter-btn" data-job="helmsman">조타수</button>
      </div>
      <div class="mng-filter-group">
        <span class="mng-filter-label">정렬</span>
        <button class="mng-sort-btn active" data-sort="none">기본</button>
        <button class="mng-sort-btn" data-sort="stat">스탯↕</button>
        <button class="mng-sort-btn" data-sort="cog">Cog↕</button>
        <button class="mng-sort-btn" data-sort="name">이름↕</button>
      </div>
      <button class="mng-back-btn" id="mng-back">← 돌아가기</button>
    `;
    this._el.appendChild(top);

    // ── 메인 레이아웃 ────────────────────────────────────────────
    const layout = document.createElement('div');
    layout.className = 'mng-layout';

    const listEl   = document.createElement('div'); listEl.className   = 'mng-list';
    const centerEl = document.createElement('div'); centerEl.className = 'mng-center';
    const rightEl  = document.createElement('div'); rightEl.className  = 'mng-right';
    centerEl.innerHTML = '<div class="mng-empty">캐릭터를 선택하십시오</div>';
    rightEl.innerHTML  = '';
    layout.append(listEl, centerEl, rightEl);
    this._el.appendChild(layout);

    this._listEl   = listEl;
    this._centerEl = centerEl;
    this._rightEl  = rightEl;

    // 이벤트: 필터 버튼
    top.querySelectorAll<HTMLElement>('[data-job]').forEach(btn => {
      btn.addEventListener('click', () => {
        top.querySelectorAll('[data-job]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._filterJob = btn.dataset.job!;
        this._applyFilter();
      });
    });
    top.querySelectorAll<HTMLElement>('[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.sort as 'none'|'stat'|'cog'|'name';
        if (this._sortMode === s) { this._sortAsc = !this._sortAsc; }
        else { this._sortMode = s; this._sortAsc = false; }
        top.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._applyFilter();
      });
    });
    top.querySelector('#mng-back')?.addEventListener('click', () => this._onBack());

    this._applyFilter();
  }

  private _applyFilter() {
    let list = [...this._chars];
    if (this._filterJob !== 'all') list = list.filter(c => c.job === this._filterJob);
    if (this._filterCog !== 'all') list = list.filter(c => String(c.cog) === this._filterCog);

    if (this._sortMode !== 'none') {
      list.sort((a,b) => {
        let diff = 0;
        if (this._sortMode === 'stat') diff = a.statSum - b.statSum;
        else if (this._sortMode === 'cog') diff = a.cog - b.cog;
        else if (this._sortMode === 'name') diff = a.name.localeCompare(b.name);
        return this._sortAsc ? diff : -diff;
      });
    }
    this._filtered = list;
    this._renderList();
  }

  private _renderList() {
    this._listEl.innerHTML = '';
    if (!this._filtered.length) {
      this._listEl.innerHTML = '<div class="mng-empty">캐릭터 없음</div>';
      return;
    }
    this._filtered.forEach(char => {
      const cogC = getCogColor(char.cog);
      const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 0;
      const card = document.createElement('div');
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

      // 스프라이트
      if (this._scene.textures.exists(char.spriteKey)) {
        const src = (this._scene.textures.get(char.spriteKey).getSourceImage() as HTMLImageElement).src;
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:pixelated';
        card.querySelector(`#mng-spr-${char.id}`)?.appendChild(img);
      }

      card.addEventListener('click', () => this._selectChar(char));
      this._listEl.appendChild(card);
    });
  }

  _selectChar(char: Character) {
    this._selected = char;
    // selected 클래스 갱신
    this._listEl.querySelectorAll('.mng-card').forEach((c,i) => {
      c.classList.toggle('selected', this._filtered[i]?.id === char.id);
    });
    this._renderCenter(char);
    this._renderRight(char);
  }

  private _renderCenter(char: Character) {
    const cogC   = getCogColor(char.cog);
    const jobCol = char.job === 'fisher' ? '#c8a070'
      : char.job === 'diver' ? '#7ab0c8' : '#a080e0';
    const SC = CharacterManager.STAT_COLORS as Record<string,string>;
    const SL: Record<string,string> = { hp:'체력', health:'건강', attack:'공격', agility:'민첩', luck:'행운' };
    const AL: Record<string,string> = { passive:'패시브', action:'행동', enhanced:'강화', finale:'피날레' };

    const eff = CharacterManager.getEffectiveStats(char);

    this._centerEl.innerHTML = `
      <div class="mng-detail">
        <div class="mng-detail-header">
          <div class="mng-detail-sprite" id="mng-detail-spr"></div>
          <div class="mng-detail-basic">
            <div class="mng-detail-name">${char.name}</div>
            <div class="mng-detail-job" style="color:${jobCol}">${char.jobLabel}</div>
            <div class="mng-detail-cog" style="color:${cogC.css}">Cog ${char.cog}</div>
            <div class="mng-detail-hprow">
              <div class="mng-detail-hpbar"><div class="mng-detail-hpfill" style="width:${Math.round(char.maxHp>0?char.currentHp/char.maxHp*100:0)}%;background:${char.currentHp/char.maxHp>0.6?'#306030':char.currentHp/char.maxHp>0.3?'#806020':'#803020'}"></div></div>
              <span class="mng-detail-hptxt">HP ${char.currentHp} / ${char.maxHp}</span>
            </div>
          </div>
        </div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-stats">
          ${Object.entries(char.stats).map(([k,v]) => {
            const effV = (eff as unknown as Record<string,number>)[k] ?? v;
            const bonus = effV - v;
            return `<div class="mng-stat-row">
              <span class="mng-stat-key">${SL[k]??k}</span>
              <span class="mng-stat-val" style="color:${SC[k]??'#c8bfb0'}">${v}${bonus>0?`<span class="mng-stat-bonus">+${bonus}</span>`:''}${char.pendingStats>0&&['hp','health','attack','agility','luck'].includes(k)?`<button class="mng-spend-btn" data-key="${k}">+</button>`:''}
              </span>
            </div>`;
          }).join('')}
          ${char.pendingStats > 0 ? `<div class="mng-pending">미배분 스탯 포인트: <strong>${char.pendingStats}</strong></div>` : ''}
        </div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-abilities">
          ${(['passive','action','enhanced','finale'] as const).map(type => {
            const id = char[type as keyof typeof char] as string;
            const nm = AbilityIndex.getName(type, id) || id;
            const ds = AbilityIndex.getDesc(type, id) || '';
            return `<div class="mng-ab-row">
              <span class="mng-ab-type">${AL[type]}</span>
              <span class="mng-ab-name">${nm}</span>
              ${ds ? `<span class="mng-ab-desc">${ds}</span>` : ''}
            </div>`;
          }).join('')}
        </div>
        ${char.overclock ? `
          <div class="mng-detail-divider"></div>
          <div class="mng-overclock" style="color:${char.overclock.color}">[오버클럭]  ${char.overclock.label}</div>
        ` : ''}
      </div>
    `;

    // 스프라이트
    if (this._scene.textures.exists(char.spriteKey)) {
      const src = (this._scene.textures.get(char.spriteKey).getSourceImage() as HTMLImageElement).src;
      const img = document.createElement('img');
      img.src = src;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:pixelated';
      this._centerEl.querySelector('#mng-detail-spr')?.appendChild(img);
    }

    // 스탯 지출 버튼
    this._centerEl.querySelectorAll<HTMLButtonElement>('.mng-spend-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key as keyof Character['stats'];
        if (!char.pendingStats) return;
        const chars = CharacterManager.loadAll() ?? [];
        const target = chars.find(c => c.id === char.id);
        if (!target) return;
        target.stats[key] = (target.stats[key] ?? 0) + 1;
        target.pendingStats--;
        target.statSum = (Object.values(target.stats) as number[]).reduce((a,b) => a+b, 0);
        if (key === 'hp') { target.maxHp = target.stats.hp * 5; }
        CharacterManager.saveAll(chars);
        this._chars = chars;
        this._selected = target;
        this._applyFilter();
        this._renderCenter(target);
        this._renderRight(target);
      });
    });
  }

  private _renderRight(char: Character) {
    const save = SaveManager.load() as Record<string,unknown>|null;
    const arc  = typeof save?.arc === 'number' ? save.arc : 0;
    const healCost = Math.max(1, Math.floor((char.maxHp - char.currentHp) / 10));

    this._rightEl.innerHTML = `
      <div class="mng-right-inner">
        <div class="mng-right-label">행  동</div>
        <div class="mng-right-divider"></div>
        <div class="mng-right-arcrow">보유 Arc: <strong>${arc}</strong></div>
        <button class="mng-action-btn" id="mng-heal"
          ${char.currentHp >= char.maxHp ? 'disabled' : ''}>
          회복 (${healCost} Arc)<br><small>최대 HP로 회복</small>
        </button>
        <div class="mng-right-divider"></div>
        <div class="mng-right-mastery">숙련도: ${char.mastery}</div>
        <div class="mng-right-divider"></div>
        <button class="mng-action-btn" id="mng-profile">프  로  필</button>
        <div class="mng-right-divider"></div>
        <button class="mng-dismiss-btn" id="mng-dismiss">해  고</button>
        <div class="mng-toast" style="opacity:0;transition:opacity 0.3s;text-align:center;color:#e87040;margin-top:0.5em;font-size:0.85em"></div>
      </div>
    `;

    this._rightEl.querySelector('#mng-heal')?.addEventListener('click', () => {
      if (arc < healCost) { this._showRightToast('Arc 부족'); return; }
      const chars = CharacterManager.loadAll() ?? [];
      const t = chars.find(c => c.id === char.id);
      if (!t) return;
      const next = { ...save, arc: arc - healCost } as Parameters<typeof SaveManager.save>[0];
      SaveManager.save(next);
      this._scene.events.emit('arcUpdated', arc - healCost);
      t.currentHp = t.maxHp;
      CharacterManager.saveAll(chars);
      this._chars = chars;
      this._selected = t;
      this._applyFilter();
      this._renderCenter(t);
      this._renderRight(t);
    });

    this._rightEl.querySelector('#mng-profile')?.addEventListener('click', () => {
      CharProfile.open(char, {
        scene: this._scene,
        onHeal: (c, cost) => {
          const s = SaveManager.load() as Record<string, unknown> | null;
          const a = typeof s?.arc === 'number' ? s.arc : 0;
          if (a < cost) { this._showRightToast('Arc 부족'); return; }
          const next = { ...s, arc: a - cost } as Parameters<typeof SaveManager.save>[0];
          SaveManager.save(next);
          const chars = CharacterManager.loadAll() ?? [];
          const t = chars.find(ch => ch.id === c.id);
          if (t) { t.currentHp = t.maxHp; CharacterManager.saveAll(chars); }
          this._chars = CharacterManager.loadAll() ?? [];
          this._selected = this._chars.find(ch => ch.id === c.id) ?? null;
          this._applyFilter();
          if (this._selected) { this._renderCenter(this._selected); this._renderRight(this._selected); }
        },
      });
    });

    this._rightEl.querySelector('#mng-dismiss')?.addEventListener('click', () => {
      if (!confirm(`${char.name}을(를) 해고하시겠습니까?`)) return;
      CharacterManager.removeCharacter(char.id);
      this._chars = CharacterManager.loadAll() ?? [];
      this._selected = null;
      this._centerEl.innerHTML = '<div class="mng-empty">캐릭터를 선택하십시오</div>';
      this._rightEl.innerHTML  = '';
      this._applyFilter();
    });
  }

  private _showRightToast(msg: string) {
    const el = this._rightEl.querySelector<HTMLElement>('.mng-toast');
    if (!el) return;
    el.textContent = msg; el.style.opacity = '1';
    this._timers.push(this._scene.time.delayedCall(1500, () => { el.style.opacity = '0'; }));
  }

  show()    { this._el.classList.add('active'); }
  hide()    { this._el.classList.remove('active'); }
  destroy() {
    this._timers.forEach(t => { try { t.remove(); } catch(_) {} });
    this._timers = [];
    this._el.remove();
  }
}
