// ================================================================
//  DialogueScene.js
//  경로: Games/Codes/Scenes/DialogueScene.js
//
//  역할: 스토리 대화 이벤트 전용 씬
//        로보토미 코퍼레이션 스타일 대화창
//        — 하단 고정 박스 + 좌측 캐릭터 초상화 슬롯
//        — 이름판 (닉네임 동적 변경 지원)
//        — 타자 방식 텍스트 타이핑 (한 글자씩 출력)
//        — 완료 시 StoryManager.completeScene 기록
//
//  호출:
//    this.scene.start('DialogueScene', {
//      eventId:  'Welcome',
//      next:     'AtelierScene',
//      nextData: { save: ... },
//    });
//
//  닉네임 런타임 변경:
//    SaveManager.setFlag('cast_nick_A', 'Noa')
//    → 다음 라인부터 이름판에 'Noa' 표시
//    SaveManager.setFlag('cast_nick_A', null) → CAST_DATA.nickname 복귀
//
//  의존:
//    DialogueData.js  — DIALOGUE_DATA, CAST_DATA, BGM_DATA, SFX_DATA, KEYWORD_DATA
//    StoryManager.js  — completeScene
//    SaveManager.js   — getFlag / setFlag
//    FontManager, AudioManager, scaledFontSize (utils.js)
// ================================================================

class DialogueScene extends Phaser.Scene {
  constructor() { super({ key: 'DialogueScene' }); }

  // ── init ──────────────────────────────────────────────────────
  init(data) {
    this._eventId  = data.eventId  || '';
    this._next     = data.next     || 'AtelierScene';
    this._nextData = data.nextData || {};
  }

  // ── create ────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W;
    this.H = H;
    this._timers         = [];
    this._done           = false;
    this._typing         = false;
    this._pendingText    = '';
    this._portraitSprite = null;

    const eventData = DIALOGUE_DATA[this._eventId];
    if (!eventData) {
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
    this._buildInput();

    // 씬 페이드인 후 첫 라인 시작
    // cameras.main.fadeIn 콜백 대신 delayedCall 사용 (씬 전환 시 이벤트 누락 방지)
    this.cameras.main.fadeIn(380, 5, 6, 10);
    this.time.delayedCall(400, () => this._showLine());
  }

  // ════════════════════════════════════════════════════════════════
  //  씬 빌드
  // ════════════════════════════════════════════════════════════════

  _buildScene(W, H) {
    // scaledFontSize는 '18px' 문자열 반환 → 숫자만 추출
    const fs = n => parseInt(scaledFontSize(n, this.scale), 10);
    this._fs = fs;

    // ── 배경 ──────────────────────────────────────────────────
    this.add.rectangle(0, 0, W, H, 0x05060a).setOrigin(0);

    // 그리드
    const grid = this.add.graphics();
    const step = Math.round(W / 52);
    grid.lineStyle(1, 0x0d1018, 0.7);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);

