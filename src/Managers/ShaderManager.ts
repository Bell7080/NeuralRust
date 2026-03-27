// ================================================================
//  ShaderManager.ts
//  경로: src/Managers/ShaderManager.ts
//
//  역할: CSS 레이어 기반 전체화면 쉐이더
//        심해 스팀펑크 톤 조성:
//          ① 비네팅    — 가장자리 어둡게
//          ② 스캔라인  — 브라운관 수평선
//          ③ 청록 틴트 — 심해 색조
//          ④ 노이즈 플리커 — 아날로그 노이즈 (강도 높을 때)
//
//  intensity 0.0 ~ 1.0 으로 모든 효과를 일괄 제어
//
//  사용법:
//    ShaderManager.init();           ← main.ts _initGame() 에서 1회
//    ShaderManager.setIntensity(0.7);
//    ShaderManager.getIntensity();
// ================================================================

import { SaveManager } from './SaveManager';

export const ShaderManager = {

  _intensity: 0.7,
  _overlay:   null as HTMLElement | null,
  _flickerId: null as ReturnType<typeof setTimeout> | null,

  // ── 초기화 ────────────────────────────────────────────────────
  init(): void {
    const saved = SaveManager.loadSettings();
    this._intensity = (saved.shaderIntensity !== undefined)
      ? Math.max(0, Math.min(1, saved.shaderIntensity as number))
      : 0.7;

    this._overlay = document.getElementById('shader-overlay');
    if (!this._overlay) {
      console.warn('[ShaderManager] #shader-overlay 엘리먼트를 찾을 수 없습니다.');
      return;
    }

    this._apply();
    this._startFlicker();
  },

  // ── 강도 설정 (0.0 ~ 1.0) ────────────────────────────────────
  setIntensity(v: number): void {
    this._intensity = Math.max(0, Math.min(1, v));
    this._apply();
    SaveManager.saveSettings({ shaderIntensity: this._intensity });
  },

  getIntensity(): number { return this._intensity; },

  // ── CSS 변수 적용 ─────────────────────────────────────────────
  _apply(): void {
    if (!this._overlay) return;
    const t = this._intensity;

    this._overlay.style.display = t === 0 ? 'none' : 'block';
    if (t === 0) return;

    const vigRadius = Math.round(75 - t * 30);
    const vigAlpha  = (t * 0.75).toFixed(3);
    const scanAlpha = Math.max(0, (t - 0.2) * 0.25).toFixed(3);
    const tintAlpha = (t * 0.14).toFixed(3);
    const aberrX    = (t * 2.5).toFixed(2);
    const aberrY    = (t * 0.8).toFixed(2);

    this._overlay.style.setProperty('--vig-radius',  vigRadius + '%');
    this._overlay.style.setProperty('--vig-alpha',   vigAlpha);
    this._overlay.style.setProperty('--scan-alpha',  scanAlpha);
    this._overlay.style.setProperty('--tint-alpha',  tintAlpha);
    this._overlay.style.setProperty('--aberr-x',     aberrX + 'px');
    this._overlay.style.setProperty('--aberr-y',     aberrY + 'px');
  },

  // ── 아날로그 노이즈 플리커 (강도 > 0.4 에서만) ───────────────
  _startFlicker(): void {
    const flicker = () => {
      const t = this._intensity;
      if (!this._overlay || t < 0.4) {
        this._flickerId = setTimeout(flicker, 2000);
        return;
      }

      const maxJitter = (t - 0.4) * 0.06;
      const jitter    = (Math.random() * maxJitter).toFixed(4);
      const sign      = Math.random() > 0.5 ? 1 : -1;

      this._overlay.style.opacity = (1 + sign * Number(jitter)).toString();

      setTimeout(() => {
        if (this._overlay) this._overlay.style.opacity = '1';
      }, 80 + Math.random() * 120);

      this._flickerId = setTimeout(flicker, 1500 + Math.random() * 3500);
    };

    this._flickerId = setTimeout(flicker, 3000);
  },

  destroy(): void {
    if (this._flickerId) clearTimeout(this._flickerId);
    this._flickerId = null;
  },
};
