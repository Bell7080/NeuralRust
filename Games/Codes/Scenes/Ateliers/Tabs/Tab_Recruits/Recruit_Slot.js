// ================================================================
//  Recruit_Slot.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Slot.js
//
//  역할: Phase 2 — 3개 슬롯머신 동시 가동
//        슬롯 완료 후 카드 뒤집기 연출로 Phase 3(Pick)로 전환
//  의존: Recruit_Data.js, Tab_Recruit.js(this)
//
//  ✏️ v2 수정
//    · _rRoll() → _rRollTriple(price) 로 교체 (직업 다양성 보장)
//    · 슬롯 중 직업 표시: 오버클럭 발생 시 카드에 ⚡ 표시
//    · 뒤집기 후 카드에 position 필드 표시
// ================================================================

Tab_Recruit.prototype._buildSlot = function () {
  this._clear();

  const { scene, W, H } = this;
  const cx    = W / 2;
  const cy    = H * 0.50;
  const cardW = W * 0.155;
  const cardH = cardW * 1.80;
  const gap   = W * 0.032;

  // ── 3개 결과 미리 확정 (직업 다양성 보장 포함) ──────────────
  this._rolls = _rRollTriple(this.price);

  const positions = [cx - cardW - gap, cx, cx + cardW + gap];
  this._slotDisplays = [];
  this._slotCards    = [];

  positions.forEach((x, i) => {
    const card = scene.add.container(x, cy);
    this._container.add(card);
    this._slotCards.push(card);

    const bg = scene.add.graphics();
    bg.fillStyle(0x120d07, 0.95);
    bg.lineStyle(1, 0x3a2210, 0.8);
    bg.fillRect(-cardW/2, -cardH/2, cardW, cardH);
    bg.strokeRect(-cardW/2, -cardH/2, cardW, cardH);
    card.add(bg);

    const dc = scene.add.graphics();
    dc.lineStyle(1, 0x5a3018, 0.6);
    const cs = 8;
    const lx2 = -cardW/2 + 6; const rx2 = cardW/2 - 6;
    const ty2 = -cardH/2 + 6; const by2 = cardH/2 - 6;
    dc.lineBetween(lx2, ty2, lx2+cs, ty2); dc.lineBetween(lx2, ty2, lx2, ty2+cs);
    dc.lineBetween(rx2, ty2, rx2-cs, ty2); dc.lineBetween(rx2, ty2, rx2, ty2+cs);
    dc.lineBetween(lx2, by2, lx2+cs, by2); dc.lineBetween(lx2, by2, lx2, by2-cs);
    dc.lineBetween(rx2, by2, rx2-cs, by2); dc.lineBetween(rx2, by2, rx2, by2-cs);
    card.add(dc);

    card.add(scene.add.text(0, -cardH * 0.44, `${i + 1}`, {
      fontSize: this._fs(10), fill: '#3a2010', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));

    const jobTxt = scene.add.text(0, -cardH * 0.28, '???', {
      fontSize: this._fs(16), fill: '#7a5028', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    card.add(jobTxt);

    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x2a1a0a, 0.8);
    sep.lineBetween(-cardW*0.38, -cardH*0.14, cardW*0.38, -cardH*0.14);
    card.add(sep);

    const numTxt = scene.add.text(0, cardH * 0.02, '---', {
      fontSize: this._fs(34), fill: '#c8a070', fontStyle: 'bold', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    card.add(numTxt);

    card.add(scene.add.text(0, cardH * 0.22, '스 탯  합 계', {
      fontSize: this._fs(9), fill: '#3d2010', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));

    this._slotDisplays.push({ jobTxt, numTxt, card });
  });

  this._runSlots();
};

Tab_Recruit.prototype._runSlots = function () {
  const JOBS_DISPLAY = ['낚시꾼', '잠수부'];
  let done = 0;

  this._rolls.forEach((roll, i) => {
    let tick = 0;
    this._delay(i * 80, () => {
      const ev = this.scene.time.addEvent({
        delay: RECRUIT_SLOT_TICK,
        repeat: RECRUIT_SLOT_COUNT + i * 4 - 1,
        callback: () => {
          tick++;
          const total = RECRUIT_SLOT_COUNT + i * 4;
          const { jobTxt, numTxt } = this._slotDisplays[i];

          if (tick < total) {
            jobTxt.setText(_rFrom(JOBS_DISPLAY));
            const fake = tick > total * 0.65
              ? roll.statSum + Math.round((Math.random() - 0.5) * (total - tick) * 2.5)
              : Math.floor(Math.random() * 250);
            numTxt.setText(String(Math.max(0, Math.min(250, fake))));
          } else {
            jobTxt.setText(RECRUIT_JOB_LABEL[roll.job]);
            jobTxt.setStyle({ fill: roll.job === 'fisher' ? '#c8a070' : '#7ab0c8' });
            numTxt.setText(String(roll.statSum));
            done++;
            if (done === 3) {
              this._delay(120, () => this._glowCards());
            }
          }
        },
      });
      this._timers.push(ev);
    });
  });
};

// ── 카드 발광 연출 ────────────────────────────────────────────────

Tab_Recruit.prototype._glowCards = function () {
  const { scene } = this;
  const cardW    = this.W * 0.155;
  const cardH    = cardW * 1.80;
  const STAGGER  = 80;
  const GLOW_IN  = 200;
  const HOLD     = 160;
  const GLOW_OUT = 200;

  this._slotDisplays.forEach(({ card }, i) => {
    const roll     = this._rolls[i];
    const isF      = roll.job === 'fisher';
    // 오버클럭이 있으면 해당 색상으로 글로우
    const glowColor = roll.overclock
      ? parseInt(roll.overclock.color.replace('#', '0x'))
      : (isF ? 0xc8a070 : 0x7ab0c8);

    const glow = scene.add.graphics();
    card.add(glow);

    const drawGlow = (alpha) => {
      glow.clear();
      if (alpha <= 0) return;
      [
        { pad: 14, a: 0.06 * alpha },
        { pad:  8, a: 0.18 * alpha },
        { pad:  4, a: 0.38 * alpha },
        { pad:  1, a: 0.70 * alpha },
      ].forEach(({ pad, a }) => {
        glow.lineStyle(2, glowColor, a);
        glow.strokeRect(-cardW/2 - pad, -cardH/2 - pad, cardW + pad*2, cardH + pad*2);
      });
    };

    const go = { v: 0 };
    this._tween({
      targets: go, v: 1,
      duration: GLOW_IN, delay: i * STAGGER, ease: 'Sine.easeOut',
      onUpdate: () => drawGlow(go.v),
      onComplete: () => {
        this._delay(HOLD, () => {
          this._tween({
            targets: go, v: 0,
            duration: GLOW_OUT, ease: 'Sine.easeIn',
            onUpdate: () => drawGlow(go.v),
          });
        });
      },
    });
  });

  const totalGlowTime = STAGGER * 2 + GLOW_IN + HOLD + GLOW_OUT + 80;
  this._delay(totalGlowTime, () => this._flipToPick());
};

// ── 카드 뒤집기 연출 ─────────────────────────────────────────────

Tab_Recruit.prototype._flipToPick = function () {
  const { scene, W, H } = this;
  const cx        = W / 2;
  const cy        = H * 0.50;
  const cardW     = W * 0.155;
  const pickCardH = cardW * 1.72;   // position 행 추가로 약간 높임
  const FLIP_DUR  = 330;
  const STAGGER   = 160;

  const guideTxt = scene.add.text(cx, cy - pickCardH * 0.60,
    '영입할 동료를 선택하십시오', {
    fontSize: this._fs(12), fill: '#4a2a10', fontFamily: FontManager.MONO,
  }).setOrigin(0.5).setAlpha(0);
  this._container.add(guideTxt);
  this._tween({ targets: guideTxt, alpha: 1, duration: 400, delay: STAGGER });

  this._slotDisplays.forEach(({ card }, i) => {
    const roll = this._rolls[i];
    const isF  = roll.job === 'fisher';

    this._tween({
      targets: card,
      scaleX: 0,
      duration: FLIP_DUR,
      delay: i * STAGGER,
      ease: 'Sine.easeIn',
      onComplete: () => {
        card.removeAll(true);

        const bg = scene.add.graphics();
        const drawBg = (hover) => {
          bg.clear();
          // 오버클럭 카드면 특수 테두리
          const borderColor = roll.overclock
            ? parseInt(roll.overclock.color.replace('#', '0x'))
            : (isF ? 0xc8a070 : 0x7ab0c8);
          bg.fillStyle(hover ? 0x1e1408 : 0x120d07, 1);
          bg.lineStyle(hover ? 2 : 1, borderColor, hover ? 1 : (roll.overclock ? 0.9 : 0.8));
          bg.fillRect(-cardW/2, -pickCardH/2, cardW, pickCardH);
          bg.strokeRect(-cardW/2, -pickCardH/2, cardW, pickCardH);
        };
        drawBg(false);
        card.add(bg);

        // 직업명
        card.add(scene.add.text(0, -pickCardH * 0.43, RECRUIT_JOB_LABEL[roll.job], {
          fontSize: this._fs(14), fontFamily: FontManager.TITLE,
          fill: isF ? '#c8a070' : '#7ab0c8',
        }).setOrigin(0.5));

        // 초상화 박스
        const iSz = cardW * 0.72;
        const iY  = -pickCardH * 0.18;
        const iBg = scene.add.graphics();
        iBg.fillStyle(0x1a1008, 1); iBg.lineStyle(1, 0x2a1a0a, 1);
        iBg.fillRect(-iSz/2, iY - iSz/2, iSz, iSz);
        iBg.strokeRect(-iSz/2, iY - iSz/2, iSz, iSz);
        card.add(iBg);

        if (roll.spriteKey && scene.textures.exists(roll.spriteKey)) {
          const img = scene.add.image(0, iY, roll.spriteKey).setOrigin(0.5);
          const sc  = Math.min(iSz / img.width, iSz / img.height) * 0.92;
          img.setScale(sc);
          card.add(img);
        } else {
          const num = parseInt(roll.spriteKey.replace('char_', '')) + 1;
          card.add(scene.add.text(0, iY, `#${num}`, {
            fontSize: this._fs(20), fill: '#3d2010', fontFamily: FontManager.MONO,
          }).setOrigin(0.5));
        }

        // 이름
        const infoTop = iY + iSz/2 + parseInt(this._fs(8));
        const lineH   = parseInt(this._fs(13));

        card.add(scene.add.text(0, infoTop, roll.name, {
          fontSize: this._fs(13), fontFamily: FontManager.TITLE, fill: '#e8c080',
        }).setOrigin(0.5));

        // Cog
        card.add(scene.add.text(0, infoTop + lineH * 1.0, `Cog  ${roll.cog}`, {
          fontSize: this._fs(13),
          fill: RECRUIT_COG_COLORS[roll.cog] || '#c8bfb0',
          fontStyle: 'bold', fontFamily: FontManager.MONO,
        }).setOrigin(0.5));

        // 합계 스탯
        card.add(scene.add.text(0, infoTop + lineH * 2.0, `합계  ${roll.statSum}`, {
          fontSize: this._fs(11), fill: '#7a5028', fontFamily: FontManager.MONO,
        }).setOrigin(0.5));

        // 오버클럭 뱃지 (있을 때만)
        if (roll.overclock) {
          card.add(scene.add.text(0, infoTop + lineH * 3.0, roll.overclock.label, {
            fontSize: this._fs(9),
            fill: roll.overclock.color,
            fontFamily: FontManager.MONO,
          }).setOrigin(0.5));
        }

        // 히트 영역
        const hit = scene.add.rectangle(0, 0, cardW, pickCardH, 0, 0)
          .setInteractive({ useHandCursor: true });
        card.add(hit);
        hit.on('pointerover', () => drawBg(true));
        hit.on('pointerout',  () => drawBg(false));
        hit.on('pointerdown', () => {
          this.result  = roll;
          this.rerolls = {
            stat:    RECRUIT_MAX_REROLL,
            sprite:  RECRUIT_MAX_REROLL,
            passive: RECRUIT_MAX_REROLL,
            skill:   RECRUIT_MAX_REROLL,
          };
          this._buildCustom();
        });

        // 후반 뒤집기
        this._tween({
          targets: card, scaleX: 1,
          duration: FLIP_DUR, ease: 'Sine.easeOut',
        });
      },
    });
  });
};
