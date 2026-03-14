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
//  레이아웃 원칙:
//    행 높이 rowH = H 비례.
//    키 버튼 높이 = H 비례.
//    2열 배치 — 열 폭 colW = W 비례.
//    하드코딩 px 없음.
//
//  ✏️ 수정 내역
//    · areaH: H * 0.56 → H * 0.52
//      키 목록 구간을 줄여 초기화 버튼과 뒤로가기(H*0.935) 사이 여유 확보.
//      이전: areaEnd=0.87, resetY=0.895, 버튼하단=0.917 → 뒤로가기까지 1.8%
//      수정: areaEnd=0.83, resetY=0.855, 버튼하단=0.877 → 뒤로가기까지 5.8%
//    · 섹션 라벨 폰트: 15 → 18 (오디오 탭과 통일)
//    · 대기 안내 텍스트 Y: H * 0.895 → H * 0.865 (areaEnd 기준으로 연동)
//    · btnH: Math.max(32, ...) → Math.max(28, ...) 최솟값 완화
//      (32px 하드코딩이 소형 화면에서 버튼을 지나치게 크게 만듦)
//    · keyBtnH: Math.max(24, ...) → Math.max(20, ...) 동일 이유
// ================================================================

const Settings_Tab_Keys = {

  build(scene, W, H, cx) {
    const actions  = InputManager.ACTIONS;
    const colCount = 2;
    const marginX  = W * 0.06;

    // ✏️ areaH H * 0.56 → H * 0.52 (하단 여유 확보)
    const areaTop = H * 0.31;
    const areaH   = H * 0.52;
    const rowH    = areaH / Math.ceil(actions.length / colCount);

    const colW   = W * 0.44;
    const leftX  = marginX;
    const rightX = cx + W * 0.02;

    // ✏️ 섹션 라벨 폰트 15 → 18
    scene.add.text(leftX, H * 0.295, '[ 키 설정 ]', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(W - marginX, H * 0.295, 'ESC — 변경 취소', {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    // ✏️ 대기 안내 텍스트 Y: areaTop + areaH + 여유 (뒤로가기 침범 방지)
    const waitTextY = areaTop + areaH + H * 0.025;
    const waitText = scene.add.text(cx, waitTextY, '', {
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

    // 초기화 버튼 — ✏️ resetY를 areaEnd 기준으로 연동
    const resetY = areaTop + areaH + H * 0.055;
    const btnW   = W * 0.22;
    // ✏️ Math.max(32, ...) → Math.max(28, ...) 최솟값 완화
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
    const labelX  = baseX + colW * 0.04;
    const keyBtnX = baseX + colW * 0.74;
    const keyBtnW = colW * 0.24;
    // ✏️ Math.max(24, ...) → Math.max(20, ...)
    const keyBtnH = Math.max(20, Math.round(H * 0.038));
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

    scene.add.text(labelX, cy, action.label, {
      fontSize: scaledFontSize(15, scene.scale),
      fill: '#6b4520',
      fontFamily: FontManager.BODY,
    }).setOrigin(0, 0.5);

    const keyBg   = scene.add.graphics();
    const keyText = scene.add.text(keyBtnX, cy, InputManager.displayName(action.key), {
      fontSize: scaledFontSize(14, scene.scale),
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
