// ================================================================
//  Tab_Recruit.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruit.js
//
//  [Phase 흐름]
//    READY  → [ 영 입 ] 패널 + 가격 + 확인 스타일 버튼
//    SLOT   → 3개 슬롯머신 동시 가동 (직업 / 스탯합계 표시)
//    PICK   → 3개 결과 카드 중 하나 선택
//    CUSTOM → 커스터마이징 (스탯·외형·패시브·스킬 재설정)
//
//  🔧 버그 수정:
//    - _lockOverlay를 _container 안으로 이동 (destroy/hide 시 자동 제거)
//    - _unlockTabs에서 _container.setDepth(0) 조작 제거
//    - destroy()에 잠금 상태 복구 + _lockOverlay 정리 추가
//
//  [외부 의존 — 전역]
//    CharacterManager, SaveManager, scaledFontSize, FontManager
// ================================================================

class Tab_Recruit {
  constructor(scene, W, H) {
    this.scene = scene;
    this.W = W;
    this.H = H;

    const save = SaveManager.load() || {};
    this.price = save.recruitPrice ?? RECRUIT_BASE_PRICE;

    this.result       = null;
    this.rerolls      = {};
    this._lockOverlay = null;

    this._container = scene.add.container(0, 0);
    this._timers = [];
    this._tweens = [];

    this._buildReady();
  }

  show()    { this._container.setVisible(true);  }
  hide()    { this._container.setVisible(false); }

  destroy() {
    // ✅ 잠금 오버레이 잔존 방지
    if (this._lockOverlay) {
      try { this._lockOverlay.destroy(); } catch(e) {}
      this._lockOverlay = null;
    }
    // ✅ 버튼 잠금 걸린 채 destroy 되는 경우 복구
    const refs = this.scene._sideButtonRefs || [];
    refs.forEach(({ btn }) => {
      try { btn.setInteractive({ useHandCursor: true }); } catch(e) {}
    });

    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._tweens.forEach(t => { if (t && t.stop)   t.stop();   });
    this._timers = [];
    this._tweens = [];
    this._container.destroy();
  }

  // ── 내부 유틸 ─────────────────────────────────────────────────

  _fs(n)   { return scaledFontSize(n, this.scene.scale); }
  _clear() { this._container.removeAll(true); }

  _delay(ms, fn) {
    const t = this.scene.time.delayedCall(ms, fn);
    this._timers.push(t);
    return t;
  }

  _tween(cfg) {
    const t = this.scene.tweens.add(cfg);
    this._tweens.push(t);
    return t;
  }

  // ── 탭 버튼 잠금/해제 ─────────────────────────────────────────
  _lockTabs() {
    const refs = this.scene._sideButtonRefs || [];
    refs.forEach(({ btn }) => btn.disableInteractive());

    if (!this._lockOverlay) {
      // ✅ scene.add 대신 _container에 추가 → destroy/hide 시 자동 제거
      this._lockOverlay = this.scene.add.rectangle(0, 0, this.W, this.H, 0x000000, 0.55)
        .setOrigin(0).setDepth(50);
      this._container.add(this._lockOverlay);
    }
  }

  _unlockTabs() {
    const refs = this.scene._sideButtonRefs || [];
    refs.forEach(({ btn }) => btn.setInteractive({ useHandCursor: true }));

    if (this._lockOverlay) {
      this._lockOverlay.destroy();
      this._lockOverlay = null;
    }
    // ✅ _container.setDepth 조작 제거
  }

  // ── 나머지 메서드는 Recruit_*.js 파일에서 prototype으로 주입됨 ──
  // _buildReady, _revealBtn, _typeText, _onHire,
  // _buildSlot, _buildPick, _buildCustom, _confirmHire,
  // _toast, _showHireCompletePopup 등
}
