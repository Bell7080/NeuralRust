// ================================================================
//  Recruit_Custom.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Custom.js
//
//  역할: Phase 4 — 커스터마이징 (스탯/외형/패시브/능력 재설정 + 확정)
//  의존: Recruit_Data.js, Recruit_Popup.js, Recruit_Name.js,
//        Tab_Recruit.js(this), AbilityIndex.js
//
//  ✏️ v6 수정사항 (스킬 시스템 개편)
//    · _skillIdToName → _abilityIdToName / _abilityIdToDesc 헬퍼로 교체
//    · position 슬롯 완전 제거 (_rerollPosition 삭제)
//    · SKILL 박스 1개 → ACTION / ENHANCED / FINALE 박스 3개로 분리
//    · _rerollSkill → _rerollAction / _rerollEnhanced / _rerollFinale 3개로 분리
//    · _confirmHire — position 제거, action/enhanced/finale 저장, helmsman 추가
//    · jobLbl 매핑에 helmsman:'조타수' 추가
//    · _buildCustomBox fixedBelowImg 재계산 (박스 4개 기준)
// ================================================================

// ── 능력 id → 표시 이름 변환 헬퍼 ───────────────────────────────
// AbilityIndex 우선, 없으면 구버전 Data_Skills fallback
Tab_Recruit.prototype._abilityIdToName = function (type, id) {
  if (!id) return id;
  if (typeof AbilityIndex !== 'undefined') {
    const name = AbilityIndex.getName(type, id);
    if (name && name !== id) return name;
  }
  if (typeof getSkillById === 'function') {
    const s = getSkillById(id);
    if (s && s.name) return s.name;
  }
  return id;
};

// ── 능력 id → 설명 변환 헬퍼 ────────────────────────────────────
Tab_Recruit.prototype._abilityIdToDesc = function (type, id) {
  if (!id) return '';
  if (typeof AbilityIndex !== 'undefined') {
    return AbilityIndex.getDesc(type, id) || '';
  }
  if (typeof getSkillDescription === 'function') return getSkillDescription(id);
  return '';
};

// ════════════════════════════════════════════════════════════════
//  _resolveStats — 스탯 표시 데이터의 유일한 생성 함수
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
    result.baseSum = result.stats
      ? result.stats.reduce((a, b) => a + b, 0)
      : result.statSum;

  const { scene, W, H } = this;
  const cx = W / 2;
  const cy = H * 0.50;
  const bw = W * 0.82;
  const bh = H * 0.80;

  const panelBg = scene.add.graphics();
  panelBg.fillStyle(0x0c0905, 0.97);
  panelBg.lineStyle(1, 0x3a2010, 0.8);
  panelBg.fillRect(cx - bw/2, cy - bh/2, bw, bh);
  panelBg.strokeRect(cx - bw/2, cy - bh/2, bw, bh);
  this._container.add(panelBg);

  const leftW  = bw * 0.46;
  const rightW = bw - leftW;
  const leftCX  = cx - bw/2 + leftW/2;
  const rightCX = cx - bw/2 + leftW + rightW/2;

  this._buildStatPanel(leftCX, cy, leftW, bh);
  this._buildCustomBox(rightCX, cy, rightW, bh);
};

// ── 왼쪽: 스탯 패널 ─────────────────────────────────────────────

