// ================================================================
//  Tab_Manage_Utils.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Manage_Utils.js
//
//  역할: 관리 탭 — 툴팁, 버튼 드로우, 회복, 토스트, 생명주기
//  의존: Tab_Manage.js (prototype 확장)
// ================================================================

Object.assign(Tab_Manage.prototype, {

  // ── 툴팁 ─────────────────────────────────────────────────────
  _showTooltip(x, y, text) {
    this._hideTooltip();
    const { scene } = this;
    const pad  = 12;
    const maxW = parseInt(scaledFontSize(220, scene.scale));

    const txtObj = scene.add.text(0, 0, text, {
      fontSize:   scaledFontSize(13, scene.scale),
      fill:       '#f0e0b0',
      fontFamily: FontManager.MONO,
      wordWrap:   { width: maxW },
    }).setDepth(502);

    const bw = txtObj.width  + pad * 2;
    const bh = txtObj.height + pad * 2;
    let tx = x + 18, ty = y + 18;
    if (tx + bw > this.W - 10) tx = x - bw - 10;
    if (ty + bh > this.H - 10) ty = y - bh - 10;

    const bgObj = scene.add.graphics().setDepth(501);
    bgObj.fillStyle(0x0d0b07, 0.97);
    bgObj.lineStyle(2, 0x9a6020, 1);
    bgObj.strokeRect(tx, ty, bw, bh);
    bgObj.fillRect(tx, ty, bw, bh);
    bgObj.lineStyle(1, 0x3a2010, 0.5);
    bgObj.strokeRect(tx + 3, ty + 3, bw - 6, bh - 6);
    txtObj.setPosition(tx + pad, ty + pad);

    this._tooltip = { bg: bgObj, txt: txtObj };
  },

  _moveTooltip(x, y) {
    if (!this._tooltip) return;
    const { txt, bg } = this._tooltip;
    const pad = 12;
    const bw  = txt.width  + pad * 2;
    const bh  = txt.height + pad * 2;
    let tx = x + 18, ty = y + 18;
    if (tx + bw > this.W - 10) tx = x - bw - 10;
    if (ty + bh > this.H - 10) ty = y - bh - 10;

    bg.clear();
    bg.fillStyle(0x0d0b07, 0.97);
    bg.lineStyle(2, 0x9a6020, 1);
    bg.strokeRect(tx, ty, bw, bh);
    bg.fillRect(tx, ty, bw, bh);
    bg.lineStyle(1, 0x3a2010, 0.5);
    bg.strokeRect(tx + 3, ty + 3, bw - 6, bh - 6);
    txt.setPosition(tx + pad, ty + pad);
  },

  _hideTooltip() {
    if (this._tooltip) {
      this._tooltip.bg.destroy();
      this._tooltip.txt.destroy();
      this._tooltip = null;
    }
  },

  // ── 버튼 드로우 ───────────────────────────────────────────────
  _drawBtn(gfx, x, y, w, h, danger, hover = false) {
    gfx.clear();
    if (danger) {
      gfx.fillStyle(hover ? 0x241010 : 0x180a08, 1);
      gfx.lineStyle(1, hover ? 0x8a3020 : 0x4a2010, 0.9);
    } else {
      gfx.fillStyle(hover ? 0x102010 : 0x0a1208, 1);
      gfx.lineStyle(1, hover ? 0x4a8030 : 0x2a4018, 0.9);
    }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
  },

  // ── 회복 ─────────────────────────────────────────────────────
  _doHeal(char, cost) {
    const save = SaveManager.load();
    const arc  = save?.arc ?? 0;
    if (arc < cost) { this._showToast('Arc가 부족합니다'); return; }
    if (save) { save.arc = arc - cost; SaveManager.save(save); }
    const chars  = CharacterManager.loadAll();
    const target = chars.find(c => c.id === char.id);
    if (target) { target.currentHp = target.maxHp; CharacterManager.saveAll(chars); }
    this._closePopup();
    this._refreshCards();
  },

  // ── 카드 새로고침 ─────────────────────────────────────────────
  _refreshCards() {
    this._cardObjs = [];
    this._cardRow.destroy();
    this._cardRow = this.scene.add.container(this._cardAreaX, this._cardAreaY + this._scrollX);
    this._cardRow.setMask(this._maskGfx.createGeometryMask());
    this._container.add(this._cardRow);
    this._buildCards();
  },

  // ── 토스트 메시지 ─────────────────────────────────────────────
  _showToast(msg) {
    const { scene, W, H } = this;
    const t = scene.add.text(W / 2, H * 0.5, msg, {
      fontSize: scaledFontSize(16, scene.scale), fill: '#cc5533', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(500).setAlpha(0);
    scene.tweens.add({
      targets: t, alpha: 1, duration: 200,
      onComplete: () => {
        scene.time.delayedCall(1200, () => {
          scene.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() });
        });
      },
    });
  },

  // ── 팝업 닫기 ─────────────────────────────────────────────────
  _closePopup() {
    this._hideTooltip();
    if (this._popupOverlay) { this._popupOverlay.destroy(); this._popupOverlay = null; }
    if (this._popupGroup)   { this._popupGroup.destroy();   this._popupGroup   = null; }
    this._openCharId = null;
  },

  // ── 생명주기 ─────────────────────────────────────────────────
  show()    { this._container.setVisible(true); },
  hide()    { this._container.setVisible(false); this._hideTooltip(); },
  destroy() {
    this._closePopup();
    this._hideTooltip();
    if (this._maskGfx) { this._maskGfx.destroy(); this._maskGfx = null; }
    const si = this.scene.input;
    if (this._dragOnDown)  si.off('pointerdown', this._dragOnDown);
    if (this._dragOnMove)  si.off('pointermove', this._dragOnMove);
    if (this._dragOnUp)    si.off('pointerup',   this._dragOnUp);
    if (this._dragOnWheel) si.off('wheel',        this._dragOnWheel);
    this._container.destroy();
  },

});
