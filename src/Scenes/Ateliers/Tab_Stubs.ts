// ================================================================
//  Tab_Stubs.ts
//  경로: src/Scenes/Ateliers/Tab_Stubs.ts
//
//  역할: 아틀리에 보조 탭 구현
//        시설 / 외주 / 드레지 / 상점 / 창고 / 도감 / 회상
//        모두 CSS DOM, Phaser 미사용
// ================================================================

import { SaveManager }      from '../../Managers/SaveManager';
import { CharacterManager } from '../../Managers/CharacterManager';
import { AbilityIndex }     from '../../Data/AbilityIndex';
import type { Character }   from '../../types';

// ── 공통 베이스 ──────────────────────────────────────────────────
class CssTab {
  readonly _container: null = null;
  protected _el!: HTMLElement;

  protected _build(contentEl: HTMLElement, html: string): void {
    const el = document.createElement('div');
    el.className = 'atelier-tab-panel';
    el.innerHTML = html;
    contentEl.appendChild(el);
    this._el = el;
  }

  show():    void { this._el.classList.add('active'); }
  hide():    void { this._el.classList.remove('active'); }
  destroy(): void { this._el.remove(); }
}

// ================================================================
//  시설 탭
//  — Arc로 시설 레벨 업그레이드 (레벨별 효과 표시)
// ================================================================
interface FacilityDef {
  id: string; name: string; maxLv: number;
  cost: (lv: number) => number;
  effect: (lv: number) => string;
}
const FACILITIES: FacilityDef[] = [
  {
    id: 'barracks', name: '막사', maxLv: 5,
    cost: lv => (lv + 1) * 500,
    effect: lv => lv === 0 ? '잠금됨' : `최대 파티원 +${lv}명`,
  },
  {
    id: 'workshop', name: '작업실', maxLv: 5,
    cost: lv => (lv + 1) * 600,
    effect: lv => lv === 0 ? '잠금됨' : `영입 가격 -${lv * 5}%`,
  },
  {
    id: 'clinic', name: '의무실', maxLv: 5,
    cost: lv => (lv + 1) * 400,
    effect: lv => lv === 0 ? '잠금됨' : `치료비 -${lv * 10}%`,
  },
  {
    id: 'archive', name: '기록실', maxLv: 5,
    cost: lv => (lv + 1) * 700,
    effect: lv => lv === 0 ? '잠금됨' : `도감 슬롯 +${lv * 2}`,
  },
];

export class Tab_Facility extends CssTab {
  private _scene: Phaser.Scene;
  constructor(scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    super();
    this._scene = scene;
    this._renderFacility(contentEl);
  }

  private _renderFacility(contentEl: HTMLElement): void {
    const save = SaveManager.load() ?? { arc: 0, day: 1 };
    const arc  = save.arc ?? 0;

    const el = document.createElement('div');
    el.className = 'atelier-tab-panel';
    el.innerHTML = `
      <div class="stub-tab-wrap">
        <div class="stub-tab-title">시  설</div>
        <div class="stub-arc-display">보유 Arc &nbsp;<span class="stub-arc-val" id="fac-arc">${arc}</span></div>
        <div class="stub-facility-grid" id="fac-grid"></div>
      </div>`;
    contentEl.appendChild(el);
    this._el = el;

    const grid = el.querySelector<HTMLElement>('#fac-grid')!;
    const arcEl = el.querySelector<HTMLElement>('#fac-arc')!;

    FACILITIES.forEach(fac => {
      const lv  = Number(save[`fac_${fac.id}`] ?? 0);
      const row = document.createElement('div');
      row.className = 'stub-fac-row';
      row.innerHTML = `
        <div class="stub-fac-name">${fac.name}</div>
        <div class="stub-fac-lv">Lv.${lv} / ${fac.maxLv}</div>
        <div class="stub-fac-effect">${fac.effect(lv)}</div>
        <button class="stub-fac-btn" data-id="${fac.id}" ${lv >= fac.maxLv ? 'disabled' : ''}>
          업그레이드 ◈${fac.cost(lv)}
        </button>`;
      grid.appendChild(row);

      if (lv < fac.maxLv) {
        row.querySelector('button')!.addEventListener('click', () => {
          const cost = fac.cost(lv);
          if (!SaveManager.spendArc(cost)) { return; }
          const s = SaveManager.load()!;
          s[`fac_${fac.id}`] = lv + 1;
          SaveManager.save(s);
          this._scene.events.emit('arcUpdated', SaveManager.getArc());
          arcEl.textContent = String(SaveManager.getArc());
          this._renderFacility(contentEl.parentElement!);
          el.remove();
        });
      }
    });
  }
}

