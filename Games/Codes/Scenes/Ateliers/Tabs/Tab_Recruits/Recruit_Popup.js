// ================================================================
//  Recruit_Popup.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Popup.js
//
//  역할: 재설정 팝업 두 종류
//    _showStatPopup   — 스탯 비교 (이전 vs 새로운), 두 박스 클릭 선택
//    _showChoicePopup — 외형/패시브/스킬 유지 vs 새로운 선택
//  의존: Recruit_Data.js, Tab_Recruit.js(this)
// ================================================================

// ── 스탯 재설정 팝업 ─────────────────────────────────────────────
// 검은 오버레이 위에 두 패널만 표시
// 1클릭 → 발광 선택, 2클릭 → 확정

Tab_Recruit.prototype._showStatPopup = function (prevStats, nextStats, onConfirm) {
  const { scene, W, H } = this;
  const cx = W / 2;
  const cy = H / 2;

  const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.80)
    .setOrigin(0).setDepth(80);
  const pop = scene.add.container(0, 0).setDepth(81);

  const bW  = W * 0.26;
  const bH  = H * 0.48;
  const gap = W * 0.04;
  const lx  = cx - bW/2 - gap/2;
  const rx  = cx + bW/2 + gap/2;
  const bY  = cy;
  const rowH = bH / (RECRUIT_STAT_LABELS.length + 1.5);

  let selectedSide = null;

  const makePanel = (panelX, stats, isPrev) => {
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
          { pad:  1, a: 0.60, c: isPrev ? 0x906010 : 0x10a010 },
        ].forEach(({ pad, a, c }) => {
          glowG.lineStyle(2, c, a);
          glowG.strokeRect(panelX - bW/2 - pad, bY - bH/2 - pad, bW + pad*2, bH + pad*2);
        });
      } else if (state === 'hover') {
        panelG.fillStyle(0x1a1208, 1); panelG.lineStyle(1, 0x5a3010, 0.9);
      } else {
        panelG.fillStyle(0x120d07, 1); panelG.lineStyle(1, 0x2a1a08, 0.7);
      }
      panelG.fillRect(panelX - bW/2, bY - bH/2, bW, bH);
      panelG.strokeRect(panelX - bW/2, bY - bH/2, bW, bH);
    };

    draw('normal');
    pop.add(glowG); pop.add(panelG);

    // 헤더
    pop.add(scene.add.text(panelX, bY - bH*0.44,
      isPrev ? '◀  현재 스탯' : '새로운 스탯  ▶', {
      fontSize: this._fs(12), fill: isPrev ? '#c8a060' : '#60c860',
      fontFamily: FontManager.MONO, letterSpacing: 2,
    }).setOrigin(0.5));

    // 헤더 구분선
    const hlineG = scene.add.graphics();
    hlineG.lineStyle(1, 0x2a1808, 0.7);
    hlineG.lineBetween(panelX - bW*0.42, bY - bH*0.36, panelX + bW*0.42, bY - bH*0.36);
    pop.add(hlineG);

    // 스탯 행
    RECRUIT_STAT_LABELS.forEach((label, i) => {
      const ry   = bY - bH*0.28 + i * rowH;
      const val  = stats[i];
      const diff = val - prevStats[i];

      pop.add(scene.add.text(panelX - bW*0.38, ry, label, {
        fontSize: this._fs(13), fill: '#a08060', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));

      pop.add(scene.add.text(panelX + bW*0.10, ry, String(val), {
        fontSize: this._fs(15), fill: '#e8d4a0',
        fontFamily: FontManager.MONO, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5));

      if (!isPrev && diff !== 0) {
        pop.add(scene.add.text(panelX + bW*0.38, ry,
          `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}`, {
          fontSize: this._fs(13), fill: diff > 0 ? '#50e050' : '#e05050',
          fontFamily: FontManager.MONO,
        }).setOrigin(1, 0.5));
      }
    });

    // 히트 영역
    const hit = scene.add.rectangle(panelX, bY, bW, bH, 0, 0)
      .setInteractive({ useHandCursor: true });
    pop.add(hit);
    hit.on('pointerover', () => { if (selectedSide !== side) draw('hover'); });
    hit.on('pointerout',  () => { if (selectedSide !== side) draw('normal'); });

    return { draw, hit, side };
  };

  const prevPanel = makePanel(lx, prevStats, true);
  const nextPanel = makePanel(rx, nextStats, false);

  // 클릭 핸들러 (양쪽 패널 생성 후 등록)
  const onPanelClick = (panel, otherPanel, stats) => {
    panel.hit.on('pointerdown', () => {
      if (selectedSide === panel.side) {
        overlay.destroy(); pop.destroy(); onConfirm(stats);
      } else {
        selectedSide = panel.side;
        panel.draw('selected');
        otherPanel.draw('normal');
      }
    });
  };
  onPanelClick(prevPanel, nextPanel, prevStats);
  onPanelClick(nextPanel, prevPanel, nextStats);
};

// ── 외형/패시브/스킬 선택 팝업 ───────────────────────────────────
// 스탯 팝업과 동일한 양식: 두 패널, 1클릭→발광, 2클릭→확정
// mode: 'sprite' | 'passive' | 'skill'

