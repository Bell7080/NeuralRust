// ================================================================
//  DialogueScene.js
//  경로: Games/Codes/Dialogues/DialogueScene.js
//
//  역할: 스토리 대화 이벤트 전용 씬 (스팀펑크 스타일)
//        — Textbox_001.png : 메인 대화창
//        — Textbox_002.png : 이름창 (대화창 좌상단 오버레이)
//        — Textbox_003.png : 선택창 배경
//        — 배경: BG_DATA 태그 기반 동적 크로스페이드 전환
//        — 타자 방식 텍스트
//        — 선택지 버튼
//
//  호출:
//    this.scene.start('DialogueScene', {
//      eventId:  'Welcome',
//      next:     'AtelierScene',
//      nextData: { save: ... },
//    });
//
//  의존:
//    DialogueData.js  — DIALOGUE_DATA, CAST_DATA, BGM_DATA, SFX_DATA
//    StoryManager.js  — completeScene
//    SaveManager.js   — getFlag / setFlag
//    FontManager, scaledFontSize
//    Games/Assets/Sprites/Textbox_001.png  (메인 대화창)
//    Games/Assets/Sprites/Textbox_002.png  (이름창)
//    Games/Assets/Sprites/Textbox_003.png  (선택창)
// ================================================================

class DialogueScene extends Phaser.Scene {
  constructor() { super({ key: 'DialogueScene' }); }

  // ── init ──────────────────────────────────────────────────────
  init(data) {
    this._eventId  = data.eventId  || '';
    this._next     = data.next     || 'AtelierScene';
    this._nextData = data.nextData || {};
  }

  // ── preload ───────────────────────────────────────────────────
  preload() {
    // 대화창 이미지 3종
    if (!this.textures.exists('textbox_001'))
      this.load.image('textbox_001', 'Games/Assets/Sprites/Textbox_001.png');
    if (!this.textures.exists('textbox_002'))
      this.load.image('textbox_002', 'Games/Assets/Sprites/Textbox_002.png');
    if (!this.textures.exists('textbox_003'))
      this.load.image('textbox_003', 'Games/Assets/Sprites/Textbox_003.png');

    // 배경 이미지 — 이 이벤트에서 실제 사용된 bg 태그만 로드
    if (typeof BG_DATA !== 'undefined' && typeof DIALOGUE_DATA !== 'undefined') {
      const eventData = DIALOGUE_DATA[this._eventId];
      if (eventData) {
        const usedTags = new Set(
          eventData.lines.map(l => l.bg).filter(Boolean).map(b => {
            const colon = b.indexOf(':');
            return colon > 0 ? b.slice(colon + 1).trim() : b.trim();
          })
        );
        usedTags.forEach(tag => {
          if (tag === 'NONE') return;
          const file = BG_DATA[tag];
          if (!file) return;
          const key = `bg_${file}`;
          if (!this.textures.exists(key))
            this.load.image(key, `Games/Assets/Sprites/${file}.png`);
        });
      }
    }

    // 캐릭터 일러스트
    if (typeof CAST_DATA !== 'undefined' && typeof DIALOGUE_DATA !== 'undefined') {
      const toLoad = new Set();
      const eventData = DIALOGUE_DATA[this._eventId];
      if (eventData) {
        eventData.lines.forEach(line => {
          if (!line.char || line.char === 'P') return;
          const cast = CAST_DATA[line.char];
          if (!cast || cast.name === 'Player') return;
          const expr = line.expr ? String(line.expr).padStart(3, '0') : '001';
          toLoad.add(`Character_${cast.name}_${expr}`);
        });
      }
      toLoad.forEach(key => {
        if (!this.textures.exists(key))
          this.load.image(key, `Games/Assets/Sprites/${key}.png`);
      });
    }
  }

  // ── create ────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W;
    this.H = H;
    this._timers           = [];
    this._done             = false;
    this._typing           = false;
    this._inputLocked      = false;
    this._pendingText      = '';
    this._charSprite       = null;
    this._waitingForChoice = false;
    this._pendingChoices   = null;
    this._bgSpriteCur      = null;
    this._bgSpriteNext     = null;
    this._bgCurrentKey     = null;

    const eventData = DIALOGUE_DATA[this._eventId];
    if (!eventData || !eventData.lines.length) {
      console.warn('[DialogueScene] 이벤트 없음:', this._eventId);
      this._goNext();
      return;
    }

