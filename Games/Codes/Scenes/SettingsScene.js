// ================================================================
//  SettingsScene.js
//  경로: Games/Codes/Scenes/SettingsScene.js
//
//  역할: 설정 화면 껍데기 — 배경 / 제목 / 탭 라우팅 / 뒤로가기
//  공통 헬퍼: makeButton / drawOptionBox / showConfirmPopup / showToast
//  폰트 수치: 1280×720 basePx × 1.5 (가시성 개선)
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

    InputManager.reinit(this);
    AudioManager.reinit(this);

    this._buildBackground(W, H);
    this._buildTitle(W, H, cx);
    this._buildTabBar(W, H, cx);
    this._buildTabContent(W, H, cx);
    this._buildBackButton(W, H);

    this._fsHandler = () => {
      if (this._activeTab === 'video') {
        this._cleanup();
        this.scene.restart({ from: this.fromScene, tab: 'video' });
      }
    };
    document.addEventListener('fullscreenchange',       this._fsHandler);
    document.addEventListener('webkitfullscreenchange', this._fsHandler);
  }

  shutdown() {
    this._cleanup();
    if (InputManager._rebindListener) InputManager._cancelRebind();
    if (this._fsHandler) {
      document.removeEventListener('fullscreenchange',       this._fsHandler);
      document.removeEventListener('webkitfullscreenchange', this._fsHandler);
    }
  }

  _cleanup() {
    if (this._cursorTimer) { this._cursorTimer.remove(); this._cursorTimer = null; }
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

  // ── 제목 ──────────────────────────────────────────────────────
  _buildTitle(W, H, cx) {
    this.add.text(cx, H * 0.09, '설  정', {
      fontSize: scaledFontSize(45, this.scale),   // 30 × 1.5
      fill: '#6b4020',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    this.add.text(cx, H * 0.09 + parseInt(scaledFontSize(36, this.scale)), 'SETTINGS', {  // 24 × 1.5
      fontSize: scaledFontSize(18, this.scale),   // 12 × 1.5
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
      letterSpacing: 5,
    }).setOrigin(0.5);
  }

  // ── 탭 바 ─────────────────────────────────────────────────────
  _buildTabBar(W, H, cx) {
    const tabY  = H * 0.20;
    const tabH  = parseInt(scaledFontSize(57, this.scale));   // 38 × 1.5
    const gap   = W * 0.012;
    const tabs  = [
      { key: 'font',  label: '폰트'   },
      { key: 'video', label: '비디오'  },
      { key: 'audio', label: '오디오'  },
      { key: 'keys',  label: '키 설정' },
      { key: 'save',  label: '저장'   },
    ];
    const tabW   = (W * 0.88 - gap * (tabs.length - 1)) / tabs.length;
    const startX = cx - (tabW * tabs.length + gap * (tabs.length - 1)) / 2;

    tabs.forEach((tab, i) => {
      const tx       = startX + i * (tabW + gap);
      const selected = this._activeTab === tab.key;
      const bg       = this.add.graphics();
      this._drawTabBg(bg, tx, tabY, tabW, tabH, selected);

      this.add.text(tx + tabW / 2, tabY + tabH / 2, tab.label, {
        fontSize: scaledFontSize(20, this.scale),   // 13 × 1.5
        fill: selected ? '#c8a070' : '#3d2010',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5);

      const hit = this.add.rectangle(tx + tabW / 2, tabY + tabH / 2, tabW, tabH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { if (this._activeTab !== tab.key) this._drawTabBg(bg, tx, tabY, tabW, tabH, false, true); });
      hit.on('pointerout',  () => { if (this._activeTab !== tab.key) this._drawTabBg(bg, tx, tabY, tabW, tabH, false, false); });
      hit.on('pointerdown', () => {
        if (this._activeTab === tab.key) return;
        if (InputManager._rebindListener) InputManager._cancelRebind();
        this._cleanup();
        this.scene.restart({ from: this.fromScene, tab: tab.key });
      });
    });

    const line = this.add.graphics();
    line.lineStyle(1, 0x2a1a0a, 1);
    line.lineBetween(W * 0.05, tabY + tabH + 2, W * 0.95, tabY + tabH + 2);
  }

  // ── 탭 콘텐츠 라우팅 ──────────────────────────────────────────
  _buildTabContent(W, H, cx) {
    switch (this._activeTab) {
      case 'font':  Settings_Tab_Font.build(this, W, H, cx);  break;
      case 'video': Settings_Tab_Video.build(this, W, H, cx); break;
      case 'audio': Settings_Tab_Audio.build(this, W, H, cx); break;
      case 'keys':  Settings_Tab_Keys.build(this, W, H, cx);  break;
      case 'save':  Settings_Tab_Save.build(this, W, H, cx);  break;
    }
  }

  // ── 뒤로가기 ──────────────────────────────────────────────────
  _buildBackButton(W, H) {
    const btn = this.add.text(W * 0.08, H * 0.93, '← 돌아가기', {
      fontSize: scaledFontSize(26, this.scale),   // 17 × 1.5
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ fill: '#c8a070' }));
    btn.on('pointerout',  () => btn.setStyle({ fill: '#3d2010' }));
    btn.on('pointerdown', () => {
      if (InputManager._rebindListener) InputManager._cancelRebind();
      this._cleanup();
      const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x050407, 0)
        .setOrigin(0).setDepth(999);
      this.tweens.add({
        targets: flash, alpha: 1, duration: 300, ease: 'Sine.easeIn',
        onComplete: () => this.scene.start(this.fromScene),
      });
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (InputManager._rebindTarget) return;
      this._cleanup();
      this.scene.start(this.fromScene);
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  공통 헬퍼 — 탭 파일에서 scene.xxx() 로 호출
  // ════════════════════════════════════════════════════════════════

  _drawTabBg(gfx, x, y, w, h, selected, hover = false) {
    gfx.clear();
    if (selected)   { gfx.fillStyle(0x1e1008, 1); gfx.lineStyle(1, 0x4a2810, 0.9); }
    else if (hover) { gfx.fillStyle(0x140c05, 1); gfx.lineStyle(1, 0x2a1a0a, 0.7); }
    else            { gfx.fillStyle(0x000000, 0); gfx.lineStyle(1, 0x1a0e06, 0.5); }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
  }

  drawOptionBox(gfx, x, y, w, h, selected, hover = false) {
    gfx.clear();
    if (selected)   { gfx.lineStyle(1, 0x6b3810, 0.9); gfx.fillStyle(0x1a0e06, 1); }
    else if (hover) { gfx.lineStyle(1, 0x2a1a0a, 0.6); gfx.fillStyle(0x120a04, 1); }
    else            { gfx.lineStyle(1, 0x1a0e06, 0.6); gfx.fillStyle(0x000000, 0); }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
  }

  makeButton(x, y, bw, bh, label, onClick, danger = false) {
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
      fontSize: scaledFontSize(18, this.scale),   // 12 × 1.5
      fill: danger ? '#8a4030' : '#6b4020',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    const hit = this.add.rectangle(x, y, bw, bh, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(hc, hb));
    hit.on('pointerout',  () => draw(nc, nb));
    hit.on('pointerdown', onClick);
  }

  showConfirmPopup(cx, H, message, onConfirm) {
    const W    = this.scale.width;
    const popW = W * 0.46;
    const popH = H * 0.24;   // 살짝 크게
    const popX = cx - popW / 2;
    const popY = H * 0.5 - popH / 2;

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.72).setOrigin(0).setDepth(500).setInteractive();
    const box = this.add.graphics().setDepth(501);
    box.fillStyle(0x0a0705, 1);
    box.lineStyle(1, 0x3d2010, 1);
    box.strokeRect(popX, popY, popW, popH);
    box.fillRect(popX, popY, popW, popH);

    const msgText = this.add.text(cx, popY + popH * 0.32, message, {
      fontSize: scaledFontSize(21, this.scale),   // 14 × 1.5
      fill: '#8a6040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(502);

    const btnY   = popY + popH * 0.70;
    const btnGap = popW * 0.20;

    const closePopup = () => {
      overlay.destroy(); box.destroy(); msgText.destroy();
      confirmBtn.destroy(); cancelBtn.destroy();
    };
    const makePopBtn = (bx, lbl, color, hcolor, cb) => {
      const t = this.add.text(bx, btnY, lbl, {
        fontSize: scaledFontSize(21, this.scale),   // 14 × 1.5
        fill: color, fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setStyle({ fill: hcolor }));
      t.on('pointerout',  () => t.setStyle({ fill: color  }));
      t.on('pointerdown', cb);
      return t;
    };
    const confirmBtn = makePopBtn(cx - btnGap, '확인', '#8a3018', '#cc5533', () => { closePopup(); onConfirm(); });
    const cancelBtn  = makePopBtn(cx + btnGap, '취소', '#3d2010', '#8a6040', closePopup);
  }

  showToast(cx, y, message, onComplete, color) {
    const toast = this.add.text(cx, y, message, {
      fontSize: scaledFontSize(30, this.scale),   // 20 × 1.5
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
}
