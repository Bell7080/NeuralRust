// ================================================================
//  Tab_Stubs.ts
//  경로: src/Scenes/Ateliers/Tab_Stubs.ts
//
//  역할: 미구현 탭 플레이스홀더
// ================================================================

function makeStubTab(contentEl: HTMLElement, title: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'atelier-tab-panel';
  el.innerHTML = `
    <div class="atelier-panel-box" style="text-align:center;">
      <div class="atelier-panel-label">${title}</div>
      <div class="atelier-panel-divider"></div>
      <div class="atelier-stub-msg">— 개발 중 —</div>
    </div>
  `;
  contentEl.appendChild(el);
  return el;
}

class StubTab {
  readonly _container: null = null;
  protected _el!: HTMLElement;

  show():    void { this._el.classList.add('active'); }
  hide():    void { this._el.classList.remove('active'); }
  destroy(): void { this._el.remove(); }
}

export class Tab_Facility extends StubTab {
  constructor(_s: unknown, _W: unknown, _H: unknown, contentEl: HTMLElement) {
    super(); this._el = makeStubTab(contentEl, '시  설');
  }
}

export class Tab_Outsource extends StubTab {
  constructor(_s: unknown, _W: unknown, _H: unknown, contentEl: HTMLElement) {
    super(); this._el = makeStubTab(contentEl, '외  주');
  }
}

export class Tab_Dredge extends StubTab {
  constructor(_s: unknown, _W: unknown, _H: unknown, contentEl: HTMLElement) {
    super(); this._el = makeStubTab(contentEl, '드 레 지');
  }
}

export class Tab_Shop extends StubTab {
  constructor(_s: unknown, _W: unknown, _H: unknown, contentEl: HTMLElement) {
    super(); this._el = makeStubTab(contentEl, '상  점');
  }
}

export class Tab_Storage extends StubTab {
  constructor(_s: unknown, _W: unknown, _H: unknown, contentEl: HTMLElement) {
    super(); this._el = makeStubTab(contentEl, '창  고');
  }
}

export class Tab_Codex extends StubTab {
  constructor(_s: unknown, _W: unknown, _H: unknown, contentEl: HTMLElement) {
    super(); this._el = makeStubTab(contentEl, '도  감');
  }
}

export class Tab_Memory extends StubTab {
  constructor(_s: unknown, _W: unknown, _H: unknown, contentEl: HTMLElement) {
    super(); this._el = makeStubTab(contentEl, '회  상');
  }
}
