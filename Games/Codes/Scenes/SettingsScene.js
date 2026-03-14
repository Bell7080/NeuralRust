// ================================================================
//  SettingsScene.js
//  경로: Games/Codes/Scenes/SettingsScene.js
//
//  역할: 설정 화면 껍데기 — 배경 / 제목 / 탭 라우팅 / 뒤로가기
//  공통 헬퍼: makeButton / drawOptionBox / showConfirmPopup / showToast
//
//  ✏️ 폰트 증량 내역 (가시성 개선)
//    제목 한글         : 42 → 50
//    제목 영문 서브    : 14 → 16
//    탭 라벨           : 18 → 22
//    뒤로가기 버튼     : 22 → 26
//    makeButton 텍스트 : 16 → 19
//    showConfirmPopup  : 19 → 22
//    showToast         : 26 → 30
//
//  레이아웃 원칙:
//    모든 위치·크기는 W / H 비율 기반. 하드코딩 없음.
//    탭 콘텐츠 시작 Y = H * 0.29 (탭바 하단 구분선 바로 아래)
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
    const titleY = H * 0.075;
    this.add.text(cx, titleY, '설  정', {
      fontSize: scaledFontSize(50, this.scale),    // ✏️ 42 → 50
      fill: '#7a5028',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    this.add.text(cx, titleY + H * 0.055, 'SETTINGS', {
      fontSize: scaledFontSize(16, this.scale),    // ✏️ 14 → 16
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
      letterSpacing: 6,
    }).setOrigin(0.5);
  }

  // ── 탭 바 ─────────────────────────────────────────────────────
  _buildTabBar(W, H, cx) {
    const tabY    = H * 0.185;
    const tabH    = Math.round(H * 0.068);
    const gap     = W * 0.010;
    const marginX = W * 0.06;
    const tabs    = [
      { key: 'font',  label: '폰트'   },
      { key: 'video', label: '비디오'  },
      { key: 'audio', label: '오디오'  },
      { key: 'keys',  label: '키 설정' },
      { key: 'save',  label: '저장'   },
    ];
    const totalW = W * (1 - 0.06 * 2);
    const tabW   = (totalW - gap * (tabs.length - 1)) / tabs.length;
    const startX = marginX;

    tabs.forEach((tab, i) => {
      const tx       = startX + i * (tabW + gap);
      const selected = this._activeTab === tab.key;
      const bg       = this.add.graphics();
      this._drawTabBg(bg, tx, tabY, tabW, tabH, selected);

      this.add.text(tx + tabW / 2, tabY + tabH / 2, tab.label, {
        fontSize: scaledFontSize(22, this.scale),  // ✏️ 18 → 22
        fill: selected ? '#c8a070' : '#6b4520',
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

    const lineY = tabY + tabH + Math.round(H * 0.006);
    const line  = this.add.graphics();
    line.lineStyle(1, 0x3a2010, 0.6);
    line.lineBetween(W * 0.06, lineY, W * 0.94, lineY);
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
    const btn = this.add.text(W * 0.06, H * 0.935, '← 돌아가기', {
      fontSize: scaledFontSize(26, this.scale),    // ✏️ 22 → 26
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ fill: '#c8a070' }));
    btn.on('pointerout',  () => btn.setStyle({ fill: '#5a3518' }));
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
    if (selected)   { gfx.fillStyle(0x221408, 1); gfx.lineStyle(1, 0x6b3818, 0.9); }
    else if (hover) { gfx.fillStyle(0x180e05, 1); gfx.lineStyle(1, 0x3a2010, 0.7); }
    else            { gfx.fillStyle(0x000000, 0); gfx.lineStyle(1, 0x251508, 0.4); }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
    if (selected) {
      gfx.lineStyle(2, 0xa05018, 1);
      gfx.lineBetween(x + 1, y + h - 1, x + w - 1, y + h - 1);
    }
  }

  drawOptionBox(gfx, x, y, w, h, selected, hover = false) {
    gfx.clear();
    if (selected) {
      gfx.lineStyle(1, 0x7a4520, 0.9);
      gfx.fillStyle(0x1e1208, 1);
    } else if (hover) {
      gfx.lineStyle(1, 0x3a2010, 0.7);
      gfx.fillStyle(0x160e05, 1);
    } else {
      gfx.lineStyle(1, 0x251808, 0.5);
      gfx.fillStyle(0x000000, 0);
    }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
    if (selected) {
      gfx.lineStyle(2, 0xa05018, 1);
      gfx.lineBetween(x + 1, y + 1, x + 1, y + h - 1);
    }
  }

  makeButton(x, y, bw, bh, label, onClick, danger = false) {
    const nc = danger ? 0x1a0808 : 0x160e06;
    const nb = danger ? 0x6b2010 : 0x4a2810;
    const hc = danger ? 0x241010 : 0x221408;
    const hb = danger ? 0xa03020 : 0x7a4520;
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
      fontSize: scaledFontSize(19, this.scale),    // ✏️ 16 → 19
      fill: danger ? '#a04030' : '#7a5028',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    const hit = this.add.rectangle(x, y, bw, bh, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(hc, hb));
    hit.on('pointerout',  () => draw(nc, nb));
    hit.on('pointerdown', onClick);
  }

  showConfirmPopup(cx, H, message, onConfirm) {
    const W    = this.scale.width;
    const popW = W * 0.44;
    const popH = H * 0.22;
    const popX = cx - popW / 2;
    const popY = H * 0.5 - popH / 2;

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.78)
      .setOrigin(0).setDepth(500).setInteractive();
    const box = this.add.graphics().setDepth(501);
    box.fillStyle(0x0c0905, 1);
    box.lineStyle(1, 0x5a3010, 1);
    box.strokeRect(popX, popY, popW, popH);
    box.fillRect(popX, popY, popW, popH);
    box.lineStyle(2, 0x7a4018, 0.8);
    box.lineBetween(popX + 1, popY + 1, popX + popW - 1, popY + 1);

    const msgText = this.add.text(cx, popY + popH * 0.35, message, {
      fontSize: scaledFontSize(22, this.scale),    // ✏️ 19 → 22
      fill: '#a07850',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(502);

    const btnY   = popY + popH * 0.72;
    const btnGap = popW * 0.22;

    const closePopup = () => {
      overlay.destroy(); box.destroy(); msgText.destroy();
      confirmBtn.destroy(); cancelBtn.destroy();
    };
    const makePopBtn = (bx, lbl, color, hcolor, cb) => {
      const t = this.add.text(bx, btnY, lbl, {
        fontSize: scaledFontSize(22, this.scale),  // ✏️ 19 → 22
        fill: color, fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setStyle({ fill: hcolor }));
      t.on('pointerout',  () => t.setStyle({ fill: color  }));
      t.on('pointerdown', cb);
      return t;
    };
    const confirmBtn = makePopBtn(cx - btnGap, '확인', '#a03820', '#e06040', () => { closePopup(); onConfirm(); });
    const cancelBtn  = makePopBtn(cx + btnGap, '취소', '#5a3518', '#a07850', closePopup);
  }

  showToast(cx, y, message, onComplete, color) {
    const toast = this.add.text(cx, y, message, {
      fontSize: scaledFontSize(30, this.scale),    // ✏️ 26 → 30
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
