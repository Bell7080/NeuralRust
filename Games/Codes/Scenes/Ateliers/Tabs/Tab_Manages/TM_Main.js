// ================================================================
//  TM_Main.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Manages/TM_Main.js
//
//  역할: Tab_Manage_Full 진입점 — 상태 관리, 생명주기, 패널 조립
//
//  로드 순서 (index.html):
//    TM_Layout.js → TM_CardList.js → TM_Center.js → TM_RightPanel.js → TM_Main.js
//
//  ✏️ 버그 수정:
//    - _container.setDepth(10) 적용
//      → depth 0이면 컨테이너 내부 interactive 객체들이 씬 depth 0 기준으로 동작하여
//         사이드버튼/HUD 등 다른 UI와 입력 이벤트 충돌 발생 → 버튼 클릭 불가 버그
//      → 10으로 설정하면 모든 자식 패널/버튼이 이 컨테이너 위에 올바르게 동작
//    - destroy() 에 _bgPlaceholder, _rightDetailObjs 정리 추가
//      → TM_Layout.buildBackground 비동기 로드 중 destroy 시 참조 누수 방지
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

    this._detailObjs        = [];
    this._detailTweens      = [];
    this._rightDetailObjs   = [];  // TM_RightPanel.buildDetail 추적용
    this._centerDetailObjs  = [];  // TM_Center.buildDetail 추적용
    this._bgPlaceholder     = null; // TM_Layout.buildBackground 비동기 플레이스홀더
    this._bgLoadCb          = null; // TM_Layout.buildBackground 로드 콜백 (리스너 제거용)
    this._layoutTweens      = [];   // TM_Layout hover 트윈 추적
    this._dragTimer         = null; // TM_CardList.setupDrag delayedCall 추적
    this._toastObjs         = [];   // _showToast scene 직접 오브젝트 추적

    // AtelierScene 애니메이션용 패널 참조
    this._headerPanel = null;
    this._listPanel   = null;
    this._centerPanel = null;
    this._rightPanel  = null;
    this._backBtn     = null;

    // ✏️ depth 10 설정: 모든 자식 UI(패널/버튼/히트박스)가 이 컨테이너의 depth 기준으로 처리
    //    사이드버튼/HUD(depth 0) 위에 렌더되어 클릭 이벤트 정상 수신
    this._container = scene.add.container(0, 0).setDepth(10);
    this._build();
  }

  _build() {
    const { scene, W, H } = this;
    const fs = n => scaledFontSize(n, scene.scale);

    const hdrH     = parseInt(fs(44));
    const backBtnH = parseInt(fs(60));
    this._hdrH     = hdrH;

    // 패널 여백 (뒷배경이 테두리 주변에 보이도록)
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
    if (this._cardRow)  { this._cardRow.destroy();  this._cardRow  = null; }
    if (this._maskGfx)  { this._maskGfx.destroy();  this._maskGfx  = null; }
    TM_CardList.buildCardList(this);
  }

  _applyFilter(chars) {
    return chars.filter(c =>
      (this._filterJob === 'all' || c.job === this._filterJob) &&
      (this._filterCog === 'all' || c.cog === parseInt(this._filterCog))
    );
  }

  _inCardArea(ptr) {
    return ptr.x >= this._cardAreaX && ptr.x <= this._cardAreaX + this._cardAreaW
        && ptr.y >= this._cardAreaY && ptr.y <= this._cardAreaY + this._cardAreaH;
  }

  _showToast(msg) {
    const { scene, W, H } = this;
    const t = scene.add.text(W / 2, H * 0.5, msg, {
      fontSize: scaledFontSize(15, scene.scale), fill: '#cc5533', fontFamily: FontManager.MONO,
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
    // 비동기 BG 로드 콜백 리스너 제거 (로드 중 destroy 시 참조 누수 방지)
    if (this._bgLoadCb) {
      try { this.scene.load.off('complete', this._bgLoadCb); } catch(e) {}
      this._bgLoadCb = null;
    }

    // 비동기 BG 로드 중 destroy 시 플레이스홀더 정리
    if (this._bgPlaceholder) {
      try { this._bgPlaceholder.destroy(); } catch(e) {}
      this._bgPlaceholder = null;
    }

    // TM_Layout hover 트윈 정리
    if (this._layoutTweens) {
      this._layoutTweens.forEach(tw => { try { tw.stop(); } catch(e){} });
      this._layoutTweens = [];
    }

    // drag delayedCall 타이머 정리
    if (this._dragTimer) {
      try { this._dragTimer.remove(); } catch(e) {}
      this._dragTimer = null;
    }

    // 토스트 텍스트 정리 (scene 직접 추가 오브젝트)
    if (this._toastObjs) {
      this._toastObjs.forEach(o => { try { o.destroy(); } catch(e){} });
      this._toastObjs = [];
    }

    // 우측 패널 디테일 오브젝트 정리
    if (this._rightDetailObjs) {
      this._rightDetailObjs.forEach(o => { try { o.destroy(); } catch(e){} });
      this._rightDetailObjs = [];
    }

    // 중앙 패널 디테일 오브젝트 정리
    if (this._centerDetailObjs) {
      this._centerDetailObjs.forEach(o => { try { o.destroy(); } catch(e){} });
      this._centerDetailObjs = [];
    }

    if (this._detailTweens) {
      this._detailTweens.forEach(tw => { try { tw.stop(); tw.remove(); } catch(e){} });
    }
    this._detailObjs.forEach(o    => { try { o.destroy(); } catch(e){} });
    this._filterBarObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    if (this._maskGfx) { this._maskGfx.destroy(); this._maskGfx = null; }

    const si = this.scene.input;
    if (this._dragDown)  si.off('pointerdown', this._dragDown);
    if (this._dragMove)  si.off('pointermove', this._dragMove);
    if (this._dragUp)    si.off('pointerup',   this._dragUp);
    if (this._dragWheel) si.off('wheel',       this._dragWheel);

    this._container.destroy(true);
  }
}
