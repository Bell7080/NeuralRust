// ================================================================
//  Settings_Tab_Save.js
//  경로: Games/Codes/Scenes/Settings/Settings_Tab_Save.js
//
//  역할: 설정 > 저장 탭 (저장 코드 내보내기 / 불러오기 / 초기화)
//  호출: Settings_Tab_Save.build(scene, W, H, cx)
//  의존: FontManager, SaveManager, InputManager, AudioManager, utils.js
//        scene.makeButton / scene.showConfirmPopup / scene.showToast
//        scene.fromScene / scene._cursorTimer (cleanup용)
//
//  ✏️ 수정 내역
//    · 섹션 라벨 Y: H * 0.295 → H * 0.310 (폰트/키 탭과 통일, 탭바 겹침 방지)
//    · 섹션 라벨 폰트: 18 유지
//    · 코드 박스 내 텍스트 폰트: 13 → 16 (base64 코드가 너무 작아 보이던 문제)
//    · 입력창 플레이스홀더 폰트: 13 → 16 (동일)
//    · 입력창 입력 텍스트 폰트: 13 → 16 (동일)
//    · 커서 폰트: 14 → 17 (입력 폰트+1 유지)
//    · rowH(박스 높이): btnH → btnH * 1.1 (폰트 16px 세로 패딩 확보)
//      표시 글자수 제한: 58자 → 50자 (폰트 커진 만큼 박스 내 표시 폭 줄어듦)
//    · 섹션 간격: 동적 계산(이전 수정) 유지, startY → H * 0.310 연동
//    · btnH: Math.max(28, H*0.055) 유지
// ================================================================

