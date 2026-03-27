// ================================================================
//  Settings_Tab_Font.ts
//  경로: src/Scenes/Settings/Settings_Tab_Font.ts
//
//  역할: 설정 > 폰트 탭
// ================================================================

import { FontManager }  from '../../Managers/FontManager';
import { SaveManager }  from '../../Managers/SaveManager';
import type { ISettingsScene } from './_types';

interface FontOption {
  key:    string;
  label:  string;
  desc:   string;
  family: string;
}

interface Layout {
  marginX:    number;
  contentW:   number;
  optionBoxH: number;
  optionGap:  number;
  firstOptY:  number;
}

export const Settings_Tab_Font = {

  _layout(W: number, H: number): Layout {
    const marginX    = W * 0.06;
    const contentW   = W * 0.88;
    const optionBoxH = Math.round(H * 0.10);
    const optionGap  = optionBoxH + Math.round(H * 0.018);
    const firstOptY  = H * 0.360;
    return { marginX, contentW, optionBoxH, optionGap, firstOptY };
  },

  build(scene: ISettingsScene, W: number, H: number, cx: number): void {
    const L     = this._layout(W, H);
    const saved = localStorage.getItem('settings_font') || 'kirang';

    const options: FontOption[] = [
      { key: 'kirang', label: 'BMKiranghaerang',  desc: '기란해랑 손글씨 폰트',     family: "'BMKiranghaerang', monospace" },
      { key: 'game',   label: 'NeoDunggeunmoPro', desc: '게임 전용 도트 폰트',       family: "'NeoDunggeunmoPro', monospace" },
      { key: 'system', label: 'System Default',   desc: '브라우저 기본 시스템 폰트', family: 'Arial, sans-serif' },
    ];

    scene.add.text(L.marginX, H * 0.295, '[ 폰트 ]', {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    options.forEach((opt, i) => {
      this._makeOption(scene, opt, W, H, cx, L, L.firstOptY + L.optionGap * i, saved);
    });

    const lastOptCenter = L.firstOptY + L.optionGap * (options.length - 1);
    const lastOptBottom = lastOptCenter + L.optionBoxH / 2;
    const previewY      = lastOptBottom + H * 0.04;
    this._buildPreview(scene, W, H, cx, L, previewY);
  },

  _makeOption(
    scene:  ISettingsScene,
    opt:    FontOption,
    W:      number,
    H:      number,
    cx:     number,
    L:      Layout,
    cy:     number,
    saved:  string,
  ): void {
    const isSelected = saved === opt.key;
    const boxTop     = cy - L.optionBoxH / 2;
    const box        = scene.add.graphics();
    scene.drawOptionBox(box, L.marginX, boxTop, L.contentW, L.optionBoxH, isSelected);

    scene.add.text(L.marginX + L.contentW * 0.03, cy, isSelected ? '▶' : '·', {
      fontSize:   FontManager.adjustedSize(15, scene.scale),
      color:      isSelected ? '#a05018' : '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const nameText = scene.add.text(L.marginX + L.contentW * 0.07, cy - L.optionBoxH * 0.18, opt.label, {
      fontSize:   FontManager.adjustedSize(20, scene.scale),
      color:      isSelected ? '#c8a070' : '#7a5028',
      fontFamily: opt.family,
    }).setOrigin(0, 0.5);

    scene.add.text(L.marginX + L.contentW * 0.07, cy + L.optionBoxH * 0.22, opt.desc, {
      fontSize:   FontManager.adjustedSize(13, scene.scale),
      color:      isSelected ? '#5a3820' : '#4a3018',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const hit = scene.add.rectangle(cx, cy, L.contentW, L.optionBoxH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      if (saved !== opt.key) {
        scene.drawOptionBox(box, L.marginX, boxTop, L.contentW, L.optionBoxH, false, true);
        nameText.setStyle({ color: '#9a7040' });
      }
    });
    hit.on('pointerout', () => {
      if (saved !== opt.key) {
        scene.drawOptionBox(box, L.marginX, boxTop, L.contentW, L.optionBoxH, false, false);
        nameText.setStyle({ color: '#7a5028' });
      }
    });
    hit.on('pointerdown', () => {
      localStorage.setItem('settings_font', opt.key);
      SaveManager.saveSettings({ font: opt.key });
      FontManager.setActive(opt.key as 'kirang' | 'game' | 'system');
      scene.scene.restart({ from: scene.fromScene, tab: 'font' });
    });

    void W; // suppress unused warning
  },

  _buildPreview(scene: ISettingsScene, W: number, H: number, cx: number, L: Layout, startY: number): void {
    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x2a1a0a, 0.8);
    divider.lineBetween(L.marginX, startY, L.marginX + L.contentW, startY);

    const labelY = startY + H * 0.025;
    scene.add.text(L.marginX, labelY, '미리보기', {
      fontSize:   FontManager.adjustedSize(15, scene.scale),
      color:      '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(cx, labelY + H * 0.04, 'NEURAL RUST — 뉴럴 러스트 — ABC 123', {
      fontSize:   FontManager.adjustedSize(21, scene.scale),
      color:      '#7a5028',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    scene.add.text(cx, labelY + H * 0.09, '소프트웨어만 살아남은 세계, 붕괴 후 102년', {
      fontSize:   FontManager.adjustedSize(15, scene.scale),
      color:      '#5a3820',
      fontFamily: FontManager.BODY,
    }).setOrigin(0.5, 0);

    void W; // suppress unused warning
  },
};
