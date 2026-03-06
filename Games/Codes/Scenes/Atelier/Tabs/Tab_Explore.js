// ================================================================
//  Tab_Explore.js
//  경로: Games/Codes/Scenes/Tab_Explore.js
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

    const panelW = W * 0.60;
    const panelH = H * 0.55;

    // ── 패널 배경 ────────────────────────────────────────────
    const panel = scene.add.graphics();
    panel.fillStyle(0x120d07, 1);
    panel.lineStyle(2, 0x7a4018, 0.85);
    panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
    panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // ── 코너 장식 ────────────────────────────────────────────
    const deco = scene.add.graphics();
    deco.lineStyle(1, 0x7a4018, 0.7);
    const cs = 14;
    const px  = cx - panelW / 2 + 8;
    const py  = cy - panelH / 2 + 8;
    const px2 = cx + panelW / 2 - 8;
    const py2 = cy + panelH / 2 - 8;
    deco.lineBetween(px,  py,  px + cs, py);
    deco.lineBetween(px,  py,  px,  py + cs);
    deco.lineBetween(px2, py,  px2 - cs, py);
    deco.lineBetween(px2, py,  px2, py + cs);
    deco.lineBetween(px,  py2, px + cs, py2);
    deco.lineBetween(px,  py2, px,  py2 - cs);
    deco.lineBetween(px2, py2, px2 - cs, py2);
    deco.lineBetween(px2, py2, px2, py2 - cs);

    // ── 상단 라벨 ────────────────────────────────────────────
    const labelY = cy - panelH / 2 + parseInt(scaledFontSize(26, scene.scale));
    const label = scene.add.text(cx, labelY, '[ 탐  색 ]', {
      fontSize:      scaledFontSize(13, scene.scale),
      fill:          '#7a5028',
      fontFamily:    FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0.5, 0.5);

    // ── 구분선 ───────────────────────────────────────────────
    const lineY = cy - panelH / 2 + parseInt(scaledFontSize(44, scene.scale));
    const lineG = scene.add.graphics();
    lineG.lineStyle(1, 0x4a2a10, 0.9);
    lineG.lineBetween(cx - panelW / 2 + 20, lineY, cx + panelW / 2 - 20, lineY);

    // ── 메인 텍스트 ──────────────────────────────────────────
    const txt1 = scene.add.text(cx, cy - panelH * 0.10, '심해를  직면할', {
      fontSize:   scaledFontSize(32, scene.scale),
      fill:       '#e8c080',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const txt2 = scene.add.text(cx, cy + panelH * 0.09, '준비가  되었습니까?', {
      fontSize:   scaledFontSize(32, scene.scale),
      fill:       '#e8c080',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    // ── 확인 버튼 ────────────────────────────────────────────
    const btnW = parseInt(scaledFontSize(130, scene.scale));
    const btnH = parseInt(scaledFontSize(50, scene.scale));
    const btnY = cy + panelH * 0.35;

    const btnBg = scene.add.graphics();
    const drawBtn = (state) => {
      btnBg.clear();
      if (state === 'hover') {
        btnBg.fillStyle(0x5a1010, 1);
        btnBg.lineStyle(2, 0xff5533, 1);
      } else if (state === 'down') {
        btnBg.fillStyle(0x300808, 1);
        btnBg.lineStyle(2, 0xcc3318, 1);
      } else {
        btnBg.fillStyle(0x3a0e0e, 1);
        btnBg.lineStyle(2, 0xbb2810, 0.95);
      }
      btnBg.strokeRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
      btnBg.fillRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
    };
    drawBtn('normal');

    const btnTxt = scene.add.text(cx, btnY, '확  인', {
      fontSize:   scaledFontSize(24, scene.scale),
      fill:       '#ee5533',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const hit = scene.add.rectangle(cx, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      drawBtn('hover');
      btnTxt.setStyle({ fill: '#ff7755' });
    });
    hit.on('pointerout', () => {
      drawBtn('normal');
      btnTxt.setStyle({ fill: '#ee5533' });
    });
    hit.on('pointerdown', () => {
      drawBtn('down');
      btnTxt.setStyle({ fill: '#ff3311' });
    });
    hit.on('pointerup', () => {
      scene.scene.start('ExploreScene', { from: 'AtelierScene' });
    });

    // ── 모두 container에 추가 ────────────────────────────────
    this._container.add([
      panel, deco, lineG,
      label, txt1, txt2,
      btnBg, btnTxt, hit,
    ]);
  }

  show()    { this._container.setVisible(true);  }
  hide()    { this._container.setVisible(false); }
  destroy() { this._container.destroy(); }
}
