// ================================================================
//  DialogueManager.js
//  경로: Games/Codes/Managers/DialogueManager.js
//
//  역할: 대화 이벤트 진행 — xlsx 변환 데이터(DialogueData.js) 기반
//  의존: SaveManager, StoryManager, DialogueData.js
//
//  로드 순서 (index.html):
//    DialogueData.js → SaveManager.js → StoryManager.js → DialogueManager.js
//
//  사용법:
//    DialogueManager.play(scene, 'Day_1_1', {
//      onLine(line)       — { id, char(표시명), expr, text }
//      onChoice(choices)  — [{ text, char }]  →  선택 후 choose(index) 호출
//      onFx(fxStr, char)  — FX 예약어 문자열 (parseFx로 파싱)
//      onBgm(file)        — BGM 파일명
//      onEnd()            — 이벤트 종료
//    });
//    DialogueManager.next();      // 클릭 / 키 입력 시
//    DialogueManager.choose(i);   // 선택지 선택 시
// ================================================================

const DialogueManager = {

  // ── 내부 상태 ──────────────────────────────────────────────────
  _scene:        null,
  _eventId:      '',
  _lines:        [],
  _lineMap:      {},
  _cursor:       0,
  _callbacks:    null,
  _playing:      false,
  _choiceMode:   false,
  _pendingChoices: [],   // choose() 에서 쓸 캐시 — _playLine()에서 저장

  // ================================================================
  // play — 이벤트 시작
  // ================================================================
  play(scene, eventId, callbacks) {
    const data = DIALOGUE_DATA[eventId];
    if (!data) {
      console.warn(`[DialogueManager] 이벤트 없음: ${eventId}`);
      callbacks?.onEnd?.();
      return;
    }

    this._scene          = scene;
    this._eventId        = eventId;
    this._lines          = data.lines;
    this._lineMap        = data.lineMap;
    this._cursor         = 0;
    this._callbacks      = callbacks;
    this._playing        = true;
    this._choiceMode     = false;
    this._pendingChoices = [];

    // BGM — BGM_DATA에 이 이벤트 항목 있을 때만
    const bgmFile = BGM_DATA[eventId];
    if (bgmFile) callbacks?.onBgm?.(bgmFile);

    console.log(`[DialogueManager] 시작: ${eventId} (${this._lines.length}줄)`);
    this._playLine();
  },

  // ================================================================
  // next — 클릭 / 키 입력 시 외부에서 호출
  // ================================================================
  next() {
    if (!this._playing || this._choiceMode) return;
    this._cursor++;
    this._playLine();
  },

  // ================================================================
  // choose — 선택지 선택 후 외부에서 호출
  //   index : onChoice 콜백에서 받은 배열의 인덱스
  // ================================================================
  choose(index) {
    if (!this._choiceMode) return;

    const selected = this._pendingChoices[index];
    if (!selected) {
      console.warn(`[DialogueManager] 선택지 인덱스 없음: ${index}`);
      return;
    }

    this._choiceMode     = false;
    this._pendingChoices = [];

    // 선택된 줄의 goto 처리
    // goto 있으면 점프, 없으면 선택지 블록 바로 다음 줄로
    if (selected.goto) {
      this._processGoto(selected.goto);
    } else {
      this._playLine();   // _cursor 는 이미 블록 다음을 가리킴
    }
  },

  // ================================================================
  // isPlaying
  // ================================================================
  isPlaying() {
    return this._playing;
  },

  // ================================================================
  // _playLine — 현재 커서 줄 처리
  // ================================================================
  _playLine() {
    if (this._cursor >= this._lines.length) {
      this._end();
      return;
    }

    const line = this._lines[this._cursor];

    // flag_check — 미충족 시 이 줄 스킵
    if (line.flag_check && !SaveManager.getFlag(line.flag_check)) {
      this._cursor++;
      this._playLine();
      return;
    }

    // 선택지 블록 진입
    if (line.choice) {
      this._collectChoices();
      return;
    }

    this._processLine(line);
  },

  // ================================================================
  // _collectChoices — 연속 choice 줄 수집 후 onChoice 콜백
  // ================================================================
  _collectChoices() {
    const choices = [];
    let i = this._cursor;

    while (i < this._lines.length) {
      const l = this._lines[i];
      // flag_check 미충족 선택지는 표시 안 함
      if (!l.choice) break;
      if (!l.flag_check || SaveManager.getFlag(l.flag_check)) {
        choices.push(l);
      }
      i++;
    }

    // 커서를 블록 다음 줄로 — choose()에서 goto 없을 때 여기서 재개
    this._cursor = i;

    if (choices.length === 0) {
      // 모든 선택지가 flag_check 에 막힌 경우 — 그냥 계속 진행
      this._playLine();
      return;
    }

    this._pendingChoices = choices;
    this._choiceMode     = true;

    this._callbacks?.onChoice?.(choices.map(c => ({
      text: c.text,
      char: this._resolveName(c.char),
    })));
  },

  // ================================================================
  // _processLine — flag_set / sfx / fx / onLine / goto 처리
  // ================================================================
  _processLine(line) {
    // flag_set — SaveManager.setFlag 직접 사용
    if (line.flag_set) {
      SaveManager.setFlag(line.flag_set, true);
    }

    // SFX — scene.sound.play (Phaser3)
    if (line.sfx) {
      this._resolveSfx(line.sfx).forEach(file => {
        this._scene?.sound?.play?.(file);
      });
    }

    // FX — DialogueScene에서 처리하도록 콜백 위임
    if (line.fx) {
      this._callbacks?.onFx?.(line.fx, line.char);
    }

    // onLine 콜백
    this._callbacks?.onLine?.({
      id:   line.id,
      char: this._resolveName(line.char),
      expr: line.expr ?? '',   // 공백 = 이전 표정 유지
      text: line.text ?? '',
    });

    // goto — 있으면 즉시 처리, 없으면 next() 대기
    if (line.goto) {
      this._processGoto(line.goto);
    }
  },

  // ================================================================
  // _processGoto
  //   'END'       → 다음 next() 때 종료
  //   line_id     → 같은 시트 내 점프
  //   이벤트 ID   → 다른 시트로 연결 (콜백 유지)
  // ================================================================
  _processGoto(gotoVal) {
    if (gotoVal === 'END') {
      this._cursor = this._lines.length;   // next() 때 _end() 호출
      return;
    }

    // 같은 시트 line_id 점프
    if (this._lineMap[gotoVal] !== undefined) {
      this._cursor = this._lineMap[gotoVal];
      // goto는 즉시 진행 (클릭 대기 없음)
      this._playLine();
      return;
    }

    // 다른 이벤트 시트 연결
    if (DIALOGUE_DATA[gotoVal]) {
      const savedCallbacks = this._callbacks;
      const savedScene     = this._scene;
      this._end(false);   // onEnd 호출 없이 내부 상태만 초기화
      this.play(savedScene, gotoVal, savedCallbacks);
      return;
    }

    console.warn(`[DialogueManager] goto 대상 없음: '${gotoVal}'`);
  },

  // ================================================================
  // _resolveName — 단축어 → CAST_DATA 표시명
  // ================================================================
  _resolveName(alias) {
    if (!alias) return '';
    return CAST_DATA[alias] ?? alias;
  },

  // ================================================================
  // _resolveSfx — 'Happy|Door' → ['sfx_happy_001', 'sfx_door_open']
  // ================================================================
  _resolveSfx(sfxStr) {
    return sfxStr.split('|')
      .map(s => s.trim())
      .filter(Boolean)
      .map(alias => SFX_DATA[alias] ?? alias);
  },

  // ================================================================
  // _end — 종료 처리
  //   callOnEnd: false → 시트 연결 시 onEnd 안 부름
  // ================================================================
  _end(callOnEnd = true) {
    this._playing        = false;
    this._choiceMode     = false;
    this._pendingChoices = [];

    // StoryManager.completeScene — _seen 플래그 + log 기록
    if (this._eventId) {
      StoryManager.completeScene(this._eventId);
    }

    console.log(`[DialogueManager] 종료: ${this._eventId}`);
    this._eventId = '';

    if (callOnEnd) this._callbacks?.onEnd?.();
  },

  // ================================================================
  // parseFx — FX 문자열 파싱 (DialogueScene._runFx에서 사용)
  //
  //   입력: 'shake_char:intensity=5,duration=300'
  //   출력: [{ key: 'shake_char', params: { intensity: 5, duration: 300 } }]
  //
  //   복합: 'shake_screen|fade_out_char'
  //   출력: [{ key: 'shake_screen', params: {} }, { key: 'fade_out_char', params: {} }]
  // ================================================================
  parseFx(fxStr) {
    return fxStr.split('|').map(part => {
      const colonIdx = part.indexOf(':');
      const key      = (colonIdx < 0 ? part : part.slice(0, colonIdx)).trim();
      const params   = {};
      if (colonIdx >= 0) {
        part.slice(colonIdx + 1).split(',').forEach(p => {
          const eqIdx = p.indexOf('=');
          if (eqIdx < 0) return;
          const k   = p.slice(0, eqIdx).trim();
          const raw = p.slice(eqIdx + 1).trim();
          const num = Number(raw);
          params[k] = isNaN(num) ? raw : num;
        });
      }
      return { key, params };
    });
  },

  // ================================================================
  // resolveExpr — expr 번호 → 스프라이트 텍스처 키
  //   ('B', '001') → 'Character_Bea_001'
  //   ('B', '')    → null  (이전 표정 유지)
  // ================================================================
  resolveExpr(charAlias, expr) {
    if (!expr) return null;
    const name = CAST_DATA[charAlias] ?? charAlias;
    return `Character_${name}_${String(expr).padStart(3, '0')}`;
  },

  // ================================================================
  // debug
  // ================================================================
  debug() {
    console.group('[DialogueManager] 현재 상태');
    console.log('이벤트:', this._eventId || '없음');
    console.log('커서:', this._cursor, '/', this._lines.length);
    console.log('재생 중:', this._playing);
    console.log('선택지 모드:', this._choiceMode);
    console.log('대기 선택지:', this._pendingChoices.length, '개');
    console.groupEnd();
  },
};
