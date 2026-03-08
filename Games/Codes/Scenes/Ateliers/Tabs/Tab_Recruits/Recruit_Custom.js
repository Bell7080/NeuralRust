// ================================================================
//  Recruit_Custom.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Custom.js
//
//  역할: Phase 4 — 커스터마이징 (스탯/외형/패시브/스킬 재설정 + 확정)
//  의존: Recruit_Data.js, Recruit_Popup.js, Tab_Recruit.js(this)
//
//  ✏️ 수정:
//    - _confirmHire: _unlockTabs() 호출 추가 (탭 잠금 해제 버그 수정)
//    - 영입 확정 버튼: 크게 + 글로우 애니메이션
//    - 영입 완료 시: 바로 창 닫힘 + 화면 중앙 투명 팝업 텍스트
// ================================================================

Tab_Recruit.prototype._buildCustom = function () {
  this._clear();

  const { W, H } = this;
  const bW    = W * 0.22;
  const bH    = bW * 1.55;
  const gapX  = W * 0.04;
  const leftX = W / 2 - (bW * 2 + gapX) / 2 + bW / 2;
  const rightX = leftX + bW + gapX;
  const cy    = H * 0.50;

  this._buildResultBox(leftX, cy, bW, bH);
  this._buildCustomBox(rightX, cy, bW, bH);
};

// ── 왼쪽: 결과 요약 + 이름 편집 + 스탯 ──────────────────────────

