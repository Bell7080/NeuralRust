// ================================================================
//  AtelierHUD.ts
//  경로: src/Scenes/Ateliers/AtelierHUD.ts
//
//  역할: #atelier-hud DOM 생성·관리
//        DAY / ARC 표시, 기어 네비 (좌우 드래그 가능), 탐색 버튼
// ================================================================

import { SaveManager } from '../../Managers/SaveManager';

export type TabKey =
  | 'explore' | 'recruit' | 'manage' | 'facility' | 'outsource'
  | 'dredge' | 'shop' | 'storage' | 'codex' | 'memory';

interface HUDCallbacks {
  onTab:      (key: TabKey) => void;
  onSettings: () => void;
  onLobby:    () => void;
}

interface GearTab { key: TabKey; label: string; }

const LEFT_TABS: GearTab[] = [
  { key: 'shop',    label: '상  점' },
  { key: 'storage', label: '창  고' },
  { key: 'codex',   label: '도  감' },
  { key: 'memory',  label: '회  상' },
];

const RIGHT_TABS: GearTab[] = [
  { key: 'recruit',   label: '영  입' },
  { key: 'manage',    label: '관  리' },
  { key: 'facility',  label: '시  설' },
  { key: 'outsource', label: '외  주' },
  { key: 'dredge',    label: '드레지' },
];

const GEAR_R    = 330;             // outer tooth radius
const GEAR_r    = 252;             // inner radius
const GEAR_HOLE = 38;

// ── 기어 경로 생성 ────────────────────────────────────────────────
function makeGearPath(R: number, r: number, hole: number, n: number): string {
  const PI2 = Math.PI * 2;
  const step = PI2 / n;
  const halfTooth = step * 0.21;
  let d = '';
  const px = (rad: number, a: number) => (rad * Math.cos(a)).toFixed(2);
  const py = (rad: number, a: number) => (rad * Math.sin(a)).toFixed(2);
  for (let i = 0; i < n; i++) {
    const base = i * step - Math.PI / 2;
    const ia0 = base - step * 0.5 + halfTooth;
    const ia1 = base - halfTooth;
    const oa0 = base - halfTooth;
    const oa1 = base + halfTooth;
    const ia2 = base + halfTooth;
    if (i === 0) d += `M ${px(r, ia0)},${py(r, ia0)} `;
    else         d += `L ${px(r, ia0)},${py(r, ia0)} `;
    d += `L ${px(r, ia1)},${py(r, ia1)} `;
    d += `L ${px(R, oa0)},${py(R, oa0)} `;
    d += `L ${px(R, oa1)},${py(R, oa1)} `;
    d += `L ${px(r, ia2)},${py(r, ia2)} `;
  }
  d += `Z M ${hole},0 A ${hole},${hole} 0 1 0 ${-hole},0 A ${hole},${hole} 0 1 0 ${hole},0 Z`;
  return d;
}

export class AtelierHUD {
  private _el!:        HTMLElement;
  private _contentEl!: HTMLElement;
  private _arcSpan!:   HTMLElement;
  private _daySpan!:   HTMLElement;
  private _btns:       Map<TabKey, HTMLButtonElement> = new Map();
  private _cb!:        HUDCallbacks;

  // 기어 드래그 상태
  private _leftRotEl!:  HTMLElement;
  private _rightRotEl!: HTMLElement;
  private _leftRot   =  0;    // left  gear: sel-angle = 0°
  private _rightRot  = 180;   // right gear: sel-angle = 180°
  private _leftSvg!:   SVGElement;
  private _rightSvg!:  SVGElement;
  private _dragCleanups: Array<() => void> = [];

  constructor(cb: HUDCallbacks) {
    this._cb = cb;
    this._build();
  }

