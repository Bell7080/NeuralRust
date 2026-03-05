// ================================================================
//  AtelierHUD.js
//  경로: Games/Codes/Scenes/Atelier/AtelierHUD.js
//
//  역할: 공방 화면 상단 중앙 — Day / Arc 표시
//  의존: FontManager, SaveManager, utils.js
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
    const cx = W / 2;
    const topY = H * 0.045;

    // 배경 바
    const bar = scene.add.graphics();
    bar.fillStyle(0x0e0905, 0.96);
    bar.lineStyle(1, 0x3a2010, 0.9);
    const barW = W * 0.36;
    const barH = parseInt(scaledFontSize(32, scene.scale));
    bar.strokeRect(cx - barW / 2, topY - barH / 2, barW, barH);
    bar.fillRect(cx - barW / 2, topY - barH / 2, barW, barH);

    // 구분선
    bar.lineStyle(1, 0x3a2010, 0.5);
    bar.lineBetween(cx, topY - barH / 2 + 4, cx, topY + barH / 2 - 4);

    const { day } = SaveManager.getProgress();
    const arc     = this._getArc();

    // Day
    scene.add.text(cx - barW * 0.25, topY, `DAY  ${day}`, {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#a07040',
      fontFamily: FontManager.MONO,
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Arc
    scene.add.text(cx + barW * 0.25, topY, `${arc}  Arc`, {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#a07040',
      fontFamily: FontManager.MONO,
      letterSpacing: 2,
    }).setOrigin(0.5);
  }

  _getArc() {
    const save = SaveManager.load();
    return save?.arc ?? 0;
  }
}
