// ================================================================
//  TM_Main.js  (GRID REWORK PATCH)
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Manages/TM_Main.js
//
//  역할: Tab_Manage_Full 진입점 — 상태 관리, 생명주기, 패널 조립
//
//  로드 순서 (index.html):
//    TM_Layout.js → TM_CardList.js → TM_Center.js → TM_RightPanel.js → TM_Main.js
//
//  ✏️ 변경사항 (Grid Rework):
//    - 생성자에 _sortMode / _sortOrder 초기 상태 추가
//    - _applyFilter() → TM_CardList._applyFilterAndSort() 위임으로 교체
//      (필터 + 정렬을 TM_CardList에서 일원화 관리)
//    - _refreshCards(): cardRow/maskGfx destroy 시 참조 오염 방지 강화
//    - 나머지 구조(destroy, _doHeal, _showToast 등) 동일 유지
//
//  ✏️ 기존 버그 수정 유지:
//    - _container.setDepth(10)
//    - destroy() 비동기 BG 로드 콜백 / 트윈 / 타이머 / 토스트 정리
// ================================================================

class Tab_Manage_Full {

  constructor(scene, W, H, onBack) {
    this.scene  = scene;
    this.W      = W;
    this.H      = H;
    this.onBack = onBack || null;

    this._selectedChar  = null;
    this._cardObjs      = [];
    this._cardRow       = null;
    this._maskGfx       = null;
    this._scrollY       = 0;
    this._totalCardH    = 0;
    this._dragged       = false;

    this._filterJob     = 'all';
    this._filterCog     = 'all';
    this._filterBarObjs = [];

    // ✏️ 정렬 상태 — TM_CardList.buildListPanel에서도 초기화하지만
    //   _refreshCards 호출 타이밍 보호를 위해 여기서도 선언
    this._sortMode  = 'none';   // 'none' | 'date' | 'stat'
    this._sortOrder = 'desc';   // 'desc'(높은순) | 'asc'(낮은순)

    this._detailObjs        = [];
    this._detailTweens      = [];
    this._rightDetailObjs   = [];
    this._centerDetailObjs  = [];
    this._bgPlaceholder     = null;
    this._bgLoadCb          = null;
    this._layoutTweens      = [];
    this._dragTimer         = null;
    this._toastObjs         = [];

    this._headerPanel = null;
    this._listPanel   = null;
    this._centerPanel = null;
    this._rightPanel  = null;
    this._backBtn     = null;

    // depth 10: 모든 자식 UI가 사이드버튼/HUD 위에 올바르게 동작
    this._container = scene.add.container(0, 0).setDepth(10);
    this._build();
  }

  _build() {
    const { scene, W, H } = this;
    const fs = n => FontManager.adjustedSize(n, scene.scale);

    const hdrH     = parseInt(fs(44));
    const backBtnH = parseInt(fs(60));
    this._hdrH     = hdrH;

    const pm = Math.round(W * 0.012);
    this._panelMargin = pm;

    this._listW   = Math.round(W * 0.20);
    this._centerW = Math.round(W * 0.47);
    this._rightW  = W - this._listW - this._centerW;
    this._bodyY   = hdrH + 1 + pm;
    this._bodyH   = H - hdrH - 1 - pm * 2 - backBtnH;

    TM_Layout.buildBackground(this, fs);
    TM_Layout.buildHeader(this, fs, hdrH);
    TM_Layout.buildDividers(this, backBtnH);
    TM_Layout.buildBackBtn(this, fs, backBtnH);
    TM_CardList.buildListPanel(this, fs, backBtnH);
    TM_Center.buildCenterPanel(this, fs);
    TM_RightPanel.buildRightPanel(this, fs);
    TM_CardList.setupDrag(this);
  }

  _selectChar(char) {
    this._selectedChar = char;
    this._cardObjs.forEach(({ container: c, char: ch }) => {
      if (c._drawCbg) c._drawCbg(false, ch.id === char.id);
    });
    TM_Center.buildDetail(this, char);
    TM_RightPanel.buildDetail(this, char);
  }

