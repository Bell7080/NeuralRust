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
import { getStatTooltipDynamic, getJobTooltip, buildJobTipHtml, buildAbilTipHtml, buildSimpleTipHtml } from '../../Data/Data_Tooltips';
import type { Character, StatKey } from '../../types';

// ── 호버 툴팁 ──────────────────────────────────────────────────
let _divePanelsTip: HTMLElement | null = null;

function _ensureTip(): HTMLElement {
  if (_divePanelsTip) return _divePanelsTip;
  const el = document.createElement('div');
  el.className = 'mng-tooltip';
  (document.getElementById('game-container') ?? document.body).appendChild(el);
  _divePanelsTip = el;
  return el;
}
function _showTip(x: number, y: number, html: string): void {
  const el = _ensureTip();
  el.innerHTML = html;
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

// ── 증강 상세 패널 (클릭 핀) ────────────────────────────────────
let _subDetailEl: HTMLElement | null = null;

function _ensureSubDetail(): HTMLElement {
  if (_subDetailEl) return _subDetailEl;
  const el = document.createElement('div');
  el.className = 'sub-aug-detail';
  el.style.display = 'none';
  (document.getElementById('game-container') ?? document.body).appendChild(el);
  _subDetailEl = el;
  return el;
}

function _showSubDetail(aug: AugmentItem, rect: DOMRect): void {
  const el = _ensureSubDetail();
  const shape = aug.shape ?? [[1]];
  el.innerHTML = `
    <div class="sub-aug-detail__name" style="color:${aug.color}">${aug.name}</div>
    <div class="sub-aug-detail__shape">형태 &nbsp;·&nbsp; ${_shapeLabel(shape)}</div>
    <div class="sub-aug-detail__stat">${aug.desc}</div>
    <div class="sub-aug-detail__hint">▸ 드래그해서 잠수정에 배치</div>
  `;
  el.style.display = 'block';
  // Remove old animation so it replays
  el.style.animation = 'none';
  requestAnimationFrame(() => {
    el.style.animation = '';
    const vw = window.innerWidth, vh = window.innerHeight;
    const elW = el.offsetWidth  || 230;
    const elH = el.offsetHeight || 120;
    let left = rect.left + rect.width / 2 - elW / 2;
    let top  = rect.bottom + 10;
    if (left < 8)           left = 8;
    if (left + elW > vw - 8) left = vw - elW - 8;
    if (top + elH > vh - 8)  top  = rect.top - elH - 10;
    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;
  });
}

function _hideSubDetail(): void {
  if (_subDetailEl) _subDetailEl.style.display = 'none';
}

// ── 공통 타입 ──────────────────────────────────────────────────
export interface InventoryItem {
  id: string; name: string; desc: string; color: string;
}
export interface AugmentItem {
  id: string; name: string; desc: string; color: string;
  shape?: number[][];
  // 잠수정 대기 공간에서 표시할 커스텀 배경 에셋 경로이다.
  artKey?: string;
  // 잠수정 그리드 상의 앵커 좌표(드래그 배치/제거 시 사용)이다.
  anchor?: { row: number; col: number };
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

// 잠수정 패널에서 현재 확대 고정된(핀) 증강 카드 id를 기억한다.
let _pinnedAugmentId: string | null = null;
// 잠수정 패널 드래그 중인 증강을 공유 상태로 저장한다.
let _draggingAugment: AugmentItem | null = null;
// 패널 안에서 떠다니는 카드의 좌표를 id 기반으로 기억해 재렌더 시에도 안정된 위치를 유지한다.
const _augPosMap = new Map<string, { x: number; y: number }>();

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
      cell.addEventListener('mouseenter', (e) => {
        const ev = e as MouseEvent;
        _showTip(ev.clientX, ev.clientY, buildSimpleTipHtml(item.name, item.desc, item.color));
      });
      cell.addEventListener('mousemove', (e) => _moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY));
      cell.addEventListener('mouseleave', _hideTip);
    } else {
      cell.innerHTML = `<div class="inv-cell__num">${idx + 1}</div>`;
    }
    grid.appendChild(cell);
  });
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
      <div class="sub-pending-lbl">대기 증강 — 클릭: 상세 정보 &nbsp;/&nbsp; 드래그: 배치</div>
    </div>
    <div class="sub-grid-wrap">
      <div class="sub-grid-lbl">잠  수  정 — 장착 시 효과 발동</div>
      <div class="sub-grid" id="sub-grid" style="grid-template-columns:repeat(${SUB_COLS},1fr)"></div>
    </div>
  `;

  const pendingEl = el.querySelector('#sub-pending')!;
  const gridEl    = el.querySelector('#sub-grid')!;

  // 패널 외부 클릭 시 핀 해제
  const onDocClick = () => {
    _hideSubDetail();
    _pinnedAugmentId = null;
    pendingEl.querySelectorAll<HTMLElement>('.sub-aug-star.pinned')
      .forEach(s => s.classList.remove('pinned'));
  };
  document.addEventListener('click', onDocClick, { once: true });

  // 대기 증강 렌더
  sub.pending.forEach(aug => {
    const star = document.createElement('div');
    star.className = 'sub-aug-star';
    // 네온/야광 콘셉트: 색 배경 + 외부 글로우
    star.style.background = `${aug.color}38`;
    star.style.border      = `1px solid ${aug.color}cc`;
    star.style.boxShadow   = `0 0 8px ${aug.color}55, inset 0 0 6px ${aug.color}22`;
    // 배경 에셋 (증강 id 기반 순환)
    star.style.setProperty('--aug-art',      `url("${_pickAugmentArt(aug.id)}")`);
    star.style.setProperty('--aug-mask-art', `url("${_pickRandomMaskArt()}")`);
    star.style.setProperty('--aug-glow',     aug.color);
    // 모양 데이터
    const shape = aug.shape ?? [[1]];
    star.dataset.shape = JSON.stringify(shape);
    star.dataset.augId = aug.id;
    // 개별 부유 타이밍 — 서로 다른 속도/거리/기울기로 우주 유영 느낌
    star.style.setProperty('--float-delay',    `${(Math.random() * 5).toFixed(2)}s`);
    star.style.setProperty('--float-distance', `${(5 + Math.random() * 9).toFixed(1)}px`);
    star.style.setProperty('--float-tilt',     `${(-6 + Math.random() * 12).toFixed(1)}deg`);
    star.style.setProperty('--twinkle-delay',  `${(Math.random() * 3).toFixed(2)}s`);

    const label = document.createElement('div');
    label.className = 'sub-aug-star__label';
    label.textContent = aug.name;
    star.appendChild(label);

    // 이미 핀 상태이면 클래스 복원
    if (_pinnedAugmentId === aug.id) star.classList.add('pinned');

    // 호버 툴팁 (핀 상태가 아닐 때만)
    star.addEventListener('mouseenter', (e) => {
      if (_pinnedAugmentId === aug.id) return;
      const ev = e as MouseEvent;
      _showTip(ev.clientX, ev.clientY, buildSimpleTipHtml(aug.name, aug.desc, aug.color));
    });
    star.addEventListener('mousemove', (e) => {
      if (_pinnedAugmentId !== aug.id)
        _moveTip((e as MouseEvent).clientX, (e as MouseEvent).clientY);
    });
    star.addEventListener('mouseleave', () => {
      if (_pinnedAugmentId !== aug.id) _hideTip();
    });

    // 클릭: 핀 상세 패널 토글 (re-render 없이)
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      document.addEventListener('click', onDocClick, { once: true }); // 다시 등록
      _hideTip();
      if (_pinnedAugmentId === aug.id) {
        _pinnedAugmentId = null;
        star.classList.remove('pinned');
        _hideSubDetail();
      } else {
        pendingEl.querySelectorAll<HTMLElement>('.sub-aug-star.pinned')
          .forEach(s => s.classList.remove('pinned'));
        _pinnedAugmentId = aug.id;
        star.classList.add('pinned');
        _showSubDetail(aug, star.getBoundingClientRect());
      }
    });

    // 드래그 (브라우저 기본 ghost image 사용 — setDragImage 호출 시 transform 애니메이션과 충돌하여 드래그 자체가 불발되는 케이스를 방지)
    star.draggable = true;
    star.addEventListener('dragstart', (e) => {
      _draggingAugment = aug;
      _hideSubDetail();
      _hideTip();
      _pinnedAugmentId = null;
      star.classList.remove('pinned');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', aug.id);
      }
      // 드래그 중에는 부유 애니메이션을 멈춰서 ghost와 위치가 어긋나지 않게 한다.
      star.classList.add('dragging');
    });
    star.addEventListener('dragend', () => {
      _draggingAugment = null;
      star.classList.remove('dragging');
    });

    pendingEl.appendChild(star);
  });

  // ── 카드 산포 배치 (패널 전체에 떠다니도록) ─────────────────
  const positionStars = () => {
    const stars = Array.from(pendingEl.querySelectorAll<HTMLElement>('.sub-aug-star'));
    if (stars.length === 0) return;
    const pw = (pendingEl as HTMLElement).clientWidth;
    const ph = (pendingEl as HTMLElement).clientHeight;
    if (pw < 40 || ph < 40) {
      requestAnimationFrame(positionStars);
      return;
    }
    const cardSize = stars[0].offsetWidth || 48;
    const padTop   = 30;        // 라벨 영역 확보
    const margin   = 6;
    const usableW  = Math.max(cardSize, pw - cardSize - margin * 2);
    const usableH  = Math.max(cardSize, ph - cardSize - padTop - margin);
    const N        = stars.length;
    // 가로/세로 비율을 반영한 균형 잡힌 그리드 분할
    const cols     = Math.max(1, Math.round(Math.sqrt(N * (usableW / Math.max(1, usableH)))));
    const rows     = Math.max(1, Math.ceil(N / cols));
    const cellW    = usableW / cols;
    const cellH    = usableH / rows;

    stars.forEach((star, idx) => {
      const augId = star.dataset.augId ?? '';
      let pos = _augPosMap.get(augId);
      if (!pos) {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const baseX = margin + col * cellW + cellW * 0.5 - cardSize * 0.5;
        const baseY = padTop + row * cellH + cellH * 0.5 - cardSize * 0.5;
        // 각 셀 내부에서 큰 폭으로 흔들어 격자감을 지운다.
        const jitterX = (Math.random() - 0.5) * cellW * 0.8;
        const jitterY = (Math.random() - 0.5) * cellH * 0.7;
        pos = {
          x: Math.max(margin, Math.min(pw - cardSize - margin, baseX + jitterX)),
          y: Math.max(padTop, Math.min(ph - cardSize - margin, baseY + jitterY)),
        };
        _augPosMap.set(augId, pos);
      }
      star.style.left = `${pos.x}px`;
      star.style.top  = `${pos.y}px`;
    });
  };
  requestAnimationFrame(positionStars);

  // 그리드 셀 렌더
  for (let row = 0; row < SUB_ROWS; row++) {
    for (let col = 0; col < SUB_COLS; col++) {
      const idx = row * SUB_COLS + col;
      const aug = sub.grid[idx];
      const cell = document.createElement('div');
      cell.className = `sub-cell${aug ? ' placed' : ''}`;
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      // 드롭 가능 영역 하이라이트를 위해 드래그 오버 이벤트를 등록한다.
      cell.addEventListener('dragover', (e) => {
        if (_draggingAugment && _canPlaceAt(sub, _draggingAugment, row, col)) {
          e.preventDefault();
          cell.classList.add('drop-ok');
        }
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('drop-ok'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drop-ok');
        if (!_draggingAugment) return;
        const placedAug = _draggingAugment;
        if (_subPlaceAt(sub, placedAug, row, col)) {
          _augPosMap.delete(placedAug.id);
          _hideSubDetail();
          _pinnedAugmentId = null;
          onGridChange();
        }
      });

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

// 배치용 레이어 마스크에는 배틀/일반 배경을 랜덤으로 선택해 사용한다.
function _pickRandomMaskArt(): string {
  const assets = [
    '/Games/Assets/Sprites/Background_002.png',
    '/Games/Assets/Sprites/Background_006.png',
    '/Games/Assets/Sprites/BattleBackground_001.png',
    '/Games/Assets/Sprites/BattleBackground_004.png',
    '/Games/Assets/Sprites/BattleBackground_005.png',
  ];
  return assets[Math.floor(Math.random() * assets.length)];
}

// 도형 배열을 사람이 읽기 쉬운 이름(ㄴ/ㅁ/L/I 등)으로 요약한다.
function _shapeLabel(shape: number[][]): string {
  const h = shape.length;
  const w = Math.max(...shape.map(r => r.length));
  const count = shape.flat().filter(Boolean).length;
  if (h === 1 && w >= 4) return 'I';
  if (h === 2 && w === 2 && count === 4) return 'ㅁ';
  if (count >= 4 && (h >= 3 || w >= 3)) return 'L/ㄴ 계열';
  return '커스텀';
}

function _canPlaceAt(sub: SubmarineData, aug: AugmentItem, baseRow: number, baseCol: number): boolean {
  const shape = aug.shape ?? [[1]];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const row = baseRow + r;
      const col = baseCol + c;
      if (row < 0 || row >= SUB_ROWS || col < 0 || col >= SUB_COLS) return false;
      if (sub.grid[row * SUB_COLS + col] !== null) return false;
    }
  }
  return true;
}

function _subPlaceAt(sub: SubmarineData, aug: AugmentItem, baseRow: number, baseCol: number): boolean {
  if (!_canPlaceAt(sub, aug, baseRow, baseCol)) return false;
  const shape = aug.shape ?? [[1]];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const row = baseRow + r;
      const col = baseCol + c;
      sub.grid[row * SUB_COLS + col] = aug;
    }
  }
  aug.anchor = { row: baseRow, col: baseCol };
  const pi = sub.pending.indexOf(aug);
  if (pi !== -1) sub.pending.splice(pi, 1);
  return true;
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
        if (t) _showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, buildJobTipHtml(char.job, t));
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
        _showTip((e as MouseEvent).clientX, (e as MouseEvent).clientY, buildAbilTipHtml(type, nm, desc));
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
