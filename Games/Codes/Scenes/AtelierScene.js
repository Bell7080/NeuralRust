// ================================================================
//  AtelierScene.js
//  경로: Games/Codes/Scenes/AtelierScene.js
// ================================================================

class AtelierScene extends Phaser.Scene {
  constructor() { super({ key: 'AtelierScene' }); }

  init(data) {
    // 웰컴 화면 중에는 activeTab을 null로 유지 → 어떤 버튼도 활성 표시 안 됨
    // 실제 탭 전환은 _switchTab에서 _activeTab을 설정하므로 문제 없음
    this._pendingTab  = data.tab  || 'explore';
    this._activeTab   = null;
    this._fromScene   = data.from || 'LobbyScene';
    this._skipWelcome = data.skipWelcome || false;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W;
    this.H = H;

    InputManager.reinit(this);
    CharacterManager.initIfEmpty();

    this._buildBackground(W, H);
    this._buildHUD(W, H);
    this._sideButtonRefs = [];
    this._uiAnimTargets  = [];
    this._buildSideButtons(W, H);
    this._buildTopButtons(W, H);

    this._currentTabObj = null;
    this._switchTab(this._pendingTab, true);

    if (!this._skipWelcome && this._fromScene === 'LobbyScene') {
      this._showWelcome();
    } else {
      this._animateUIIn(true);
    }
  }

  // ── 웰컴 팝업 ────────────────────────────────────────────────
  // onClose = 타이핑 완료 콜백 → UI 슬라이드인
  // _welcomeObj는 탭 클릭 시 _switchTab → build()에서 destroy
  _showWelcome() {
    // 웰컴 화면 중에는 언더라인 숨기기
    if (this._sideButtonRefs) {
      this._sideButtonRefs.forEach(({ underline }) => {
        if (underline) underline.setAlpha(0);
      });
    }
    this._welcomeObj = new Tab_Welcome(this, this.W, this.H, () => {
      this._animateUIIn(false);
      // 슬라이드인 후 활성 탭 언더라인 복원
      this.time.delayedCall(400, () => this._rebuildSideButtonColors());
    });
  }

  // ── UI 등장 애니메이션 ────────────────────────────────────────
  _animateUIIn(instant) {
    if (!this._uiAnimTargets) return;

    this._uiAnimTargets.forEach(({ obj, originX, originY, dir, delay, onShow }) => {
      if (!obj || !obj.scene) return;

      if (instant) {
        obj.setAlpha(1).setPosition(originX, originY);
        if (onShow) onShow();
        return;
      }

      const offX = dir === 'left' ? -80 : dir === 'right' ? 80 : 0;
      const offY = dir === 'up'   ? -50 : dir === 'down'  ? 50 : 0;

      obj.setAlpha(0).setPosition(originX + offX, originY + offY);
      this.tweens.add({
        targets: obj,
        x: originX, y: originY, alpha: 1,
        duration: 320, delay: delay || 0,
        ease: 'Back.easeOut',
        onComplete: () => { if (onShow) onShow(); },
      });
    });
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
    this._hud = new AtelierHUD(this, W, H);
  }

  _switchTab(key, instant = false) {
    // 웰컴이 살아있거나 다른 탭이면 전환 허용
    if (!instant && key === this._activeTab && !this._welcomeObj) return;

    const W = this.W;
    const H = this.H;

    const TabMap = {
      explore: Tab_Explore, recruit: Tab_Recruit, manage: Tab_Manage, squad: Tab_Squad,
      facility: Tab_Facility, outsource: Tab_Outsource, dredge: Tab_Dredge,
      shop: Tab_Shop, storage: Tab_Storage, codex: Tab_Codex, memory: Tab_Memory,
    };

    const build = () => {
      // ── 웰컴 팝업 페이드아웃 후 destroy ─────────────────────
      if (this._welcomeObj) {
        const wo = this._welcomeObj;
        this._welcomeObj = null;
        this.tweens.add({
          targets: wo._container,
          alpha: 0, duration: 200, ease: 'Sine.easeIn',
          onComplete: () => wo.destroy(),
        });
      }

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
    this._sideButtonRefs.forEach(({ key, btn, marker, underline, drawUnderline }) => {
      const active = key === this._activeTab;
      btn.setStyle({ fill: active ? '#e8c080' : '#7a5030' });
      marker.setStyle({ fill: active ? '#c06820' : '#4a2a10' });
      if (underline) underline.setAlpha(active ? 1 : 0);
      if (drawUnderline) drawUnderline(active);
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
        item.key, false, i
      );
      this._sideButtonRefs.push({ key: item.key, ...refs });
    });

    const rightItems = [
      { key: 'recruit',   label: '영  입'   },
      { key: 'manage',    label: '관  리'   },
      { key: 'squad',     label: '탐 사 대' },
      { key: 'facility',  label: '시  설'   },
      { key: 'outsource', label: '외  주'   },
      { key: 'dredge',    label: '드 레 지' },
    ];
    rightItems.forEach((item, i) => {
      const refs = this._makeSideButton(
        item.label, W * 0.93,
        H * 0.22 + i * parseInt(scaledFontSize(52, this.scale)),
        item.key, true, i
      );
      this._sideButtonRefs.push({ key: item.key, ...refs });
    });

    this._makeExploreButton(W / 2, H * 0.86);
  }

