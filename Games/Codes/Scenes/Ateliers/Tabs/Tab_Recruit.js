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
//  ✏️ v2 수정:
//    - _lockOverlay를 _container 안으로 이동
//    - _unlockTabs에서 _container.setDepth(0) 조작 제거
//    - destroy()에 잠금 상태 복구 + _lockOverlay 정리 추가
//  ✏️ v3 수정:
//    - _clear()에 _ocGlowTween 중단 추가
//  ✏️ v4 수정:
//    - _clear()에 _sceneHits 정리 추가
//      → READY 영입 버튼 hit이 SLOT/PICK에서 살아있어
//         카드 클릭 시 슬롯 재시작되는 버그 수정
//    - _clear()에 _tweens / _timers 중단 추가
//  ✏️ v5 수정:
//    - Tab_Base 상속 (issue 7)
//      → _container, _tweens, _timers, _sceneHits, _tween(), _delay(), _fs() 제거
//      → show(), hide() 제거 (Tab_Base 상속)
//      → destroy()를 super.destroy() 기반으로 재구성
//    - _popupObjs 추가 (_showHireCompletePopup scene 직접 오브젝트 추적용)
// ================================================================

class Tab_Recruit extends Tab_Base {
  constructor(scene, W, H) {
    super(scene, W, H);

    const save = SaveManager.load() || {};
    this.price = save.recruitPrice ?? RECRUIT_BASE_PRICE;

    this.result        = null;
    this.rerolls       = {};
    this._lockOverlay  = null;
    this._ocGlowTween  = null;
    this._popupObjs    = [];   // _showHireCompletePopup scene 직접 오브젝트 추적

    this._buildReady();
  }

  // show() / hide() → Tab_Base 상속

  destroy() {
    if (this._lockOverlay) {
      try { this._lockOverlay.destroy(); } catch(e) {}
      this._lockOverlay = null;
    }
    // 탭 잠금 해제 (side 버튼 복구)
    const refs = this.scene._sideButtonRefs || [];
    refs.forEach(({ btn }) => {
      try { btn.setInteractive({ useHandCursor: true }); } catch(e) {}
    });
    // 팝업 오브젝트 정리
    if (this._popupObjs) {
      this._popupObjs.forEach(o => { try { o.destroy(); } catch(e){} });
      this._popupObjs = [];
    }
    super.destroy();
  }

  _clear() {
    if (this._ocGlowTween) {
      try { this._ocGlowTween.stop(); this._ocGlowTween.remove(); } catch(e) {}
      this._ocGlowTween = null;
    }
    this._tweens.forEach(t => { try { t.stop(); } catch(e) {} });
    this._tweens = [];
    this._timers.forEach(t => { try { t.remove(); } catch(e) {} });
    this._timers = [];
    // 핵심: _sceneHits 정리 — 이게 없으면 READY 영입 버튼이 PICK 단계에서도
    // 살아있어 카드 클릭 시 _buildSlot이 재실행됨
    this._sceneHits.forEach(h => { try { if (h.active) h.destroy(); } catch(e) {} });
    this._sceneHits = [];
    // 팝업 오브젝트 정리 (탭 전환 중 팝업이 남아있을 경우)
    if (this._popupObjs) {
      this._popupObjs.forEach(o => { try { o.destroy(); } catch(e){} });
      this._popupObjs = [];
    }
    this._container.removeAll(true);
    // _lockOverlay는 _container 소속이므로 removeAll(true)로 이미 destroy됨
    // 스테일 레퍼런스 방지를 위해 참조 초기화
    if (this._lockOverlay) { this._lockOverlay = null; }
  }

  _lockTabs() {
    const refs = this.scene._sideButtonRefs || [];
    refs.forEach(({ btn }) => btn.disableInteractive());

    if (!this._lockOverlay) {
      this._lockOverlay = this.scene.add.rectangle(0, 0, this.W, this.H, 0x000000, 0.55)
        .setOrigin(0).setDepth(50);
      this._container.add(this._lockOverlay);
    }
  }

  _unlockTabs() {
    const refs = this.scene._sideButtonRefs || [];
    refs.forEach(({ btn }) => btn.setInteractive({ useHandCursor: true }));

    if (this._lockOverlay) {
      try { this._lockOverlay.destroy(); } catch(e) {}
      this._lockOverlay = null;
    }
  }
}