// ================================================================
//  외주 탭
//  — 보유 캐릭터를 탐사에 파견해 자동 Arc 수집
// ================================================================
export class Tab_Outsource extends CssTab {
  constructor(_scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    super();
    this._renderOutsource(contentEl);
  }

  private _renderOutsource(contentEl: HTMLElement): void {
    const chars     = CharacterManager.loadAll() ?? [];
    const save      = SaveManager.load() ?? { arc: 0, day: 1 };
    const deployed  = (save['outsource_deployed'] as string[] | undefined) ?? [];
    const arc       = save.arc ?? 0;

    const el = document.createElement('div');
    el.className = 'atelier-tab-panel';
    el.innerHTML = `
      <div class="stub-tab-wrap">
        <div class="stub-tab-title">외  주</div>
        <div class="stub-arc-display">보유 Arc &nbsp;<span class="stub-arc-val">${arc}</span></div>
        <div class="stub-outsource-desc">파견된 대원은 매일 Arc를 수집합니다. (파견 중 전투 불가)</div>
        <div class="stub-outsource-list" id="out-list"></div>
      </div>`;
    contentEl.appendChild(el);
    this._el = el;

    const list = el.querySelector<HTMLElement>('#out-list')!;
    if (chars.length === 0) {
      list.innerHTML = `<div class="stub-empty">보유 캐릭터 없음</div>`;
      return;
    }

    chars.filter(c => c.status !== 'dead_chip').forEach((char: Character) => {
      const isOut = deployed.includes(char.id);
      const row   = document.createElement('div');
      row.className = 'stub-out-row';
      row.innerHTML = `
        <div class="stub-out-name">${char.name}</div>
        <div class="stub-out-job">${char.jobLabel} / Cog ${char.cog}</div>
        <div class="stub-out-earn">예상 Arc +${char.cog * 10} / day</div>
        <button class="stub-out-btn ${isOut ? 'active' : ''}" data-id="${char.id}">
          ${isOut ? '귀환' : '파견'}
        </button>`;
      list.appendChild(row);

      row.querySelector('button')!.addEventListener('click', () => {
        const s = SaveManager.load()!;
        const d = (s['outsource_deployed'] as string[] | undefined) ?? [];
        if (isOut) {
          s['outsource_deployed'] = d.filter(id => id !== char.id);
        } else {
          d.push(char.id);
          s['outsource_deployed'] = d;
        }
        SaveManager.save(s);
        this._renderOutsource(contentEl.parentElement!);
        el.remove();
      });
    });
  }
}

// ================================================================
//  드레지 탭
//  — 탐사 로그 기반 진행 상황, 보상 수령
// ================================================================
export class Tab_Dredge extends CssTab {
  constructor(_scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    super();
    const save    = SaveManager.load() ?? { arc: 0, day: 1 };
    const arc     = save.arc ?? 0;
    const day     = save.day ?? 1;
    const quota   = Math.floor(day / 7) + 1;  // 주간 쿼터
    const cleared = Number(save['dredge_cleared'] ?? 0);

    this._build(contentEl, `
      <div class="stub-tab-wrap">
        <div class="stub-tab-title">드  레  지</div>
        <div class="stub-arc-display">보유 Arc &nbsp;<span class="stub-arc-val">${arc}</span></div>
        <div class="stub-dredge-info">
          <div class="stub-dredge-row"><span>현재 일차</span><span>Day ${day}</span></div>
          <div class="stub-dredge-row"><span>주간 쿼터</span><span>${cleared} / ${quota} 완료</span></div>
          <div class="stub-dredge-bar">
            <div class="stub-dredge-fill" style="width:${Math.min(100, cleared / quota * 100).toFixed(1)}%"></div>
          </div>
          <div class="stub-dredge-hint">탐사를 완료하면 드레지 쿼터가 채워집니다.</div>
          <div class="stub-dredge-reward">
            <div class="stub-dredge-row"><span>쿼터 달성 보상</span><span class="stub-arc-val">◈ ${quota * 200} Arc</span></div>
            ${cleared >= quota
              ? `<button class="stub-fac-btn" id="dredge-claim">보상 수령</button>`
              : `<button class="stub-fac-btn" disabled>달성 전</button>`
            }
          </div>
        </div>
      </div>`);

    const btn = this._el.querySelector<HTMLElement>('#dredge-claim');
    if (btn) {
      btn.addEventListener('click', () => {
        const reward = quota * 200;
        SaveManager.setArc(SaveManager.getArc() + reward);
        const s = SaveManager.load()!;
        s['dredge_cleared'] = 0;
        SaveManager.save(s);
        btn.textContent = '수령 완료';
        btn.setAttribute('disabled', '');
      });
    }
  }
}

