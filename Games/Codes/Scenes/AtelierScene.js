// ================================================================
//  AtelierScene.js
//  경로: Games/Codes/Scenes/AtelierScene.js
// ================================================================

class AtelierScene extends Phaser.Scene {
  constructor() { super({ key: 'AtelierScene' }); }

  init(data) {
    this._activeTab = data.tab || 'explore';
    this._fromScene = data.from || 'LobbyScene';
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W;
    this.H = H;

    InputManager.reinit(this);

    this._buildBackground(W, H);
    this._buildHUD(W, H);
    this._sideButtonRefs = [];
    this._buildSideButtons(W, H);
    this._buildTopButtons(W, H);

    this._currentTabObj = null;
    this._switchTab(this._activeTab, true);
  }

  _buildBackground(W, H) {
    this.add.rectangle(0, 0, W, H, 0x060408).setOrigin(0);
    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x1a0e06, 0.18);
      scan.lineBetween(0, y, W, y);
    }
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    grid.lineStyle(1, 0x120d06, 0.7);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    this.add.text(W / 2, H * 0.50, 'ATELIER', {
      fontSize: scaledFontSize(80, this.scale),
      fill: '#0e0a06',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.18);
  }

  _buildHUD(W, H) {
    new AtelierHUD(this, W, H);
  }

  _switchTab(key, instant = false) {
    if (!instant && key === this._activeTab) return;

    const W = this.W;
    const H = this.H;

    const TabMap = {
      explore: Tab_Explore, recruit: Tab_Recruit, manage: Tab_Manage, squad: Tab_Squad,
      facility: Tab_Facility, outsource: Tab_Outsource, dredge: Tab_Dredge,
      shop: Tab_Shop, storage: Tab_Storage, codex: Tab_Codex, memory: Tab_Memory,
    };

    const build = () => {
      if (this._currentTabObj) {
        this._currentTabObj.destroy();
        this._currentTabObj = null;
      }
      this._activeTab = key;
      this._rebuildSideButtonColors();
      const Cls = TabMap[key];
      if (Cls) {
        this._currentTabObj = new Cls(this, W, H);
        this._currentTabObj.show();
      }
    };

    if (instant) { build(); return; }

    const prev = this._currentTabObj;
    if (prev && prev._container) {
      this.tweens.add({
        targets: prev._container, alpha: 0, duration: 110, ease: 'Sine.easeIn',
        onComplete: () => {
          build();
          if (this._currentTabObj && this._currentTabObj._container) {
            this._currentTabObj._container.setAlpha(0);
            this.tweens.add({
              targets: this._currentTabObj._container,
              alpha: 1, duration: 180, ease: 'Sine.easeOut',
            });
          }
        },
      });
    } else {
      build();
    }
  }

  _rebuildSideButtonColors() {
    if (!this._sideButtonRefs) return;
    this._sideButtonRefs.forEach(({ key, btn, marker }) => {
      const active = key === this._activeTab;
      btn.setStyle({ fill: active ? '#e8c080' : '#7a5030' });
      marker.setStyle({ fill: active ? '#c06820' : '#4a2a10' });
    });
  }

  _buildSideButtons(W, H) {
    const leftItems = [
      { key: 'shop',    label: '상  점' },
      { key: 'storage', label: '창  고' },
      { key: 'codex',   label: '도  감' },
      { key: 'memory',  label: '회  상' },
    ];
    leftItems.forEach((item, i) => {
      const refs = this._makeSideButton(
        item.label, W * 0.07,
        H * 0.25 + i * parseInt(scaledFontSize(52, this.scale)),
        item.key, false
      );
      this._sideButtonRefs.push({ key: item.key, ...refs });
    });

    const rightItems = [
      { key: 'recruit',  label: '영  입'   },
      { key: 'manage',   label: '관  리'   },
      { key: 'squad',    label: '탐 사 대' },
      { key: 'facility', label: '시  설'   },
      { key: 'outsource',label: '외  주'   },
      { key: 'dredge',   label: '드 레 지' },
    ];
    rightItems.forEach((item, i) => {
      const refs = this._makeSideButton(
        item.label, W * 0.93,
        H * 0.22 + i * parseInt(scaledFontSize(52, this.scale)),
        item.key, true
      );
      this._sideButtonRefs.push({ key: item.key, ...refs });
    });

    this._makeExploreButton(W / 2, H * 0.86);
  }

  _makeSideButton(label, x, y, key, alignRight) {
    const isActive = this._activeTab === key;
    const indent   = parseInt(scaledFontSize(18, this.scale));
    const shift    = parseInt(scaledFontSize(8, this.scale));

    const marker = this.add.text(
      alignRight ? x + indent : x - indent, y, '│', {
        fontSize: scaledFontSize(18, this.scale),
        fill: isActive ? '#c06820' : '#4a2a10',
        fontFamily: FontManager.MONO,
      }
    ).setOrigin(alignRight ? 0 : 1, 0.5);

    const btn = this.add.text(x, y, label, {
      fontSize: scaledFontSize(26, this.scale),
      fill: isActive ? '#e8c080' : '#7a5030',
      fontFamily: FontManager.TITLE,
    }).setOrigin(alignRight ? 1 : 0, 0.5)
      .setInteractive({ useHandCursor: true });

    const underline = this.add.graphics();
    const origX = x;

    const drawUnderline = (on) => {
      underline.clear();
      if (!on) return;
      underline.lineStyle(1, 0x8b4010, 0.9);
      const uw = btn.width + shift + 4;
      const ly = y + parseInt(scaledFontSize(17, this.scale));
      if (alignRight) underline.lineBetween(x - uw, ly, x, ly);
      else            underline.lineBetween(x, ly, x + uw, ly);
    };
    if (isActive) drawUnderline(true);

    btn.on('pointerover', () => {
      if (key === this._activeTab) return;
      this.tweens.add({ targets: btn, x: alignRight ? origX - shift : origX + shift, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#e8c080' });
      marker.setStyle({ fill: '#c06820' });
      drawUnderline(true);
    });
    btn.on('pointerout', () => {
      if (key === this._activeTab) return;
      this.tweens.add({ targets: btn, x: origX, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#7a5030' });
      marker.setStyle({ fill: '#4a2a10' });
      drawUnderline(false);
    });
    btn.on('pointerdown', () => this._switchTab(key));

    return { btn, marker };
  }

  _makeExploreButton(x, y) {
    const shift = parseInt(scaledFontSize(8, this.scale));

    const sepLine = this.add.graphics();
    sepLine.lineStyle(1, 0x3a2a10, 0.7);
    sepLine.lineBetween(
      x - this.W * 0.18, y - parseInt(scaledFontSize(28, this.scale)),
      x + this.W * 0.18, y - parseInt(scaledFontSize(28, this.scale))
    );

    const marker = this.add.text(x - parseInt(scaledFontSize(36, this.scale)), y, '│', {
      fontSize: scaledFontSize(18, this.scale),
      fill: this._activeTab === 'explore' ? '#c06820' : '#4a2a10',
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    const btn = this.add.text(x, y, '탐    색', {
      fontSize: scaledFontSize(28, this.scale),
      fill: this._activeTab === 'explore' ? '#e8c080' : '#7a5030',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._sideButtonRefs.push({ key: 'explore', btn, marker });

    const origX = x;
    btn.on('pointerover', () => {
      if (this._activeTab === 'explore') return;
      this.tweens.add({ targets: btn, x: origX + shift, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#e8c080' });
      marker.setStyle({ fill: '#c06820' });
    });
    btn.on('pointerout', () => {
      if (this._activeTab === 'explore') return;
      this.tweens.add({ targets: btn, x: origX, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#7a5030' });
      marker.setStyle({ fill: '#4a2a10' });
    });
    btn.on('pointerdown', () => this._switchTab('explore'));
  }

  _buildTopButtons(W, H) {
    const bh  = parseInt(scaledFontSize(30, this.scale));
    const by  = H * 0.045;
    const gap = W * 0.008;

    const settingW = parseInt(scaledFontSize(60, this.scale));
    const settingX = W - W * 0.022 - settingW / 2;
    this._makeTopBtn(settingX, by, settingW, bh, '설  정', () => {
      this.scene.start('SettingsScene', { from: 'AtelierScene' });
    });

    const lobbyW = parseInt(scaledFontSize(60, this.scale));
    const lobbyX = settingX - settingW / 2 - gap - lobbyW / 2;
    this._makeTopBtn(lobbyX, by, lobbyW, bh, '← 로비', () => {
      this._goLobby();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('SettingsScene', { from: 'AtelierScene' });
    });
  }

  _makeTopBtn(bx, by, bw, bh, label, onClick) {
    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x1e1208 : 0x100a04, 1);
      bg.lineStyle(1, hover ? 0x6a3810 : 0x3a2210, 0.9);
      bg.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);
      bg.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
    };
    draw(false);

    this.add.text(bx, by, label, {
      fontSize: scaledFontSize(13, this.scale),
      fill: '#8a6030',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const hit = this.add.rectangle(bx, by, bw, bh, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout',  () => draw(false));
    hit.on('pointerdown', onClick);
  }

  _goLobby() {
    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x060408, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 300, ease: 'Sine.easeIn',
      onComplete: () => this.scene.start('LobbyScene'),
    });
  }
}
