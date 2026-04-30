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
import { getStatTooltipDynamic, getJobTooltip } from '../../Data/Data_Tooltips';
import type { Character, StatKey } from '../../types';

// ── 툴팁 (모듈 내 공유) ────────────────────────────────────────
let _divePanelsTip: HTMLElement | null = null;

// 설명창 가독성 향상:
// 1) 제목(크게) 2) 설명(중간) 3) 현재 수치(작게) 3단 레이아웃을 고정 적용한다.
function _formatTooltipHtml(text: string): string {
  const lines = text.split('\\n').map(v => v.trim()).filter(Boolean);
  const title = lines[0] ?? '';
  const desc  = lines[1] ?? '';
  // 제목 텍스트를 기준으로 테마 색을 자동 선택한다. (스탯/능력/기타)
  const themeColor = (() => {
    if (/체력|HP/i.test(title)) return '#d96a74';
    if (/건강|Health/i.test(title)) return '#5bc9a8';
    if (/공격|Attack/i.test(title)) return '#d0834a';
    if (/민첩|Agility/i.test(title)) return '#b48af6';
    if (/행운|Luck/i.test(title)) return '#e8c66a';
    if (/스킬|능력|피날레|강화|오버클럭/i.test(title)) return '#7fc7ff';
    return '#e8c78f';
  })();
  // 값 라인은 3번째 줄부터 모두 포함해 스탯/스킬/기타 설명창 포맷을 통일한다.
  const value = lines.slice(2).join('<br>');
  return [
    title ? `<div class="mng-tooltip__title" style="color:${themeColor}">${title}</div>` : '',
    desc ? `<div class="mng-tooltip__desc">${desc}</div>` : '',
    value ? `<div class="mng-tooltip__value" style="color:${themeColor}">${value}</div>` : '',
  ].join('');
}

function _ensureTip(): HTMLElement {
  if (_divePanelsTip) return _divePanelsTip;
  const el = document.createElement('div');
  el.className = 'mng-tooltip';
  (document.getElementById('game-container') ?? document.body).appendChild(el);
  _divePanelsTip = el;
  return el;
}
function _showTip(x: number, y: number, text: string): void {
  const el = _ensureTip();
  el.innerHTML = _formatTooltipHtml(text);
  el.style.display = 'block';
  _moveTip(x, y);
}
function _moveTip(x: number, y: number): void {
  if (!_divePanelsTip) return;
  const W  = _divePanelsTip.offsetWidth || 160;
  const H  = _divePanelsTip.offsetHeight || 60;
  const vw = window.innerWidth, vh = window.innerHeight;
  _divePanelsTip.style.left = `${x + 12 + W > vw ? x - W - 8 : x + 12}px`;
  _divePanelsTip.style.top  = `${y + 8  + H > vh ? y - H - 8 : y + 8}px`;
}
function _hideTip(): void { if (_divePanelsTip) _divePanelsTip.style.display = 'none'; }

