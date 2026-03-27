// ================================================================
//  TabBase.ts
//  경로: src/Scenes/Ateliers/TabBase.ts
//
//  역할: Atelier 탭 공통 기반 클래스
//        모든 탭 클래스가 상속받아야 할 표준 패턴 정의
// ================================================================

import { FontManager } from '../../Managers/FontManager';

export class TabBase {
  protected scene: Phaser.Scene;
  protected W:     number;
  protected H:     number;

  _container: Phaser.GameObjects.Container;
  _tweens:    Phaser.Tweens.Tween[];
  _timers:    Phaser.Time.TimerEvent[];
  _sceneHits: Phaser.GameObjects.GameObject[];

  constructor(scene: Phaser.Scene, W: number, H: number) {
    this.scene = scene;
    this.W     = W;
    this.H     = H;

    this._container = scene.add.container(0, 0);
    this._tweens    = [];
    this._timers    = [];
    this._sceneHits = [];
  }

  protected _fs(n: number): string {
    return FontManager.adjustedSize(n, this.scene.scale);
  }

  protected _tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const t = this.scene.tweens.add(cfg);
    this._tweens.push(t);
    return t;
  }

  protected _delay(ms: number, fn: () => void): Phaser.Time.TimerEvent {
    const t = this.scene.time.delayedCall(ms, fn);
    this._timers.push(t);
    return t;
  }

  show(): void  { this._container.setVisible(true);  }
  hide(): void  { this._container.setVisible(false); }

  destroy(): void {
    this._tweens.forEach(t    => { try { t.stop();    } catch (_) {} });
    this._timers.forEach(t    => { try { t.remove();  } catch (_) {} });
    this._sceneHits.forEach(h => { try { h.destroy(); } catch (_) {} });
    this._tweens    = [];
    this._timers    = [];
    this._sceneHits = [];
    this._container.destroy(true);
  }
}
