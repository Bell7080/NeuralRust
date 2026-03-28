// ================================================================
//  Tab_Welcome.ts
//  경로: src/Scenes/Ateliers/Tab_Welcome.ts
//
//  역할: 아틀리에 진입 시 웰컴 팝업 (HTML DOM)
//        타이핑 완료 → onClose() 호출 → UI 슬라이드인
// ================================================================

export class Tab_Welcome {
  private _scene: Phaser.Scene;
  private _el!:   HTMLElement;
  private _timers: Phaser.Time.TimerEvent[] = [];
  readonly _container: null = null;   // AtelierScene 호환용

  constructor(
    scene: Phaser.Scene,
    _W: number,
    _H: number,
    private _onClose: () => void,
    contentEl: HTMLElement,
  ) {
    this._scene = scene;
    this._build(contentEl);
  }

  private _build(_contentEl: HTMLElement): void {
    const el = document.createElement('div');
    el.className = 'atelier-tab-panel active';
    el.style.cssText = 'justify-content:center; opacity:1; pointer-events:none; z-index:50;';

    const faces  = [':)', ':3', ':0'];
    const face   = faces[Math.floor(Math.random() * faces.length)];
    const fullTxt = `환영합니다 ${face}`;

    el.innerHTML = `
      <div class="atelier-panel-box" style="text-align:center;">
        <div class="atelier-panel-label">환  영</div>
        <div class="atelier-panel-divider"></div>
        <div class="atelier-welcome-main" id="atelier-welcome-txt"></div>
      </div>
    `;
    // #atelier-hud는 opacity:0이므로 game-container 직접 삽입
    const root = document.getElementById('game-container') ?? document.body;
    root.appendChild(el);
    this._el = el;

    this._delay(80, () => {
      this._typeText('atelier-welcome-txt', fullTxt, 52, () => {
        this._onClose();
      });
    });
  }

  private _typeText(id: string, text: string, charDelay: number, onDone: () => void): void {
    const target = this._el.querySelector<HTMLElement>(`#${id}`);
    if (!target) return;
    target.textContent = '';
    const chars = [...text];
    let i = 0;
    const tick = () => {
      if (i < chars.length) {
        target.textContent = chars.slice(0, ++i).join('');
        this._timers.push(this._scene.time.delayedCall(charDelay, tick));
      } else {
        onDone();
      }
    };
    this._timers.push(this._scene.time.delayedCall(charDelay, tick));
  }

  private _delay(ms: number, fn: () => void): void {
    this._timers.push(this._scene.time.delayedCall(ms, fn));
  }

  show(): void { this._el.classList.add('active'); }
  hide(): void { this._el.classList.remove('active'); }

  destroy(): void {
    this._timers.forEach(t => { try { t.remove(); } catch (_) {} });
    this._timers = [];
    this._el.remove();
  }
}
