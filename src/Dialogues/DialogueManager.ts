// ================================================================
//  DialogueManager.ts
//  경로: src/Dialogues/DialogueManager.ts
//
//  역할: 대화 이벤트 진행 — DialogueData 기반
//  의존: SaveManager, StoryManager, DialogueData
//
//  사용법:
//    DialogueManager.play(scene, 'Day_1_1', {
//      onLine(line)       — { id, char, expr, text }
//      onChoice(choices)  — [{ text, char }]
//      onFx(fxStr)        — FX 예약어 문자열
//      onBgm(file)        — BGM 파일명
//      onEnd()            — 이벤트 종료
//    });
//    DialogueManager.next();
//    DialogueManager.choose(i);
// ================================================================

import { SaveManager }  from '../Managers/SaveManager';
import { StoryManager } from '../Managers/StoryManager';
import {
  DIALOGUE_DATA, CAST_DATA, BGM_DATA, SFX_DATA,
  type DialogueLine,
} from './DialogueData';

export interface DialogueLineEvent {
  id:   string;
  char: string;
  expr: string;
  text: string;
}

export interface DialogueChoiceItem {
  text: string;
  char: string;
}

export interface DialogueCallbacks {
  onLine?:   (line: DialogueLineEvent) => void;
  onChoice?: (choices: DialogueChoiceItem[]) => void;
  onFx?:     (fxStr: string, char: string) => void;
  onBgm?:    (file: string) => void;
  onEnd?:    () => void;
}

export const DialogueManager = {

  _scene:          null as Phaser.Scene | null,
  _eventId:        '' as string,
  _lines:          [] as DialogueLine[],
  _lineMap:        {} as Record<string, number>,
  _cursor:         0  as number,
  _callbacks:      null as DialogueCallbacks | null,
  _playing:        false,
  _choiceMode:     false,
  _pendingChoices: [] as DialogueLine[],

  play(scene: Phaser.Scene, eventId: string, callbacks: DialogueCallbacks): void {
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

    const bgmFile = BGM_DATA[eventId];
    if (bgmFile) callbacks?.onBgm?.(bgmFile);

    console.log(`[DialogueManager] 시작: ${eventId} (${this._lines.length}줄)`);
    this._playLine();
  },

  next(): void {
    if (!this._playing || this._choiceMode) return;
    this._cursor++;
    this._playLine();
  },

  choose(index: number): void {
    if (!this._choiceMode) return;
    const selected = this._pendingChoices[index];
    if (!selected) {
      console.warn(`[DialogueManager] 선택지 인덱스 없음: ${index}`);
      return;
    }
    this._choiceMode     = false;
    this._pendingChoices = [];
    if (selected.goto) {
      this._processGoto(selected.goto);
    } else {
      this._playLine();
    }
  },

  isPlaying(): boolean { return this._playing; },

  _playLine(): void {
    if (this._cursor >= this._lines.length) {
      this._end();
      return;
    }
    const line = this._lines[this._cursor];
    if (line.flag_check && !SaveManager.getFlag(line.flag_check)) {
      this._cursor++;
      this._playLine();
      return;
    }
    if (line.choice) {
      this._collectChoices();
      return;
    }
    this._processLine(line);
  },

  _collectChoices(): void {
    const choices: DialogueLine[] = [];
    let i = this._cursor;
    while (i < this._lines.length) {
      const l = this._lines[i];
      if (!l.choice) break;
      if (!l.flag_check || SaveManager.getFlag(l.flag_check)) {
        choices.push(l);
      }
      i++;
    }
    this._cursor = i;
    if (choices.length === 0) {
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

  _processLine(line: DialogueLine): void {
    if (line.flag_set) SaveManager.setFlag(line.flag_set, true);

    if (line.sfx) {
      this._resolveSfx(line.sfx).forEach(file => {
        this._scene?.sound?.play?.(file);
      });
    }

    if (line.fx) {
      this._callbacks?.onFx?.(line.fx, line.char);
    }

    this._callbacks?.onLine?.({
      id:   line.id,
      char: this._resolveName(line.char),
      expr: line.expr ?? '',
      text: line.text ?? '',
    });

    if (line.goto) {
      this._processGoto(line.goto);
    }
  },

  _processGoto(gotoVal: string): void {
    if (gotoVal === 'END') {
      this._cursor = this._lines.length;
      return;
    }
    if (this._lineMap[gotoVal] !== undefined) {
      this._cursor = this._lineMap[gotoVal];
      this._playLine();
      return;
    }
    if (DIALOGUE_DATA[gotoVal]) {
      const savedCallbacks = this._callbacks;
      const savedScene     = this._scene!;
      this._end(false);
      this.play(savedScene, gotoVal, savedCallbacks!);
      return;
    }
    console.warn(`[DialogueManager] goto 대상 없음: '${gotoVal}'`);
  },

  _resolveName(alias: string): string {
    if (!alias) return '';
    const entry = CAST_DATA[alias];
    if (!entry) return alias;
    return entry.nickname ?? entry.name ?? alias;
  },

  _resolveSfx(sfxStr: string): string[] {
    return sfxStr.split('|')
      .map(s => s.trim())
      .filter(Boolean)
      .map(alias => SFX_DATA[alias] ?? alias);
  },

  _end(callOnEnd = true): void {
    this._playing        = false;
    this._choiceMode     = false;
    this._pendingChoices = [];
    if (this._eventId) StoryManager.completeScene(this._eventId);
    console.log(`[DialogueManager] 종료: ${this._eventId}`);
    this._eventId = '';
    if (callOnEnd) this._callbacks?.onEnd?.();
  },

  parseFx(fxStr: string): Array<{ key: string; params: Record<string, string | number> }> {
    return fxStr.split('|').map(part => {
      const colonIdx = part.indexOf(':');
      const key      = (colonIdx < 0 ? part : part.slice(0, colonIdx)).trim();
      const params: Record<string, string | number> = {};
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

  debug(): void {
    console.group('[DialogueManager] 현재 상태');
    console.log('이벤트:', this._eventId || '없음');
    console.log('커서:', this._cursor, '/', this._lines.length);
    console.log('재생 중:', this._playing);
    console.log('선택지 모드:', this._choiceMode);
    console.groupEnd();
  },
};
