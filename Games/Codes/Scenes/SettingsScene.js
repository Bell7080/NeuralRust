// ================================================================
//  SettingsScene.js
//  경로: Games/Codes/Scenes/SettingsScene.js
//
//  역할: 설정 화면 — 폰트 / 비디오 / 저장 탭
//  의존: FontManager, SaveManager, utils.js
// ================================================================

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

    this._buildBackground(W, H);
    this._buildTitle(W, H, cx);
    this._buildTabs(W, H, cx);
    this._buildBackButton(W, H);

    // 전체화면 해제(ESC 등) 감지 → 비디오 탭 상태 동기화용
    this._fsHandler = () => {
      if (this._activeTab === 'video') {
        this._removeInputEl();
        this.scene.restart({ from: this.fromScene, tab: 'video' });
      }
    };
    document.addEventListener('fullscreenchange', this._fsHandler);
    document.addEventListener('webkitfullscreenchange', this._fsHandler);
  }

  // ── 씬 종료 시 정리 ──────────────────────────────────────────
  shutdown() {
    this._removeInputEl();
    if (this._fsHandler) {
      document.removeEventListener('fullscreenchange', this._fsHandler);
      document.removeEventListener('webkitfullscreenchange', this._fsHandler);
    }
  }

  _removeInputEl() {
    // DOM input 대신 Phaser 텍스트 사용 — 커서 타이머만 정리
    if (this._cursorTimer) {
      this._cursorTimer.remove();
      this._cursorTimer = null;
    }
    this._inputEl = null;
  }

  // ── 배경 ──────────────────────────────────────────────────────
  _buildBackground(W, H) {
    this.add.rectangle(0, 0, W, H, 0x060608).setOrigin(0);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x0d0d12, 1);
    const step = Math.round(W / 48);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
  }

  // ── 타이틀 ────────────────────────────────────────────────────
  _buildTitle(W, H, cx) {
    this.add.text(cx, H * 0.09, '설  정', {
      fontSize: scaledFontSize(32, this.scale),
      fill: '#9999aa',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
  }

  // ── 탭 ────────────────────────────────────────────────────────
  _buildTabs(W, H, cx) {
    const tabY   = H * 0.20;
    const tabW   = W * 0.14;
    const tabH   = parseInt(scaledFontSize(36, this.scale));
    const gap    = W * 0.015;
    const totalW = tabW * 3 + gap * 2;
    const startX = cx - totalW / 2;

    const tabs = [
      { key: 'font',  label: '폰트'  },
      { key: 'video', label: '비디오' },
      { key: 'save',  label: '저장'  },
    ];

    tabs.forEach((tab, i) => {
      const tx       = startX + i * (tabW + gap);
      const selected = this._activeTab === tab.key;
      const bg       = this.add.graphics();
      this._drawTabBg(bg, tx, tabY, tabW, tabH, selected);

      this.add.text(tx + tabW / 2, tabY + tabH / 2, tab.label, {
        fontSize: scaledFontSize(13, this.scale),
        fill: selected ? '#d4cfc6' : '#555566',
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
        this._removeInputEl();
        this.scene.restart({ from: this.fromScene, tab: tab.key });
      });
    });

    const line = this.add.graphics();
    line.lineStyle(1, 0x222230, 1);
    line.lineBetween(W * 0.05, tabY + tabH + 2, W * 0.95, tabY + tabH + 2);

    if (this._activeTab === 'font')  this._buildFontTab(W, H, cx);
    if (this._activeTab === 'video') this._buildVideoTab(W, H, cx);
    if (this._activeTab === 'save')  this._buildSaveTab(W, H, cx);
  }

  _drawTabBg(gfx, x, y, w, h, selected, hover = false) {
    gfx.clear();
    if (selected)   { gfx.fillStyle(0x1a1a28, 1); gfx.lineStyle(1, 0x333344, 0.8); }
    else if (hover) { gfx.fillStyle(0x111118, 1); gfx.lineStyle(1, 0x2a2a3a, 0.6); }
    else            { gfx.fillStyle(0x000000, 0); gfx.lineStyle(1, 0x1a1a22, 0.5); }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
  }

  // ══════════════════════════════════════════════════════════════
  //  폰트 탭
  // ══════════════════════════════════════════════════════════════
  _buildFontTab(W, H, cx) {
    this.add.text(W * 0.08, H * 0.32, '[ 폰트 ]', {
      fontSize: scaledFontSize(13, this.scale),
      fill: '#444455',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const saved = localStorage.getItem('settings_font') || 'game';
    this._currentFont = saved;

    const options = [
      { key: 'game',   label: 'NeoDunggeunmoPro', desc: '게임 전용 도트 폰트',     family: "'NeoDunggeunmoPro', monospace" },
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
      fontSize: scaledFontSize(16, this.scale),
      fill: isSelected ? '#d4cfc6' : '#555566',
      fontFamily: opt.family,
    }).setOrigin(0, 0.5);

    this.add.text(W * 0.13, y + 10, opt.desc, {
      fontSize: scaledFontSize(10, this.scale),
      fill: isSelected ? '#666677' : '#333344',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this.add.text(W * 0.09, y, isSelected ? '▶' : '·', {
      fontSize: scaledFontSize(12, this.scale),
      fill: isSelected ? '#886655' : '#333344',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const hit = this.add.rectangle(cx, y, W * 0.84, 56, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      if (this._currentFont !== opt.key) {
        this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, true);
        nameText.setStyle({ fill: '#aaaaaa' });
      }
    });
    hit.on('pointerout', () => {
      if (this._currentFont !== opt.key) {
        this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, false);
        nameText.setStyle({ fill: '#555566' });
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
    line.lineStyle(1, 0x1a1a22, 1);
    line.lineBetween(W * 0.1, py - 20, W * 0.9, py - 20);

    this.add.text(W * 0.08, py, '미리보기', {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#333344',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this.add.text(cx, py + 28, '공방 — PROJECT001 — 가나다 ABC 123', {
      fontSize: scaledFontSize(17, this.scale),
      fill: '#888899',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    this.add.text(cx, py + 56, '어둠 속에서 빛을 찾아 헤매는 자의 이야기', {
      fontSize: scaledFontSize(12, this.scale),
      fill: '#444455',
      fontFamily: FontManager.BODY,
    }).setOrigin(0.5, 0);
  }

  // ══════════════════════════════════════════════════════════════
  //  비디오 탭
  // ══════════════════════════════════════════════════════════════
  _buildVideoTab(W, H, cx) {
    const isFullscreen = !!document.fullscreenElement;

    this.add.text(W * 0.08, H * 0.32, '[ 화면 모드 ]', {
      fontSize: scaledFontSize(13, this.scale),
      fill: '#444455',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const options = [
      { key: 'fullscreen', label: '전체화면', desc: 'F11 또는 이 항목으로 전환' },
      { key: 'windowed',   label: '창  모  드', desc: 'ESC로도 전환 가능' },
    ];

    const baseY = H * 0.42;
    const gap   = H * 0.15;

    options.forEach((opt, i) => {
      const y          = baseY + gap * i;
      const isSelected = isFullscreen
        ? opt.key === 'fullscreen'
        : opt.key === 'windowed';

      const box = this.add.graphics();
      this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, isSelected);

      const nameText = this.add.text(W * 0.13, y - 8, opt.label, {
        fontSize: scaledFontSize(16, this.scale),
        fill: isSelected ? '#d4cfc6' : '#555566',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0.5);

      this.add.text(W * 0.13, y + 10, opt.desc, {
        fontSize: scaledFontSize(10, this.scale),
        fill: isSelected ? '#666677' : '#333344',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      this.add.text(W * 0.09, y, isSelected ? '▶' : '·', {
        fontSize: scaledFontSize(12, this.scale),
        fill: isSelected ? '#886655' : '#333344',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      const hit = this.add.rectangle(cx, y, W * 0.84, 56, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!isSelected) {
          this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, true);
          nameText.setStyle({ fill: '#aaaaaa' });
        }
      });
      hit.on('pointerout', () => {
        if (!isSelected) {
          this._drawOptionBox(box, W * 0.08, y - 28, W * 0.84, 56, false, false);
          nameText.setStyle({ fill: '#555566' });
        }
      });
      hit.on('pointerdown', () => {
        if (isSelected) return;
        if (opt.key === 'fullscreen') {
          // fullscreenchange 이벤트가 씬 재시작을 처리
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      });
    });

    // 안내 텍스트
    this.add.text(cx, H * 0.72, 'ESC 키로도 전체화면을 해제할 수 있습니다', {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#333344',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
  }

  // ══════════════════════════════════════════════════════════════
  //  저장 탭
  // ══════════════════════════════════════════════════════════════
  _buildSaveTab(W, H, cx) {
    const startY  = H * 0.30;
    const boxX    = W * 0.08;
    const boxW    = W * 0.76;   // 복사 버튼 공간 확보
    const btnW    = W * 0.10;
    const btnX    = boxX + boxW + (W * 0.92 - boxX - boxW) / 2 + boxX * 0;
    // 오른쪽 여백 중앙에 버튼
    const rightBtnX = boxX + boxW + (W * 0.92 - (boxX + boxW)) / 2;

    // ── 내보내기 ──────────────────────────────────────────────
    this.add.text(boxX, startY, '[ 내 저장 코드 ]', {
      fontSize: scaledFontSize(13, this.scale),
      fill: '#444455',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const gameData      = SaveManager.load();
    const settingsData  = SaveManager.loadSettings();
    const exportPayload = { game: gameData, settings: settingsData };
    const exportCode    = btoa(unescape(encodeURIComponent(JSON.stringify(exportPayload))));

    // 코드 박스 (복사 버튼과 같은 줄, 높이 통일)
    const rowH  = 40;
    const rowY  = startY + 18;

    const codeBox = this.add.graphics();
    codeBox.fillStyle(0x0d0d12, 1);
    codeBox.lineStyle(1, 0x222233, 0.8);
    codeBox.strokeRect(boxX, rowY, boxW, rowH);
    codeBox.fillRect(boxX, rowY, boxW, rowH);

    const displayCode = exportCode.length > 55
      ? exportCode.substring(0, 55) + '…'
      : exportCode;

    this.add.text(boxX + 10, rowY + rowH / 2, displayCode, {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#666688',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // 복사 버튼 — 코드 박스 오른쪽 같은 줄
    this._makeButton(rightBtnX, rowY + rowH / 2, btnW, rowH, '복사', () => {
      navigator.clipboard?.writeText(exportCode)
        .then(()  => this._showToast(cx, H * 0.5, '복사 완료'))
        .catch(()  => this._showToast(cx, H * 0.5, '수동으로 복사해주세요'));
    });

    // ── 불러오기 ──────────────────────────────────────────────
    const loadY = startY + H * 0.20;

    this.add.text(boxX, loadY, '[ 저장 코드로 불러오기 ]', {
      fontSize: scaledFontSize(13, this.scale),
      fill: '#444455',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const inputY = loadY + 18;

    // 입력란 배경
    const inputBg = this.add.graphics();
    inputBg.fillStyle(0x0d0d12, 1);
    inputBg.lineStyle(1, 0x222233, 0.8);
    inputBg.strokeRect(boxX, inputY, boxW, rowH);
    inputBg.fillRect(boxX, inputY, boxW, rowH);

    // Phaser 텍스트 입력 구현 (DOM input 대신 — depth 제어 가능)
    let inputValue = '';
    const placeholder = '여기에 저장 코드를 입력하세요…';

    const inputText = this.add.text(boxX + 10, inputY + rowH / 2, placeholder, {
      fontSize: scaledFontSize(10, this.scale),
      fill: '#2a2a3a',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(10);

    const cursor = this.add.text(boxX + 10, inputY + rowH / 2, '|', {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#aaaacc',
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
        inputText.setText(placeholder).setStyle({ fill: '#2a2a3a' });
        cursor.setAlpha(0);
      } else {
        const shown = inputValue.length > 55 ? inputValue.substring(0, 55) + '…' : inputValue;
        inputText.setText(shown).setStyle({ fill: '#888899' });
        cursor.setX(boxX + 10 + inputText.width + 2);
      }
    };

    // 입력란 클릭 → 포커스
    const hitInput = this.add.rectangle(boxX + boxW / 2, inputY + rowH / 2, boxW, rowH, 0x000000, 0)
      .setDepth(10).setInteractive({ useHandCursor: true });
    hitInput.on('pointerdown', () => {
      this._inputFocused = true;
      inputBg.clear();
      inputBg.fillStyle(0x0d0d12, 1);
      inputBg.lineStyle(1, 0x444466, 1);
      inputBg.strokeRect(boxX, inputY, boxW, rowH);
      inputBg.fillRect(boxX, inputY, boxW, rowH);
    });
    this.input.on('pointerdown', (ptr, objs) => {
      if (!objs.includes(hitInput)) {
        this._inputFocused = false;
        inputBg.clear();
        inputBg.fillStyle(0x0d0d12, 1);
        inputBg.lineStyle(1, 0x222233, 0.8);
        inputBg.strokeRect(boxX, inputY, boxW, rowH);
        inputBg.fillRect(boxX, inputY, boxW, rowH);
      }
    });

    // 키보드 입력
    this.input.keyboard.on('keydown', (e) => {
      if (!this._inputFocused) return;
      if (e.key === 'Backspace') {
        inputValue = inputValue.slice(0, -1);
      } else if (e.key.length === 1) {
        inputValue += e.key;
      }
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

    // el.value 인터페이스 유지 (로드 버튼에서 사용)
    const el = { get value() { return inputValue; } };
    this._inputEl = null; // DOM input 없음

    // 로드 버튼
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
    sep.lineStyle(1, 0x1a1a22, 1);
    sep.lineBetween(boxX, resetY - 14, W * 0.92, resetY - 14);

    this.add.text(boxX, resetY, '[ 초기화 ]', {
      fontSize: scaledFontSize(13, this.scale),
      fill: '#444455',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this.add.text(boxX, resetY + 22, '모든 저장 데이터와 설정을 삭제합니다', {
      fontSize: scaledFontSize(11, this.scale),
      fill: '#333333',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this._makeButton(rightBtnX, resetY + 11, btnW, rowH, '초기화', () => {
      this._showConfirmPopup(cx, H, '모든 데이터를 초기화하겠습니까?', () => {
        SaveManager.deleteAll();
        localStorage.removeItem('settings_font');
        FontManager.setActive('game');
        this._removeInputEl();
        // 붉은 토스트 후 저장 탭 재시작
        this._showToast(cx, H * 0.5, '초기화 완료', () => {
          this.scene.restart({ from: this.fromScene, tab: 'save' });
        }, '#ff6666');
      });
    }, true);
  }

  // ── 버튼 공통 ─────────────────────────────────────────────────
  _makeButton(x, y, bw, bh, label, onClick, danger = false) {
    const nc = danger ? 0x2a1010 : 0x1a1a28;
    const nb = danger ? 0x553333 : 0x333355;
    const hc = danger ? 0x3a1515 : 0x252535;
    const hb = danger ? 0x884444 : 0x555577;

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
      fontSize: scaledFontSize(11, this.scale),
      fill: danger ? '#aa6666' : '#888899',
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



    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.65)
      .setOrigin(0).setDepth(500).setInteractive();

    const box = this.add.graphics().setDepth(501).setAlpha(1);
    box.fillStyle(0x060608, 1);
    box.lineStyle(1, 0x333344, 1);
    box.strokeRect(popX, popY, popW, popH);
    box.fillRect(popX, popY, popW, popH);

    const msgText = this.add.text(cx, popY + popH * 0.32, message, {
      fontSize: scaledFontSize(13, this.scale),
      fill: '#aaaaaa',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(502);

    const btnY   = popY + popH * 0.70;
    const btnGap = popW * 0.20;

    const closePopup = () => {
      overlay.destroy(); box.destroy();
      msgText.destroy();
      confirmBtn.destroy(); cancelBtn.destroy();

    };

    const makePopBtn = (bx, label, color, hcolor, cb) => {
      const t = this.add.text(bx, btnY, label, {
        fontSize: scaledFontSize(13, this.scale),
        fill: color,
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setStyle({ fill: hcolor }));
      t.on('pointerout',  () => t.setStyle({ fill: color  }));
      t.on('pointerdown', cb);
      return t;
    };

    const confirmBtn = makePopBtn(cx - btnGap, '확인', '#aa6666', '#cc8888', () => {
      closePopup();
      onConfirm();
    });
    const cancelBtn = makePopBtn(cx + btnGap, '취소', '#555566', '#aaaaaa', () => {
      closePopup();
    });
  }

  // ── 토스트 ────────────────────────────────────────────────────
  _showToast(cx, y, message, onComplete, color) {
    const toast = this.add.text(cx, y, message, {
      fontSize: scaledFontSize(20, this.scale),
      fill: color || '#ccccee',
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
    if (selected)   { gfx.lineStyle(1, 0x554433, 0.8); gfx.fillStyle(0x1a1510, 1); }
    else if (hover) { gfx.lineStyle(1, 0x333344, 0.6); gfx.fillStyle(0x0e0e12, 1); }
    else            { gfx.lineStyle(1, 0x1a1a22, 0.6); gfx.fillStyle(0x000000, 0); }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
  }

  // ── 뒤로가기 ──────────────────────────────────────────────────
  _buildBackButton(W, H) {
    const btn = this.add.text(W * 0.08, H * 0.93, '← 돌아가기', {
      fontSize: scaledFontSize(14, this.scale),
      fill: '#444455',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ fill: '#aaaaaa' }));
    btn.on('pointerout',  () => btn.setStyle({ fill: '#444455' }));
    btn.on('pointerdown', () => {
      this._removeInputEl();
      const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x060608, 0)
        .setOrigin(0).setDepth(999);
      this.tweens.add({
        targets: flash, alpha: 1, duration: 300, ease: 'Sine.easeIn',
        onComplete: () => this.scene.start(this.fromScene),
      });
    });

    this.input.keyboard.on('keydown-ESC', () => {
      this._removeInputEl();
      this.scene.start(this.fromScene);
    });
  }
}
