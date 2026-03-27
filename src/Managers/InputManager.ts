// ================================================================
//  InputManager.ts
//  경로: src/Managers/InputManager.ts
//
//  역할: 키 바인딩 중앙 관리
//    - 액션(action) → 키(key) 매핑 테이블 보유
//    - localStorage 에 저장 / 불러오기
//    - 리바인딩(rebind) 지원
//    - isDown(action) / isJustDown(action) 로 씬에서 조회
// ================================================================

interface ActionDef {
  key:     string;
  label:   string;
  default: string;
}

export const InputManager = {

  ACTIONS: [
    { key: 'confirm',   label: '확인 / 상호작용',  default: 'Z'      },
    { key: 'cancel',    label: '취소 / 뒤로가기',  default: 'X'      },
    { key: 'menu',      label: '메뉴 열기',         default: 'ESC'    },
    { key: 'tab',       label: '탭 / 다음',         default: 'TAB'    },
    { key: 'moveUp',    label: '위',                default: 'UP'     },
    { key: 'moveDown',  label: '아래',              default: 'DOWN'   },
    { key: 'moveLeft',  label: '왼쪽',              default: 'LEFT'   },
    { key: 'moveRight', label: '오른쪽',            default: 'RIGHT'  },
    { key: 'dash',      label: '대시',              default: 'SHIFT'  },
    { key: 'map',       label: '지도',              default: 'M'      },
  ] as ActionDef[],

  STORAGE_KEY: 'neural_rust_keybinds',

  _binds: {} as Record<string, string>,
  _keys:  {} as Record<string, Phaser.Input.Keyboard.Key>,
  _scene: null as Phaser.Scene | null,
  _rebindTarget:   null as string | null,
  _rebindCallback: null as ((key: string | null) => void) | null,
  _rebindListener: null as ((e: KeyboardEvent) => void) | null,

  init(scene: Phaser.Scene): void {
    this._scene = scene;
    this._loadBinds();
    this._registerKeys(scene);
  },

  reinit(scene: Phaser.Scene): void {
    this._scene = scene;
    this._keys  = {};
    this._registerKeys(scene);
  },

  _registerKeys(scene: Phaser.Scene): void {
    if (!scene?.input?.keyboard) return;
    this.ACTIONS.forEach(action => {
      const keyStr = this._binds[action.key] || action.default;
      try {
        const code = (Phaser.Input.Keyboard.KeyCodes as Record<string, number>)[keyStr] ?? keyStr;
        this._keys[action.key] = scene.input.keyboard!.addKey(code as number);
      } catch (e) {
        console.warn(`[InputManager] 키 등록 실패: ${action.key} → ${keyStr}`);
      }
    });
  },

  isDown(actionKey: string): boolean {
    return this._keys[actionKey]?.isDown ?? false;
  },

  isJustDown(actionKey: string): boolean {
    const k = this._keys[actionKey];
    return k ? Phaser.Input.Keyboard.JustDown(k) : false;
  },

  isJustUp(actionKey: string): boolean {
    const k = this._keys[actionKey];
    return k ? Phaser.Input.Keyboard.JustUp(k) : false;
  },

  getKey(actionKey: string): string {
    return this._binds[actionKey] ||
      this.ACTIONS.find(a => a.key === actionKey)?.default || '?';
  },

  startRebind(actionKey: string, callback: (key: string | null) => void): void {
    if (this._rebindListener) this._cancelRebind();

    this._rebindTarget   = actionKey;
    this._rebindCallback = callback;

    this._rebindListener = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      if (e.code === 'Escape') {
        this._cancelRebind();
        callback(null);
        return;
      }

      const keyStr = this._codeToPhaser(e.code);
      if (!keyStr) { callback(null); return; }

      Object.keys(this._binds).forEach(k => {
        if (this._binds[k] === keyStr && k !== actionKey) {
          this._binds[k] = this.ACTIONS.find(a => a.key === k)?.default || '';
        }
      });

      this._binds[actionKey] = keyStr;
      this._saveBinds();
      if (this._scene) this._registerKeys(this._scene);
      this._cleanupRebind();
      callback(keyStr);
    };

    window.addEventListener('keydown', this._rebindListener, { capture: true, once: true });
  },

  _cancelRebind(): void {
    if (this._rebindListener) {
      window.removeEventListener('keydown', this._rebindListener, true);
    }
    this._cleanupRebind();
  },

  _cleanupRebind(): void {
    this._rebindTarget   = null;
    this._rebindCallback = null;
    this._rebindListener = null;
  },

  resetToDefaults(): void {
    this._binds = {};
    this._saveBinds();
    if (this._scene) this._registerKeys(this._scene);
  },

  _saveBinds(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._binds));
    } catch (e) {
      console.warn('[InputManager] 저장 실패', e);
    }
  },

  _loadBinds(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this._binds = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch (e) {
      this._binds = {};
    }
  },

  _codeToPhaser(code: string): string | null {
    if (/^Key[A-Z]$/.test(code)) return code.replace('Key', '');
    if (/^Digit\d$/.test(code))  return code.replace('Digit', '');

    const MAP: Record<string, string> = {
      ArrowUp:      'UP',
      ArrowDown:    'DOWN',
      ArrowLeft:    'LEFT',
      ArrowRight:   'RIGHT',
      Space:        'SPACE',
      Enter:        'ENTER',
      ShiftLeft:    'SHIFT',
      ShiftRight:   'SHIFT',
      ControlLeft:  'CTRL',
      ControlRight: 'CTRL',
      AltLeft:      'ALT',
      AltRight:     'ALT',
      Tab:          'TAB',
      Backspace:    'BACKSPACE',
      Delete:       'DELETE',
      Home:         'HOME',
      End:          'END',
      PageUp:       'PAGE_UP',
      PageDown:     'PAGE_DOWN',
      Insert:       'INSERT',
      F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4',
      F5: 'F5', F6: 'F6', F7: 'F7', F8: 'F8',
      F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
      Numpad0: 'NUMPAD_ZERO',  Numpad1: 'NUMPAD_ONE',
      Numpad2: 'NUMPAD_TWO',   Numpad3: 'NUMPAD_THREE',
      Numpad4: 'NUMPAD_FOUR',  Numpad5: 'NUMPAD_FIVE',
      Numpad6: 'NUMPAD_SIX',   Numpad7: 'NUMPAD_SEVEN',
      Numpad8: 'NUMPAD_EIGHT', Numpad9: 'NUMPAD_NINE',
      BracketLeft:  'OPEN_BRACKET',
      BracketRight: 'CLOSED_BRACKET',
      Semicolon:    'SEMICOLON',
      Quote:        'QUOTES',
      Comma:        'COMMA',
      Period:       'PERIOD',
      Slash:        'FORWARD_SLASH',
      Backslash:    'BACK_SLASH',
      Minus:        'MINUS',
      Equal:        'PLUS',
      Backquote:    'BACKTICK',
    };

    return MAP[code] ?? null;
  },

  displayName(actionKey: string): string {
    const k = this.getKey(actionKey);
    const DISPLAY: Record<string, string> = {
      UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→',
      SPACE: 'Space', ENTER: 'Enter', SHIFT: 'Shift',
      CTRL: 'Ctrl', ALT: 'Alt', TAB: 'Tab',
      ESC: 'Esc', BACKSPACE: 'BS', DELETE: 'Del',
      PAGE_UP: 'PgUp', PAGE_DOWN: 'PgDn',
    };
    return DISPLAY[k] ?? k;
  },
};
