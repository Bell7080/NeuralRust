// ================================================================
//  Tab_Explore.ts
//  경로: src/Scenes/Ateliers/Tab_Explore.ts
//
//  역할: 탐색 탭 — 파티 편성 → PartyScene 진입
// ================================================================

export class Tab_Explore {
  private _el!: HTMLElement;
  private _scene: Phaser.Scene;
  readonly _container: null = null;

  constructor(scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    this._scene = scene;
    this._build(contentEl);
  }

  private _build(contentEl: HTMLElement): void {
    const el = document.createElement('div');
    el.className = 'atelier-tab-panel';

    el.innerHTML = `
      <div class="atelier-panel-box" style="text-align:center;">
        <div class="atelier-panel-label">탐  색</div>
        <div class="atelier-panel-divider"></div>
        <div class="atelier-explore-desc">파티를 편성하고 탐사를 시작합니다.</div>
        <div class="atelier-explore-warn">탐사 시작 후에는 되돌아올 수 없습니다.</div>
        <button class="atelier-start-btn" id="atelier-explore-start">파티&nbsp;&nbsp;편성</button>
      </div>
    `;

    el.querySelector('#atelier-explore-start')!.addEventListener('click', () => {
      this._scene.scene.start('PartyScene', { from: 'AtelierScene' });
    });

    contentEl.appendChild(el);
    this._el = el;
  }

  show(): void { this._el.classList.add('active'); }
  hide(): void { this._el.classList.remove('active'); }
  destroy(): void { this._el.remove(); }
}