// ================================================================
//  상점 탭
//  — Arc로 아이템 구매 (캐릭터 치료, 스탯 부스터)
// ================================================================
interface StoreItem { id: string; name: string; desc: string; price: number }
const STORE_ITEMS: StoreItem[] = [
  { id:'heal_all',    name:'전체 치료',    desc:'모든 생존 대원 HP 완전 회복',     price: 300 },
  { id:'stat_boost',  name:'스탯 강화제',  desc:'랜덤 대원 보류 스탯 포인트 +1',   price: 500 },
  { id:'arc_pack',    name:'Arc 압축팩',   desc:'Arc +1000 즉시 획득',            price: 800 },
  { id:'cog_catalyst',name:'Cog 촉매',     desc:'파티 최대 Cog 임시 +1 (1회 탐사)',price: 1200 },
];

export class Tab_Shop extends CssTab {
  private _scene: Phaser.Scene;
  constructor(scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    super();
    this._scene = scene;
    this._renderShop(contentEl);
  }

  private _renderShop(contentEl: HTMLElement): void {
    const arc = SaveManager.getArc();
    const el  = document.createElement('div');
    el.className = 'atelier-tab-panel';
    el.innerHTML = `
      <div class="stub-tab-wrap">
        <div class="stub-tab-title">상  점</div>
        <div class="stub-arc-display">보유 Arc &nbsp;<span class="stub-arc-val" id="shop-arc">${arc}</span></div>
        <div class="stub-store-grid" id="store-grid"></div>
      </div>`;
    contentEl.appendChild(el);
    this._el = el;

    const arcEl = el.querySelector<HTMLElement>('#shop-arc')!;
    const grid  = el.querySelector<HTMLElement>('#store-grid')!;

    STORE_ITEMS.forEach(item => {
      const canAfford = arc >= item.price;
      const card = document.createElement('div');
      card.className = 'stub-store-card';
      card.innerHTML = `
        <div class="stub-store-name">${item.name}</div>
        <div class="stub-store-desc">${item.desc}</div>
        <button class="stub-store-btn" ${canAfford ? '' : 'disabled'}>◈${item.price}</button>`;
      grid.appendChild(card);

      if (canAfford) {
        card.querySelector('button')!.addEventListener('click', () => {
          if (!SaveManager.spendArc(item.price)) return;
          this._applyItem(item.id);
          arcEl.textContent = String(SaveManager.getArc());
          this._scene.events.emit('arcUpdated', SaveManager.getArc());
          // 버튼 disabled
          const btn = card.querySelector('button')!;
          btn.setAttribute('disabled', '');
          btn.textContent = '구매 완료';
        });
      }
    });
  }

  private _applyItem(id: string): void {
    const chars = CharacterManager.loadAll() ?? [];
    if (id === 'heal_all') {
      chars.forEach(c => { if (c.status !== 'dead_chip') c.currentHp = c.maxHp; });
      CharacterManager.saveAll(chars);
    } else if (id === 'stat_boost') {
      const alive = chars.filter(c => c.status !== 'dead_chip');
      if (alive.length) {
        const target = alive[Math.floor(Math.random() * alive.length)];
        target.pendingStats = (target.pendingStats ?? 0) + 1;
        CharacterManager.saveAll(chars);
      }
    } else if (id === 'arc_pack') {
      SaveManager.setArc(SaveManager.getArc() + 1000);
    } else if (id === 'cog_catalyst') {
      const s = SaveManager.load()!;
      s['cog_boost_temp'] = (Number(s['cog_boost_temp'] ?? 0)) + 1;
      SaveManager.save(s);
    }
  }
}

