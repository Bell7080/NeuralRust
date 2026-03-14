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
//  레이아웃 원칙:
//    rowH   = H * 0.055  (하드코딩 40px 제거)
//    boxW   = W 비례
//    섹션 간격 = H 비례
//    하드코딩 px 없음.
// ================================================================

const Settings_Tab_Save = {

  build(scene, W, H, cx) {
    const marginX    = W * 0.06;
    const boxW       = W * 0.76;
    const btnW       = W * 0.09;
    const btnH       = Math.max(36, Math.round(H * 0.055));
    const rightBtnX  = marginX + boxW + (W * 0.94 - (marginX + boxW)) / 2;
    const startY     = H * 0.295;

    this._buildExportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY);
    this._buildImportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY);
    this._buildReset(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY);
  },

  // ── 내보내기 ──────────────────────────────────────────────────
  _buildExportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY) {
    const sectionY = startY;
    const rowH     = btnH;
    const rowY     = sectionY + H * 0.035;

    scene.add.text(marginX, sectionY, '[ 내 저장 코드 ]', {
      fontSize: scaledFontSize(15, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const gameData     = SaveManager.load();
    const settingsData = SaveManager.loadSettings();
    const exportCode   = btoa(unescape(encodeURIComponent(JSON.stringify({ game: gameData, settings: settingsData }))));

    // 코드 박스
    const codeBox = scene.add.graphics();
    codeBox.fillStyle(0x0e0a06, 1);
    codeBox.lineStyle(1, 0x2a1a0a, 0.8);
    codeBox.strokeRect(marginX, rowY, boxW, rowH);
    codeBox.fillRect(marginX, rowY, boxW, rowH);

    const display = exportCode.length > 58 ? exportCode.substring(0, 58) + '…' : exportCode;
    scene.add.text(marginX + W * 0.012, rowY + rowH / 2, display, {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#5a3820',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.makeButton(rightBtnX, rowY + rowH / 2, btnW, rowH, '복사', () => {
      navigator.clipboard?.writeText(exportCode)
        .then(() => scene.showToast(cx, H * 0.5, '복사 완료'))
        .catch(() => scene.showToast(cx, H * 0.5, '수동으로 복사해주세요'));
    });
  },

  // ── 불러오기 ──────────────────────────────────────────────────
  _buildImportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY) {
    const sectionY = startY + H * 0.175;
    const rowH     = btnH;
    const inputY   = sectionY + H * 0.035;

    scene.add.text(marginX, sectionY, '[ 저장 코드로 불러오기 ]', {
      fontSize: scaledFontSize(15, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // 입력창 배경
    const inputBg = scene.add.graphics();
    const drawInputBg = (focused) => {
      inputBg.clear();
      inputBg.fillStyle(0x0e0a06, 1);
      inputBg.lineStyle(1, focused ? 0x6b3820 : 0x2a1a0a, focused ? 1 : 0.8);
      inputBg.strokeRect(marginX, inputY, boxW, rowH);
      inputBg.fillRect(marginX, inputY, boxW, rowH);
    };
    drawInputBg(false);

    let inputValue  = '';
    const placeholder = '여기에 저장 코드를 입력하세요…';

    const inputText = scene.add.text(marginX + W * 0.012, inputY + rowH / 2, placeholder, {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(10);

    const cursor = scene.add.text(marginX + W * 0.012, inputY + rowH / 2, '|', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#8a6040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(10).setAlpha(0);

    let cursorVisible = false;
    let focused = false;

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
        const shown = inputValue.length > 58 ? inputValue.substring(0, 58) + '…' : inputValue;
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
  },

  // ── 초기화 ────────────────────────────────────────────────────
  _buildReset(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY) {
    const sectionY = startY + H * 0.175 * 2;

    // 구분선
    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x221508, 0.8);
    sep.lineBetween(marginX, sectionY - H * 0.02, marginX + boxW + btnW + W * 0.04, sectionY - H * 0.02);

    scene.add.text(marginX, sectionY, '[ 초기화 ]', {
      fontSize: scaledFontSize(15, scene.scale),
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
        SaveManager.deleteAll();
        localStorage.removeItem('settings_font');
        InputManager.resetToDefaults();
        FontManager.setActive('kirang');
        scene._cleanup();
        scene.showToast(cx, H * 0.5, '초기화 완료', () => {
          scene.scene.restart({ from: scene.fromScene, tab: 'save' });
        }, '#cc5533');
      });
    }, true);
  },
};
