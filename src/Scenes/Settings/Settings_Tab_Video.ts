// ================================================================
//  Settings_Tab_Video.ts
//  경로: src/Scenes/Settings/Settings_Tab_Video.ts
//
//  역할: 설정 > 비디오 탭
//    · 화면 모드 (전체화면 / 창 모드)
//    · 심해 필터 강도 슬라이더 (ShaderManager 연동)
// ================================================================

import { FontManager }    from '../../Managers/FontManager';
import { ShaderManager }  from '../../Managers/ShaderManager';
import type { ISettingsScene } from './_types';

export const Settings_Tab_Video = {

  build(scene: ISettingsScene, W: number, H: number, cx: number): void {
    const isFullscreen = !!document.fullscreenElement;

    const marginX    = W * 0.08;
    const contentW   = W * 0.84;
    const optionBoxH = Math.round(H * 0.10);
    const labelSize  = 16;
    const titleSize  = 20;

    const section1Y = H * 0.30;
    const option1Y  = H * 0.41;
    const optionGap = optionBoxH + H * 0.025;

    scene.add.text(marginX, section1Y, '[ 화면 모드 ]', {
      fontSize:   FontManager.adjustedSize(labelSize, scene.scale),
      color:      '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const options = [
      { key: 'fullscreen', label: '전체화면',  desc: 'F11 또는 이 항목으로 전환' },
      { key: 'windowed',   label: '창  모  드', desc: '창 모드로 전환' },
    ];

    options.forEach((opt, i) => {
      const y          = option1Y + optionGap * i;
      const boxTop     = y - optionBoxH / 2;
      const isSelected = isFullscreen ? opt.key === 'fullscreen' : opt.key === 'windowed';
      const box        = scene.add.graphics();
      scene.drawOptionBox(box, marginX, boxTop, contentW, optionBoxH, isSelected);

      scene.add.text(marginX + contentW * 0.055, y, isSelected ? '▶' : '·', {
        fontSize:   FontManager.adjustedSize(labelSize, scene.scale),
        color:      isSelected ? '#a05018' : '#251508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      const nameText = scene.add.text(marginX + contentW * 0.09, y - optionBoxH * 0.16, opt.label, {
        fontSize:   FontManager.adjustedSize(titleSize, scene.scale),
        color:      isSelected ? '#c8a070' : '#3d2010',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0.5);

      scene.add.text(marginX + contentW * 0.09, y + optionBoxH * 0.20, opt.desc, {
        fontSize:   FontManager.adjustedSize(14, scene.scale),
        color:      isSelected ? '#5a3820' : '#2a1508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      const hit = scene.add.rectangle(cx, y, contentW, optionBoxH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!isSelected) {
          scene.drawOptionBox(box, marginX, boxTop, contentW, optionBoxH, false, true);
          nameText.setStyle({ color: '#9a7040' });
        }
      });
      hit.on('pointerout', () => {
        if (!isSelected) {
          scene.drawOptionBox(box, marginX, boxTop, contentW, optionBoxH, false, false);
          nameText.setStyle({ color: '#3d2010' });
        }
      });
      hit.on('pointerdown', () => {
        if (opt.key === 'fullscreen') document.documentElement.requestFullscreen?.().catch(() => {});
        else                          document.exitFullscreen?.().catch(() => {});
      });
    });

    const lastOptY = option1Y + optionGap * (options.length - 1);
    const hintY    = lastOptY + optionBoxH * 0.55;
    scene.add.text(cx, hintY, 'F11 키로도 전체화면을 전환할 수 있습니다', {
      fontSize:   FontManager.adjustedSize(13, scene.scale),
      color:      '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    const dividerY = hintY + H * 0.055;
    const divider  = scene.add.graphics();
    divider.lineStyle(1, 0x1e1008, 0.7);
    divider.lineBetween(marginX, dividerY, marginX + contentW, dividerY);

    const section2Y = dividerY + H * 0.05;
    this._buildShaderSlider(scene, W, H, cx, marginX, contentW, section2Y);
  },

  _buildShaderSlider(
    scene:    ISettingsScene,
    W:        number,
    H:        number,
    cx:       number,
    marginX:  number,
    contentW: number,
    startY:   number,
  ): void {
    scene.add.text(marginX, startY, '[ 심해 필터 ]', {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const sliderW        = contentW * 0.60;
    const sliderH        = Math.max(5, Math.round(H * 0.007));
    const knobR          = Math.max(9, Math.round(H * 0.014));
    const sliderX        = cx - sliderW / 2;
    const sliderY        = startY + H * 0.095;
    const labelOffsetUp  = H * 0.025;
    const labelOffsetDown = H * 0.015;
    const valueX         = sliderX + sliderW + W * 0.018;

    scene.add.text(marginX, sliderY - labelOffsetUp, '심해 필터 강도', {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#8a5a30',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5);

    scene.add.text(marginX, sliderY + labelOffsetDown, 'SHADER', {
      fontSize:      FontManager.adjustedSize(12, scene.scale),
      color:         '#3a2010',
      fontFamily:    FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0, 0.5);

    scene.add.text(marginX, sliderY + labelOffsetDown + H * 0.032,
      '화면 톤·비네팅·스캔라인 강도를 조절합니다', {
        fontSize:   FontManager.adjustedSize(13, scene.scale),
        color:      '#3d2810',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

    const track  = scene.add.graphics();
    const filled = scene.add.graphics();
    const knob   = scene.add.graphics();

    const drawAll = (pct: number, hover = false) => {
      track.clear();
      track.fillStyle(0x1e1208, 1);
      track.lineStyle(1, 0x3a2010, 0.7);
      track.strokeRect(sliderX, sliderY - sliderH / 2, sliderW, sliderH);
      track.fillRect(sliderX, sliderY - sliderH / 2, sliderW, sliderH);

      [0, 25, 50, 75, 100].forEach(tp => {
        const tx = sliderX + sliderW * (tp / 100);
        track.lineStyle(1, (tp === 0 || tp === 100) ? 0x4a2810 : 0x2a1808, 0.6);
        track.lineBetween(tx, sliderY - sliderH / 2 - 4, tx, sliderY + sliderH / 2 + 4);
      });

      filled.clear();
      filled.fillStyle(0x8a4820, 1);
      filled.fillRect(sliderX, sliderY - sliderH / 2, sliderW * pct, sliderH);

      knob.clear();
      knob.fillStyle(hover ? 0xf0c880 : 0xd0a858, 1);
      knob.lineStyle(1.5, hover ? 0xffd890 : 0x9a5820, 1);
      const kx = sliderX + sliderW * pct;
      knob.strokeCircle(kx, sliderY, knobR);
      knob.fillCircle(kx, sliderY, knobR);
    };

    const valueTxt = scene.add.text(valueX, sliderY - labelOffsetUp * 0.4,
      `${Math.round(ShaderManager.getIntensity() * 100)}%`, {
        fontSize:   FontManager.adjustedSize(16, scene.scale),
        color:      '#c8a070',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

    const refresh = (pct: number, hover = false) => {
      drawAll(pct, hover);
      valueTxt.setText(`${Math.round(pct * 100)}%`);
    };

    refresh(ShaderManager.getIntensity());

    const hitH    = Math.max(knobR * 3, 40);
    const hitArea = scene.add.rectangle(cx, sliderY, sliderW + knobR * 2, hitH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    const pctFromX = (px: number) => Math.max(0, Math.min(1, (px - sliderX) / sliderW));

    hitArea.on('pointerover', () => refresh(ShaderManager.getIntensity(), true));
    hitArea.on('pointerout',  () => refresh(ShaderManager.getIntensity(), false));
    hitArea.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const pct = pctFromX(ptr.x);
      ShaderManager.setIntensity(pct);
      refresh(pct, true);
    });

    scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!ptr.isDown) return;
      if (ptr.x < sliderX - knobR || ptr.x > sliderX + sliderW + knobR) return;
      if (ptr.y < sliderY - hitH / 2 || ptr.y > sliderY + hitH / 2) return;
      const pct = pctFromX(ptr.x);
      ShaderManager.setIntensity(pct);
      refresh(pct, true);
    });

    const presets = [
      { label: '꺼짐',   v: 0.0  },
      { label: '약하게', v: 0.35 },
      { label: '보통',   v: 0.70 },
      { label: '강하게', v: 1.0  },
    ];

    const presetY = sliderY + knobR + H * 0.055;
    const presetW = sliderW / presets.length;
    const btnH    = Math.max(28, Math.round(H * 0.038));
    const btnGap  = W * 0.008;

    presets.forEach((p, i) => {
      const bx = sliderX + presetW * i + presetW / 2 - btnGap / 2;

      const btnBg = scene.add.graphics();
      const drawBtn = (hover: boolean) => {
        btnBg.clear();
        btnBg.lineStyle(1, hover ? 0x6b3010 : 0x2a1a0a, 1);
        btnBg.strokeRect(bx - presetW * 0.42, presetY - btnH / 2, presetW * 0.84, btnH);
        if (hover) {
          btnBg.fillStyle(0x1a0c04, 1);
          btnBg.fillRect(bx - presetW * 0.42 + 1, presetY - btnH / 2 + 1, presetW * 0.84 - 2, btnH - 2);
        }
      };
      drawBtn(false);

      scene.add.text(bx, presetY, p.label, {
        fontSize:   FontManager.adjustedSize(14, scene.scale),
        color:      '#3d2010',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5);

      const btnHit = scene.add.rectangle(bx, presetY, presetW * 0.84, btnH, 0, 0)
        .setInteractive({ useHandCursor: true });

      btnHit.on('pointerover',  () => drawBtn(true));
      btnHit.on('pointerout',   () => drawBtn(false));
      btnHit.on('pointerdown',  () => {
        ShaderManager.setIntensity(p.v);
        refresh(p.v);
      });
    });
  },
};