// ── 공통 타입 ──────────────────────────────────────────────────
export interface InventoryItem {
  id: string; name: string; desc: string; color: string;
}
export interface AugmentItem {
  id: string; name: string; desc: string; color: string;
  shape?: number[][];
  // 잠수정 대기 공간에서 표시할 커스텀 배경 에셋 경로이다.
  artKey?: string;
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
  // 탐사 밸류 강화를 위해 민첩/보상 계열 증강도 기본 풀에 포함한다.
  { id:'aug_tide',     name:'조류 기동',   desc:'아군 전체 민첩 +12%',         color:'#53c4df', price:6, type:'augment',     shape:[[1,1,1],[0,1,0]], sold:false },
  { id:'aug_salvage',  name:'인양 증폭',   desc:'탐사 종료 보상 +15%',         color:'#d0b76e', price:7, type:'augment',     shape:[[1,1],[1,1]], sold:false },
  // 테스트 시 다양한 블럭 모양을 바로 확인할 수 있도록 5~6종 이상의 증강을 제공한다.
  { id:'aug_overdrive',name:'과급 터빈',   desc:'아군 전체 공격 속도 +10%',    color:'#f18d65', price:7, type:'augment',     shape:[[1,0,0],[1,1,1]], sold:false },
  { id:'aug_barrier',  name:'심해 장막',   desc:'아군 전체 방어력 +12%',        color:'#8aa8ff', price:7, type:'augment',     shape:[[1,1,1,1]], sold:false },
  { id:'aug_lens',     name:'추적 렌즈',   desc:'치명타 확률 +8%',              color:'#b08cff', price:8, type:'augment',     shape:[[1,1,0],[0,1,1]], sold:false },
  { id:'aug_resonance',name:'공명 코일',   desc:'스킬 위력 +10%',              color:'#58d7b6', price:8, type:'augment',     shape:[[0,1,0],[1,1,1]], sold:false },
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
        // 인벤토리 설명도 동일한 3줄 포맷을 사용하도록 통일한다.
        tip.className = 'mng-tooltip';
        tip.innerHTML = _formatTooltipHtml(`${item.name}\\n아이템 설명\\n${item.desc}`);
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
    // 대기 중인 블럭은 심해 네온/야광 콘셉트를 살리기 위해 배경 + 글로우를 동시에 부여한다.
    star.style.background = `${aug.color}40`;
    star.style.border = `1px solid ${aug.color}`;
    star.style.boxShadow = `0 0 6px ${aug.color}60`;
    // 배경 에셋은 증강 카드별로 순환하여 시각적인 다양성을 만든다.
    const art = _pickAugmentArt(aug.id);
    star.style.setProperty('--aug-art', `url("${art}")`);
    // 심해 별/블럭 입자를 연출하기 위해 pseudo 레이어에 사용할 색상도 CSS 변수로 전달한다.
    star.style.setProperty('--aug-glow', aug.color);
    star.textContent = '';
    const label = document.createElement('div');
    label.className = 'sub-aug-star__label';
    label.textContent = aug.name;
    star.appendChild(label);
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

// 증강 id를 기반으로 배경 텍스처를 순환 선택해, 중복 클릭 카드도 다른 테마처럼 보이게 만든다.
function _pickAugmentArt(seed: string): string {
  const assets = [
    '/Games/Assets/Sprites/Background_001.png',
    '/Games/Assets/Sprites/Background_004.png',
    '/Games/Assets/Sprites/BattleBackground_002.png',
    '/Games/Assets/Sprites/BattleBackground_006.png',
    '/Games/Assets/Sprites/Background_007.png',
  ];
  const hash = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return assets[hash % assets.length];
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
    const vid = document.createElement('video');
    vid.className = 'party-center__video';
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = true;
    (vid as HTMLVideoElement & { playsInline: boolean }).playsInline = true;
    const videoPath = CharacterSpriteManager.getVideoPath(char.job);
    if (videoPath) {
      vid.src = videoPath;
      vid.load();
      vid.play().catch(() => {});
    }
    centerEl.appendChild(vid);
  };

