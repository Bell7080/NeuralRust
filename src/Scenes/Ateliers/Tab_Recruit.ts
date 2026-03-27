// ================================================================
//  Tab_Recruit.ts
//  경로: src/Scenes/Ateliers/Tab_Recruit.ts
//
//  역할: 영입 탭 스텁 (원본 슬롯머신 구현 예정)
// ================================================================

export class Tab_Recruit {
  private _el!: HTMLElement;
  readonly _container: null = null;

  constructor(_scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    this._build(contentEl);
  }

  private _build(contentEl: HTMLElement): void {
    const el = document.createElement('div');
    el.className = 'atelier-tab-panel';
    el.innerHTML = `
      <div class="atelier-panel-box" style="text-align:center;">
        <div class="atelier-panel-label">영  입</div>
        <div class="atelier-panel-divider"></div>
        <div class="atelier-stub-msg">— 개발 중 —</div>
      </div>
    `;
    contentEl.appendChild(el);
    this._el = el;
  }

  show(): void { this._el.classList.add('active'); }
  hide(): void { this._el.classList.remove('active'); }
  destroy(): void { this._el.remove(); }
}
