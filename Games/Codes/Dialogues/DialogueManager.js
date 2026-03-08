// ================================================================
//  DialogueManager.js
//  경로: Games/Codes/Managers/DialogueManager.js
//
//  역할: 대화 이벤트 진행 — xlsx 변환 데이터(DialogueData.js) 기반
//  의존: SaveManager, DialogueData.js
//
//  사용법:
//    DialogueManager.play(scene, 'Day_1_1', callbacks);
//
//  callbacks: {
//    onLine(line)       — 대사 한 줄 표시할 때 호출
//    onChoice(choices)  — 선택지 표시할 때 호출  →  선택 후 choose(index) 호출
//    onFx(fx)           — FX 연출 실행할 때 호출
//    onBgm(file)        — BGM 변경 시 호출
//    onEnd()            — 이벤트 종료 시 호출
//  }
// ================================================================

const DialogueManager = {

  // ── 내부 상태 ──────────────────────────────────────────────────
  _scene:       null,
  _eventId:     '',
  _lines:       [],
  _lineMap:     {},
  _cursor:      0,
  _callbacks:   null,
  _playing:     false,
  _choiceMode:  false,

  // ================================================================
  // play — 이벤트 시작
  //   scene    : Phaser.Scene (현재 씬)
  //   eventId  : 시트명과 동일한 이벤트 ID (예: 'Day_1_1')
  //   callbacks: { onLine, onChoice, onFx, onBgm, onEnd }
  // ================================================================
  play(scene, eventId, callbacks) {
    const data = DIALOGUE_DATA[eventId];
    if (!data) {
      console.warn(`[DialogueManager] 이벤트 없음: ${eventId}`);
      callbacks?.onEnd?.();
      return;
    }

    // flag_check — 이미 본 이벤트 막기 (once 처리는 StoryManager 위임)
    this._scene     = scene;
    this._eventId   = eventId;
    this._lines     = data.lines;
    this._lineMap   = data.lineMap;
    this._cursor    = 0;
    this._callbacks = callbacks;
    this._playing   = true;
    this._choiceMode = false;

    // BGM 처리
    const bgmFile = BGM_DATA[eventId];
    if (bgmFile) callbacks?.onBgm?.(bgmFile);

    console.log(`[DialogueManager] 시작: ${eventId} (${this._lines.length}줄)`);
    this._playLine();
  },

  // ================================================================
  // next — 외부에서 호출 (터치/클릭/키 입력 시)
  // ================================================================
  next() {
    if (!this._playing || this._choiceMode) return;
    this._cursor++;
    this._playLine();
  },

  // ================================================================
  // choose — 선택지 선택 후 외부에서 호출
  //   index: onChoice 에서 받은 choices 배열의 인덱스
  // ================================================================
  choose(index) {
    if (!this._choiceMode) return;
    this._choiceMode = false;

    const choices = this._getChoiceBlock();
    const selected = choices[index];
    if (!selected) return;

    this._processLine(selected);
  },

  // ================================================================
  // isPlaying — 현재 대화 진행 중 여부
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

    // flag_check — 조건 미충족 시 줄 스킵
    if (line.flag_check && !SaveManager.getFlag(line.flag_check)) {
      this._cursor++;
      this._playLine();
      return;
    }

    // 선택지 블록 시작 여부 확인
    if (line.choice) {
      const choices = this._getChoiceBlock();
      this._choiceMode = true;
      this._callbacks?.onChoice?.(choices.map(c => ({
        text:  c.text,
        char:  this._resolveName(c.char),
      })));
      return;
    }

    this._processLine(line);
  },

  // ================================================================
  // _processLine — 실제 줄 처리 (flag, sfx, fx, 이동)
  // ================================================================
  _processLine(line) {
    // flag_set
    if (line.flag_set) {
      SaveManager.setFlag(line.flag_set, true);
    }

    // SFX
    if (line.sfx) {
      this._resolveSfx(line.sfx).forEach(file => {
        this._scene?.sound?.play?.(file);
      });
    }

    // FX — onFx 콜백으로 위임 (DialogueScene에서 구현)
    if (line.fx) {
      this._callbacks?.onFx?.(line.fx, line.char);
    }

    // onLine 콜백
    this._callbacks?.onLine?.({
      id:    line.id,
      char:  this._resolveName(line.char),
      expr:  line.expr   || '',    // 공백 = 이전 표정 유지
      text:  line.text   || '',
    });

    // goto 처리
    if (line.goto) {
      this._processGoto(line.goto);
    }
    // goto 없으면 커서는 next() 호출 대기
  },

  // ================================================================
  // _processGoto — goto 값 처리
  // ================================================================
  _processGoto(goto) {
    if (goto === 'END') {
      // next() 때 자동 종료되도록 커서를 끝으로
      this._cursor = this._lines.length;
      return;
    }

    // 같은 시트 내 line_id 점프
    if (this._lineMap[goto] !== undefined) {
      this._cursor = this._lineMap[goto];
      return;
    }

    // 다른 시트(이벤트) 연결
    if (DIALOGUE_DATA[goto]) {
      const nextCallbacks = this._callbacks;
      this._end(false);   // onEnd 없이 종료
      this.play(this._scene, goto, nextCallbacks);
      return;
    }

    console.warn(`[DialogueManager] goto 대상 없음: ${goto}`);
  },

  // ================================================================
  // _getChoiceBlock — 현재 커서 위치의 연속 선택지 줄 수집
  // ================================================================
  _getChoiceBlock() {
    const choices = [];
    let i = this._cursor;
    while (i < this._lines.length && this._lines[i].choice) {
      choices.push(this._lines[i]);
      i++;
    }
    // 선택지 블록 이후로 커서 이동 (선택 후 choose에서 goto 처리)
    this._cursor = i;
    return choices;
  },

  // ================================================================
  // _resolveName — 단축어 → 표시명
  // ================================================================
  _resolveName(alias) {
    if (!alias) return '';
    return CAST_DATA[alias] || alias;
  },

  // ================================================================
  // _resolveSfx — 별칭(복합 가능) → 파일명 배열
  //   'Happy|Door' → ['sfx_happy_001', 'sfx_door_open']
  // ================================================================
  _resolveSfx(sfxStr) {
    return sfxStr.split('|')
      .map(s => s.trim())
      .filter(Boolean)
      .map(alias => SFX_DATA[alias] || alias);
  },

  // ================================================================
  // _end — 이벤트 종료
  // ================================================================
  _end(callOnEnd = true) {
    this._playing    = false;
    this._choiceMode = false;

    // StoryManager에 완료 통보
    if (this._eventId) {
      StoryManager.completeScene(this._eventId);
    }

    console.log(`[DialogueManager] 종료: ${this._eventId}`);
    this._eventId = '';

    if (callOnEnd) this._callbacks?.onEnd?.();
  },

  // ================================================================
  // parseFx — FX 문자열 파싱 (DialogueScene에서 사용)
  //   'shake_char:intensity=5,duration=300'
  //   → { key: 'shake_char', params: { intensity: 5, duration: 300 } }
  //
  //   복합: 'shake_screen|fade_out_char'
  //   → [{ key: 'shake_screen', params: {} }, { key: 'fade_out_char', params: {} }]
  // ================================================================
  parseFx(fxStr) {
    return fxStr.split('|').map(part => {
      const [keyRaw, paramRaw] = part.trim().split(':');
      const key    = keyRaw.trim();
      const params = {};
      if (paramRaw) {
        paramRaw.split(',').forEach(p => {
          const [k, v] = p.split('=');
          if (k && v !== undefined) {
            const num = Number(v);
            params[k.trim()] = isNaN(num) ? v.trim() : num;
          }
        });
      }
      return { key, params };
    });
  },

  // ================================================================
  // resolveExpr — expr 번호 → 스프라이트 키
  //   charAlias: 'B', expr: '001'  →  'Character_Bea_001'
  //   expr 공백 → null (이전 표정 유지)
  // ================================================================
  resolveExpr(charAlias, expr) {
    if (!expr) return null;   // 공백 = 유지
    const name = CAST_DATA[charAlias] || charAlias;
    return `Character_${name}_${expr.padStart(3, '0')}`;
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
    console.groupEnd();
  },
};
