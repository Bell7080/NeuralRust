// ================================================================
//  Tab_Base.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Base.js
//
//  역할: Atelier 탭 공통 기반 클래스
//        모든 탭 클래스가 상속받아야 할 표준 패턴 정의
//
//  포함 기능:
//    - _container, _tweens, _timers, _sceneHits 초기화
//    - _tween() / _delay() 추적 헬퍼
//    - _fs() 폰트 크기 헬퍼
//    - show() / hide()
//    - destroy() — 자식 오브젝트까지 완전 파기
//
//  로드 순서: index.html에서 Tab_Explore.js 직전에 로드
//
//  의존: scaledFontSize (utils.js), GAME_MIN_SCALE (constants.js)
// ================================================================

class Tab_Base {

  constructor(scene, W, H) {
    this.scene = scene;
    this.W     = W;
    this.H     = H;

    this._container = scene.add.container(0, 0);
    this._tweens    = [];
    this._timers    = [];
    this._sceneHits = [];  // 씬 직접 추가 hit 박스 (컨테이너 밖)
  }

  // ── 폰트 크기 헬퍼 ──────────────────────────────────────────
  _fs(n) { return scaledFontSize(n, this.scene.scale); }

  // ── 트윈 추적 헬퍼 ──────────────────────────────────────────
  _tween(cfg) {
    const t = this.scene.tweens.add(cfg);
    this._tweens.push(t);
    return t;
  }

  // ── 딜레이 타이머 추적 헬퍼 ─────────────────────────────────
  _delay(ms, fn) {
    const t = this.scene.time.delayedCall(ms, fn);
    this._timers.push(t);
    return t;
  }

  // ── 표시/숨김 ────────────────────────────────────────────────
  show() { this._container.setVisible(true);  }
  hide() { this._container.setVisible(false); }

  // ── 정리 ─────────────────────────────────────────────────────
  destroy() {
    this._tweens.forEach(t => { if (t && t.stop)   t.stop();   });
    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._sceneHits.forEach(h => { try { h.destroy(); } catch(e){} });
    this._tweens    = [];
    this._timers    = [];
    this._sceneHits = [];
    // true: 컨테이너 자식 오브젝트(Graphics, Text 등)까지 모두 파기
    this._container.destroy(true);
  }
}
