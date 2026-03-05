// ================================================================
//  Settings_Tab_Font.js
//  경로: Games/Codes/Scenes/Settings/Settings_Tab_Font.js
//
//  역할: 설정 > 폰트 탭
//  호출: Settings_Tab_Font.build(scene, W, H, cx)
//  의존: FontManager, SaveManager, utils.js
//        scene.drawOptionBox / scene.fromScene
// ================================================================

const Settings_Tab_Font = {

  build(scene, W, H, cx) {
    scene.add.text(W * 0.08, H * 0.32, '[ 폰트 ]', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const saved = localStorage.getItem('settings_font') || 'kirang';

    const options = [
      { key: 'kirang', label: 'BMKiranghaerang',  desc: '기란해랑 손글씨 폰트',     family: "'BMKiranghaerang', monospace" },
      { key: 'game',   label: 'NeoDunggeunmoPro', desc: '게임 전용 도트 폰트',       family: "'NeoDunggeunmoPro', monospace" },
      { key: 'system', label: 'System Default',   desc: '브라우저 기본 시스템 폰트', family: 'Arial, sans-serif' },
    ];

    const baseY = H * 0.38;
    const gap   = H * 0.13;
    options.forEach((opt, i) => this._makeOption(scene, opt, W, baseY + gap * i, cx, saved));
    this._buildPreview(scene, W, H, cx);
  },

  _makeOption(scene, opt, W, y, cx, saved) {
    const isSelected = saved === opt.key;
    const box = scene.add.graphics();
    scene.drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, isSelected);

    const nameText = scene.add.text(W * 0.13, y - 8, opt.label, {
      fontSize: scaledFontSize(18, scene.scale),
      fill: isSelected ? '#c8a070' : '#3d2010',
      fontFamily: opt.family,
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
      if (saved !== opt.key) { scene.drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, true); nameText.setStyle({ fill: '#8a6040' }); }
    });
    hit.on('pointerout', () => {
      if (saved !== opt.key) { scene.drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, false); nameText.setStyle({ fill: '#3d2010' }); }
    });
    hit.on('pointerdown', () => {
      localStorage.setItem('settings_font', opt.key);
      SaveManager.saveSettings({ font: opt.key });
      FontManager.setActive(opt.key);
      scene.scene.restart({ from: scene.fromScene, tab: 'font' });
    });
  },

  _buildPreview(scene, W, H, cx) {
    const py = H * 0.78;
    const line = scene.add.graphics();
    line.lineStyle(1, 0x1e1008, 1);
    line.lineBetween(W * 0.1, py - 20, W * 0.9, py - 20);

    scene.add.text(W * 0.08, py, '미리보기', {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(cx, py + 26, 'NEURAL RUST — 뉴럴 러스트 — ABC 123', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#6b4020',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    scene.add.text(cx, py + 54, '소프트웨어만 살아남은 세계, 붕괴 후 102년', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.BODY,
    }).setOrigin(0.5, 0);
  },
};
