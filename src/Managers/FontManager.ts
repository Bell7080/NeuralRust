// ================================================================
//  FontManager.ts
//  경로: src/Managers/FontManager.ts
//
//  역할: 폰트 중앙 관리 + 설정에서 폰트 전환 지원
//
//  adjustedSize(basePx, sceneScale)
//    Phaser 캔버스는 CSS @font-face size-adjust를 무시하므로
//    폰트별 배율을 여기서 직접 보정한다.
//
//  일괄 치환:
//    찾기:   scaledFontSize(
//    바꾸기: FontManager.adjustedSize(
// ================================================================

import { scaledFontSize } from './utils';

type PresetKey = 'kirang' | 'game' | 'system';

interface FontEntry {
  key:    string;
  family: string;
  src:    string;
  weight: string;
  style:  string;
}

interface FontPreset {
  TITLE: string;
  BODY:  string;
  MONO:  string;
}

interface ScaleLike { width: number; height: number; }

export const FontManager = {

  FONTS: [
    {
      key:    'NeoDunggeunmoPro',
      family: 'NeoDunggeunmoPro',
      src:    'Games/Assets/Fonts/NeoDunggeunmoPro-Regular.woff2',
      weight: 'normal',
      style:  'normal',
    },
    {
      key:    'BMKiranghaerang',
      family: 'BMKiranghaerang',
      src:    'Games/Assets/Fonts/BMKIRANGHAERANG.woff2',
      weight: 'normal',
      style:  'normal',
    },
  ] as FontEntry[],

  PRESETS: {
    kirang: {
      TITLE: "'BMKiranghaerang', monospace",
      BODY:  "'BMKiranghaerang', monospace",
      MONO:  "'BMKiranghaerang', monospace",
    },
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
  } as Record<PresetKey, FontPreset>,

  // 폰트별 Phaser 렌더 보정 배율
  //   BMKiranghaerang  → size-adjust: 160%  (원본이 매우 작음)
  //   NeoDunggeunmoPro → size-adjust: 110%  (원본이 약간 작음)
  SCALE: {
    kirang: 1.25,
    game:   1.10,
    system: 1.00,
  } as Record<PresetKey, number>,

  FALLBACK: "'NeoDunggeunmoPro', monospace",

  _activePreset: 'kirang' as PresetKey,

  init(): Promise<void> {
    const saved = localStorage.getItem('settings_font') || 'kirang';
    this._activePreset = saved as PresetKey;
    if (this.FONTS.length === 0) return Promise.resolve();
    return Promise.all(this.FONTS.map(f => this._loadFont(f)))
      .then(() => { this.applyCSSVars(); console.log('[FontManager] 폰트 로드 완료'); })
      .catch(e => { this.applyCSSVars(); console.warn('[FontManager] 폰트 로드 중 오류 (무시됨)', e); });
  },

  setActive(presetKey: PresetKey): void {
    if (!this.PRESETS[presetKey]) {
      console.warn(`[FontManager] 없는 프리셋: ${presetKey}`);
      return;
    }
    this._activePreset = presetKey;
    this.applyCSSVars();
    console.log(`[FontManager] 폰트 전환 → ${presetKey}`);
  },

  /** CSS 커스텀 프로퍼티를 현재 프리셋으로 동기화 — DOM 레이어 폰트 일괄 반영 */
  applyCSSVars(): void {
    const root    = document.documentElement;
    const preset  = this.PRESETS[this._activePreset] ?? this.PRESETS.kirang;
    root.style.setProperty('--font-display', preset.TITLE);
    root.style.setProperty('--font-title',   preset.TITLE);
    root.style.setProperty('--font-body',    preset.BODY);
    root.style.setProperty('--font-mono',    preset.MONO);
  },

  get TITLE(): string { return (this.PRESETS[this._activePreset] ?? this.PRESETS.kirang).TITLE; },
  get BODY():  string { return (this.PRESETS[this._activePreset] ?? this.PRESETS.kirang).BODY;  },
  get MONO():  string { return (this.PRESETS[this._activePreset] ?? this.PRESETS.kirang).MONO;  },

  adjustedSize(basePx: number, sceneScale?: ScaleLike): string {
    const raw   = parseInt(scaledFontSize(basePx, sceneScale), 10);
    const scale = this.SCALE[this._activePreset] ?? 1.00;
    // 1920x1080 기준 가독성 확보를 위해 Phaser 텍스트의 하한선을 12px로 고정한다.
    const scaled = Math.round(raw * scale);
    return `${Math.max(12, scaled)}px`;
  },

  _loadFont(font: FontEntry): Promise<void> {
    return new Promise(resolve => {
      try {
        const face = new FontFace(font.family, `url(${font.src})`, {
          weight: font.weight || 'normal',
          style:  font.style  || 'normal',
        });
        face.load()
          .then(loaded => { document.fonts.add(loaded); resolve(); })
          .catch(err   => { console.warn(`[FontManager] 실패: ${font.key}`, err); resolve(); });
      } catch (err) {
        console.warn(`[FontManager] FontFace 생성 실패: ${font.key}`, err);
        resolve();
      }
    });
  },

  get(key: string): string {
    const f = this.FONTS.find(f => f.key === key);
    return f ? `'${f.family}', monospace` : this.FALLBACK;
  },
};
