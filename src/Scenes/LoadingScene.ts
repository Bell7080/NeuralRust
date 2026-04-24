// ================================================================
//  LoadingScene.ts
//  경로: src/Scenes/LoadingScene.ts
//
//  역할: 씬 전환 시 로딩 화면
//        AtelierScene 진입 전 미완료 스토리 이벤트 자동 체크
//
//  흐름:
//    LobbyScene → LoadingScene
//      └─ nextScene === 'AtelierScene' + 미완료 이벤트 있음
//           → DialogueScene 경유 후 AtelierScene
//      └─ 이미 다 봤거나 해당 없음
//           → 바로 AtelierScene
// ================================================================

import { FontManager }            from '../Managers/FontManager';
import { StoryManager }           from '../Managers/StoryManager';
import { CharacterSpriteManager } from '../Managers/CharacterSpriteManager';
import { clearAllSceneDom }       from '../utils/sceneCleanup';

export class LoadingScene extends Phaser.Scene {
  private _nextScene!: string;
  private _saveData!:  unknown;
  private _progressDot!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'LoadingScene' }); }

  init(data: { next?: string; save?: unknown }): void {
    this._nextScene = data.next || 'LobbyScene';
    this._saveData  = data.save || null;
  }

  preload(): void {
    CharacterSpriteManager.preload(this);

    this.load.on('progress', (value: number) => {
      if (this._progressDot) {
        const stages = ['·', '· ·', '· · ·'];
        this._progressDot.setText(stages[Math.floor(value * 3) % 3]);
      }
    });
  }

  create(): void {
    clearAllSceneDom();

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
    this.add.text(W / 2, H / 2 - parseInt(FontManager.adjustedSize(28, this.scale)) * 1.2, 'NEURAL RUST', {
      fontSize:      FontManager.adjustedSize(28, this.scale),
      color:         '#2e1a0a',
      fontFamily:    FontManager.MONO,
      letterSpacing: 6,
    }).setOrigin(0.5);

    const dot = this.add.text(W / 2, H / 2, '·', {
      fontSize:   FontManager.adjustedSize(48, this.scale),
      color:      '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    this._progressDot = dot;

    // ── 애니메이션 ────────────────────────────────────────
    let count = 0;
    const dots = ['·', '· ·', '· · ·'];
    this.time.addEvent({
      delay: 300, repeat: 8,
      callback: () => { dot.setText(dots[count % 3]); count++; },
    });

    // ── 다음 씬으로 ───────────────────────────────────────
    this.time.delayedCall(1200, () => this._goNext());
  }

  private _goNext(): void {
    if (this._nextScene !== 'AtelierScene') {
      this.scene.start(this._nextScene, { save: this._saveData });
      return;
    }

    const pending = StoryManager.getScenesForToday('start');

    if (pending.length > 0) {
      this.scene.start('DialogueScene', {
        eventId:  pending[0],
        next:     'AtelierScene',
        nextData: { save: this._saveData },
      });
    } else {
      this.scene.start('AtelierScene', { save: this._saveData });
    }
  }
}
