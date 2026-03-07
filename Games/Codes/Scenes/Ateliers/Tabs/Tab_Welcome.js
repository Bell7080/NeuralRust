// ================================================================
//  Tab_Welcome.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Welcome.js
// ================================================================

class Tab_Welcome {
  constructor(scene, W, H, onClose) {
    this.scene   = scene;
    this.W       = W;
    this.H       = H;
    this.onClose = onClose;
    this._timers = [];
    this._tweens = [];
    this._container = scene.add.container(0, 0).setDepth(200);
    this._build();
  }

  _build() {
    const { scene, W, H } = this;

    // ── Tab_Explore와 동일한 패널 기준 ───────────────────────────
    const cx     = W / 2;
    const cy     = H * 0.52;
    const panelW = W * 0.60;
    const panelH = H * 0.55;

    // ── 패널 배경 ───────────────────────────────────────────────
    const panel = scene.add.graphics();
    panel.fillStyle(0x120d07, 1);
    panel.lineStyle(2, 0x7a4018, 0.85);
    panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
    panel.fillRect  (cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // ── 코너 장식 ───────────────────────────────────────────────
    const deco = scene.add.graphics();
    deco.lineStyle(1, 0x7a4018, 0.7);
    const cs  = 14;
    const px  = cx - panelW / 2 + 8;
    const py  = cy - panelH / 2 + 8;
    const px2 = cx + panelW / 2 - 8;
    const py2 = cy + panelH / 2 - 8;
    deco.lineBetween(px,  py,  px  + cs, py);
    deco.lineBetween(px,  py,  px,  py  + cs);
    deco.lineBetween(px2, py,  px2 - cs, py);
    deco.lineBetween(px2, py,  px2, py  + cs);
    deco.lineBetween(px,  py2, px  + cs, py2);
    deco.lineBetween(px,  py2, px,  py2 - cs);
    deco.lineBetween(px2, py2, px2 - cs, py2);
    deco.lineBetween(px2, py2, px2, py2 - cs);

    // ── 상단 라벨 ───────────────────────────────────────────────
    const labelY = cy - panelH / 2 + parseInt(scaledFontSize(26, scene.scale));
    scene.add.text(cx, labelY, '[ 환  영 ]', {
      fontSize:      scaledFontSize(13, scene.scale),
      fill:          '#7a5028',
      fontFamily:    FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0.5, 0.5);

    // ── 구분선 ──────────────────────────────────────────────────
    const lineY = cy - panelH / 2 + parseInt(scaledFontSize(44, scene.scale));
    const lineG = scene.add.graphics();
    lineG.lineStyle(1, 0x4a2a10, 0.9);
    lineG.lineBetween(cx - panelW / 2 + 20, lineY, cx + panelW / 2 - 20, lineY);

    // ── 환영 텍스트 (타이핑 등장) ──────────────────────────────
    // 랜덤 표정 선택
    const faces  = [':)', ':3', ':0'];
    const face   = faces[Math.floor(Math.random() * faces.length)];
    const fullTxt = `환영합니다 ${face}`;

    const txt = scene.add.text(cx, cy - panelH * 0.06, '', {
      fontSize:   scaledFontSize(32, scene.scale),
      fill:       '#e8c080',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0);

    // ── container에 추가 ────────────────────────────────────────
    this._container.add([
      panel, deco, lineG,
      txt,
    ]);

    // ── 타이핑 시퀀스 ──────────────────────────────────────────
    this._delay(80, () => {
      this._typeText(txt, fullTxt, 52);
    });
  }

  // ── 타이핑 효과 ─────────────────────────────────────────────
  _typeText(textObj, fullText, charDelay, onDone) {
    textObj.setAlpha(1).setText('');
    const chars = [...fullText];
    let i = 0;
    const tick = () => {
      if (!textObj || !textObj.scene) return;
      if (i < chars.length) {
        textObj.setText(chars.slice(0, ++i).join(''));
        this._timers.push(this.scene.time.delayedCall(charDelay, tick));
      } else {
        if (onDone) onDone();
      }
    };
    this._timers.push(this.scene.time.delayedCall(charDelay, tick));
  }

  _delay(ms, fn) {
    this._timers.push(this.scene.time.delayedCall(ms, fn));
  }

  _tween(cfg) {
    const t = this.scene.tweens.add(cfg);
    this._tweens.push(t);
    return t;
  }

  destroy() {
    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._tweens.forEach(t => { if (t && t.stop)   t.stop();   });
    this._timers = [];
    this._tweens = [];
    if (this._container) this._container.destroy();
  }
}
