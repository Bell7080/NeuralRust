// ================================================================
//  LoadingScene.js
//  경로: Games/Codes/Scenes/LoadingScene.js
//
//  역할: 씬 전환 시 로딩 화면
//  의존: FontManager, utils.js, CharacterSpriteManager
// ================================================================

class LoadingScene extends Phaser.Scene {
  constructor() { super({ key: 'LoadingScene' }); }

  init(data) {
    this.nextScene = data.next || 'LobbyScene';
    this.saveData  = data.save || null;
  }

  preload() {
    // 캐릭터 스프라이트 시트 2장 로드
    CharacterSpriteManager.preload(this);

    // 로드 진행률 (선택)
    this.load.on('progress', (value) => {
      if (this._progressDot) {
        const stages = ['·', '· ·', '· · ·'];
        this._progressDot.setText(stages[Math.floor(value * 3) % 3]);
      }
    });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── 배경 ──────────────────────────────────────────────
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    for (let x = 0; x <= W; x += step) {
      grid.lineStyle(1, 0x0f0a05, 0.5);
      grid.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y <= H; y += step) {
      grid.lineStyle(1, 0x0f0a05, 0.5);
      grid.lineBetween(0, y, W, y);
    }

    // ── 텍스트 ────────────────────────────────────────────
    const dot = this.add.text(W / 2, H / 2, '·', {
      fontSize:   scaledFontSize(34, this.scale),
      fill:       '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    this._progressDot = dot;

    this.add.text(W / 2, H / 2 + parseInt(scaledFontSize(34, this.scale)), 'NEURAL RUST', {
      fontSize:      scaledFontSize(12, this.scale),
      fill:          '#1e1008',
      fontFamily:    FontManager.MONO,
      letterSpacing: 4,
    }).setOrigin(0.5);

    // ── 애니메이션 ────────────────────────────────────────
    let count = 0;
    const dots = ['·', '· ·', '· · ·'];
    this.time.addEvent({
      delay: 300, repeat: 8,
      callback: () => { dot.setText(dots[count % 3]); count++; },
    });

    // ── 스프라이트 시트 → 개별 텍스처 등록 ───────────────
    // preload 완료 후 create에서 한 번만 실행
    CharacterSpriteManager.extractToTextures(this);

    // ── 다음 씬으로 ───────────────────────────────────────
    this.time.delayedCall(1200, () => {
      this.scene.start(this.nextScene, { save: this.saveData });
    });
  }
}
