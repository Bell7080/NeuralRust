// ================================================================
//  Settings_Tab_Video.js
//  경로: Games/Codes/Scenes/Settings/Settings_Tab_Video.js
//
//  역할: 설정 > 비디오 탭 (전체화면 / 창 모드)
//  호출: Settings_Tab_Video.build(scene, W, H, cx)
//  의존: FontManager, utils.js
//        scene.drawOptionBox
// ================================================================

const Settings_Tab_Video = {

  build(scene, W, H, cx) {
    const isFullscreen = !!document.fullscreenElement;

    scene.add.text(W * 0.08, H * 0.32, '[ 화면 모드 ]', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const options = [
      { key: 'fullscreen', label: '전체화면',  desc: 'F11 또는 이 항목으로 전환' },
      { key: 'windowed',   label: '창  모  드', desc: '창 모드로 전환' },
    ];

    const baseY = H * 0.45;
    const gap   = H * 0.17;

    options.forEach((opt, i) => {
      const y          = baseY + gap * i;
      const isSelected = isFullscreen ? opt.key === 'fullscreen' : opt.key === 'windowed';
      const box        = scene.add.graphics();
      scene.drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, isSelected);

      const nameText = scene.add.text(W * 0.13, y - 8, opt.label, {
        fontSize: scaledFontSize(18, scene.scale),
        fill: isSelected ? '#c8a070' : '#3d2010',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0.5);

      scene.add.text(W * 0.13, y + 12, opt.desc, {
        fontSize: scaledFontSize(12, scene.scale),
        fill: isSelected ? '#4a2810' : '#251508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      scene.add.text(W * 0.09, y, isSelected ? '▶' : '·', {
        fontSize: scaledFontSize(14, scene.scale),
        fill: isSelected ? '#a05018' : '#251508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      const hit = scene.add.rectangle(cx, y, W * 0.84, 56, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!isSelected) { scene.drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, true); nameText.setStyle({ fill: '#8a6040' }); }
      });
      hit.on('pointerout', () => {
        if (!isSelected) { scene.drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, false); nameText.setStyle({ fill: '#3d2010' }); }
      });
      hit.on('pointerdown', () => {
        if (isSelected) return;
        if (opt.key === 'fullscreen') document.documentElement.requestFullscreen?.().catch(() => {});
        else                          document.exitFullscreen?.().catch(() => {});
      });
    });

    scene.add.text(cx, H * 0.74, 'F11 키로도 전체화면을 전환할 수 있습니다', {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
  },
};
