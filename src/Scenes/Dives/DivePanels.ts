// ================================================================
//  DivePanels.ts
//  경로: src/Scenes/Dives/DivePanels.ts
//
//  역할: DiveScene 5개 패널 CSS DOM 렌더러
//        인벤토리 / 잠수정 / 상점 / 파티 / 일지
// ================================================================

import { CharacterManager }       from '../../Managers/CharacterManager';
import { CharacterSpriteManager } from '../../Managers/CharacterSpriteManager';
import { AbilityIndex }     from '../../Data/AbilityIndex';
import type { Character }   from '../../types';

// ── 공통 타입 ──────────────────────────────────────────────────
export interface InventoryItem {
  id: string; name: string; desc: string; color: string;
}
export interface AugmentItem {
  id: string; name: string; desc: string; color: string;
  shape?: number[][];
}
export interface ShopItem {
  id: string; name: string; desc: string; color: string;
  price: number; type: 'consumable' | 'augment';
  shape?: number[][];
  sold: boolean;
}
export interface LogEntry {
  round?: number; type?: string; result?: string; note?: string;
}
export interface SubmarineData {
  pending: AugmentItem[];
  grid: (AugmentItem | null)[];
}

// ── 상점 초기 데이터 ────────────────────────────────────────────
export const SHOP_DEFAULTS: ShopItem[] = [
  { id:'potion_hp',    name:'회복 포션',   desc:'HP를 30 회복한다.',          color:'#c03060', price:2, type:'consumable', sold:false },
  { id:'potion_gauge', name:'게이지 주사', desc:'전투 게이지를 100 충전한다.', color:'#3060c0', price:3, type:'consumable', sold:false },
  { id:'ration',       name:'건조식량',    desc:'탐사 라운드를 1 연장한다.',   color:'#806030', price:4, type:'consumable', sold:false },
  { id:'aug_pressure', name:'수압 강화',   desc:'아군 전체 공격력 +10%',      color:'#3090a0', price:5, type:'augment',     shape:[[1,1,0],[0,1,1]], sold:false },
  { id:'aug_shell',    name:'철각 외장',   desc:'아군 전체 피격 데미지 -8%',  color:'#806040', price:6, type:'augment',     shape:[[1,0],[1,1],[0,1]], sold:false },
];

export const INV_MAX   = 10;
export const SUB_COLS  = 8;
export const SUB_ROWS  = 4;

// ================================================================
//  인벤토리 패널
// ================================================================
export function renderInventory(
  el: HTMLElement,
  inventory: (InventoryItem | null)[],
): void {
  const filled = inventory.filter(Boolean).length;
  el.innerHTML = `
    <div class="inv-section-lbl">인벤토리 &nbsp;${filled} / ${INV_MAX}</div>
    <div class="inv-grid" id="inv-grid"></div>
  `;
  const grid = el.querySelector('#inv-grid')!;

  inventory.forEach((item, idx) => {
    const cell = document.createElement('div');
    cell.className = `inv-cell${item ? ' filled' : ''}`;

    if (item) {
      cell.innerHTML = `
        <div class="inv-cell__icon" style="background:${item.color}80;border:1px solid ${item.color}"></div>
        <div class="inv-cell__name">${item.name}</div>
      `;
      // 툴팁
      let tip: HTMLElement | null = null;
      cell.addEventListener('mouseenter', (e) => {
        tip = document.createElement('div');
        tip.className = 'inv-tooltip';
        tip.innerHTML = `<div class="inv-tooltip__name">${item.name}</div><div class="inv-tooltip__desc">${item.desc}</div>`;
        document.body.appendChild(tip);
        _positionTip(tip, e as MouseEvent);
      });
      cell.addEventListener('mousemove', (e) => { if (tip) _positionTip(tip, e as MouseEvent); });
      cell.addEventListener('mouseleave', () => { tip?.remove(); tip = null; });
    } else {
      cell.innerHTML = `<div class="inv-cell__num">${idx + 1}</div>`;
    }
    grid.appendChild(cell);
  });
}

