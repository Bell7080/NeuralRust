// ================================================================
//  Settings_Tab_Save.ts
//  경로: src/Scenes/Settings/Settings_Tab_Save.ts
//
//  역할: 설정 > 저장 탭 (저장 코드 내보내기 / 불러오기 / 초기화)
// ================================================================

import { FontManager }    from '../../Managers/FontManager';
import { SaveManager }    from '../../Managers/SaveManager';
import { InputManager }   from '../../Managers/InputManager';
import { AudioManager }   from '../../Managers/AudioManager';
import { CharacterManager } from '../../Managers/CharacterManager';
import type { ISettingsScene } from './_types';

export const Settings_Tab_Save = {

  build(scene: ISettingsScene, W: number, H: number, cx: number): void {
    const marginX   = W * 0.06;
    const boxW      = W * 0.76;
    const btnW      = W * 0.09;
    const btnH      = Math.max(28, Math.round(H * 0.055));
    const rightBtnX = marginX + boxW + (W * 0.94 - (marginX + boxW)) / 2;
    const startY    = H * 0.310;
    const secGap    = H * 0.055;

    const exportEndY = this._buildExportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, startY);
    const importEndY = this._buildImportCode(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, exportEndY + secGap);
    this._buildReset(scene, W, H, cx, marginX, boxW, btnW, btnH, rightBtnX, importEndY + secGap);
  },

  _buildExportCode(
    scene: ISettingsScene, W: number, H: number, cx: number,
    marginX: number, boxW: number, btnW: number, btnH: number,
    rightBtnX: number, startY: number,
  ): number {
    const sectionY = startY;
    const rowH     = Math.round(btnH * 1.1);
    const rowY     = sectionY + H * 0.038;

    scene.add.text(marginX, sectionY, '[ 내 저장 코드 ]', {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#5a3518',
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

    const display = exportCode.length > 50 ? exportCode.substring(0, 50) + '…' : exportCode;
    scene.add.text(marginX + W * 0.012, rowY + rowH / 2, display, {
      fontSize:   FontManager.adjustedSize(16, scene.scale),
      color:      '#5a3820',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.makeButton(rightBtnX, rowY + rowH / 2, btnW, rowH, '복사', () => {
      navigator.clipboard?.writeText(exportCode)
        .then(() => scene.showToast(cx, H * 0.5, '복사 완료'))
        .catch(() => scene.showToast(cx, H * 0.5, '수동으로 복사해주세요'));
    });

    return rowY + rowH;
  },

  _buildImportCode(
    scene: ISettingsScene, W: number, H: number, cx: number,
    marginX: number, boxW: number, btnW: number, btnH: number,
    rightBtnX: number, startY: number,
  ): number {
    const sectionY = startY;
    const rowH     = Math.round(btnH * 1.1);
    const inputY   = sectionY + H * 0.038;

    scene.add.text(marginX, sectionY, '[ 저장 코드로 불러오기 ]', {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const inputBg = scene.add.graphics();
    const drawInputBg = (focused: boolean) => {
      inputBg.clear();
      inputBg.fillStyle(0x0e0a06, 1);
      inputBg.lineStyle(1, focused ? 0x6b3820 : 0x2a1a0a, focused ? 1 : 0.8);
      inputBg.strokeRect(marginX, inputY, boxW, rowH);
      inputBg.fillRect(marginX, inputY, boxW, rowH);
    };
    drawInputBg(false);

    let inputValue    = '';
    const placeholder = '여기에 저장 코드를 입력하세요…';

    const inputText = scene.add.text(marginX + W * 0.012, inputY + rowH / 2, placeholder, {
      fontSize:   FontManager.adjustedSize(16, scene.scale),
      color:      '#3d2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(10);

    const cursor = scene.add.text(marginX + W * 0.012, inputY + rowH / 2, '|', {
      fontSize:   FontManager.adjustedSize(17, scene.scale),
      color:      '#8a6040',
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
        inputText.setText(placeholder).setStyle({ color: '#3d2810' });
        cursor.setAlpha(0);
      } else {
        const shown = inputValue.length > 50 ? inputValue.substring(0, 50) + '…' : inputValue;
        inputText.setText(shown).setStyle({ color: '#7a5028' });
        cursor.setX(marginX + W * 0.012 + inputText.width + 2);
      }
    };

    const hitInput = scene.add.rectangle(marginX + boxW / 2, inputY + rowH / 2, boxW, rowH, 0x000000, 0)
      .setDepth(10).setInteractive({ useHandCursor: true });

    hitInput.on('pointerdown', () => { focused = true;  drawInputBg(true); });
    scene.input.on('pointerdown', (_ptr: Phaser.Input.Pointer, objs: Phaser.GameObjects.GameObject[]) => {
      if (!objs.includes(hitInput)) { focused = false; drawInputBg(false); }
    });

    scene.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (!focused) return;
      if (e.key === 'Backspace') inputValue = inputValue.slice(0, -1);
      else if (e.key.length === 1) inputValue += e.key;
      updateDisplay();
    });
    scene.input.keyboard!.on('keydown-V', (e: KeyboardEvent) => {
      if (!focused) return;
      if (e.ctrlKey || e.metaKey) {
        navigator.clipboard?.readText().then(text => { inputValue = text.trim(); updateDisplay(); });
      }
    });

    scene.makeButton(rightBtnX, inputY + rowH / 2, btnW, rowH, '로드', () => {
      const val = inputValue.trim();
      if (!val) { scene.showToast(cx, H * 0.5, '코드를 입력해주세요'); return; }
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(val)))) as {
          game?:     unknown;
          settings?: { font?: string } & Record<string, unknown>;
        };
        if (decoded.game)     SaveManager.save(decoded.game as Parameters<typeof SaveManager.save>[0]);
        if (decoded.settings) {
          SaveManager.saveSettings(decoded.settings);
          if (decoded.settings.font) {
            localStorage.setItem('settings_font', decoded.settings.font);
            FontManager.setActive(decoded.settings.font as 'kirang' | 'game' | 'system');
          }
        }
        scene.showToast(cx, H * 0.5, '불러오기 완료');
      } catch (_e) {
        scene.showToast(cx, H * 0.5, '잘못된 코드입니다');
      }
    });

    return inputY + rowH;
  },

  _buildReset(
    scene: ISettingsScene, W: number, H: number, cx: number,
    marginX: number, boxW: number, btnW: number, btnH: number,
    rightBtnX: number, startY: number,
  ): void {
    const sectionY = startY;

    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x221508, 0.8);
    sep.lineBetween(marginX, sectionY - H * 0.02, marginX + boxW + btnW + W * 0.04, sectionY - H * 0.02);

    scene.add.text(marginX, sectionY, '[ 초기화 ]', {
      fontSize:   FontManager.adjustedSize(18, scene.scale),
      color:      '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.add.text(marginX, sectionY + H * 0.038, '모든 저장 데이터와 설정을 삭제합니다', {
      fontSize:   FontManager.adjustedSize(13, scene.scale),
      color:      '#4a2810',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    scene.makeButton(rightBtnX, sectionY + H * 0.019, btnW, btnH, '초기화', () => {
      scene.showConfirmPopup(cx, H, '모든 데이터를 초기화하겠습니까?', () => {
        SaveManager.deleteSave();
        SaveManager.deleteSettings();

        localStorage.removeItem(SaveManager.STORY_KEY);

        InputManager.resetToDefaults();

        if (typeof (AudioManager as unknown as { resetToDefaults?: () => void }).resetToDefaults === 'function') {
          (AudioManager as unknown as { resetToDefaults: () => void }).resetToDefaults();
        } else {
          localStorage.removeItem('neural_rust_audio');
        }

        localStorage.removeItem('settings_font');

        CharacterManager.saveAll([]);
        localStorage.removeItem('nr_squad');
        localStorage.removeItem('nr_record_chips');
        localStorage.removeItem('nr_party');

        scene.showToast(cx, H * 0.5, '초기화 완료', () => {
          scene.scene.start('LobbyScene');
        });
      });
    }, true);
  },
};
