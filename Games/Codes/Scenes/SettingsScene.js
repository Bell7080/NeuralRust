// ================================================================
//  SettingsScene.js
//  경로: Games/Codes/Scenes/SettingsScene.js
//
//  역할: 설정 화면 — 폰트 / 비디오 / 키 설정 / 저장 탭
//  의존: FontManager, SaveManager, InputManager, utils.js
// ================================================================

// ── Neural Rust 컬러 팔레트 (중앙 관리) ─────────────────────────
// BG       #050407   베이스 배경
// GRID     #0f0a05   그리드 선
// BORDER   #2a1a0a   테두리/구분선
// DIM      #1e1008   어두운 텍스트
// MID      #3d2010   중간 텍스트
// ACCENT   #a05018   주요 강조 (녹슨 주황)
// BRIGHT   #c8a070   밝은 강조 (동판)
// TEXT     #c8bfb0   주 텍스트

class SettingsScene extends Phaser.Scene {
  constructor() { super({ key: 'SettingsScene' }); }

  init(data) {
    this.fromScene  = data.from || this.fromScene || 'LobbyScene';
    this._activeTab = data.tab  || this._activeTab || 'font';
  }

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const cx = W / 2;

    InputManager.reinit(this);

    this._buildBackground(W, H);
    this._buildTitle(W, H, cx);
    this._buildTabs(W, H, cx);
    this._buildBackButton(W, H);