  const renderRight = (char: Character) => {
    const cogC  = CharacterManager.getCogColor(char.cog);
    const SC    = CharacterManager.STAT_COLORS as Record<string, string>;
    const eff   = CharacterManager.getEffectiveStats(char) as unknown as Record<string, number>;
    const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';
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
        <span class="mng-stat-val" style="color:${SC[k]??'#c8bfb0'}">${v}${bHtml}</span>
      </div>`;
    }).join('');

    const abilRows = (['passive','action','enhanced','finale'] as const).map(type => {
      const id = char[type];
      const nm = id ? (AbilityIndex.getName(type, id) || id) : '—';
      const ds = id ? (AbilityIndex.getDesc(type, id) || '') : '';
      return `<div class="mng-ab-row" data-ab-type="${type}" data-ab-id="${id ?? ''}">
        <span class="mng-ab-type">${AL[type]}</span>
        <span class="mng-ab-name">${nm}</span>
        ${ds ? `<span class="mng-ab-desc">${ds}</span>` : ''}
      </div>`;
    }).join('');

    const jobCol = char.job === 'fisher' ? '#c8a070' : char.job === 'diver' ? '#7ab0c8' : '#a080e0';
    rightEl.innerHTML = `
      <div class="mng-right-detail">
        <div class="mng-detail-header">
          <div class="mng-detail-basic">
            <div class="mng-detail-name">${char.name}</div>
            <div class="mng-detail-job" style="color:${jobCol}" data-job="${char.job}">${char.jobLabel}</div>
            <div class="mng-detail-cog" style="color:${cogC.css}">Cog ${char.cog}  ·  합계 ${char.statSum}</div>
            <div class="mng-detail-hprow">
              <div class="mng-detail-hpbar"><div class="mng-detail-hpfill" style="width:${Math.round(hpPct*100)}%;background:${hpCol}"></div></div>
              <span class="mng-detail-hptxt">HP ${char.currentHp} / ${char.maxHp}</span>
            </div>
          </div>
        </div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-stats">${statRows}</div>
        <div class="mng-detail-divider"></div>
        <div class="mng-detail-abilities">${abilRows}</div>
        ${char.overclock ? `<div class="mng-detail-divider"></div><div class="mng-overclock" style="color:${char.overclock.color}">${char.overclock.label}</div>` : ''}
        <div class="mng-detail-divider"></div>
        <div class="mng-right-mastery">숙련도: ${char.mastery ?? 0}</div>
      </div>
    `;

    // 툴팁 바인딩
    const jobEl = rightEl.querySelector<HTMLElement>('[data-job]');
    if (jobEl) {
      jobEl.style.cursor = 'help';
      jobEl.addEventListener('mouseenter', e => {
        const t = getJobTooltip(char.job);
        if (t) _showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, t);
      });
      jobEl.addEventListener('mousemove', e => _moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      jobEl.addEventListener('mouseleave', () => _hideTip());
    }
    rightEl.querySelectorAll<HTMLElement>('.mng-stat-row[data-stat-key]').forEach(row => {
      const key  = row.dataset.statKey as StatKey;
      const effV = Number(row.dataset.statEff ?? 0);
      row.style.cursor = 'help';
      row.addEventListener('mouseenter', e => {
        _showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, getStatTooltipDynamic(key, effV));
      });
      row.addEventListener('mousemove', e => _moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      row.addEventListener('mouseleave', () => _hideTip());
    });
    rightEl.querySelectorAll<HTMLElement>('.mng-ab-row[data-ab-id]').forEach(row => {
      const type = row.dataset.abType as 'passive'|'action'|'enhanced'|'finale';
      const id   = row.dataset.abId!;
      if (!id) return;
      const desc = AbilityIndex.getDesc(type, id);
      if (!desc) return;
      row.style.cursor = 'help';
      row.addEventListener('mouseenter', e => {
        const nm = AbilityIndex.getName(type, id) || id;
        _showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, `${nm}\n${desc}`);
      });
      row.addEventListener('mousemove', e => _moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      row.addEventListener('mouseleave', () => _hideTip());
    });
  };

  const renderCards = () => {
    listEl.innerHTML = '';
    chars.forEach(char => {
      const cogC   = CharacterManager.getCogColor(char.cog);
      const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
      const hpCol  = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#803020';
      const jobCol = char.job === 'fisher' ? '#c8a070' : char.job === 'diver' ? '#7ab0c8' : '#a080e0';
      const isSel  = char.id === selId;

      const card = document.createElement('div');
      card.className = `party-card${isSel ? ' selected' : ''}`;

      const spriteEl = document.createElement('img');
      spriteEl.className = 'party-card__sprite';
      const _src = CharacterSpriteManager.getDomSrc(char.spriteKey);
      if (_src) { spriteEl.src = _src; } else { spriteEl.style.opacity = '0'; }

      const info = document.createElement('div');
      info.className = 'party-card__info';
      info.innerHTML = `
        <div class="party-card__name">${char.name}</div>
        <div class="party-card__job" style="color:${jobCol}">${char.jobLabel}</div>
        <div class="party-card__cog" style="color:${cogC.css}">Cog ${char.cog} · 합계 ${char.statSum}</div>
        <div class="party-card__hp"><div class="party-card__hp-fill" style="width:${Math.round(hpPct*100)}%;background:${hpCol}"></div></div>
        <div class="party-card__hptxt">${char.currentHp} / ${char.maxHp}</div>
      `;

      card.append(spriteEl, info);
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
