// ================================================================
//  Recruit_Ready.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Ready.js
//
//  역할: Phase 1 — 영입 패널 (가격 표시 + 영입 버튼)
//  의존: Recruit_Data.js, Tab_Recruit.js(this)
// ================================================================

Tab_Recruit.prototype._buildReady = function () {
  this._clear();

  const { scene, W, H } = this;
  const cx = W / 2;
  const cy = H * 0.52;
  const panelW = W * 0.54;
  const panelH = H * 0.55;

  // ── 패널 배경 ───────────────────────────────────────────────
  const panel = scene.add.graphics();
  panel.fillStyle(0x120d07, 1);
  panel.lineStyle(2, 0x7a4018, 0.85);
  panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
  panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

  // ── 코너 장식 ───────────────────────────────────────────────
  const deco = scene.add.graphics();
  deco.lineStyle(1, 0x7a4018, 0.7);
  const cs = 14;
  const px  = cx - panelW / 2 + 8;  const py  = cy - panelH / 2 + 8;
  const px2 = cx + panelW / 2 - 8;  const py2 = cy + panelH / 2 - 8;
  deco.lineBetween(px,  py,  px + cs, py);   deco.lineBetween(px,  py,  px,  py + cs);
  deco.lineBetween(px2, py,  px2 - cs, py);  deco.lineBetween(px2, py,  px2, py + cs);
  deco.lineBetween(px,  py2, px + cs, py2);  deco.lineBetween(px,  py2, px,  py2 - cs);
  deco.lineBetween(px2, py2, px2 - cs, py2); deco.lineBetween(px2, py2, px2, py2 - cs);

  // ── [ 영  입 ] 라벨 ─────────────────────────────────────────
  const labelY = cy - panelH / 2 + parseInt(this._fs(26));
  const recruitLabel = scene.add.text(cx, labelY, '[ 영  입 ]', {
    fontSize: this._fs(13), fill: '#7a5028',
    fontFamily: FontManager.MONO, letterSpacing: 3,
  }).setOrigin(0.5);

  // ── 구분선 ──────────────────────────────────────────────────
  const lineY = cy - panelH / 2 + parseInt(this._fs(44));
  const lineG = scene.add.graphics();
  lineG.lineStyle(1, 0x4a2a10, 0.9);
  lineG.lineBetween(cx - panelW / 2 + 20, lineY, cx + panelW / 2 - 20, lineY);

  // ── 메인 텍스트 (타이핑) ────────────────────────────────────
  const txt = scene.add.text(cx, cy - panelH * 0.10, '', {
    fontSize: this._fs(22), fill: '#e8c080', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5).setAlpha(0);

  // ── 가격 표시 ───────────────────────────────────────────────
  const priceY     = cy + panelH * 0.09;
  const priceLabel = scene.add.text(cx, priceY - parseInt(this._fs(22)), '영입 비용', {
    fontSize: this._fs(10), fill: '#4a2a10', fontFamily: FontManager.MONO,
  }).setOrigin(0.5).setAlpha(0);

  this._priceTxt = scene.add.text(cx, priceY, `${this.price}  Arc`, {
    fontSize: this._fs(28), fill: '#c8a070', fontFamily: FontManager.MONO,
    stroke: '#0a0604', strokeThickness: 4,
  }).setOrigin(0.5).setAlpha(0);

  // ── 영입 버튼 ───────────────────────────────────────────────
  const btnW = parseInt(this._fs(130));
  const btnH = parseInt(this._fs(50));
  const btnY = cy + panelH * 0.33;

  const btnBg   = scene.add.graphics().setAlpha(0);
  const btnGlow = scene.add.graphics().setAlpha(0);

  const drawBtn = (state) => {
    btnBg.clear();
    if (state === 'hover') {
      btnBg.fillStyle(0x5a2808, 1); btnBg.lineStyle(2, 0xc87030, 1);
    } else if (state === 'down') {
      btnBg.fillStyle(0x2a1004, 1); btnBg.lineStyle(2, 0x9a5018, 1);
    } else {
      btnBg.fillStyle(0x3a1a08, 1); btnBg.lineStyle(2, 0xa05018, 0.95);
    }
    btnBg.strokeRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
    btnBg.fillRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
  };
  drawBtn('normal');

  const drawGlow = (intensity) => {
    btnGlow.clear();
    [
      { pad: 14, alpha: 0.04 * intensity, col: 0xc86020 },
      { pad:  8, alpha: 0.12 * intensity, col: 0xc87030 },
      { pad:  4, alpha: 0.25 * intensity, col: 0xa05018 },
      { pad:  1, alpha: 0.48 * intensity, col: 0x8a3a10 },
    ].forEach(({ pad, alpha, col }) => {
      btnGlow.lineStyle(2, col, alpha);
      btnGlow.strokeRect(cx - btnW/2 - pad, btnY - btnH/2 - pad, btnW + pad*2, btnH + pad*2);
    });
  };

  const btnTxt = scene.add.text(cx, btnY, '영  입', {
    fontSize: this._fs(24), fill: '#c8a070', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5).setAlpha(0);

  // ✏️ hit은 씬 직접 추가 — 컨테이너가 tween으로 이동 시 hit 영역이 갱신 안 되는 버그 방지
  const hit = scene.add.rectangle(cx, btnY, btnW, btnH, 0, 0)
    .setInteractive({ useHandCursor: true }).setDepth(20);

  // ✏️ _onHire() 후 씬 전환으로 btnTxt가 destroy되어도 이벤트가 발화할 수 있음
  //    → btnTxt.active 체크로 죽은 객체 접근 차단
  hit.on('pointerover', () => { if (!btnTxt.active) return; drawBtn('hover');  btnTxt.setStyle({ fill: '#e8c080' }); });
  hit.on('pointerout',  () => { if (!btnTxt.active) return; drawBtn('normal'); btnTxt.setStyle({ fill: '#c8a070' }); });
  hit.on('pointerdown', () => { if (!btnTxt.active) return; drawBtn('down');   btnTxt.setStyle({ fill: '#a07040' }); });
  hit.on('pointerup',   () => this._onHire());

  this._container.add([panel, deco, recruitLabel, lineG, txt, priceLabel, this._priceTxt, btnGlow, btnBg, btnTxt]);
  this._sceneHits.push(hit);

  // ── 등장 연출 ───────────────────────────────────────────────
  this._delay(80, () => {
    this._typeText(txt, '새로운 동료를 영입하시겠습니까?', 48, () => {
      this._delay(160, () => {
        this._tween({ targets: [this._priceTxt, priceLabel], alpha: 1, duration: 300, ease: 'Sine.easeOut' });
        this._delay(200, () => this._revealBtn(btnBg, btnGlow, btnTxt, drawBtn, drawGlow));
      });
    });
  });
};

Tab_Recruit.prototype._revealBtn = function (btnBg, btnGlow, btnTxt, drawBtn, drawGlow) {
  this._tween({ targets: btnBg, alpha: { from: 0, to: 1 }, duration: 220 });
  this._delay(80, () => {
    btnGlow.setAlpha(1);
    const go = { v: 0 };
    this._tween({
      targets: go, v: 1, duration: 550, ease: 'Sine.easeOut',
      onUpdate: () => drawGlow(go.v),
      onComplete: () => {
        this._tween({
          targets: go, v: { from: 1, to: 0.35 },
          duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          onUpdate: () => drawGlow(go.v),
        });
      },
    });
  });
  this._delay(100, () => {
    this._tween({ targets: btnTxt, alpha: { from: 0, to: 1 }, duration: 280 });
    this._delay(300, () => {
      this._tween({
        targets: btnTxt, alpha: { from: 1, to: 0.65 },
        duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });
  });
};

Tab_Recruit.prototype._typeText = function (textObj, fullText, charDelay, onDone) {
  textObj.setAlpha(1).setText('');
  const chars = [...fullText];
  let i = 0;
  const tick = () => {
    if (!textObj || !textObj.scene) return;
    if (i < chars.length) {
      textObj.setText(chars.slice(0, ++i).join(''));
      this._delay(charDelay, tick);
    } else {
      if (onDone) onDone();
    }
  };
  this._delay(charDelay, tick);
};

Tab_Recruit.prototype._onHire = function () {
  const save = SaveManager.load() || {};
  if ((save.arc ?? 0) < this.price) { this._toast('Arc 부족!'); return; }
  save.arc -= this.price;
  this.price += RECRUIT_PRICE_STEP;
  save.recruitPrice = this.price;
  SaveManager.save(save);
  this.scene.events.emit('arcUpdated', save.arc);

  // ── 탭 이동 차단: AtelierScene 사이드 버튼 interactive 비활성화 ──
  this._lockTabs();

  this._buildSlot();
};