Tab_Recruit.prototype._buildResultBox = function (cx, cy, bw, bh) {
  const { scene, result } = this;
  const isF = result.job === 'fisher';

  const bg = scene.add.graphics();
  bg.fillStyle(0x120d07, 0.95); bg.lineStyle(1, 0x3a2210, 0.8);
  bg.fillRect(cx-bw/2, cy-bh/2, bw, bh); bg.strokeRect(cx-bw/2, cy-bh/2, bw, bh);
  this._container.add(bg);

  this._container.add(scene.add.text(cx, cy - bh*0.43, RECRUIT_JOB_LABEL[result.job], {
    fontSize: this._fs(16), fill: isF ? '#c8a070' : '#7ab0c8', fontFamily: FontManager.TITLE,
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

  this._buildNameField(cx, cy - bh*0.10, bw);

  this._statTexts = [];
  RECRUIT_STAT_LABELS.forEach((label, i) => {
    const y = cy - bh*0.01 + i * (bh * 0.088);
    const t = scene.add.text(cx, y, `${label}  ${result.stats[i]}`, {
      fontSize: this._fs(11), fill: '#c8bfb0', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    this._container.add(t);
    this._statTexts.push(t);
  });
};

// ── 오른쪽: 외형/스탯/패시브/스킬 재설정 + 확정 버튼 ─────────────

Tab_Recruit.prototype._buildCustomBox = function (cx, cy, bw, bh) {
  const { scene, result } = this;

  const bg = scene.add.graphics();
  bg.fillStyle(0x120d07, 0.95); bg.lineStyle(1, 0x3a2210, 0.8);
  bg.fillRect(cx-bw/2, cy-bh/2, bw, bh); bg.strokeRect(cx-bw/2, cy-bh/2, bw, bh);
  this._container.add(bg);

  const pad  = bw * 0.07;
  const boxL = cx - bw/2 + pad;
  const boxW = bw - pad * 2;
  let   curY = cy - bh/2 + pad;

  // ── 초상화 박스 ─────────────────────────────────────────────
  const iH = bw * 0.62;
  const iY = curY + iH/2;
  const iBg = scene.add.graphics();
  iBg.fillStyle(0x1e1008, 1); iBg.lineStyle(1, 0x3d2010, 1);
  iBg.fillRect(boxL, curY, boxW, iH);
  iBg.strokeRect(boxL, curY, boxW, iH);
  this._container.add(iBg);
  this._spriteBoxX = boxL + boxW/2; this._spriteBoxY = iY; this._spriteBoxSz = Math.min(boxW, iH);
  this._spriteImg = null; this._spriteKeyTxt = null;
  this._renderSpriteBox(result.spriteKey);
  curY += iH + pad * 0.8;

  // ── 외형 재설정 버튼 ────────────────────────────────────────
  const btnH = 28;
  this._spriteBtn = this._makeRerollBtn(
    boxL + boxW/2, curY + btnH/2, boxW,
    `외형 재설정  🎲  ${this.rerolls.sprite}`, () => this._rerollSprite(), btnH);
  curY += btnH + pad * 1.4;

  // ── 스탯 재설정 버튼 ────────────────────────────────────────
  this._statBtn = this._makeRerollBtn(
    boxL + boxW/2, curY + btnH/2, boxW,
    `스탯 재설정  🎲  ${this.rerolls.stat}`, () => this._rerollStats(), btnH);
  curY += btnH + pad * 1.4;

  // ── 패시브/스킬 박스 ────────────────────────────────────────
  const makeAbilBox = (titleStr, nameTxtRef, nameVal, rerollCount, rerollCb, btnRef) => {
    const titleH = parseInt(this._fs(10));
    const nameH  = parseInt(this._fs(14));
    const innerPad = 6;
    const boxH   = innerPad + titleH + 4 + nameH + 6 + btnH + innerPad;

    const boxG = scene.add.graphics();
    boxG.fillStyle(0x0e0b07, 1);
    boxG.lineStyle(1, 0x3a2010, 0.7);
    boxG.strokeRect(boxL, curY, boxW, boxH);
    boxG.fillRect(boxL, curY, boxW, boxH);
    this._container.add(boxG);

    this._container.add(scene.add.text(boxL + innerPad, curY + innerPad, titleStr, {
      fontSize: this._fs(9), fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));

    const nameTxt = scene.add.text(
      boxL + innerPad, curY + innerPad + titleH + 4, nameVal, {
      fontSize: this._fs(13), fill: '#e8c060', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0);
    this._container.add(nameTxt);
    nameTxtRef.ref = nameTxt;

    const btnY2 = curY + innerPad + titleH + 4 + nameH + 6 + btnH/2;
    const btn = this._makeRerollBtn(
      boxL + boxW/2, btnY2, boxW - innerPad*2,
      `🎲  ${rerollCount}`, rerollCb, btnH);
    btnRef.ref = btn;

    curY += boxH + pad * 0.8;
  };

  const pRef = {}; const pBtn = {};
  makeAbilBox('PASSIVE', pRef, result.passive, this.rerolls.passive, () => this._rerollPassive(), pBtn);
  this._passiveTxtRef = pRef;
  this._passiveBtn = pBtn.ref;

  const sRef = {}; const sBtn = {};
  makeAbilBox('SKILL', sRef, result.skill, this.rerolls.skill, () => this._rerollSkill(), sBtn);
  this._skillTxtRef = sRef;
  this._skillBtn = sBtn.ref;

  // ── 영입 확정 버튼 (크게 + 글로우) ─────────────────────────
  curY += pad * 0.4;
  const cfH2  = parseInt(this._fs(38));
  const cfBg  = scene.add.graphics();
  const cfGlow = scene.add.graphics();

  const drawCf = (state) => {
    cfBg.clear();
    if (state === 'hover') {
      cfBg.fillStyle(0xc06020, 1);
      cfBg.lineStyle(2, 0xf0a040, 1);
    } else if (state === 'down') {
      cfBg.fillStyle(0x602010, 1);
      cfBg.lineStyle(2, 0x904020, 1);
    } else {
      cfBg.fillStyle(0x7a3010, 1);
      cfBg.lineStyle(2, 0xc07030, 0.95);
    }
    cfBg.fillRect(boxL, curY, boxW, cfH2);
    cfBg.strokeRect(boxL, curY, boxW, cfH2);
  };

  const drawCfGlow = (intensity) => {
    cfGlow.clear();
    [
      { pad: 10, alpha: 0.06 * intensity, col: 0xc86020 },
      { pad:  6, alpha: 0.15 * intensity, col: 0xd07030 },
      { pad:  3, alpha: 0.28 * intensity, col: 0xa05018 },
      { pad:  1, alpha: 0.52 * intensity, col: 0x8a3a10 },
    ].forEach(({ pad: p, alpha, col }) => {
      cfGlow.lineStyle(2, col, alpha);
      cfGlow.strokeRect(boxL - p, curY - p, boxW + p*2, cfH2 + p*2);
    });
  };

  drawCf('normal');
  this._container.add(cfBg);
  this._container.add(cfGlow);

  // 글로우 펄스 애니메이션
  const go = { v: 0 };
  const glowTween = this._tween({
    targets: go, v: 1, duration: 600, ease: 'Sine.easeOut',
    onUpdate: () => drawCfGlow(go.v),
    onComplete: () => {
      this._tween({
        targets: go, v: { from: 1, to: 0.3 },
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        onUpdate: () => drawCfGlow(go.v),
      });
    },
  });

  const cfTxt = scene.add.text(boxL + boxW/2, curY + cfH2/2, '영 입  확 정', {
    fontSize: this._fs(15), fill: '#f0d090', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5);
  this._container.add(cfTxt);

  // 텍스트 펄스
  this._tween({
    targets: cfTxt, alpha: { from: 1, to: 0.65 },
    duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  const cfHit = scene.add.rectangle(boxL + boxW/2, curY + cfH2/2, boxW, cfH2, 0, 0)
    .setInteractive({ useHandCursor: true });
  this._container.add(cfHit);
  cfHit.on('pointerover',  () => { drawCf('hover');  cfTxt.setStyle({ fill: '#ffffff' }); });
  cfHit.on('pointerout',   () => { drawCf('normal'); cfTxt.setStyle({ fill: '#f0d090' }); });
  cfHit.on('pointerdown',  () => { drawCf('down');   cfTxt.setStyle({ fill: '#c8a060' }); });
  cfHit.on('pointerup',    () => this._confirmHire());
};

// ── 스프라이트 박스 렌더링 ────────────────────────────────────────

Tab_Recruit.prototype._renderSpriteBox = function (spriteKey) {
  const { scene } = this;
  const cx = this._spriteBoxX; const iY = this._spriteBoxY; const iSz = this._spriteBoxSz;

  if (this._spriteImg)    { this._spriteImg.destroy();    this._spriteImg    = null; }
  if (this._spriteKeyTxt) { this._spriteKeyTxt.destroy(); this._spriteKeyTxt = null; }

  if (spriteKey && scene.textures.exists(spriteKey)) {
    const img = scene.add.image(cx, iY, spriteKey).setOrigin(0.5);
    const sc  = Math.min(iSz / img.width, iSz / img.height) * 0.92;
    img.setScale(sc);
    this._spriteImg = img;
    this._container.add(img);
  } else {
    const num = parseInt(spriteKey.replace('char_', '')) + 1;
    this._spriteKeyTxt = scene.add.text(cx, iY, `#${num}`, {
      fontSize: this._fs(11), fill: '#3d2010', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    this._container.add(this._spriteKeyTxt);
  }
};

// ── 재설정 버튼 공통 ─────────────────────────────────────────────

Tab_Recruit.prototype._makeRerollBtn = function (cx, y, w, label, cb, h) {
  const { scene } = this;
  h = h || 22;
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
    fontSize: this._fs(11), fill: '#7a5028', fontFamily: FontManager.MONO,
  }).setOrigin(0.5);
  this._container.add(txt);
  const hit = scene.add.rectangle(cx, y, w, h, 0, 0).setInteractive({ useHandCursor: true });
  this._container.add(hit);
  hit.on('pointerover', () => draw(true,  false));
  hit.on('pointerout',  () => draw(false, false));
  hit.on('pointerdown', () => cb());
  return { bg, txt, hit, draw };
};

Tab_Recruit.prototype._disableBtn = function (btn, newLabel) {
  btn.hit.disableInteractive();
  btn.draw(false, true);
  btn.txt.setStyle({ fill: '#2a1a0a' });
  btn.txt.setText(newLabel);
};

// ── 재설정 로직 ──────────────────────────────────────────────────

Tab_Recruit.prototype._rerollStats = function () {
  if (this.rerolls.stat <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev = [...this.result.stats];
  const next = _rDist(this.result.statSum);
  this._showStatPopup(prev, next, (chosen) => {
    this.result.stats = chosen; this.rerolls.stat--;
    chosen.forEach((v, i) => this._statTexts[i].setText(`${RECRUIT_STAT_LABELS[i]}  ${v}`));
    if (this.rerolls.stat <= 0) this._disableBtn(this._statBtn, '스탯 재설정  ✕');
    else this._statBtn.txt.setText(`스탯 재설정  🎲  ${this.rerolls.stat}`);
  });
};

Tab_Recruit.prototype._rerollSprite = function () {
  if (this.rerolls.sprite <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev = this.result.spriteKey;
  const next = _rSpriteKey();
  this._showChoicePopup('외형  재설정',
    `외형  #${parseInt(prev.replace('char_', '')) + 1}`,
    `외형  #${parseInt(next.replace('char_', '')) + 1}`,
    (chosen) => {
      this.result.spriteKey = chosen; this.rerolls.sprite--;
      this._renderSpriteBox(chosen);
      if (this.rerolls.sprite <= 0) this._disableBtn(this._spriteBtn, '외형  ✕');
      else this._spriteBtn.txt.setText(`외형  🎲  ${this.rerolls.sprite}`);
    }, [prev, next]);
};

Tab_Recruit.prototype._rerollPassive = function () {
  if (this.rerolls.passive <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev = this.result.passive;
  const next = _rFrom(RECRUIT_PASSIVE_POOL[this.result.cog]);
  this._showChoicePopup('패시브  재설정', prev, next, (chosen) => {
    this.result.passive = chosen; this.rerolls.passive--;
    this._passiveTxtRef.ref.setText(chosen);
    if (this.rerolls.passive <= 0) this._disableBtn(this._passiveBtn, '✕');
    else this._passiveBtn.txt.setText(`🎲  ${this.rerolls.passive}`);
  }, [prev, next]);
};

Tab_Recruit.prototype._rerollSkill = function () {
  if (this.rerolls.skill <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev = this.result.skill;
  const next = _rFrom(RECRUIT_SKILL_POOL[this.result.cog]);
  this._showChoicePopup('스킬  재설정', prev, next, (chosen) => {
    this.result.skill = chosen; this.rerolls.skill--;
    this._skillTxtRef.ref.setText(chosen);
    if (this.rerolls.skill <= 0) this._disableBtn(this._skillBtn, '✕');
    else this._skillBtn.txt.setText(`🎲  ${this.rerolls.skill}`);
  }, [prev, next]);
};

// ── 영입 확정 ────────────────────────────────────────────────────

Tab_Recruit.prototype._confirmHire = function () {
  const { result, scene, W, H } = this;
  const statObj = {};
  RECRUIT_STAT_KEYS.forEach((k, i) => { statObj[k] = result.stats[i]; });

  CharacterManager.addCharacter({
    id:        `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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

  // ✏️ 탭 잠금 즉시 해제
  this._unlockTabs();

  // ✏️ 완료 팝업을 먼저 띄운 뒤, 커스텀 창 숨김 → 팝업 종료 후 정리 → _buildReady 호출
  if (this._container) this._container.setVisible(false);
  this._showHireCompletePopup(result.name, () => {
    this._clear();                              // 숨겨뒀던 컨테이너 자식 전부 제거
    this._container.setVisible(true);           // ✏️ 다시 표시 (이걸 빠뜨려서 패널이 안 보였음)
    this._buildReady();                         // 새 패널 빌드
  });
};

// ── 영입 완료 중앙 팝업 ──────────────────────────────────────────

Tab_Recruit.prototype._showHireCompletePopup = function (name, onDone) {
  const { scene, W, H } = this;
  const cx = W / 2;
  const cy = H / 2;
  const depth = 200;

  // 반투명 오버레이
  const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0)
    .setOrigin(0).setDepth(depth);

  // 메인 텍스트
  const mainTxt = scene.add.text(cx, cy - parseInt(scaledFontSize(10, scene.scale)),
    `${name}  영입 완료`, {
    fontSize: scaledFontSize(28, scene.scale),
    fill: '#e8c070',
    fontFamily: FontManager.TITLE,
    stroke: '#0a0604',
    strokeThickness: 6,
  }).setOrigin(0.5).setAlpha(0).setDepth(depth + 1);

  // 서브 텍스트
  const subTxt = scene.add.text(cx, cy + parseInt(scaledFontSize(18, scene.scale)),
    '새로운 동료가 합류했습니다', {
    fontSize: scaledFontSize(13, scene.scale),
    fill: '#8a6030',
    fontFamily: FontManager.MONO,
  }).setOrigin(0.5).setAlpha(0).setDepth(depth + 1);

  // 텍스트 뒤 흐릿한 검은 박스
  const boxW = parseInt(scaledFontSize(200, scene.scale));
  const boxH = parseInt(scaledFontSize(60, scene.scale));
  const boxCy = cy + parseInt(scaledFontSize(4, scene.scale));
  const msgBox = scene.add.graphics().setDepth(depth + 0.5).setAlpha(0);
  msgBox.fillStyle(0x000000, 0.55);
  msgBox.fillRoundedRect(cx - boxW / 2, boxCy - boxH / 2, boxW, boxH, 12);
  // 테두리 (흐릿한 황금빛)
  msgBox.lineStyle(1, 0x6b4a18, 0.4);
  msgBox.strokeRoundedRect(cx - boxW / 2, boxCy - boxH / 2, boxW, boxH, 12);

  // 페이드인
  scene.tweens.add({
    targets: overlay, alpha: 0.55, duration: 200, ease: 'Sine.easeOut',
  });
  scene.tweens.add({
    targets: [msgBox, mainTxt, subTxt], alpha: 1,
    duration: 220, ease: 'Sine.easeOut',
    onComplete: () => {
      // 1.4초 후 페이드아웃
      scene.time.delayedCall(1400, () => {
        scene.tweens.add({
          targets: [overlay, msgBox, mainTxt, subTxt],
          alpha: 0, duration: 380, ease: 'Sine.easeIn',
          onComplete: () => {
            overlay.destroy();
            msgBox.destroy();
            mainTxt.destroy();
            subTxt.destroy();
            if (onDone) onDone();
          },
        });
      });
    },
  });
};
