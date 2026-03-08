// ================================================================
//  DialogueScene.js  (사용 예시 — 실제 UI는 게임에 맞게 수정)
//  경로: Games/Codes/Scenes/DialogueScene.js
//
//  역할: DialogueManager 연결 + FX 실행 예시
//  의존: DialogueManager, Phaser3
//
//  호출 예:
//    this.scene.launch('DialogueScene', {
//      eventId:  'Day_1_1',
//      onEnd:    () => { ... },
//    });
// ================================================================

class DialogueScene extends Phaser.Scene {

  constructor() {
    super({ key: 'DialogueScene' });
  }

  // ── init ────────────────────────────────────────────────────────
  init(data) {
    this._eventId = data.eventId;
    this._onEnd   = data.onEnd || (() => {});
  }

  // ── create ──────────────────────────────────────────────────────
  create() {
    this._buildUI();
    this._startDialogue();

    // 클릭 / 스페이스 → next()
    this.input.on('pointerdown', () => this._onInput());
    this.input.keyboard.on('keydown-SPACE', () => this._onInput());
    this.input.keyboard.on('keydown-ENTER', () => this._onInput());
  }

  // ── UI 생성 (예시 — 실제 디자인으로 교체) ───────────────────────
  _buildUI() {
    const W = this.scale.width, H = this.scale.height;

    // 대화창 배경
    this._box = this.add.rectangle(W / 2, H - 120, W - 40, 180, 0x111111, 0.92)
      .setStrokeStyle(1, 0x444444);

    // 캐릭터 이름
    this._nameText = this.add.text(40, H - 205, '', {
      fontFamily: 'Malgun Gothic', fontSize: '15px', color: '#FFE066',
    });

    // 대사
    this._bodyText = this.add.text(50, H - 185, '', {
      fontFamily: 'Malgun Gothic', fontSize: '14px', color: '#FFFFFF',
      wordWrap: { width: W - 100 }, lineSpacing: 4,
    });

    // 선택지 컨테이너
    this._choiceContainer = this.add.container(0, 0).setVisible(false);

    // 캐릭터 스프라이트 자리 (실제 위치는 레이아웃에 맞게)
    this._charSprite = null;
  }

  // ── 대화 시작 ───────────────────────────────────────────────────
  _startDialogue() {
    DialogueManager.play(this, this._eventId, {

      // 대사 한 줄
      onLine: (line) => {
        this._nameText.setText(line.char || '');
        this._bodyText.setText(line.text);

        // 표정 변경 (null = 이전 유지)
        const spriteKey = DialogueManager.resolveExpr(
          // char 단축어 역매핑이 필요하면 별도 처리
          Object.keys(CAST_DATA).find(k => CAST_DATA[k] === line.char) || '',
          line.expr
        );
        if (spriteKey && this._charSprite) {
          this._charSprite.setTexture(spriteKey);
        }
      },

      // 선택지
      onChoice: (choices) => {
        this._showChoices(choices);
      },

      // FX 연출
      onFx: (fxStr) => {
        DialogueManager.parseFx(fxStr).forEach(({ key, params }) => {
          this._runFx(key, params);
        });
      },

      // BGM
      onBgm: (file) => {
        // 기존 BGM 있으면 fadeOut 후 교체 — 실제 AudioManager 연결
        console.log('[DialogueScene] BGM:', file);
      },

      // 종료
      onEnd: () => {
        this._onEnd();
        this.scene.stop();
      },
    });
  }

  // ── 입력 처리 ───────────────────────────────────────────────────
  _onInput() {
    if (DialogueManager.isPlaying()) {
      DialogueManager.next();
    }
  }

  // ── 선택지 표시 ─────────────────────────────────────────────────
  _showChoices(choices) {
    const W = this.scale.width, H = this.scale.height;
    this._choiceContainer.removeAll(true);
    this._choiceContainer.setVisible(true);

    choices.forEach((c, i) => {
      const y   = H - 260 - i * 36;
      const bg  = this.add.rectangle(W / 2, y, 320, 30, 0x1E1E1E)
        .setStrokeStyle(1, 0x5DD8F0)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(W / 2, y, c.text, {
        fontFamily: 'Malgun Gothic', fontSize: '13px', color: '#FFFFFF',
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        this._choiceContainer.setVisible(false);
        DialogueManager.choose(i);
      });

      this._choiceContainer.add([bg, txt]);
    });
  }

