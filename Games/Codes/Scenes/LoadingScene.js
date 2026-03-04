// ================================================================
//  LoadingScene.js
//  경로: Games/Codes/Scenes/LoadingScene.js
//
//  역할: 씬 전환 시 로딩 화면
//  의존: FontManager, utils.js
// ================================================================

class LoadingScene extends Phaser.Scene {
  constructor() { super({ key: 'LoadingScene' }); }

  init(data) {
    this.nextScene = data.next || 'LobbyScene';
    this.saveData  = data.save || null;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    // 배경 그리드
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    for (let x = 0; x <= W; x += step) { grid.lineStyle(1, 0x0f0a05, 0.5); grid.lineBetween(x, 0, x, H); }
    for (let y = 0; y <= H; y += step) { grid.lineStyle(1, 0x0f0a05, 0.5); grid.lineBetween(0, y, W, y); }

    // 로딩 도트 (녹슨 주황 톤)
    const dot = this.add.text(W / 2, H / 2, '·', {
      fontSize: scaledFontSize(28, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    // 하단 텍스트
    this.add.text(W / 2, H / 2 + parseInt(scaledFontSize(28, this.scale)), 'NEURAL RUST', {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#1e1008',
      fontFamily: FontManager.MONO,
      letterSpacing: 4,
    }).setOrigin(0.5);

    let count = 0;
    const dots = ['·', '· ·', '· · ·'];
    this.time.addEvent({
      delay: 300, repeat: 8,
      callback: () => { dot.setText(dots[count % 3]); count++; },
    });

    this.time.delayedCall(1200, () => {
      this.scene.start(this.nextScene, { save: this.saveData });
    });
  }
}
