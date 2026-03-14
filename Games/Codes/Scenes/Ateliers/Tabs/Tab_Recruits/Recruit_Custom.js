// ================================================================
//  Recruit_Custom.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Custom.js
//
//  역할: Phase 4 — 커스터마이징 (스탯/외형/패시브/스킬 재설정 + 확정)
//  의존: Recruit_Data.js, Recruit_Popup.js, Recruit_Name.js, Tab_Recruit.js(this)
//
//  ✏️ v3 수정사항
//    · _confirmHire statObj 생성 시 Math.floor 적용 (소수점 방지)
//  ✏️ v4 수정사항
//    · _confirmHire: baseStats 기준 저장 구조로 교체 (현재 최신 버전과 동기화)
//    · _showHireCompletePopup: scaledFontSize → this._fs() 교체
//    · _showHireCompletePopup: _popupObjs 추적 추가 (탭 전환 시 안전 정리)
// ================================================================

// ════════════════════════════════════════════════════════════════
//  _resolveStats — 스탯 표시 데이터의 유일한 생성 함수
//
//  input : result 객체 (baseStats, overclock 포함)
//  output: [{ key, label, base, eff, col, isOc, ocColor, dispStr }] × 5
//
//  커스텀 패널·재설정 팝업·setText 갱신 모두 이 배열을 소비한다.
//  effective 계산 로직은 오직 여기에만 존재한다.
// ════════════════════════════════════════════════════════════════
Tab_Recruit.prototype._resolveStats = function (result) {
  const SC = (typeof CharacterManager !== 'undefined' && CharacterManager.STAT_COLORS)
    ? CharacterManager.STAT_COLORS
    : { hp:'#ff88bb', health:'#ff4466', attack:'#ff3333', agility:'#55ccff', luck:'#88ff88' };

  const oc   = result.overclock || null;
  const base = result.baseStats || result.stats || [0, 0, 0, 0, 0];

  return RECRUIT_STAT_KEYS.map((key, i) => {
    const baseVal = base[i] || 0;
    const isOc    = oc ? oc.statKey === key : false;
    const eff     = isOc ? baseVal + Math.floor(baseVal * oc.bonus) : baseVal;
    const col     = SC[key] || '#c8bfb0';
    const ocColor = isOc ? oc.color : null;
    const dispStr = isOc ? `${baseVal} → ${eff}` : `${eff}`;

    return { key, label: RECRUIT_STAT_LABELS[i], base: baseVal, eff, col, isOc, ocColor, dispStr };
  });
};

// ── 커스터마이징 메인 진입 ────────────────────────────────────────

Tab_Recruit.prototype._buildCustom = function () {
  this._clear();
  this._statTexts = [];

  const result = this.result;
  if (!result.baseStats) result.baseStats = [...result.stats];
  if (result.baseSum == null)
    result.baseSum = result.stats ? result.stats.reduce((a, b) => a + b, 0) : 0;

  const { W, H } = this;
  const bW    = W * 0.21;
  const bH    = H * 0.80;
  const gapX  = W * 0.03;
  const leftX = W / 2 - (bW * 2 + gapX) / 2 + bW / 2;
  const rightX = leftX + bW + gapX;
  const cy    = H * 0.50;

  this._buildResultBox(leftX, cy, bW, bH);
  this._buildCustomBox(rightX, cy, bW, bH);
};

// ── 왼쪽: 결과 요약 ──────────────────────────────────────────────