  // ================================================================
  // FX 실행 — FX 탭 예약어 전부 구현
  // ================================================================
  _runFx(key, params) {
    const cam  = this.cameras.main;
    const char = this._charSprite;
    const box  = this._box;

    // ── screen ────────────────────────────────────────────────────
    switch (key) {
      case 'shake_screen':
        cam.shake(params.duration ?? 300, (params.intensity ?? 3) / 1000);
        break;
      case 'flash_screen':
        cam.flash(params.duration ?? 200);
        break;
      case 'fade_out':
        cam.fadeOut(params.duration ?? 400);
        break;
      case 'fade_in':
        cam.fadeIn(params.duration ?? 400);
        break;
      case 'zoom_in':
        cam.zoomTo(params.zoom ?? 1.2, params.duration ?? 300);
        break;
      case 'zoom_out':
        cam.zoomTo(params.zoom ?? 1.0, params.duration ?? 300);
        break;
      case 'pan_camera':
        cam.pan(params.x ?? 0, params.y ?? 0, params.duration ?? 500);
        break;

      // ── char ──────────────────────────────────────────────────────
      case 'shake_char':
        if (!char) break;
        this.tweens.add({
          targets: char, x: char.x + (params.intensity ?? 5),
          duration: 40, yoyo: true, repeat: params.repeat ?? 4,
        });
        break;
      case 'slide_out_left':
        if (!char) break;
        this.tweens.add({
          targets: char,
          x: char.x - (params.distance ?? 200), alpha: 0,
          duration: params.duration ?? 300, ease: 'Sine.easeIn',
        });
        break;
      case 'slide_out_right':
        if (!char) break;
        this.tweens.add({
          targets: char,
          x: char.x + (params.distance ?? 200), alpha: 0,
          duration: params.duration ?? 300, ease: 'Sine.easeIn',
        });
        break;
      case 'slide_in_left':
        if (!char) break;
        char.x -= (params.distance ?? 200); char.alpha = 0;
        this.tweens.add({
          targets: char, x: char.x + (params.distance ?? 200), alpha: 1,
          duration: params.duration ?? 300, ease: 'Sine.easeOut',
        });
        break;
      case 'slide_in_right':
        if (!char) break;
        char.x += (params.distance ?? 200); char.alpha = 0;
        this.tweens.add({
          targets: char, x: char.x - (params.distance ?? 200), alpha: 1,
          duration: params.duration ?? 300, ease: 'Sine.easeOut',
        });
        break;
      case 'fade_out_char':
        if (!char) break;
        this.tweens.add({ targets: char, alpha: 0, duration: params.duration ?? 300 });
        break;
      case 'fade_in_char':
        if (!char) break;
        this.tweens.add({ targets: char, alpha: 1, duration: params.duration ?? 300 });
        break;
      case 'bounce_char':
        if (!char) break;
        this.tweens.add({
          targets: char, y: char.y - (params.height ?? 20),
          duration: params.duration ?? 400, yoyo: true, ease: 'Bounce.easeOut',
        });
        break;
      case 'flash_char':
        if (!char) break;
        this.tweens.add({
          targets: char, alpha: 0,
          duration: 80, yoyo: true, repeat: params.repeat ?? 2,
        });
        break;
      case 'tint_char':
        if (!char) break;
        char.setTint(parseInt(params.color ?? 'ff4444', 16));
        this.time.delayedCall(params.duration ?? 300, () => char.clearTint());
        break;
      case 'scale_up_char':
        if (!char) break;
        this.tweens.add({
          targets: char,
          scaleX: params.scale ?? 1.15, scaleY: params.scale ?? 1.15,
          duration: params.duration ?? 200, yoyo: true,
        });
        break;

      // ── ui ────────────────────────────────────────────────────────
      case 'textbox_shake':
        this.tweens.add({
          targets: box, x: box.x + (params.intensity ?? 3),
          duration: 40, yoyo: true, repeat: 4,
        });
        break;
      case 'textbox_flash':
        this.tweens.add({
          targets: box, alpha: 0.2,
          duration: params.duration ?? 150, yoyo: true,
        });
        break;
      case 'textbox_fade_in':
        box.setAlpha(0);
        this.tweens.add({ targets: box, alpha: 1, duration: params.duration ?? 250 });
        break;
      case 'textbox_fade_out':
        this.tweens.add({ targets: box, alpha: 0, duration: params.duration ?? 250 });
        break;

      // ── all ───────────────────────────────────────────────────────
      case 'blackout':
        cam.fadeOut(params.duration ?? 500);
        break;
      case 'whiteout':
        cam.flash(params.duration ?? 300, 255, 255, 255);
        break;
      case 'scene_transition':
        cam.fadeOut(params.duration ?? 400);
        break;

      default:
        console.warn(`[DialogueScene] 알 수 없는 FX: ${key}`);
    }
  }
}
