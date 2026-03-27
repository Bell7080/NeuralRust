// ================================================================
//  Settings_Tab_Keys.ts
//  경로: src/Scenes/Settings/Settings_Tab_Keys.ts
//
//  역할: 설정 > 키 설정 탭
// ================================================================

import { FontManager }    from '../../Managers/FontManager';
import { InputManager }   from '../../Managers/InputManager';
import type { ISettingsScene } from './_types';

interface RowObject {
  keyText:   Phaser.GameObjects.Text;
  actionKey: string;
}

export const Settings_Tab_Keys = {

  build(scene: ISettingsScene, W: number, H: number, cx: number): void {
    const actions  = InputManager.ACTIONS;
    const colCount = 2;
    const marginX  = W * 0.06;

    const areaTop = H * 0.31;
    const areaH   = H * 0.52;
    const rowH    = areaH / Math.ceil(actions.length / colCount);

    const colW   = W * 0.44;
    const leftX  = marginX;
    const rightX = cx + W * 0.02;

    scene.add.text(leftX, H * 0.310, '[ 키 설정 ]', {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(W - marginX, H * 0.310, 'ESC — 변경 취소', {
      fontSize:   FontManager.adjustedSize(13, scene.scale),
      color:      '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    const waitTextY = areaTop + areaH + H * 0.025;
    const waitText  = scene.add.text(cx, waitTextY, '', {
      fontSize:   FontManager.adjustedSize(15, scene.scale),
      color:      '#a05018',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(50);

    const rowObjects: RowObject[] = [];

    actions.forEach((action, i) => {
      const col   = i % colCount;
      const row   = Math.floor(i / colCount);
      const baseX = col === 0 ? leftX : rightX;
      const cy    = areaTop + rowH * row + rowH / 2;
      const obj   = this._makeRow(scene, action, baseX, cy, colW, rowH, H, waitText, rowObjects);
      rowObjects.push(obj);
    });

    const resetY = areaTop + areaH + H * 0.055;
    const btnW   = W * 0.28;
    const btnH   = Math.max(28, Math.round(H * 0.045));
    scene.makeButton(cx, resetY, btnW, btnH, '기본값으로 초기화', () => {
      scene.showConfirmPopup(cx, H, '키 설정을 기본값으로 되돌리겠습니까?', () => {
        InputManager.resetToDefaults();
        scene.showToast(cx, H * 0.5, '초기화 완료', () => {
          scene.scene.restart({ from: scene.fromScene, tab: 'keys' });
        });
      });
    }, false);
  },

  _makeRow(
    scene:      ISettingsScene,
    action:     { key: string; label: string; default: string },
    baseX:      number,
    cy:         number,
    colW:       number,
    rowH:       number,
    H:          number,
    waitText:   Phaser.GameObjects.Text,
    rowObjects: RowObject[],
  ): RowObject {
    const labelX  = baseX + colW * 0.04;
    const keyBtnX = baseX + colW * 0.70;
    const keyBtnW = colW * 0.28;
    const keyBtnH = Math.max(24, Math.round(H * 0.042));
    const rowPad  = Math.round(rowH * 0.12);

    const rowBg = scene.add.graphics();
    const drawRowBg = (hover: boolean) => {
      rowBg.clear();
      rowBg.fillStyle(hover ? 0x160e05 : 0x000000, hover ? 1 : 0);
      rowBg.lineStyle(1, 0x221508, hover ? 0.5 : 0.3);
      rowBg.fillRect(baseX,  cy - rowH / 2 + rowPad, colW, rowH - rowPad * 2);
      rowBg.strokeRect(baseX, cy - rowH / 2 + rowPad, colW, rowH - rowPad * 2);
    };
    drawRowBg(false);

    scene.add.text(labelX, cy, action.label, {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#6b4520',
      fontFamily: FontManager.BODY,
    }).setOrigin(0, 0.5);

    const keyBg   = scene.add.graphics();
    const keyText = scene.add.text(keyBtnX, cy, InputManager.displayName(action.key), {
      fontSize:   FontManager.adjustedSize(17, scene.scale),
      color:      '#a07040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const drawKeyBg = (state: 'normal' | 'hover' | 'waiting') => {
      keyBg.clear();
      const styles = {
        normal:  { fill: 0x160e05, line: 0x4a2810 },
        hover:   { fill: 0x221408, line: 0x7a4520 },
        waiting: { fill: 0x1e1800, line: 0xa06018 },
      };
      const s = styles[state];
      keyBg.fillStyle(s.fill, 1);
      keyBg.lineStyle(1, s.line, 0.9);
      keyBg.fillRect(keyBtnX - keyBtnW / 2, cy - keyBtnH / 2, keyBtnW, keyBtnH);
      keyBg.strokeRect(keyBtnX - keyBtnW / 2, cy - keyBtnH / 2, keyBtnW, keyBtnH);
    };
    drawKeyBg('normal');

    const hit = scene.add.rectangle(baseX + colW / 2, cy, colW, rowH - rowPad * 2, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    let isWaiting = false;

    hit.on('pointerover', () => { if (!isWaiting) { drawRowBg(true);  drawKeyBg('hover');  } });
    hit.on('pointerout',  () => { if (!isWaiting) { drawRowBg(false); drawKeyBg('normal'); } });
    hit.on('pointerdown', () => {
      if (InputManager._rebindTarget) return;
      isWaiting = true;
      drawRowBg(false);
      drawKeyBg('waiting');
      keyText.setText('?').setStyle({ color: '#d09030' });
      waitText.setText(`'${action.label}' — 새 키를 누르세요  (ESC: 취소)`);

      InputManager.startRebind(action.key, (newKey) => {
        isWaiting = false;
        keyText.setText(InputManager.displayName(action.key)).setStyle({ color: '#a07040' });
        if (newKey) {
          rowObjects.forEach(obj => {
            if (obj?.keyText && obj?.actionKey)
              obj.keyText.setText(InputManager.displayName(obj.actionKey));
          });
        }
        drawRowBg(false);
        drawKeyBg('normal');
        waitText.setText('');
      });
    });

    return { keyText, actionKey: action.key };
  },
};
