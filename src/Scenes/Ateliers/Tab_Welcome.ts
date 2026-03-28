// ================================================================
//  Tab_Welcome.ts
//  경로: src/Scenes/Ateliers/Tab_Welcome.ts
//
//  역할: 아틀리에 최초 진입 시 환영 팝업 (HTML DOM)
//        타이핑 완료 → onClose() 호출 → HUD 표시
//        다른 탭 선택 → fadeOut() → destroy()
// ================================================================

export class Tab_Welcome {
  private _scene:  Phaser.Scene;
  private _el!:    HTMLElement;
  private _timers: Phaser.Time.TimerEvent[] = [];
  readonly _container: null = null;

  constructor(
    scene: Phaser.Scene,
    _W: number,
    _H: number,
    private _onClose: () => void,
    _contentEl: HTMLElement,
  ) {
    this._scene = scene;
    this._build();
  }

  private _build(): void {
    // 이전 잔여물 제거
    document.getElementById('atelier-welcome-overlay')?.remove();

    const el = document.createElement('div');
    el.id        = 'atelier-welcome-overlay';
    el.className = 'atelier-tab-panel active';
    el.style.cssText = 'justify-content:center; pointer-events:none; z-index:50;';

    const faces   = [':)', ':3', ':0'];
    const face    = faces[Math.floor(Math.random() * faces.length)];
    const fullTxt = `환영합니다 ${face}`;

    el.innerHTML = `
      <div class="atelier-panel-box" style="text-align:center;">
        <div class="atelier-panel-label">환  영</div>
        <div class="atelier-panel-divider"></div>
        <div class="atelier-welcome-main" id="atelier-welcome-txt"></div>
      </div>
    `;

    // #atelier-hud는 opacity:0이므로 game-container에 직접 삽입
    const root = document.getElementById('game-container') ?? document.body;
    root.appendChild(el);
    this._el = el;

    this._delay(80, () => {
      this._typeText('atelier-welcome-txt', fullTxt, 52, () => {
        this._onClose();
      });
    });
  }

  // 탭 버튼 클릭 시 토스트처럼 페이드아웃
  fadeOut(onDone?: () => void): void {
    this._timers.forEach(t => { try { t.remove(); } catch (_) {} });
    this._timers = [];
    this._el.style.transition = 'opacity 0.22s ease';
    this._el.style.opacity    = '0';
    this._el.style.pointerEvents = 'none';
    const timer = this._scene.time.delayedCall(240, () => {
      this._el.remove();
      onDone?.();
    });
    this._timers.push(timer);
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

  show(): void { this._el.style.opacity = '1'; }
  hide(): void { this._el.style.opacity = '0'; }

  destroy(): void {
    this._timers.forEach(t => { try { t.remove(); } catch (_) {} });
    this._timers = [];
    this._el.remove();
  }
}