    // 스캔라인
    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x000000, 0.08);
      scan.lineBetween(0, y, W, y);
    }

    // ── 치수 계산 ─────────────────────────────────────────────
    const BOX_H   = Math.round(H * 0.285);
    const BOX_Y   = H - BOX_H;
    const CHAR_W  = Math.round(W * 0.22);
    const PAD     = Math.round(fs(18));
    const TEXT_X  = CHAR_W + PAD;
    const TEXT_W  = W - TEXT_X - PAD;
    const TEXT_Y  = BOX_Y + PAD;

    this._layout = { BOX_H, BOX_Y, CHAR_W, PAD, TEXT_X, TEXT_W, TEXT_Y, fs };

    this._buildBox(W, H, BOX_H, BOX_Y, CHAR_W, PAD, TEXT_X, TEXT_W, TEXT_Y, fs);
  }

  _buildBox(W, H, BOX_H, BOX_Y, CHAR_W, PAD, TEXT_X, TEXT_W, TEXT_Y, fs) {

    // ── 대화창 배경 패널 ──────────────────────────────────────
    const panel = this.add.graphics();

    // 메인 배경
    panel.fillStyle(0x060810, 0.96);
    panel.fillRect(0, BOX_Y, W, BOX_H);

    // 상단 경계선 — 두 겹 (로보토미 특징)
    panel.lineStyle(2, 0x253550, 1.0);
    panel.lineBetween(0, BOX_Y, W, BOX_Y);
    panel.lineStyle(1, 0x3a5578, 0.45);
    panel.lineBetween(0, BOX_Y + 3, W, BOX_Y + 3);

    // 초상화 영역 구분선
    panel.lineStyle(1, 0x182230, 1.0);
    panel.lineBetween(CHAR_W, BOX_Y + 6, CHAR_W, H - 6);

    // 초상화 영역 배경 (약간 더 어둡게)
    panel.fillStyle(0x03040a, 0.6);
    panel.fillRect(0, BOX_Y, CHAR_W, BOX_H);

    // ── 초상화 프레임 ─────────────────────────────────────────
    const pf   = this.add.graphics();
    const pm   = 6;  // margin
    const prx  = pm;
    const pry  = BOX_Y + pm;
    const prw  = CHAR_W - pm * 2;
    const prh  = BOX_H - pm * 2;
    pf.lineStyle(1, 0x182535, 0.8);
    pf.strokeRect(prx, pry, prw, prh);
    // 코너 강조
    const cs = 8;
    pf.lineStyle(1, 0x2a4060, 0.7);
    [[prx,pry,1,1],[prx+prw,pry,-1,1],[prx,pry+prh,1,-1],[prx+prw,pry+prh,-1,-1]]
      .forEach(([ox,oy,sx,sy]) => {
        pf.lineBetween(ox, oy, ox+cs*sx, oy);
        pf.lineBetween(ox, oy, ox, oy+cs*sy);
      });

    // 초상화 텍스트 플레이스홀더 (텍스처 없을 때)
    this._portraitLabel = this.add.text(
      CHAR_W / 2, BOX_Y + BOX_H / 2, '', {
      fontSize:   `${fs(10)}px`,
      fill:       '#182535',
      fontFamily: FontManager.MONO,
      align:      'center',
    }).setOrigin(0.5);

    // ── 이름판 ────────────────────────────────────────────────
    // 로보토미: 대화창 상단 왼쪽, 살짝 위로 걸쳐있음
    const NW = Math.round(W * 0.22);
    const NH = Math.round(fs(28));
    const NX = TEXT_X;
    const NY = BOX_Y - NH + 2;

    const nameBg = this.add.graphics();

    // 이름판 배경
    nameBg.fillStyle(0x080f1e, 1.0);
    nameBg.fillRect(NX, NY, NW, NH);

    // 이름판 테두리
    nameBg.lineStyle(1, 0x253550, 1.0);
    nameBg.strokeRect(NX, NY, NW, NH);

    // 왼쪽 세로 강조선 (로보토미 특징)
    nameBg.lineStyle(2, 0x4a7aaa, 1.0);
    nameBg.lineBetween(NX, NY, NX, NY + NH);

    // 상단 하이라이트
    nameBg.lineStyle(1, 0x3a5578, 0.5);
    nameBg.lineBetween(NX + 2, NY + 1, NX + NW - 2, NY + 1);

    this._nameTxt = this.add.text(
      NX + NW / 2, NY + NH / 2, '', {
      fontSize:        `${fs(12)}px`,
      fill:            '#9ab8d8',    // 로보토미 청백색 이름
      fontFamily:      FontManager.TITLE,
      stroke:          '#03060f',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this._nameLayout = { NX, NY, NW, NH };

    // ── 본문 텍스트 ───────────────────────────────────────────
    this._bodyTxt = this.add.text(
      TEXT_X, TEXT_Y, '', {
      fontSize:    `${fs(15)}px`,
      fill:        '#b8cce0',      // 로보토미: 청백색 계열
      fontFamily:  FontManager.BODY || FontManager.MONO,
      wordWrap:    { width: TEXT_W },
      lineSpacing: Math.round(fs(7)),
    });

    // ── ▶ 다음 줄 표시 ────────────────────────────────────────
    this._nextIcon = this.add.text(
      W - Math.round(fs(20)), H - Math.round(fs(16)),
      '▶', {
      fontSize:   `${fs(11)}px`,
      fill:       '#3a6a9a',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setVisible(false);

    // 이동 + 점멸 동시
    this.tweens.add({
      targets:  this._nextIcon,
      alpha:    { from: 0.25, to: 1.0 },
      x:        { from: W - Math.round(fs(22)), to: W - Math.round(fs(18)) },
      duration: 580,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // 하단 입력 힌트
    this.add.text(
      W - Math.round(fs(20)),
      H - Math.round(fs(5)),
      'SPACE  /  CLICK', {
      fontSize:      `${fs(7)}px`,
      fill:          '#182535',
      fontFamily:    FontManager.MONO,
      letterSpacing: 2,
    }).setOrigin(1, 1);

    // 선택지 컨테이너
    this._choiceCont = this.add.container(0, 0);
  }

  // ════════════════════════════════════════════════════════════════
  //  닉네임 해석
  // ════════════════════════════════════════════════════════════════

  /**
   * 캐릭터 키로 현재 표시할 이름 반환
   * 우선순위:
   *   1. SaveManager.getFlag('cast_nick_A') — 런타임 변경값
   *   2. CAST_DATA[key].nickname            — xlsx D열 닉네임
   *   3. CAST_DATA[key].name                — xlsx B열 캐릭터명
   */
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
    if (line && line.isChoice) return;   // 선택지 중 — 버튼만
    if (this._typing) { this._skipType(); return; }
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
    this._nameTxt.setVisible(!isPlayer);
    if (!isPlayer) this._nameTxt.setText(this._getDisplayName(line.char));

    // 초상화
    this._updatePortrait(line.char, line.expr);

    // SFX (복합: Happy|Beep)
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
      // 본문 먼저 타이핑 → 완료 후 선택지
      this._typeText(line.text, () => {
        this._nextIcon.setVisible(false);
        this._showChoices(line.choices);
      });
    } else {
      this._typeText(line.text, () => {
        this._nextIcon.setVisible(true);
      });
    }
  }

  // ── 초상화 ────────────────────────────────────────────────────
  _updatePortrait(charKey, expr) {
    if (!charKey || charKey === 'P') {
      this._portraitLabel.setText('');
      if (this._portraitSprite) this._portraitSprite.setVisible(false);
      return;
    }

    const cast = CAST_DATA[charKey];
    if (!cast) return;

    if (expr) {
      const texKey = `Character_${cast.name}_${String(expr).padStart(3,'0')}`;
      if (this.textures.exists(texKey)) {
        const { CHAR_W, BOX_Y, BOX_H } = this._layout;
        if (!this._portraitSprite) {
          this._portraitSprite = this.add.image(CHAR_W/2, BOX_Y + BOX_H/2, texKey)
            .setDisplaySize(CHAR_W - 12, BOX_H - 12);
        } else {
          this._portraitSprite.setTexture(texKey).setVisible(true)
            .setPosition(CHAR_W/2, BOX_Y + BOX_H/2);
        }
        this._portraitLabel.setText('');
        return;
      }
    }

    if (this._portraitSprite) this._portraitSprite.setVisible(false);
    this._portraitLabel.setText(cast.name);
  }

  // ════════════════════════════════════════════════════════════════
  //  타이핑 텍스트
  // ════════════════════════════════════════════════════════════════

  _typeText(fullText, onDone) {
    // 이전 타이머 정리
    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._timers = [];

    this._typing      = true;
    this._pendingText = fullText;
    this._bodyTxt.setText('');

    const chars = [...fullText];  // 유니코드 문자 단위 분리
    let i = 0;

    const tick = () => {
      if (!this.scene || !this.scene.isActive()) return;
      if (i < chars.length) {
        i++;
        this._bodyTxt.setText(chars.slice(0, i).join(''));
        this._timers.push(this.time.delayedCall(26, tick));
      } else {
        this._typing = false;
        this._bodyTxt.setText(fullText);
        if (onDone) onDone();
      }
    };
    this._timers.push(this.time.delayedCall(26, tick));
  }

  _skipType() {
    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._timers = [];
    this._typing = false;
    this._bodyTxt.setText(this._pendingText);
    this._nextIcon.setVisible(true);
  }

  // ════════════════════════════════════════════════════════════════
  //  선택지
  // ════════════════════════════════════════════════════════════════

  _showChoices(choices) {
    if (!choices || choices.length === 0) {
      this._cursor++;
      this._showLine();
      return;
    }

    const W  = this.W;
    const fs = this._fs;
    const { BOX_Y } = this._layout;

    const BTN_H  = Math.round(fs(42));
    const BTN_W  = Math.round(W * 0.46);
    const GAP    = Math.round(fs(6));
    const totalH = choices.length * (BTN_H + GAP) - GAP;
    const startY = BOX_Y - totalH - Math.round(fs(18));

    this._choiceCont.removeAll(true);

    choices.forEach((choice, i) => {
      const bx = W / 2;
      const by = startY + i * (BTN_H + GAP);

      const bg = this.add.graphics();
      const draw = (hover) => {
        bg.clear();
        bg.fillStyle(hover ? 0x0d1e38 : 0x060d1a, hover ? 0.97 : 0.92);
        bg.lineStyle(1, hover ? 0x4a7aaa : 0x1e3050, 1.0);
        bg.strokeRect(bx - BTN_W/2, by, BTN_W, BTN_H);
        bg.fillRect(bx - BTN_W/2, by, BTN_W, BTN_H);
        // 왼쪽 포인트 선
        bg.lineStyle(2, hover ? 0x6a9acc : 0x2a4a6a, 1.0);
        bg.lineBetween(bx - BTN_W/2, by + 2, bx - BTN_W/2, by + BTN_H - 2);
        // 상단 광택
        bg.lineStyle(1, hover ? 0x3a6a9a : 0x162030, 0.5);
        bg.lineBetween(bx - BTN_W/2 + 2, by + 1, bx + BTN_W/2 - 2, by + 1);
      };
      draw(false);

      // 마커 ▷
      const marker = this.add.text(
        bx - BTN_W/2 + Math.round(fs(10)),
        by + BTN_H/2,
        '▷', {
        fontSize:   `${fs(10)}px`,
        fill:       '#2a4a6a',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      // 선택지 텍스트
      const lbl = this.add.text(
        bx - BTN_W/2 + Math.round(fs(26)),
        by + BTN_H/2,
        choice.label, {
        fontSize:   `${fs(13)}px`,
        fill:       '#7aaac8',
        fontFamily: FontManager.BODY || FontManager.MONO,
        wordWrap:   { width: BTN_W - Math.round(fs(34)) },
      }).setOrigin(0, 0.5);

      const hit = this.add.rectangle(bx, by + BTN_H/2, BTN_W, BTN_H, 0, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        draw(true);
        lbl.setStyle({ fill: '#c0daf2' });
        marker.setStyle({ fill: '#6aaccc' });
      });
      hit.on('pointerout', () => {
        draw(false);
        lbl.setStyle({ fill: '#7aaac8' });
        marker.setStyle({ fill: '#2a4a6a' });
      });
      hit.on('pointerdown', () => {
        this._choiceCont.removeAll(true);
        // gotoIdx: convert 시 processedMap 기준으로 미리 계산된 인덱스
        if (choice.gotoIdx != null) {
          this._cursor = choice.gotoIdx;
        } else if (choice.goto && this._lineMap[choice.goto] != null) {
          this._cursor = this._lineMap[choice.goto];
        } else {
          this._cursor++;
        }
        this._showLine();
      });

      this._choiceCont.add([bg, marker, lbl, hit]);
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  FX
  // ════════════════════════════════════════════════════════════════

  _playFx(fxStr) {
    fxStr.split('|').forEach(part => {
      const [name, paramStr] = part.trim().split(':');
      const p = {};
      if (paramStr) {
        paramStr.split(',').forEach(kv => {
          const [k, v] = kv.split('=');
          p[k.trim()] = isNaN(v) ? v.trim() : Number(v);
        });
      }
      switch (name.trim()) {
        case 'shake_screen':
          this.cameras.main.shake(p.duration || 300, (p.intensity || 3) / 1000);
          break;
        case 'flash_screen':
          this.cameras.main.flash(p.duration || 200, 255, 255, 255);
          break;
        case 'fade_out':
          this.cameras.main.fadeOut(p.duration || 400, 5, 6, 10);
          break;
        case 'fade_in':
          this.cameras.main.fadeIn(p.duration || 400, 5, 6, 10);
          break;
        case 'zoom_in':
          this.cameras.main.zoomTo(p.zoom || 1.2, p.duration || 300);
          break;
        case 'zoom_out':
          this.cameras.main.zoomTo(p.zoom || 1.0, p.duration || 300);
          break;
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

    // once 플래그 저장 (다음 번엔 getScenesForToday에서 필터링)
    StoryManager.completeScene(this._eventId);

    this.cameras.main.fadeOut(350, 5, 6, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => this._goNext());
  }

  _goNext() {
    this.scene.start(this._next, this._nextData);
  }

  // ── 씬 종료 정리 ─────────────────────────────────────────────
  shutdown() {
    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._timers = [];
  }
}
