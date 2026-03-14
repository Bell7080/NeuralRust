// ================================================================
//  DialogueScene.js
//  경로: Games/Codes/Dialogues/DialogueScene.js
//
//  역할: 스토리 대화 이벤트 전용 씬 (스팀펑크 스타일)
//        — 화면 중앙 하단 컴팩트 대화창
//        — 좌측 캐릭터 일러스트 (Character_[name]_[expr].png)
//        — 배경: BG_DATA 태그 기반 동적 크로스페이드 전환
//          (기존 하드코딩 Background_003.png → xlsx BG 탭으로 관리)
//        — 이름판은 대화창 상단 좌측
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
    // 배경 이미지 — 이 이벤트에서 실제 사용된 bg 태그만 로드 (404 방지)
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

    // 캐릭터 일러스트 — CAST_DATA 기준으로 전부 시도
    // 텍스처 키: Character_Noa_001 ~ 003
    // 캐릭터 — 이 이벤트에서 실제 사용된 expr만 로드 (404 방지)
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
    this._bgSpriteCur      = null;   // 현재 배경 스프라이트
    this._bgSpriteNext     = null;   // 크로스페이드 중 새 배경
    this._bgCurrentKey     = null;   // 현재 배경 텍스처 키

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

    // ── 오프닝 연출 시퀀스 ────────────────────────────────────
    // 1) 카메라 페이드인 (어둠 → 배경)
    this.cameras.main.fadeIn(700, 0, 0, 0);

    // 2) 대화창 페이드인
    this._uiContainer.setAlpha(0);
    this.time.delayedCall(800, () => {
      this.tweens.add({
        targets:  this._uiContainer,
        alpha:    1,
        duration: 500,
        ease:     'Sine.easeOut',
      });
    });

    // 3) 캐릭터 슬라이드업 + 페이드인
    this.time.delayedCall(1400, () => {
      this._revealPortrait();
    });

    // 4) 이름판 페이드인
    this.time.delayedCall(1900, () => {
      if (this._nameTxt) {
        this._nameTxt.setAlpha(0).setVisible(true);
        this.tweens.add({ targets: this._nameTxt, alpha: 1, duration: 350, ease: 'Sine.easeOut' });
      }
    });

    // 5) 대화 타이핑 시작 + 입력 등록 (연출 완료 후 동시에)
    this.time.delayedCall(2200, () => {
      this._buildInput();
      this._showLine();
    });
  }

  // ── 오프닝 전용: 캐릭터 슬라이드업 연출 ──────────────────────
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
    // fs(n)   → "Npx" 문자열 (fontSize 프로퍼티에 직접 사용)
    // fsPx(n) → 정수 픽셀  (위치·크기 계산에 사용)
    const fs   = n => scaledFontSize(n, this.scale);
    const fsPx = n => parseInt(scaledFontSize(n, this.scale), 10);
    this._fs = fsPx;   // 외부 메서드(_showLine 등)에서 정수가 필요할 때

    // ── 배경 ──────────────────────────────────────────────────
    this._buildBackground(W, H);

    // ── 치수 ─────────────────────────────────────────────────
    const BOX_W  = Math.round(W * 0.68);
    const BOX_H  = Math.round(H * 0.30);
    const BOX_X  = Math.round((W - BOX_W) / 2);
    const BOX_Y  = Math.round(H - BOX_H - H * 0.04);
    const PAD    = fsPx(18);
    const TEXT_X = BOX_X + PAD;
    const TEXT_Y = BOX_Y + PAD + fsPx(10);
    const TEXT_W = BOX_W - PAD * 2;

    this._layout = { BOX_W, BOX_H, BOX_X, BOX_Y, PAD, TEXT_X, TEXT_Y, TEXT_W, fs: fsPx };

    this._uiContainer = this.add.container(0, 0);
    this._buildBox(W, H, BOX_W, BOX_H, BOX_X, BOX_Y, PAD, TEXT_X, TEXT_Y, TEXT_W, fs, fsPx);
    this._buildCharacterSlot(W, H, BOX_X, BOX_Y, fsPx);
    this._choiceCont = this.add.container(0, 0);
    this.children.bringToTop(this._choiceCont);
  }

  // ── 대화창 박스 (스팀펑크) ────────────────────────────────────
  // ✏️ fs  = "Npx" 문자열 (fontSize에 직접 사용)
  //    fsPx = 정수 픽셀  (위치·크기 계산)
  _buildBox(W, H, BOX_W, BOX_H, BOX_X, BOX_Y, PAD, TEXT_X, TEXT_Y, TEXT_W, fs, fsPx) {
    const g = this.add.graphics();
    this._uiContainer.add(g);

    // ── 메인 패널 ─────────────────────────────────────────────
    g.fillStyle(0x06090f, 0.92);
    g.fillRect(BOX_X, BOX_Y, BOX_W, BOX_H);

    // 외곽 테두리 — 이중선
    g.lineStyle(2, 0x8a6020, 0.9);
    g.strokeRect(BOX_X, BOX_Y, BOX_W, BOX_H);
    g.lineStyle(1, 0xc89040, 0.35);
    g.strokeRect(BOX_X + 3, BOX_Y + 3, BOX_W - 6, BOX_H - 6);

    // 상단 구분선 (이름판 아래)
    const lineY = BOX_Y + fsPx(46);
    g.lineStyle(1, 0x8a6020, 0.6);
    g.lineBetween(BOX_X + PAD, lineY, BOX_X + BOX_W - PAD, lineY);
    g.lineStyle(1, 0xc89040, 0.2);
    g.lineBetween(BOX_X + PAD, lineY + 2, BOX_X + BOX_W - PAD, lineY + 2);

    // 코너 장식 (리벳)
    const corners = [
      [BOX_X + 6,         BOX_Y + 6],
      [BOX_X + BOX_W - 6, BOX_Y + 6],
      [BOX_X + 6,         BOX_Y + BOX_H - 6],
      [BOX_X + BOX_W - 6, BOX_Y + BOX_H - 6],
    ];
    corners.forEach(([cx, cy]) => {
      g.fillStyle(0xc89040, 0.7);
      g.fillCircle(cx, cy, 3);
      g.lineStyle(1, 0x8a6020, 0.5);
      g.strokeCircle(cx, cy, 5);
    });

    // 좌우 장식선
    g.lineStyle(2, 0xc89040, 0.5);
    g.lineBetween(BOX_X + 8,         BOX_Y + 18, BOX_X + 8,         BOX_Y + BOX_H - 18);
    g.lineBetween(BOX_X + BOX_W - 8, BOX_Y + 18, BOX_X + BOX_W - 8, BOX_Y + BOX_H - 18);

    // 하단 중앙 기어 장식
    const midX = BOX_X + BOX_W / 2;
    g.lineStyle(1, 0x8a6020, 0.4);
    g.lineBetween(midX - 30, BOX_Y + BOX_H - 4, midX + 30, BOX_Y + BOX_H - 4);
    g.fillStyle(0xc89040, 0.5);
    g.fillCircle(midX, BOX_Y + BOX_H - 4, 3);

    // ── 이름판 ────────────────────────────────────────────────
    const NW = Math.round(BOX_W * 0.35);
    const NH = fsPx(42);
    const NX = BOX_X;
    const NY = BOX_Y - NH + 1;

    const ng = this.add.graphics();
    this._uiContainer.add(ng);
    ng.fillStyle(0x0a0d16, 0.97);
    ng.fillRect(NX, NY, NW, NH);
    ng.lineStyle(2, 0x8a6020, 0.9);
    ng.strokeRect(NX, NY, NW, NH);
    ng.lineStyle(1, 0xc89040, 0.3);
    ng.strokeRect(NX + 2, NY + 2, NW - 4, NH - 4);
    ng.lineStyle(3, 0xc89040, 0.8);
    ng.lineBetween(NX, NY + 2, NX, NY + NH - 2);
    ng.fillStyle(0xc89040, 0.6);
    ng.fillRect(NX + NW - 6, NY + NH - 2, 6, 2);

    this._nameTxt = this.add.text(
      NX + NW / 2, NY + NH / 2, '', {
      fontSize:        fs(26),         // ✏️ "26px" 직접 — pxpx 버그 수정
      fill:            '#e8c87a',
      fontFamily:      FontManager.TITLE,
      stroke:          '#050810',
      strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false);
    this._uiContainer.add(this._nameTxt);

    // ── 본문 텍스트 ───────────────────────────────────────────
    this._bodyTxt = this.add.text(
      TEXT_X, TEXT_Y + fsPx(28), '', {
      fontSize:    fs(26),             // ✏️ pxpx 버그 수정
      fill:        '#d8cbb8',
      fontFamily:  FontManager.BODY,
      wordWrap:    { width: TEXT_W },
      lineSpacing: fsPx(8),
    });
    this._uiContainer.add(this._bodyTxt);

    // ── ▶ 다음 줄 아이콘 ─────────────────────────────────────
    this._nextIcon = this.add.text(
      BOX_X + BOX_W - PAD,
      BOX_Y + BOX_H - fsPx(14),
      '▶', {
      fontSize:   fs(12),              // ✏️ pxpx 버그 수정 + 11→12
      fill:       '#c89040',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5).setVisible(false);
    this._uiContainer.add(this._nextIcon);

    this.tweens.add({
      targets:  this._nextIcon,
      alpha:    { from: 0.3, to: 1.0 },
      x:        { from: BOX_X + BOX_W - PAD - 3, to: BOX_X + BOX_W - PAD },
      duration: 550,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // 하단 힌트
    const hint = this.add.text(
      BOX_X + BOX_W - PAD,
      BOX_Y + BOX_H + fsPx(4),
      'SPACE / CLICK', {
      fontSize:      fs(9),            // ✏️ pxpx 버그 수정 + 7→9
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

    // 폴백 배경 (항상 맨 아래)
    this._bgFallback = this.add.graphics();
    this._bgFallback.fillStyle(0x080a0f, 1).fillRect(0, 0, W, H);
    this._bgGrid = this.add.graphics();
    this._bgGrid.lineStyle(1, 0x0d1018, 0.6);
    const step = Math.round(W / 52);
    for (let x = 0; x <= W; x += step) this._bgGrid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) this._bgGrid.lineBetween(0, y, W, y);

    // 배경 이미지 슬롯 — 처음 사용 시 생성 (null 상태로 시작)
    this._bgSpriteCur  = null;
    this._bgSpriteNext = null;

    // 공통 어두운 오버레이 — 배경 위, 캐릭터/UI 아래
    this._bgOverlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0);

    // 첫 라인 bg 태그로 즉시 초기 배경 설정
    const firstBgTag = this._lines?.[0]?.bg;
    if (firstBgTag) {
      const texKey = this._resolvebgKey(firstBgTag);
      if (texKey && this.textures.exists(texKey)) {
        this._bgSpriteCur = this.add.image(W / 2, H / 2, texKey).setDisplaySize(W, H);
        // overlay 아래, 폴백 위 순서 보정
        this.children.moveBelow(this._bgSpriteCur, this._bgOverlay);
        this._bgGrid.setVisible(false);
        this._bgFallback.setVisible(false);
        this._bgCurrentKey = texKey;
      }
    }
  }

  // ── 배경 전환 ─────────────────────────────────────────────────
  //   bgTag  : BG_DATA 키 ('A', 'B', ...) 또는 'NONE'
  //   mode   : 'crossfade'(기본) | 'instant' | 'fade_black'
  _changeBg(bgTag, mode = 'crossfade') {
    const W = this._bgW, H = this._bgH;

    // NONE = 배경 제거
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
    if (!texKey || !this.textures.exists(texKey)) {
      console.warn('[DialogueScene] 배경 텍스처 없음:', texKey);
      return;
    }
    if (texKey === this._bgCurrentKey) return;

    // 헬퍼: 슬롯이 없으면 새로 생성
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

    // 기본: crossfade
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

  // BG 태그 → 텍스처 키 변환
  _resolvebgKey(bgTag) {
    if (!bgTag || bgTag === 'NONE') return null;
    const file = (typeof BG_DATA !== 'undefined') ? BG_DATA[bgTag] : null;
    if (!file) return null;
    return `bg_${file}`;
  }

  // ── 캐릭터 슬롯 (화면 중앙, 발끝이 대화창 상단에 걸치게) ──────
  _buildCharacterSlot(W, H, BOX_X, BOX_Y, fs) {
    this._charH = Math.round(H * 0.75 * 0.85);   // 기존 대비 15% 축소
    this._charX = Math.round(W / 2);
    // 스프라이트 origin(0.5, 0.5) 기준 — 발끝(중심 + charH/2)을 BOX_Y에 맞춤
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

    // 선택지 대기 상태 — 텍스트 페이드아웃 후 버튼 등장
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

    // 배경 전환 (bg 태그가 있을 때만)
    if (line.bg) {
      // bg 컬럼에 'instant:' 또는 'fade_black:' 접두어로 전환 모드 지정 가능
      // 예: 'instant:A', 'fade_black:B', 'A' (기본=crossfade)
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
      // 텍스트 타이핑 후 ▶ 아이콘 표시 — 클릭하면 텍스트 페이드아웃 후 선택지 등장
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
    // 스킵 직후 연속 클릭 방지 — 한 프레임 후 해제
    this._inputLocked = true;
    this.time.delayedCall(100, () => { this._inputLocked = false; });
  }

  // ════════════════════════════════════════════════════════════════
  //  선택지 (스팀펑크 스타일)
  // ════════════════════════════════════════════════════════════════

  _showChoices(choices) {
    if (!choices || !choices.length) { this._cursor++; this._showLine(); return; }

    const fsPx = this._fs;   // 정수 픽셀 (위치·크기 계산)
    const fs   = n => scaledFontSize(n, this.scale);  // "Npx" 문자열 (fontSize에 사용)
    const { BOX_X, BOX_W, BOX_Y, BOX_H, PAD } = this._layout;

    const BTN_H = fsPx(44);
    const BTN_W = Math.round(BOX_W * 0.78);
    const GAP   = fsPx(8);

    const totalH = choices.length * BTN_H + (choices.length - 1) * GAP;
    const innerTop = BOX_Y + fsPx(50);
    const innerH   = BOX_H - fsPx(50) - PAD;
    const startX   = BOX_X + (BOX_W - BTN_W) / 2;
    const startY   = innerTop + (innerH - totalH) / 2;

    this._choiceCont.removeAll(true);
    this.children.bringToTop(this._choiceCont);

    choices.forEach((choice, i) => {
      const bx = startX;
      const by = startY + i * (BTN_H + GAP);

      const bg = this.add.graphics();

      const draw = hover => {
        bg.clear();
        bg.fillStyle(hover ? 0x181208 : 0x0c0a04, hover ? 0.97 : 0.92);
        bg.fillRect(bx, by, BTN_W, BTN_H);
        bg.lineStyle(1, hover ? 0xc89040 : 0x6a4a18, 1.0);
        bg.strokeRect(bx, by, BTN_W, BTN_H);
        bg.fillStyle(hover ? 0xd4a040 : 0x8a6020, 1.0);
        bg.fillRect(bx, by, 2, BTN_H);
      };
      draw(false);

      // ◆ 다이아 마커
      const marker = this.add.text(
        bx + fsPx(20), by + BTN_H / 2, '◆', {
        fontSize:   fs(13),              // ✏️ pxpx 버그 수정
        fill:       '#8a6020',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0.5);

      // 선택지 텍스트
      const lbl = this.add.text(
        bx + fsPx(34), by + BTN_H / 2, choice.label, {
        fontSize:   fs(20),              // ✏️ pxpx 버그 수정
        fill:       '#c8a858',
        fontFamily: FontManager.BODY,
        wordWrap:   { width: BTN_W - fsPx(44) },
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
        this.tweens.add({ targets: lbl, x: bx + fsPx(38), duration: 80, ease: 'Sine.easeOut' });
      });
      hit.on('pointerout', () => {
        draw(false);
        lbl.setStyle({ fill: '#c8a858', stroke: '#080600', strokeThickness: 2 });
        marker.setStyle({ fill: '#8a6020' });
        this.tweens.add({ targets: lbl, x: bx + fsPx(34), duration: 80, ease: 'Sine.easeOut' });
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
        duration: 350,
        delay:    i * 100,
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
