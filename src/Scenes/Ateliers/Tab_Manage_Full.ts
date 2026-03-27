// ================================================================
//  Tab_Manage_Full.ts
//  경로: src/Scenes/Ateliers/Tab_Manage_Full.ts
//
//  역할: 관리 탭 스텁 (원본 TM_Main.js 완전 구현 예정)
//
//  원본에서 AtelierScene이 참조하는 Phaser 오브젝트 속성:
//    _headerPanel, _listPanel, _centerPanel, _rightPanel, _backBtn,
//    _cardObjs, _selectChar()
//  → 스텁에서는 null로 유지 (AtelierScene이 if(obj) 체크함)
// ================================================================

export class Tab_Manage_Full {
  // AtelierScene 슬라이드 애니메이션 참조용 (null = 스텁)
  readonly _container:   null = null;
  readonly _headerPanel: null = null;
  readonly _listPanel:   null = null;
  readonly _centerPanel: null = null;
  readonly _rightPanel:  null = null;
  readonly _backBtn:     null = null;
  readonly _cardObjs:    never[] = [];

  private _el!:    HTMLElement;
  private _onBack: () => void;

  constructor(
    _scene: Phaser.Scene,
    _W: number,
    _H: number,
    onBack: () => void,
    contentEl: HTMLElement,
  ) {
    this._onBack = onBack;
    this._build(contentEl);
  }

  private _build(contentEl: HTMLElement): void {
    const el = document.createElement('div');
    el.className = 'atelier-tab-panel';
    el.innerHTML = `
      <div class="atelier-panel-box" style="text-align:center; width:70%;">
        <div class="atelier-panel-label">관  리</div>
        <div class="atelier-panel-divider"></div>
        <div class="atelier-stub-msg" style="margin-bottom:1.6em;">— 개발 중 —</div>
        <button class="atelier-start-btn" id="atelier-manage-back">← 돌아가기</button>
      </div>
    `;
    el.querySelector('#atelier-manage-back')!.addEventListener('click', () => this._onBack());
    contentEl.appendChild(el);
    this._el = el;
  }

  // AtelierScene이 호출하는 스텁 메서드
  _selectChar(_char: unknown): void {}

  show(): void { this._el.classList.add('active'); }
  hide(): void { this._el.classList.remove('active'); }
  destroy(): void { this._el.remove(); }
}
