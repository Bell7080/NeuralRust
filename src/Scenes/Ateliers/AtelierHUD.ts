// ================================================================
//  AtelierHUD.ts
//  경로: src/Scenes/Ateliers/AtelierHUD.ts
//
//  역할: #atelier-hud DOM 생성·관리
//        DAY / ARC 표시, 사이드 버튼, 탐색 버튼, 상단 버튼
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

export class AtelierHUD {
  private _el!:      HTMLElement;
  private _contentEl!: HTMLElement;
  private _arcSpan!: HTMLElement;
  private _daySpan!: HTMLElement;
  private _btns:     Map<TabKey, HTMLButtonElement> = new Map();
  private _cb!:      HUDCallbacks;

  constructor(cb: HUDCallbacks) {
    this._cb = cb;
    this._build();
  }

  // ── 빌드 ─────────────────────────────────────────────────────
  private _build(): void {
    document.getElementById('atelier-hud')?.remove();

    const { day } = SaveManager.getProgress();
    const arc     = (SaveManager.load() as Record<string, unknown>)?.arc ?? 0;

    const hud = document.createElement('div');
    hud.id    = 'atelier-hud';
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

      <!-- 좌측 사이드 네비 -->
      <nav class="atelier-sidenav atelier-sidenav--left" id="atelier-sidenav-left">
        <button class="atelier-side-btn" data-tab="shop">상&nbsp;&nbsp;점</button>
        <button class="atelier-side-btn" data-tab="storage">창&nbsp;&nbsp;고</button>
        <button class="atelier-side-btn" data-tab="codex">도&nbsp;&nbsp;감</button>
        <button class="atelier-side-btn" data-tab="memory">회&nbsp;&nbsp;상</button>
      </nav>

      <!-- 우측 사이드 네비 -->
      <nav class="atelier-sidenav atelier-sidenav--right" id="atelier-sidenav-right">
        <button class="atelier-side-btn" data-tab="recruit">영&nbsp;&nbsp;입</button>
        <button class="atelier-side-btn" data-tab="manage">관&nbsp;&nbsp;리</button>
        <button class="atelier-side-btn" data-tab="facility">시&nbsp;&nbsp;설</button>
        <button class="atelier-side-btn" data-tab="outsource">외&nbsp;&nbsp;주</button>
        <button class="atelier-side-btn" data-tab="dredge">드 레 지</button>
      </nav>

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

    // 버튼 참조 수집 + 이벤트
    hud.querySelectorAll<HTMLButtonElement>('.atelier-side-btn, .atelier-explore-btn').forEach(btn => {
      const key = btn.dataset.tab as TabKey;
      if (key) this._btns.set(key, btn);
      btn.addEventListener('click', () => this._cb.onTab(key));
    });

    hud.querySelector('#atelier-btn-settings')!.addEventListener('click', () => this._cb.onSettings());
    hud.querySelector('#atelier-btn-lobby')!.addEventListener('click',    () => this._cb.onLobby());
  }

  // ── 공개 API ─────────────────────────────────────────────────
  get el():         HTMLElement { return this._el; }
  get contentEl():  HTMLElement { return this._contentEl; }

  show(): void  { this._el.classList.add('visible'); }
  hide(): void  { this._el.classList.remove('visible'); }
  destroy(): void { this._el.remove(); }

  setActiveTab(key: TabKey): void {
    this._btns.forEach((btn, k) => {
      btn.classList.toggle('active', k === key);
    });
  }

  setManageMode(on: boolean): void {
    this._el.classList.toggle('manage-mode', on);
  }

  updateArc(arc: number): void {
    if (this._arcSpan) this._arcSpan.textContent = String(arc);
  }

  updateDay(day: number): void {
    if (this._daySpan) this._daySpan.textContent = String(day);
  }
}
