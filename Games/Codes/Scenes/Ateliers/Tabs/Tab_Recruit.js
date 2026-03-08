// ================================================================
//  Tab_Recruit.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruit.js
//
//  [Phase 흐름]
//    READY  → [ 영 입 ] 패널 + 가격 + 확인 스타일 버튼
//    SLOT   → 3개 슬롯머신 동시 가동 (직업 / 스탯합계 표시)
//    PICK   → 3개 결과 카드 중 하나 선택
//    CUSTOM → 커스터마이징 (스탯·외형·패시브·스킬 재설정)
//
//  [외부 의존 — 전역]
//    CharacterManager, SaveManager, scaledFontSize, FontManager
// ================================================================

// ─── 메인 클래스 ──────────────────────────────────────────────────
//  상수·유틸 함수는 Recruit_Data.js 참조

class Tab_Recruit {
  constructor(scene, W, H) {
    this.scene = scene;
    this.W = W;
    this.H = H;

    const save = SaveManager.load() || {};
    this.price = save.recruitPrice ?? RECRUIT_BASE_PRICE;

    this.result  = null;
    this.rerolls = {};

    this._container = scene.add.container(0, 0);
    this._timers = [];
    this._tweens = [];

    this._buildReady();
  }

  show()    { this._container.setVisible(true);  }
  hide()    { this._container.setVisible(false); }

  destroy() {
    this._timers.forEach(t => { if (t && t.remove) t.remove(); });
    this._tweens.forEach(t => { if (t && t.stop)   t.stop();   });
    this._timers = [];
    this._tweens = [];
    this._container.destroy();
  }

  // ── 내부 유틸 ─────────────────────────────────────────────────

  _fs(n)   { return scaledFontSize(n, this.scene.scale); }
  _clear() { this._container.removeAll(true); }

  _delay(ms, fn) {
    const t = this.scene.time.delayedCall(ms, fn);
    this._timers.push(t);
    return t;
  }

  _tween(cfg) {
    const t = this.scene.tweens.add(cfg);
    this._tweens.push(t);
    return t;
  }

  // ════════════════════════════════════════════════════════════════
  //  Phase 1 : READY
  // ════════════════════════════════════════════════════════════════