    this._fsHandler = () => {
      if (this._activeTab === 'video') {
        this._removeInputEl();
        this.scene.restart({ from: this.fromScene, tab: 'video' });
      }
    };
    document.addEventListener('fullscreenchange',       this._fsHandler);
    document.addEventListener('webkitfullscreenchange', this._fsHandler);
  }

  shutdown() {
    this._removeInputEl();
    if (InputManager._rebindListener) InputManager._cancelRebind();
    if (this._fsHandler) {
      document.removeEventListener('fullscreenchange',       this._fsHandler);
      document.removeEventListener('webkitfullscreenchange', this._fsHandler);
    }
  }

  _removeInputEl() {
    if (this._cursorTimer) { this._cursorTimer.remove(); this._cursorTimer = null; }
    this._inputEl = null;
  }

  // ── 배경 ──────────────────────────────────────────────────────
  _buildBackground(W, H) {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x1a0e06, 0.25);
      scan.lineBetween(0, y, W, y);
    }

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x0f0a05, 0.6);
    const step = Math.round(W / 56);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
  }

  // ── 타이틀 ────────────────────────────────────────────────────
  _buildTitle(W, H, cx) {
    this.add.text(cx, H * 0.09, '설  정', {
      fontSize: scaledFontSize(30, this.scale),
      fill: '#6b4020',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    this.add.text(cx, H * 0.09 + parseInt(scaledFontSize(22, this.scale)), 'SETTINGS', {
      fontSize: scaledFontSize(9, this.scale),
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
      letterSpacing: 5,
    }).setOrigin(0.5);
  }

  // ── 탭 ────────────────────────────────────────────────────────
  _buildTabs(W, H, cx) {
    const tabY   = H * 0.20;
    const tabW   = W * 0.14;
    const tabH   = parseInt(scaledFontSize(34, this.scale));
    const gap    = W * 0.015;

    const tabs = [
      { key: 'font',  label: '폰트'   },
      { key: 'video', label: '비디오'  },
      { key: 'keys',  label: '키 설정' },
      { key: 'save',  label: '저장'   },
    ];

    const totalW = tabW * tabs.length + gap * (tabs.length - 1);
    const startX = cx - totalW / 2;

    tabs.forEach((tab, i) => {
      const tx       = startX + i * (tabW + gap);
      const selected = this._activeTab === tab.key;
      const bg       = this.add.graphics();
      this._drawTabBg(bg, tx, tabY, tabW, tabH, selected);

      this.add.text(tx + tabW / 2, tabY + tabH / 2, tab.label, {
        fontSize: scaledFontSize(11, this.scale),
        fill: selected ? '#c8a070' : '#3d2010',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5);

      const hit = this.add.rectangle(tx + tabW / 2, tabY + tabH / 2, tabW, tabH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (this._activeTab !== tab.key) this._drawTabBg(bg, tx, tabY, tabW, tabH, false, true);
      });
      hit.on('pointerout', () => {
        if (this._activeTab !== tab.key) this._drawTabBg(bg, tx, tabY, tabW, tabH, false, false);
      });
      hit.on('pointerdown', () => {
        if (this._activeTab === tab.key) return;
        if (InputManager._rebindListener) InputManager._cancelRebind();
        this._removeInputEl();
        this.scene.restart({ from: this.fromScene, tab: tab.key });
      });
    });

    const line = this.add.graphics();
    line.lineStyle(1, 0x2a1a0a, 1);
    line.lineBetween(W * 0.05, tabY + tabH + 2, W * 0.95, tabY + tabH + 2);

    if (this._activeTab === 'font')  this._buildFontTab(W, H, cx);
    if (this._activeTab === 'video') this._buildVideoTab(W, H, cx);
    if (this._activeTab === 'keys')  this._buildKeysTab(W, H, cx);
    if (this._activeTab === 'save')  this._buildSaveTab(W, H, cx);
  }

  _drawTabBg(gfx, x, y, w, h, selected, hover = false) {
    gfx.clear();
    if (selected)   { gfx.fillStyle(0x1e1008, 1); gfx.lineStyle(1, 0x4a2810, 0.9); }
    else if (hover) { gfx.fillStyle(0x140c05, 1); gfx.lineStyle(1, 0x2a1a0a, 0.7); }
    else            { gfx.fillStyle(0x000000, 0); gfx.lineStyle(1, 0x1a0e06, 0.5); }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
  }

  // ══════════════════════════════════════════════════════════════
  //  폰트 탭
  // ══════════════════════════════════════════════════════════════
  _buildFontTab(W, H, cx) {
    this.add.text(W * 0.08, H * 0.32, '[ 폰트 ]', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const saved = localStorage.getItem('settings_font') || 'game';
    this._currentFont = saved;

    const options = [
      { key: 'game',   label: 'NeoDunggeunmoPro', desc: '게임 전용 도트 폰트',      family: "'NeoDunggeunmoPro', monospace" },
      { key: 'system', label: 'System Default',   desc: '브라우저 기본 시스템 폰트', family: 'Arial, sans-serif' },
    ];

    const baseY = H * 0.42;
    const gap   = H * 0.15;
    options.forEach((opt, i) => this._makeFontOption(opt, W, baseY + gap * i, cx));
    this._buildPreview(W, H, cx);
  }

  _makeFontOption(opt, W, y, cx) {
    const isSelected = this._currentFont === opt.key;
    const box = this.add.graphics();
    this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, isSelected);

    const nameText = this.add.text(W * 0.13, y - 8, opt.label, {
      fontSize: scaledFontSize(15, this.scale),
      fill: isSelected ? '#c8a070' : '#3d2010',
      fontFamily: opt.family,
    }).setOrigin(0, 0.5);

    this.add.text(W * 0.13, y + 10, opt.desc, {
      fontSize: scaledFontSize(10, this.scale),
      fill: isSelected ? '#4a2810' : '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this.add.text(W * 0.09, y, isSelected ? '▶' : '·', {
      fontSize: scaledFontSize(11, this.scale),
      fill: isSelected ? '#a05018' : '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const hit = this.add.rectangle(cx, y, W * 0.84, 56, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      if (this._currentFont !== opt.key) {
        this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, true);
        nameText.setStyle({ fill: '#8a6040' });
      }
    });
    hit.on('pointerout', () => {
      if (this._currentFont !== opt.key) {
        this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, false);
        nameText.setStyle({ fill: '#3d2010' });
      }
    });
    hit.on('pointerdown', () => {
      this._currentFont = opt.key;
      localStorage.setItem('settings_font', opt.key);
      SaveManager.saveSettings({ font: opt.key });
      FontManager.setActive(opt.key);
      this.scene.restart({ from: this.fromScene, tab: 'font' });
    });
  }

  _buildPreview(W, H, cx) {
    const py = H * 0.76;
    const line = this.add.graphics();
    line.lineStyle(1, 0x1e1008, 1);
    line.lineBetween(W * 0.1, py - 20, W * 0.9, py - 20);

    this.add.text(W * 0.08, py, '미리보기', {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this.add.text(cx, py + 26, 'NEURAL RUST — 뉴럴 러스트 — ABC 123', {
      fontSize: scaledFontSize(16, this.scale),
      fill: '#6b4020',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    this.add.text(cx, py + 54, '소프트웨어만 살아남은 세계, 붕괴 후 102년', {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.BODY,
    }).setOrigin(0.5, 0);
  }

  // ══════════════════════════════════════════════════════════════
  //  비디오 탭
  // ══════════════════════════════════════════════════════════════
  _buildVideoTab(W, H, cx) {
    const isFullscreen = !!document.fullscreenElement;

    this.add.text(W * 0.08, H * 0.32, '[ 화면 모드 ]', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const options = [
      { key: 'fullscreen', label: '전체화면', desc: 'F11 또는 이 항목으로 전환' },
      { key: 'windowed',   label: '창  모  드', desc: '창 모드로 전환' },
    ];

    const baseY = H * 0.42;
    const gap   = H * 0.15;

    options.forEach((opt, i) => {
      const y          = baseY + gap * i;
      const isSelected = isFullscreen ? opt.key === 'fullscreen' : opt.key === 'windowed';

      const box = this.add.graphics();
      this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, isSelected);

      const nameText = this.add.text(W * 0.13, y - 8, opt.label, {
        fontSize: scaledFontSize(15, this.scale),
        fill: isSelected ? '#c8a070' : '#3d2010',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0.5);

      this.add.text(W * 0.13, y + 10, opt.desc, {
        fontSize: scaledFontSize(10, this.scale),
        fill: isSelected ? '#4a2810' : '#251508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      this.add.text(W * 0.09, y, isSelected ? '▶' : '·', {
        fontSize: scaledFontSize(11, this.scale),
        fill: isSelected ? '#a05018' : '#251508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      const hit = this.add.rectangle(cx, y, W * 0.84, 56, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!isSelected) {
          this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, true);
          nameText.setStyle({ fill: '#8a6040' });
        }
      });
      hit.on('pointerout', () => {
        if (!isSelected) {
          this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, false);
          nameText.setStyle({ fill: '#3d2010' });
        }
      });
      hit.on('pointerdown', () => {
        if (isSelected) return;
        if (opt.key === 'fullscreen') {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      });
    });

    this.add.text(cx, H * 0.72, 'F11 키로도 전체화면을 전환할 수 있습니다', {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
  }

  // ══════════════════════════════════════════════════════════════
  //  키 설정 탭
  // ══════════════════════════════════════════════════════════════
  _buildKeysTab(W, H, cx) {
    const actions   = InputManager.ACTIONS;
    const colCount  = 2;
    const startY    = H * 0.30;
    const rowH      = H * 0.072;
    const colW      = W * 0.42;
    const leftX     = W * 0.06;
    const rightX    = W * 0.52;

    this.add.text(leftX, H * 0.26, '[ 키 설정 ]', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this.add.text(W - leftX, H * 0.26, 'ESC — 변경 취소', {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    const waitText = this.add.text(cx, H * 0.88, '', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#a05018',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(50);

    const rowObjects = [];

    actions.forEach((action, i) => {
      const col   = i % colCount;
      const row   = Math.floor(i / colCount);
      const baseX = col === 0 ? leftX : rightX;
      const y     = startY + row * rowH;

      const obj = this._makeKeyRow(action, baseX, y, colW, rowH, waitText, cx, H, rowObjects, i);
      rowObjects.push(obj);
    });

    const resetY = startY + Math.ceil(actions.length / colCount) * rowH + H * 0.04;
    this._makeButton(cx, resetY, W * 0.22, 32, '기본값으로 초기화', () => {
      this._showConfirmPopup(cx, H, '키 설정을 기본값으로 되돌리겠습니까?', () => {
        InputManager.resetToDefaults();
        this._showToast(cx, H * 0.5, '초기화 완료', () => {
          this.scene.restart({ from: this.fromScene, tab: 'keys' });
        });
      });
    }, false);
  }

  _makeKeyRow(action, baseX, y, colW, rowH, waitText, cx, H, rowObjects, idx) {
    const labelX  = baseX + colW * 0.04;
    const keyBtnX = baseX + colW * 0.72;
    const keyBtnW = colW * 0.26;
    const rowPad  = 6;

    const rowBg = this.add.graphics();
    const drawRowBg = (hover) => {
      rowBg.clear();
      rowBg.fillStyle(hover ? 0x120a04 : 0x000000, hover ? 1 : 0);
      rowBg.lineStyle(1, 0x1e1008, 0.4);
      rowBg.fillRect(baseX, y - rowH / 2 + rowPad, colW, rowH - rowPad * 2);
      rowBg.strokeRect(baseX, y - rowH / 2 + rowPad, colW, rowH - rowPad * 2);
    };
    drawRowBg(false);

    this.add.text(labelX, y, action.label, {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#4a3020',
      fontFamily: FontManager.BODY,
    }).setOrigin(0, 0.5);

    const keyBg   = this.add.graphics();
    const keyText = this.add.text(keyBtnX, y, InputManager.displayName(action.key), {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#8a6040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const drawKeyBg = (state) => {
      keyBg.clear();
      const colors = {
        normal:  { fill: 0x140c05, line: 0x3d2010 },
        hover:   { fill: 0x1e1008, line: 0x6b3818 },
        waiting: { fill: 0x1a1000, line: 0x8a5010 },
      };
      const c = colors[state] || colors.normal;
      keyBg.fillStyle(c.fill, 1);
      keyBg.lineStyle(1, c.line, 0.9);
      keyBg.fillRect(keyBtnX - keyBtnW / 2, y - 13, keyBtnW, 26);
      keyBg.strokeRect(keyBtnX - keyBtnW / 2, y - 13, keyBtnW, 26);
    };
    drawKeyBg('normal');

    const hit = this.add.rectangle(baseX + colW / 2, y, colW, rowH - rowPad * 2, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    let isWaiting = false;

    hit.on('pointerover', () => {
      if (!isWaiting) { drawRowBg(true); drawKeyBg('hover'); }
    });
    hit.on('pointerout', () => {
      if (!isWaiting) { drawRowBg(false); drawKeyBg('normal'); }
    });
    hit.on('pointerdown', () => {
      if (InputManager._rebindTarget) return;

      isWaiting = true;
      drawRowBg(false);
      drawKeyBg('waiting');
      keyText.setText('?').setStyle({ fill: '#c87830' });
      waitText.setText(`'${action.label}' — 새 키를 누르세요  (ESC: 취소)`);

      InputManager.startRebind(action.key, (newKey) => {
        isWaiting = false;
        if (newKey) {
          keyText.setText(InputManager.displayName(action.key)).setStyle({ fill: '#8a6040' });
          rowObjects.forEach((obj) => {
            if (obj && obj.keyText && obj.actionKey) {
              obj.keyText.setText(InputManager.displayName(obj.actionKey));
            }
          });
        } else {
          keyText.setText(InputManager.displayName(action.key)).setStyle({ fill: '#8a6040' });
        }
        drawRowBg(false);
        drawKeyBg('normal');
        waitText.setText('');
      });
    });

    return { keyText, actionKey: action.key };
  }

  // ══════════════════════════════════════════════════════════════
  //  저장 탭
  // ══════════════════════════════════════════════════════════════
  _buildSaveTab(W, H, cx) {
    const startY    = H * 0.30;
    const boxX      = W * 0.08;
    const boxW      = W * 0.76;
    const btnW      = W * 0.10;
    const rightBtnX = boxX + boxW + (W * 0.92 - (boxX + boxW)) / 2;

    this.add.text(boxX, startY, '[ 내 저장 코드 ]', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const gameData      = SaveManager.load();
    const settingsData  = SaveManager.loadSettings();
    const exportPayload = { game: gameData, settings: settingsData };
    const exportCode    = btoa(unescape(encodeURIComponent(JSON.stringify(exportPayload))));

    const rowH = 40;
    const rowY = startY + 18;

    const codeBox = this.add.graphics();
    codeBox.fillStyle(0x0d0905, 1);
    codeBox.lineStyle(1, 0x2a1a0a, 0.8);
    codeBox.strokeRect(boxX, rowY, boxW, rowH);
    codeBox.fillRect(boxX, rowY, boxW, rowH);

    const displayCode = exportCode.length > 55 ? exportCode.substring(0, 55) + '…' : exportCode;
    this.add.text(boxX + 10, rowY + rowH / 2, displayCode, {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#4a3020',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this._makeButton(rightBtnX, rowY + rowH / 2, btnW, rowH, '복사', () => {
      navigator.clipboard?.writeText(exportCode)
        .then(()  => this._showToast(cx, H * 0.5, '복사 완료'))
        .catch(()  => this._showToast(cx, H * 0.5, '수동으로 복사해주세요'));
    });

    // ── 불러오기 ──────────────────────────────────────────────
    const loadY  = startY + H * 0.20;
    const inputY = loadY + 18;

    this.add.text(boxX, loadY, '[ 저장 코드로 불러오기 ]', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const inputBg = this.add.graphics();
    inputBg.fillStyle(0x0d0905, 1);
    inputBg.lineStyle(1, 0x2a1a0a, 0.8);
    inputBg.strokeRect(boxX, inputY, boxW, rowH);
    inputBg.fillRect(boxX, inputY, boxW, rowH);

    let inputValue = '';
    const placeholder = '여기에 저장 코드를 입력하세요…';

    const inputText = this.add.text(boxX + 10, inputY + rowH / 2, placeholder, {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(10);

    const cursor = this.add.text(boxX + 10, inputY + rowH / 2, '|', {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#8a6040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(10).setAlpha(0);

    let cursorVisible = false;
    this._inputFocused = false;
    this._cursorTimer = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        cursorVisible = !cursorVisible;
        if (inputValue.length > 0 && this._inputFocused)
          cursor.setAlpha(cursorVisible ? 1 : 0);
      }
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

    const hitInput = this.add.rectangle(boxX + boxW / 2, inputY + rowH / 2, boxW, rowH, 0x000000, 0)
      .setDepth(10).setInteractive({ useHandCursor: true });
    hitInput.on('pointerdown', () => {
      this._inputFocused = true;
      inputBg.clear();
      inputBg.fillStyle(0x0d0905, 1);
      inputBg.lineStyle(1, 0x5a3018, 1);
      inputBg.strokeRect(boxX, inputY, boxW, rowH);
      inputBg.fillRect(boxX, inputY, boxW, rowH);
    });
    this.input.on('pointerdown', (ptr, objs) => {
      if (!objs.includes(hitInput)) {
        this._inputFocused = false;
        inputBg.clear();
        inputBg.fillStyle(0x0d0905, 1);
        inputBg.lineStyle(1, 0x2a1a0a, 0.8);
        inputBg.strokeRect(boxX, inputY, boxW, rowH);
        inputBg.fillRect(boxX, inputY, boxW, rowH);
      }
    });

    this.input.keyboard.on('keydown', (e) => {
      if (!this._inputFocused) return;
      if (e.key === 'Backspace') inputValue = inputValue.slice(0, -1);
      else if (e.key.length === 1) inputValue += e.key;
      updateDisplay();
    });
    this.input.keyboard.on('keydown-V', (e) => {
      if (!this._inputFocused) return;
      if (e.ctrlKey || e.metaKey) {
        navigator.clipboard?.readText().then(text => {
          inputValue = text.trim();
          updateDisplay();
        });
      }
    });

    const el = { get value() { return inputValue; } };
    this._inputEl = null;

    this._makeButton(rightBtnX, inputY + rowH / 2, btnW, rowH, '로드', () => {
      const val = el.value.trim();
      if (!val) { this._showToast(cx, H * 0.5, '코드를 입력해주세요'); return; }
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
        this._showToast(cx, H * 0.5, '불러오기 완료');
      } catch (e) {
        this._showToast(cx, H * 0.5, '잘못된 코드입니다');
      }
    });

    // ── 초기화 ────────────────────────────────────────────────
    const resetY = loadY + H * 0.22;
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x1e1008, 1);
    sep.lineBetween(boxX, resetY - 14, W * 0.92, resetY - 14);

    this.add.text(boxX, resetY, '[ 초기화 ]', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this.add.text(boxX, resetY + 22, '모든 저장 데이터와 설정을 삭제합니다', {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this._makeButton(rightBtnX, resetY + 11, btnW, rowH, '초기화', () => {
      this._showConfirmPopup(cx, H, '모든 데이터를 초기화하겠습니까?', () => {
        SaveManager.deleteAll();
        localStorage.removeItem('settings_font');
        InputManager.resetToDefaults();
        FontManager.setActive('game');
        this._removeInputEl();
        this._showToast(cx, H * 0.5, '초기화 완료', () => {
          this.scene.restart({ from: this.fromScene, tab: 'save' });
        }, '#cc5533');
      });
    }, true);
  }

  // ── 버튼 공통 ─────────────────────────────────────────────────
  _makeButton(x, y, bw, bh, label, onClick, danger = false) {
    const nc = danger ? 0x1a0808 : 0x140c05;
    const nb = danger ? 0x5a2010 : 0x3d2010;
    const hc = danger ? 0x241010 : 0x1e1008;
    const hb = danger ? 0x8a3018 : 0x6b3818;

    const bg = this.add.graphics();
    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.lineStyle(1, border, 0.9);
      bg.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
      bg.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    };
    draw(nc, nb);

    this.add.text(x, y, label, {
      fontSize: scaledFontSize(10, this.scale),
      fill: danger ? '#8a4030' : '#6b4020',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, bw, bh, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(hc, hb); });
    hit.on('pointerout',  () => { draw(nc, nb); });
    hit.on('pointerdown', onClick);
  }

  // ── 확인 팝업 ─────────────────────────────────────────────────
  _showConfirmPopup(cx, H, message, onConfirm) {
    const W    = this.scale.width;
    const popW = W * 0.46;
    const popH = H * 0.22;
    const popX = cx - popW / 2;
    const popY = H * 0.5 - popH / 2;

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.72)
      .setOrigin(0).setDepth(500).setInteractive();

    const box = this.add.graphics().setDepth(501);
    box.fillStyle(0x0a0705, 1);
    box.lineStyle(1, 0x3d2010, 1);
    box.strokeRect(popX, popY, popW, popH);
    box.fillRect(popX, popY, popW, popH);

    const msgText = this.add.text(cx, popY + popH * 0.32, message, {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#8a6040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(502);

    const btnY   = popY + popH * 0.70;
    const btnGap = popW * 0.20;

    const closePopup = () => {
      overlay.destroy(); box.destroy(); msgText.destroy();
      confirmBtn.destroy(); cancelBtn.destroy();
    };

    const makePopBtn = (bx, label, color, hcolor, cb) => {
      const t = this.add.text(bx, btnY, label, {
        fontSize: scaledFontSize(12, this.scale),
        fill: color,
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setStyle({ fill: hcolor }));
      t.on('pointerout',  () => t.setStyle({ fill: color  }));
      t.on('pointerdown', cb);
      return t;
    };

    const confirmBtn = makePopBtn(cx - btnGap, '확인', '#8a3018', '#cc5533', () => { closePopup(); onConfirm(); });
    const cancelBtn  = makePopBtn(cx + btnGap, '취소', '#3d2010', '#8a6040', () => { closePopup(); });
  }

  // ── 토스트 ────────────────────────────────────────────────────
  _showToast(cx, y, message, onComplete, color) {
    const toast = this.add.text(cx, y, message, {
      fontSize: scaledFontSize(18, this.scale),
      fill: color || '#c8a070',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    this.tweens.add({
      targets: toast, alpha: 1, duration: 200, ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({
            targets: toast, alpha: 0, duration: 300,
            onComplete: () => { toast.destroy(); if (onComplete) onComplete(); },
          });
        });
      },
    });
  }

  // ── 공통 옵션 박스 ────────────────────────────────────────────
  _drawOptionBox(gfx, x, y, w, h, selected, hover = false) {
    gfx.clear();
    if (selected)   { gfx.lineStyle(1, 0x6b3810, 0.9); gfx.fillStyle(0x1a0e06, 1); }
    else if (hover) { gfx.lineStyle(1, 0x2a1a0a, 0.6); gfx.fillStyle(0x120a04, 1); }
    else            { gfx.lineStyle(1, 0x1a0e06, 0.6); gfx.fillStyle(0x000000, 0); }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
  }

  // ── 뒤로가기 ──────────────────────────────────────────────────
  _buildBackButton(W, H) {
    const btn = this.add.text(W * 0.08, H * 0.93, '← 돌아가기', {
      fontSize: scaledFontSize(13, this.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ fill: '#c8a070' }));
    btn.on('pointerout',  () => btn.setStyle({ fill: '#3d2010' }));
    btn.on('pointerdown', () => {
      if (InputManager._rebindListener) InputManager._cancelRebind();
      this._removeInputEl();
      const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x050407, 0)
        .setOrigin(0).setDepth(999);
      this.tweens.add({
        targets: flash, alpha: 1, duration: 300, ease: 'Sine.easeIn',
        onComplete: () => this.scene.start(this.fromScene),
      });
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (InputManager._rebindTarget) return;
      this._removeInputEl();
      this.scene.start(this.fromScene);
    });
  }
}
