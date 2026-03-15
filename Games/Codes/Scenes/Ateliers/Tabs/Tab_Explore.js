// ================================================================
//  Tab_Explore.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Explore.js
//
//  수정:
//    - Tab_Base 상속 (issue 7): _container/_tweens/_timers/_sceneHits/_tween/_delay/show/hide/destroy 제거
//    - destroy() 제거 → Tab_Base.destroy(true) 사용 (issue 3: _container.destroy(true))
//    - cs = 14 고정픽셀 → scaledFontSize 기반으로 변경 (issue 5)
//    - 코너 장식 8줄 → drawCornerDeco() 단일 호출로 교체 (issue 6)
// ================================================================

class Tab_Explore extends Tab_Base {
  constructor(scene, W, H) {
    super(scene, W, H);
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
    const cs   = parseInt(FontManager.adjustedSize(14, scene.scale));
    const pad  = parseInt(FontManager.adjustedSize(8, scene.scale));
    drawCornerDeco(
      deco,
      cx - panelW / 2 + pad, cy - panelH / 2 + pad,
      panelW - pad * 2, panelH - pad * 2,
      cs, 0x7a4018, 0.7
    );

    // ── 상단 라벨 ────────────────────────────────────────────
    const labelY = cy - panelH / 2 + parseInt(FontManager.adjustedSize(26, scene.scale));
    const labelTxt = scene.add.text(cx, labelY, '[ 탐  색 ]', {
      fontSize: FontManager.adjustedSize(13, scene.scale),
      fill: '#7a5028', fontFamily: FontManager.MONO, letterSpacing: 3,
    }).setOrigin(0.5, 0.5);

    // ── 구분선 ───────────────────────────────────────────────
    const lineY = cy - panelH / 2 + parseInt(FontManager.adjustedSize(44, scene.scale));
    const lineG = scene.add.graphics();
    lineG.lineStyle(1, 0x4a2a10, 0.9);
    lineG.lineBetween(cx - panelW / 2 + 20, lineY, cx + panelW / 2 - 20, lineY);

    // ── 안내 텍스트 ──────────────────────────────────────────
    const descTxt = scene.add.text(cx, cy - panelH * 0.08,
      '파티를 편성하고 탐사를 시작합니다.', {
        fontSize: FontManager.adjustedSize(18, scene.scale),
        fill: '#c8a070', fontFamily: FontManager.TITLE,
      }).setOrigin(0.5);

    const subTxt = scene.add.text(cx, cy + panelH * 0.04,
      '탐사 시작 후에는 되돌아올 수 없습니다.', {
        fontSize: FontManager.adjustedSize(12, scene.scale),
        fill: '#5a3a18', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);

    // ── 탐색 시작 버튼 ───────────────────────────────────────
    const btnW = parseInt(FontManager.adjustedSize(160, scene.scale));
    const btnH = parseInt(FontManager.adjustedSize(50, scene.scale));
    const btnY = cy + panelH * 0.30;

    const btnBg = scene.add.graphics();
    const drawBtn = (state) => {
      btnBg.clear();
      if (state === 'hover') {
        btnBg.fillStyle(0x2a1a08, 1);
        btnBg.lineStyle(2, 0xc8a070, 1);
      } else if (state === 'down') {
        btnBg.fillStyle(0x1a1008, 1);
        btnBg.lineStyle(2, 0x907040, 1);
      } else {
        btnBg.fillStyle(0x1e1008, 1);
        btnBg.lineStyle(2, 0xa05018, 0.9);
      }
      btnBg.strokeRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
      btnBg.fillRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
    };
    drawBtn('normal');

    const btnTxt = scene.add.text(cx, btnY, '파티  편성', {
      fontSize: FontManager.adjustedSize(22, scene.scale),
      fill: '#c8a070', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const hit = scene.add.rectangle(cx, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => { drawBtn('hover'); btnTxt.setStyle({ fill: '#e8d090' }); });
    hit.on('pointerout',  () => { drawBtn('normal'); btnTxt.setStyle({ fill: '#c8a070' }); });
    hit.on('pointerdown', () => { drawBtn('down'); btnTxt.setStyle({ fill: '#907040' }); });
    hit.on('pointerup', () => {
      hit.disableInteractive();
      drawBtn('down');
      // AtelierScene 슬라이드아웃 후 PartyScene 진입
      // (ExploreScene은 PartyScene 이후 난이도 선택 단계로 이동)
      if (scene._slideOutUIThen) {
        scene._slideOutUIThen(() => {
          scene.scene.start('PartyScene', { from: 'AtelierScene' });
        });
      } else {
        scene.scene.start('PartyScene', { from: 'AtelierScene' });
      }
    });

    // ── container 등록 ───────────────────────────────────────
    this._container.add([panel, deco, labelTxt, lineG, descTxt, subTxt, btnBg, btnTxt]);
    hit.setDepth(20);
    this._sceneHits.push(hit);
  }
}