Tab_Recruit.prototype._buildStatPanel = function (cx, cy, bw, bh) {
  const { scene, result } = this;

  const bg = scene.add.graphics();
  bg.fillStyle(0x100d08, 0.95); bg.lineStyle(1, 0x2a1a08, 0.7);
  bg.fillRect(cx-bw/2, cy-bh/2, bw, bh); bg.strokeRect(cx-bw/2, cy-bh/2, bw, bh);
  this._container.add(bg);

  const pad    = bw * 0.06;
  const innerL = cx - bw/2 + pad;
  const innerW = bw - pad * 2;

  const topY   = cy - bh/2 + pad;
  const cogCol = RECRUIT_COG_COLORS[result.cog] || '#7dff4f';

  const cogTxt = scene.add.text(innerL, topY, `Cog  ${result.cog}`, {
    fontSize: this._fs(18), fill: cogCol,
    fontFamily: FontManager.MONO,
    stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0, 0);
  this._container.add(cogTxt);

  // ✏️ v6: helmsman 추가
  const jobLbl = { fisher:'낚시꾼', diver:'잠수부', helmsman:'조타수' }[result.job] || result.job;
  const jobTxt = scene.add.text(innerL + innerW, topY, jobLbl, {
    fontSize: this._fs(14), fill: '#a07040', fontFamily: FontManager.TITLE,
  }).setOrigin(1, 0);
  this._container.add(jobTxt);

  const infoTopY = topY + parseInt(this._fs(24));

  // ── 이름 필드 ──────────────────────────────────────────────
  const nameFieldH = parseInt(this._fs(30));
  const nameTextCY = infoTopY + nameFieldH / 2;
  const nameFontSz = this._fs(18);

  const _nameTxt2 = scene.add.text(innerL, nameTextCY, result.name || '이름 없음', {
    fontSize: nameFontSz, fill: '#e8c070', fontFamily: FontManager.TITLE,
  }).setOrigin(0, 0.5);
  this._container.add(_nameTxt2);

  const _nameLineG = scene.add.graphics();
  const nameUnderY = infoTopY + nameFieldH - 2;

  const _drawNL = (hov, editing) => {
    _nameLineG.clear();
    const col = editing ? 0xf0d080 : (hov ? 0x9a6020 : 0x3a2010);
    const alp = editing ? 1.0 : (hov ? 1.0 : 0.5);
    _nameLineG.lineStyle(editing ? 2 : 1, col, alp);
    _nameLineG.lineBetween(innerL, nameUnderY, innerL + innerW, nameUnderY);
  };
  _drawNL(false, false);
  this._container.add(_nameLineG);

  const _isValidKorean = (s) => s && s.length > 0 && /^[가-힣\s]+$/.test(s.trim()) && s.trim().length > 0;

  const nameHit = scene.add.rectangle(
    innerL + innerW/2, nameTextCY, innerW, nameFieldH, 0, 0
  ).setInteractive({ useHandCursor: true }).setDepth(20);
  this._sceneHits.push(nameHit);

  let _isEditing   = false;
  let _cursorTween = null;
  const _cursorBar = scene.add.graphics();
  _cursorBar.fillStyle(0xe8c070, 1);
  _cursorBar.fillRect(0, nameTextCY - parseInt(nameFontSz) * 0.6, 2, parseInt(nameFontSz) * 1.2);
  _cursorBar.setVisible(false);
  this._container.add(_cursorBar);

  nameHit.on('pointerover', () => { if (!_isEditing) _drawNL(true, false); });
  nameHit.on('pointerout',  () => { if (!_isEditing) _drawNL(false, false); });
  nameHit.on('pointerdown', () => {
    if (_isEditing) return;
    _isEditing = true;
    _drawNL(false, true);

    const inp = document.createElement('input');
    inp.type  = 'text';
    inp.value = this.result.name;
    inp.maxLength = 10;
    inp.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:0;left:0;';
    document.body.appendChild(inp);
    inp.focus();

    const _previewTxt = scene.add.text(innerL, nameTextCY, inp.value, {
      fontSize: nameFontSz, fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5);
    this._container.add(_previewTxt);
    _nameTxt2.setVisible(false);

    const _updateCursor = () => {
      if (_cursorBar.active) {
        _cursorBar.setX(innerL + _previewTxt.width + 2);
        _cursorBar.setVisible(true);
      }
    };

    _cursorBar.setX(innerL + 2);
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

  let infoY = infoTopY + nameFieldH + parseInt(this._fs(8));

  this._container.add(scene.add.text(innerL, infoY, `직업  :  ${jobLbl}`, {
    fontSize: this._fs(11), fill: '#7a5028', fontFamily: FontManager.MONO,
  }).setOrigin(0, 0));
  infoY += parseInt(this._fs(16));

  const isF = result.overclock != null;
  this._container.add(scene.add.text(innerL, infoY,
    `스탯합  :  ${result.statSum ?? result.baseSum ?? 0}`, {
    fontSize: this._fs(11), fill: isF ? '#d0a040' : '#7a5028',
    fontFamily: FontManager.MONO,
  }).setOrigin(0, 0));
  infoY += parseInt(this._fs(20));

  if (result.overclock) {
    const oc    = result.overclock;
    const ocHex = parseInt(oc.color.replace('#', '0x'));
    const ocH   = parseInt(this._fs(18));
    const ocBg  = scene.add.graphics();
    ocBg.fillStyle(ocHex, 0.12);
    ocBg.lineStyle(1, ocHex, 0.5);
    ocBg.fillRect(innerL, infoY, innerW, ocH);
    ocBg.strokeRect(innerL, infoY, innerW, ocH);
    this._container.add(ocBg);
    this._container.add(scene.add.text(innerL + innerW/2, infoY + ocH/2,
      oc.label || oc.statKey, {
      fontSize: this._fs(9), fill: oc.color, fontFamily: FontManager.MONO,
    }).setOrigin(0.5));
    infoY += ocH + parseInt(this._fs(6));

    const _ocP = { v: 0 };
    this._ocGlowTween = this._tween({
      targets: _ocP, v: { from: 0, to: 1 },
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (ocBg.active) {
          ocBg.clear();
          ocBg.fillStyle(ocHex, 0.08 + _ocP.v * 0.10);
          ocBg.lineStyle(1, ocHex, 0.3 + _ocP.v * 0.4);
          ocBg.fillRect(innerL, infoY - ocH - parseInt(this._fs(6)), innerW, ocH);
          ocBg.strokeRect(innerL, infoY - ocH - parseInt(this._fs(6)), innerW, ocH);
        }
      },
    });
  }

  // ── 스탯 블록 ─────────────────────────────────────────────────
  const statTopY   = infoY + parseInt(this._fs(4));
  const statBotY   = cy + bh/2 - pad;
  const totalRows  = RECRUIT_STAT_LABELS.length;
  const rowH2      = (statBotY - statTopY - parseInt(this._fs(13))) / totalRows;
  const statStartY = statTopY + parseInt(this._fs(13));
  const statBH     = rowH2 * totalRows;
  const statBlockX = innerL;
  const statBlockW = innerW;

  const resolved  = this._resolveStats(result);
  const ocStatIdx = resolved.findIndex(r => r.isOc);

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
      const sliceW = (statBlockW - 2) / slices;
      for (let s = 0; s < slices; s++) {
        glowG2.fillStyle(ocHex3, 0.28 - (0.26 * s / (slices - 1)));
        glowG2.fillRect(statBlockX + 1 + s * sliceW, rowY + 1, Math.ceil(sliceW), rowH2 - 2);
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

  // ── 인라인 툴팁 (커스텀 탭 전용) ─────────────────────────────
  // 씬에 직접 올린 뒤 _sceneHits에 추적해서 _clear()시 함께 소멸
  let _customTip = null;
  const _showCustomTip = (absX, absY, rawText) => {
    _hideCustomTip();
    const W = this.W, H = this.H;
    const lines     = rawText.split('\n');
    const titleLine = lines[0] || '';
    const descLines = lines.slice(1).join('\n').trim();
    const tpad = 12, tpadX = 14;
    const maxW = Math.round(W * 0.24);

    const titleObj = scene.add.text(0, 0, titleLine, {
      fontSize: this._fs(13), fill: '#e8d080',
      fontFamily: FontManager.MONO, fontStyle: 'bold',
      wordWrap: { width: maxW - tpadX * 2 },
    }).setDepth(302);

    const descObj = descLines ? scene.add.text(0, 0, descLines, {
      fontSize: this._fs(11), fill: '#b8a890',
      fontFamily: FontManager.MONO,
      wordWrap: { width: maxW - tpadX * 2 },
    }).setDepth(302) : null;

    const tH = titleObj.height, dH = descObj ? descObj.height : 0;
    const sepH = descLines ? 6 : 0;
    const bw2 = Math.min(maxW, Math.max(titleObj.width, descObj ? descObj.width : 0) + tpadX * 2);
    const bh2 = tpad + tH + sepH + dH + tpad;

    let tx = absX + 16, ty = absY + 16;
    if (tx + bw2 > W - 8) tx = absX - bw2 - 8;
    if (ty + bh2 > H - 8) ty = absY - bh2 - 8;

    const bgObj = scene.add.graphics().setDepth(301);
    bgObj.fillStyle(0x0a0807, 0.97);
    bgObj.lineStyle(2, 0xb07828, 1);
    bgObj.strokeRect(tx, ty, bw2, bh2);
    bgObj.fillRect(tx, ty, bw2, bh2);
    bgObj.lineStyle(1, 0x3a2010, 0.5);
    bgObj.strokeRect(tx + 3, ty + 3, bw2 - 6, bh2 - 6);
    if (descLines) {
      bgObj.lineStyle(1, 0x5a3810, 0.5);
      bgObj.lineBetween(tx + tpadX, ty + tpad + tH + 3, tx + bw2 - tpadX, ty + tpad + tH + 3);
    }

    titleObj.setPosition(tx + tpadX, ty + tpad);
    if (descObj) descObj.setPosition(tx + tpadX, ty + tpad + tH + sepH);

    _customTip = { bg: bgObj, t: titleObj, d: descObj };
    // 파기 추적 (씬 히트와 함께 _clear()에서 제거됨)
    this._sceneHits.push(bgObj, titleObj);
    if (descObj) this._sceneHits.push(descObj);
  };
  const _hideCustomTip = () => {
    if (!_customTip) return;
    [_customTip.bg, _customTip.t, _customTip.d].forEach(o => {
      if (!o) return;
      try { o.destroy(); } catch(e) {}
      const i = this._sceneHits.indexOf(o);
      if (i !== -1) this._sceneHits.splice(i, 1);
    });
    _customTip = null;
  };

  // ── 능력 상세 툴팁 문자열 생성 ───────────────────────────────
  const _abilTipText = (type, id) => {
    if (!id || id === '—') return `${type}\n정보 없음`;
    let name = id, desc = '', extra = '';
    if (typeof AbilityIndex !== 'undefined') {
      const data = AbilityIndex.getData(type, id);
      if (data) {
        name  = data.name || id;
        desc  = data.description || '';
        const jobTag   = data.job === 'common' ? '공통' : (data.job || '');
        const typeLabel = { passive:'패시브', action:'일반행동', enhanced:'강화행동', finale:'피날레' }[type] || type;
        const cogTag   = data.cogMin ? `Cog ${data.cogMin}+` : '';
        extra = [typeLabel, jobTag, cogTag].filter(Boolean).join('  ·  ');
        if (type === 'enhanced' && data.triggerType) {
          const trigMap = {
            attack_count: `공격 ${data.triggerValue}회마다`,
            on_hit:       '피격 시',
            hp_below:     `HP ${data.triggerValue}% 이하 시`,
            kill:         '적 처치 시',
          };
          extra += '\n발동: ' + (trigMap[data.triggerType] || data.triggerType);
        }
        if (type === 'finale' && data.gaugeRequired) {
          extra += `\n필요 게이지: ${data.gaugeRequired}`;
        }
      }
    }
    return [name, extra, desc].filter(Boolean).join('\n');
  };

  const cfH2  = parseInt(this._fs(34));
  const cfGap = pad * 0.6;
  const cfY   = botY - cfH2;

  const btnH       = 24;
  const abilDescH  = parseInt(this._fs(10));
  const abilTitleH = parseInt(this._fs(9));
  const abilNameH  = parseInt(this._fs(13));
  const abilInner  = 5;
  const abilBoxH   = abilInner + abilTitleH + 3 + abilNameH + abilDescH + 2 + 4 + btnH + abilInner;
  const gapSm      = pad * 0.45;

  // ✏️ v6: POSITION 제거 → 4박스 (PASSIVE + ACTION + ENHANCED + FINALE)
  const fixedBelowImg = gapSm
    + btnH + gapSm
    + (btnH + 6) + gapSm
    + abilBoxH + gapSm   // PASSIVE
    + abilBoxH + gapSm   // ACTION
    + abilBoxH + gapSm   // ENHANCED
    + abilBoxH + cfGap;  // FINALE

  const availForImg = (cfY - topY) - fixedBelowImg;
  const iH = Math.min(Math.max(availForImg, bw * 0.20), bw * 0.38);

  const iY  = curY + iH/2;
  const iBg = scene.add.graphics();
  iBg.fillStyle(0x1e1008, 1); iBg.lineStyle(1, 0x3d2010, 1);
  iBg.fillRect(boxL, curY, boxW, iH); iBg.strokeRect(boxL, curY, boxW, iH);
  this._container.add(iBg);
  this._spriteBoxX   = boxL + boxW/2;
  this._spriteBoxY   = iY;
  this._spriteBoxSz  = Math.min(boxW, iH);
  this._spriteImg    = null;
  this._spriteKeyTxt = null;
  this._renderSpriteBox(result.spriteKey);
  curY += iH + gapSm;

  this._spriteBtn = this._makeRerollBtn(
    boxL + boxW/2, curY + btnH/2, boxW,
    `외형 재설정  🎲  ${this.rerolls.sprite}`, () => this._rerollSprite(), btnH);
  curY += btnH + gapSm;

  const statBtnH = btnH + 6;
  this._statBtn = this._makeRerollBtn(
    boxL + boxW/2, curY + statBtnH/2, boxW,
    `스탯 재설정  🎲  ${this.rerolls.stat}`, () => this._rerollStats(), statBtnH);
  curY += statBtnH + gapSm;

  // ── 어빌리티 박스 헬퍼 (accentCol 인자 추가, 툴팁 연동) ─────────────────
  const makeAbilBox = (titleStr, accentCol, nameTxtRef, nameVal, descVal, rerollCount, rerollCb, btnRef, abilType, abilId) => {
    const accentHex = parseInt(accentCol.replace('#', '0x'));
    const boxG = scene.add.graphics();
    boxG.fillStyle(0x0e0b07, 1);
    boxG.lineStyle(1, accentHex, 0.35);
    boxG.strokeRect(boxL, curY, boxW, abilBoxH);
    boxG.fillRect(boxL, curY, boxW, abilBoxH);
    this._container.add(boxG);

    this._container.add(scene.add.text(boxL + abilInner, curY + abilInner, titleStr, {
      fontSize: this._fs(8), fill: accentCol, fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));

    const nameTxt = scene.add.text(
      boxL + abilInner, curY + abilInner + abilTitleH + 3, nameVal, {
      fontSize: this._fs(12), fill: '#e8c060', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0);
    this._container.add(nameTxt);
    nameTxtRef.ref = nameTxt;

    const descTxt = scene.add.text(
      boxL + abilInner, curY + abilInner + abilTitleH + 3 + abilNameH + 2, descVal || '', {
      fontSize: this._fs(8), fill: '#7a5830',
      fontFamily: FontManager.MONO,
      wordWrap: { width: boxW - abilInner * 2 },
    }).setOrigin(0, 0);
    this._container.add(descTxt);
    nameTxtRef.desc = descTxt;

    const btnY2 = curY + abilInner + abilTitleH + 3 + abilNameH + abilDescH + 2 + 5 + btnH/2;
    const btn   = this._makeRerollBtn(
      boxL + boxW/2, btnY2, boxW - abilInner*2,
      `🎲  ${rerollCount}`, rerollCb, btnH);
    btnRef.ref = btn;

    // ── 마우스오버 툴팁 hit (재설정 버튼 위 절반 영역) ──────────
    const tipAreaH = abilBoxH - btnH - abilInner * 2;
    const tipHitY  = curY + tipAreaH / 2;
    // abilType/abilId는 클로저로 유지 — 재설정 후 result.* 에서 최신 id 읽음
    const getLatestId = () => {
      if (abilType === 'passive')  return result.passive;
      if (abilType === 'action')   return result.action;
      if (abilType === 'enhanced') return result.enhanced;
      if (abilType === 'finale')   return result.finale;
      return abilId;
    };
    const tipHit   = scene.add.rectangle(
      boxL + boxW / 2, tipHitY, boxW, tipAreaH, 0, 0
    ).setInteractive({ useHandCursor: false }).setDepth(22);
    tipHit.on('pointerover', (ptr) => {
      boxG.clear();
      boxG.fillStyle(0x141008, 1);
      boxG.lineStyle(1, accentHex, 0.65);
      boxG.strokeRect(boxL, curY, boxW, abilBoxH);
      boxG.fillRect(boxL, curY, boxW, abilBoxH);
      nameTxt.setStyle({ fill: accentCol });
      _showCustomTip(ptr.x, ptr.y, _abilTipText(abilType, getLatestId()));
    });
    tipHit.on('pointerout', () => {
      boxG.clear();
      boxG.fillStyle(0x0e0b07, 1);
      boxG.lineStyle(1, accentHex, 0.35);
      boxG.strokeRect(boxL, curY, boxW, abilBoxH);
      boxG.fillRect(boxL, curY, boxW, abilBoxH);
      nameTxt.setStyle({ fill: '#e8c060' });
      _hideCustomTip();
    });
    this._sceneHits.push(tipHit);

    curY += abilBoxH + gapSm;
  };

  // PASSIVE
  const pRef = {}; const pBtn = {};
  const pasDesc = this._abilityIdToDesc('passive', result.passive);
  makeAbilBox('PASSIVE', '#a0d080', pRef, result.passive, pasDesc,
    this.rerolls.passive, () => this._rerollPassive(), pBtn, 'passive', result.passive);
  this._passiveTxtRef = pRef;
  this._passiveBtn    = pBtn.ref;

  // ACTION
  const aRef = {}; const aBtn = {};
  const actName = this._abilityIdToName('action', result.action);
  const actDesc = this._abilityIdToDesc('action', result.action);
  makeAbilBox('ACTION', '#c8a060', aRef, actName, actDesc,
    this.rerolls.action, () => this._rerollAction(), aBtn, 'action', result.action);
  this._actionTxtRef = aRef;
  this._actionBtn    = aBtn.ref;

  // ENHANCED
  const eRef = {}; const eBtn = {};
  const enhName = this._abilityIdToName('enhanced', result.enhanced);
  const enhDesc = this._abilityIdToDesc('enhanced', result.enhanced);
  makeAbilBox('ENHANCED', '#80b8e0', eRef, enhName, enhDesc,
    this.rerolls.enhanced, () => this._rerollEnhanced(), eBtn, 'enhanced', result.enhanced);
  this._enhancedTxtRef = eRef;
  this._enhancedBtn    = eBtn.ref;

  // FINALE — 게이지 수치를 이름 옆에 표시
  const fRef = {}; const fBtn = {};
  const finName  = this._abilityIdToName('finale', result.finale);
  const finDesc  = this._abilityIdToDesc('finale', result.finale);
  const finGauge = (typeof AbilityIndex !== 'undefined') ? AbilityIndex.getGauge(result.finale) : null;
  const finDisplay = finName + (finGauge ? `  (${finGauge})` : '');
  makeAbilBox('FINALE', '#ff88aa', fRef, finDisplay, finDesc,
    this.rerolls.finale, () => this._rerollFinale(), fBtn, 'finale', result.finale);
  this._finaleTxtRef = fRef;
  this._finaleBtn    = fBtn.ref;

  // ── 영입 확정 버튼 ────────────────────────────────────────────
  const cfBg   = scene.add.graphics();
  const cfGlow = scene.add.graphics();

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

  let normalizedKey = spriteKey;
  if (typeof CharacterSpriteManager !== 'undefined' && CharacterSpriteManager.getKey) {
    const idNum = parseInt((spriteKey || '').replace('char_', ''), 10);
    if (!isNaN(idNum)) normalizedKey = CharacterSpriteManager.getKey(idNum);
  }

  if (normalizedKey && scene.textures.exists(normalizedKey)) {
    const img   = scene.add.image(cx, iY, normalizedKey).setOrigin(0.5);
    const cellW = (typeof CharacterSpriteManager !== 'undefined' && CharacterSpriteManager.CELL_W)
      ? CharacterSpriteManager.CELL_W : (img.width  || 152);
    const cellH = (typeof CharacterSpriteManager !== 'undefined' && CharacterSpriteManager.CELL_H)
      ? CharacterSpriteManager.CELL_H : (img.height || 280);
    const sc = Math.min(iSz / cellW, iSz / cellH) * 0.92;
    img.setScale(sc);
    this._spriteImg = img;
    this._container.add(img);
    this._container.bringToTop(img);
  } else {
    const idNum      = parseInt((spriteKey || '').replace('char_', ''), 10);
    const displayNum = isNaN(idNum) ? '?' : idNum + 1;
    this._spriteKeyTxt = scene.add.text(cx, iY, `#${displayNum}`, {
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
  const MIN    = [1, 0, 1, 5, 0];
  const minSum = MIN.reduce((a, b) => a + b, 0);
  let   pool   = Math.max(0, total - minSum);
  const cuts   = [];
  for (let k = 0; k < 4; k++) cuts.push(Math.floor(Math.random() * (pool + 1)));
  cuts.sort((a, b) => a - b);
  const parts = [cuts[0], cuts[1]-cuts[0], cuts[2]-cuts[1], cuts[3]-cuts[2], pool-cuts[3]];
  return MIN.map((m, i) => m + parts[i]);
};

Tab_Recruit.prototype._rerollStats = function () {
  if (this.rerolls.stat <= 0) { this._toast('재설정 횟수 소진'); return; }

  const baseSum  = this.result.baseSum ?? this.result.statSum;
  const prevBase = this.result.baseStats ? [...this.result.baseStats] : [...this.result.stats];
  let   newBase;

  for (let t = 0; t < 20; t++) {
    newBase = this._rDistRandom(baseSum);
    const diff = newBase.reduce((acc, v, i) => acc + Math.abs(v - prevBase[i]), 0);
    if (diff > 0 || baseSum <= 7) break;
  }

  const prevSnap = { ...this.result, baseStats: prevBase };
  const nextSnap = { ...this.result, baseStats: newBase };

  this._showStatPopup(prevSnap, nextSnap, (chosenIsNext) => {
    this.result.baseStats = chosenIsNext ? [...newBase] : [...prevBase];
    this.rerolls.stat--;

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
  const prev      = this.result.spriteKey;
  const next      = _rSpriteKey();
  const prevLabel = `외형  #${parseInt(prev.replace('char_', ''), 10) + 1}`;
  const nextLabel = `외형  #${parseInt(next.replace('char_', ''), 10) + 1}`;

  this._showChoicePopup('외형  재설정', prevLabel, nextLabel, (chosen) => {
    const chosenKey = (chosen === nextLabel) ? next : prev;
    this.result.spriteKey = chosenKey;
    this.rerolls.sprite--;
    this._renderSpriteBox(chosenKey);
    if (this.rerolls.sprite <= 0) this._disableBtn(this._spriteBtn, '외형  ✕');
    else this._spriteBtn.txt.setText(`외형  🎲  ${this.rerolls.sprite}`);
  }, [prev, next]);
};

// ── 능력 풀 조회 헬퍼 (AbilityIndex 우선, fallback 지원) ──────────
Tab_Recruit.prototype._getAbilityPool = function (type, job, cog) {
  if (typeof AbilityIndex !== 'undefined') {
    return AbilityIndex.getPool(type, job, cog);
  }
  // fallback: 기존 PASSIVE_POOL
  if (type === 'passive' && typeof PASSIVE_POOL !== 'undefined') {
    return PASSIVE_POOL[cog] || PASSIVE_POOL[1];
  }
  return [];
};

Tab_Recruit.prototype._rerollPassive = function () {
  if (this.rerolls.passive <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev    = this.result.passive;
  const pool    = this._getAbilityPool('passive', this.result.job, this.result.cog);
  let   next    = prev;
  for (let t = 0; t < 10; t++) {
    next = _rFrom(pool);
    if (next !== prev || pool.length <= 1) break;
  }

  const prevName = this._abilityIdToName('passive', prev);
  const nextName = this._abilityIdToName('passive', next);

  this._showChoicePopup('패시브  재설정', prevName, nextName, (chosen) => {
    const chosenId = (chosen === nextName) ? next : prev;
    this.result.passive = chosenId;
    this.rerolls.passive--;
    this._passiveTxtRef.ref.setText(chosen);
    if (this._passiveTxtRef.desc) {
      this._passiveTxtRef.desc.setText(this._abilityIdToDesc('passive', chosenId));
    }
    if (this.rerolls.passive <= 0) this._disableBtn(this._passiveBtn, '✕');
    else this._passiveBtn.txt.setText(`🎲  ${this.rerolls.passive}`);
  }, [prev, next]);
};

Tab_Recruit.prototype._rerollAction = function () {
  if (this.rerolls.action <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev = this.result.action;
  const pool = this._getAbilityPool('action', this.result.job, this.result.cog);
  let   next = prev;
  for (let t = 0; t < 10; t++) {
    next = _rFrom(pool);
    if (next !== prev || pool.length <= 1) break;
  }

  const prevName = this._abilityIdToName('action', prev);
  const nextName = this._abilityIdToName('action', next);

  this._showChoicePopup('일반 행동  재설정', prevName, nextName, (chosen) => {
    const chosenId = (chosen === nextName) ? next : prev;
    this.result.action = chosenId;
    this.rerolls.action--;
    this._actionTxtRef.ref.setText(chosen);
    if (this._actionTxtRef.desc) {
      this._actionTxtRef.desc.setText(this._abilityIdToDesc('action', chosenId));
    }
    if (this.rerolls.action <= 0) this._disableBtn(this._actionBtn, '✕');
    else this._actionBtn.txt.setText(`🎲  ${this.rerolls.action}`);
  }, [prev, next]);
};

Tab_Recruit.prototype._rerollEnhanced = function () {
  if (this.rerolls.enhanced <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev = this.result.enhanced;
  const pool = this._getAbilityPool('enhanced', this.result.job, this.result.cog);
  let   next = prev;
  for (let t = 0; t < 10; t++) {
    next = _rFrom(pool);
    if (next !== prev || pool.length <= 1) break;
  }

  const prevName = this._abilityIdToName('enhanced', prev);
  const nextName = this._abilityIdToName('enhanced', next);

  this._showChoicePopup('강화 행동  재설정', prevName, nextName, (chosen) => {
    const chosenId = (chosen === nextName) ? next : prev;
    this.result.enhanced = chosenId;
    this.rerolls.enhanced--;
    this._enhancedTxtRef.ref.setText(chosen);
    if (this._enhancedTxtRef.desc) {
      this._enhancedTxtRef.desc.setText(this._abilityIdToDesc('enhanced', chosenId));
    }
    if (this.rerolls.enhanced <= 0) this._disableBtn(this._enhancedBtn, '✕');
    else this._enhancedBtn.txt.setText(`🎲  ${this.rerolls.enhanced}`);
  }, [prev, next]);
};

Tab_Recruit.prototype._rerollFinale = function () {
  if (this.rerolls.finale <= 0) { this._toast('재설정 횟수 소진'); return; }
  const prev = this.result.finale;
  const pool = this._getAbilityPool('finale', this.result.job, this.result.cog);
  let   next = prev;
  for (let t = 0; t < 10; t++) {
    next = _rFrom(pool);
    if (next !== prev || pool.length <= 1) break;
  }

  const prevName = this._abilityIdToName('finale', prev);
  const nextName = this._abilityIdToName('finale', next);

  this._showChoicePopup('피날레  재설정', prevName, nextName, (chosen) => {
    const chosenId   = (chosen === nextName) ? next : prev;
    const chosenName = (chosen === nextName) ? nextName : prevName;
    this.result.finale = chosenId;
    this.rerolls.finale--;
    const gauge = (typeof AbilityIndex !== 'undefined') ? AbilityIndex.getGauge(chosenId) : null;
    this._finaleTxtRef.ref.setText(chosenName + (gauge ? `  (${gauge})` : ''));
    if (this._finaleTxtRef.desc) {
      this._finaleTxtRef.desc.setText(this._abilityIdToDesc('finale', chosenId));
    }
    if (this.rerolls.finale <= 0) this._disableBtn(this._finaleBtn, '✕');
    else this._finaleBtn.txt.setText(`🎲  ${this.rerolls.finale}`);
  }, [prev, next]);
};

// ── 영입 확정 ────────────────────────────────────────────────────

Tab_Recruit.prototype._confirmHire = function () {
  const { result } = this;

  const chars   = (typeof CharacterManager !== 'undefined') ? CharacterManager.loadAll() : [];
  const statObj = {};
  RECRUIT_STAT_KEYS.forEach((k, i) => {
    statObj[k] = Math.floor((result.baseStats || result.stats)[i] ?? 0);
  });
  const statSum = Object.values(statObj).reduce((a, v) => a + v, 0);
  const cog     = (typeof CharacterManager !== 'undefined' && CharacterManager.calcCog)
    ? CharacterManager.calcCog(statSum) : result.cog;

  // ✏️ v6: helmsman 추가, position 필드 제거
  const jobLabel = { fisher:'낚시꾼', diver:'잠수부', helmsman:'조타수' }[result.job] || result.job;

  const newChar = {
    id:          `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:        result.name || '이름 없음',
    job:         result.job,
    jobLabel,
    stats:       statObj,
    statSum,
    cog,
    passive:     result.passive   || '—',
    action:      result.action    || '—',
    enhanced:    result.enhanced  || '—',
    finale:      result.finale    || '—',
    overclock:   result.overclock || null,
    spriteKey:   result.spriteKey || (typeof CharacterSpriteManager !== 'undefined'
      ? CharacterSpriteManager.getKey(0) : 'char_000'),
    maxHp:        statObj.hp * 5,
    currentHp:    statObj.hp * 5,
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

Tab_Recruit.prototype._showHireCompletePopup = function (charName, onClose) {
  const { scene, W, H } = this;
  const cx = W / 2;
  const cy = H / 2;

  const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.75)
    .setOrigin(0).setDepth(90).setInteractive();
  this._popupObjs.push(overlay);

  const pw = W * 0.44;
  const ph = H * 0.32;
  const px = cx - pw / 2;
  const py = cy - ph / 2;

  const popBg = scene.add.graphics().setDepth(91);
  popBg.fillStyle(0x0e0b07, 1);
  popBg.lineStyle(2, 0xa05018, 0.9);
  popBg.fillRect(px, py, pw, ph);
  popBg.strokeRect(px, py, pw, ph);
  this._popupObjs.push(popBg);

  const titleTxt = scene.add.text(cx, py + ph * 0.22, '영  입  완  료', {
    fontSize: this._fs(18), fill: '#e8c070', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5).setDepth(92).setAlpha(0);
  this._popupObjs.push(titleTxt);

  const nameTxt = scene.add.text(cx, py + ph * 0.48, charName, {
    fontSize: this._fs(26), fill: '#ffffff', fontFamily: FontManager.TITLE,
    stroke: '#3a1a08', strokeThickness: 4,
  }).setOrigin(0.5).setDepth(92).setAlpha(0);
  this._popupObjs.push(nameTxt);

  const hintTxt = scene.add.text(cx, py + ph * 0.76, '— 클릭하여 계속 —', {
    fontSize: this._fs(10), fill: '#5a3818', fontFamily: FontManager.MONO,
  }).setOrigin(0.5).setDepth(92).setAlpha(0);
  this._popupObjs.push(hintTxt);

  scene.tweens.add({ targets: titleTxt, alpha: 1, duration: 300, delay: 80 });
  scene.tweens.add({ targets: nameTxt,  alpha: 1, duration: 350, delay: 200 });
  scene.tweens.add({
    targets: hintTxt, alpha: { from: 0, to: 0.7 },
    duration: 600, delay: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  const closeAll = () => {
    [overlay, popBg, titleTxt, nameTxt, hintTxt].forEach(o => {
      try { o.destroy(); } catch(e) {}
      const idx = this._popupObjs.indexOf(o);
      if (idx !== -1) this._popupObjs.splice(idx, 1);
    });
    if (onClose) onClose();
  };

  overlay.on('pointerdown', closeAll);
  popBg.setInteractive().on('pointerdown', closeAll);
};