  _makeSideButton(label, x, y, key, alignRight, idx) {
    const isActive = this._activeTab === key;
    const indent   = parseInt(scaledFontSize(18, this.scale));
    const shift    = parseInt(scaledFontSize(8, this.scale));

    const marker = this.add.text(
      alignRight ? x + indent : x - indent, y, '│', {
        fontSize: scaledFontSize(18, this.scale),
        fill: isActive ? '#c06820' : '#4a2a10',
        fontFamily: FontManager.MONO,
      }
    ).setOrigin(alignRight ? 0 : 1, 0.5).setAlpha(0);

    const btn = this.add.text(x, y, label, {
      fontSize: scaledFontSize(26, this.scale),
      fill: isActive ? '#e8c080' : '#7a5030',
      fontFamily: FontManager.TITLE,
    }).setOrigin(alignRight ? 1 : 0, 0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const underline = this.add.graphics().setAlpha(0);
    const origX = x;
    // uw를 btn.width 대신 폰트 기반 고정값 사용 (setAlpha(0) 시 width=0 방지)
    const sideUW = parseInt(scaledFontSize(26, this.scale)) * 2.8 + shift + 4;

    const drawUnderline = (on) => {
      underline.clear();
      if (!on) return;
      underline.lineStyle(1, 0x8b4010, 0.9);
      const ly = y + parseInt(scaledFontSize(17, this.scale));
      if (alignRight) underline.lineBetween(x - sideUW, ly, x, ly);
      else            underline.lineBetween(x, ly, x + sideUW, ly);
    };
    if (isActive) drawUnderline(true);

    btn.on('pointerover', () => {
      if (key === this._activeTab) return;
      this.tweens.add({ targets: btn, x: alignRight ? origX - shift : origX + shift, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#e8c080' });
      marker.setStyle({ fill: '#c06820' });
      underline.setAlpha(1);
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

    const dir = alignRight ? 'right' : 'left';
    const delay = 80 + idx * 40;
    this._uiAnimTargets.push({ obj: btn,    originX: x, originY: y, dir, delay });
    this._uiAnimTargets.push({ obj: marker, originX: alignRight ? x + indent : x - indent, originY: y, dir, delay: delay + 20 });
    // underline은 Graphics라 tween position 불가 — _rebuildSideButtonColors에서만 제어

    return { btn, marker, underline, drawUnderline };
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
    }).setOrigin(1, 0.5).setAlpha(0);

    const btn = this.add.text(x, y, '탐    색', {
      fontSize: scaledFontSize(28, this.scale),
      fill: this._activeTab === 'explore' ? '#e8c080' : '#7a5030',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);

    // explore 언더라인 — uw는 btn.width 대신 폰트 기반 고정값 사용
    const exploreUnderline = this.add.graphics().setAlpha(0);
    const exploreUW = parseInt(scaledFontSize(28, this.scale)) * 3.2 + parseInt(scaledFontSize(8, this.scale)) + 4;
    const drawExploreUnderline = (on) => {
      exploreUnderline.clear();
      if (!on) return;
      const ly = y + parseInt(scaledFontSize(19, this.scale));
      exploreUnderline.lineStyle(1, 0x8b4010, 0.9);
      exploreUnderline.lineBetween(x - exploreUW / 2, ly, x + exploreUW / 2, ly);
    };
    if (this._activeTab === 'explore') drawExploreUnderline(true);

    this._sideButtonRefs.push({ key: 'explore', btn, marker, underline: exploreUnderline, drawUnderline: drawExploreUnderline });

    const origX = x;
    btn.on('pointerover', () => {
      if (this._activeTab === 'explore') return;
      this.tweens.add({ targets: btn, x: origX + shift, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#e8c080' });
      marker.setStyle({ fill: '#c06820' });
      exploreUnderline.setAlpha(1);
      drawExploreUnderline(true);
    });
    btn.on('pointerout', () => {
      if (this._activeTab === 'explore') return;
      this.tweens.add({ targets: btn, x: origX, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#7a5030' });
      marker.setStyle({ fill: '#4a2a10' });
      drawExploreUnderline(false);
    });
    btn.on('pointerdown', () => this._switchTab('explore'));

    const isExploreActive = this._activeTab === 'explore';
    this._uiAnimTargets.push({ obj: btn,    originX: x, originY: y, dir: 'down', delay: 200 });
    this._uiAnimTargets.push({ obj: marker, originX: x - parseInt(scaledFontSize(36, this.scale)), originY: y, dir: 'down', delay: 220 });
    // exploreUnderline은 Graphics라 tween position 불가 — _rebuildSideButtonColors에서만 제어
  }

  _buildTopButtons(W, H) {
    const bh  = parseInt(scaledFontSize(30, this.scale));
    const by  = H * 0.045;
    const gap = W * 0.008;

    const settingW = parseInt(scaledFontSize(60, this.scale));
    const settingX = W - W * 0.022 - settingW / 2;
    const settingObjs = this._makeTopBtn(settingX, by, settingW, bh, '설  정', () => {
      this.scene.start('SettingsScene', { from: 'AtelierScene' });
    });

    const lobbyW = parseInt(scaledFontSize(60, this.scale));
    const lobbyX = settingX - settingW / 2 - gap - lobbyW / 2;
    const lobbyObjs = this._makeTopBtn(lobbyX, by, lobbyW, bh, '← 로비', () => {
      this._goLobby();
    });

    [settingObjs, lobbyObjs].forEach(({ hit }, i) => {
      if (hit) this._uiAnimTargets.push({ obj: hit, originX: hit.x, originY: by, dir: 'up', delay: i * 40 });
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

    return { bg, hit };
  }

  _goLobby() {
    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x060408, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 300, ease: 'Sine.easeIn',
      onComplete: () => this.scene.start('LobbyScene'),
    });
  }

  // ── UI 슬라이드아웃 연출 → 콜백 ─────────────────────────────
  // 탐색 확인 버튼 클릭 시 호출 — 좌/우 사이드 버튼 + 탐색 버튼 슬라이드아웃
  _slideOutUIThen(onComplete) {
    const W = this.W;
    const H = this.H;
    const duration = 220;
    const stagger  = 35;

    // 슬라이드아웃 대상 수집
    const leftBtns  = this._uiAnimTargets.filter(t => t.dir === 'left');
    const rightBtns = this._uiAnimTargets.filter(t => t.dir === 'right');
    const downBtns  = this._uiAnimTargets.filter(t => t.dir === 'down' || t.dir === 'up');
    const allBtns   = [...leftBtns, ...rightBtns, ...downBtns];

    // 현재 탭 컨테이너도 페이드아웃
    if (this._currentTabObj && this._currentTabObj._container) {
      this.tweens.add({
        targets: this._currentTabObj._container,
        alpha: 0, duration: duration, ease: 'Sine.easeIn',
      });
    }

    // 좌측 버튼: 왼쪽으로 슬라이드아웃
    leftBtns.forEach((t, i) => {
      if (!t.obj || !t.obj.scene) return;
      this.tweens.add({
        targets: t.obj,
        x: t.originX - W * 0.18,
        alpha: 0,
        duration, delay: i * stagger, ease: 'Sine.easeIn',
      });
    });

    // 우측 버튼: 오른쪽으로 슬라이드아웃
    rightBtns.forEach((t, i) => {
      if (!t.obj || !t.obj.scene) return;
      this.tweens.add({
        targets: t.obj,
        x: t.originX + W * 0.18,
        alpha: 0,
        duration, delay: i * stagger, ease: 'Sine.easeIn',
      });
    });

    // 하단/상단 버튼: 아래로 슬라이드아웃
    downBtns.forEach((t, i) => {
      if (!t.obj || !t.obj.scene) return;
      this.tweens.add({
        targets: t.obj,
        y: t.originY + H * 0.12,
        alpha: 0,
        duration, delay: i * stagger, ease: 'Sine.easeIn',
      });
    });

    // 모든 트윈 완료 후 페이드 전환
    const totalDelay = duration + allBtns.length * stagger + 60;
    this.time.delayedCall(totalDelay, () => {
      const flash = this.add.rectangle(0, 0, W, H, 0x060408, 0)
        .setOrigin(0).setDepth(999);
      this.tweens.add({
        targets: flash, alpha: 1, duration: 280, ease: 'Sine.easeIn',
        onComplete: () => { if (onComplete) onComplete(); },
      });
    });
  }
}