function _positionTip(tip: HTMLElement, e: MouseEvent): void {
  const margin = 10;
  let x = e.clientX + margin, y = e.clientY + margin;
  const rect = tip.getBoundingClientRect();
  if (x + rect.width  > window.innerWidth)  x = e.clientX - rect.width  - margin;
  if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - margin;
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
}

// ================================================================
//  잠수정 패널
// ================================================================
export function renderSubmarine(
  el: HTMLElement,
  sub: SubmarineData,
  onGridChange: () => void,
): void {
  el.innerHTML = `
    <div class="sub-pending-area" id="sub-pending">
      <div class="sub-pending-lbl">대기 — 클릭하여 장착</div>
    </div>
    <div class="sub-grid-wrap">
      <div class="sub-grid-lbl">잠  수  정 — 장착 시 효과 발동</div>
      <div class="sub-grid" id="sub-grid" style="grid-template-columns:repeat(${SUB_COLS},1fr)"></div>
    </div>
  `;

  const pendingEl = el.querySelector('#sub-pending')!;
  const gridEl    = el.querySelector('#sub-grid')!;

  // 대기 증강 렌더
  sub.pending.forEach(aug => {
    const star = document.createElement('div');
    star.className = 'sub-aug-star';
    star.title = `${aug.name}\n${aug.desc}`;
    star.style.background = `${aug.color}40`;
    star.style.border = `1px solid ${aug.color}`;
    star.style.boxShadow = `0 0 6px ${aug.color}60`;
    star.textContent = aug.name;
    star.addEventListener('click', () => {
      _subPlaceToGrid(sub, aug);
      onGridChange();
    });
    pendingEl.appendChild(star);
  });

  // 그리드 셀 렌더
  for (let row = 0; row < SUB_ROWS; row++) {
    for (let col = 0; col < SUB_COLS; col++) {
      const idx = row * SUB_COLS + col;
      const aug = sub.grid[idx];
      const cell = document.createElement('div');
      cell.className = `sub-cell${aug ? ' placed' : ''}`;

      if (aug) {
        cell.style.background = `${aug.color}38`;
        cell.style.borderColor = `${aug.color}90`;
        // 같은 증강의 첫 셀에만 이름 표시
        const prev = col > 0 ? sub.grid[idx - 1] : null;
        if (prev !== aug) {
          const nm = document.createElement('div');
          nm.className = 'sub-cell__name';
          nm.style.color = aug.color;
          nm.textContent = aug.name;
          cell.appendChild(nm);
        }
        cell.title = `${aug.name} — 클릭하여 제거`;
        cell.addEventListener('click', () => {
          _subRemoveFromGrid(sub, aug);
          onGridChange();
        });
      }
      gridEl.appendChild(cell);
    }
  }
}

function _subPlaceToGrid(sub: SubmarineData, aug: AugmentItem): void {
  const cells = aug.shape ? aug.shape.flat().filter(Boolean).length : 1;
  for (let row = 0; row < SUB_ROWS; row++) {
    for (let col = 0; col <= SUB_COLS - cells; col++) {
      const fits = Array.from({ length: cells }, (_, k) =>
        sub.grid[row * SUB_COLS + col + k] === null
      ).every(Boolean);
      if (fits) {
        for (let k = 0; k < cells; k++) sub.grid[row * SUB_COLS + col + k] = aug;
        const pi = sub.pending.indexOf(aug);
        if (pi !== -1) sub.pending.splice(pi, 1);
        return;
      }
    }
  }
}

function _subRemoveFromGrid(sub: SubmarineData, aug: AugmentItem): void {
  for (let i = 0; i < sub.grid.length; i++) {
    if (sub.grid[i] === aug) sub.grid[i] = null;
  }
  sub.pending.push(aug);
}

