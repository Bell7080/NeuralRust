// ================================================================
//  Dive_Panel_Party.js
//  경로: Games/Codes/Scenes/Dives/Panels/Dive_Panel_Party.js
//
//  역할: 파티 관리 패널 — TM 관리탭 구조를 패널 크기로 압축
//
//  ── 레이아웃 ─────────────────────────────────────────────────
//  ┌──────────┬────────────┬─────────────────────────────────┐
//  │ 좌측     │ 중앙       │ 우측                             │
//  │ 캐릭터   │ 초상화     │ 이름/숙련도/직업/오버클럭/HP/Cog │
//  │ 그리드   │ 확대       │ 스탯 / POSITION·PASSIVE·SKILL   │
//  │ (스크롤) │            │                                  │
//  └──────────┴────────────┴─────────────────────────────────┘
//
//  ── 좌표계 주의 ─────────────────────────────────────────────
//  _panelContent는 _panelContainer 내 로컬 컨테이너.
//  make.graphics 마스크는 씬 절대좌표 기준이므로
//  _panelContainer의 실제 openX/openY를 더해서 계산해야 함.
//
//  규칙:
//  - alive / ai 상태만 표시
//  - 회복 버튼은 추후 병원 탭으로 이관 예정 (현재 미구현)
//
//  호출: DivePanelParty(scene, px, py, pw, ph, fs)
//        px,py,pw,ph = 패널 로컬 좌표 기준 콘텐츠 영역
// ================================================================

