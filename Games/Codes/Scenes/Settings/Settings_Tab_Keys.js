// ================================================================
//  Settings_Tab_Keys.js
//  경로: Games/Codes/Scenes/Settings/Settings_Tab_Keys.js
//
//  역할: 설정 > 키 설정 탭
//  호출: Settings_Tab_Keys.build(scene, W, H, cx)
//  의존: FontManager, InputManager, utils.js
//        scene.makeButton / scene.showConfirmPopup / scene.showToast
//        scene.fromScene
// ================================================================

const Settings_Tab_Keys = {

  build(scene, W, H, cx) {
    const actions  = InputManager.ACTIONS;
    const colCount = 2;
    const startY   = H * 0.30;
    const rowH     = H * 0.075;
    const colW     = W * 0.42;
    const leftX    = W * 0.06;
    const rightX   = W * 0.52;

    scene.add.text(leftX, H * 0.26, '[ 키 설정 ]', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(W - leftX, H * 0.26, 'ESC — 변경 취소', {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    const waitText = scene.add.text(cx, H * 0.88, '', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#a05018',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(50);

    const rowObjects = [];

    actions.forEach((action, i) => {
      const col   = i % colCount;
      const row   = Math.floor(i / colCount);
      const baseX = col === 0 ? leftX : rightX;
      const y     = startY + row * rowH;
      const obj   = this._makeRow(scene, action, baseX, y, colW, rowH, waitText, rowObjects);
      rowObjects.push(obj);
    });

    const resetY = startY + Math.ceil(actions.length / colCount) * rowH + H * 0.04;
    scene.makeButton(cx, resetY, W * 0.25, 34, '기본값으로 초기화', () => {
      scene.showConfirmPopup(cx, H, '키 설정을 기본값으로 되돌리겠습니까?', () => {
        InputManager.resetToDefaults();
        scene.showToast(cx, H * 0.5, '초기화 완료', () => {
          scene.scene.restart({ from: scene.fromScene, tab: 'keys' });
        });
      });
    }, false);
  },

  _makeRow(scene, action, baseX, y, colW, rowH, waitText, rowObjects) {
    const labelX  = baseX + colW * 0.04;
    const keyBtnX = baseX + colW * 0.72;
    const keyBtnW = colW * 0.26;
    const rowPad  = 6;

    const rowBg = scene.add.graphics();
    const drawRowBg = (hover) => {
      rowBg.clear();
      rowBg.fillStyle(hover ? 0x120a04 : 0x000000, hover ? 1 : 0);
      rowBg.lineStyle(1, 0x1e1008, 0.4);
      rowBg.fillRect(baseX,  y - rowH / 2 + rowPad, colW, rowH - rowPad * 2);
      rowBg.strokeRect(baseX, y - rowH / 2 + rowPad, colW, rowH - rowPad * 2);
    };
    drawRowBg(false);

    scene.add.text(labelX, y, action.label, {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#4a3020',
      fontFamily: FontManager.BODY,
    }).setOrigin(0, 0.5);

    const keyBg   = scene.add.graphics();
    const keyText = scene.add.text(keyBtnX, y, InputManager.displayName(action.key), {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#8a6040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const drawKeyBg = (state) => {
      keyBg.clear();
      const C = { normal: [0x140c05, 0x3d2010], hover: [0x1e1008, 0x6b3818], waiting: [0x1a1000, 0x8a5010] };
      const [fill, line] = C[state] || C.normal;
      keyBg.fillStyle(fill, 1);
      keyBg.lineStyle(1, line, 0.9);
      keyBg.fillRect(keyBtnX - keyBtnW / 2, y - 13, keyBtnW, 26);
      keyBg.strokeRect(keyBtnX - keyBtnW / 2, y - 13, keyBtnW, 26);
    };
    drawKeyBg('normal');

    const hit = scene.add.rectangle(baseX + colW / 2, y, colW, rowH - rowPad * 2, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    let isWaiting = false;

    hit.on('pointerover', () => { if (!isWaiting) { drawRowBg(true);  drawKeyBg('hover');  } });
    hit.on('pointerout',  () => { if (!isWaiting) { drawRowBg(false); drawKeyBg('normal'); } });
    hit.on('pointerdown', () => {
      if (InputManager._rebindTarget) return;
      isWaiting = true;
      drawRowBg(false);
      drawKeyBg('waiting');
      keyText.setText('?').setStyle({ fill: '#c87830' });
      waitText.setText(`'${action.label}' — 새 키를 누르세요  (ESC: 취소)`);

      InputManager.startRebind(action.key, (newKey) => {
        isWaiting = false;
        keyText.setText(InputManager.displayName(action.key)).setStyle({ fill: '#8a6040' });
        if (newKey) {
          rowObjects.forEach(obj => {
            if (obj?.keyText && obj?.actionKey) obj.keyText.setText(InputManager.displayName(obj.actionKey));
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
