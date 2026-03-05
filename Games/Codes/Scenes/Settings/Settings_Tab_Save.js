// ================================================================
//  Settings_Tab_Save.js
//  경로: Games/Codes/Scenes/Settings/Settings_Tab_Save.js
//
//  역할: 설정 > 저장 탭 (저장 코드 내보내기 / 불러오기 / 초기화)
//  호출: Settings_Tab_Save.build(scene, W, H, cx)
//  의존: FontManager, SaveManager, InputManager, AudioManager, utils.js
//        scene.makeButton / scene.showConfirmPopup / scene.showToast
//        scene.fromScene / scene._cursorTimer (cleanup용)
// ================================================================

const Settings_Tab_Save = {

  build(scene, W, H, cx) {
    const boxX      = W * 0.08;
    const boxW      = W * 0.76;
    const btnW      = W * 0.10;
    const rightBtnX = boxX + boxW + (W * 0.92 - (boxX + boxW)) / 2;
    const rowH      = 40;
    const startY    = H * 0.30;

    this._buildExportCode(scene, W, H, cx, boxX, boxW, btnW, rightBtnX, rowH, startY);
    this._buildImportCode(scene, W, H, cx, boxX, boxW, btnW, rightBtnX, rowH, startY);
    this._buildReset(scene, W, H, cx, boxX, boxW, btnW, rightBtnX, rowH, startY);
  },

  // ── 내보내기 ──────────────────────────────────────────────────
  _buildExportCode(scene, W, H, cx, boxX, boxW, btnW, rightBtnX, rowH, startY) {
    scene.add.text(boxX, startY, '[ 내 저장 코드 ]', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const gameData      = SaveManager.load();
    const settingsData  = SaveManager.loadSettings();
    const exportCode    = btoa(unescape(encodeURIComponent(JSON.stringify({ game: gameData, settings: settingsData }))));

    const rowY = startY + 18;
    const codeBox = scene.add.graphics();
    codeBox.fillStyle(0x0d0905, 1);
    codeBox.lineStyle(1, 0x2a1a0a, 0.8);
    codeBox.strokeRect(boxX, rowY, boxW, rowH);
    codeBox.fillRect(boxX, rowY, boxW, rowH);

    const display = exportCode.length > 55 ? exportCode.substring(0, 55) + '…' : exportCode;
    scene.add.text(boxX + 10, rowY + rowH / 2, display, {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#4a3020',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.makeButton(rightBtnX, rowY + rowH / 2, btnW, rowH, '복사', () => {
      navigator.clipboard?.writeText(exportCode)
        .then(() => scene.showToast(cx, H * 0.5, '복사 완료'))
        .catch(() => scene.showToast(cx, H * 0.5, '수동으로 복사해주세요'));
    });
  },

  // ── 불러오기 ──────────────────────────────────────────────────
  _buildImportCode(scene, W, H, cx, boxX, boxW, btnW, rightBtnX, rowH, startY) {
    const loadY  = startY + H * 0.20;
    const inputY = loadY + 18;

    scene.add.text(boxX, loadY, '[ 저장 코드로 불러오기 ]', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const inputBg = scene.add.graphics();
    const drawInputBg = (focused) => {
      inputBg.clear();
      inputBg.fillStyle(0x0d0905, 1);
      inputBg.lineStyle(1, focused ? 0x5a3018 : 0x2a1a0a, focused ? 1 : 0.8);
      inputBg.strokeRect(boxX, inputY, boxW, rowH);
      inputBg.fillRect(boxX, inputY, boxW, rowH);
    };
    drawInputBg(false);

    let inputValue = '';
    const placeholder = '여기에 저장 코드를 입력하세요…';

    const inputText = scene.add.text(boxX + 10, inputY + rowH / 2, placeholder, {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(10);

    const cursor = scene.add.text(boxX + 10, inputY + rowH / 2, '|', {
      fontSize: scaledFontSize(13, scene.scale),
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
        inputText.setText(placeholder).setStyle({ fill: '#251508' });
        cursor.setAlpha(0);
      } else {
        const shown = inputValue.length > 55 ? inputValue.substring(0, 55) + '…' : inputValue;
        inputText.setText(shown).setStyle({ fill: '#6b4020' });
        cursor.setX(boxX + 10 + inputText.width + 2);
      }
    };

    const hitInput = scene.add.rectangle(boxX + boxW / 2, inputY + rowH / 2, boxW, rowH, 0x000000, 0)
      .setDepth(10).setInteractive({ useHandCursor: true });

    hitInput.on('pointerdown', () => { focused = true;  drawInputBg(true);  });
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
  _buildReset(scene, W, H, cx, boxX, boxW, btnW, rightBtnX, rowH, startY) {
    const loadY  = startY + H * 0.20;
    const resetY = loadY + H * 0.22;

    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x1e1008, 1);
    sep.lineBetween(boxX, resetY - 14, W * 0.92, resetY - 14);

    scene.add.text(boxX, resetY, '[ 초기화 ]', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(boxX, resetY + 22, '모든 저장 데이터와 설정을 삭제합니다', {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.makeButton(rightBtnX, resetY + 11, btnW, rowH, '초기화', () => {
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
