// ================================================================
//  PS_Layout.js
//  경로: Games/Codes/Scenes/Partys/PS_Layout.js
//
//  역할: PartyScene 레이아웃 수치 계산 + 컨테이너 생성
//
//  로드 순서 (index.html):
//    PS_Layout.js → PS_Background.js → PS_LeftPanel.js
//    → PS_CenterPanel.js → PS_RightPanel.js → PartyScene.js
// ================================================================

const PS_Layout = {

  // 레이아웃 수치 계산 — 비율 상수만 바꾸면 전체 반영
  calcLayout(scene) {
    const W  = scene.W, H = scene.H;
    const fs = scene._fs.bind(scene);
    const pm = Math.round(W * 0.010);

    const LEFT_RATIO   = 0.30;
    const CENTER_RATIO = 0.40;

    scene._pm    = pm;
    scene._lw    = Math.floor(W * LEFT_RATIO);
    scene._cw    = Math.floor(W * CENTER_RATIO);
    scene._rw    = W - scene._lw - scene._cw;
    scene._hdrH  = parseInt(fs(44));
    scene._backH = parseInt(fs(52));
    scene._bodyY = scene._hdrH + pm;
    scene._bodyH = H - scene._bodyY - pm;

    // 좌측 카드 그리드 영역
    const rowH           = parseInt(fs(32));
    const filterRowCount = 3;
    const filterGapH     = parseInt(fs(4)) * 2 + parseInt(fs(6));
    scene._filterY       = scene._bodyY + pm;
    scene._filterTotalH  = rowH * filterRowCount + filterGapH;
    scene._cardAreaX     = pm + 4;
    scene._cardAreaY     = scene._filterY + scene._filterTotalH + parseInt(fs(6));
    scene._cardAreaW     = scene._lw - pm * 2 - 8;
    scene._cardAreaH     = H - scene._cardAreaY - scene._backH - pm;

    // 우측 파티슬롯 / 관리 분할 (슬롯 60%, 관리 40%)
    scene._slotAreaX = scene._lw + scene._cw + pm;
    scene._slotAreaY = scene._bodyY + pm;
    scene._slotAreaW = scene._rw - pm * 2;
    scene._slotAreaH = Math.round(scene._bodyH * 0.60);
    scene._manageY   = scene._slotAreaY + scene._slotAreaH;
    scene._manageH   = H - scene._manageY - pm;
  },

  // 컨테이너 생성 — depth 계층 명확히
  buildContainers(scene) {
    scene._bgContainer      = scene.add.container(0, 0).setDepth(0);
    scene._centerContainer  = scene.add.container(0, 0).setDepth(4);
    scene._leftContainer    = scene.add.container(0, 0).setDepth(5);
    scene._rightContainer   = scene.add.container(0, 0).setDepth(5);
    scene._profileContainer = scene.add.container(0, 0).setDepth(6);
    scene._slotContainer    = scene.add.container(0, 0).setDepth(7);
    scene._manageContainer  = scene.add.container(0, 0).setDepth(7);
    scene._hdrContainer     = scene.add.container(0, 0).setDepth(10);
  },

};