  _buildReady() {
    this._clear();

    const { scene, W, H } = this;
    const cx = W / 2;
    const cy = H * 0.52;

    const panelW = W * 0.54;
    const panelH = H * 0.55;

    // ── 패널 배경 ─────────────────────────────────────────────
    const panel = scene.add.graphics();
    panel.fillStyle(0x120d07, 1);
    panel.lineStyle(2, 0x7a4018, 0.85);
    panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
    panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // ── 코너 장식 (Tab_Explore 동일) ──────────────────────────
    const deco = scene.add.graphics();
    deco.lineStyle(1, 0x7a4018, 0.7);
    const cs = 14;
    const px  = cx - panelW / 2 + 8;  const py  = cy - panelH / 2 + 8;
    const px2 = cx + panelW / 2 - 8;  const py2 = cy + panelH / 2 - 8;
    deco.lineBetween(px,  py,  px + cs, py);   deco.lineBetween(px,  py,  px,  py + cs);
    deco.lineBetween(px2, py,  px2 - cs, py);  deco.lineBetween(px2, py,  px2, py + cs);
    deco.lineBetween(px,  py2, px + cs, py2);  deco.lineBetween(px,  py2, px,  py2 - cs);
    deco.lineBetween(px2, py2, px2 - cs, py2); deco.lineBetween(px2, py2, px2, py2 - cs);

    // ── [ 영 입 ] 라벨 ────────────────────────────────────────
    const labelY = cy - panelH / 2 + parseInt(this._fs(26));
    scene.add.text(cx, labelY, '[ 영  입 ]', {
      fontSize: this._fs(13), fill: '#7a5028',
      fontFamily: FontManager.MONO, letterSpacing: 3,
    }).setOrigin(0.5);

    // ── 구분선 ────────────────────────────────────────────────
    const lineY = cy - panelH / 2 + parseInt(this._fs(44));
    const lineG = scene.add.graphics();
    lineG.lineStyle(1, 0x4a2a10, 0.9);
    lineG.lineBetween(cx - panelW / 2 + 20, lineY, cx + panelW / 2 - 20, lineY);

    // ── 메인 텍스트 (타이핑) ──────────────────────────────────
    const txt = scene.add.text(cx, cy - panelH * 0.10, '', {
      fontSize: this._fs(22), fill: '#e8c080', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0);

    // ── 가격 표시 ─────────────────────────────────────────────
    const priceY = cy + panelH * 0.09;
    const priceTxt = scene.add.text(cx, priceY, `${this.price}  Arc`, {
      fontSize: this._fs(28), fill: '#c8a070',
      fontFamily: FontManager.MONO,
      stroke: '#0a0604', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    this._priceTxt = priceTxt;

    const priceLabel = scene.add.text(cx, priceY - parseInt(this._fs(22)), '영입 비용', {
      fontSize: this._fs(10), fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0);

    // ── 확인 버튼 (Tab_Explore 스타일 — 주황 글로우) ──────────
    const btnW = parseInt(this._fs(130));
    const btnH = parseInt(this._fs(50));
    const btnY = cy + panelH * 0.33;

    const btnBg   = scene.add.graphics().setAlpha(0);
    const btnGlow = scene.add.graphics().setAlpha(0);

    const drawBtn = (state) => {
      btnBg.clear();
      if (state === 'hover') {
        btnBg.fillStyle(0x5a2808, 1);
        btnBg.lineStyle(2, 0xc87030, 1);
      } else if (state === 'down') {
        btnBg.fillStyle(0x2a1004, 1);
        btnBg.lineStyle(2, 0x9a5018, 1);
      } else {
        btnBg.fillStyle(0x3a1a08, 1);
        btnBg.lineStyle(2, 0xa05018, 0.95);
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
        btnGlow.strokeRect(
          cx - btnW / 2 - pad, btnY - btnH / 2 - pad,
          btnW + pad * 2, btnH + pad * 2
        );
      });
    };

    const btnTxt = scene.add.text(cx, btnY, '영  입', {
      fontSize: this._fs(24), fill: '#c8a070', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0);

    const hit = scene.add.rectangle(cx, btnY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover',  () => { drawBtn('hover'); btnTxt.setStyle({ fill: '#e8c080' }); });
    hit.on('pointerout',   () => { drawBtn('normal'); btnTxt.setStyle({ fill: '#c8a070' }); });
    hit.on('pointerdown',  () => { drawBtn('down');  btnTxt.setStyle({ fill: '#a07040' }); });
    hit.on('pointerup',    () => this._onHire(cx, cy, panelW, panelH));

    this._container.add([panel, deco, lineG, txt, priceLabel, priceTxt, btnGlow, btnBg, btnTxt, hit]);

    // ── 타이핑 → 버튼 등장 ────────────────────────────────────
    this._delay(80, () => {
      this._typeText(txt, '새로운 동료를 영입하시겠습니까?', 48, () => {
        this._delay(160, () => {
          this._tween({ targets: [priceTxt, priceLabel], alpha: 1, duration: 300, ease: 'Sine.easeOut' });
          this._delay(200, () => this._revealBtn(btnBg, btnGlow, btnTxt, drawBtn, drawGlow));
        });
      });
    });
  }

  _revealBtn(btnBg, btnGlow, btnTxt, drawBtn, drawGlow) {
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
  }

  _typeText(textObj, fullText, charDelay, onDone) {
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
  }

  // ════════════════════════════════════════════════════════════════
  //  결제
  // ════════════════════════════════════════════════════════════════

  // ── 탭 버튼 잠금/해제 ─────────────────────────────────────────
  // AtelierScene._sideButtonRefs 의 btn 들을 직접 껐다 켜서 차단하고
  // 검은 반투명 오버레이로 시각적으로도 잠금 표시
  _lockTabs() {
    // 버튼 interactive 비활성화
    const refs = this.scene._sideButtonRefs || [];
    refs.forEach(({ btn }) => btn.disableInteractive());

    // 검은 반투명 오버레이 (슬롯/커스텀 UI보다 아래, 탭 버튼보다 위)
    if (!this._lockOverlay) {
      this._lockOverlay = this.scene.add.rectangle(0, 0, this.W, this.H, 0x000000, 0.55)
        .setOrigin(0).setDepth(10);
      this._container.setDepth(11);
    }
  }

  _unlockTabs() {
    // 버튼 interactive 복구
    const refs = this.scene._sideButtonRefs || [];
    refs.forEach(({ btn }) => btn.setInteractive({ useHandCursor: true }));

    // 오버레이 제거
    if (this._lockOverlay) {
      this._lockOverlay.destroy();
      this._lockOverlay = null;
    }
    this._container.setDepth(0);
  }

  // ════════════════════════════════════════════════════════════════
  //  Phase 2 : SLOT  (3개 슬롯머신 동시 가동)
  // ════════════════════════════════════════════════════════════════

  _buildSlot() {
    this._clear();

    const { scene, W, H } = this;
    const cx     = W / 2;
    const cy     = H * 0.50;
    const cardW  = W * 0.155;
    const cardH  = cardW * 1.80;
    const gap    = W * 0.032;

    // 3개 최종 결과 미리 확정
    this._rolls = [_rRoll(), _rRoll(), _rRoll()];

    // 카드 3개 배치
    const positions = [
      cx - cardW - gap,
      cx,
      cx + cardW + gap,
    ];

    this._slotDisplays = [];  // { jobTxt, numTxt }

    positions.forEach((x, i) => {
      // 카드 배경
      const bg = scene.add.graphics();
      bg.fillStyle(0x120d07, 0.95);
      bg.lineStyle(1, 0x3a2210, 0.8);
      bg.fillRect(x - cardW/2, cy - cardH/2, cardW, cardH);
      bg.strokeRect(x - cardW/2, cy - cardH/2, cardW, cardH);
      this._container.add(bg);

      // 코너 장식 (작게)
      const dc = scene.add.graphics();
      dc.lineStyle(1, 0x5a3018, 0.6);
      const cs = 8;
      const lx = x - cardW/2 + 6; const rx = x + cardW/2 - 6;
      const ty = cy - cardH/2 + 6; const by2 = cy + cardH/2 - 6;
      dc.lineBetween(lx, ty, lx+cs, ty); dc.lineBetween(lx, ty, lx, ty+cs);
      dc.lineBetween(rx, ty, rx-cs, ty); dc.lineBetween(rx, ty, rx, ty+cs);
      dc.lineBetween(lx, by2, lx+cs, by2); dc.lineBetween(lx, by2, lx, by2-cs);
      dc.lineBetween(rx, by2, rx-cs, by2); dc.lineBetween(rx, by2, rx, by2-cs);
      this._container.add(dc);

      // 카드 번호
      this._container.add(scene.add.text(x, cy - cardH * 0.44, `${i + 1}`, {
        fontSize: this._fs(10), fill: '#3a2010', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));

      // 직업 슬롯
      const jobTxt = scene.add.text(x, cy - cardH * 0.28, '???', {
        fontSize: this._fs(16), fill: '#7a5028',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5);
      this._container.add(jobTxt);

      // 구분선
      const sep = scene.add.graphics();
      sep.lineStyle(1, 0x2a1a0a, 0.8);
      sep.lineBetween(x - cardW * 0.38, cy - cardH * 0.14, x + cardW * 0.38, cy - cardH * 0.14);
      this._container.add(sep);

      // 스탯합계 슬롯
      const numTxt = scene.add.text(x, cy + cardH * 0.02, '---', {
        fontSize: this._fs(34), fill: '#c8a070',
        fontStyle: 'bold', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      this._container.add(numTxt);

      // 라벨
      this._container.add(scene.add.text(x, cy + cardH * 0.22, '스 탯  합 계', {
        fontSize: this._fs(9), fill: '#3d2010', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));

      this._slotDisplays.push({ jobTxt, numTxt, x });
    });

    // 슬롯 가동
    this._runSlots();
  }

  _runSlots() {
    const JOBS_DISPLAY = ['낚시꾼', '잠수부'];
    let done = 0;

    this._rolls.forEach((roll, i) => {
      let tick = 0;
      // 카드마다 약간씩 시차
      this._delay(i * 80, () => {
        const ev = this.scene.time.addEvent({
          delay: RECRUIT_SLOT_TICK,
          repeat: RECRUIT_SLOT_COUNT + i * 4 - 1,  // 오른쪽 카드일수록 조금 더 돌아감
          callback: () => {
            tick++;
            const total = RECRUIT_SLOT_COUNT + i * 4;
            const { jobTxt, numTxt } = this._slotDisplays[i];

            if (tick < total) {
              // 직업 랜덤 깜빡
              jobTxt.setText(_rFrom(JOBS_DISPLAY));
              // 숫자 랜덤 (후반부에 실제값에 수렴)
              const fake = tick > total * 0.65
                ? roll.statSum + Math.round((Math.random() - 0.5) * (total - tick) * 2.5)
                : Math.floor(Math.random() * 250);
              numTxt.setText(String(Math.max(0, Math.min(250, fake))));
            } else {
              // 최종값 확정
              jobTxt.setText(RECRUIT_JOB_LABEL[roll.job]);
              jobTxt.setStyle({ fill: roll.job === 'fisher' ? '#c8a070' : '#7ab0c8' });
              numTxt.setText(String(roll.statSum));
              done++;
              if (done === 3) {
                // 모든 슬롯 완료 → PICK 페이즈
                this._delay(420, () => this._buildPick());
              }
            }
          },
        });
        this._timers.push(ev);
      });
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  Phase 3 : PICK  (3개 카드 중 선택)
  // ════════════════════════════════════════════════════════════════

  _buildPick() {
    this._clear();

    const { scene, W, H } = this;
    const cx    = W / 2;
    const cy    = H * 0.50;
    const cardW = W * 0.155;
    const cardH = cardW * 1.80;
    const gap   = W * 0.032;

    const positions = [cx - cardW - gap, cx, cx + cardW + gap];

    // 안내 텍스트
    this._container.add(scene.add.text(cx, cy - cardH * 0.56, '영입할 동료를 선택하십시오', {
      fontSize: this._fs(12), fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));

    positions.forEach((x, i) => {
      const roll = this._rolls[i];
      const isF  = roll.job === 'fisher';

      // 카드 배경
      const bg = scene.add.graphics();
      const drawCard = (hover) => {
        bg.clear();
        bg.fillStyle(hover ? 0x1e1408 : 0x120d07, 1);
        bg.lineStyle(2, hover ? (isF ? 0xc8a070 : 0x7ab0c8) : 0x3a2210, hover ? 1 : 0.8);
        bg.fillRect(x - cardW/2, cy - cardH/2, cardW, cardH);
        bg.strokeRect(x - cardW/2, cy - cardH/2, cardW, cardH);
      };
      drawCard(false);
      this._container.add(bg);

      // 직업
      this._container.add(scene.add.text(x, cy - cardH * 0.40, RECRUIT_JOB_LABEL[roll.job], {
        fontSize: this._fs(16), fontFamily: FontManager.TITLE,
        fill: isF ? '#c8a070' : '#7ab0c8',
      }).setOrigin(0.5));

      // 일러스트 ㅁ (플레이스홀더)
      const iSz = cardW * 0.72;
      const iY  = cy - cardH * 0.12;
      const iBg = scene.add.graphics();
      iBg.fillStyle(0x1a1008, 1);
      iBg.lineStyle(1, 0x2a1a0a, 1);
      iBg.fillRect(x - iSz/2, iY - iSz/2, iSz, iSz);
      iBg.strokeRect(x - iSz/2, iY - iSz/2, iSz, iSz);
      this._container.add(iBg);

      // Cog 등급
      this._container.add(scene.add.text(x, iY, `Cog  ${roll.cog}`, {
        fontSize: this._fs(12), fill: RECRUIT_COG_COLORS[roll.cog] || '#c8bfb0',
        fontStyle: 'bold', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));

      // 구분선
      const sep = scene.add.graphics();
      sep.lineStyle(1, 0x2a1a0a, 0.7);
      sep.lineBetween(x - cardW*0.38, cy + cardH*0.12, x + cardW*0.38, cy + cardH*0.12);
      this._container.add(sep);

      // 스탯합계
      this._container.add(scene.add.text(x, cy + cardH * 0.22, `합계  ${roll.statSum}`, {
        fontSize: this._fs(13), fill: '#c8bfb0', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));

      // 히트 영역
      const hit = scene.add.rectangle(x, cy, cardW, cardH, 0, 0)
        .setInteractive({ useHandCursor: true });
      this._container.add(hit);
      hit.on('pointerover',  () => drawCard(true));
      hit.on('pointerout',   () => drawCard(false));
      hit.on('pointerdown',  () => {
        this.result  = roll;
        this.rerolls = {
          stat: RECRUIT_MAX_REROLL, sprite: RECRUIT_MAX_REROLL,
          passive: RECRUIT_MAX_REROLL, skill: RECRUIT_MAX_REROLL,
        };
        this._buildCustom();
      });
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  Phase 4 : CUSTOM
  // ════════════════════════════════════════════════════════════════

  _buildCustom() {
    this._clear();

    const { W, H } = this;
    const bW     = W * 0.22;
    const bH     = bW * 1.55;
    const gapX   = W * 0.04;
    const leftX  = W / 2 - (bW * 2 + gapX) / 2 + bW / 2;
    const rightX = leftX + bW + gapX;
    const cy     = H * 0.50;

    this._buildResultBox(leftX, cy, bW, bH);
    this._buildCustomBox(rightX, cy, bW, bH);
  }

  // ── 왼쪽: 결과 요약 ───────────────────────────────────────────

  _buildResultBox(cx, cy, bw, bh) {
    const { scene, result } = this;
    const isF = result.job === 'fisher';

    const bg = scene.add.graphics();
    bg.fillStyle(0x120d07, 0.95); bg.lineStyle(1, 0x3a2210, 0.8);
    bg.fillRect(cx-bw/2, cy-bh/2, bw, bh); bg.strokeRect(cx-bw/2, cy-bh/2, bw, bh);
    this._container.add(bg);

    this._container.add(scene.add.text(cx, cy - bh*0.43, RECRUIT_JOB_LABEL[result.job], {
      fontSize: this._fs(16), fill: isF ? '#c8a070' : '#7ab0c8',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5));

    this._container.add(scene.add.text(cx, cy - bh*0.33, `Cog  ${result.cog}`, {
      fontSize: this._fs(15), fill: '#a05018', fontStyle: 'bold', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));

    this._container.add(scene.add.text(cx, cy - bh*0.23, `합계  ${result.statSum}`, {
      fontSize: this._fs(11), fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));

    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x2a1a0a, 0.8);
    sep.lineBetween(cx - bw*0.38, cy - bh*0.16, cx + bw*0.38, cy - bh*0.16);
    this._container.add(sep);

    this._statTexts = [];
    RECRUIT_STAT_LABELS.forEach((label, i) => {
      const y = cy - bh*0.10 + i * (bh * 0.093);
      const t = scene.add.text(cx, y, `${label}  ${result.stats[i]}`, {
        fontSize: this._fs(11), fill: '#c8bfb0', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      this._container.add(t);
      this._statTexts.push(t);
    });

    this._buildNameField(cx, cy + bh*0.37, bw);
  }

  _buildNameField(cx, y, bw) {
    const { scene, result } = this;
    const fW = bw * 0.80; const fH = 24;
    const fbg = scene.add.graphics();
    const drawF = (hover) => {
      fbg.clear();
      fbg.fillStyle(0x1e1008, 1);
      fbg.lineStyle(1, hover ? 0xa05018 : 0x3d2010, 1);
      fbg.fillRect(cx-fW/2, y-fH/2, fW, fH);
      fbg.strokeRect(cx-fW/2, y-fH/2, fW, fH);
    };
    drawF(false);
    this._container.add(fbg);

    this._nameTxt = scene.add.text(cx, y, result.name, {
      fontSize: this._fs(12), fill: '#c8a070', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    this._container.add(this._nameTxt);

    const hit = scene.add.rectangle(cx, y, fW, fH, 0, 0).setInteractive({ useHandCursor: true });
    this._container.add(hit);
    hit.on('pointerover',  () => drawF(true));
    hit.on('pointerout',   () => drawF(false));
    hit.on('pointerdown',  () => this._editName());
  }

  _editName() {
    const { result } = this;
    const el = document.createElement('input');
    el.type = 'text'; el.value = result.name; el.maxLength = 10;
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:#0f0a05;color:#c8a070;border:1px solid #a05018;padding:4px 10px;' +
      'font-size:16px;outline:none;z-index:9999;text-align:center;letter-spacing:2px;';
    document.body.appendChild(el);
    el.focus(); el.select();
    const done = () => {
      const v = el.value.trim();
      if (v) { result.name = v; this._nameTxt.setText(v); }
      document.body.removeChild(el);
    };
    el.addEventListener('blur', done);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') done(); });
  }

  // ── 오른쪽: 커스터마이징 ──────────────────────────────────────

  _buildCustomBox(cx, cy, bw, bh) {
    const { scene, result } = this;

    const bg = scene.add.graphics();
    bg.fillStyle(0x120d07, 0.95); bg.lineStyle(1, 0x3a2210, 0.8);
    bg.fillRect(cx-bw/2, cy-bh/2, bw, bh); bg.strokeRect(cx-bw/2, cy-bh/2, bw, bh);
    this._container.add(bg);

    // 외형 ㅁ
    const iSz = bw * 0.40; const iY = cy - bh * 0.29;
    const iBg = scene.add.graphics();
    iBg.fillStyle(0x1e1008, 1); iBg.lineStyle(1, 0x3d2010, 1);
    iBg.fillRect(cx-iSz/2, iY-iSz/2, iSz, iSz); iBg.strokeRect(cx-iSz/2, iY-iSz/2, iSz, iSz);
    this._container.add(iBg);
    this._spriteKeyTxt = scene.add.text(cx, iY, `#${parseInt(result.spriteKey.replace('char_',''))+1}`, {
      fontSize: this._fs(11), fill: '#3d2010', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    this._container.add(this._spriteKeyTxt);

    this._spriteBtn = this._makeRerollBtn(cx, iY + iSz*0.58, bw*0.70,
      `외형  🎲  ${this.rerolls.sprite}`, () => this._rerollSprite());

    this._statBtn = this._makeRerollBtn(cx, cy - bh*0.03, bw*0.82,
      `스탯 재설정  🎲  ${this.rerolls.stat}`, () => this._rerollStats());

    // 패시브
    const pvY = cy + bh * 0.13;
    this._container.add(scene.add.text(cx, pvY-13, '패 시 브', {
      fontSize: this._fs(10), fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));
    this._passiveTxt = scene.add.text(cx, pvY+4, result.passive, {
      fontSize: this._fs(11), fill: '#c8bfb0', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    this._container.add(this._passiveTxt);
    this._passiveBtn = this._makeRerollBtn(cx, pvY+22, bw*0.55,
      `🎲  ${this.rerolls.passive}`, () => this._rerollPassive());

    // 스킬
    const skY = cy + bh * 0.30;
    this._container.add(scene.add.text(cx, skY-13, '스  킬', {
      fontSize: this._fs(10), fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));
    this._skillTxt = scene.add.text(cx, skY+4, result.skill, {
      fontSize: this._fs(11), fill: '#c8bfb0', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    this._container.add(this._skillTxt);
    this._skillBtn = this._makeRerollBtn(cx, skY+22, bw*0.55,
      `🎲  ${this.rerolls.skill}`, () => this._rerollSkill());

    // 확정 버튼
    const cfY = cy + bh*0.44; const cfW = bw*0.78; const cfH = 26;
    const cfBg = scene.add.graphics();
    const drawCf = (h) => {
      cfBg.clear();
      cfBg.fillStyle(h ? 0xa05018 : 0x3d2010, 1); cfBg.lineStyle(1, 0xa05018, 1);
      cfBg.fillRect(cx-cfW/2, cfY-cfH/2, cfW, cfH); cfBg.strokeRect(cx-cfW/2, cfY-cfH/2, cfW, cfH);
    };
    drawCf(false);
    this._container.add(cfBg);
    this._container.add(scene.add.text(cx, cfY, '영 입  확 정', {
      fontSize: this._fs(12), fill: '#c8a070', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));
    const cfHit = scene.add.rectangle(cx, cfY, cfW, cfH, 0, 0).setInteractive({ useHandCursor: true });
    this._container.add(cfHit);
    cfHit.on('pointerover',  () => drawCf(true));
    cfHit.on('pointerout',   () => drawCf(false));
    cfHit.on('pointerdown',  () => this._confirmHire());
  }

  _makeRerollBtn(cx, y, w, label, cb) {
    const { scene } = this;
    const h = 22;
    const bg = scene.add.graphics();
    const draw = (hover, disabled) => {
      bg.clear();
      bg.fillStyle(disabled ? 0x0a0806 : hover ? 0x2a1a0a : 0x1e1008, 1);
      bg.lineStyle(1, disabled ? 0x1a1008 : hover ? 0xa05018 : 0x3d2010, 1);
      bg.fillRect(cx-w/2, y-h/2, w, h); bg.strokeRect(cx-w/2, y-h/2, w, h);
    };
    draw(false, false);
    this._container.add(bg);
    const txt = scene.add.text(cx, y, label, {
      fontSize: this._fs(10), fill: '#7a5028', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    this._container.add(txt);
    const hit = scene.add.rectangle(cx, y, w, h, 0, 0).setInteractive({ useHandCursor: true });
    this._container.add(hit);
    hit.on('pointerover',  () => draw(true,  false));
    hit.on('pointerout',   () => draw(false, false));
    hit.on('pointerdown',  () => cb());
    return { bg, txt, hit, draw };
  }

  _disableBtn(btn, newLabel) {
    btn.hit.disableInteractive();
    btn.draw(false, true);
    btn.txt.setStyle({ fill: '#2a1a0a' });
    btn.txt.setText(newLabel);
  }

  // ── 재설정 ────────────────────────────────────────────────────

  _rerollStats() {
    if (this.rerolls.stat <= 0) { this._toast('재설정 횟수 소진'); return; }
    const prev = [...this.result.stats];
    const next = _rDist(this.result.statSum);
    // _showStatPopup (Recruit_Popup.js) — 커스텀 화면 위에 전용 비교 팝업
    this._showStatPopup(prev, next, (chosen) => {
      this.result.stats = chosen; this.rerolls.stat--;
      chosen.forEach((v,i) => this._statTexts[i].setText(`${RECRUIT_STAT_LABELS[i]}  ${v}`));
      if (this.rerolls.stat <= 0) this._disableBtn(this._statBtn, '스탯 재설정  ✕');
      else this._statBtn.txt.setText(`스탯 재설정  🎲  ${this.rerolls.stat}`);
    });
  }

  _rerollSprite() {
    if (this.rerolls.sprite <= 0) { this._toast('재설정 횟수 소진'); return; }
    const prev = this.result.spriteKey;
    const next = _rSpriteKey();
    this._showChoicePopup('외형  재설정',
      `외형  #${parseInt(prev.replace('char_',''))+1}`,
      `외형  #${parseInt(next.replace('char_',''))+1}`,
      (chosen) => {
        this.result.spriteKey = chosen; this.rerolls.sprite--;
        this._spriteKeyTxt.setText(`#${parseInt(chosen.replace('char_',''))+1}`);
        if (this.rerolls.sprite <= 0) this._disableBtn(this._spriteBtn, '외형  ✕');
        else this._spriteBtn.txt.setText(`외형  🎲  ${this.rerolls.sprite}`);
      }, [prev, next]);
  }

  _rerollPassive() {
    if (this.rerolls.passive <= 0) { this._toast('재설정 횟수 소진'); return; }
    const prev = this.result.passive;
    const next = _rFrom(RECRUIT_PASSIVE_POOL[this.result.cog]);
    this._showChoicePopup('패시브  재설정', prev, next,
      (chosen) => {
        this.result.passive = chosen; this.rerolls.passive--;
        this._passiveTxt.setText(chosen);
        if (this.rerolls.passive <= 0) this._disableBtn(this._passiveBtn, '✕');
        else this._passiveBtn.txt.setText(`🎲  ${this.rerolls.passive}`);
      }, [prev, next]);
  }

  _rerollSkill() {
    if (this.rerolls.skill <= 0) { this._toast('재설정 횟수 소진'); return; }
    const prev = this.result.skill;
    const next = _rFrom(RECRUIT_SKILL_POOL[this.result.cog]);
    this._showChoicePopup('스킬  재설정', prev, next,
      (chosen) => {
        this.result.skill = chosen; this.rerolls.skill--;
        this._skillTxt.setText(chosen);
        if (this.rerolls.skill <= 0) this._disableBtn(this._skillBtn, '✕');
        else this._skillBtn.txt.setText(`🎲  ${this.rerolls.skill}`);
      }, [prev, next]);
  }

  // ── 선택 팝업 ─────────────────────────────────────────────────

  _showChoicePopup(title, prevLabel, nextLabel, onConfirm, rawValues) {
    const { scene, W, H } = this;
    const cx = W/2; const cy = H/2;
    const pw = W*0.42; const ph = H*0.26;

    const pop = scene.add.container(0, 0);
    this._container.add(pop);

    pop.add(scene.add.rectangle(cx, cy, W, H, 0x000000, 0.55));

    const pb = scene.add.graphics();
    pb.fillStyle(0x120d07, 0.98); pb.lineStyle(1, 0x3a2210, 0.9);
    pb.fillRect(cx-pw/2, cy-ph/2, pw, ph); pb.strokeRect(cx-pw/2, cy-ph/2, pw, ph);
    pop.add(pb);

    pop.add(scene.add.text(cx, cy - ph*0.38, title, {
      fontSize: this._fs(13), fill: '#c8bfb0', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));

    const bW = pw*0.38; const bH = ph*0.30;
    const lx = cx - pw*0.23; const rx = cx + pw*0.23; const bY = cy + ph*0.06;

    const makeBtn = (x, topLabel, bodyLabel, isNew, value) => {
      const cbg = scene.add.graphics();
      const drawC = (h) => {
        cbg.clear();
        cbg.fillStyle(h ? (isNew ? 0x3d2010 : 0x1a1008) : (isNew ? 0x2a1a0a : 0x120d07), 1);
        cbg.lineStyle(1, h ? 0xa05018 : (isNew ? 0x3d2010 : 0x2a1a0a), 1);
        cbg.fillRect(x-bW/2, bY-bH/2, bW, bH); cbg.strokeRect(x-bW/2, bY-bH/2, bW, bH);
      };
      drawC(false);
      pop.add(cbg);
      pop.add(scene.add.text(x, bY - bH*0.30, topLabel, {
        fontSize: this._fs(9), fill: isNew ? '#a05018' : '#3d2010', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
      bodyLabel.split('   ').forEach((line, li) => {
        pop.add(scene.add.text(x, bY - 4 + li * parseInt(this._fs(12)), line, {
          fontSize: this._fs(10), fill: '#c8bfb0', fontFamily: FontManager.MONO,
        }).setOrigin(0.5));
      });
      const chit = scene.add.rectangle(x, bY, bW, bH, 0, 0).setInteractive({ useHandCursor: true });
      pop.add(chit);
      chit.on('pointerover',  () => drawC(true));
      chit.on('pointerout',   () => drawC(false));
      chit.on('pointerdown',  () => { pop.destroy(); onConfirm(value); });
    };

    makeBtn(lx, '유  지', prevLabel, false, rawValues ? rawValues[0] : prevLabel);
    makeBtn(rx, '새로운', nextLabel, true,  rawValues ? rawValues[1] : nextLabel);

    const xt = scene.add.text(cx + pw*0.44, cy - ph*0.42, '✕', {
      fontSize: this._fs(11), fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pop.add(xt);
    xt.on('pointerover',  () => xt.setStyle({ fill: '#c8bfb0' }));
    xt.on('pointerout',   () => xt.setStyle({ fill: '#4a2a10' }));
    xt.on('pointerdown',  () => { pop.destroy(); onConfirm(rawValues ? rawValues[0] : prevLabel); });
  }

  // ════════════════════════════════════════════════════════════════
  //  영입 확정
  // ════════════════════════════════════════════════════════════════

  _confirmHire() {
    const { result } = this;
    const statObj = {};
    RECRUIT_STAT_KEYS.forEach((k, i) => { statObj[k] = result.stats[i]; });

    CharacterManager.addCharacter({
      id:        `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      name:      result.name,
      age:       16 + Math.floor(Math.random() * 10),
      job:       result.job,
      jobLabel:  RECRUIT_JOB_LABEL[result.job],
      stats:     statObj,
      statSum:   result.statSum,
      cog:       result.cog,
      passive:   result.passive,
      skill:     result.skill,
      currentHp: statObj.hp * 10,
      maxHp:     statObj.hp * 10,
      spriteKey: result.spriteKey,
    });

    // 영입 완료 표시는 Recruit_Custom._showHireCompletePopup이 담당
    this._delay(900, () => this._unlockTabs());
  }

  // ════════════════════════════════════════════════════════════════
  //  토스트
  // ════════════════════════════════════════════════════════════════

  _toast(msg) {
    const { scene, W, H } = this;
    const tx = scene.add.text(W/2, H*0.88, msg, {
      fontSize: this._fs(12), fill: '#c8a070',
      fontFamily: FontManager.MONO,
      backgroundColor: '#1e1008',
      padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setDepth(65); // lockOverlay(50)·statPopup(60/61) 모두 위
    scene.tweens.add({
      targets: tx, alpha: 0, y: tx.y - 20,
      duration: 700, delay: 800,
      onComplete: () => tx.destroy(),
    });
  }
}