  // ── 빌드 ─────────────────────────────────────────────────────
  private _build(): void {
    document.getElementById('atelier-hud')?.remove();

    const { day } = SaveManager.getProgress();
    const arc = (SaveManager.load() as Record<string, unknown>)?.arc ?? 0;

    // 각 사이드별 톱니 수 = 탭 * 2 (탭 톱니 + 장식 톱니 교차)
    const leftGearPath  = makeGearPath(GEAR_R, GEAR_r, GEAR_HOLE, LEFT_TABS.length  * 2);
    const rightGearPath = makeGearPath(GEAR_R, GEAR_r, GEAR_HOLE, RIGHT_TABS.length * 2);
    const leftHtml  = this._gearSideHtml('left',  LEFT_TABS,  0,   leftGearPath);
    const rightHtml = this._gearSideHtml('right', RIGHT_TABS, 180, rightGearPath);

    const hud = document.createElement('div');
    hud.id = 'atelier-hud';
    hud.innerHTML = `
      <!-- 상단 바 -->
      <div class="atelier-topbar">
        <div class="atelier-hud-day">DAY&nbsp;&nbsp;<span id="atelier-day">${day}</span></div>
        <div class="atelier-hud-arc"><span class="atelier-hud-arc__label">ARC</span><span id="atelier-arc">${arc}</span></div>
        <div class="atelier-topbar__actions">
          <button class="atelier-top-btn" id="atelier-btn-settings">설&nbsp;&nbsp;정</button>
          <button class="atelier-top-btn" id="atelier-btn-lobby">로&nbsp;&nbsp;비</button>
        </div>
      </div>

      ${leftHtml}
      ${rightHtml}

      <!-- 탭 콘텐츠 영역 -->
      <div id="atelier-content"></div>

      <!-- 탐색 버튼 (하단 중앙) -->
      <div class="atelier-explore-area" id="atelier-explore-area">
        <div class="atelier-explore-sep"></div>
        <button class="atelier-explore-btn" data-tab="explore">탐&nbsp;&nbsp;&nbsp;&nbsp;색</button>
        <div class="atelier-explore-sep"></div>
      </div>
    `;

    const container = document.getElementById('game-container');
    if (container) container.appendChild(hud);
    else document.body.appendChild(hud);

    this._el        = hud;
    this._contentEl = hud.querySelector('#atelier-content')!;
    this._arcSpan   = hud.querySelector('#atelier-arc')!;
    this._daySpan   = hud.querySelector('#atelier-day')!;

    // 기어 DOM 참조
    this._leftRotEl  = hud.querySelector('#gear-rot-left')!;
    this._rightRotEl = hud.querySelector('#gear-rot-right')!;
    this._leftSvg    = hud.querySelector('#gear-rot-left .gear-svg')!;
    this._rightSvg   = hud.querySelector('#gear-rot-right .gear-svg')!;

    // 초기 회전 적용
    this._leftRotEl.style.setProperty('--rot',  `${this._leftRot}deg`);
    this._rightRotEl.style.setProperty('--rot', `${this._rightRot}deg`);

    // 초기 선택 하이라이트
    this._updateSelection(this._leftRotEl,  this._leftRot,  0,   LEFT_TABS);
    this._updateSelection(this._rightRotEl, this._rightRot, 180, RIGHT_TABS);

    // 버튼 이벤트
    hud.querySelectorAll<HTMLButtonElement>('.gear-label').forEach(btn => {
      const key = btn.dataset.key as TabKey;
      if (key) this._btns.set(key, btn);
      btn.addEventListener('click', () => this._onGearClick(key));
    });

    const exploreBtn = hud.querySelector<HTMLButtonElement>('.atelier-explore-btn')!;
    exploreBtn.addEventListener('click', () => this._cb.onTab('explore'));
    this._btns.set('explore', exploreBtn);

    hud.querySelector('#atelier-btn-settings')!.addEventListener('click', () => this._cb.onSettings());
    hud.querySelector('#atelier-btn-lobby')!.addEventListener('click',    () => this._cb.onLobby());

    // 드래그 설정
    this._dragCleanups.push(
      this._setupDrag(hud.querySelector('#gear-left')!,  this._leftRotEl,  this._leftSvg,  0,   LEFT_TABS),
      this._setupDrag(hud.querySelector('#gear-right')!, this._rightRotEl, this._rightSvg, 180, RIGHT_TABS),
    );
  }

  // ── 기어 사이드 HTML 생성 ─────────────────────────────────────
  private _gearSideHtml(
    side: 'left' | 'right',
    tabs: GearTab[],
    initRot: number,
    path: string,
  ): string {
    const step = 360 / tabs.length;
    const labels = tabs.map((t, i) =>
      `<button class="gear-label" data-key="${t.key}" style="--base:${i * step}deg">${t.label}</button>`
    ).join('\n      ');
    const vb = GEAR_R + 10;
    return `
    <div class="gear-side gear-side--${side}" id="gear-${side}">
      <div class="gear-rot" id="gear-rot-${side}" style="--rot:${initRot}deg">
        <div class="gear-drag-overlay"></div>
        <svg class="gear-svg" viewBox="-${vb} -${vb} ${vb * 2} ${vb * 2}" xmlns="http://www.w3.org/2000/svg">
          <path class="gear-path" fill-rule="evenodd" d="${path}"/>
        </svg>
        ${labels}
      </div>
    </div>`;
  }

  // ── 기어 클릭 처리 ──────────────────────────────────────────
  private _onGearClick(key: TabKey): void {
    const isLeft  = LEFT_TABS.some(t => t.key === key);
    const tabs    = isLeft ? LEFT_TABS  : RIGHT_TABS;
    const rot     = isLeft ? this._leftRot  : this._rightRot;
    const selAng  = isLeft ? 0 : 180;
    const selKey  = this._getSelKey(rot, selAng, tabs);

    if (selKey === key) {
      this._cb.onTab(key);
    } else {
      this._snapToKey(key, isLeft ? 'left' : 'right');
    }
  }