function DivePanelParty(scene, px, py, pw, ph, fs) {

  // ── 데이터 ───────────────────────────────────────────────────
  const allChars   = CharacterManager.loadAll() || [];
  const partyIds   = scene._battleParty || [];
  const partyChars = partyIds
    .map(id => allChars.find(c => c.id === id))
    .filter(c => c && (!c.status || c.status === 'alive' || c.status === 'ai'));

  const SC = CharacterManager.STAT_COLORS ||
    { hp:'#ff88bb', health:'#88ddaa', attack:'#ff3333', agility:'#55ccff', luck:'#ddcc44' };
  const SL = CharacterManager.STAT_LABEL_MAP ||
    { hp:'체력', health:'건강', attack:'공격', agility:'민첩', luck:'행운' };

  // ── 3단 레이아웃 비율 ─────────────────────────────────────────
  const listW   = Math.round(pw * 0.24);   // 좌측 그리드
  const centerW = Math.round(pw * 0.30);   // 중앙 초상화
  const rightW  = pw - listW - centerW;    // 우측 정보
  const listX   = px;
  const centerX = px + listW;
  const rightX  = px + listW + centerW;
  const bodyY   = py;
  const bodyH   = ph;

  // 구분선 (패널 로컬 좌표)
  const divG = scene.add.graphics();
  divG.lineStyle(1, 0x2a1a08, 0.5);
  divG.lineBetween(centerX, bodyY, centerX, bodyY + bodyH);
  divG.lineBetween(rightX,  bodyY, rightX,  bodyY + bodyH);
  scene._panelContent.add(divG);

  // 선택 상태
  let selId     = partyChars.length > 0 ? partyChars[0].id : null;
  let detailObjs = [];
  const cardObjs = [];

  // ── 빈 파티 안내 ─────────────────────────────────────────────
  if (partyChars.length === 0) {
    scene._panelContent.add(
      scene.add.text(px + pw / 2, py + ph / 2, '탐사 파티원이 없습니다', {
        fontSize: fs(13), fill: '#2a1a0a', fontFamily: FontManager.MONO,
      }).setOrigin(0.5)
    );
    return;
  }

  // ════════════════════════════════════════════════════════════
  //  좌측: 체스판형 그리드
  // ════════════════════════════════════════════════════════════
  const cols   = 2;
  const hPad   = Math.round(listW * 0.04);
  const cardW  = Math.floor((listW - hPad * 2 - Math.round(listW * 0.02)) / cols);
  const cardH  = Math.round(cardW * 1.25);
  const gapX   = listW - hPad * 2 - cardW * cols;
  const gapY   = Math.round(cardH * 0.06);
  const startX = listX + hPad + cardW / 2;
  const startCY = bodyY + Math.round(cardH / 2) + Math.round(bodyH * 0.02);

  // 마스크 — panelContainer의 씬 절대좌표 필요
  // _panelContainer는 _panelOpenX, _panelOpenY 위치에 있음
  const absX = (scene._panelOpenX || 0) + px;
  const absY = (scene._panelOpenY || 0) + py;

  const maskGfx = scene.make.graphics({});
  maskGfx.fillStyle(0xffffff, 1);
  maskGfx.fillRect(absX, absY, listW, bodyH);
  maskGfx.setVisible(false); // 렌더링 안 되도록 — add하면 흰 박스로 보임

  const listCt = scene.add.container(0, 0)
    .setMask(maskGfx.createGeometryMask());
  scene._panelContent.add(listCt);

  const totalRows = Math.ceil(partyChars.length / cols);
  const totalH    = totalRows * (cardH + gapY);
  const maxScroll = Math.max(0, totalH - bodyH);
  let   scrollY   = 0;

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
    obj.bg.fillRect(obj.cx - cardW / 2, obj.cy - cardH / 2, cardW, cardH);
    obj.bg.strokeRect(obj.cx - cardW / 2, obj.cy - cardH / 2, cardW, cardH);
  };

  partyChars.forEach((char, i) => {
    const col  = i % cols;
    const row  = Math.floor(i / cols);
    const cx   = startX + col * (cardW + gapX);
    const cy   = startCY + row * (cardH + gapY);
    const cogC = CharacterManager.getCogColor(char.cog);

    const bg  = scene.add.graphics();
    const obj = { bg, cx, cy };
    drawCard(obj, char, char.id === selId);
    listCt.add(bg);

    // 스프라이트
    if (scene.textures.exists(char.spriteKey)) {
      const spr = scene.add.image(cx, cy - cardH * 0.06, char.spriteKey)
        .setDisplaySize(cardW * 0.78, cardW * 0.78).setAlpha(0.9);
      listCt.add(spr);
    }

    // Cog 뱃지
    listCt.add(scene.add.text(cx - cardW * 0.44, cy - cardH * 0.44,
      `C${char.cog}`, { fontSize: fs(7), fill: cogC.css, fontFamily: FontManager.MONO }
    ).setOrigin(0, 0));

    // 이름
    listCt.add(scene.add.text(cx, cy + cardH * 0.36, char.name, {
      fontSize: fs(8), fill: '#c8bfb0', fontFamily: FontManager.TITLE,
      wordWrap: { width: cardW - 4 }, align: 'center',
    }).setOrigin(0.5, 0));

    // HP 바
    const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const bX = cx - cardW * 0.40, bW = cardW * 0.80, bH = 3;
    const bY = cy + cardH * 0.44;
    const hpBar = scene.add.graphics();
    hpBar.fillStyle(0x1a1008, 1);
    hpBar.fillRect(bX, bY, bW, bH);
    const hpCol = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    hpBar.fillStyle(hpCol, 1);
    hpBar.fillRect(bX, bY, Math.max(1, Math.round(bW * hpPct)), bH);
    listCt.add(hpBar);

    // hit (씬 절대좌표 — _panelContent 직접)
    const hit = scene.add.rectangle(cx, cy, cardW, cardH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(35);
    scene._panelContent.add(hit);

    hit.on('pointerdown', () => {
      selId = char.id;
      cardObjs.forEach(co => drawCard(co.obj, co.char, co.char.id === selId));
      buildDetail(char);
    });

    cardObjs.push({ obj, char });
  });

  // 스크롤
  const wheelCb = (ptr, objs, dx, dy) => {
    scrollY = Math.max(0, Math.min(scrollY + dy * 0.5, maxScroll));
    listCt.setY(-scrollY);
  };
  scene.input.on('wheel', wheelCb);
  if (!scene._divePartyWheelCbs) scene._divePartyWheelCbs = [];
  scene._divePartyWheelCbs.push(wheelCb);

  // ════════════════════════════════════════════════════════════
  //  중앙: 초상화 확대
  // ════════════════════════════════════════════════════════════
  let centerObjs = [];

  const buildCenter = (char) => {
    centerObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    centerObjs = [];
    const addC = (o) => { scene._panelContent.add(o); centerObjs.push(o); return o; };

    const cx = centerX + centerW / 2;
    const cy = bodyY + bodyH / 2;

    const portBg = scene.add.graphics();
    portBg.fillStyle(0x050406, 0.6);
    portBg.fillRect(centerX, bodyY, centerW, bodyH);
    addC(portBg);

    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img = scene.add.image(cx, cy, char.spriteKey).setOrigin(0.5);
      const maxS = Math.min(centerW * 0.88, bodyH * 0.82);
      img.setScale(Math.min(maxS / img.width, maxS / img.height));
      addC(img);
    }
  };

  // ════════════════════════════════════════════════════════════
  //  우측: 정보 / 스탯 / 어빌리티 (TM_RightPanel 구조 이식)
  // ════════════════════════════════════════════════════════════
  const buildDetail = (char) => {
    detailObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    detailObjs = [];
    buildCenter(char);

    const add  = (o) => { scene._panelContent.add(o); detailObjs.push(o); return o; };
    const addH = (o) => { detailObjs.push(o); return o; };

    const rpad  = Math.round(rightW * 0.06);
    const colX  = rightX + rpad;
    const colW  = rightW - rpad * 2;
    const cogC  = CharacterManager.getCogColor(char.cog);

    // rw 비례 폰트 (TM_RightPanel 동일 방식)
    const RW_BASE = 260;
    const rScale  = Math.max(0.72, Math.min(1.3, rightW / RW_BASE));
    const rfs = n => fs(Math.round(n * rScale));

    let curY = bodyY + rpad;

    // ── 툴팁 헬퍼 ──────────────────────────────────────────────
    let _tip = null;
    const _showTip = (x, y, raw) => {
      _hideTip();
      // 패널 컨테이너 로컬 → 씬 절대좌표 보정
      const ox = scene._panelOpenX || 0;
      const oy = scene._panelOpenY || 0;
      const ax = x + ox, ay = y + oy;
      const lines = raw.split('\n');
      const title = lines[0] || '';
      const desc  = lines.slice(1).join('\n').trim();
      const tpad  = 10, tpadX = 12;
      const maxW  = Math.round(colW * 1.2);
      const tObj  = scene.add.text(0, 0, title, {
        fontSize: fs(13), fill: '#e8d080', fontFamily: FontManager.MONO, fontStyle: 'bold',
        wordWrap: { width: maxW - tpadX * 2 },
      }).setDepth(502);
      const dObj = desc ? scene.add.text(0, 0, desc, {
        fontSize: fs(11), fill: '#b8a890', fontFamily: FontManager.MONO,
        wordWrap: { width: maxW - tpadX * 2 },
      }).setDepth(502) : null;
      const tH = tObj.height, dH = dObj ? dObj.height : 0, sepH = desc ? 6 : 0;
      const bw = Math.min(maxW, Math.max(tObj.width, dObj ? dObj.width : 0) + tpadX * 2);
      const bh = tpad + tH + sepH + dH + tpad;
      const W  = scene.W, H = scene.H;
      let tx = ax + 14, ty = ay + 14;
      if (tx + bw > W - 8) tx = ax - bw - 8;
      if (ty + bh > H - 8) ty = ay - bh - 8;
      const bgG = scene.add.graphics().setDepth(501);
      bgG.fillStyle(0x0a0807, 0.97); bgG.lineStyle(2, 0xb07828, 1);
      bgG.strokeRect(tx, ty, bw, bh); bgG.fillRect(tx, ty, bw, bh);
      bgG.lineStyle(1, 0x3a2010, 0.5); bgG.strokeRect(tx+3, ty+3, bw-6, bh-6);
      if (desc) { bgG.lineStyle(1, 0x5a3810, 0.5); bgG.lineBetween(tx+tpadX, ty+tpad+tH+3, tx+bw-tpadX, ty+tpad+tH+3); }
      tObj.setPosition(tx+tpadX, ty+tpad);
      if (dObj) dObj.setPosition(tx+tpadX, ty+tpad+tH+sepH);
      _tip = { bg: bgG, t: tObj, d: dObj };
      detailObjs.push(bgG, tObj);
      if (dObj) detailObjs.push(dObj);
    };
    const _moveTip = () => {};
    const _hideTip = () => {
      if (!_tip) return;
      [_tip.bg, _tip.t, _tip.d].forEach(o => { if (o) { try { o.destroy(); } catch(e){} } });
      _tip = null;
    };

    // ── 이름 ────────────────────────────────────────────────
    add(scene.add.text(colX, curY, char.name, {
      fontSize: rfs(22), fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0));
    curY += parseInt(rfs(26));

    // ── 숙련도 ──────────────────────────────────────────────
    const masteryLv = char.mastery || 0;
    add(scene.add.text(colX, curY, `숙련도  Lv.${masteryLv}`, {
      fontSize: rfs(11), fill: masteryLv > 0 ? '#b8a060' : '#5a4a28',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(rfs(15));

    // ── 직업 ────────────────────────────────────────────────
    const jobTxt = add(scene.add.text(colX, curY,
      `직업  :  ${char.jobLabel || ''}`, {
        fontSize: rfs(12), fill: '#c8802a', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0));
    const jobHit = scene.add.rectangle(
      colX + jobTxt.width / 2, curY + parseInt(rfs(7)),
      jobTxt.width + 8, parseInt(rfs(16)), 0, 0
    ).setInteractive({ useHandCursor: false }).setDepth(36);
    addH(jobHit);
    jobHit.on('pointerover', (ptr) =>
      _showTip(ptr.x, ptr.y, `직업\n${typeof getJobTooltip === 'function' ? getJobTooltip(char.job) : char.jobLabel}`));
    jobHit.on('pointerout', () => _hideTip());
    curY += parseInt(rfs(17));

    // ── 오버클럭 ────────────────────────────────────────────
    const _persistTweens = [];
    if (char.overclock) {
      const ocColor = char.overclock.color || '#ff4400';
      const ocLabel = char.overclock.label || char.overclock.name || '오버클럭';
      const ocLine  = add(scene.add.text(colX, curY, ocLabel, {
        fontSize: rfs(11), fill: ocColor, fontFamily: FontManager.MONO,
      }).setOrigin(0, 0));
      const ocHit = scene.add.rectangle(
        colX + ocLine.width / 2, curY + parseInt(rfs(6)),
        ocLine.width + 8, parseInt(rfs(14)), 0, 0
      ).setInteractive({ useHandCursor: false }).setDepth(36);
      addH(ocHit);
      ocHit.on('pointerover', (ptr) =>
        _showTip(ptr.x, ptr.y, `${char.overclock.name}\n${char.overclock.description}`));
      ocHit.on('pointerout', () => _hideTip());
      const _ocP = { v: 0 };
      _persistTweens.push(scene.tweens.add({
        targets: _ocP, v: { from: 0, to: 1 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!ocLine.active) return;
          ocLine.setStyle({ fill: ocColor, stroke: ocColor, strokeThickness: _ocP.v * 1.5 });
        },
      }));
      curY += parseInt(rfs(16));
    }

    // ── HP 바 ────────────────────────────────────────────────
    const hpBarH = parseInt(rfs(18));
    const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol  = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    const hpBg   = scene.add.graphics();
    hpBg.fillStyle(0x030506, 0.9); hpBg.lineStyle(1, 0x2a1a08, 0.7);
    hpBg.strokeRect(colX, curY, colW, hpBarH);
    hpBg.fillRect(colX, curY, colW, hpBarH);
    const hpFg = scene.add.graphics();
    hpFg.fillStyle(hpCol, 1);
    hpFg.fillRect(colX + 1, curY + 1, Math.max(0, Math.round((colW - 2) * hpPct)), hpBarH - 2);
    add(hpBg); add(hpFg);
    add(scene.add.text(colX + colW / 2, curY + hpBarH / 2,
      `HP  ${char.currentHp} / ${char.maxHp}`, {
        fontSize: rfs(11), fill: '#d0b060', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    curY += hpBarH + parseInt(rfs(4));

    // ── Cog 바 ──────────────────────────────────────────────
    const cogBarH = parseInt(rfs(22));
    const cogBg   = scene.add.graphics();
    cogBg.fillStyle(0x060810, 0.9); cogBg.lineStyle(1, 0x4a2a10, 0.8);
    cogBg.strokeRect(colX, curY, colW, cogBarH);
    cogBg.fillRect(colX, curY, colW, cogBarH);
    add(cogBg);
    add(scene.add.text(colX + colW / 2, curY + cogBarH / 2,
      `◈  Cog  ${char.cog}  ◈`, {
        fontSize: rfs(13), fill: cogC.css, fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    curY += cogBarH + parseInt(rfs(6));

    // ── 스탯 블록 (TM_RightPanel._buildStats 구조 이식) ─────
    const ocKey = char.overclock ? char.overclock.statKey : null;
    const ocHex = ocKey ? parseInt((char.overclock.color || '#ff4400').replace('#', '0x')) : null;
    const rowH  = parseInt(rfs(22));
    const STAT_DEFS = [
      { key:'hp',      label:'체력', tip: `체력\n${typeof getStatTooltip==='function' ? getStatTooltip('hp')      : ''}` },
      { key:'health',  label:'건강', tip: `건강\n${typeof getStatTooltip==='function' ? getStatTooltip('health')  : ''}` },
      { key:'attack',  label:'공격', tip: `공격\n${typeof getStatTooltip==='function' ? getStatTooltip('attack')  : ''}` },
      { key:'agility', label:'민첩', tip: `민첩\n${typeof getStatTooltip==='function' ? getStatTooltip('agility') : ''}` },
      { key:'luck',    label:'행운', tip: `행운\n${typeof getStatTooltip==='function' ? getStatTooltip('luck')    : ''}` },
    ];
    const statBH = STAT_DEFS.length * rowH + parseInt(rfs(2));

    const statBg = scene.add.graphics();
    statBg.fillStyle(0x060810, 0.85);
    if (ocKey) {
      [{pad:4,a:0.08},{pad:2,a:0.18},{pad:1,a:0.35}].forEach(({pad:p,a}) => {
        statBg.lineStyle(1, ocHex, a);
        statBg.strokeRect(colX-p, curY-p, colW+p*2, statBH+p*2);
      });
    }
    statBg.lineStyle(1, 0x2a1a08, 0.7);
    statBg.strokeRect(colX, curY, colW, statBH);
    statBg.fillRect(colX, curY, colW, statBH);
    add(statBg);

    const statStartY = curY + parseInt(rfs(1));

    STAT_DEFS.forEach(({ key, label, tip }, i) => {
      const sy   = statStartY + i * rowH;
      const midY = sy + rowH / 2;

      if (i > 0) {
        const sg = scene.add.graphics();
        sg.lineStyle(1, 0x1e1206, 0.4);
        sg.lineBetween(colX + 3, sy, colX + colW - 3, sy);
        add(sg);
      }

      const isOc    = ocKey === key;
      const statCol = SC[key] || '#c8bfb0';
      const effVal  = CharacterManager.getEffectiveStat
        ? CharacterManager.getEffectiveStat(char, key)
        : (char.stats?.[key] ?? 0);
      const baseVal = char.stats?.[key] ?? 0;
      const valStr  = isOc ? `${baseVal}→${effVal}` : `${effVal}`;

      // 오버클럭 행 글로우 배경
      if (isOc) {
        const gB = scene.add.graphics();
        const slices = 16, barW = colW - 2;
        for (let s = 0; s < slices; s++) {
          gB.fillStyle(ocHex, 0.22 - (0.20 * s / (slices - 1)));
          gB.fillRect(colX + 1 + s * (barW / slices), sy + 1,
            Math.ceil(barW / slices), rowH - 2);
        }
        gB.fillStyle(ocHex, 0.85);
        gB.fillRect(colX + 1, sy + 1, 2, rowH - 2);
        add(gB);
      }

      add(scene.add.text(colX + 6, midY, label, {
        fontSize: rfs(13),
        fill: isOc ? (char.overclock.color || '#ff4400') : statCol + 'cc',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));

      add(scene.add.text(colX + colW - 6, midY, valStr, {
        fontSize: rfs(isOc ? 12 : 15),
        fill: isOc ? (char.overclock.color || '#ff4400') : statCol,
        fontFamily: FontManager.MONO,
      }).setOrigin(1, 0.5));

      // 툴팁 히트
      const tipHit = scene.add.rectangle(colX + colW / 2, midY, colW, rowH, 0, 0)
        .setInteractive({ useHandCursor: false }).setDepth(36);
      addH(tipHit);
      tipHit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, tip));
      tipHit.on('pointerout',  () => _hideTip());
    });

    curY += statBH + parseInt(rfs(5));

    // ── 어빌리티 블록 (POSITION / PASSIVE / SKILL) ──────────
    const remainH  = (bodyY + bodyH) - curY - rpad;
    const abilH    = Math.max(parseInt(rfs(40)), Math.floor(remainH * 0.96));
    const abilItems = [
      {
        title: 'POSITION', name: char.position || '—', col: '#c8a060',
        tip: `${char.position || '포지션'}\n${typeof getPositionDescription==='function' ? getPositionDescription(char.position) : ''}`,
      },
      {
        title: 'PASSIVE', name: char.passive || '—', col: '#a0d080',
        tip: `${char.passive || '패시브'}\n${typeof getPassiveDescription==='function' ? getPassiveDescription(char.passive) : ''}`,
      },
      {
        title: 'SKILL', name: char.skill || '—', col: '#80b8e0',
        tip: `${char.skill || '스킬'}\n${typeof getSkillDescription==='function' ? getSkillDescription(char.skill) : ''}`,
      },
    ];
    const abilW = Math.floor(colW / abilItems.length);

    abilItems.forEach((item, ai) => {
      const ax = colX + ai * abilW;
      const aw = ai === abilItems.length - 1 ? colW - ai * abilW : abilW;

      const abg = scene.add.graphics();
      abg.fillStyle(0x060c1a, 0.9);
      abg.lineStyle(1, 0x2a1a08, 0.6);
      abg.strokeRect(ax, curY, aw - 1, abilH);
      abg.fillRect(ax, curY, aw - 1, abilH);
      add(abg);

      add(scene.add.text(ax + 4, curY + parseInt(rfs(4)), item.title, {
        fontSize: rfs(8), fill: '#3a2808', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0));

      const sg2 = scene.add.graphics();
      sg2.lineStyle(1, 0x1e1206, 0.5);
      sg2.lineBetween(ax + 3, curY + parseInt(rfs(15)), ax + aw - 4, curY + parseInt(rfs(15)));
      add(sg2);

      const nameY = curY + parseInt(rfs(15)) + (abilH - parseInt(rfs(15))) / 2;
      add(scene.add.text(ax + aw / 2, nameY, item.name, {
        fontSize: rfs(10), fill: item.col, fontFamily: FontManager.MONO,
        align: 'center', wordWrap: { width: aw - 8 },
      }).setOrigin(0.5));

      const abilHit = scene.add.rectangle(ax + aw / 2, curY + abilH / 2, aw, abilH, 0, 0)
        .setInteractive({ useHandCursor: false }).setDepth(36);
      addH(abilHit);
      abilHit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, item.tip));
      abilHit.on('pointerout',  () => _hideTip());
    });

    // 씬에 interactive 오브젝트 추가 (detailObjs 추적으로 cleanup됨)
    detailObjs.push(...[jobHit, ..._persistTweens]);
  };

  // ── 초기 선택 ────────────────────────────────────────────────
  buildCenter(partyChars[0]);
  buildDetail(partyChars[0]);
}