Tab_Recruit.prototype._showChoicePopup = function (title, prevLabel, nextLabel, onConfirm, rawValues) {
  const { scene, W, H } = this;
  const cx = W / 2;
  const cy = H / 2;

  const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.80)
    .setOrigin(0).setDepth(80);
  const pop = scene.add.container(0, 0).setDepth(81);

  // 외형 팝업이면 패널을 크게, 텍스트 팝업이면 기존 크기
  const isSprite = rawValues &&
    typeof rawValues[0] === 'string' && rawValues[0].startsWith('char_');
  const bW  = isSprite ? W * 0.20 : W * 0.26;
  const bH  = isSprite ? H * 0.52 : H * 0.24;
  const gap = W * 0.04;
  const lx  = cx - bW/2 - gap/2;
  const rx  = cx + bW/2 + gap/2;
  const bY  = cy;

  // 팝업 타이틀
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
          { pad:  1, a: 0.60, c: isPrev ? 0x906010 : 0x10a010 },
        ].forEach(({ pad, a, c }) => {
          glowG.lineStyle(2, c, a);
          glowG.strokeRect(panelX - bW/2 - pad, bY - bH/2 - pad, bW + pad*2, bH + pad*2);
        });
      } else if (state === 'hover') {
        panelG.fillStyle(0x1a1208, 1); panelG.lineStyle(1, 0x5a3010, 0.9);
      } else {
        panelG.fillStyle(0x120d07, 1); panelG.lineStyle(1, 0x2a1a08, 0.7);
      }
      panelG.fillRect(panelX - bW/2, bY - bH/2, bW, bH);
      panelG.strokeRect(panelX - bW/2, bY - bH/2, bW, bH);
    };

    draw('normal');
    pop.add(glowG); pop.add(panelG);

    // 헤더
    pop.add(scene.add.text(panelX, bY - bH*0.44,
      isPrev ? '◀  현재' : '새로운  ▶', {
      fontSize: this._fs(12),
      fill: isPrev ? '#c8a060' : '#60c860',
      fontFamily: FontManager.MONO, letterSpacing: 2,
    }).setOrigin(0.5));

    // 헤더 구분선
    const hlineG = scene.add.graphics();
    hlineG.lineStyle(1, 0x2a1808, 0.7);
    hlineG.lineBetween(panelX - bW*0.42, bY - bH*0.34, panelX + bW*0.42, bY - bH*0.34);
    pop.add(hlineG);

    if (isSprite) {
      // 외형 팝업: 초상화 이미지 표시
      const iSz = bW * 0.80;
      const iY  = bY + bH * 0.02;
      const iBg = scene.add.graphics();
      iBg.fillStyle(0x0a0806, 1); iBg.lineStyle(1, 0x2a1a0a, 0.8);
      iBg.fillRect(panelX - iSz/2, iY - iSz/2, iSz, iSz);
      iBg.strokeRect(panelX - iSz/2, iY - iSz/2, iSz, iSz);
      pop.add(iBg);

      if (rawVal && scene.textures.exists(rawVal)) {
        const img = scene.add.image(panelX, iY, rawVal).setOrigin(0.5);
        const sc  = Math.min(iSz / img.width, iSz / img.height) * 0.90;
        img.setScale(sc);
        pop.add(img);
      } else {
        const num = parseInt((rawVal || '').replace('char_', '')) + 1;
        pop.add(scene.add.text(panelX, iY, `#${num}`, {
          fontSize: this._fs(18), fill: '#3d2010', fontFamily: FontManager.MONO,
        }).setOrigin(0.5));
      }
    } else {
      // 패시브 / 스킬 팝업: 능력명 + 설명
      const nameY = bY - bH * 0.08;
      pop.add(scene.add.text(panelX, nameY, label, {
        fontSize: this._fs(14), fill: '#e8c060',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5));

      // 설명 텍스트 (PassiveData / SkillData 연동)
      const desc = getPassiveDescription(label) || getSkillDescription(label) || '';
      if (desc) {
        pop.add(scene.add.text(panelX, nameY + parseInt(this._fs(18)), desc, {
          fontSize: this._fs(9), fill: '#7a5830',
          fontFamily: FontManager.MONO,
          wordWrap: { width: bW * 0.84 }, align: 'center',
        }).setOrigin(0.5, 0));
      }
    }

    // 히트 영역
    const hit = scene.add.rectangle(panelX, bY, bW, bH, 0, 0)
      .setInteractive({ useHandCursor: true });
    pop.add(hit);
    hit.on('pointerover', () => { if (selectedSide !== side) draw('hover'); });
    hit.on('pointerout',  () => { if (selectedSide !== side) draw('normal'); });

    return { draw, hit, side };
  };

  const prevPanel = makePanel(lx, prevLabel, true,  rawValues?.[0]);
  const nextPanel = makePanel(rx, nextLabel, false, rawValues?.[1]);

  // 1클릭 → 발광, 2클릭 → 확정
  const onPanelClick = (panel, otherPanel, val) => {
    panel.hit.on('pointerdown', () => {
      if (selectedSide === panel.side) {
        overlay.destroy(); pop.destroy(); onConfirm(val);
      } else {
        selectedSide = panel.side;
        panel.draw('selected');
        otherPanel.draw('normal');
      }
    });
  };
  onPanelClick(prevPanel, nextPanel, rawValues?.[0] ?? prevLabel);
  onPanelClick(nextPanel, prevPanel, rawValues?.[1] ?? nextLabel);

  // ✕ 닫기 (유지로 처리)
  const xt = scene.add.text(cx + bW/2 + gap/2 + bW/2 - 8, cy - bH/2 - parseInt(this._fs(14)), '✕', {
    fontSize: this._fs(12), fill: '#4a2a10', fontFamily: FontManager.MONO,
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  pop.add(xt);
  xt.on('pointerover', () => xt.setStyle({ fill: '#c8bfb0' }));
  xt.on('pointerout',  () => xt.setStyle({ fill: '#4a2a10' }));
  xt.on('pointerdown', () => {
    overlay.destroy(); pop.destroy();
    onConfirm(rawValues?.[0] ?? prevLabel);
  });
};
