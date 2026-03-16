// ================================================================
//  Dive_Background.js
//  경로: Games/Codes/Scenes/Dives/Dive_Background.js
//
//  역할: DiveScene 배경 렌더링
//  호출: DiveScene.create() → DiveBuildBackground(this, W, H)
// ================================================================

function DiveBuildBackground(scene, W, H) {
  scene.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

  const scan = scene.add.graphics();
  for (let y = 0; y < H; y += 4) {
    scan.lineStyle(1, 0x1a0e06, 0.13);
    scan.lineBetween(0, y, W, y);
  }

  const grid = scene.add.graphics();
  const step = Math.round(W / 56);
  grid.lineStyle(1, 0x0f0a05, 0.4);
  for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
  for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);

  scene.add.text(W / 2, H / 2, 'DIVE', {
    fontSize: FontManager.adjustedSize(110, scene.scale),
    fill: '#0a0705', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5).setAlpha(0.06);
}
