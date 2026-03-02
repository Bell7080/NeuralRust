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

    this.add.rectangle(0, 0, W, H, 0x060608).setOrigin(0);

    this.add.text(cx, H / 2 - 20, '[ INGAME ]', {
      fontSize: scaledFontSize(20, this.scale),
      fill: '#222233',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    this.add.text(cx, H / 2 + 20, '개발 중 —', {
      fontSize: scaledFontSize(13, this.scale),
      fill: '#1a1a28',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    this.add.text(cx, H - 28, 'ESC  →  로비로', {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#1c1c24',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    // ESC는 main.js capture 단계에서 처리 (브라우저 기본 동작 차단 포함)
  }
}
