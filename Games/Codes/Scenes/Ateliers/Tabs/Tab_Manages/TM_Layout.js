// ================================================================
//  TM_Layout.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Manages/TM_Layout.js
//
//  역할: 배경(BG_004 풀스크린) / 헤더 / 구분선 / 돌아가기 버튼
// ================================================================

const TM_Layout = {

  // ── 전체 배경 + Background_004 풀스크린 페이드 ──────────────
  buildBackground(tab, fs) {
    const { scene, W, H } = tab;

    // ── index 0: 어두운 베이스 ──────────────────────────────
    const base = scene.add.graphics();
    base.fillStyle(0x060504, 1);
    base.fillRect(0, 0, W, H);
    tab._container.add(base);

    // ── index 1: BG_004 자리 플레이스홀더 ───────────────────
    const placeholder = scene.add.graphics();
    tab._bgPlaceholder = placeholder;
    tab._container.add(placeholder);

    const BG_KEY  = 'manage_bg_004';
    const BG_PATH = 'Games/Assets/Sprites/Background_004.png';

    const applyBg = () => {
      if (!tab._container || !tab._container.scene) return;

      const img = scene.add.image(W / 2, H / 2, BG_KEY).setOrigin(0.5);
      const scale = Math.max(W / img.width, H / img.height);
      img.setScale(scale).setAlpha(0.75);

      const ov = scene.add.graphics();
      ov.fillStyle(0x000000, 0.20);
      ov.fillRect(0, 0, W, H);

      const idx = tab._bgPlaceholder
        ? tab._container.getIndex(tab._bgPlaceholder)
        : -1;

      if (idx !== -1) {
        tab._bgPlaceholder.destroy();
        tab._bgPlaceholder = null;
        tab._container.addAt(img, idx);
        tab._container.addAt(ov,  idx + 1);
      } else {
        tab._container.addAt(ov,  1);
        tab._container.addAt(img, 1);
      }
    };

    if (!scene.textures.exists(BG_KEY)) {
      // _bgLoadCb에 저장하여 destroy() 시 리스너 제거 가능하게 함
      tab._bgLoadCb = applyBg;
      scene.load.once('complete', applyBg);
      scene.load.image(BG_KEY, BG_PATH);
      scene.load.start();
    } else {
      applyBg();
    }
  },

  // ── 헤더 패널 ────────────────────────────────────────────────
  buildHeader(tab, fs, hdrH) {
    const { scene, W } = tab;
    tab._headerPanel = scene.add.container(0, 0);

    const hdrBg = scene.add.graphics();
    hdrBg.fillStyle(0x06090d, 0.88);
    hdrBg.lineStyle(1, 0x4a2a10, 0.8);
    hdrBg.fillRect(0, 0, W, hdrH);
    hdrBg.lineBetween(0, hdrH, W, hdrH);

    const title = scene.add.text(W / 2, hdrH / 2, '[ 캐 릭 터  관 리 ]', {
      fontSize: fs(15), fill: '#8a5828', fontFamily: FontManager.MONO, letterSpacing: 3,
    }).setOrigin(0.5);

    tab._headerPanel.add([hdrBg, title]);
    tab._container.add(tab._headerPanel);
  },

  // ── 구분선 ───────────────────────────────────────────────────
  buildDividers(tab, backBtnH) {
    const { scene, W, H } = tab;
    const { _listW: lw, _centerW: cw, _bodyY: by } = tab;

    const g  = scene.add.graphics();
    const pm = tab._panelMargin || 0;
    g.lineStyle(1, 0x3a1e0a, 0.35);
    const lineTop    = by;
    const lineBottom = H - backBtnH - pm;
    g.lineBetween(lw,      lineTop, lw,      lineBottom);
    g.lineBetween(lw + cw, lineTop, lw + cw, lineBottom);
    g.lineBetween(0, lineBottom, W, lineBottom);
    tab._container.add(g);
  },

  // ── 돌아가기 버튼 (하단, 사이드버튼 스타일) ─────────────────
  buildBackBtn(tab, fs, backBtnH) {
    const { scene, W, H } = tab;
    tab._backBtn = scene.add.container(0, 0);

    const btnY  = H - backBtnH / 2;
    const origX = parseInt(fs(72));
    const shift = parseInt(fs(8));

    const marker = scene.add.text(origX - parseInt(fs(26)), btnY, '│', {
      fontSize: fs(18), fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    const btn = scene.add.text(origX, btnY, '← 돌아가기', {
      fontSize: fs(26), fill: '#7a5030', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5);

    const ulG = scene.add.graphics();
    const drawUL = (on) => {
      ulG.clear();
      if (!on) return;
      ulG.lineStyle(1, 0x8b4010, 0.9);
      ulG.lineBetween(
        origX,
        btnY + parseInt(fs(17)),
        origX + parseInt(fs(26)) * 3.8,
        btnY + parseInt(fs(17))
      );
    };

    const btnW = parseInt(fs(26)) * 6;
    const btnH = parseInt(fs(30));
    const hit  = scene.add.rectangle(origX + btnW / 2, btnY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(20);

    hit.on('pointerover', () => {
      // hover 트윈을 _layoutTweens에 추적하여 destroy() 시 강제 중단 가능
      tab._layoutTweens.push(
        scene.tweens.add({ targets: btn, x: origX + shift, duration: 100, ease: 'Sine.easeOut' })
      );
      btn.setStyle({ fill: '#e8c080' });
      marker.setStyle({ fill: '#c06820' });
      ulG.setAlpha(1);
      drawUL(true);
    });
    hit.on('pointerout', () => {
      tab._layoutTweens.push(
        scene.tweens.add({ targets: btn, x: origX, duration: 100, ease: 'Sine.easeOut' })
      );
      btn.setStyle({ fill: '#7a5030' });
      marker.setStyle({ fill: '#4a2a10' });
      ulG.setAlpha(0);
      drawUL(false);
    });
    hit.on('pointerdown', () => {
      if (tab.onBack) tab.onBack();
    });

    tab._detailObjs.push(hit);

    tab._backBtn.add([marker, btn, ulG]);
    tab._backBtn._origX = origX;
    tab._container.add(tab._backBtn);
  },
};
