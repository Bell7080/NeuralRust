// ================================================================
//  Settings_Tab_Font.js
//  경로: Games/Codes/Scenes/Settings/Settings_Tab_Font.js
//
//  역할: 설정 > 폰트 탭
//  호출: Settings_Tab_Font.build(scene, W, H, cx)
//  의존: FontManager, SaveManager, utils.js
//        scene.drawOptionBox / scene.fromScene
//
//  ✏️ 수정 내역
//    · 섹션 라벨 Y: H * 0.310 → H * 0.295
//      firstOptY = H * 0.360, optionBoxH = H * 0.10
//      → 첫 박스 상단 = H * 0.360 - H * 0.050 = H * 0.310
//      라벨이 H * 0.310에 있으면 박스 상단과 정확히 겹침
//      H * 0.295로 올려 박스 위쪽에 H * 0.015 여백 확보
//    · setDepth 불필요 — Y값으로 공간이 분리되므로 제거
//    · firstOptY: H * 0.360 유지
//    · 섹션 라벨 폰트: 18
//    · previewY: lastOptBottom + H * 0.04 기준
// ================================================================

const Settings_Tab_Font = {

  _layout(W, H) {
    const marginX    = W * 0.06;
    const contentW   = W * 0.88;
    const optionBoxH = Math.round(H * 0.10);
    const optionGap  = optionBoxH + Math.round(H * 0.018);
    const firstOptY  = H * 0.360;
    return { marginX, contentW, optionBoxH, optionGap, firstOptY };
  },

  build(scene, W, H, cx) {
    const L     = this._layout(W, H);
    const saved = localStorage.getItem('settings_font') || 'kirang';

    const options = [
      { key: 'kirang', label: 'BMKiranghaerang',  desc: '기란해랑 손글씨 폰트',     family: "'BMKiranghaerang', monospace" },
      { key: 'game',   label: 'NeoDunggeunmoPro', desc: '게임 전용 도트 폰트',       family: "'NeoDunggeunmoPro', monospace" },
      { key: 'system', label: 'System Default',   desc: '브라우저 기본 시스템 폰트', family: 'Arial, sans-serif' },
    ];

    // ✏️ 섹션 라벨을 H * 0.295에 배치 — 첫 박스 상단(H * 0.310)보다 위
    scene.add.text(L.marginX, H * 0.295, '[ 폰트 ]', {
      fontSize: FontManager.adjustedSize(18, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    options.forEach((opt, i) => {
      this._makeOption(scene, opt, W, H, cx, L, L.firstOptY + L.optionGap * i, saved);
    });

    const lastOptCenter = L.firstOptY + L.optionGap * (options.length - 1);
    const lastOptBottom = lastOptCenter + L.optionBoxH / 2;
    const previewY      = lastOptBottom + H * 0.04;
    this._buildPreview(scene, W, H, cx, L, previewY);
  },

  _makeOption(scene, opt, W, H, cx, L, cy, saved) {
    const isSelected = saved === opt.key;
    const boxTop     = cy - L.optionBoxH / 2;
    const box        = scene.add.graphics();
    scene.drawOptionBox(box, L.marginX, boxTop, L.contentW, L.optionBoxH, isSelected);

    scene.add.text(L.marginX + L.contentW * 0.03, cy, isSelected ? '▶' : '·', {
      fontSize: FontManager.adjustedSize(15, scene.scale),
      fill: isSelected ? '#a05018' : '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const nameText = scene.add.text(L.marginX + L.contentW * 0.07, cy - L.optionBoxH * 0.18, opt.label, {
      fontSize: FontManager.adjustedSize(20, scene.scale),
      fill: isSelected ? '#c8a070' : '#7a5028',
      fontFamily: opt.family,
    }).setOrigin(0, 0.5);

    scene.add.text(L.marginX + L.contentW * 0.07, cy + L.optionBoxH * 0.22, opt.desc, {
      fontSize: FontManager.adjustedSize(13, scene.scale),
      fill: isSelected ? '#5a3820' : '#4a3018',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const hit = scene.add.rectangle(cx, cy, L.contentW, L.optionBoxH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      if (saved !== opt.key) {
        scene.drawOptionBox(box, L.marginX, boxTop, L.contentW, L.optionBoxH, false, true);
        nameText.setStyle({ fill: '#9a7040' });
      }
    });
    hit.on('pointerout', () => {
      if (saved !== opt.key) {
        scene.drawOptionBox(box, L.marginX, boxTop, L.contentW, L.optionBoxH, false, false);
        nameText.setStyle({ fill: '#7a5028' });
      }
    });
    hit.on('pointerdown', () => {
      localStorage.setItem('settings_font', opt.key);
      SaveManager.saveSettings({ font: opt.key });
      FontManager.setActive(opt.key);
      scene.scene.restart({ from: scene.fromScene, tab: 'font' });
    });
  },

  _buildPreview(scene, W, H, cx, L, startY) {
    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x2a1a0a, 0.8);
    divider.lineBetween(L.marginX, startY, L.marginX + L.contentW, startY);

    const labelY = startY + H * 0.025;
    scene.add.text(L.marginX, labelY, '미리보기', {
      fontSize: FontManager.adjustedSize(15, scene.scale),
      fill: '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(cx, labelY + H * 0.04, 'NEURAL RUST — 뉴럴 러스트 — ABC 123', {
      fontSize: FontManager.adjustedSize(21, scene.scale),
      fill: '#7a5028',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    scene.add.text(cx, labelY + H * 0.09, '소프트웨어만 살아남은 세계, 붕괴 후 102년', {
      fontSize: FontManager.adjustedSize(15, scene.scale),
      fill: '#5a3820',
      fontFamily: FontManager.BODY,
    }).setOrigin(0.5, 0);
  },
};
