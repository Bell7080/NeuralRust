// ================================================================
//  Settings_Tab_Audio.ts
//  경로: src/Scenes/Settings/Settings_Tab_Audio.ts
//
//  역할: 설정 > 오디오 탭
//        마스터 / BGM / SFX 볼륨 슬라이더
// ================================================================

import { FontManager }  from '../../Managers/FontManager';
import { AudioManager } from '../../Managers/AudioManager';
import type { ISettingsScene } from './_types';

interface SliderCfg {
  label:   string;
  sub:     string;
  getPct:  () => number;
  setPct:  (v: number) => void;
  getEff?: () => number;
}

export const Settings_Tab_Audio = {

  build(scene: ISettingsScene, W: number, H: number, cx: number): void {
    const marginX  = W * 0.06;
    const contentW = W * 0.88;

    scene.add.text(marginX, H * 0.295, '[ 오디오 ]', {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const effectiveRefreshers: Array<() => void> = [];

    const sliders: SliderCfg[] = [
      {
        label:  '마스터 볼륨',
        sub:    'MASTER',
        getPct: () => AudioManager.getMasterPct(),
        setPct: (v) => AudioManager.setMasterPct(v),
      },
      {
        label:  '배경음악',
        sub:    'BGM',
        getPct: () => AudioManager.getBGMPct(),
        setPct: (v) => AudioManager.setBGMPct(v),
        getEff: () => Math.round(AudioManager.effectiveBGM * 100),
      },
      {
        label:  '효과음',
        sub:    'SFX',
        getPct: () => AudioManager.getSFXPct(),
        setPct: (v) => AudioManager.setSFXPct(v),
        getEff: () => Math.round(AudioManager.effectiveSFX * 100),
      },
    ];

    const sliderAreaTop = H * 0.34;
    const sliderAreaH   = H * 0.50;
    const rowGap        = sliderAreaH / sliders.length;
    const firstY        = sliderAreaTop + rowGap * 0.5;

    sliders.forEach((cfg, i) => {
      const refreshEff = this._makeSlider(scene, cfg, W, H, cx, marginX, contentW, firstY + rowGap * i);
      if (refreshEff) effectiveRefreshers.push(refreshEff);
    });

    scene._audioEffRefreshers = effectiveRefreshers;

    scene.add.text(cx, sliderAreaTop + sliderAreaH + H * 0.025,
      '배경음악 · 효과음 볼륨은 마스터 볼륨에 곱해서 적용됩니다', {
        fontSize:      FontManager.adjustedSize(13, scene.scale),
        color:         '#3d2810',
        fontFamily:    FontManager.MONO,
        letterSpacing: 1,
      }).setOrigin(0.5, 0);
  },

  _makeSlider(
    scene:    ISettingsScene,
    cfg:      SliderCfg,
    W:        number,
    H:        number,
    cx:       number,
    marginX:  number,
    contentW: number,
    cy:       number,
  ): (() => void) | null {
    const sliderW  = contentW * 0.60;
    const sliderH  = Math.max(5, Math.round(H * 0.007));
    const knobR    = Math.max(9, Math.round(H * 0.014));
    const sliderX  = cx - sliderW / 2;
    const valueX   = sliderX + sliderW + W * 0.018;

    const labelOffsetUp   = H * 0.025;
    const labelOffsetDown = H * 0.015;

    scene.add.text(marginX, cy - labelOffsetUp, cfg.label, {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#8a5a30',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5);

    scene.add.text(marginX, cy + labelOffsetDown, cfg.sub, {
      fontSize:      FontManager.adjustedSize(12, scene.scale),
      color:         '#3a2010',
      fontFamily:    FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0, 0.5);

    const track  = scene.add.graphics();
    const filled = scene.add.graphics();
    const knob   = scene.add.graphics();

    const drawAll = (pct: number, hover = false) => {
      track.clear();
      track.fillStyle(0x1e1208, 1);
      track.lineStyle(1, 0x3a2010, 0.7);
      track.strokeRect(sliderX, cy - sliderH / 2, sliderW, sliderH);
      track.fillRect(sliderX, cy - sliderH / 2, sliderW, sliderH);

      [0, 25, 50, 75, 100].forEach(tp => {
        const tx = sliderX + sliderW * (tp / 100);
        track.lineStyle(1, (tp === 0 || tp === 100) ? 0x4a2810 : 0x2a1808, 0.6);
        track.lineBetween(tx, cy - sliderH / 2 - 4, tx, cy + sliderH / 2 + 4);
      });

      filled.clear();
      filled.fillStyle(0x8a4820, 1);
      filled.fillRect(sliderX, cy - sliderH / 2, sliderW * (pct / 100), sliderH);

      knob.clear();
      knob.fillStyle(hover ? 0xf0c880 : 0xd0a858, 1);
      knob.lineStyle(1.5, hover ? 0xffd890 : 0x9a5820, 1);
      const kx = sliderX + sliderW * (pct / 100);
      knob.strokeCircle(kx, cy, knobR);
      knob.fillCircle(kx, cy, knobR);
    };

    const valueTxt = scene.add.text(valueX, cy - labelOffsetUp * 0.4, `${cfg.getPct()}%`, {
      fontSize:   FontManager.adjustedSize(16, scene.scale),
      color:      '#c8a070',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    let effTxt: Phaser.GameObjects.Text | null = null;
    if (cfg.getEff) {
      effTxt = scene.add.text(valueX, cy + labelOffsetDown * 1.2, `→ ${cfg.getEff()}%`, {
        fontSize:   FontManager.adjustedSize(12, scene.scale),
        color:      '#5a3820',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);
    }

    const refresh = (pct: number, hover = false) => {
      drawAll(pct, hover);
      valueTxt.setText(`${pct}%`);
      if (effTxt && cfg.getEff) effTxt.setText(`→ ${cfg.getEff()}%`);
    };

    refresh(cfg.getPct());

    const hitH    = Math.max(knobR * 3, 40);
    const hitArea = scene.add.rectangle(cx, cy, sliderW + knobR * 2, hitH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    const pctFromX = (px: number) => Math.round(Math.max(0, Math.min(100, (px - sliderX) / sliderW * 100)));

    hitArea.on('pointerover', () => refresh(cfg.getPct(), true));
    hitArea.on('pointerout',  () => refresh(cfg.getPct(), false));
    hitArea.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const pct = pctFromX(ptr.x);
      cfg.setPct(pct);
      refresh(pct, true);
      scene._audioEffRefreshers?.forEach(fn => fn());
    });

    scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!ptr.isDown) return;
      if (ptr.x < sliderX - knobR || ptr.x > sliderX + sliderW + knobR) return;
      if (ptr.y < cy - hitH / 2   || ptr.y > cy + hitH / 2) return;
      const pct = pctFromX(ptr.x);
      cfg.setPct(pct);
      refresh(pct, true);
      scene._audioEffRefreshers?.forEach(fn => fn());
    });

    return (effTxt && cfg.getEff)
      ? () => (effTxt as Phaser.GameObjects.Text).setText(`→ ${cfg.getEff!()}%`)
      : null;
  },
};