// ================================================================
//  상점 패널
// ================================================================
export function renderShop(
  el: HTMLElement,
  shopItems: ShopItem[],
  deepCoin: number,
  onBuy: (item: ShopItem, coinEl: HTMLElement) => void,
): void {
  const consumables = shopItems.filter(i => i.type === 'consumable');
  const augments    = shopItems.filter(i => i.type === 'augment');

  el.innerHTML = `
    <div class="shop-coin" id="shop-coin">보유 심해화폐 &nbsp;◈ ${deepCoin}</div>
    <div class="shop-section-lbl">▸ 소모품</div>
    <div class="shop-grid" id="shop-consume"></div>
    <div class="shop-section-lbl">▸ 증강</div>
    <div class="shop-grid" id="shop-augment"></div>
  `;

  const coinEl = el.querySelector<HTMLElement>('#shop-coin')!;
  _renderShopCards(el.querySelector('#shop-consume')!, consumables, deepCoin, coinEl, onBuy);
  _renderShopCards(el.querySelector('#shop-augment')!, augments,    deepCoin, coinEl, onBuy);
}

function _renderShopCards(
  container: Element,
  items: ShopItem[],
  deepCoin: number,
  coinEl: HTMLElement,
  onBuy: (item: ShopItem, coinEl: HTMLElement) => void,
): void {
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `shop-card${item.sold ? ' sold' : ''}`;

    if (item.sold) {
      card.innerHTML = `
        <div class="shop-card__icon" style="background:${item.color}30"></div>
        <div class="shop-card__info"><div class="shop-card__name">${item.name}</div></div>
        <div class="shop-card__sold-tag">SOLD</div>
      `;
    } else {
      const canAfford = deepCoin >= item.price;
      card.innerHTML = `
        <div class="shop-card__icon" style="background:${item.color}70;border:1px solid ${item.color}"></div>
        <div class="shop-card__info">
          <div class="shop-card__name">${item.name}</div>
          <div class="shop-card__desc">${item.desc}</div>
        </div>
        <button class="shop-buy-btn" ${canAfford ? '' : 'disabled'}>◈${item.price}</button>
      `;
      if (canAfford) {
        card.querySelector('button')!.addEventListener('click', () => onBuy(item, coinEl));
      }
    }
    container.appendChild(card);
  });
}