  // ── 선택 탭 계산 ─────────────────────────────────────────────
  private _getSelKey(rot: number, selAng: number, tabs: GearTab[]): TabKey {
    const step = 360 / tabs.length;
    let best = 0, bestDist = Infinity;
    tabs.forEach((_t, i) => {
      const ang  = ((i * step + rot - selAng) % 360 + 360) % 360;
      const dist = Math.min(ang, 360 - ang);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return tabs[best].key;
  }

  // ── 특정 탭으로 스냅 ──────────────────────────────────────────
  private _snapToKey(key: TabKey, side: 'left' | 'right'): void {
    const tabs   = side === 'left' ? LEFT_TABS  : RIGHT_TABS;
    const selAng = side === 'left' ? 0 : 180;
    const idx    = tabs.findIndex(t => t.key === key);
    if (idx < 0) return;

    const step   = 360 / tabs.length;
    const target = selAng - idx * step;
    const cur    = side === 'left' ? this._leftRot : this._rightRot;
    let diff = ((target - cur) % 360 + 360) % 360;
    if (diff > 180) diff -= 360;
    const newRot = cur + diff;

    if (side === 'left') {
      this._leftRot = newRot;
      this._leftSvg.classList.remove('dragging');
      this._leftRotEl.style.setProperty('--rot', `${newRot}deg`);
      this._updateSelection(this._leftRotEl, newRot, 0, LEFT_TABS);
    } else {
      this._rightRot = newRot;
      this._rightSvg.classList.remove('dragging');
      this._rightRotEl.style.setProperty('--rot', `${newRot}deg`);
      this._updateSelection(this._rightRotEl, newRot, 180, RIGHT_TABS);
    }
  }

  // ── 선택 하이라이트 업데이트 ─────────────────────────────────
  private _updateSelection(
    rotEl: HTMLElement, rot: number, selAng: number, tabs: GearTab[],
  ): void {
    const selKey = this._getSelKey(rot, selAng, tabs);
    rotEl.querySelectorAll<HTMLElement>('.gear-label').forEach(el => {
      el.classList.toggle('gear-label--sel', el.dataset.key === selKey);
    });
  }

  // ── 드래그 핸들러 설정 ──────────────────────────────────────
  private _setupDrag(
    _wrapEl: HTMLElement,
    rotEl:   HTMLElement,
    svgEl:   SVGElement,
    selAng:  number,
    tabs:    GearTab[],
  ): () => void {
    const isLeft   = selAng === 0;
    const dragArea = rotEl.querySelector('.gear-drag-overlay') as HTMLElement;
    let dragging = false;
    let startY   = 0;
    let startRot = 0;

    const onDown = (e: MouseEvent) => {
      dragging = true;
      startY   = e.clientY;
      startRot = isLeft ? this._leftRot : this._rightRot;
      svgEl.classList.add('dragging');
      dragArea.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const newRot = startRot + (isLeft ? 1 : -1) * (e.clientY - startY) * 0.38;
      if (isLeft) { this._leftRot  = newRot; }
      else        { this._rightRot = newRot; }
      rotEl.style.setProperty('--rot', `${newRot}deg`);
      this._updateSelection(rotEl, newRot, selAng, tabs);
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      svgEl.classList.remove('dragging');
      dragArea.style.cursor = '';
      // snap to nearest tab slot
      const step   = 360 / tabs.length;
      const cur    = isLeft ? this._leftRot : this._rightRot;
      const rawIdx = (selAng - cur) / step;
      const idx    = ((Math.round(rawIdx) % tabs.length) + tabs.length) % tabs.length;
      const target = selAng - idx * step;
      let diff = ((target - cur) % 360 + 360) % 360;
      if (diff > 180) diff -= 360;
      const newRot = cur + diff;
      if (isLeft) { this._leftRot  = newRot; }
      else        { this._rightRot = newRot; }
      rotEl.style.setProperty('--rot', `${newRot}deg`);
      this._updateSelection(rotEl, newRot, selAng, tabs);
    };

    dragArea.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);

    return () => {
      dragArea.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }

  // ── 공개 API ─────────────────────────────────────────────────
  get el():        HTMLElement { return this._el; }
  get contentEl(): HTMLElement { return this._contentEl; }

  show(): void    { this._el.classList.add('visible'); }
  hide(): void    { this._el.classList.remove('visible'); }
  destroy(): void {
    this._dragCleanups.forEach(fn => fn());
    this._el.remove();
  }

  setActiveTab(key: TabKey): void {
    this._btns.forEach((btn, k) => {
      btn.classList.toggle('active', k === key);
    });
  }

  setManageMode(on: boolean): void {
    this._el.classList.toggle('manage-mode', on);
  }

  setRecruitMode(on: boolean): void {
    this._el.classList.toggle('recruit-mode', on);
  }

  updateArc(arc: number): void {
    if (this._arcSpan) this._arcSpan.textContent = String(arc);
  }

  updateDay(day: number): void {
    if (this._daySpan) this._daySpan.textContent = String(day);
  }
}