Tab_Recruit.prototype._buildResultBox = function (cx, cy, bw, bh) {
  const { scene, result } = this;
  const isF = result.job === 'fisher';

  const bg = scene.add.graphics();
  bg.fillStyle(0x120d07, 0.95); bg.lineStyle(1, 0x3a2210, 0.8);
  bg.fillRect(cx-bw/2, cy-bh/2, bw, bh); bg.strokeRect(cx-bw/2, cy-bh/2, bw, bh);
  this._container.add(bg);

  const pad    = bw * 0.06;
  const innerL = cx - bw/2 + pad;
  const innerW = bw - pad * 2;
  const topY   = cy - bh/2 + pad;

  // ── 초상화 ──────────────────────────────────────────────────
  const portW = bw * 0.38;
  const portH = bh * 0.28;
  const portX = innerL;
  const portY = topY;

  const portBg = scene.add.graphics();
  portBg.fillStyle(0x1e1810, 0.95); portBg.lineStyle(1, 0x5a3a18, 0.7);
  portBg.fillRect(portX, portY, portW, portH);
  portBg.strokeRect(portX, portY, portW, portH);
  this._container.add(portBg);

  if (result.spriteKey && scene.textures.exists(result.spriteKey)) {
    const img = scene.add.image(portX + portW/2, portY + portH/2, result.spriteKey).setOrigin(0.5);
    const sc  = Math.min(portW * 0.90 / img.width, portH * 0.90 / img.height);
    img.setScale(sc);
    this._container.add(img);
  } else {
    const num = parseInt((result.spriteKey || '').replace('char_', '')) + 1;
    this._container.add(scene.add.text(portX + portW/2, portY + portH/2, `#${num}`, {
      fontSize: this._fs(14), fill: '#2a3a44', fontFamily: FontManager.MONO,
    }).setOrigin(0.5));
  }

  // ── 우측 정보 ────────────────────────────────────────────────
  const infoX = portX + portW + pad;
  const infoR = cx + bw/2 - pad;
  const infoW = infoR - infoX;
  let   infoY = topY;

  // 이름 (인라인 편집 포함)
  const nameFontSz = this._fs(20);
  const nameFieldH = parseInt(nameFontSz) + 10;
  const nameTextCY = infoY + nameFieldH / 2;
  const nameUnderY = infoY + nameFieldH;

  const _nameTxt2 = scene.add.text(infoX, nameTextCY, this.result.name, {
    fontSize: nameFontSz, fill: '#e8c070', fontFamily: FontManager.TITLE,
  }).setOrigin(0, 0.5);
  this._container.add(_nameTxt2);
  this._nameTxt = _nameTxt2;

  const _cursorBar = scene.add.graphics().setVisible(false);
  _cursorBar.fillStyle(0xe8c070, 1);
  _cursorBar.fillRect(0, nameTextCY - parseInt(nameFontSz)*0.5, 2, parseInt(nameFontSz));
  this._container.add(_cursorBar);
  let _cursorTween = null;
  let _isEditing   = false;

  const _nameLineG = scene.add.graphics();
  const _drawNL = (hov, editing) => {
    _nameLineG.clear();
    const col = editing ? 0xf0d080 : (hov ? 0x9a6020 : 0x3a2010);
    const alp = editing ? 1.0 : (hov ? 1.0 : 0.5);
    _nameLineG.lineStyle(editing ? 2 : 1, col, alp);
    _nameLineG.lineBetween(infoX, nameUnderY, infoX + infoW, nameUnderY);
  };
  _drawNL(false, false);
  this._container.add(_nameLineG);

  const _isValidKorean = (s) => s && s.length > 0 && /^[가-힣\s]+$/.test(s.trim()) && s.trim().length > 0;

  // 이름 히트 영역
  const nameHit = scene.add.rectangle(
    infoX + infoW/2, nameTextCY, infoW, nameFieldH, 0, 0
  ).setInteractive({ useHandCursor: true }).setDepth(20);
  this._sceneHits.push(nameHit);

  nameHit.on('pointerover', () => { if (!_isEditing) _drawNL(true, false); });
  nameHit.on('pointerout',  () => { if (!_isEditing) _drawNL(false, false); });
  nameHit.on('pointerdown', () => {
    if (_isEditing) return;
    _isEditing = true;
    _drawNL(false, true);

    // 인라인 input 오버레이
    const inp = document.createElement('input');
    inp.type  = 'text';
    inp.value = this.result.name;
    inp.maxLength = 10;
    inp.style.cssText = [
      'position:fixed','opacity:0','pointer-events:none',
      'width:1px','height:1px','top:0','left:0',
    ].join(';');
    document.body.appendChild(inp);
    inp.focus();

    const _previewTxt = scene.add.text(infoX, nameTextCY, inp.value, {
      fontSize: nameFontSz, fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5);
    this._container.add(_previewTxt);
    _nameTxt2.setVisible(false);

    const _updateCursor = () => {
      const txt = _previewTxt;
      const tw  = txt.width;
      if (_cursorBar.active) {
        _cursorBar.setX(infoX + tw + 2);
        _cursorBar.setVisible(true);
      }
    };

    _cursorBar.setX(infoX + 2);
    _cursorBar.setVisible(true);
    _cursorTween = scene.tweens.add({
      targets: _cursorBar, alpha: { from:1, to:0 },
      duration: 500, yoyo: true, repeat: -1, ease: 'Stepped',
    });

    inp.addEventListener('input', () => {
      _previewTxt.setText(inp.value);
      _updateCursor();
    });

    const finish = () => {
      if (!_isEditing) return;
      _isEditing = false;
      if (_cursorTween) { _cursorTween.stop(); }
      _cursorBar.setVisible(false);
      _previewTxt.destroy();
      inp.remove();
      const raw = inp.value.trim();
      if (_isValidKorean(raw)) this.result.name = raw;
      _nameTxt2.setText(this.result.name);
      _nameTxt2.setVisible(true);
      _drawNL(false, false);
    };
    inp.addEventListener('blur',    finish);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
  });

  infoY += nameFieldH + parseInt(this._fs(8));

  // 직업
  this._container.add(scene.add.text(infoX, infoY,
    `직업  :  ${RECRUIT_JOB_LABEL[result.job]}`, {
    fontSize: this._fs(11), fill: isF ? '#c8a070' : '#7ab0c8',
    fontFamily: FontManager.MONO,
  }).setOrigin(0, 0));
  infoY += parseInt(this._fs(16));

  // 오버클럭 뱃지
  if (result.overclock) {
    const ocColor = result.overclock.color;
    const rawLabel = (result.overclock.label || '');
    const ocStatName = rawLabel
      .replace(/⚡\s*/g, '').replace(/오버클럭\s*:\s*/g, '').trim()
      || result.overclock.statKey || '';
    const ocTxt = scene.add.text(infoX, infoY,
      `오버클럭  :  ${ocStatName}`, {
      fontSize: this._fs(10), fill: ocColor, fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    const _ocP = { v: 0 };
    this._tween({
      targets: _ocP, v: { from:0, to:1 },
      duration: 1400, yoyo:true, repeat:-1, ease:'Sine.easeInOut',
      onUpdate: () => {
        if (!ocTxt.active) return;
        ocTxt.setStyle({ fill:ocColor, stroke:ocColor, strokeThickness:_ocP.v*1.4 });
      },
    });
    this._container.add(ocTxt);
    infoY += parseInt(this._fs(15));
  }

  // HP 바
  const hpBarY = portY + portH + parseInt(this._fs(4));
  const hpBarH = parseInt(this._fs(14));
  const hpBg2  = scene.add.graphics();
  hpBg2.fillStyle(0x050404, 0.9); hpBg2.lineStyle(1, 0x2a1a08, 0.7);
  hpBg2.strokeRect(innerL, hpBarY, innerW, hpBarH);
  hpBg2.fillRect(innerL, hpBarY, innerW, hpBarH);
  const hpFg2 = scene.add.graphics();
  hpFg2.fillStyle(0x306030, 1);
  hpFg2.fillRect(innerL+1, hpBarY+1, Math.round((innerW-2)*1), hpBarH-2);
  const maxHp = (result.baseStats && result.baseStats[0]) ? result.baseStats[0] * 10 : 100;
  this._container.add([hpBg2, hpFg2,
    scene.add.text(innerL + innerW/2, hpBarY + hpBarH/2,
      `HP  ${maxHp} / ${maxHp}`, {
      fontSize: this._fs(8), fill: '#d0b060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5),
  ]);

  // Cog 바
  const cogBarY = hpBarY + hpBarH + parseInt(this._fs(4));
  const cogBarH = parseInt(this._fs(18));
  const cogBg2  = scene.add.graphics();
  cogBg2.fillStyle(0x0e0b07, 1); cogBg2.lineStyle(1, 0x4a2a10, 0.8);
  cogBg2.strokeRect(innerL, cogBarY, innerW, cogBarH);
  cogBg2.fillRect(innerL, cogBarY, innerW, cogBarH);
  this._container.add(cogBg2);
  this._container.add(scene.add.text(innerL + innerW/2, cogBarY + cogBarH/2,
    `◈  Cog  ${result.cog}  ◈`, {
    fontSize: this._fs(11), fill: '#e8c040', fontFamily: FontManager.MONO,
  }).setOrigin(0.5));

  // 스탯 블록
  const statTopY = cogBarY + cogBarH + parseInt(this._fs(6));
  this._container.add(scene.add.text(innerL, statTopY, '[ 스  탯 ]', {
    fontSize: this._fs(9), fill: '#5a3818', fontFamily: FontManager.MONO,
  }).setOrigin(0, 0));

  this._statTexts = [];

  const statBotY   = cy + bh/2 - pad;
  const totalRows  = RECRUIT_STAT_LABELS.length;
  const rowH2      = (statBotY - statTopY - parseInt(this._fs(13))) / totalRows;
  const statStartY = statTopY + parseInt(this._fs(13));
  const statBH     = rowH2 * totalRows;
  const statBlockX = innerL;
  const statBlockW = innerW;

  // ✅ _resolveStats() — 오버클럭 포함한 표시 데이터 배열
  const resolved  = this._resolveStats(result);
  const ocStatIdx = resolved.findIndex(r => r.isOc);

  // 오버클럭 행 외부 glow
  if (ocStatIdx >= 0) {
    const ocHex2 = parseInt(resolved[ocStatIdx].ocColor.replace('#', '0x'));
    const glowBg = scene.add.graphics();
    [{p:5,a:0.07},{p:3,a:0.18},{p:1,a:0.38}].forEach(({p,a}) => {
      glowBg.lineStyle(1, ocHex2, a);
      glowBg.strokeRect(statBlockX - p, statStartY - p, statBlockW + p*2, statBH + p*2);
    });
    this._container.add(glowBg);
  }

  const statBgG = scene.add.graphics();
  statBgG.fillStyle(0x0e0b07, 1); statBgG.lineStyle(1, 0x2a1a08, 0.7);
  statBgG.strokeRect(statBlockX, statStartY, statBlockW, statBH);
  statBgG.fillRect(statBlockX, statStartY, statBlockW, statBH);
  this._container.add(statBgG);

  resolved.forEach((stat, i) => {
    const rowY = statStartY + i * rowH2;
    const midY = rowY + rowH2 * 0.5;

    if (i > 0) {
      const sg = scene.add.graphics();
      sg.lineStyle(1, 0x1e1206, 0.5);
      sg.lineBetween(statBlockX + 4, rowY, statBlockX + statBlockW - 4, rowY);
      this._container.add(sg);
    }

    if (stat.isOc) {
      const ocHex3 = parseInt(stat.ocColor.replace('#', '0x'));
      const glowG2 = scene.add.graphics();
      const slices = 24;
      const barX   = statBlockX + 1, barY = rowY + 1;
      const barW   = statBlockW - 2, barH = rowH2 - 2;
      const sliceW = barW / slices;
      for (let s = 0; s < slices; s++) {
        glowG2.fillStyle(ocHex3, 0.28 - (0.26 * s / (slices - 1)));
        glowG2.fillRect(barX + s * sliceW, barY, Math.ceil(sliceW), barH);
      }
      glowG2.fillStyle(ocHex3, 0.85);
      glowG2.fillRect(statBlockX + 1, rowY + 1, 2, rowH2 - 2);
      this._container.add(glowG2);
    }

    const labelT = scene.add.text(statBlockX + 8, midY, stat.label, {
      fontSize: this._fs(10),
      fill: stat.isOc ? stat.ocColor : stat.col + 'cc',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // ✅ dispStr — "base → eff" 또는 "eff", _resolveStats에서 생성
    const valT = scene.add.text(statBlockX + statBlockW - 6, midY, stat.dispStr, {
      fontSize: this._fs(11),
      fill: stat.isOc ? stat.ocColor : stat.col,
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    this._container.add([labelT, valT]);
    this._statTexts.push(valT);
  });
};

// ── 오른쪽: 커스터마이징 ─────────────────────────────────────────

Tab_Recruit.prototype._buildCustomBox = function (cx, cy, bw, bh) {
  const { scene, result } = this;

  const bg = scene.add.graphics();
  bg.fillStyle(0x120d07, 0.95); bg.lineStyle(1, 0x3a2210, 0.8);
  bg.fillRect(cx-bw/2, cy-bh/2, bw, bh); bg.strokeRect(cx-bw/2, cy-bh/2, bw, bh);
  this._container.add(bg);

  const pad  = bw * 0.06;
  const boxL = cx - bw/2 + pad;
  const boxW = bw - pad * 2;
  const topY = cy - bh/2 + pad;
  const botY = cy + bh/2 - pad;
  let   curY = topY;

  const _cfPreH  = parseInt(this._fs(36));
  const _cfPreY  = botY - _cfPreH;
  const usable   = _cfPreY - pad * 0.6 - topY;

  const btnH       = 24;
  const abilDescH  = parseInt(this._fs(10));
  const abilTitleH = parseInt(this._fs(9));
  const abilNameH  = parseInt(this._fs(13));
  const abilInner  = 5;
  const abilBoxH   = abilInner + abilTitleH + 3 + abilNameH + abilDescH + 2 + 4 + btnH + abilInner;

  const gapSm  = pad * 0.45;
  const fixedH = btnH * 2 + gapSm * 3 + abilBoxH * 3 + gapSm * 2 + parseInt(this._fs(34)) + pad;
  const iH     = Math.max(bw * 0.38, usable - fixedH);

  // 초상화 박스
  const iY = curY + iH/2;
  const iBg = scene.add.graphics();
  iBg.fillStyle(0x1e1008, 1); iBg.lineStyle(1, 0x3d2010, 1);
  iBg.fillRect(boxL, curY, boxW, iH); iBg.strokeRect(boxL, curY, boxW, iH);
  this._container.add(iBg);
  this._spriteBoxX  = boxL + boxW/2;
  this._spriteBoxY  = iY;
  this._spriteBoxSz = Math.min(boxW, iH);
  this._spriteImg     = null;
  this._spriteKeyTxt  = null;
  this._renderSpriteBox(result.spriteKey);
  curY += iH + gapSm;

  // 외형 재설정 버튼
  this._spriteBtn = this._makeRerollBtn(
    boxL + boxW/2, curY + btnH/2, boxW,
    `외형 재설정  🎲  ${this.rerolls.sprite}`, () => this._rerollSprite(), btnH);
  curY += btnH + gapSm;

  // 스탯 재설정 버튼
  const statBtnH = btnH + 6;
  this._statBtn = this._makeRerollBtn(
    boxL + boxW/2, curY + statBtnH/2, boxW,
    `스탯 재설정  🎲  ${this.rerolls.stat}`, () => this._rerollStats(), statBtnH);
  curY += statBtnH + gapSm;

  // 어빌리티 박스 헬퍼
  const makeAbilBox = (titleStr, nameTxtRef, nameVal, descVal, rerollCount, rerollCb, btnRef) => {
    const boxG = scene.add.graphics();
    boxG.fillStyle(0x0e0b07, 1);
    boxG.lineStyle(1, 0x3a2010, 0.7);
    boxG.strokeRect(boxL, curY, boxW, abilBoxH);
    boxG.fillRect(boxL, curY, boxW, abilBoxH);
    this._container.add(boxG);

    this._container.add(scene.add.text(boxL + abilInner, curY + abilInner, titleStr, {
      fontSize: this._fs(8), fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));

    const nameTxt = scene.add.text(
      boxL + abilInner, curY + abilInner + abilTitleH + 3, nameVal, {
      fontSize: this._fs(12), fill: '#e8c060', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0);
    this._container.add(nameTxt);
    nameTxtRef.ref = nameTxt;

    if (descVal) {
      const descTxt = scene.add.text(
        boxL + abilInner, curY + abilInner + abilTitleH + 3 + abilNameH + 2, descVal, {
        fontSize: this._fs(8), fill: '#7a5830',
        fontFamily: FontManager.MONO,
        wordWrap: { width: boxW - abilInner * 2 },
      }).setOrigin(0, 0);
      this._container.add(descTxt);
      if (nameTxtRef) nameTxtRef.desc = descTxt;
    }

    const btnY2 = curY + abilInner + abilTitleH + 3 + abilNameH + abilDescH + 2 + 5 + btnH/2;
    const btn   = this._makeRerollBtn(
      boxL + boxW/2, btnY2, boxW - abilInner*2,
      `🎲  ${rerollCount}`, rerollCb, btnH);
    btnRef.ref = btn;

    curY += abilBoxH + gapSm;
  };

  // POSITION 박스
  const posRef = {}; const posBtn = {};
  const posDesc = (typeof getPositionDescription === 'function')
    ? getPositionDescription(result.position) : '';
  makeAbilBox('POSITION', posRef, result.position, posDesc, this.rerolls.position,
    () => this._rerollPosition(), posBtn);
  this._positionTxtRef = posRef;
  this._positionBtn    = posBtn.ref;

  // PASSIVE 박스
  const pRef = {}; const pBtn = {};
  const pasDesc = (typeof getPassiveDescription === 'function')
    ? getPassiveDescription(result.passive) : '';
  makeAbilBox('PASSIVE', pRef, result.passive, pasDesc, this.rerolls.passive,
    () => this._rerollPassive(), pBtn);
  this._passiveTxtRef = pRef;
  this._passiveBtn    = pBtn.ref;

  // SKILL 박스
  const sRef = {}; const sBtn = {};
  const sklDesc = (typeof getSkillDescription === 'function')
    ? getSkillDescription(result.skill) : '';
  makeAbilBox('SKILL', sRef, result.skill, sklDesc, this.rerolls.skill,
    () => this._rerollSkill(), sBtn);
  this._skillTxtRef = sRef;
  this._skillBtn    = sBtn.ref;

  // 영입 확정 버튼
  const boxBot  = cy + bh/2 - pad;
  const cfH2    = parseInt(this._fs(34));
  const cfY     = boxBot - cfH2;
  const cfBg    = scene.add.graphics();
  const cfGlow  = scene.add.graphics();

  const drawCf = (state) => {
    cfBg.clear();
    if (state === 'hover') {
      cfBg.fillStyle(0xc06020, 1); cfBg.lineStyle(2, 0xf0a040, 1);
    } else if (state === 'down') {
      cfBg.fillStyle(0x602010, 1); cfBg.lineStyle(2, 0x904020, 1);
    } else {
      cfBg.fillStyle(0x7a3010, 1); cfBg.lineStyle(2, 0xc07030, 0.95);
    }
    cfBg.fillRect(boxL, cfY, boxW, cfH2);
    cfBg.strokeRect(boxL, cfY, boxW, cfH2);
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
      cfGlow.strokeRect(boxL - p, cfY - p, boxW + p*2, cfH2 + p*2);
    });
  };

  drawCf('normal');
  this._container.add(cfBg);
  this._container.add(cfGlow);

  const go = { v: 0 };
  this._tween({
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

  const cfTxt = scene.add.text(boxL + boxW/2, cfY + cfH2/2, '영 입  확 정', {
    fontSize: this._fs(15), fill: '#f0d090', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5);
  this._container.add(cfTxt);
  this._tween({
    targets: cfTxt, alpha: { from: 1, to: 0.65 },
    duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  const cfHit = scene.add.rectangle(boxL + boxW/2, cfY + cfH2/2, boxW, cfH2, 0, 0)
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
  const cx  = this._spriteBoxX;
  const iY  = this._spriteBoxY;
  const iSz = this._spriteBoxSz;

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
  // hit은 씬 직접 추가 — 컨테이너 이동 시 좌표 어긋남 방지
  const hit = scene.add.rectangle(cx, y, w, h, 0, 0)
    .setInteractive({ useHandCursor: true }).setDepth(20);
  hit.on('pointerover', () => draw(true,  false));
  hit.on('pointerout',  () => draw(false, false));
  hit.on('pointerdown', () => cb());
  this._sceneHits.push(hit);
  return { bg, txt, hit, draw };
};

Tab_Recruit.prototype._disableBtn = function (btn, newLabel) {
  btn.hit.disableInteractive();
  btn.draw(false, true);
  btn.txt.setStyle({ fill: '#2a1a0a' });
  btn.txt.setText(newLabel);
};

// ── 재설정 로직 ──────────────────────────────────────────────────

Tab_Recruit.prototype._rDistRandom = function (total) {
  const MIN = [1, 0, 1, 5, 0];
  const minSum = MIN.reduce((a,b)=>a+b, 0);
  let pool = Math.max(0, total - minSum);
  const cuts = [];
  for (let k = 0; k < 4; k++) cuts.push(Math.floor(Math.random() * (pool + 1)));
  cuts.sort((a,b)=>a-b);
  const parts = [
    cuts[0],
    cuts[1]-cuts[0],
    cuts[2]-cuts[1],
    cuts[3]-cuts[2],
    pool-cuts[3],
  ];
  return MIN.map((m,i) => m + parts[i]);
};

Tab_Recruit.prototype._rerollStats = function () {
  if (this.rerolls.stat <= 0) { this._toast('재설정 횟수 소진'); return; }

  const baseSum = this.result.baseSum ?? this.result.statSum;
  const MIN_SUM = 7;

  const prevBase = this.result.baseStats
    ? [...this.result.baseStats]
    : [...this.result.stats];

  let newBase;
  for (let t = 0; t < 20; t++) {
    newBase = this._rDistRandom(baseSum);
    const totalDiff = newBase.reduce((acc, v, i) => acc + Math.abs(v - prevBase[i]), 0);
    if (totalDiff > 0 || baseSum <= MIN_SUM) break;
  }

  // ✅ 스냅샷 두 개를 팝업에 전달 — _resolveStats()는 팝업 내부에서 호출
  const prevSnap = { ...this.result, baseStats: prevBase };
  const nextSnap = { ...this.result, baseStats: newBase };

  this._showStatPopup(prevSnap, nextSnap, (chosenIsNext) => {
    // ✅ chosenIsNext: boolean — true면 새 스탯, false면 이전 유지
    this.result.baseStats = chosenIsNext ? [...newBase] : [...prevBase];
    this.rerolls.stat--;

    // ✅ setText 갱신도 _resolveStats() 소비
    const updated = this._resolveStats(this.result);
    updated.forEach((stat, i) => {
      this._statTexts[i].setText(stat.dispStr);
      this._statTexts[i].setStyle({ fill: stat.isOc ? stat.ocColor : stat.col });
    });

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

Tab_Recruit.prototype._rerollPosition = function () {
  if (this.rerolls.position <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev    = this.result.position;
  const posPool = (typeof POSITION_POOL !== 'undefined')
    ? (POSITION_POOL[this.result.cog] || POSITION_POOL[1])
    : ['앞칸 타격'];
  let next = prev;
  for (let t = 0; t < 10; t++) {
    next = _rFrom(posPool);
    if (next !== prev || posPool.length <= 1) break;
  }
  this._showChoicePopup('포지션  재설정', prev, next, (chosen) => {
    this.result.position = chosen; this.rerolls.position--;
    this._positionTxtRef.ref.setText(chosen);
    if (this.rerolls.position <= 0) this._disableBtn(this._positionBtn, '✕');
    else this._positionBtn.txt.setText(`🎲  ${this.rerolls.position}`);
  }, [prev, next]);
};

Tab_Recruit.prototype._rerollPassive = function () {
  if (this.rerolls.passive <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev    = this.result.passive;
  const pasPool = (typeof PASSIVE_POOL !== 'undefined')
    ? (PASSIVE_POOL[this.result.cog] || PASSIVE_POOL[1])
    : ['강인한 체질'];
  let next = prev;
  for (let t = 0; t < 10; t++) {
    next = _rFrom(pasPool);
    if (next !== prev || pasPool.length <= 1) break;
  }
  this._showChoicePopup('패시브  재설정', prev, next, (chosen) => {
    this.result.passive = chosen; this.rerolls.passive--;
    this._passiveTxtRef.ref.setText(chosen);
    if (this.rerolls.passive <= 0) this._disableBtn(this._passiveBtn, '✕');
    else this._passiveBtn.txt.setText(`🎲  ${this.rerolls.passive}`);
  }, [prev, next]);
};

Tab_Recruit.prototype._rerollSkill = function () {
  if (this.rerolls.skill <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev    = this.result.skill;
  const sklPool = RECRUIT_SKILL_POOL[this.result.cog] || RECRUIT_SKILL_POOL[1];
  let next = prev;
  for (let t = 0; t < 10; t++) {
    next = _rFrom(sklPool);
    if (next !== prev || sklPool.length <= 1) break;
  }
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

  const chars   = (typeof CharacterManager !== 'undefined') ? CharacterManager.loadAll() : [];
  const statObj = {};
  // baseStats 기준 저장 (순수값 — effective 미적용)
  RECRUIT_STAT_KEYS.forEach((k, i) => {
    statObj[k] = Math.floor((result.baseStats || result.stats)[i] ?? 0);
  });
  const statSum = Object.values(statObj).reduce((a, v) => a + v, 0);
  const cog = (typeof CharacterManager !== 'undefined' && CharacterManager.calcCog)
    ? CharacterManager.calcCog(statSum) : result.cog;

  const jobLabel = { fisher:'낚시꾼', diver:'잠수부', ai:'A.I' }[result.job] || result.job;

  const newChar = {
    id:           `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:         result.name || '이름 없음',
    job:          result.job,
    jobLabel,
    stats:        statObj,
    statSum,
    cog,
    position:     result.position || '—',
    passive:      result.passive  || '—',
    skill:        result.skill    || '—',
    overclock:    result.overclock || null,
    spriteKey:    result.spriteKey || 'char_0',
    maxHp:        statObj.hp * 10,
    currentHp:    statObj.hp * 10,
    mastery:      0,
    pendingStats: 0,
  };

  chars.push(newChar);
  if (typeof CharacterManager !== 'undefined') CharacterManager.saveAll(chars);

  this._unlockTabs();
  this._clear();

  this._showHireCompletePopup(newChar.name, () => {
    this._buildReady();
  });
};

// ── 영입 완료 팝업 ────────────────────────────────────────────────

Tab_Recruit.prototype._showHireCompletePopup = function (name, onDone) {
  const { scene, W, H } = this;
  const cx    = W / 2;
  const cy    = H / 2;
  const depth = 200;

  const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0)
    .setOrigin(0).setDepth(depth);

  const mainTxt = scene.add.text(cx, cy - parseInt(this._fs(10)),
    `${name}  영입 완료`, {
    fontSize: this._fs(28),
    fill: '#e8c070', fontFamily: FontManager.TITLE,
    stroke: '#0a0604', strokeThickness: 6,
  }).setOrigin(0.5).setAlpha(0).setDepth(depth + 1);

  const subTxt = scene.add.text(cx, cy + parseInt(this._fs(18)),
    '새로운 동료가 합류했습니다', {
    fontSize: this._fs(13),
    fill: '#8a6030', fontFamily: FontManager.MONO,
  }).setOrigin(0.5).setAlpha(0).setDepth(depth + 1);

  const boxW  = parseInt(this._fs(280));
  const boxH  = parseInt(this._fs(90));
  const boxCy = cy + parseInt(this._fs(4));
  const msgBox = scene.add.graphics().setDepth(depth + 0.5).setAlpha(0);
  msgBox.fillStyle(0x0d0a06, 0.92);
  msgBox.fillRoundedRect(cx - boxW/2, boxCy - boxH/2, boxW, boxH, 10);
  msgBox.lineStyle(2, 0x9a6020, 0.85);
  msgBox.strokeRoundedRect(cx - boxW/2, boxCy - boxH/2, boxW, boxH, 10);
  msgBox.lineStyle(1, 0x3a2010, 0.4);
  msgBox.strokeRoundedRect(cx - boxW/2 + 4, boxCy - boxH/2 + 4, boxW - 8, boxH - 8, 7);

  [overlay, msgBox, mainTxt, subTxt].forEach(o => this._popupObjs.push(o));

  scene.tweens.add({ targets: overlay, alpha: 0.55, duration: 200, ease: 'Sine.easeOut' });
  scene.tweens.add({
    targets: [msgBox, mainTxt, subTxt], alpha: 1,
    duration: 220, ease: 'Sine.easeOut',
    onComplete: () => {
      scene.time.delayedCall(1400, () => {
        scene.tweens.add({
          targets: [overlay, msgBox, mainTxt, subTxt],
          alpha: 0, duration: 380, ease: 'Sine.easeIn',
          onComplete: () => {
            [overlay, msgBox, mainTxt, subTxt].forEach(o => {
              o.destroy();
              const idx = this._popupObjs.indexOf(o);
              if (idx !== -1) this._popupObjs.splice(idx, 1);
            });
            if (onDone) onDone();
          },
        });
      });
    },
  });
};
