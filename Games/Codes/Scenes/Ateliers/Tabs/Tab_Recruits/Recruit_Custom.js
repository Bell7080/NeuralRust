// ================================================================
//  Recruit_Custom.js  (v5 — Single Source of Truth)
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Custom.js
//
//  역할: Phase 4 — 커스터마이징 (스탯/외형/패시브/스킬 재설정 + 확정)
//  의존: Recruit_Data.js, Recruit_Popup.js, Recruit_Name.js, Tab_Recruit.js(this)
//
//  ── v5 변경사항 ───────────────────────────────────────────────
//  · _resolveStats(result) 추가
//      result.baseStats + result.overclock → [{base, eff, dispStr, col, isOc, ...}] × 5
//      커스텀 패널 렌더 / 팝업 / setText 갱신 모두 이 함수 하나에서 파생
//  · _rerollStats: 스냅샷 두 개를 팝업에 넘기도록 변경
//      이전: prevStats[], nextStats[], prevBase[], nextBase[] 4개 배열
//      이후: prevSnap, nextSnap 두 result 객체
//  · _rerollStats 콜백: 별도 effective 계산 코드 삭제 → _resolveStats() 호출
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
    const alp = editing ? 1.0 : (hov ? 0.7 : 0.4);
    _nameLineG.lineStyle(1, col, alp);
    _nameLineG.lineBetween(infoX, nameUnderY, infoX + infoW, nameUnderY);
  };
  _drawNL(false, false);
  this._container.add(_nameLineG);

  const nameHit = scene.add.rectangle(infoX + infoW/2, nameTextCY, infoW, nameFieldH, 0, 0)
    .setInteractive({ useHandCursor: true }).setDepth(20);
  nameHit.on('pointerover', () => { if (!_isEditing) _drawNL(true, false); });
  nameHit.on('pointerout',  () => { if (!_isEditing) _drawNL(false, false); });
  nameHit.on('pointerdown', () => {
    _isEditing = true;
    _drawNL(false, true);
    _nameTxt2.setText(this.result.name + '|');
    if (_cursorTween) _cursorTween.stop();
    _cursorBar.setVisible(false);
    this.scene.input.keyboard.on('keydown', _onKey);
  });
  const _onKey = (e) => {
    if (!_isEditing) return;
    if (e.key === 'Enter' || e.key === 'Escape') {
      _isEditing = false;
      _drawNL(false, false);
      _nameTxt2.setText(this.result.name);
      _cursorBar.setVisible(false);
      this.scene.input.keyboard.off('keydown', _onKey);
    } else if (e.key === 'Backspace') {
      this.result.name = this.result.name.slice(0, -1);
      _nameTxt2.setText(this.result.name + '|');
    } else if (e.key.length === 1 && this.result.name.length < 12) {
      this.result.name += e.key;
      _nameTxt2.setText(this.result.name + '|');
    }
  };
  this._sceneHits.push(nameHit);

  infoY += nameFieldH + parseInt(this._fs(6));

  // 직업
  const jobLabel = { fisher:'낚시꾼', diver:'잠수부', ai:'A.I' }[result.job] || result.job;
  this._container.add(scene.add.text(infoX, infoY, `직업  :  ${jobLabel}`, {
    fontSize: this._fs(11),
    fill: result.job === 'ai' ? '#7ab0c8' : '#c8a070',
    fontFamily: FontManager.MONO,
  }).setOrigin(0, 0));
  infoY += parseInt(this._fs(16));

  // 오버클럭 뱃지
  if (result.overclock) {
    const oc       = result.overclock;
    const rawLabel = (oc.label || '').replace(/⚡\s*/g, '').replace(/오버클럭\s*:\s*/g, '').trim() || oc.statKey;
    const ocTxt    = scene.add.text(infoX, infoY, `오버클럭  :  ${rawLabel}`, {
      fontSize: this._fs(10), fill: oc.color, fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    const _ocP = { v: 0 };
    this._tween({
      targets: _ocP, v: { from: 0, to: 1 },
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!ocTxt.active) return;
        ocTxt.setStyle({ fill: oc.color, stroke: oc.color, strokeThickness: _ocP.v * 1.4 });
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
  // ✅ _resolveStats()로 HP effective 값 계산
  const resolvedForHp = this._resolveStats(result);
  const maxHp = resolvedForHp[0].eff * 10;  // index 0 = hp
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

  // ── 스탯 블록 ─────────────────────────────────────────────────
  const statTopY = cogBarY + cogBarH + parseInt(this._fs(6));
  this._container.add(scene.add.text(innerL, statTopY, '[ 스  탯 ]', {
    fontSize: this._fs(9), fill: '#5a3818', fontFamily: FontManager.MONO,
  }).setOrigin(0, 0));

  const statBotY  = cy + bh/2 - pad;
  const statStartY = statTopY + parseInt(this._fs(13));
  const totalRows  = RECRUIT_STAT_LABELS.length;
  const rowH2      = (statBotY - statStartY) / totalRows;
  const statBH     = rowH2 * totalRows;
  const statBlockX = innerL;
  const statBlockW = innerW;

  // ✅ _resolveStats() — 오버클럭 포함한 표시 데이터 배열
  const resolved = this._resolveStats(result);
  const ocStatIdx = resolved.findIndex(r => r.isOc);

  // 오버클럭 행 외부 glow
  if (ocStatIdx >= 0) {
    const ocHex2 = parseInt(resolved[ocStatIdx].ocColor.replace('#', '0x'));
    const glowBg = scene.add.graphics();
    [{ p: 5, a: 0.07 }, { p: 3, a: 0.18 }, { p: 1, a: 0.38 }].forEach(({ p, a }) => {
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

  this._statTexts = [];

  resolved.forEach((stat, i) => {
    const rowY  = statStartY + i * rowH2;
    const midY  = rowY + rowH2 * 0.5;

    if (i > 0) {
      const sg = scene.add.graphics();
      sg.lineStyle(1, 0x1e1206, 0.5);
      sg.lineBetween(statBlockX + 4, rowY, statBlockX + statBlockW - 4, rowY);
      this._container.add(sg);
    }

    if (stat.isOc) {
      const ocHex3  = parseInt(stat.ocColor.replace('#', '0x'));
      const glowG2  = scene.add.graphics();
      const slices  = 24;
      const barX    = statBlockX + 1, barY = rowY + 1;
      const barW    = statBlockW - 2, barH = rowH2 - 2;
      const sliceW  = barW / slices;
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

    // ✅ dispStr — "base → eff" 또는 "eff" 문자열, _resolveStats()에서 생성
    const valT = scene.add.text(statBlockX + statBlockW - 6, midY, stat.dispStr, {
      fontSize: this._fs(11),
      fill: stat.isOc ? stat.ocColor : stat.col,
      fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    this._container.add([labelT, valT]);
    this._statTexts.push(valT);  // 재설정 후 setText 갱신에 사용
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

    const titleTxt = scene.add.text(boxL + abilInner, curY + abilInner, titleStr, {
      fontSize: this._fs(9), fill: '#3a2808', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    this._container.add(titleTxt);

    const nameTxtObj = scene.add.text(
      boxL + boxW/2,
      curY + abilInner + parseInt(this._fs(9)) + 3,
      nameVal, {
      fontSize: this._fs(13), fill: '#c8a060', fontFamily: FontManager.MONO,
      align: 'center', wordWrap: { width: boxW - abilInner * 2 },
    }).setOrigin(0.5, 0);
    this._container.add(nameTxtObj);
    nameTxtRef.ref = nameTxtObj;

    if (descVal) {
      const descTxtObj = scene.add.text(
        boxL + abilInner,
        curY + abilInner + parseInt(this._fs(9)) + 3 + parseInt(this._fs(13)) + 2,
        descVal, {
        fontSize: this._fs(10), fill: '#6a5030', fontFamily: FontManager.MONO,
        wordWrap: { width: boxW - abilInner * 2 },
      }).setOrigin(0, 0);
      this._container.add(descTxtObj);
    }

    const rerollBtnY = curY + abilBoxH - abilInner - btnH/2;
    const rerollBtn  = this._makeRerollBtn(
      boxL + boxW/2, rerollBtnY, boxW - abilInner * 2,
      `🎲  ${rerollCount}`, rerollCb, btnH);
    btnRef.btn = rerollBtn;

    curY += abilBoxH + gapSm;
  };

  // 포지션
  this._positionTxtRef = { ref: null };
  const posBtnRef = {};
  const posDesc = (typeof getPositionDescription === 'function')
    ? getPositionDescription(result.position) : '';
  makeAbilBox('POSITION', this._positionTxtRef, result.position, posDesc,
    this.rerolls.position, () => this._rerollPosition(), posBtnRef);
  this._positionBtn = posBtnRef.btn;

  // 패시브
  this._passiveTxtRef = { ref: null };
  const pasBtnRef = {};
  const pasDesc = (typeof getPassiveDescription === 'function')
    ? getPassiveDescription(result.passive) : '';
  makeAbilBox('PASSIVE', this._passiveTxtRef, result.passive, pasDesc,
    this.rerolls.passive, () => this._rerollPassive(), pasBtnRef);
  this._passiveBtn = pasBtnRef.btn;

  // 스킬
  this._skillTxtRef = { ref: null };
  const sklBtnRef = {};
  const sklDesc = (typeof getSkillDescription === 'function')
    ? getSkillDescription(result.skill) : '';
  makeAbilBox('SKILL', this._skillTxtRef, result.skill, sklDesc,
    this.rerolls.skill, () => this._rerollSkill(), sklBtnRef);
  this._skillBtn = sklBtnRef.btn;

  // 고용 확정 버튼
  this._makeRerollBtn(
    boxL + boxW/2, botY - _cfPreH/2, boxW,
    '◈  고용 확정  ◈', () => this._confirmHire(), _cfPreH);
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
  const minSum = MIN.reduce((a, b) => a + b, 0);
  let pool = Math.max(0, total - minSum);
  const cuts = [];
  for (let k = 0; k < 4; k++) cuts.push(Math.floor(Math.random() * (pool + 1)));
  cuts.sort((a, b) => a - b);
  const parts = [
    cuts[0],
    cuts[1]-cuts[0],
    cuts[2]-cuts[1],
    cuts[3]-cuts[2],
    pool-cuts[3],
  ];
  return MIN.map((m, i) => m + parts[i]);
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

  // ✅ 배열 4개 대신 result 스냅샷 두 개를 팝업에 전달
  //    팝업은 각 스냅샷에 _resolveStats() 호출 → effective 독자 계산 없음
  const prevSnap = { ...this.result, baseStats: prevBase };
  const nextSnap = { ...this.result, baseStats: newBase };

  this._showStatPopup(prevSnap, nextSnap, (chosenIsNext) => {
    // ✅ chosenIsNext: boolean — 어느 스냅샷을 선택했는지
    this.result.baseStats = chosenIsNext ? [...newBase] : [...prevBase];
    this.rerolls.stat--;

    // ✅ setText 갱신도 _resolveStats() 소비 — 별도 effective 계산 없음
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

  // 확정 연출
  const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(90);
  scene.tweens.add({
    targets: overlay, alpha: 0.7,
    duration: 400, ease: 'Power2',
    onComplete: () => {
      scene.tweens.add({
        targets: overlay, alpha: 0,
        duration: 300, delay: 600,
        onComplete: () => { overlay.destroy(); this._buildReady(); },
      });
    },
  });
  this._toast(`${newChar.name}  고용 완료`);
};