// ================================================================
//  창고 탭
//  — 획득한 아이템/장비 목록 표시
// ================================================================
export class Tab_Storage extends CssTab {
  constructor(_scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    super();
    const save    = SaveManager.load() ?? { arc: 0, day: 1 };
    const storage = (save['storage_items'] as Array<{ name: string; desc: string; count: number }> | undefined) ?? [];

    this._build(contentEl, `
      <div class="stub-tab-wrap">
        <div class="stub-tab-title">창  고</div>
        ${storage.length === 0
          ? `<div class="stub-empty">보관된 아이템 없음</div>`
          : `<div class="stub-storage-list">${
              storage.map(it => `
                <div class="stub-storage-row">
                  <span class="stub-storage-name">${it.name}</span>
                  <span class="stub-storage-desc">${it.desc}</span>
                  <span class="stub-storage-count">×${it.count}</span>
                </div>`).join('')
            }</div>`
        }
        <div class="stub-storage-hint">탐사 중 획득한 아이템이 여기 보관됩니다.</div>
      </div>`);
  }
}

// ================================================================
//  도감 탭
//  — 해금된 어빌리티 목록 (passive/action/enhanced/finale)
// ================================================================
export class Tab_Codex extends CssTab {
  constructor(_scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    super();
    const chars    = CharacterManager.loadAll() ?? [];
    const seen:    Record<string, Set<string>> = {
      passive: new Set(), action: new Set(), enhanced: new Set(), finale: new Set(),
    };
    chars.forEach(c => {
      if (c.passive)  seen.passive.add(c.passive);
      if (c.action)   seen.action.add(c.action);
      if (c.enhanced) seen.enhanced.add(c.enhanced);
      if (c.finale)   seen.finale.add(c.finale);
    });

    const typeLabel: Record<string, string> = {
      passive: 'PASSIVE', action: 'ACTION', enhanced: 'ENHANCED', finale: 'FINALE',
    };
    const typeColor: Record<string, string> = {
      passive: '#a0d080', action: '#c8a060', enhanced: '#80b8e0', finale: '#e08080',
    };

    let sections = '';
    (['passive','action','enhanced','finale'] as const).forEach(type => {
      const ids = [...seen[type]];
      if (!ids.length) return;
      sections += `
        <div class="stub-codex-section">
          <div class="stub-codex-type" style="color:${typeColor[type]}">${typeLabel[type]}</div>
          ${ids.map(id => {
            const nm = AbilityIndex.getName(type, id) || id;
            const ds = AbilityIndex.getDesc(type, id) || '';
            return `<div class="stub-codex-entry">
              <div class="stub-codex-name" style="color:${typeColor[type]}">${nm}</div>
              <div class="stub-codex-desc">${ds}</div>
            </div>`;
          }).join('')}
        </div>`;
    });

    this._build(contentEl, `
      <div class="stub-tab-wrap">
        <div class="stub-tab-title">도  감</div>
        ${sections || '<div class="stub-empty">해금된 어빌리티 없음</div>'}
      </div>`);
  }
}

// ================================================================
//  회상 탭
//  — 사망한 대원들의 기록
// ================================================================
export class Tab_Memory extends CssTab {
  constructor(_scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    super();
    const save    = SaveManager.load() ?? { arc: 0, day: 1 };
    const records = (save['death_records'] as Array<{
      name: string; job: string; cog: number;
      day: number; killedBy?: string;
    }> | undefined) ?? [];

    this._build(contentEl, `
      <div class="stub-tab-wrap">
        <div class="stub-tab-title">회  상</div>
        ${records.length === 0
          ? `<div class="stub-empty">사망 기록 없음</div>`
          : `<div class="stub-memory-list">${
              records.slice().reverse().map(r => `
                <div class="stub-memory-row">
                  <div class="stub-memory-name">${r.name}</div>
                  <div class="stub-memory-info">${r.job} / Cog ${r.cog} / Day ${r.day}</div>
                  ${r.killedBy ? `<div class="stub-memory-by">— ${r.killedBy} 에 의해 전사</div>` : ''}
                </div>`).join('')
            }</div>`
        }
      </div>`);
  }
}
