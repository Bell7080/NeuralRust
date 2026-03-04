// ================================================================
//  GameScene.js
//  경로: Games/Codes/Scenes/GameScene.js
//
//  역할: 인게임 플레이스홀더
//  ESC: 전체화면 해제 없이 바로 로비로 이동
// ================================================================

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.saveData = data.save || this.saveData || null;
  }

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const cx = W / 2;

    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    // 배경 그리드
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    for (let x = 0; x <= W; x += step) { grid.lineStyle(1, 0x0f0a05, 0.5); grid.lineBetween(x, 0, x, H); }
    for (let y = 0; y <= H; y += step) { grid.lineStyle(1, 0x0f0a05, 0.5); grid.lineBetween(0, y, W, y); }

    this.add.text(cx, H / 2 - 24, '[ INGAME ]', {
      fontSize: scaledFontSize(18, this.scale),
      fill: '#1a1008',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    this.add.text(cx, H / 2 + 16, '— 개발 중 —', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#150c06',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    this.add.text(cx, H - 28, 'ESC  →  로비로', {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#150c06',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
  }
}