    this._lines   = eventData.lines;
    this._lineMap = eventData.lineMap || {};
    this._cursor  = 0;

    // BGM
    const bgmKey = BGM_DATA[this._eventId];
    if (bgmKey && typeof AudioManager !== 'undefined') AudioManager.playBGM(bgmKey);

    this._buildScene(W, H);

    // ── 오프닝 연출 ────────────────────────────────────────────
    this.cameras.main.fadeIn(700, 0, 0, 0);

    this._uiContainer.setAlpha(0);
    this.time.delayedCall(800, () => {
      this.tweens.add({
        targets:  this._uiContainer,
        alpha:    1,
        duration: 500,
        ease:     'Sine.easeOut',
      });
    });

    this.time.delayedCall(1400, () => {
      this._revealPortrait();
    });

    this.time.delayedCall(1900, () => {
      if (this._nameBox) {
        this._nameBox.setAlpha(0).setVisible(true);
        this.tweens.add({ targets: this._nameBox, alpha: 1, duration: 350, ease: 'Sine.easeOut' });
      }
      if (this._nameTxt) {
        this._nameTxt.setAlpha(0).setVisible(true);
        this.tweens.add({ targets: this._nameTxt, alpha: 1, duration: 350, ease: 'Sine.easeOut' });
      }
    });

