// ================================================================
//  Dive_Panel_Party.js
//  경로: Games/Codes/Scenes/Dives/Panels/Dive_Panel_Party.js
//
//  역할: 파티 관리 패널 — 탐사 파티원 상태 관리
//
//  ── 레이아웃 ─────────────────────────────────────────────────
//  ┌──────────────┬─────────────────────────────────────────┐
//  │  좌측 카드   │  우측 상세                               │
//  │  목록 36%    │  초상화 45% / 이름배너 9% / HP+스탯      │
//  │  (스크롤)    │                                         │
//  └──────────────┴─────────────────────────────────────────┘
//
//  규칙:
//  - alive / ai 상태만 표시 (dead_chip은 전투에서 이미 제거됨)
//  - 회복 버튼은 추후 병원 탭 이관 예정 (현재 미구현)
//
//  호출: DivePanelParty(scene, px, py, pw, ph, fs)
// ================================================================

function DivePanelParty(scene, px, py, pw, ph, fs) {

  // ── 데이터 준비 ──────────────────────────────────────────────
  const allChars   = CharacterManager.loadAll() || [];
  const partyIds   = scene._battleParty || [];
  const partyChars = partyIds
    .map(id => allChars.find(c => c.id === id))
    .filter(c => c && (!c.status || c.status === 'alive' || c.status === 'ai'));

  // ── 레이아웃 계산 ─────────────────────────────────────────────
  const listW   = Math.round(pw * 0.36);
  const divGap  = Math.round(pw * 0.02);
  const detailX = px + listW + divGap;
  const detailW = pw - listW - divGap;
  const bodyY   = py + Math.round(ph * 0.04);
  const bodyH   = ph - Math.round(ph * 0.04) - Math.round(ph * 0.02);

  // ── 선택 상태 ─────────────────────────────────────────────────
  let selectedId = partyChars.length > 0 ? partyChars[0].id : null;
  let detailObjs = [];
  const cardObjs = [];

  // ── 좌측: 카드 목록 ───────────────────────────────────────────
  const cardH   = Math.round(bodyH * 0.175);
  const cardGap = Math.round(bodyH * 0.012);
  const cardW   = listW - Math.round(pw * 0.01);
  const listX   = px;
  const totalH  = partyChars.length * (cardH + cardGap);
  const maxScroll = Math.max(0, totalH - bodyH);
  let   scrollY = 0;

  // 마스크 (스크롤 영역)
  const maskGfx = scene.make.graphics({});
  maskGfx.fillStyle(0xffffff, 1);
  maskGfx.fillRect(listX, bodyY, listW, bodyH);
  const mask   = maskGfx.createGeometryMask();
  const listCt = scene.add.container(0, 0).setMask(mask);
  scene._panelContent.add(maskGfx);
  scene._panelContent.add(listCt);

  // 카드 배경 드로우
  const drawCard = (obj, char, selected) => {
    obj.bg.clear();
    const cogC = CharacterManager.getCogColor(char.cog);
    if (selected) {
      obj.bg.fillStyle(0x2a1a08, 1);
      obj.bg.lineStyle(2, 0xc8a070, 1);
    } else {
      obj.bg.fillStyle(0x0c0906, 0.9);
      obj.bg.lineStyle(1, cogC.phaser, 0.45);
    }
    obj.bg.fillRect(listX, obj.baseY, cardW, cardH);
    obj.bg.strokeRect(listX, obj.baseY, cardW, cardH);
  };

  partyChars.forEach((char, i) => {
    const baseY = bodyY + i * (cardH + cardGap);
    const cogC  = CharacterManager.getCogColor(char.cog);
    const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;

    const bg = scene.add.graphics();
    const obj = { bg, baseY };
    drawCard(obj, char, char.id === selectedId);
    listCt.add(bg);

    // 스프라이트
    if (scene.textures.exists(char.spriteKey)) {
      const spr = scene.add.image(listX + cardH * 0.42, baseY + cardH / 2, char.spriteKey)
        .setDisplaySize(cardH * 0.72, cardH * 0.72).setAlpha(0.9);
      listCt.add(spr);
    }

    // 이름
    listCt.add(scene.add.text(
      listX + cardH * 0.85, baseY + cardH * 0.22, char.name, {
        fontSize: fs(10), fill: '#c8bfb0', fontFamily: FontManager.TITLE,
        wordWrap: { width: cardW - cardH * 0.9 },
      }).setOrigin(0, 0.5));

    // Cog·직업
    listCt.add(scene.add.text(
      listX + cardH * 0.85, baseY + cardH * 0.50,
      `Cog ${char.cog}  ·  ${char.jobLabel || ''}`, {
        fontSize: fs(8), fill: cogC.css, fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));

    // HP 바
    const bX  = listX + cardH * 0.85;
    const bY  = baseY + cardH * 0.76;
    const bW  = cardW - cardH * 0.90 - Math.round(pw * 0.01);
    const bH  = 3;
    const hpBar = scene.add.graphics();
    hpBar.fillStyle(0x1a1008, 1);
    hpBar.fillRect(bX, bY, bW, bH);
    const hpCol = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    hpBar.fillStyle(hpCol, 1);
    hpBar.fillRect(bX, bY, Math.max(1, Math.round(bW * hpPct)), bH);
    listCt.add(hpBar);

    // HP 수치
    listCt.add(scene.add.text(bX, bY - 2, `${char.currentHp}/${char.maxHp}`, {
      fontSize: fs(7), fill: '#6a5030', fontFamily: FontManager.MONO,
    }).setOrigin(0, 1));

    // hit (패널 컨텐츠 직접 — depth 35로 패널 위)
    const hit = scene.add.rectangle(
      listX + cardW / 2, baseY + cardH / 2, cardW, cardH, 0, 0
    ).setInteractive({ useHandCursor: true }).setDepth(35);
    scene._panelContent.add(hit);

    hit.on('pointerdown', () => {
      selectedId = char.id;
      cardObjs.forEach(co => drawCard(co.obj, co.char, co.char.id === selectedId));
      buildDetail(char);
    });

    cardObjs.push({ obj, char });
  });

  // 스크롤 이벤트 (패널 열린 동안만 동작)
  const wheelCb = (ptr, objs, dx, dy) => {
    scrollY = Math.max(0, Math.min(scrollY + dy * 0.5, maxScroll));
    listCt.setY(-scrollY);
  };
  scene.input.on('wheel', wheelCb);
  // 패널 닫힐 때 제거용 참조 저장
  if (!scene._divePartyWheelCbs) scene._divePartyWheelCbs = [];
  scene._divePartyWheelCbs.push(wheelCb);

  // ── 우측: 상세 패널 ───────────────────────────────────────────
  // 좌우 구분선
  const divLineG = scene.add.graphics();
  divLineG.lineStyle(1, 0x2a1a08, 0.6);
  divLineG.lineBetween(
    detailX - Math.round(divGap / 2), bodyY,
    detailX - Math.round(divGap / 2), py + ph - Math.round(ph * 0.02)
  );
  scene._panelContent.add(divLineG);

  function buildDetail(char) {
    detailObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    detailObjs = [];
    if (!char) return;

    const add  = (obj) => { scene._panelContent.add(obj); detailObjs.push(obj); return obj; };
    const cogC = CharacterManager.getCogColor(char.cog);
    const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol  = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;

    // ── 초상화 영역 (상단 45%) ──────────────────────────────────
    const portraitH = Math.round(bodyH * 0.44);
    const portCX    = detailX + detailW / 2;
    const portCY    = bodyY + portraitH / 2;

    const portBg = scene.add.graphics();
    portBg.fillStyle(0x050406, 0.7);
    portBg.fillRect(detailX, bodyY, detailW, portraitH);
    add(portBg);

    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img = scene.add.image(portCX, portCY, char.spriteKey).setOrigin(0.5);
      const maxS = Math.min(detailW * 0.78, portraitH * 0.88);
      img.setScale(Math.min(maxS / img.width, maxS / img.height));
      add(img);
    }

    // AI 마킹
    if (char.status === 'ai') {
      add(scene.add.text(
        detailX + Math.round(detailW * 0.04), bodyY + Math.round(ph * 0.015),
        'A.I', { fontSize: fs(9), fill: '#8844cc', fontFamily: FontManager.MONO }
      ));
    }

    // Cog 뱃지 (우상단)
    add(scene.add.text(
      detailX + detailW - Math.round(detailW * 0.04), bodyY + Math.round(ph * 0.015),
      `Cog ${char.cog}`,
      { fontSize: fs(9), fill: cogC.css, fontFamily: FontManager.MONO }
    ).setOrigin(1, 0));

    // ── 이름·직업 배너 ──────────────────────────────────────────
    const bannerY = bodyY + portraitH;
    const bannerH = Math.round(bodyH * 0.10);

    const bannerBg = scene.add.graphics();
    bannerBg.fillStyle(0x0a0806, 0.92);
    bannerBg.lineStyle(1, 0x2a1a08, 0.7);
    bannerBg.fillRect(detailX, bannerY, detailW, bannerH);
    bannerBg.strokeRect(detailX, bannerY, detailW, bannerH);
    add(bannerBg);

    add(scene.add.text(detailX + detailW / 2, bannerY + bannerH * 0.28, char.name, {
      fontSize: fs(14), fill: '#c8bfb0', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0.5));

    add(scene.add.text(detailX + detailW / 2, bannerY + bannerH * 0.70,
      `${char.jobLabel || ''}  ·  ${char.age || ''}세`, {
        fontSize: fs(8), fill: '#6a4828', fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0.5));

    // ── HP 바 ────────────────────────────────────────────────────
    const hpSecY = bannerY + bannerH + Math.round(bodyH * 0.025);
    const hpBarH = Math.round(bodyH * 0.022);
    const hpBarX = detailX + Math.round(detailW * 0.04);
    const hpBarW = detailW - Math.round(detailW * 0.08);

    add(scene.add.text(hpBarX, hpSecY, 'HP', {
      fontSize: fs(8), fill: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5));

    add(scene.add.text(
      detailX + detailW - Math.round(detailW * 0.04), hpSecY,
      `${char.currentHp} / ${char.maxHp}`, {
        fontSize: fs(8), fill: '#7a6040', fontFamily: FontManager.MONO,
      }).setOrigin(1, 0.5));

    const hpBgG = scene.add.graphics();
    hpBgG.fillStyle(0x0a0808, 1);
    hpBgG.fillRect(hpBarX, hpSecY + Math.round(bodyH * 0.018), hpBarW, hpBarH);
    add(hpBgG);

    const hpFgG = scene.add.graphics();
    hpFgG.fillStyle(hpCol, 1);
    hpFgG.fillRect(hpBarX, hpSecY + Math.round(bodyH * 0.018),
      Math.max(2, Math.round(hpBarW * hpPct)), hpBarH);
    add(hpFgG);

    // ── 스탯 블록 ────────────────────────────────────────────────
    const statTop   = hpSecY + Math.round(bodyH * 0.018) + hpBarH + Math.round(bodyH * 0.022);
    const statKeys  = ['attack', 'agility', 'luck', 'health'];
    const SC        = CharacterManager.STAT_COLORS     || {};
    const SL        = CharacterManager.STAT_LABEL_MAP  || {};
    const remaining = (bodyY + bodyH) - statTop - Math.round(bodyH * 0.02);
    const statRowH  = Math.round(remaining / statKeys.length);
    const statX     = hpBarX;
    const statW     = hpBarW;

    // 구분선
    const secDivG = scene.add.graphics();
    secDivG.lineStyle(1, 0x1e1008, 0.5);
    secDivG.lineBetween(statX, statTop - Math.round(bodyH * 0.010),
      statX + statW, statTop - Math.round(bodyH * 0.010));
    add(secDivG);

    statKeys.forEach((key, idx) => {
      const rowMidY = statTop + idx * statRowH + statRowH / 2;
      const val     = CharacterManager.getEffectiveStat
        ? CharacterManager.getEffectiveStat(char, key)
        : (char.stats?.[key] ?? 0);
      const maxVal  = 30;
      const barPct  = Math.min(1, val / maxVal);
      const colHex  = SC[key] || '#a06040';
      const colInt  = parseInt(colHex.replace('#', '0x'));
      const label   = SL[key] || key;

      // 라벨
      add(scene.add.text(statX, rowMidY, label, {
        fontSize: fs(9), fill: colHex, fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));

      // 수치
      add(scene.add.text(statX + Math.round(statW * 0.28), rowMidY, `${val}`, {
        fontSize: fs(10), fill: colHex, fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));

      // 바
      const bX  = statX + Math.round(statW * 0.40);
      const bW  = statW - Math.round(statW * 0.40);
      const bH  = Math.max(3, Math.round(statRowH * 0.30));

      const statBg = scene.add.graphics();
      statBg.fillStyle(0x0a0808, 0.8);
      statBg.fillRect(bX, rowMidY - bH / 2, bW, bH);
      add(statBg);

      const statFg = scene.add.graphics();
      statFg.fillStyle(colInt, 0.85);
      statFg.fillRect(bX, rowMidY - bH / 2, Math.max(2, Math.round(bW * barPct)), bH);
      add(statFg);
    });
  }

  // ── 초기 선택 ────────────────────────────────────────────────
  if (partyChars.length > 0) {
    buildDetail(partyChars[0]);
  } else {
    scene._panelContent.add(
      scene.add.text(px + pw / 2, py + ph / 2, '탐사 파티원이 없습니다', {
        fontSize: fs(13), fill: '#2a1a0a', fontFamily: FontManager.MONO,
      }).setOrigin(0.5)
    );
  }
}
