// ================================================================
//  AtelierScene.js
//  경로: Games/Codes/Scenes/Atelier/AtelierScene.js
//
//  역할: 공방(Atelier) 메인 화면
//    - 상단 중앙 HUD: Day / Arc
//    - 우측 탭: 영입 / 탐사대 / 시설 / 외주 / 드레지
//    - 좌측 탭: 창고 / 도감 / 회상
//    - 중앙 하단: 탐색 (기본 탭)
//    - 우측 상단 설정 버튼
//
//  의존: FontManager, SaveManager, InputManager, utils.js
//        AtelierHUD, AtelierTabs, Tab_Explore, Tab_Stubs
// ================================================================

class AtelierScene extends Phaser.Scene {
  constructor() { super({ key: 'AtelierScene' }); }

  init(data) {
    this._activeTab = data.tab || 'explore';
    this._fromScene = data.from || 'LobbyScene';
  }

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;

    InputManager.reinit(this);

    this._buildBackground(W, H);
    this._buildHUD(W, H);
    this._buildAllTabs(W, H);
    this._buildTabButtons(W, H);
    this._buildSettingsButton(W, H);

    this._showTab(this._activeTab);
  }

  // ── 배경 ──────────────────────────────────────────────────────
  _buildBackground(W, H) {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x1a0e06, 0.22);
      scan.lineBetween(0, y, W, y);
    }

    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    grid.lineStyle(1, 0x0f0a05, 0.6);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);

    // 공방 이름 워터마크
    this.add.text(W / 2, H * 0.50, 'ATELIER', {
      fontSize:   scaledFontSize(80, this.scale),
      fill:       '#0a0705',
      fontFamily: FontManager.TITLE,
      alpha:      1,
    }).setOrigin(0.5).setAlpha(0.13);
  }

  // ── HUD (Day / Arc) ──────────────────────────────────────────
  _buildHUD(W, H) {
    new AtelierHUD(this, W, H);
  }

  // ── 탭 인스턴스 생성 ─────────────────────────────────────────
  _buildAllTabs(W, H) {
    this._tabs = {
      explore:   new Tab_Explore(this, W, H),
      recruit:   new Tab_Recruit(this, W, H),
      squad:     new Tab_Squad(this, W, H),
      facility:  new Tab_Facility(this, W, H),
      outsource: new Tab_Outsource(this, W, H),
      dredge:    new Tab_Dredge(this, W, H),
      storage:   new Tab_Storage(this, W, H),
      codex:     new Tab_Codex(this, W, H),
      memory:    new Tab_Memory(this, W, H),
    };
    Object.values(this._tabs).forEach(t => t.hide());
  }

  // ── 탭 버튼 레이아웃 ─────────────────────────────────────────
  //
  //  [ 창고 ]  [ 도감 ]  [ 회상 ]      HUD      [ 영입 ] [ 탐사대 ] [ 시설 ] [ 외주 ] [ 드레지 ]
  //                                                              
  //                              [ 탐  색 ]
  //
  _buildTabButtons(W, H) {
    const tabH   = parseInt(scaledFontSize(36, this.scale));
    const tabY   = H * 0.13;
    const gap    = W * 0.008;

    // ── 우측 탭 (5개) ───────────────────────────────────────────
    const rightTabs = [
      { key: 'recruit',   label: '영  입'   },
      { key: 'squad',     label: '탐사대'   },
      { key: 'facility',  label: '시  설'   },
      { key: 'outsource', label: '외  주'   },
      { key: 'dredge',    label: '드레지'   },
    ];
    const rightTabW = W * 0.095;
    const rightStartX = W * 0.545;

    rightTabs.forEach((tab, i) => {
      const tx = rightStartX + i * (rightTabW + gap) + rightTabW / 2;
      makeAtelierTab(this, {
        x: tx, y: tabY, w: rightTabW, h: tabH,
        label: tab.label,
        selected: this._activeTab === tab.key,
        onClick: () => this._switchTab(tab.key),
      });
    });

    // ── 좌측 탭 (3개) ───────────────────────────────────────────
    const leftTabs = [
      { key: 'storage', label: '창  고' },
      { key: 'codex',   label: '도  감' },
      { key: 'memory',  label: '회  상' },
    ];
    const leftTabW  = W * 0.095;
    const leftStartX = W * 0.055;

    leftTabs.forEach((tab, i) => {
      const tx = leftStartX + i * (leftTabW + gap) + leftTabW / 2;
      makeAtelierTab(this, {
        x: tx, y: tabY, w: leftTabW, h: tabH,
        label: tab.label,
        selected: this._activeTab === tab.key,
        onClick: () => this._switchTab(tab.key),
      });
    });

    // ── 중앙 하단 탐색 버튼 ─────────────────────────────────────
    const exploreW = W * 0.18;
    const exploreH = parseInt(scaledFontSize(34, this.scale));
    const exploreY = H * 0.88;

    makeAtelierTab(this, {
      x: W / 2, y: exploreY, w: exploreW, h: exploreH,
      label: '탐    색',
      selected: this._activeTab === 'explore',
      onClick: () => this._switchTab('explore'),
    });

    // 탐색 버튼 위 구분선
    const sepLine = this.add.graphics();
    sepLine.lineStyle(1, 0x2a1a0a, 0.6);
    sepLine.lineBetween(W * 0.30, H * 0.835, W * 0.70, H * 0.835);
  }

  // ── 설정 버튼 (우측 상단 고정) ─────────────────────────────
  _buildSettingsButton(W, H) {
    const bw = parseInt(scaledFontSize(52, this.scale));
    const bh = parseInt(scaledFontSize(28, this.scale));
    const bx = W - W * 0.022 - bw / 2;
    const by = H * 0.045;

    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x140c05 : 0x0a0705, 1);
      bg.lineStyle(1, hover ? 0x4a2810 : 0x2a1a0a, 0.8);
      bg.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);
      bg.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
    };
    draw(false);

    this.add.text(bx, by, '설  정', {
      fontSize:   scaledFontSize(11, this.scale),
      fill:       '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const hit = this.add.rectangle(bx, by, bw, bh, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout',  () => draw(false));
    hit.on('pointerdown', () => {
      this.scene.start('SettingsScene', { from: 'AtelierScene' });
    });

    // ESC → 설정
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('SettingsScene', { from: 'AtelierScene' });
    });
  }

  // ── 탭 전환 ──────────────────────────────────────────────────
  _showTab(key) {
    Object.entries(this._tabs).forEach(([k, t]) => {
      k === key ? t.show() : t.hide();
    });
    this._activeTab = key;
  }

  _switchTab(key) {
    if (key === this._activeTab) return;
    this._showTab(key);
    // 탭 버튼 강조는 scene.restart 없이 그래픽으로 직접 처리하려면
    // 별도 상태 관리가 필요해 단순하게 restart 사용
    this.scene.restart({ tab: key, from: this._fromScene });
  }
}