    this.time.delayedCall(2200, () => {
      this._buildInput();
      this._showLine();
    });
  }

  // ── 오프닝 캐릭터 페이드인 ────────────────────────────────────
  _revealPortrait() {
    const line = this._lines && this._lines[0];
    if (!line || !line.char || line.char === 'P') return;
    const cast = CAST_DATA[line.char];
    if (!cast || cast.name === 'Player') return;
    const exprStr = line.expr ? String(line.expr).padStart(3, '0') : '001';
    const texKey  = `Character_${cast.name}_${exprStr}`;
    if (!this.textures.exists(texKey)) return;

    if (!this._charSprite) {
      this._charSprite = this.add.image(this._charX, this._charY, texKey)
        .setDepth(5);
      const scale = this._charH / this._charSprite.height;
      this._charSprite.setScale(scale).setAlpha(0);
    } else {
      this._charSprite.setPosition(this._charX, this._charY).setAlpha(0);
    }
    this.tweens.add({
      targets:  this._charSprite,
      alpha:    1,
      duration: 800,
      ease:     'Linear',
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  씬 빌드
  //
  //  레이어 순서 (depth)
  //    배경(BG)           0
  //    BG 오버레이        1
  //    캐릭터             5
  //    메인 대화창(001)   10
  //    이름창(002)        11
  //    UI 텍스트          12
  //    선택창(003)        13
  //    선택지 버튼        14
  // ════════════════════════════════════════════════════════════════
  _buildScene(W, H) {
    const fs   = n => FontManager.adjustedSize(n, this.scale);
    const fsPx = n => parseInt(FontManager.adjustedSize(n, this.scale), 10);
    this._fs = fsPx;

    this._buildBackground(W, H);

    // ── 메인 대화창(001) 크기 결정 ───────────────────────────
    // Textbox_001.png 원본 비율: 약 1516 x 430 (가로로 납작한 형태)
    // 화면 너비의 63% 사용 (기존 90%에서 30% 축소), 높이는 원본 비율 유지
    const BOX_W = Math.round(W * 0.63);
    const BOX_H = Math.round(BOX_W * (430 / 1516));
    const BOX_X = Math.round((W - BOX_W) / 2);
    // 대화창 상단 Y — 화면 하단에서 BOX_H + 여백
    const BOX_Y = Math.round(H - BOX_H - H * 0.04);

    // ── 텍스트 내부 영역 (대화창 내부 여백 기반) ─────────────
    const PAD_X  = Math.round(BOX_W * 0.05);
    const PAD_T  = Math.round(BOX_H * 0.18);
    const PAD_B  = Math.round(BOX_H * 0.12);
    const TEXT_X      = BOX_X + PAD_X;
    const TEXT_Y      = BOX_Y + PAD_T;
    const TEXT_W      = BOX_W - PAD_X * 2;
    const TEXT_BOTTOM = BOX_Y + BOX_H - PAD_B;

    // ── 이름창(002) 크기 결정 ────────────────────────────────
    // Textbox_002.png 원본 비율: 약 447 x 210
    // 대화창이 줄었으므로 비율을 0.28로 약간 보정해 이름창 크기 유지
    const NAME_W = Math.round(BOX_W * 0.28);
    const NAME_H = Math.round(NAME_W * (210 / 447));
    // 대화창 좌상단, 약간 위로 튀어나오게 + 미세한 삐걱 오프셋
    const NAME_X = BOX_X + Math.round(BOX_W * 0.01);
    const NAME_Y = BOX_Y - Math.round(NAME_H * 0.60);

    this._layout = { BOX_W, BOX_H, BOX_X, BOX_Y, TEXT_X, TEXT_Y, TEXT_W, TEXT_BOTTOM, NAME_W, NAME_H, NAME_X, NAME_Y, fs: fsPx };

    // ── 캐릭터 슬롯 (메인 대화창 상단과 발끝 정렬) ───────────
    this._buildCharacterSlot(W, H, BOX_Y);

    // ── UI 컨테이너 (텍스트/아이콘용) ────────────────────────
    this._uiContainer = this.add.container(0, 0).setDepth(12);

    // ── 메인 대화창 이미지 배치 ───────────────────────────────
    this._buildMainBox(BOX_X, BOX_Y, BOX_W, BOX_H, TEXT_X, TEXT_Y, TEXT_W, TEXT_BOTTOM, fs, fsPx);

    // ── 이름창 이미지 배치 ────────────────────────────────────
    this._buildNameBox(NAME_X, NAME_Y, NAME_W, NAME_H);

    // ── 선택지 컨테이너 ──────────────────────────────────────
    this._choiceCont = this.add.container(0, 0).setDepth(14);
  }

  // ── 메인 대화창 (Textbox_001.png) ────────────────────────────
  _buildMainBox(BOX_X, BOX_Y, BOX_W, BOX_H, TEXT_X, TEXT_Y, TEXT_W, TEXT_BOTTOM, fs, fsPx) {
    if (this.textures.exists('textbox_001')) {
      this.add.image(BOX_X, BOX_Y, 'textbox_001')
        .setOrigin(0, 0)
        .setDisplaySize(BOX_W, BOX_H)
        .setDepth(10);
    }

    // ── 본문 텍스트 ───────────────────────────────────────────
    this._bodyTxt = this.add.text(TEXT_X, TEXT_Y, '', {
      fontSize:    fs(22),
      fill:        '#d8cbb8',
      fontFamily:  FontManager.BODY,
      wordWrap:    { width: TEXT_W },
      lineSpacing: fsPx(5),
    });
    this._uiContainer.add(this._bodyTxt);

    // ── ▶ 다음 줄 아이콘 (텍스트 영역 우하단) ────────────────
    const NEXT_X = TEXT_X + TEXT_W;
    const NEXT_Y = TEXT_BOTTOM - fsPx(10);

    this._nextIcon = this.add.text(NEXT_X, NEXT_Y, '▶', {
      fontSize:   fs(11),
      fill:       '#c89040',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 1).setVisible(false);
    this._uiContainer.add(this._nextIcon);

    this.tweens.add({
      targets:  this._nextIcon,
      alpha:    { from: 0.3, to: 1.0 },
      x:        { from: NEXT_X - 3, to: NEXT_X },
      duration: 550,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // ── 하단 힌트 텍스트 ──────────────────────────────────────
    const hint = this.add.text(NEXT_X, BOX_Y + BOX_H + fsPx(3), 'SPACE / CLICK', {
      fontSize:      fs(9),
      fill:          '#5a4a28',
      fontFamily:    FontManager.MONO,
      letterSpacing: 2,
    }).setOrigin(1, 0);
    this._uiContainer.add(hint);
  }

  // ── 이름창 (Textbox_002.png) ──────────────────────────────────
  //  -3도 기울여 대화창에 삐걱 박힌 느낌 연출
  _buildNameBox(NAME_X, NAME_Y, NAME_W, NAME_H) {
    const NAME_TILT = -3;   // 도(degree) — 반시계 방향으로 살짝 기울임
    const cx = NAME_X + NAME_W / 2;
    const cy = NAME_Y + NAME_H / 2;

    // 이름창 이미지 — 중심점 기준 회전
    this._nameBox = this.textures.exists('textbox_002')
      ? this.add.image(cx, cy, 'textbox_002')
          .setOrigin(0.5, 0.5)
          .setDisplaySize(NAME_W, NAME_H)
          .setAngle(NAME_TILT)
          .setDepth(11)
          .setVisible(false)
      : null;

    // 이름 텍스트 — 이미지와 동일한 각도로 함께 기울임
    const nameFontPx = Math.round(NAME_H * 0.42);
    this._nameTxt = this.add.text(cx, cy, '', {
      fontSize:        `${nameFontPx}px`,
      fill:            '#c8a85a',
      fontFamily:      FontManager.TITLE,
      stroke:          '#1a0e04',
      strokeThickness: 3,
    }).setOrigin(0.5).setAngle(NAME_TILT).setDepth(12).setVisible(false);
  }

  // ── 배경 초기 빌드 ────────────────────────────────────────────
  _buildBackground(W, H) {
    this._bgW = W;
    this._bgH = H;

    this._bgFallback = this.add.graphics().setDepth(0);
    this._bgFallback.fillStyle(0x080a0f, 1).fillRect(0, 0, W, H);
    this._bgGrid = this.add.graphics().setDepth(0);
    this._bgGrid.lineStyle(1, 0x0d1018, 0.6);
    const step = Math.round(W / 52);
    for (let x = 0; x <= W; x += step) this._bgGrid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) this._bgGrid.lineBetween(0, y, W, y);

    this._bgSpriteCur  = null;
    this._bgSpriteNext = null;

    this._bgOverlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setDepth(1);

    const firstBgTag = this._lines?.[0]?.bg;
    if (firstBgTag) {
      const texKey = this._resolvebgKey(firstBgTag);
      if (texKey && this.textures.exists(texKey)) {
        this._bgSpriteCur = this.add.image(W / 2, H / 2, texKey)
          .setDisplaySize(W, H).setDepth(0);
        this._bgGrid.setVisible(false);
        this._bgFallback.setVisible(false);
        this._bgCurrentKey = texKey;
      }
    }
  }

  // ── 배경 전환 ─────────────────────────────────────────────────
  _changeBg(bgTag, mode = 'crossfade') {
    const W = this._bgW, H = this._bgH;

    if (bgTag === 'NONE') {
      if (this._bgSpriteCur) {
        this.tweens.add({
          targets: this._bgSpriteCur, alpha: 0, duration: 400,
          onComplete: () => {
            this._bgSpriteCur.setVisible(false);
            this._bgGrid.setVisible(true);
            this._bgFallback.setVisible(true);
            this._bgCurrentKey = null;
          },
        });
      }
      return;
    }

    const texKey = this._resolvebgKey(bgTag);
    if (!texKey || !this.textures.exists(texKey)) return;
    if (texKey === this._bgCurrentKey) return;

    const ensureSprite = (slot) => {
      if (!this[slot]) {
        this[slot] = this.add.image(W / 2, H / 2, texKey)
          .setDisplaySize(W, H).setAlpha(0).setVisible(false).setDepth(0);
      }
      return this[slot];
    };

    if (mode === 'instant') {
      const spr = ensureSprite('_bgSpriteCur');
      spr.setTexture(texKey).setAlpha(1).setVisible(true);
      this._bgGrid.setVisible(false);
      this._bgFallback.setVisible(false);
      this._bgCurrentKey = texKey;
      return;
    }

    if (mode === 'fade_black') {
      this.tweens.add({
        targets: this._bgOverlay, alpha: 1, duration: 250,
        onComplete: () => {
          const spr = ensureSprite('_bgSpriteCur');
          spr.setTexture(texKey).setAlpha(1).setVisible(true);
          this._bgGrid.setVisible(false);
          this._bgFallback.setVisible(false);
          this._bgCurrentKey = texKey;
          this.tweens.add({ targets: this._bgOverlay, alpha: 0.55, duration: 300 });
        },
      });
      return;
    }

    // crossfade
    const next = ensureSprite('_bgSpriteNext');
    next.setTexture(texKey).setAlpha(0).setVisible(true);
    if (this._bgSpriteCur) this._bgSpriteCur.setDepth(0);
    next.setDepth(0);

    this.tweens.add({
      targets: next, alpha: 1, duration: 500, ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this._bgSpriteCur) this._bgSpriteCur.setAlpha(0).setVisible(false);
        [this._bgSpriteCur, this._bgSpriteNext] = [next, this._bgSpriteCur];
        this._bgCurrentKey = texKey;
        this._bgGrid.setVisible(false);
        this._bgFallback.setVisible(false);
      },
    });
  }

  _resolvebgKey(bgTag) {
    if (!bgTag || bgTag === 'NONE') return null;
    const file = (typeof BG_DATA !== 'undefined') ? BG_DATA[bgTag] : null;
    if (!file) return null;
    return `bg_${file}`;
  }

  // ── 캐릭터 슬롯 ───────────────────────────────────────────────
  //  발끝(charFootY) = BOX_Y (메인 대화창 상단) 와 정확히 일치
  //  +10px 하향 오프셋 적용
  _buildCharacterSlot(W, H, BOX_Y) {
    const FOOT_OFFSET = 10;
    const charFootY   = BOX_Y + FOOT_OFFSET;

    // 캐릭터 높이 = 발끝까지의 공간을 최대한 활용 (92%)
    this._charH = Math.round(charFootY * 0.92);
    this._charX = Math.round(W / 2);
    this._charY = charFootY - Math.round(this._charH / 2);
  }

  // ── 캐릭터 이미지 ─────────────────────────────────────────────
  _updatePortrait(charKey, expr) {
    if (!charKey || charKey === 'P') {
      if (this._charSprite) {
        this.tweens.add({
          targets: this._charSprite, alpha: 0, duration: 200,
          onComplete: () => { if (this._charSprite) this._charSprite.setVisible(false); },
        });
      }
      return;
    }

    const cast = CAST_DATA[charKey];
    if (!cast || cast.name === 'Player') return;

    const exprStr = expr ? String(expr).padStart(3, '0') : '001';
    const texKey  = `Character_${cast.name}_${exprStr}`;
    if (!this.textures.exists(texKey)) return;

    if (!this._charSprite) {
      this._charSprite = this.add.image(this._charX, this._charY, texKey).setDepth(5);
      const scale = this._charH / this._charSprite.height;
      this._charSprite.setScale(scale).setAlpha(0);
      this.tweens.add({ targets: this._charSprite, alpha: 1, duration: 250 });
    } else {
      if (this._charSprite.texture.key !== texKey) {
        this._charSprite.setTexture(texKey);
        const scale = this._charH / this._charSprite.height;
        this._charSprite.setScale(scale).setVisible(true);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  타이핑
  // ════════════════════════════════════════════════════════════════
  _typeText(fullText, onDone) {
    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._timers = [];
    this._typing      = true;
    this._pendingText = fullText;
    this._bodyTxt.setText('');

    const chars = [...fullText];
    let i = 0;
    const tick = () => {
      if (!this.scene || !this.scene.isActive()) return;
      if (i < chars.length) {
        i++;
        this._bodyTxt.setText(chars.slice(0, i).join(''));
        this._timers.push(this.time.delayedCall(28, tick));
      } else {
        this._typing = false;
        this._bodyTxt.setText(fullText);
        if (onDone) onDone();
      }
    };
    this._timers.push(this.time.delayedCall(28, tick));
  }

  _skipType() {
    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._timers = [];
    this._typing = false;
    this._bodyTxt.setText(this._pendingText);
    this._nextIcon.setVisible(true);
    this._inputLocked = true;
    this.time.delayedCall(100, () => { this._inputLocked = false; });
  }

  // ════════════════════════════════════════════════════════════════
  //  선택지 — Textbox_003.png 배경 이미지 사용
  // ════════════════════════════════════════════════════════════════
  _showChoices(choices) {
    if (!choices || !choices.length) { this._cursor++; this._showLine(); return; }

    const fsPx = this._fs;
    const fs   = n => FontManager.adjustedSize(n, this.scale);
    const { BOX_X, BOX_W, BOX_Y, TEXT_X, TEXT_W } = this._layout;

    // ── Textbox_003.png 비율 (가로로 매우 납작) ─────────────
    // 원본 약 1516 x 170 → 대화창 너비와 동일하게, 높이는 비율 유지
    const CHOICE_IMG_W = BOX_W;
    const CHOICE_IMG_H = Math.round(CHOICE_IMG_W * (170 / 1516));

    const BTN_H  = Math.round(CHOICE_IMG_H * 0.72);   // 이미지 높이의 내부 영역
    const BTN_W  = Math.round(TEXT_W * 0.92);
    const GAP    = fsPx(8);
    const totalH = choices.length * CHOICE_IMG_H + (choices.length - 1) * GAP;

    // 대화창 바로 위에 선택지 쌓기
    const STACK_BOTTOM = BOX_Y - fsPx(10);
    const startY       = STACK_BOTTOM - totalH;
    const imgX         = BOX_X;

    this._choiceCont.removeAll(true);

    choices.forEach((choice, i) => {
      const imgY = startY + i * (CHOICE_IMG_H + GAP);
      const bx   = TEXT_X + (TEXT_W - BTN_W) / 2;
      const by   = imgY + (CHOICE_IMG_H - BTN_H) / 2;

      // 선택창 배경 이미지
      const bgImg = this.textures.exists('textbox_003')
        ? this.add.image(imgX, imgY, 'textbox_003')
            .setOrigin(0, 0)
            .setDisplaySize(CHOICE_IMG_W, CHOICE_IMG_H)
            .setAlpha(0)
        : null;

      // 호버 오버레이 (이미지 위에 얇게)
      const overlay = this.add.rectangle(
        imgX + CHOICE_IMG_W / 2, imgY + CHOICE_IMG_H / 2,
        CHOICE_IMG_W, CHOICE_IMG_H,
        0xf0c040, 0
      );

      // ◆ 마커
      const marker = this.add.text(
        bx + fsPx(16), by + BTN_H / 2, '◆', {
        fontSize:   fs(11),
        fill:       '#8a6020',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0.5).setAlpha(0);

      // 선택지 레이블
      const lbl = this.add.text(
        bx + fsPx(32), by + BTN_H / 2, choice.label, {
        fontSize:   fs(18),
        fill:       '#c8a858',
        fontFamily: FontManager.BODY,
        wordWrap:   { width: BTN_W - fsPx(48) },
        stroke:          '#080600',
        strokeThickness: 2,
      }).setOrigin(0, 0.5).setAlpha(0);

      // 히트 영역
      const hit = this.add.rectangle(
        imgX + CHOICE_IMG_W / 2, imgY + CHOICE_IMG_H / 2,
        CHOICE_IMG_W, CHOICE_IMG_H, 0, 0
      ).setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        overlay.setFillStyle(0xf0c040, 0.08);
        lbl.setStyle({ fill: '#f8e080', stroke: '#080600', strokeThickness: 2 });
        marker.setStyle({ fill: '#f0c040' });
        this.tweens.add({ targets: lbl, x: bx + fsPx(36), duration: 80, ease: 'Sine.easeOut' });
      });
      hit.on('pointerout', () => {
        overlay.setFillStyle(0xf0c040, 0);
        lbl.setStyle({ fill: '#c8a858', stroke: '#080600', strokeThickness: 2 });
        marker.setStyle({ fill: '#8a6020' });
        this.tweens.add({ targets: lbl, x: bx + fsPx(32), duration: 80, ease: 'Sine.easeOut' });
      });
      hit.on('pointerdown', () => {
        this._choiceCont.removeAll(true);
        if (choice.gotoIdx != null) {
          this._cursor = choice.gotoIdx;
        } else if (choice.goto && this._lineMap[choice.goto] != null) {
          this._cursor = this._lineMap[choice.goto];
        } else {
          this._cursor++;
        }
        this._showLine();
      });

      // 페이드인 애니메이션
      const fadeTargets = [marker, lbl];
      if (bgImg) fadeTargets.unshift(bgImg);
      fadeTargets.forEach(obj => obj.setAlpha(0));
      this.tweens.add({
        targets:  fadeTargets,
        alpha:    1,
        duration: 300,
        delay:    i * 80,
        ease:     'Linear',
      });

      const items = bgImg
        ? [bgImg, overlay, marker, lbl, hit]
        : [overlay, marker, lbl, hit];
      this._choiceCont.add(items);
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  FX
  // ════════════════════════════════════════════════════════════════
  _playFx(fxStr) {
    fxStr.split('|').forEach(part => {
      const [name, paramStr] = part.trim().split(':');
      const p = {};
      if (paramStr) paramStr.split(',').forEach(kv => {
        const [k, v] = kv.split('=');
        p[k.trim()] = isNaN(v) ? v.trim() : Number(v);
      });
      switch (name.trim()) {
        case 'shake_screen': this.cameras.main.shake(p.duration || 300, (p.intensity || 3) / 1000); break;
        case 'flash_screen': this.cameras.main.flash(p.duration || 200, 255, 255, 255); break;
        case 'fade_out':     this.cameras.main.fadeOut(p.duration || 400, 0, 0, 0); break;
        case 'fade_in':      this.cameras.main.fadeIn(p.duration  || 400, 0, 0, 0); break;
        case 'zoom_in':      this.cameras.main.zoomTo(p.zoom || 1.2, p.duration || 300); break;
        case 'zoom_out':     this.cameras.main.zoomTo(p.zoom || 1.0, p.duration || 300); break;
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  닉네임 해석
  // ════════════════════════════════════════════════════════════════
  _getDisplayName(charKey) {
    if (!charKey) return '';
    const runtime = SaveManager.getFlag('cast_nick_' + charKey);
    if (runtime && typeof runtime === 'string') return runtime;
    const cast = CAST_DATA[charKey];
    if (!cast) return charKey;
    return cast.nickname || cast.name || charKey;
  }

  // ════════════════════════════════════════════════════════════════
  //  입력
  // ════════════════════════════════════════════════════════════════
  _buildInput() {
    this.input.on('pointerdown', this._onAdvance, this);
    this.input.keyboard.on('keydown-SPACE', this._onAdvance, this);
    this.input.keyboard.on('keydown-ENTER', this._onAdvance, this);
  }

  _removeInput() {
    this.input.off('pointerdown', this._onAdvance, this);
    this.input.keyboard.off('keydown-SPACE', this._onAdvance, this);
    this.input.keyboard.off('keydown-ENTER', this._onAdvance, this);
  }

  _onAdvance() {
    if (this._done) return;
    const line = this._lines[this._cursor];
    if (line && line.isChoice && !this._waitingForChoice) return;

    if (this._typing) { this._skipType(); return; }
    if (this._inputLocked) return;

    if (this._waitingForChoice) {
      this._waitingForChoice = false;
      this._nextIcon.setVisible(false);
      const choices = this._pendingChoices;
      this.tweens.add({
        targets:  this._bodyTxt,
        alpha:    0,
        duration: 250,
        ease:     'Sine.easeIn',
        onComplete: () => {
          this._bodyTxt.setText('').setAlpha(1);
          this._showChoices(choices);
        },
      });
      return;
    }

    this._cursor++;
    this._showLine();
  }

  // ════════════════════════════════════════════════════════════════
  //  라인 표시
  // ════════════════════════════════════════════════════════════════
  _showLine() {
    if (this._cursor >= this._lines.length) {
      this._finish();
      return;
    }

    const line = this._lines[this._cursor];

    // 이름판 표시/숨김
    const isPlayer = (line.char === 'P');
    if (isPlayer) {
      if (this._nameBox) this._nameBox.setVisible(false);
      this._nameTxt.setVisible(false);
    } else {
      if (this._nameBox) this._nameBox.setVisible(true);
      this._nameTxt.setText(this._getDisplayName(line.char)).setVisible(true);
    }

    // 캐릭터 이미지
    this._updatePortrait(line.char, line.expr);

    // 배경 전환
    if (line.bg) {
      const colonIdx = line.bg.indexOf(':');
      if (colonIdx > 0) {
        const mode = line.bg.slice(0, colonIdx).trim();
        const tag  = line.bg.slice(colonIdx + 1).trim();
        this._changeBg(tag, mode);
      } else {
        this._changeBg(line.bg);
      }
    }

    // SFX
    if (line.sfx && typeof AudioManager !== 'undefined') {
      line.sfx.split('|').forEach(alias => {
        const f = SFX_DATA[alias.trim()];
        if (f) AudioManager.playSFX(f);
      });
    }

    // FX
    if (line.fx) this._playFx(line.fx);

    // flag_set
    if (line.flag_set) SaveManager.setFlag(line.flag_set, true);

    this._choiceCont.removeAll(true);
    this._nextIcon.setVisible(false);

    if (line.isChoice) {
      this._pendingChoices   = line.choices;
      this._waitingForChoice = true;
      this._typeText(line.text, () => { this._nextIcon.setVisible(true); });
    } else {
      this._typeText(line.text, () => { this._nextIcon.setVisible(true); });
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  완료
  // ════════════════════════════════════════════════════════════════
  _finish() {
    if (this._done) return;
    this._done = true;
    this._removeInput();
    StoryManager.completeScene(this._eventId);
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this._goNext());
  }

  _goNext() {
    this.scene.start(this._next, this._nextData);
  }

  shutdown() {
    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._timers = [];
  }
}
