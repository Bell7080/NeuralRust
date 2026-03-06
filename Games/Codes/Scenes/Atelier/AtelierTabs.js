// ================================================================
//  AtelierTabs.js
//  경로: Games/Codes/Scenes/Atelier/AtelierTabs.js
//
//  역할: 공방 탭 버튼 공통 빌더
//  의존: FontManager, utils.js
// ================================================================

/**
 * 탭 버튼 하나를 생성해 반환합니다.
 *
 * @param {Phaser.Scene} scene
 * @param {object} opts
 *   x, y       — 버튼 중심 좌표
 *   w, h       — 버튼 크기
 *   label      — 표시할 텍스트
 *   selected   — 현재 활성 탭 여부
 *   side       — 'left' | 'right' | 'center'  (시각적 스타일 힌트)
 *   onClick    — 클릭 콜백
 */
function makeAtelierTab(scene, opts) {
  const { x, y, w, h, label, selected, onClick } = opts;

  const bg = scene.add.graphics();

  function drawBg(state) {
    bg.clear();
    if (state === 'selected') {
      bg.fillStyle(0x1e1008, 1);
      bg.lineStyle(1, 0x6b3810, 1);
    } else if (state === 'hover') {
      bg.fillStyle(0x140c05, 1);
      bg.lineStyle(1, 0x2a1a0a, 0.8);
    } else {
      bg.fillStyle(0x0a0705, 0.85);
      bg.lineStyle(1, 0x1a0e06, 0.6);
    }
    bg.strokeRect(x - w / 2, y - h / 2, w, h);
    bg.fillRect(x - w / 2, y - h / 2, w, h);
  }

  drawBg(selected ? 'selected' : 'normal');

  const txt = scene.add.text(x, y, label, {
    fontSize:   scaledFontSize(13, scene.scale),
    fill:       selected ? '#c8a070' : '#3d2010',
    fontFamily: FontManager.TITLE,
  }).setOrigin(0.5);

  const hit = scene.add.rectangle(x, y, w, h, 0x000000, 0)
    .setInteractive({ useHandCursor: true });

  hit.on('pointerover', () => {
    if (!selected) { drawBg('hover'); txt.setStyle({ fill: '#8a6040' }); }
  });
  hit.on('pointerout', () => {
    if (!selected) { drawBg('normal'); txt.setStyle({ fill: '#3d2010' }); }
  });
  hit.on('pointerdown', () => { if (!selected && onClick) onClick(); });

  return { bg, txt, hit };
}