const Settings_Tab_Save = {

  build(scene, W, H, cx) {
    const marginX   = W * 0.06;
    const boxW      = W * 0.76;
    const btnW      = W * 0.09;
    const btnH      = Math.max(28, Math.round(H * 0.055));
    const rightBtnX = marginX + boxW + (W * 0.94 - (marginX + boxW)) / 2;
    // ✏️ startY: H * 0.295 → H * 0.310
    const startY    = H * 0.310;
    const secGap    = H * 0.055;

    const exportEndY = this._buildExportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY);
    const importEndY = this._buildImportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, exportEndY + secGap);
    this._buildReset(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, importEndY + secGap);
  },

  _buildExportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY) {
    const sectionY = startY;
    // ✏️ rowH: btnH → Math.round(btnH * 1.1) (폰트 16px 세로 패딩 확보)
    const rowH     = Math.round(btnH * 1.1);
    const rowY     = sectionY + H * 0.038;

    scene.add.text(marginX, sectionY, '[ 내 저장 코드 ]', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const gameData     = SaveManager.load();
    const settingsData = SaveManager.loadSettings();
    const exportCode   = btoa(unescape(encodeURIComponent(JSON.stringify({ game: gameData, settings: settingsData }))));

    const codeBox = scene.add.graphics();
    codeBox.fillStyle(0x0e0a06, 1);
    codeBox.lineStyle(1, 0x2a1a0a, 0.8);
    codeBox.strokeRect(marginX, rowY, boxW, rowH);
    codeBox.fillRect(marginX, rowY, boxW, rowH);

    // ✏️ 표시 글자수: 58 → 50 (폰트 16px 기준 박스 폭에 맞춤)
    const display = exportCode.length > 50 ? exportCode.substring(0, 50) + '…' : exportCode;
    // ✏️ 코드 텍스트 폰트: 13 → 16
    scene.add.text(marginX + W * 0.012, rowY + rowH / 2, display, {
      fontSize: scaledFontSize(16, scene.scale),
      fill: '#5a3820',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.makeButton(rightBtnX, rowY + rowH / 2, btnW, rowH, '복사', () => {
      navigator.clipboard?.writeText(exportCode)
        .then(() => scene.showToast(cx, H * 0.5, '복사 완료'))
        .catch(() => scene.showToast(cx, H * 0.5, '수동으로 복사해주세요'));
    });

    return rowY + rowH;
  },

  _buildImportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY) {
    const sectionY = startY;
    // ✏️ rowH: btnH → Math.round(btnH * 1.1)
    const rowH     = Math.round(btnH * 1.1);
    const inputY   = sectionY + H * 0.038;

    scene.add.text(marginX, sectionY, '[ 저장 코드로 불러오기 ]', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const inputBg = scene.add.graphics();
    const drawInputBg = (focused) => {
      inputBg.clear();
      inputBg.fillStyle(0x0e0a06, 1);
      inputBg.lineStyle(1, focused ? 0x6b3820 : 0x2a1a0a, focused ? 1 : 0.8);
      inputBg.strokeRect(marginX, inputY, boxW, rowH);
      inputBg.fillRect(marginX, inputY, boxW, rowH);
    };
    drawInputBg(false);

    let inputValue    = '';
    // ✏️ 플레이스홀더 폰트: 13 → 16
    const placeholder = '여기에 저장 코드를 입력하세요…';

    const inputText = scene.add.text(marginX + W * 0.012, inputY + rowH / 2, placeholder, {
      fontSize: scaledFontSize(16, scene.scale),
      fill: '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(10);

    // ✏️ 커서 폰트: 14 → 17 (입력 폰트+1)
    const cursor = scene.add.text(marginX + W * 0.012, inputY + rowH / 2, '|', {
      fontSize: scaledFontSize(17, scene.scale),
      fill: '#8a6040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(10).setAlpha(0);

    let cursorVisible = false;
    let focused       = false;

    scene._cursorTimer = scene.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        cursorVisible = !cursorVisible;
        if (inputValue.length > 0 && focused) cursor.setAlpha(cursorVisible ? 1 : 0);
      },
    });

    const updateDisplay = () => {
      if (inputValue === '') {
        inputText.setText(placeholder).setStyle({ fill: '#3d2810' });
        cursor.setAlpha(0);
      } else {
        // ✏️ 표시 글자수: 58 → 50
        const shown = inputValue.length > 50 ? inputValue.substring(0, 50) + '…' : inputValue;
        inputText.setText(shown).setStyle({ fill: '#7a5028' });
        cursor.setX(marginX + W * 0.012 + inputText.width + 2);
      }
    };

    const hitInput = scene.add.rectangle(marginX + boxW / 2, inputY + rowH / 2, boxW, rowH, 0x000000, 0)
      .setDepth(10).setInteractive({ useHandCursor: true });

    hitInput.on('pointerdown', () => { focused = true;  drawInputBg(true); });
    scene.input.on('pointerdown', (ptr, objs) => {
      if (!objs.includes(hitInput)) { focused = false; drawInputBg(false); }
    });

    scene.input.keyboard.on('keydown', (e) => {
      if (!focused) return;
      if (e.key === 'Backspace') inputValue = inputValue.slice(0, -1);
      else if (e.key.length === 1) inputValue += e.key;
      updateDisplay();
    });
    scene.input.keyboard.on('keydown-V', (e) => {
      if (!focused) return;
      if (e.ctrlKey || e.metaKey) {
        navigator.clipboard?.readText().then(text => { inputValue = text.trim(); updateDisplay(); });
      }
    });

    scene.makeButton(rightBtnX, inputY + rowH / 2, btnW, rowH, '로드', () => {
      const val = inputValue.trim();
      if (!val) { scene.showToast(cx, H * 0.5, '코드를 입력해주세요'); return; }
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(val))));
        if (decoded.game)     SaveManager.save(decoded.game);
        if (decoded.settings) {
          SaveManager.saveSettings(decoded.settings);
          if (decoded.settings.font) {
            localStorage.setItem('settings_font', decoded.settings.font);
            FontManager.setActive(decoded.settings.font);
          }
        }
        scene.showToast(cx, H * 0.5, '불러오기 완료');
      } catch (e) {
        scene.showToast(cx, H * 0.5, '잘못된 코드입니다');
      }
    });

    return inputY + rowH;
  },

  _buildReset(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY) {
    const sectionY = startY;

    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x221508, 0.8);
    sep.lineBetween(marginX, sectionY - H * 0.02, marginX + boxW + btnW + W * 0.04, sectionY - H * 0.02);

    scene.add.text(marginX, sectionY, '[ 초기화 ]', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(marginX, sectionY + H * 0.038, '모든 저장 데이터와 설정을 삭제합니다', {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#4a2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.makeButton(rightBtnX, sectionY + H * 0.019, btnW, btnH, '초기화', () => {
      scene.showConfirmPopup(cx, H, '모든 데이터를 초기화하겠습니까?', () => {
        SaveManager.reset();
        InputManager.resetToDefaults();
        AudioManager.resetToDefaults?.();
        localStorage.removeItem('settings_font');
        scene.showToast(cx, H * 0.5, '초기화 완료', () => {
          scene.scene.start('LobbyScene');
        });
      });
    }, true);
  },
};
