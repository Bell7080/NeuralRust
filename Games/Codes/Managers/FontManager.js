// ================================================================
//  FontManager.js
//  경로: Games/Codes/Managers/FontManager.js
//
//  역할: 폰트 중앙 관리 + 설정에서 폰트 전환 지원
// ================================================================

const FontManager = {

  FONTS: [
    {
      key:    'NeoDunggeunmoPro',
      family: 'NeoDunggeunmoPro',
      src:    'Games/Assets/Fonts/NeoDunggeunmoPro-Regular.woff2',
      weight: 'normal',
      style:  'normal',
    },
  ],

  PRESETS: {
    game: {
      TITLE: "'NeoDunggeunmoPro', monospace",
      BODY:  "'NeoDunggeunmoPro', monospace",
      MONO:  "'NeoDunggeunmoPro', monospace",
    },
    system: {
      TITLE: "Arial, sans-serif",
      BODY:  "Arial, sans-serif",
      MONO:  "'Courier New', monospace",
    },
  },

  FALLBACK: "'NeoDunggeunmoPro', monospace",

  init() {
    const saved = localStorage.getItem('settings_font') || 'game';
    this._activePreset = saved;
    if (this.FONTS.length === 0) return Promise.resolve();
    return Promise.all(this.FONTS.map(f => this._loadFont(f)))
      .then(() => console.log('[FontManager] 폰트 로드 완료'));
  },

  setActive(presetKey) {
    if (!this.PRESETS[presetKey]) {
      console.warn(`[FontManager] 없는 프리셋: ${presetKey}`);
      return;
    }
    this._activePreset = presetKey;
    console.log(`[FontManager] 폰트 전환 → ${presetKey}`);
  },

  get TITLE() { return (this.PRESETS[this._activePreset] || this.PRESETS.game).TITLE; },
  get BODY()  { return (this.PRESETS[this._activePreset] || this.PRESETS.game).BODY;  },
  get MONO()  { return (this.PRESETS[this._activePreset] || this.PRESETS.game).MONO;  },

  _loadFont(font) {
    return new Promise(resolve => {
      new FontFace(font.family, `url(${font.src})`, {
        weight: font.weight || 'normal',
        style:  font.style  || 'normal',
      }).load()
        .then(loaded => { document.fonts.add(loaded); resolve(); })
        .catch(err   => { console.warn(`[FontManager] 실패: ${font.key}`, err); resolve(); });
    });
  },

  get(key) {
    const f = this.FONTS.find(f => f.key === key);
    return f ? `'${f.family}', monospace` : this.FALLBACK;
  },
};
