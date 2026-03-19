// ================================================================
//  DialogueScene.js
//  경로: Games/Codes/Dialogues/DialogueScene.js
//
//  역할: 스토리 대화 이벤트 전용 씬 (스팀펑크 스타일)
//        — Textbox_001.png 이미지 기반 대화창
//        — 좌측 위 이름판 (이미지의 베이지 박스 위치에 맞춤)
//        — 대화 박스에 대화 메시지 출력
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
//    SaveManager.js   — getFlag
//    FontManager, scaledFontSize
//    Games/Assets/Sprites/Textbox_001.png
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
    // 대화창 이미지
    if (!this.textures.exists('textbox_001')) {
      this.load.image('textbox_001', 'Games/Assets/Sprites/Textbox_001.png');
    }

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
          if (!this.textures.exists(key)) {
            this.load.image(key, `Games/Assets/Sprites/${file}.png`);
          }
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
        if (!this.textures.exists(key)) {
          this.load.image(key, `Games/Assets/Sprites/${key}.png`);
        }
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

  // ── 오프닝 캐릭터 슬라이드업 ─────────────────────────────────
  _revealPortrait() {
    const line = this._lines && this._lines[0];
    if (!line || !line.char || line.char === 'P') return;
    const cast = CAST_DATA[line.char];
    if (!cast || cast.name === 'Player') return;
    const exprStr = line.expr ? String(line.expr).padStart(3, '0') : '001';
    const texKey  = `Character_${cast.name}_${exprStr}`;
    if (!this.textures.exists(texKey)) return;

    if (!this._charSprite) {
      this._charSprite = this.add.image(this._charX, this._charY, texKey);
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
  // ════════════════════════════════════════════════════════════════
  _buildScene(W, H) {
    const fs   = n => FontManager.adjustedSize(n, this.scale);
    const fsPx = n => parseInt(FontManager.adjustedSize(n, this.scale), 10);
    this._fs = fsPx;

    // ── 배경 ─────────────────────────────────────────────────
    this._buildBackground(W, H);

    // ── 대화창 크기 계산 (현재와 동일한 비율 유지) ───────────────
    // Textbox_001.png 원본 비율: 1400×800 (약 16:9 비율에서 세로 30% 영역)
    const BOX_W  = Math.round(W * 0.68);
    const BOX_H  = Math.round(H * 0.30);
    const BOX_X  = Math.round((W - BOX_W) / 2);
    const BOX_Y  = Math.round(H - BOX_H - H * 0.04);

    // 텍스트 영역 — 이미지 내부 여백 고려
    // 이미지: 상단 이름판 높이 약 11%, 하단 톱니 장식 약 13%
    // 실제 텍스트는 이름판 아래 ~ 하단 장식 위 구간
    const NAME_PANEL_H = Math.round(BOX_H * 0.16);  // 이름판 (이미지 좌상단 박스)
    const GEAR_H       = Math.round(BOX_H * 0.15);  // 하단 톱니 장식
    const SIDE_PAD     = Math.round(BOX_W * 0.045); // 좌우 내부 여백

    const TEXT_X = BOX_X + SIDE_PAD + Math.round(BOX_W * 0.02);
    const TEXT_Y = BOX_Y + NAME_PANEL_H + Math.round(fsPx(8));
    const TEXT_W = BOX_W - SIDE_PAD * 2 - Math.round(BOX_W * 0.04);
    const TEXT_BOTTOM = BOX_Y + BOX_H - GEAR_H - fsPx(6);

    this._layout = { BOX_W, BOX_H, BOX_X, BOX_Y, TEXT_X, TEXT_Y, TEXT_W, fs: fsPx };

    this._uiContainer = this.add.container(0, 0);
    this._buildBox(W, H, BOX_W, BOX_H, BOX_X, BOX_Y,
                   NAME_PANEL_H, TEXT_X, TEXT_Y, TEXT_W, TEXT_BOTTOM, fs, fsPx);
    this._buildCharacterSlot(W, H, BOX_X, BOX_Y, fsPx);
    this._choiceCont = this.add.container(0, 0);
    this.children.bringToTop(this._choiceCont);
  }

  // ── 대화창 박스 — Textbox_001.png 사용 ───────────────────────
  _buildBox(W, H, BOX_W, BOX_H, BOX_X, BOX_Y,
            NAME_PANEL_H, TEXT_X, TEXT_Y, TEXT_W, TEXT_BOTTOM, fs, fsPx) {

    // ── Textbox_001.png 이미지 배치 ───────────────────────────
    if (this.textures.exists('textbox_001')) {
      const texImg = this.add.image(BOX_X + BOX_W / 2, BOX_Y + BOX_H / 2, 'textbox_001')
        .setOrigin(0.5)
        .setDisplaySize(BOX_W, BOX_H);
      this._uiContainer.add(texImg);
    } else {
      // 텍스처 로드 실패 시 폴백 — 기존 코드 스타일 대화창
      const g = this.add.graphics();
      g.fillStyle(0x06090f, 0.92);
      g.fillRect(BOX_X, BOX_Y, BOX_W, BOX_H);
      g.lineStyle(2, 0x8a6020, 0.9);
      g.strokeRect(BOX_X, BOX_Y, BOX_W, BOX_H);
      this._uiContainer.add(g);
    }

    // ── 이름판 위치 계산 ──────────────────────────────────────
    // Textbox_001.png 에서 이름판은:
    //   X: 이미지 좌측에서 약 1% ~ 24%
    //   Y: 이미지 상단에서 약 -14% ~ 0% (이미지 위로 살짝 올라옴)
    // BOX 기준으로 계산:
    const NW = Math.round(BOX_W * 0.23);   // 이름판 너비 (이미지 비율 맞춤)
    const NH = Math.round(BOX_H * 0.20);   // 이름판 높이
    const NX = BOX_X + Math.round(BOX_W * 0.005);  // 이미지 좌측 여백
    // 이름판이 메인 박스 상단과 겹치는 위치 (이미지 구조상 메인 박스 상단에 붙어있음)
    const NY = BOX_Y - Math.round(NH * 0.55);  // 이미지의 이름판은 메인 박스 위로 살짝 올라옴

    // 이름 텍스트 (이름판 중앙)
    this._nameTxt = this.add.text(
      NX + NW / 2,
      NY + NH / 2,
      '', {
      fontSize:        fs(22),
      fill:            '#2a1505',       // 이름판이 베이지/황갈색이므로 어두운 갈색 텍스트
      fontFamily:      FontManager.TITLE,
      stroke:          '#c8a060',
      strokeThickness: 1,
    }).setOrigin(0.5).setVisible(false);
    this._uiContainer.add(this._nameTxt);

    // ── 본문 텍스트 ───────────────────────────────────────────
    // 텍스트가 하단 톱니 장식과 겹치지 않도록 wordWrap 높이 제한
    this._bodyTxt = this.add.text(
      TEXT_X, TEXT_Y, '', {
      fontSize:    fs(24),
      fill:        '#d8cbb8',
      fontFamily:  FontManager.BODY,
      wordWrap:    { width: TEXT_W },
      lineSpacing: fsPx(6),
    });
    this._uiContainer.add(this._bodyTxt);

    // ── ▶ 다음 줄 아이콘 ─────────────────────────────────────
    // 이미지 우측 하단 (톱니 장식 바로 위)
    const NEXT_X = BOX_X + BOX_W - Math.round(BOX_W * 0.045);
    const NEXT_Y = TEXT_BOTTOM - fsPx(2);

    this._nextIcon = this.add.text(
      NEXT_X, NEXT_Y,
      '▶', {
      fontSize:   fs(12),
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

    // 하단 힌트 텍스트
    const hint = this.add.text(
      BOX_X + BOX_W - Math.round(BOX_W * 0.045),
      BOX_Y + BOX_H + fsPx(4),
      'SPACE / CLICK', {
      fontSize:      fs(9),
      fill:          '#5a4a28',
      fontFamily:    FontManager.MONO,
      letterSpacing: 2,
    }).setOrigin(1, 0);
    this._uiContainer.add(hint);
  }

  // ── 배경 초기 빌드 ────────────────────────────────────────────
  _buildBackground(W, H) {
    this._bgW = W;
    this._bgH = H;

    this._bgFallback = this.add.graphics();
    this._bgFallback.fillStyle(0x080a0f, 1).fillRect(0, 0, W, H);
    this._bgGrid = this.add.graphics();
    this._bgGrid.lineStyle(1, 0x0d1018, 0.6);
    const step = Math.round(W / 52);
    for (let x = 0; x <= W; x += step) this._bgGrid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) this._bgGrid.lineBetween(0, y, W, y);

    this._bgSpriteCur  = null;
    this._bgSpriteNext = null;

    this._bgOverlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0);

    const firstBgTag = this._lines?.[0]?.bg;
    if (firstBgTag) {
      const texKey = this._resolvebgKey(firstBgTag);
      if (texKey && this.textures.exists(texKey)) {
        this._bgSpriteCur = this.add.image(W / 2, H / 2, texKey).setDisplaySize(W, H);
        this.children.moveBelow(this._bgSpriteCur, this._bgOverlay);
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
          targets: this._bgSpriteCur,
          alpha: 0, duration: 400,
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
        this[slot] = this.add.image(W / 2, H / 2, texKey).setDisplaySize(W, H).setAlpha(0).setVisible(false);
        this.children.moveBelow(this[slot], this._bgOverlay);
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
    this.children.moveBelow(next, this._bgOverlay);
    if (this._bgSpriteCur) this.children.moveBelow(this._bgSpriteCur, next);

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
  _buildCharacterSlot(W, H, BOX_X, BOX_Y, fs) {
    this._charH = Math.round(H * 0.75 * 0.85);
    this._charX = Math.round(W / 2);
    this._charY = BOX_Y - Math.round(this._charH / 2);
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

    // 이름판
    const isPlayer = (line.char === 'P');
    if (isPlayer) {
      this._nameTxt.setVisible(false);
    } else {
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
      this._pendingChoices = line.choices;
      this._waitingForChoice = true;
      this._typeText(line.text, () => {
        this._nextIcon.setVisible(true);
      });
    } else {
      this._typeText(line.text, () => {
        this._nextIcon.setVisible(true);
      });
    }
  }

  // ── 캐릭터 이미지 ─────────────────────────────────────────────
  _updatePortrait(charKey, expr) {
    if (!charKey || charKey === 'P') {
      if (this._charSprite) {
        this.tweens.add({ targets: this._charSprite, alpha: 0, duration: 200,
          onComplete: () => { if (this._charSprite) this._charSprite.setVisible(false); }
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
      this._charSprite = this.add.image(this._charX, this._charY, texKey);
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
  //  선택지 (스팀펑크 스타일 — 이미지 내부 영역 기준)
  // ════════════════════════════════════════════════════════════════
  _showChoices(choices) {
    if (!choices || !choices.length) { this._cursor++; this._showLine(); return; }

    const fsPx = this._fs;
    const fs   = n => FontManager.adjustedSize(n, this.scale);
    const { BOX_X, BOX_W, BOX_Y, BOX_H } = this._layout;

    // 선택지는 메인 박스 내부 텍스트 영역에 배치
    const NAME_PANEL_H = Math.round(BOX_H * 0.16);
    const GEAR_H       = Math.round(BOX_H * 0.15);
    const SIDE_PAD     = Math.round(BOX_W * 0.045);

    const BTN_H   = fsPx(40);
    const BTN_W   = Math.round(BOX_W * 0.80);
    const GAP     = fsPx(6);
    const innerH  = BOX_H - NAME_PANEL_H - GEAR_H - fsPx(10);
    const innerTop = BOX_Y + NAME_PANEL_H + fsPx(6);
    const totalH  = choices.length * BTN_H + (choices.length - 1) * GAP;
    const startX  = BOX_X + (BOX_W - BTN_W) / 2;
    const startY  = innerTop + (innerH - totalH) / 2;

    this._choiceCont.removeAll(true);
    this.children.bringToTop(this._choiceCont);

    choices.forEach((choice, i) => {
      const bx = startX;
      const by = startY + i * (BTN_H + GAP);

      const bg = this.add.graphics();

      const draw = hover => {
        bg.clear();
        bg.fillStyle(hover ? 0x1a1005 : 0x0e0a04, hover ? 0.92 : 0.85);
        bg.fillRect(bx, by, BTN_W, BTN_H);
        // 녹슨 테두리 느낌
        bg.lineStyle(1, hover ? 0xd4902a : 0x7a5018, 1.0);
        bg.strokeRect(bx, by, BTN_W, BTN_H);
        // 좌측 황금 강조선
        bg.fillStyle(hover ? 0xf0c040 : 0xa07020, 1.0);
        bg.fillRect(bx, by, 2, BTN_H);
      };
      draw(false);

      const marker = this.add.text(
        bx + fsPx(16), by + BTN_H / 2, '◆', {
        fontSize:   fs(11),
        fill:       '#8a6020',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0.5);

      const lbl = this.add.text(
        bx + fsPx(30), by + BTN_H / 2, choice.label, {
        fontSize:   fs(18),
        fill:       '#c8a858',
        fontFamily: FontManager.BODY,
        wordWrap:   { width: BTN_W - fsPx(40) },
        stroke:          '#080600',
        strokeThickness: 2,
      }).setOrigin(0, 0.5);

      const hit = this.add.rectangle(
        bx + BTN_W / 2, by + BTN_H / 2, BTN_W, BTN_H, 0, 0
      ).setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        draw(true);
        lbl.setStyle({ fill: '#f8e080', stroke: '#080600', strokeThickness: 2 });
        marker.setStyle({ fill: '#f0c040' });
        this.tweens.add({ targets: lbl, x: bx + fsPx(34), duration: 80, ease: 'Sine.easeOut' });
      });
      hit.on('pointerout', () => {
        draw(false);
        lbl.setStyle({ fill: '#c8a858', stroke: '#080600', strokeThickness: 2 });
        marker.setStyle({ fill: '#8a6020' });
        this.tweens.add({ targets: lbl, x: bx + fsPx(30), duration: 80, ease: 'Sine.easeOut' });
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

      const items = [bg, marker, lbl, hit];
      items.forEach(obj => obj.setAlpha(0));
      this.tweens.add({
        targets:  [bg, marker, lbl, hit],
        alpha:    1,
        duration: 300,
        delay:    i * 80,
        ease:     'Linear',
      });

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
