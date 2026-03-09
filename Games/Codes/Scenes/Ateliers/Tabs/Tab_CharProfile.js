// ================================================================
//  Tab_CharProfile.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_CharProfile.js
//
//  역할: 캐릭터 프로필 팝업 — 공용 모듈
//
//  ✏️ v2 수정사항
//    · 어빌리티 3분리 반영: POSITION / PASSIVE / SKILL 3개 박스
//    · 오버클럭 표시: Cog 등급 바 우측에 오버클럭 뱃지
//    · getPositionDescription() 참조 (PositionData.js)
//    · getPassiveDescription()  참조 (PassiveData.js — 신규 내용)
//    · getSkillDescription()    참조 (SkillData.js)
//
//  사용법:
//    CharProfile.open(scene, W, H, char, {
//      onClose:   () => {},
//      onHeal:    (char, cost) => {},
//      extraBtns: [{ label: '...', danger: true, onClick: () => {} }],
//    });
//
//  의존: FontManager, scaledFontSize (utils.js)
//        PositionData.js, PassiveData.js, SkillData.js
// ================================================================

const CharProfile = {

  open(scene, W, H, char, opts = {}) {
    const { onClose, onHeal, extraBtns = [] } = opts;

    const pw = W * 0.52;
    const ph = H * 0.86;   // 어빌리티 3개로 늘어나서 높이 약간 확장
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;
    const fs = n => scaledFontSize(n, scene.scale);

    const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55)
      .setOrigin(0).setDepth(400).setInteractive();
    overlay.on('pointerup', () => _close());

    const g = scene.add.container(0, 0).setDepth(401);

    // ── 팝업 배경 ────────────────────────────────────────────────
    const popBg = scene.add.graphics();
    popBg.fillStyle(0x0a0806, 0.99);
    popBg.lineStyle(1, 0x6a3a10, 0.9);
    popBg.strokeRect(px, py, pw, ph);
    popBg.fillRect(px, py, pw, ph);
    popBg.lineStyle(1, 0x8a5020, 0.7);
    const csDec = 10;
    [[px+4,py+4,1,1],[px+pw-4,py+4,-1,1],[px+4,py+ph-4,1,-1],[px+pw-4,py+ph-4,-1,-1]]
      .forEach(([ox, oy, sx, sy]) => {
        popBg.lineBetween(ox, oy, ox + csDec * sx, oy);
        popBg.lineBetween(ox, oy, ox, oy + csDec * sy);
      });
    g.add(popBg);

    // ── 레이아웃 상수 ────────────────────────────────────────────
    const pad    = pw * 0.04;
    const topY   = py + pad;
    const btnH2  = parseInt(fs(26));
    const btnY2  = py + ph - btnH2 - parseInt(fs(10));
    const bodyH  = btnY2 - topY - parseInt(fs(6));

    const topAreaH   = bodyH * 0.33;
    const topAreaBot = topY + topAreaH;
    const botAreaY   = topAreaBot + parseInt(fs(8));
    const botAreaH   = btnY2 - botAreaY - parseInt(fs(4));

    const sepH = scene.add.graphics();
    sepH.lineStyle(1, 0x3a2010, 0.6);
    sepH.lineBetween(px + pad * 0.5, topAreaBot + parseInt(fs(4)),
                     px + pw - pad * 0.5, topAreaBot + parseInt(fs(4)));
    g.add(sepH);

    // ════════════════════════════════════════════════════════════
    //  상단 좌: 일러스트
    // ════════════════════════════════════════════════════════════
    const portW  = pw * 0.36;
    const portH2 = topAreaH;
    const portX  = px + pad;
    const portY2 = topY;

    const portBox = scene.add.graphics();
    portBox.fillStyle(0x1e1810, 0.95);
    portBox.lineStyle(1, 0x5a3a18, 0.7);
    portBox.strokeRect(portX, portY2, portW, portH2);
    portBox.fillRect(portX, portY2, portW, portH2);
    g.add(portBox);

    const JOB_SHORT = { fisher: 'FISH', diver: 'DIVE', ai: 'A·I' };
    let portIcon;
    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img = scene.add.image(portX + portW / 2, portY2 + portH2 / 2, char.spriteKey)
        .setOrigin(0.5);
      const scale = Math.min(portW * 0.90 / img.width, portH2 * 0.90 / img.height);
      img.setScale(scale);
      portIcon = img;
    } else {
      portIcon = scene.add.text(portX + portW / 2, portY2 + portH2 / 2,
        JOB_SHORT[char.job] || '???', {
        fontSize: fs(16), fill: '#2a3a44', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
    }
    g.add(portIcon);

    // ════════════════════════════════════════════════════════════
    //  상단 우: 이름 / 나이 / 직업 / HP
    // ════════════════════════════════════════════════════════════
    const infoX = portX + portW + pad * 0.8;
    const infoW = px + pw - pad - infoX;
    let   infoY = topY;

    // 툴팁
    let _tooltip = null;
    const _showTip = (x, y, text) => {
      _hideTip();
      const tpad = 12, maxW = parseInt(fs(220));
      const txtObj = scene.add.text(0, 0, text, {
        fontSize: fs(13), fill: '#f0e0b0', fontFamily: FontManager.MONO,
        wordWrap: { width: maxW },
      }).setDepth(502);
      const bw = txtObj.width + tpad * 2;
      const bh = txtObj.height + tpad * 2;
      let tx = x + 18, ty = y + 18;
      if (tx + bw > W - 10) tx = x - bw - 10;
      if (ty + bh > H - 10) ty = y - bh - 10;
      const bgObj = scene.add.graphics().setDepth(501);
      bgObj.fillStyle(0x0d0b07, 0.97);
      bgObj.lineStyle(2, 0x9a6020, 1);
      bgObj.strokeRect(tx, ty, bw, bh);
      bgObj.fillRect(tx, ty, bw, bh);
      bgObj.lineStyle(1, 0x3a2010, 0.5);
      bgObj.strokeRect(tx+3, ty+3, bw-6, bh-6);
      txtObj.setPosition(tx + tpad, ty + tpad);
      _tooltip = { bg: bgObj, txt: txtObj };
    };
    const _moveTip = (x, y) => {
      if (!_tooltip) return;
      const { txt, bg } = _tooltip;
      const tpad = 12;
      const bw = txt.width + tpad * 2, bh = txt.height + tpad * 2;
      let tx = x + 18, ty = y + 18;
      if (tx + bw > W - 10) tx = x - bw - 10;
      if (ty + bh > H - 10) ty = y - bh - 10;
      bg.clear();
      bg.fillStyle(0x0d0b07, 0.97);
      bg.lineStyle(2, 0x9a6020, 1);
      bg.strokeRect(tx, ty, bw, bh);
      bg.fillRect(tx, ty, bw, bh);
      bg.lineStyle(1, 0x3a2010, 0.5);
      bg.strokeRect(tx+3, ty+3, bw-6, bh-6);
      txt.setPosition(tx + tpad, ty + tpad);
    };
    const _hideTip = () => {
      if (_tooltip) { _tooltip.bg.destroy(); _tooltip.txt.destroy(); _tooltip = null; }
    };

    g.add(scene.add.text(infoX, infoY, char.name, {
      fontSize: fs(26), fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0));
    infoY += parseInt(fs(32));

    g.add(scene.add.text(infoX, infoY, `나이  ${char.age}세`, {
      fontSize: fs(13), fill: '#7a5828', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    infoY += parseInt(fs(18));

    const JOB_TIPS = {
      fisher: (typeof getJobDescription === 'function') ? getJobDescription('fisher') : '',
      diver:  (typeof getJobDescription === 'function') ? getJobDescription('diver')  : '',
      ai:     (typeof getJobDescription === 'function') ? getJobDescription('ai')     : '',
    };
    const jobLbl = scene.add.text(infoX, infoY, `직업  :  ${char.jobLabel}`, {
      fontSize: fs(14), fill: '#c8802a', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    const jobHit = scene.add.rectangle(
      infoX, infoY + parseInt(fs(9)), jobLbl.width, parseInt(fs(18)), 0, 0
    ).setInteractive({ useHandCursor: false }).setOrigin(0, 0.5).setDepth(402);
    jobHit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, JOB_TIPS[char.job] || char.jobLabel));
    jobHit.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
    jobHit.on('pointerout',  ()    => _hideTip());
    g.add([jobLbl, jobHit]);
    infoY += parseInt(fs(20));

    const hpBarH  = parseInt(fs(18));
    const hpBarY2 = topAreaBot - hpBarH - parseInt(fs(4));
    const hpBarW  = infoW;
    const hpPct   = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol   = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    const hpBg    = scene.add.graphics();
    hpBg.fillStyle(0x050404, 0.9);
    hpBg.lineStyle(1, 0x2a1a08, 0.7);
    hpBg.strokeRect(infoX, hpBarY2, hpBarW, hpBarH);
    hpBg.fillRect(infoX, hpBarY2, hpBarW, hpBarH);
    const hpFg = scene.add.graphics();
    hpFg.fillStyle(hpCol, 1);
    hpFg.fillRect(infoX + 1, hpBarY2 + 1, Math.max(0, Math.round((hpBarW - 2) * hpPct)), hpBarH - 2);
    const hpTxt = scene.add.text(infoX + hpBarW / 2, hpBarY2 + hpBarH / 2,
      `HP  ${char.currentHp} / ${char.maxHp}`, {
      fontSize: fs(10), fill: '#d0b060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    g.add([hpBg, hpFg, hpTxt]);

    // ════════════════════════════════════════════════════════════
    //  하단: Cog / 스탯 / POSITION / PASSIVE / SKILL
    // ════════════════════════════════════════════════════════════
    const bodyX = px + pad;
    const bodyW = pw - pad * 2;
    let   curY  = botAreaY;

    // ── Cog 등급 바 + 오버클럭 뱃지 ─────────────────────────────
    const cogBarH = parseInt(fs(24));
    const cogBg   = scene.add.graphics();
    cogBg.fillStyle(0x0e0b07, 1);
    cogBg.lineStyle(1, 0x4a2a10, 0.8);
    cogBg.strokeRect(bodyX, curY, bodyW, cogBarH);
    cogBg.fillRect(bodyX, curY, bodyW, cogBarH);
    g.add(cogBg);

    // 오버클럭이 있으면 바 왼쪽에 뱃지, 없으면 중앙 Cog 텍스트만
    if (char.overclock) {
      // Cog 텍스트 (좌측)
      g.add(scene.add.text(bodyX + 8, curY + cogBarH / 2,
        `◈  Cog  ${char.cog}`, {
        fontSize: fs(12), fill: '#e8c040', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));

      // 오버클럭 뱃지 (우측)
      const ocColor = char.overclock.color || '#ff4400';
      const ocTxt = scene.add.text(bodyX + bodyW - 8, curY + cogBarH / 2,
        char.overclock.label || '⚡ 오버클럭', {
        fontSize: fs(10), fill: ocColor, fontFamily: FontManager.MONO,
      }).setOrigin(1, 0.5);
      // 뱃지 툴팁
      const ocHit = scene.add.rectangle(
        bodyX + bodyW - 8 - ocTxt.width / 2, curY + cogBarH / 2,
        ocTxt.width + 8, cogBarH, 0, 0
      ).setInteractive({ useHandCursor: false }).setDepth(402);
      ocHit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y,
        `${char.overclock.name}\n${char.overclock.description}`));
      ocHit.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      ocHit.on('pointerout',  () => _hideTip());
      g.add([ocTxt, ocHit]);
    } else {
      g.add(scene.add.text(bodyX + bodyW / 2, curY + cogBarH / 2,
        `◈  Cog  ${char.cog}  ◈`, {
        fontSize: fs(13), fill: '#e8c040', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    }
    curY += parseInt(fs(30));

    // ── 구분선 헬퍼 ──────────────────────────────────────────────
    const makeSep = (yy) => {
      const s = scene.add.graphics();
      s.lineStyle(1, 0x2a1a08, 0.8);
      s.lineBetween(bodyX, yy, bodyX + bodyW, yy);
      g.add(s);
    };

    // ── 스탯 블록 ────────────────────────────────────────────────
    g.add(scene.add.text(bodyX, curY, '[ 스  탯 ]', {
      fontSize: fs(10), fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(fs(14));

    const STAT_DEFS = [
      { key: '체력', val: char.stats.hp,      tip: '체력 — 최대 HP에 직접 영향. 높을수록 오래 버팁니다.' },
      { key: '건강', val: char.stats.health,  tip: '건강 — 상태이상 저항 및 자연 회복 속도에 영향.' },
      { key: '공격', val: char.stats.attack,  tip: '공격 — 기본 전투 피해량 계수. 무기 보정과 곱연산.' },
      { key: '민첩', val: char.stats.agility, tip: '민첩 — 행동 순서와 회피율에 영향. 높을수록 선공 확률 증가.' },
      { key: '행운', val: char.stats.luck,    tip: '행운 — 아이템 드롭, 크리티컬 확률, 이벤트 결과에 영향.' },
    ];

    // 오버클럭 보정된 스탯은 강조 표시
    const ocStatKey = char.overclock ? char.overclock.statKey : null;
    const ocKeyMap  = { hp: '체력', health: '건강', attack: '공격', agility: '민첩', luck: '행운' };

    const rowH   = parseInt(fs(18));
    const statBH = STAT_DEFS.length * rowH + parseInt(fs(4));
    const statBg = scene.add.graphics();
    statBg.fillStyle(0x0e0b07, 1);
    statBg.lineStyle(1, 0x2a1a08, 0.7);
    statBg.strokeRect(bodyX, curY, bodyW, statBH);
    statBg.fillRect(bodyX, curY, bodyW, statBH);
    g.add(statBg);
    const statStartY = curY + parseInt(fs(2));

    STAT_DEFS.forEach(({ key, val, tip }, i) => {
      const sy   = statStartY + i * rowH;
      const midY = sy + rowH / 2;
      if (i > 0) {
        const sepG = scene.add.graphics();
        sepG.lineStyle(1, 0x1e1206, 0.5);
        sepG.lineBetween(bodyX + 4, sy, bodyX + bodyW - 4, sy);
        g.add(sepG);
      }
      // 오버클럭 스탯이면 강조색
      const isOcStat = ocStatKey && ocKeyMap[ocStatKey] === key;
      const statT = scene.add.text(bodyX + 10, midY, key, {
        fontSize: fs(12),
        fill: isOcStat ? (char.overclock.color || '#ff4400') : '#7a5830',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);
      const valLabel = isOcStat ? `${val}  ⚡` : `${val}`;
      const valT = scene.add.text(bodyX + bodyW - 10, midY, valLabel, {
        fontSize: fs(14),
        fill: isOcStat ? (char.overclock.color || '#ff4400') : '#e8c060',
        fontFamily: FontManager.MONO,
      }).setOrigin(1, 0.5);
      const statHit = scene.add.rectangle(
        bodyX + bodyW / 2, midY, bodyW, rowH, 0, 0
      ).setInteractive({ useHandCursor: false }).setDepth(402);
      const tipText = isOcStat ? `${tip}\n\n${char.overclock.name}: ${char.overclock.description}` : tip;
      statHit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, tipText));
      statHit.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      statHit.on('pointerout',  ()    => _hideTip());
      g.add([statT, valT, statHit]);
    });
    curY += statBH + parseInt(fs(7));

    makeSep(curY);
    curY += parseInt(fs(5));

    // ── 어빌리티 박스 공통 헬퍼 ─────────────────────────────────
    // titleStr  : 상단 레이블 (예: 'POSITION')
    // nameStr   : 어빌리티 이름
    // descStr   : 설명 (툴팁 or 인라인)
    // yy        : 시작 Y
    // accentCol : 이름 텍스트 색상 (오버클럭 등 강조용)
    const makeAbilBox = (titleStr, nameStr, descStr, yy, accentCol) => {
      const nameH2  = parseInt(fs(16));
      const descH   = parseInt(fs(11));
      const innerPd = 8;
      const bh      = innerPd + parseInt(fs(10)) + 4 + nameH2 + descH + innerPd;

      const boxG = scene.add.graphics();
      boxG.fillStyle(0x0e0b07, 1);
      boxG.lineStyle(1, 0x3a2010, 0.7);
      boxG.strokeRect(bodyX, yy, bodyW, bh);
      boxG.fillRect(bodyX, yy, bodyW, bh);
      g.add(boxG);

      // 타이틀 레이블
      g.add(scene.add.text(bodyX + innerPd, yy + innerPd, titleStr, {
        fontSize: fs(8), fill: '#5a3818', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0));

      // 어빌리티 이름
      g.add(scene.add.text(bodyX + innerPd, yy + innerPd + parseInt(fs(10)) + 2, nameStr, {
        fontSize: fs(13), fill: accentCol || '#e8c060', fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0));

      // 설명 (인라인)
      g.add(scene.add.text(bodyX + innerPd,
        yy + innerPd + parseInt(fs(10)) + 2 + nameH2, descStr || '', {
        fontSize: fs(9), fill: '#7a5830', fontFamily: FontManager.MONO,
        wordWrap: { width: bodyW - innerPd * 2 },
      }).setOrigin(0, 0));

      return yy + bh + parseInt(fs(5));
    };

    // ── POSITION 박스 ────────────────────────────────────────────
    const posDesc = (typeof getPositionDescription === 'function')
      ? getPositionDescription(char.position)
      : (char.position || '');
    curY = makeAbilBox('POSITION', char.position || '—', posDesc, curY, '#c8a060');

    // ── PASSIVE 박스 ─────────────────────────────────────────────
    const pasDesc = (typeof getPassiveDescription === 'function')
      ? getPassiveDescription(char.passive)
      : (char.passive || '');
    curY = makeAbilBox('PASSIVE', char.passive || '—', pasDesc, curY, '#a0d080');

    // ── SKILL 박스 ───────────────────────────────────────────────
    const sklDesc = (typeof getSkillDescription === 'function')
      ? getSkillDescription(char.skill)
      : (char.skill || '');
    curY = makeAbilBox('SKILL', char.skill || '—', sklDesc, curY, '#80b0e0');

    // ── 하단 버튼 ────────────────────────────────────────────────
    const missing = char.maxHp - char.currentHp;
    const _drawBtnGfx = (gfx, x, y, w, h, danger, hover = false) => {
      gfx.clear();
      if (danger) {
        gfx.fillStyle(hover ? 0x241010 : 0x180a08, 1);
        gfx.lineStyle(1, hover ? 0x8a3020 : 0x4a2010, 0.9);
      } else {
        gfx.fillStyle(hover ? 0x102010 : 0x0a1208, 1);
        gfx.lineStyle(1, hover ? 0x4a8030 : 0x2a4018, 0.9);
      }
      gfx.strokeRect(x, y, w, h);
      gfx.fillRect(x, y, w, h);
    };

    const btns = [];
    if (onHeal && missing > 0) {
      const healCost = Math.ceil(missing * 0.5);
      btns.push({
        label:   `회복  (${healCost} Arc)`,
        danger:  false,
        onClick: () => { _close(); onHeal(char, healCost); },
      });
    }
    extraBtns.forEach(b => btns.push(b));
    btns.push({ label: '닫  기', danger: true, onClick: () => _close() });

    const btnCount  = btns.length;
    const gap2      = parseInt(fs(8));
    const totalBtnW = pw - pad * 2;
    const eachW     = (totalBtnW - gap2 * (btnCount - 1)) / btnCount;
    const btnStartX = px + pad;

    btns.forEach((b, i) => {
      const bx   = btnStartX + i * (eachW + gap2);
      const bg2  = scene.add.graphics();
      const txt2 = scene.add.text(bx + eachW / 2, btnY2 + btnH2 / 2, b.label, {
        fontSize: fs(9),
        fill: b.danger ? '#8a3820' : '#6a9060',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      const hit2 = scene.add.rectangle(bx + eachW / 2, btnY2 + btnH2 / 2, eachW, btnH2, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(402);
      _drawBtnGfx(bg2, bx, btnY2, eachW, btnH2, b.danger);
      hit2.on('pointerover', () => _drawBtnGfx(bg2, bx, btnY2, eachW, btnH2, b.danger, true));
      hit2.on('pointerout',  () => _drawBtnGfx(bg2, bx, btnY2, eachW, btnH2, b.danger, false));
      hit2.on('pointerup',   () => b.onClick());
      g.add([bg2, txt2, hit2]);
    });

    function _close() {
      _hideTip();
      overlay.destroy();
      g.destroy();
      if (onClose) onClose();
    }

    g.setAlpha(0);
    scene.tweens.add({ targets: g, alpha: 1, duration: 120, ease: 'Sine.easeOut' });
  },
};
