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
//    · 섹션 라벨 Y: H * 0.295 → H * 0.310
//      탭바 구분선(H * ~0.259)과 라벨(폰트 18) 사이 여백 부족으로
//      겹쳐 보이던 문제 해소. 라벨 상단이 구분선에서 H * 0.051 떨어짐.
//    · firstOptY: H * 0.345 → H * 0.360
//      섹션 라벨 이동량(+H*0.015)에 연동, 라벨→첫 박스 간격 유지.
//    · 섹션 라벨 폰트: 18 유지
//    · previewY: lastOptBottom + H * 0.04 기준 유지
// ================================================================

const Settings_Tab_Font = {

  _layout(W, H) {
    const marginX    = W * 0.06;
    const contentW   = W * 0.88;
    const optionBoxH = Math.round(H * 0.10);
    const optionGap  = optionBoxH + Math.round(H * 0.018);
    const firstOptY  = H * 0.360;   // ✏️ 0.345 → 0.360
    return { marginX, contentW, optionBoxH, optionGap, firstOptY };
  },

  build(scene, W, H, cx) {
    const L     = this._layout(W, H);
    const saved = localStorage.getItem('settings_font') || 'kirang';

    // ✏️ 섹션 라벨 Y: H * 0.295 → H * 0.310
    scene.add.text(L.marginX, H * 0.310, '[ 폰트 ]', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const options = [
      { key: 'kirang', label: 'BMKiranghaerang',  desc: '기란해랑 손글씨 폰트',     family: "'BMKiranghaerang', monospace" },
      { key: 'game',   label: 'NeoDunggeunmoPro', desc: '게임 전용 도트 폰트',       family: "'NeoDunggeunmoPro', monospace" },
      { key: 'system', label: 'System Default',   desc: '브라우저 기본 시스템 폰트', family: 'Arial, sans-serif' },
    ];

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
      fontSize: scaledFontSize(15, scene.scale),
      fill: isSelected ? '#a05018' : '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const nameText = scene.add.text(L.marginX + L.contentW * 0.07, cy - L.optionBoxH * 0.18, opt.label, {
      fontSize: scaledFontSize(20, scene.scale),
      fill: isSelected ? '#c8a070' : '#7a5028',
      fontFamily: opt.family,
    }).setOrigin(0, 0.5);

    scene.add.text(L.marginX + L.contentW * 0.07, cy + L.optionBoxH * 0.22, opt.desc, {
      fontSize: scaledFontSize(13, scene.scale),
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
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(cx, labelY + H * 0.04, 'NEURAL RUST — 뉴럴 러스트 — ABC 123', {
      fontSize: scaledFontSize(21, scene.scale),
      fill: '#7a5028',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    scene.add.text(cx, labelY + H * 0.09, '소프트웨어만 살아남은 세계, 붕괴 후 102년', {
      fontSize: scaledFontSize(15, scene.scale),
      fill: '#5a3820',
      fontFamily: FontManager.BODY,
    }).setOrigin(0.5, 0);
  },
};
