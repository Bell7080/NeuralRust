// ================================================================
//  Settings_Tab_Keys.js
//  경로: Games/Codes/Scenes/Settings/Settings_Tab_Keys.js
//
//  역할: 설정 > 키 설정 탭
//  호출: Settings_Tab_Keys.build(scene, W, H, cx)
//  의존: FontManager, InputManager, utils.js
//        scene.makeButton / scene.showConfirmPopup / scene.showToast
//        scene.fromScene
//
//  ✏️ 수정 내역
//    · 섹션 라벨 Y: H * 0.295 → H * 0.310 (폰트 탭과 동일하게, 탭바 겹침 방지)
//    · 섹션 라벨 폰트: 18 유지
//    · 액션 라벨(action.label) 폰트: 15 → 18
//      "지도", "대시" 등 짧은 한글이 너무 작게 보이던 문제 해소
//    · 키 텍스트(keyText) 폰트: 14 → 17
//      "M", "Space" 등 키 이름이 박스 안에서 작아 보이던 문제 해소
//    · keyBtnW: colW * 0.24 → colW * 0.28
//      폰트 17px 기준 "Control", "Escape" 등 긴 키 이름이 잘리지 않도록 폭 확장
//    · keyBtnH: Math.max(20, H*0.038) → Math.max(24, H*0.042)
//      폰트 17px 세로 패딩 확보
//    · keyBtnX: colW * 0.74 → colW * 0.70
//      버튼 폭 확장에 맞춰 X 위치 조정 (우측 경계 유지)
//    · areaH: H * 0.52 유지 (이전 수정값)
//    · resetY 기준 waitTextY도 areaEnd 기반으로 연동
// ================================================================

const Settings_Tab_Keys = {

  build(scene, W, H, cx) {
    const actions  = InputManager.ACTIONS;
    const colCount = 2;
    const marginX  = W * 0.06;

    const areaTop = H * 0.31;
    const areaH   = H * 0.52;
    const rowH    = areaH / Math.ceil(actions.length / colCount);

    const colW   = W * 0.44;
    const leftX  = marginX;
    const rightX = cx + W * 0.02;

    // ✏️ 섹션 라벨 Y: H * 0.295 → H * 0.310
    scene.add.text(leftX, H * 0.310, '[ 키 설정 ]', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(W - marginX, H * 0.310, 'ESC — 변경 취소', {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    const waitTextY = areaTop + areaH + H * 0.025;
    const waitText  = scene.add.text(cx, waitTextY, '', {
      fontSize: scaledFontSize(15, scene.scale),
      fill: '#a05018',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(50);

    const rowObjects = [];

    actions.forEach((action, i) => {
      const col   = i % colCount;
      const row   = Math.floor(i / colCount);
      const baseX = col === 0 ? leftX : rightX;
      const cy    = areaTop + rowH * row + rowH / 2;
      const obj   = this._makeRow(scene, action, baseX, cy, colW, rowH, H, waitText, rowObjects);
      rowObjects.push(obj);
    });

    const resetY = areaTop + areaH + H * 0.055;
    const btnW   = W * 0.28;   // ✏️ 0.22 → 0.28 ("기본값으로 초기화" 텍스트 여유 확보)
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

  _makeRow(scene, action, baseX, cy, colW, rowH, H, waitText, rowObjects) {
    const labelX = baseX + colW * 0.04;
    // ✏️ keyBtnX: colW * 0.74 → colW * 0.70 (버튼 폭 확장에 맞춰 좌측 이동)
    const keyBtnX = baseX + colW * 0.70;
    // ✏️ keyBtnW: colW * 0.24 → colW * 0.28 (폰트 17px, "Control" 등 긴 키 대응)
    const keyBtnW = colW * 0.28;
    // ✏️ keyBtnH: Math.max(20, H*0.038) → Math.max(24, H*0.042)
    const keyBtnH = Math.max(24, Math.round(H * 0.042));
    const rowPad  = Math.round(rowH * 0.12);

    const rowBg = scene.add.graphics();
    const drawRowBg = (hover) => {
      rowBg.clear();
      rowBg.fillStyle(hover ? 0x160e05 : 0x000000, hover ? 1 : 0);
      rowBg.lineStyle(1, 0x221508, hover ? 0.5 : 0.3);
      rowBg.fillRect(baseX,  cy - rowH / 2 + rowPad, colW, rowH - rowPad * 2);
      rowBg.strokeRect(baseX, cy - rowH / 2 + rowPad, colW, rowH - rowPad * 2);
    };
    drawRowBg(false);

    // ✏️ 액션 라벨 폰트: 15 → 18
    scene.add.text(labelX, cy, action.label, {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#6b4520',
      fontFamily: FontManager.BODY,
    }).setOrigin(0, 0.5);

    const keyBg = scene.add.graphics();
    // ✏️ 키 텍스트 폰트: 14 → 17
    const keyText = scene.add.text(keyBtnX, cy, InputManager.displayName(action.key), {
      fontSize: scaledFontSize(17, scene.scale),
      fill: '#a07040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const drawKeyBg = (state) => {
      keyBg.clear();
      const styles = {
        normal:  { fill: 0x160e05, line: 0x4a2810 },
        hover:   { fill: 0x221408, line: 0x7a4520 },
        waiting: { fill: 0x1e1800, line: 0xa06018 },
      };
      const s = styles[state] || styles.normal;
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
      keyText.setText('?').setStyle({ fill: '#d09030' });
      waitText.setText(`'${action.label}' — 새 키를 누르세요  (ESC: 취소)`);

      InputManager.startRebind(action.key, (newKey) => {
        isWaiting = false;
        keyText.setText(InputManager.displayName(action.key)).setStyle({ fill: '#a07040' });
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