// ================================================================
//  파티 패널
// ================================================================
export function renderParty(
  el: HTMLElement,
  partyIds: string[],
  scene: Phaser.Scene,
): void {
  const allChars = CharacterManager.loadAll() ?? [];
  const chars    = partyIds
    .map(id => allChars.find(c => c.id === id))
    .filter((c): c is Character => !!c && (c.status === 'alive' || c.status === 'dead_chip'));

  if (chars.length === 0) {
    el.innerHTML = `<div class="journal-empty">탐사 파티원이 없습니다</div>`;
    return;
  }

  el.innerHTML = `
    <div class="party-layout">
      <div class="party-list party-divider" id="party-list"></div>
      <div class="party-center party-divider" id="party-center"></div>
      <div class="party-right" id="party-right"></div>
    </div>
  `;

  const listEl   = el.querySelector<HTMLElement>('#party-list')!;
  const centerEl = el.querySelector<HTMLElement>('#party-center')!;
  const rightEl  = el.querySelector<HTMLElement>('#party-right')!;

  let selId = chars[0].id;

  const renderCenter = (char: Character) => {
    centerEl.innerHTML = '';
    const _diveSrc = char.spriteKey ? CharacterSpriteManager.getDomSrc(char.spriteKey) : '';
    if (_diveSrc) {
      const img = document.createElement('img');
      img.src = _diveSrc;
      img.className = 'party-center__sprite';
      centerEl.appendChild(img);
    } else {
      centerEl.innerHTML = `<div style="color:#2a1a0a;font-size:2em;font-family:monospace">?</div>`;
    }
  };

  const renderRight = (char: Character) => {
    const cogC  = CharacterManager.getCogColor(char.cog);
    const SC    = CharacterManager.STAT_COLORS as Record<string, string>;
    const SL    = CharacterManager.STAT_LABEL_MAP as Record<string, string>;
    const eff   = CharacterManager.getEffectiveStats(char);
    const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';

    const abilRows = (['passive','action','enhanced','finale'] as const).map(type => {
      const id = char[type];
      const nm = id ? (AbilityIndex.getName(type, id) || id) : '—';
      const typeLabel: Record<string, string> = { passive:'PASSIVE', action:'ACTION', enhanced:'ENHANCED', finale:'FINALE' };
      return `<div class="party-abil-cell">
        <div class="party-abil-type">${typeLabel[type]}</div>
        <div class="party-abil-name" style="color:${type==='passive'?'#a0d080':type==='action'?'#c8a060':type==='enhanced'?'#80b8e0':'#e08080'}">${nm}</div>
      </div>`;
    }).join('');

    const statRows = Object.entries(char.stats).map(([k, v]) => {
      const effV  = (eff as unknown as Record<string, number>)[k] ?? v;
      const bonus = effV - v;
      return `<div class="party-stat-row">
        <span class="party-stat-key">${SL[k] ?? k}</span>
        <span class="party-stat-val" style="color:${SC[k]??'#c8bfb0'}">${effV}${bonus > 0 ? `<span style="color:#80c870;font-size:0.8em"> +${bonus}</span>` : ''}</span>
      </div>`;
    }).join('');

    rightEl.innerHTML = `
      <div class="party-name-txt">${char.name}</div>
      <div class="party-info-row">Cog ${char.cog} &nbsp;|&nbsp; ${char.jobLabel}</div>
      <div class="party-info-row">숙련도 Lv.${char.mastery ?? 0}</div>
      <div class="party-hp-bar-wrap">
        <div class="party-hp-bar-fill" style="width:${Math.round(hpPct*100)}%;background:${hpCol}"></div>
        <span class="party-hp-bar-txt">HP &nbsp;${char.currentHp} / ${char.maxHp}</span>
      </div>
      <div class="party-cog-bar" style="color:${cogC.css}">◈ &nbsp;Cog &nbsp;${char.cog} &nbsp;◈</div>
      <div class="party-stat-block">${statRows}</div>
      <div class="party-abil-row">${abilRows}</div>
    `;
  };

  const renderCards = () => {
    listEl.innerHTML = '';
    chars.forEach(char => {
      const cogC  = CharacterManager.getCogColor(char.cog);
      const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
      const hpCol = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';
      const isSel = char.id === selId;

      const card = document.createElement('div');
      card.className = `party-card${isSel ? ' selected' : ''}`;
      card.innerHTML = `
        <div class="party-card__cog" style="color:${cogC.css}">C${char.cog}</div>
        <div class="party-card__name">${char.name}</div>
        <div class="party-card__hp"><div class="party-card__hp-fill" style="width:${Math.round(hpPct*100)}%;background:${hpCol}"></div></div>
      `;
      card.addEventListener('click', () => {
        selId = char.id;
        renderCards();
        renderCenter(char);
        renderRight(char);
      });
      listEl.appendChild(card);
    });
  };

  renderCards();
  renderCenter(chars[0]);
  renderRight(chars[0]);
}

// ================================================================
//  탐사 일지 패널
// ================================================================
export function renderJournal(el: HTMLElement, log: LogEntry[]): void {
  if (log.length === 0) {
    el.innerHTML = `<div class="journal-empty">기록 없음</div>`;
    return;
  }

  el.innerHTML = [...log].reverse().map(entry => {
    const txt = entry.note
      ?? `R${entry.round ?? '?'} &nbsp; ${entry.type ?? ''} &nbsp;— &nbsp;${entry.result ?? ''}`;
    const cls = entry.result === 'victory' ? 'victory' : entry.result === 'defeat' ? 'defeat' : '';
    return `<div class="journal-line ${cls}">
      <span class="journal-line__bullet">▸</span>
      <span class="journal-line__txt">${txt}</span>
    </div>`;
  }).join('');
}
