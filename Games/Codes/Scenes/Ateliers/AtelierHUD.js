// ================================================================
//  AtelierHUD.js
//  경로: Games/Codes/Scenes/Ateliers/AtelierHUD.js
//
//  역할: 공방 화면 상단 중앙 — Day / Arc 표시
//  폰트 수치: 1280×720 basePx × 1.5 (가시성 개선)
// ================================================================

class AtelierHUD {

  constructor(scene, W, H) {
    this.scene = scene;
    this.W = W;
    this.H = H;
    this._build();
  }

  _build() {
    const { scene, W, H } = this;
    const cx   = W / 2;
    const topY = H * 0.045;
    const barH = parseInt(scaledFontSize(48, scene.scale));   // 32 × 1.5
    const gap  = parseInt(scaledFontSize(9,  scene.scale));   // 6 × 1.5

    const { day } = SaveManager.getProgress();
    const arc     = this._getArc();

    // ── DAY 패널 (좌) ──────────────────────────────────────────
    const dayW = W * 0.18;
    const dayX = cx - gap / 2 - dayW;

    const dayBg = scene.add.graphics();
    dayBg.fillStyle(0x0e0905, 0.96);
    dayBg.lineStyle(1, 0x3a2010, 0.9);
    dayBg.strokeRect(dayX, topY - barH / 2, dayW, barH);
    dayBg.fillRect(dayX, topY - barH / 2, dayW, barH);

    scene.add.text(dayX + dayW / 2, topY, `DAY  ${day}`, {
      fontSize:      scaledFontSize(21, scene.scale),   // 14 × 1.5
      fill:          '#a07040',
      fontFamily:    FontManager.MONO,
      letterSpacing: 2,
    }).setOrigin(0.5);

    // ── ARC 패널 (우) ──────────────────────────────────────────
    const arcW = W * 0.18;
    const arcX = cx + gap / 2;

    const arcBg = scene.add.graphics();
    arcBg.fillStyle(0x0c0a04, 0.98);
    arcBg.lineStyle(2, 0x7a5010, 0.95);
    arcBg.strokeRect(arcX, topY - barH / 2, arcW, barH);
    arcBg.fillRect(arcX, topY - barH / 2, arcW, barH);
    arcBg.lineStyle(1, 0x3a2008, 0.6);
    arcBg.strokeRect(arcX + 2, topY - barH / 2 + 2, arcW - 4, barH - 4);

    scene.add.text(arcX + parseInt(scaledFontSize(15, scene.scale)), topY,  // 10 × 1.5
      'ARC', {
      fontSize:      scaledFontSize(23, scene.scale),   // 15 × 1.5
      fill:          '#c8881a',
      fontFamily:    FontManager.MONO,
      fontStyle:     'bold',
      letterSpacing: 3,
    }).setOrigin(0, 0.5);

    this._arcNumTxt = scene.add.text(arcX + arcW - parseInt(scaledFontSize(15, scene.scale)), topY,
      `${arc}`, {
      fontSize:      scaledFontSize(21, scene.scale),   // 14 × 1.5
      fill:          '#f0c050',
      fontFamily:    FontManager.MONO,
      letterSpacing: 1,
    }).setOrigin(1, 0.5);

    scene.events.on('arcUpdated', (newArc) => {
      if (this._arcNumTxt && this._arcNumTxt.scene) {
        this._arcNumTxt.setText(`${newArc}`);
      }
    }, this);
  }

  _getArc() {
    const save = SaveManager.load();
    return save?.arc ?? 0;
  }
}
