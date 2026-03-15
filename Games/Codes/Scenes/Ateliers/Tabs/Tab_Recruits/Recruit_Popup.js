// ================================================================
//  Recruit_Popup.js  (v6 — base 기준 증감 표기)
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Popup.js
//
//  역할: 재설정 팝업 두 종류
//    _showStatPopup   — 스탯 비교 (이전 vs 새로운), 두 박스 클릭 선택
//    _showChoicePopup — 외형/패시브/스킬 유지 vs 새로운 선택
//  의존: Recruit_Data.js, Recruit_Custom.js(this._resolveStats), Tab_Recruit.js(this)
//
//  ── v5 변경사항 ───────────────────────────────────────────────
//  · _showStatPopup 시그니처 변경
//      이전: (prevStats, nextStats, onConfirm, overclock, prevBase, nextBase)
//      이후: (prevSnap, nextSnap, onConfirm)
//      각 스냅샷에 this._resolveStats() 호출 → effective 독자 계산 완전 삭제
//  · onConfirm 콜백 인자 변경
//      이전: onConfirm(chosenStatsArray)
//      이후: onConfirm(chosenIsNext: boolean)
//  · _showChoicePopup 변경 없음
//
//  ── v6 변경사항 ───────────────────────────────────────────────
//  · 증감 배경·화살표: eff 기준 → base 기준으로 변경
//      오버클럭 보정 노이즈 제거 — 재설정으로 실제 스탯이 얼마나 바뀌었는지만 표시
//      dispStr("base → eff")는 유지, 증감 판정만 base 기준
// ================================================================