  _refreshCards() {
    this._cardObjs = [];
    this._scrollY  = 0;

    if (this._cardRow) {
      try { this._cardRow.destroy(); } catch(e) {}
      this._cardRow = null;
    }
    if (this._maskGfx) {
      try { this._maskGfx.destroy(); } catch(e) {}
      this._maskGfx = null;
    }

    TM_CardList.buildCardList(this);
  }

  // ✏️ _applyFilter: 정렬 포함한 버전으로 TM_CardList에 위임
  //   (기존 buildCardList 내 tab._applyFilter 호출이 있으면 이걸 타게 됨)
  _applyFilter(chars) {
    return TM_CardList._applyFilterAndSort(this, chars);
  }

  _inCardArea(ptr) {
    return ptr.x >= this._cardAreaX && ptr.x <= this._cardAreaX + this._cardAreaW
        && ptr.y >= this._cardAreaY && ptr.y <= this._cardAreaY + this._cardAreaH;
  }

  _showToast(msg) {
    const { scene, W, H } = this;
    const t = scene.add.text(W / 2, H * 0.5, msg, {
      fontSize: FontManager.adjustedSize(15, scene.scale),
      fill: '#cc5533',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(700).setAlpha(0);
    this._toastObjs.push(t);
    scene.tweens.add({
      targets: t, alpha: 1, duration: 200,
      onComplete: () => {
        scene.time.delayedCall(1200, () => {
          scene.tweens.add({
            targets: t, alpha: 0, duration: 300,
            onComplete: () => {
              t.destroy();
              const i = this._toastObjs.indexOf(t);
              if (i !== -1) this._toastObjs.splice(i, 1);
            },
          });
        });
      },
    });
  }

  _doHeal(char, cost) {
    const save = SaveManager.load(), arc = save?.arc ?? 0;
    if (arc < cost) { this._showToast('Arc가 부족합니다'); return; }
    if (save) {
      save.arc = arc - cost;
      SaveManager.save(save);
      this.scene.events.emit('arcUpdated', save.arc);
    }
    const chars  = CharacterManager.loadAll();
    const target = chars.find(c => c.id === char.id);
    if (target) { target.currentHp = target.maxHp; CharacterManager.saveAll(chars); }
    const updated = CharacterManager.loadAll().find(c => c.id === char.id) || char;
    this._refreshCards();
    this._selectChar(updated);
  }

  show()  { this._container.setVisible(true);  }
  hide()  { this._container.setVisible(false); }

  destroy() {
    if (this._bgLoadCb) {
      try { this.scene.load.off('complete', this._bgLoadCb); } catch(e) {}
      this._bgLoadCb = null;
    }
    if (this._bgPlaceholder) {
      try { this._bgPlaceholder.destroy(); } catch(e) {}
      this._bgPlaceholder = null;
    }
    if (this._layoutTweens) {
      this._layoutTweens.forEach(tw => { try { tw.stop(); } catch(e){} });
      this._layoutTweens = [];
    }
    if (this._dragTimer) {
      try { this._dragTimer.remove(); } catch(e) {}
      this._dragTimer = null;
    }
    if (this._toastObjs) {
      this._toastObjs.forEach(o => { try { o.destroy(); } catch(e){} });
      this._toastObjs = [];
    }
    if (this._rightDetailObjs) {
      this._rightDetailObjs.forEach(o => { try { o.destroy(); } catch(e){} });
      this._rightDetailObjs = [];
    }
    if (this._centerDetailObjs) {
      this._centerDetailObjs.forEach(o => { try { o.destroy(); } catch(e){} });
      this._centerDetailObjs = [];
    }
    if (this._detailTweens) {
      this._detailTweens.forEach(tw => { try { tw.stop(); tw.remove(); } catch(e){} });
    }
    this._detailObjs.forEach(o    => { try { o.destroy(); } catch(e){} });
    this._filterBarObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    if (this._maskGfx) { try { this._maskGfx.destroy(); } catch(e){} this._maskGfx = null; }

    const si = this.scene.input;
    if (this._dragDown)  si.off('pointerdown', this._dragDown);
    if (this._dragMove)  si.off('pointermove', this._dragMove);
    if (this._dragUp)    si.off('pointerup',   this._dragUp);
    if (this._dragWheel) si.off('wheel',       this._dragWheel);

    this._container.destroy(true);
  }
}
