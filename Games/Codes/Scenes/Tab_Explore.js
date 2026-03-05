// ================================================================
//  Tab_Explore.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Explore.js
//
//  역할: 탐색 탭 — 탐사 구역 선택 / 출발
//  의존: FontManager, utils.js
// ================================================================

class Tab_Explore {
  constructor(scene, W, H) {
    this.scene = scene;
    this.W = W;
    this.H = H;
    this._container = scene.add.container(0, 0);
    this._build();
  }

  _build() {
    const { scene, W, H } = this;
    const cx = W / 2;
    const cy = H * 0.52;

    // 패널 배경
    const panelW = W * 0.60;
    const panelH = H * 0.55;
    const panel = scene.add.graphics();
    panel.fillStyle(0x0a0705, 0.9);
    panel.lineStyle(1, 0x2a1a0a, 0.7);
    panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
    panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    scene.add.text(cx, cy - panelH / 2 + 20, '[ 탐  색 ]', {
      fontSize:   scaledFontSize(14, scene.scale),
      fill:       '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    scene.add.text(cx, cy, '탐색 구역이 아직 열리지 않았습니다.', {
      fontSize:   scaledFontSize(13, scene.scale),
      fill:       '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    this._container.add([panel]);
  }

  show()    { this._container.setVisible(true);  }
  hide()    { this._container.setVisible(false); }
  destroy() { this._container.destroy(); }
}
