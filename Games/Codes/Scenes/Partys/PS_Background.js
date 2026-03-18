// ================================================================
//  PS_Background.js
//  경로: Games/Codes/Scenes/Partys/PS_Background.js
//
//  역할: PartyScene 배경(BG_007) + 헤더 빌드
//
//  로드 순서: PS_Layout.js → PS_Background.js → PS_LeftPanel.js
// ================================================================

const PS_Background = {

  // BG_007 배경 이미지 + 암막 + 그리드
  buildBackground(scene) {
    const W  = scene.W, H = scene.H;
    const bg = scene._bgContainer;

    bg.add(scene.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0));

    if (scene.textures.exists('bg_party')) {
      const img = scene.add.image(W / 2, H / 2, 'bg_party').setOrigin(0.5);
      const sc  = Math.max(W / img.width, H / img.height);
      img.setScale(sc).setAlpha(0.35);
      bg.add(img);
    }

    // 전체 암막 — 중앙은 투명하게
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x050407, 0.55);
    overlay.fillRect(0, 0, W, H);
    overlay.fillStyle(0x000000, 0.0);
    overlay.fillRect(scene._lw, 0, scene._cw, H);
    bg.add(overlay);

    // 그리드 패턴 (은은하게)
    const grid = scene.add.graphics();
    const step = Math.round(W / 72);
    grid.lineStyle(1, 0x0c0a06, 0.25);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    bg.add(grid);
  },

  // 헤더 배경 + 타이틀 텍스트
  buildHeader(scene) {
    const W    = scene.W;
    const fs   = scene._fs.bind(scene);
    const hdrH = scene._hdrH;
    const hdr  = scene._hdrContainer;

    const hBg = scene.add.graphics();
    hBg.fillStyle(0x060810, 0.92);
    hBg.lineStyle(1, 0x2a1a08, 0.5);
    hBg.fillRect(0, 0, W, hdrH);
    hBg.strokeRect(0, 0, W, hdrH);
    hdr.add(hBg);

    hdr.add(scene.add.text(W / 2, hdrH / 2, '탐  사  파  티  편  성', {
      fontSize: fs(20), fill: '#6b4020', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5));

    hdr.add(scene.add.text(scene._pm + 6, hdrH / 2, '비용 : 파티 Cog 합산 Arc', {
      fontSize: fs(10), fill: '#3a2010', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5));
  },

};