// ── 스탯 재설정 팝업 ─────────────────────────────────────────────
// prevSnap / nextSnap : result 스냅샷 객체 (baseStats, overclock 포함)
// onConfirm(chosenIsNext: boolean) — true면 nextSnap 선택, false면 prevSnap 선택
Tab_Recruit.prototype._showStatPopup = function (prevSnap, nextSnap, onConfirm) {
  const { scene, W, H } = this;
  const cx = W / 2;
  const cy = H / 2;

  const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.80)
    .setOrigin(0).setDepth(80).setInteractive();
  const pop = scene.add.container(0, 0).setDepth(81);

  const bW  = W * 0.26;
  const bH  = H * 0.52;
  const gap = W * 0.04;
  const lx  = cx - bW/2 - gap/2;
  const rx  = cx + bW/2 + gap/2;
  const bY  = cy;
  const rowH = bH / (RECRUIT_STAT_LABELS.length + 1.8);

  // ✅ 두 스냅샷 모두 _resolveStats()로 표시 데이터 생성
  //    effective 계산이 오직 _resolveStats 하나에만 존재
  const prevResolved = this._resolveStats(prevSnap);
  const nextResolved = this._resolveStats(nextSnap);

  // 오버클럭 정보는 스냅샷의 overclock 필드에서 직접 참조
  const oc      = prevSnap.overclock || nextSnap.overclock || null;
  const ocIdx   = oc ? RECRUIT_STAT_KEYS.indexOf(oc.statKey) : -1;
  const ocColor = oc ? oc.color : null;
  const ocHex   = ocColor ? parseInt(ocColor.replace('#', '0x')) : null;

  let selectedSide = null;

  const makePanel = (panelX, resolved, isPrev) => {
    const side   = isPrev ? 'prev' : 'next';
    const panelG = scene.add.graphics();
    const glowG  = scene.add.graphics();

    const draw = (state) => {
      panelG.clear(); glowG.clear();
      if (state === 'selected') {
        panelG.fillStyle(isPrev ? 0x1a1206 : 0x0e1a08, 1);
        panelG.lineStyle(2, isPrev ? 0xc8a030 : 0x40c840, 1);
        [
          { pad: 12, a: 0.07, c: isPrev ? 0xc8a030 : 0x30c830 },
          { pad:  7, a: 0.18, c: isPrev ? 0xc8a030 : 0x30c830 },
          { pad:  3, a: 0.35, c: isPrev ? 0xb08020 : 0x20b820 },
          { pad:  1, a: 0.60, c: isPrev ? 0xa07010 : 0x10a010 },
        ].forEach(({ pad: p, a, c }) => {
          glowG.lineStyle(1, c, a);
          glowG.strokeRect(panelX - bW/2 - p, bY - bH/2 - p, bW + p*2, bH + p*2);
        });
        panelG.strokeRect(panelX - bW/2, bY - bH/2, bW, bH);
        panelG.fillRect(panelX - bW/2, bY - bH/2, bW, bH);
      } else if (state === 'hover') {
        panelG.fillStyle(isPrev ? 0x120e06 : 0x0a1206, 1);
        panelG.lineStyle(1, isPrev ? 0x8a6820 : 0x306820, 0.8);
        panelG.strokeRect(panelX - bW/2, bY - bH/2, bW, bH);
        panelG.fillRect(panelX - bW/2, bY - bH/2, bW, bH);
      } else {
        panelG.fillStyle(0x0c0a06, 1);
        panelG.lineStyle(1, 0x2a1a08, 0.6);
        panelG.strokeRect(panelX - bW/2, bY - bH/2, bW, bH);
        panelG.fillRect(panelX - bW/2, bY - bH/2, bW, bH);
      }
    };
    draw('normal');
    pop.add([glowG, panelG]);

    // 헤더 라벨
    pop.add(scene.add.text(panelX, bY - bH/2 + rowH * 0.5,
      isPrev ? '◀  현재 스탯' : '새로운 스탯  ▶', {
      fontSize: this._fs(12), fill: isPrev ? '#c8a060' : '#60c860',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5));

    const hlineG = scene.add.graphics();
    hlineG.lineStyle(1, 0x2a1808, 0.7);
    hlineG.lineBetween(panelX - bW*0.42, bY - bH*0.36, panelX + bW*0.42, bY - bH*0.36);
    pop.add(hlineG);

    // ── 스탯 블록 ─────────────────────────────────────────────
    const sbX  = panelX - bW * 0.42;
    const sbW  = bW * 0.84;
    const sbY0 = bY - bH * 0.28;
    const rH   = rowH * 0.92;
    const sbH  = rH * RECRUIT_STAT_LABELS.length;

    const sbBg = scene.add.graphics();
    sbBg.fillStyle(0x0e0b07, 1); sbBg.lineStyle(1, 0x2a1a08, 0.7);
    sbBg.fillRect(sbX, sbY0, sbW, sbH); sbBg.strokeRect(sbX, sbY0, sbW, sbH);
    pop.add(sbBg);

    // ✅ resolved 배열을 그대로 소비 — 독자 계산 없음
    resolved.forEach((stat, i) => {
      const ry   = sbY0 + i * rH;
      const midY = ry + rH * 0.5;

      // 행 구분선
      if (i > 0) {
        const sg = scene.add.graphics();
        sg.lineStyle(1, 0x1e1206, 0.5);
        sg.lineBetween(sbX + 4, ry, sbX + sbW - 4, ry);
        pop.add(sg);
      }

      // 오버클럭 행 좌측 강조선
      if (stat.isOc) {
        const ocSlice = scene.add.graphics();
        const slices  = 20;
        const sliceW  = sbW / slices;
        for (let s = 0; s < slices; s++) {
          ocSlice.fillStyle(ocHex, 0.22 - (0.20 * s / (slices - 1)));
          ocSlice.fillRect(sbX + 1 + s * sliceW, ry + 1, Math.ceil(sliceW), rH - 2);
        }
        ocSlice.fillStyle(ocHex, 0.85);
        ocSlice.fillRect(sbX + 1, ry + 1, 2, rH - 2);
        pop.add(ocSlice);
      }

      // 새로운 탭 — 증감 배경 (base 기준 비교 — 오버클럭 보정 노이즈 제거)
      if (!isPrev) {
        const prevBase = prevResolved[i].base;
        const nextBase = nextResolved[i].base;
        const diff     = nextBase - prevBase;
        if (diff !== 0) {
          const boxCol  = diff > 0 ? 0x204820 : 0x481010;
          const lineCol = diff > 0 ? 0x30a030 : 0xa03030;
          const diffBg  = scene.add.graphics();
          diffBg.fillStyle(boxCol, 0.45); diffBg.lineStyle(1, lineCol, 0.5);
          diffBg.fillRect(sbX + 2, ry + 1, sbW - 4, rH - 2);
          diffBg.strokeRect(sbX + 2, ry + 1, sbW - 4, rH - 2);
          pop.add(diffBg);
        }
      }

      // 스탯 라벨
      pop.add(scene.add.text(sbX + 8, midY, stat.label, {
        fontSize: this._fs(13),
        fill: stat.isOc ? stat.ocColor : stat.col + 'cc',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));

      // ✅ dispStr — "base → eff" 또는 "eff", _resolveStats에서 이미 계산됨
      pop.add(scene.add.text(sbX + sbW * 0.60, midY, stat.dispStr, {
        fontSize: this._fs(15),
        fill: stat.isOc ? stat.ocColor : stat.col,
        fontFamily: FontManager.MONO, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5));

      // 증감 화살표 (새로운 탭만) — base 기준: 재설정으로 실제 스탯이 얼마나 바뀌었는지
      if (!isPrev) {
        const diff = nextResolved[i].base - prevResolved[i].base;
        if (diff !== 0) {
          pop.add(scene.add.text(sbX + sbW - 4, midY,
            `${diff > 0 ? '▲' : '▼'}${Math.abs(diff)}`, {
            fontSize: this._fs(11),
            fill: diff > 0 ? '#50e050' : '#e05050',
            fontFamily: FontManager.MONO,
          }).setOrigin(1, 0.5));
        }
      }
    });

    const hit = scene.add.rectangle(panelX, bY, bW, bH, 0, 0)
      .setInteractive({ useHandCursor: true });
    pop.add(hit);
    hit.on('pointerover', () => { if (selectedSide !== side) draw('hover'); });
    hit.on('pointerout',  () => { if (selectedSide !== side) draw('normal'); });

    return { draw, hit, side };
  };

  const prevPanel = makePanel(lx, prevResolved, true);
  const nextPanel = makePanel(rx, nextResolved, false);

  // ✅ onConfirm(boolean) — 어느 쪽을 선택했는지만 전달
  //    실제 result 갱신은 _rerollStats 콜백에서 처리
  const onPanelClick = (panel, otherPanel, isNext) => {
    panel.hit.on('pointerdown', () => {
      if (selectedSide === panel.side) {
        overlay.destroy(); pop.destroy(); onConfirm(isNext);
      } else {
        selectedSide = panel.side;
        panel.draw('selected');
        otherPanel.draw('normal');
      }
    });
  };
  onPanelClick(prevPanel, nextPanel, false);
  onPanelClick(nextPanel, prevPanel, true);
};

// ── 외형/패시브/스킬 선택 팝업 ───────────────────────────────────
Tab_Recruit.prototype._showChoicePopup = function (title, prevLabel, nextLabel, onConfirm, rawValues) {
  const { scene, W, H } = this;
  const cx = W / 2;
  const cy = H / 2;

  const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.80)
    .setOrigin(0).setDepth(80).setInteractive();
  const pop = scene.add.container(0, 0).setDepth(81);

  const isSprite = rawValues &&
    typeof rawValues[0] === 'string' && rawValues[0].startsWith('char_');
  const bW  = isSprite ? W * 0.20 : W * 0.26;
  const bH  = isSprite ? H * 0.52 : H * 0.24;
  const gap = W * 0.04;
  const lx  = cx - bW/2 - gap/2;
  const rx  = cx + bW/2 + gap/2;
  const bY  = cy;

  pop.add(scene.add.text(cx, cy - bH/2 - parseInt(this._fs(16)), title, {
    fontSize: this._fs(13), fill: '#c8bfb0', fontFamily: FontManager.MONO,
  }).setOrigin(0.5));

  let selectedSide = null;

  const makePanel = (panelX, label, isPrev, rawVal) => {
    const side   = isPrev ? 'prev' : 'next';
    const panelG = scene.add.graphics();
    const glowG  = scene.add.graphics();

    const draw = (state) => {
      panelG.clear(); glowG.clear();
      if (state === 'selected') {
        panelG.fillStyle(isPrev ? 0x1a1206 : 0x0e1a08, 1);
        panelG.lineStyle(2, isPrev ? 0xc8a030 : 0x40c840, 1);
        [
          { pad: 12, a: 0.07, c: isPrev ? 0xc8a030 : 0x30c830 },
          { pad:  7, a: 0.18, c: isPrev ? 0xc8a030 : 0x30c830 },
          { pad:  3, a: 0.35, c: isPrev ? 0xb08020 : 0x20b820 },
          { pad:  1, a: 0.60, c: isPrev ? 0xa07010 : 0x10a010 },
        ].forEach(({ pad: p, a, c }) => {
          glowG.lineStyle(1, c, a);
          glowG.strokeRect(panelX - bW/2 - p, bY - bH/2 - p, bW + p*2, bH + p*2);
        });
        panelG.strokeRect(panelX - bW/2, bY - bH/2, bW, bH);
        panelG.fillRect(panelX - bW/2, bY - bH/2, bW, bH);
      } else if (state === 'hover') {
        panelG.fillStyle(isPrev ? 0x120e06 : 0x0a1206, 1);
        panelG.lineStyle(1, isPrev ? 0x8a6820 : 0x306820, 0.8);
        panelG.strokeRect(panelX - bW/2, bY - bH/2, bW, bH);
        panelG.fillRect(panelX - bW/2, bY - bH/2, bW, bH);
      } else {
        panelG.fillStyle(isPrev ? 0x221810 : 0x0a0e06, 1);
        panelG.lineStyle(1, 0x3a2010, 0.7);
        panelG.strokeRect(panelX - bW/2, bY - bH/2, bW, bH);
        panelG.fillRect(panelX - bW/2, bY - bH/2, bW, bH);
      }
    };
    draw('normal');
    pop.add([glowG, panelG]);

    pop.add(scene.add.text(panelX, bY - bH/2 + parseInt(this._fs(14)),
      isPrev ? '◀  현재' : '새로운  ▶', {
      fontSize: this._fs(12),
      fill: isPrev ? '#c8a060' : '#60c860',
      fontFamily: FontManager.MONO, letterSpacing: 2,
    }).setOrigin(0.5));

    const hlineG = scene.add.graphics();
    hlineG.lineStyle(1, 0x2a1808, 0.7);
    hlineG.lineBetween(panelX - bW*0.42, bY - bH*0.34, panelX + bW*0.42, bY - bH*0.34);
    pop.add(hlineG);

    if (isSprite) {
      const iSz = bW * 0.64;
      const iY  = bY + bH * 0.02;
      const iBg = scene.add.graphics();
      iBg.fillStyle(0x221810, 1); iBg.lineStyle(1, 0x4a3020, 0.9);
      iBg.fillRect(panelX - iSz/2, iY - iSz/2, iSz, iSz);
      iBg.strokeRect(panelX - iSz/2, iY - iSz/2, iSz, iSz);
      pop.add(iBg);

      // ✅ CharacterSpriteManager.getKey()로 키 정규화 후 텍스처 체크
      let normalizedRaw = rawVal;
      if (rawVal && typeof CharacterSpriteManager !== 'undefined' && CharacterSpriteManager.getKey) {
        const idNum = parseInt((rawVal || '').replace('char_', ''), 10);
        if (!isNaN(idNum)) normalizedRaw = CharacterSpriteManager.getKey(idNum);
      }

      if (normalizedRaw && scene.textures.exists(normalizedRaw)) {
        const img = scene.add.image(panelX, iY, normalizedRaw).setOrigin(0.5);
        const cellW = (typeof CharacterSpriteManager !== 'undefined' && CharacterSpriteManager.CELL_W) ? CharacterSpriteManager.CELL_W : (img.width || 152);
        const cellH = (typeof CharacterSpriteManager !== 'undefined' && CharacterSpriteManager.CELL_H) ? CharacterSpriteManager.CELL_H : (img.height || 280);
        const sc = Math.min(iSz / cellW, iSz / cellH) * 0.90;
        img.setScale(sc);
        pop.add(img);
      } else {
        const num = parseInt((rawVal || '').replace('char_', ''), 10);
        const displayNum = isNaN(num) ? '?' : num + 1;
        pop.add(scene.add.text(panelX, iY, `#${displayNum}`, {
          fontSize: this._fs(18), fill: '#3d2010', fontFamily: FontManager.MONO,
        }).setOrigin(0.5));
      }
    } else {
      // 패시브 / 포지션 / 스킬
      const nameY = bY - bH * 0.08;
      pop.add(scene.add.text(panelX, nameY, label, {
        fontSize: this._fs(14), fill: '#e8c060',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5));

      // ✅ 설명 조회:
      //    · rawVal이 있으면 rawVal(원본 id/값)로 조회 — 스킬 id 등
      //    · rawVal이 없으면 label(이름)로 조회 — 포지션·패시브
      const lookupKey = rawVal || label;
      const desc =
        (typeof getPositionDescription === 'function' ? getPositionDescription(label)    : '') ||
        (typeof getPassiveDescription  === 'function' ? getPassiveDescription(label)     : '') ||
        (typeof getSkillDescription    === 'function' ? getSkillDescription(lookupKey)   : '') || '';
      if (desc) {
        pop.add(scene.add.text(panelX, nameY + parseInt(this._fs(22)), desc, {
          fontSize: this._fs(13), fill: '#a07840',
          fontFamily: FontManager.MONO,
          wordWrap: { width: bW * 0.84 }, align: 'center',
        }).setOrigin(0.5, 0));
      }
    }

    const hit = scene.add.rectangle(panelX, bY, bW, bH, 0, 0)
      .setInteractive({ useHandCursor: true });
    pop.add(hit);
    hit.on('pointerover', () => { if (selectedSide !== side) draw('hover'); });
    hit.on('pointerout',  () => { if (selectedSide !== side) draw('normal'); });

    return { draw, hit, side };
  };

  const prevPanel = makePanel(lx, prevLabel, true,  rawValues?.[0]);
  const nextPanel = makePanel(rx, nextLabel, false, rawValues?.[1]);

  const onPanelClick = (panel, otherPanel, chosenLabel) => {
    panel.hit.on('pointerdown', () => {
      if (selectedSide === panel.side) {
        overlay.destroy(); pop.destroy(); onConfirm(chosenLabel);
      } else {
        selectedSide = panel.side;
        panel.draw('selected');
        otherPanel.draw('normal');
      }
    });
  };
  onPanelClick(prevPanel, nextPanel, prevLabel);
  onPanelClick(nextPanel, prevPanel, nextLabel);
};
