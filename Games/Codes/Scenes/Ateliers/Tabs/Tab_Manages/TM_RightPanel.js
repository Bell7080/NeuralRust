// ================================================================
//  TM_RightPanel.js  (PATCHED)
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Manages/TM_RightPanel.js
//
//  역할: 우측 패널 — 이름/숙련도/직업/오버클럭/HP/Cog/스탯/어빌리티/회복
//
//  ✏️ PATCH 수정사항
//    1. 툴팁 박스 — 이름(제목) 폰트 크게·진하게 / 설명 폰트 더 크게·색 연하게
//                  좌측 정렬, 내용 양에 따라 박스 자동 크기 조절 (고정값 폰트)
//    2. 우측 패널 각 섹션 — 패널 전체 크기 비례 폰트/여백 확대
//       스탯 블록 / 어빌리티 블록 각 패널 영역에 꽉 차도록 배치
//    3. _buildStats 시그니처에 addHit 추가 (ReferenceError 수정 유지)
//    4. + 버튼 hover/out 글로우 이펙트 + depth 버그 수정
//       · plusBg/plusTxt → 씬 직접 배치 depth 18/19 (컨테이너 안에 있으면 글로우가 pH 뒤에 가려지는 버그)
//       · pointerover → 스탯 고유색 다층 글로우 + '+' 흰색
//       · pointerout  → 기본 상태 복원 ('+' 색 statCol 복원)
//       · pointerup   → _burst() 파티클 + 수치 갱신
//       · _burst 핵심 수정: fillCircle(0,0) + dot.setPosition(x,y)
//         (fillCircle(x,y)는 Graphics 로컬좌표에 그리고 tween은 position을 이동하므로
//          기준점 불일치 → 파티클이 엉뚱한 위치에서 날아가던 버그 수정)
//    5. SC 폴백 — 지정 STAT_COLORS 기준으로 통일
//       hp:#ff88bb / health:#88ddaa / attack:#ff3333 / agility:#55ccff / luck:#ddcc44
// ================================================================

const TM_RightPanel = {

  // ── 초기 우측 패널 배경만 ────────────────────────────────────
  buildRightPanel(tab, fs) {
    const { scene, H } = tab;
    const pm = tab._panelMargin || 0;
    tab._rightPanel = scene.add.container(0, 0);

    const rx  = tab._listW + tab._centerW;
    const rBg = scene.add.graphics();
    rBg.fillStyle(0x050810, 0.88);
    rBg.lineStyle(1, 0x2a1a08, 0.4);
    const panelH = tab._bodyH;
    rBg.strokeRect(rx + pm, tab._bodyY, tab._rightW - pm * 2, panelH);
    rBg.fillRect(rx + pm, tab._bodyY, tab._rightW - pm * 2, panelH);
    tab._rightPanel.add(rBg);
    tab._container.add(tab._rightPanel);
  },

  // ── 선택된 캐릭터 우측 디테일 ────────────────────────────────
  buildDetail(tab, char) {
    if (tab._rightDetailObjs) {
      tab._rightDetailObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    }
    if (tab._detailTweens) {
      tab._detailTweens.forEach(tw => { try { tw.stop(); tw.remove(); } catch(e){} });
    }
    tab._rightDetailObjs = [];
    tab._detailTweens    = [];

    const { scene, W, H } = tab;
    const fs   = n => FontManager.adjustedSize(n, scene.scale);
    const pm   = tab._panelMargin || 0;
    const rx   = tab._listW + tab._centerW + pm;
    const ry   = tab._bodyY;
    const rw   = tab._rightW - pm * 2;
    const rh   = tab._bodyH;

    // ✏️ 패널 크기 비례 패딩 (rw 기준)
    const rpad = Math.max(parseInt(fs(8)), Math.floor(rw * 0.04));
    const colX = rx + rpad, colW = rw - rpad * 2;
    let curY   = ry + rpad;

    const SC = (typeof CharacterManager !== 'undefined' && CharacterManager.STAT_COLORS)
      ? CharacterManager.STAT_COLORS
      : { hp:'#ff88bb', health:'#88ddaa', attack:'#ff3333', agility:'#55ccff', luck:'#ddcc44' };

    const addR   = (obj) => { tab._rightPanel.add(obj); tab._rightDetailObjs.push(obj); return obj; };
    const addHit = (obj) => { obj.setDepth(20); tab._rightDetailObjs.push(obj); return obj; };

    // ════════════════════════════════════════════════════════════
    //  ✏️ 툴팁 헬퍼 — 개선된 버전
    //    · 이름(제목): FontManager.adjustedSize(16) — 해상도 비례
    //    · 설명:       FontManager.adjustedSize(13) — 해상도 비례
    //    · 최대 너비:  W * 0.22           — 화면 폭 비례
    //    · 좌측 정렬, 내용량에 따라 박스 자동 크기 조절
    // ════════════════════════════════════════════════════════════
    const TIP_FS_TITLE = fs(16);              // 해상도 비례 (고정 18px 제거)
    const TIP_FS_DESC  = fs(13);              // 해상도 비례 (고정 15px 제거)
    const TIP_MAX_W    = Math.round(W * 0.22); // 화면 폭 비례 (고정 320px 제거)

    let _tip = null;
    const _showTip = (x, y, rawText) => {
      _hideTip();
      // rawText 파싱: 첫 줄 = 제목, 이후 = 설명
      const lines = rawText.split('\n');
      const titleLine = lines[0] || '';
      const descLines = lines.slice(1).join('\n').trim();

      const tpad  = 14;
      const tpadX = 16;

      // 제목 텍스트 객체 (임시 생성으로 너비 측정)
      const titleObj = scene.add.text(0, 0, titleLine, {
        fontSize: TIP_FS_TITLE,
        fill: '#e8d080',
        fontFamily: FontManager.MONO,
        fontStyle: 'bold',
        wordWrap: { width: TIP_MAX_W - tpadX * 2 },
      }).setDepth(502);

      const descObj = descLines ? scene.add.text(0, 0, descLines, {
        fontSize: TIP_FS_DESC,
        fill: '#b8a890',
        fontFamily: FontManager.MONO,
        wordWrap: { width: TIP_MAX_W - tpadX * 2 },
      }).setDepth(502) : null;

      const titleH = titleObj.height;
      const descH  = descObj ? descObj.height : 0;
      const sepH   = descLines ? 8 : 0;

      const bw = Math.min(
        TIP_MAX_W,
        Math.max(titleObj.width, descObj ? descObj.width : 0) + tpadX * 2
      );
      const bh = tpad + titleH + sepH + descH + tpad;

      let tx = x + 18, ty = y + 18;
      if (tx + bw > W - 10) tx = x - bw - 10;
      if (ty + bh > H - 10) ty = y - bh - 10;

      // 배경 박스
      const bgObj = addR(scene.add.graphics().setDepth(501));
      bgObj.fillStyle(0x0a0807, 0.98);
      bgObj.lineStyle(2, 0xb07828, 1);
      bgObj.strokeRect(tx, ty, bw, bh);
      bgObj.fillRect(tx, ty, bw, bh);
      bgObj.lineStyle(1, 0x3a2010, 0.5);
      bgObj.strokeRect(tx + 3, ty + 3, bw - 6, bh - 6);

      // 제목 구분선
      if (descLines) {
        bgObj.lineStyle(1, 0x5a3810, 0.6);
        bgObj.lineBetween(tx + tpadX, ty + tpad + titleH + 4, tx + bw - tpadX, ty + tpad + titleH + 4);
      }

      // 텍스트 배치 (좌측 정렬)
      titleObj.setPosition(tx + tpadX, ty + tpad);
      tab._rightDetailObjs.push(titleObj);

      if (descObj) {
        descObj.setPosition(tx + tpadX, ty + tpad + titleH + sepH);
        tab._rightDetailObjs.push(descObj);
      }

      _tip = { bg: bgObj, title: titleObj, desc: descObj };
    };

    const _moveTip = (x, y) => {
      if (!_tip) return;
      const { title, desc, bg } = _tip;
      const tpad = 14, tpadX = 16;
      const titleH = title.height;
      const descH  = desc ? desc.height : 0;
      const sepH   = desc ? 8 : 0;
      const bw = Math.min(
        TIP_MAX_W,
        Math.max(title.width, desc ? desc.width : 0) + tpadX * 2
      );
      const bh = tpad + titleH + sepH + descH + tpad;
      let tx = x + 18, ty = y + 18;
      if (tx + bw > W - 10) tx = x - bw - 10;
      if (ty + bh > H - 10) ty = y - bh - 10;
      bg.clear();
      bg.fillStyle(0x0a0807, 0.98);
      bg.lineStyle(2, 0xb07828, 1);
      bg.strokeRect(tx, ty, bw, bh);
      bg.fillRect(tx, ty, bw, bh);
      bg.lineStyle(1, 0x3a2010, 0.5);
      bg.strokeRect(tx + 3, ty + 3, bw - 6, bh - 6);
      if (desc) {
        bg.lineStyle(1, 0x5a3810, 0.6);
        bg.lineBetween(tx + tpadX, ty + tpad + titleH + 4, tx + bw - tpadX, ty + tpad + titleH + 4);
      }
      title.setPosition(tx + tpadX, ty + tpad);
      if (desc) desc.setPosition(tx + tpadX, ty + tpad + titleH + sepH);
    };

    const _hideTip = () => {
      if (_tip) {
        const rmv = (o) => {
          if (!o) return;
          try { o.destroy(); } catch(e) {}
          const i = tab._rightDetailObjs.indexOf(o);
          if (i !== -1) tab._rightDetailObjs.splice(i, 1);
        };
        rmv(_tip.bg);
        rmv(_tip.title);
        rmv(_tip.desc);
        _tip = null;
      }
    };

    const _persistTweens = [];

    const cogCol = (typeof CharacterManager !== 'undefined' && CharacterManager.getCogColor)
      ? CharacterManager.getCogColor(char.cog).css : '#c8a040';

    // ════════════════════════════════════════════════════════════
    //  ✏️ 폰트 크기 — 패널 폭(rw) 비례 스케일 보정
    //   rw가 클수록 폰트도 비례해서 커짐 (기준 rw=260 → 1.0배)
    // ════════════════════════════════════════════════════════════
    const RW_BASE = 260;
    const rScale  = Math.max(0.85, Math.min(1.6, rw / RW_BASE));
    const rfs = n => fs(Math.round(n * rScale));

    // ── 이름 ────────────────────────────────────────────────
    addR(scene.add.text(colX, curY, char.name, {
      fontSize: rfs(30), fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0));
    curY += parseInt(rfs(32));

    // ── 숙련도 ──────────────────────────────────────────────
    const masteryLv = char.mastery || 0;
    addR(scene.add.text(colX, curY, `숙련도  Lv.${masteryLv}`, {
      fontSize: rfs(14),
      fill: masteryLv > 0 ? '#b8a060' : '#5a4a28',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(rfs(18));

    // ── 직업 ────────────────────────────────────────────────
    const jobLbl = addR(scene.add.text(colX, curY, `직업  :  ${char.jobLabel}`, {
      fontSize: rfs(15), fill: '#c8802a', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    const jobHit = scene.add.rectangle(
      colX + jobLbl.width / 2, curY + parseInt(rfs(9)),
      jobLbl.width + 10, parseInt(rfs(20)), 0, 0
    ).setInteractive({ useHandCursor: false });
    jobHit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, `직업\n${getJobTooltip(char.job)}`));
    jobHit.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
    jobHit.on('pointerout',  () => _hideTip());
    addHit(jobHit);
    curY += parseInt(rfs(20));

    // ── 오버클럭 ────────────────────────────────────────────
    if (char.overclock) {
      const ocColor = char.overclock.color || '#ff4400';
      // ✅ label은 Data_Overclock.js 단일 소스에서 직접 사용 — 하드코딩 제거
      const ocLabel = char.overclock.label || char.overclock.name || '오버클럭';

      const ocLine = addR(scene.add.text(colX, curY, ocLabel, {
        fontSize: rfs(13), fill: ocColor, fontFamily: FontManager.MONO,
        stroke: ocColor, strokeThickness: 0,
      }).setOrigin(0, 0));

      const ocHitBox = scene.add.rectangle(
        colX + ocLine.width/2, curY + parseInt(rfs(7)),
        ocLine.width + 10, parseInt(rfs(18)), 0, 0
      ).setInteractive({ useHandCursor: false });
      ocHitBox.on('pointerover', (ptr) =>
        _showTip(ptr.x, ptr.y, `${char.overclock.name}\n${char.overclock.description}`));
      ocHitBox.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      ocHitBox.on('pointerout',  () => _hideTip());
      addHit(ocHitBox);

      const _ocPulse = { v: 0 };
      const _ocTw = scene.tweens.add({
        targets: _ocPulse, v: { from: 0, to: 1 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!ocLine.active) return;
          ocLine.setStyle({ fill: ocColor, stroke: ocColor, strokeThickness: _ocPulse.v * 1.5 });
        },
      });
      _persistTweens.push(_ocTw);
      curY += parseInt(rfs(18));
    }

    // ── HP 바 ──────────────────────────────────────────────
    const hpBarH = parseInt(rfs(22));
    const hpBarY = curY;
    const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol  = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    const hpBgG  = scene.add.graphics();
    hpBgG.fillStyle(0x030506, 0.9);
    hpBgG.lineStyle(1, 0x2a1a08, 0.7);
    hpBgG.strokeRect(colX, hpBarY, colW, hpBarH);
    hpBgG.fillRect(colX, hpBarY, colW, hpBarH);
    const hpFgG  = scene.add.graphics();
    hpFgG.fillStyle(hpCol, 1);
    hpFgG.fillRect(colX + 1, hpBarY + 1, Math.max(0, Math.round((colW - 2) * hpPct)), hpBarH - 2);
    addR(hpBgG);
    addR(hpFgG);
    const hpTxt = scene.add.text(colX + colW / 2, hpBarY + hpBarH / 2,
      `HP  ${char.currentHp} / ${char.maxHp}`, {
        fontSize: rfs(13), fill: '#d0b060', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
    addR(hpTxt);
    curY += hpBarH + parseInt(rfs(6));

    // hp 스탯 변경 시 바 비율·텍스트만 갱신 (틀 크기는 고정)
    const _refreshHpBar = () => {
      const pct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
      const col = pct > 0.6 ? 0x306030 : pct > 0.3 ? 0x806020 : 0x803020;
      hpFgG.clear();
      hpFgG.fillStyle(col, 1);
      hpFgG.fillRect(colX + 1, hpBarY + 1, Math.max(0, Math.round((colW - 2) * pct)), hpBarH - 2);
      hpTxt.setText(`HP  ${char.currentHp} / ${char.maxHp}`);
    };

    // ── Cog 바 ──────────────────────────────────────────────
    const cogBarH = parseInt(rfs(28));
    const cogBgG  = scene.add.graphics();
    cogBgG.fillStyle(0x060810, 0.9);
    cogBgG.lineStyle(1, 0x4a2a10, 0.8);
    cogBgG.strokeRect(colX, curY, colW, cogBarH);
    cogBgG.fillRect(colX, curY, colW, cogBarH);
    addR(cogBgG);
    addR(scene.add.text(colX + colW / 2, curY + cogBarH / 2,
      `◈  Cog  ${char.cog}  ◈`, {
        fontSize: rfs(16), fill: cogCol, fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    curY += cogBarH + parseInt(rfs(8));

    // ── 스탯 블록 ────────────────────────────────────────────
    curY = TM_RightPanel._buildStats(
      tab, char, addR, addHit, _showTip, _moveTip, _hideTip, _persistTweens,
      SC, fs, rfs, colX, colW, curY, ry, rh, rpad,
      _refreshHpBar
    );

    // ── 어빌리티 (스탯 아래 일렬) ───────────────────────────
    TM_RightPanel._buildAbilRow(
      tab, char, addR, addHit, _showTip, _moveTip, _hideTip, fs, rfs, colX, colW, curY, ry, rh, rpad
    );

    // ── 회복 버튼 ────────────────────────────────────────────
    const missing  = char.maxHp - char.currentHp;
    const healCost = Math.ceil(missing * 0.5);
    const btnH     = parseInt(rfs(34));
    const btnY     = ry + rh - btnH - rpad;
    if (missing > 0) {
      const hBg = scene.add.graphics();
      const dH  = (hover) => {
        hBg.clear();
        hBg.fillStyle(hover ? 0x0c1a0c : 0x060e06, 0.9);
        hBg.lineStyle(1, hover ? 0x4a8030 : 0x2a4018, 0.9);
        hBg.strokeRect(colX, btnY, colW, btnH);
        hBg.fillRect(colX, btnY, colW, btnH);
      };
      dH(false);
      const hTxt = scene.add.text(
        colX + colW / 2, btnY + btnH / 2,
        `회복  (${healCost} Arc)`, {
          fontSize: rfs(14), fill: '#6a9060', fontFamily: FontManager.MONO,
        }).setOrigin(0.5);

      const hHit = scene.add.rectangle(
        colX + colW / 2, btnY + btnH / 2, colW, btnH, 0, 0
      ).setInteractive({ useHandCursor: true });

      hHit.on('pointerover', () => dH(true));
      hHit.on('pointerout',  () => dH(false));
      hHit.on('pointerup',   () => tab._doHeal(char, healCost));

      addR(hBg);
      addR(hTxt);
      addHit(hHit);
    }

    tab._detailTweens = _persistTweens;
  },

  // ── 스탯 블록 ────────────────────────────────────────────────
  // ✏️ rfs(패널 비례 폰트) 추가
  _buildStats(tab, char, addR, addHit, _showTip, _moveTip, _hideTip, _persistTweens, SC, fs, rfs, colX, colW, curY, ry, rh, rpad, onHpChange) {
    const { scene } = tab;
    const pendingStats = char.pendingStats || 0;
    const ocKey  = char.overclock ? char.overclock.statKey : null;
    const ocHex  = ocKey ? parseInt((char.overclock.color || '#ff4400').replace('#', '0x')) : null;

    // ✏️ rowH 패널 비례
    const rowH  = parseInt(rfs(26));
    const plusW = parseInt(rfs(26));

    const STAT_DEFS = [
      { key:'hp',      label:'체력' },
      { key:'health',  label:'건강' },
      { key:'attack',  label:'공격' },
      { key:'agility', label:'민첩' },
      { key:'luck',    label:'행운' },
    ];

    const statBH  = STAT_DEFS.length * rowH + parseInt(rfs(3));
    const statBg  = scene.add.graphics();
    statBg.fillStyle(0x060810, 0.85);
    if (ocKey) {
      [{pad:5,a:0.08},{pad:3,a:0.18},{pad:1,a:0.35}].forEach(({pad:p,a}) => {
        statBg.lineStyle(1, ocHex, a);
        statBg.strokeRect(colX - p, curY - p, colW + p*2, statBH + p*2);
      });
    }
    statBg.lineStyle(1, 0x2a1a08, 0.7);
    statBg.strokeRect(colX, curY, colW, statBH);
    statBg.fillRect(colX, curY, colW, statBH);
    addR(statBg);

    const statStartY   = curY + parseInt(rfs(2));
    const _plusButtons = [];
    const _valTxts     = {};
    let _pendingTxt    = null;

    const _burst = (x, y, color) => {
      const hc   = parseInt(color.replace('#', '0x'));
      const rad  = parseInt(rfs(2.5));
      const dist = parseInt(rfs(16));
      for (let k = 0; k < 8; k++) {
        const angle = (Math.PI * 2 / 8) * k;
        // ✏️ fillCircle(0,0) + setPosition(x,y) — Graphics 로컬좌표 버그 수정
        //    fillCircle(x,y,...) 는 Graphics 내부 로컬에 그리고
        //    tween은 dot.x/y(position)를 움직이므로, 기준점을 (0,0)으로 맞춰야 함
        const dot = scene.add.graphics().setDepth(25).setPosition(x, y);
        dot.fillStyle(hc, 1);
        dot.fillCircle(0, 0, rad);
        tab._rightDetailObjs.push(dot);
        scene.tweens.add({
          targets:  dot,
          x:        x + Math.cos(angle) * dist,
          y:        y + Math.sin(angle) * dist,
          alpha:    0,
          scaleX:   0,
          scaleY:   0,
          duration: 320,
          ease:     'Cubic.easeOut',
          onComplete: () => {
            const idx = tab._rightDetailObjs.indexOf(dot);
            if (idx !== -1) tab._rightDetailObjs.splice(idx, 1);
            dot.destroy();
          },
        });
      }
    };

    STAT_DEFS.forEach(({ key, label }, i) => {
      const sy   = statStartY + i * rowH;
      const midY = sy + rowH / 2;

      if (i > 0) {
        const sg = scene.add.graphics();
        sg.lineStyle(1, 0x1e1206, 0.4);
        sg.lineBetween(colX + 3, sy, colX + colW - 3, sy);
        addR(sg);
      }

      const isOc    = ocKey === key;
      const statCol = SC[key] || '#c8bfb0';
      const effVal  = (typeof CharacterManager !== 'undefined')
        ? CharacterManager.getEffectiveStat(char, key)
        : (char.stats[key] || 0);

      // ✏️ 동적 툴팁 — 캐릭터 스탯 수치 포함
      const tip = (typeof getStatTooltipDynamic === 'function')
        ? getStatTooltipDynamic(key, effVal)
        : getStatTooltip(key);

      if (isOc) {
        const gB     = scene.add.graphics();
        const slices = 20;
        const barW   = colW - 2;
        for (let s = 0; s < slices; s++) {
          gB.fillStyle(ocHex, 0.25 - (0.23 * s / (slices - 1)));
          gB.fillRect(colX + 1 + s * (barW / slices), sy + 1, Math.ceil(barW / slices), rowH - 2);
        }
        gB.fillStyle(ocHex, 0.85);
        gB.fillRect(colX + 1, sy + 1, 2, rowH - 2);
        addR(gB);
      }

      // ✏️ 라벨·수치 폰트 rfs 비례
      const statT = scene.add.text(colX + 8, midY, label, {
        fontSize: rfs(15),
        fill: isOc ? (char.overclock.color || '#ff4400') : statCol + 'cc',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      // ✏️ 수치 표시 — 오버클럭 행은 base→effective 형식
      const baseVal = char.stats[key] || 0;
      const valStr  = isOc ? `${baseVal}→${effVal}` : `${effVal}`;

      const valT = scene.add.text(
        colX + colW - (pendingStats > 0 ? plusW + 8 : 8), midY,
        valStr, {
          fontSize: rfs(18),
          fill: isOc ? (char.overclock.color || '#ff4400') : statCol,
          fontFamily: FontManager.MONO,
        }).setOrigin(1, 0.5);

      _valTxts[key] = valT;
      addR(statT);
      addR(valT);

      // 툴팁 hit
      const tipH = scene.add.rectangle(
        colX + colW / 2, midY, colW - (pendingStats > 0 ? plusW : 0), rowH, 0, 0
      ).setInteractive({ useHandCursor: false });
      tipH.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, tip));
      tipH.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      tipH.on('pointerout',  () => _hideTip());
      addHit(tipH);

      // + 버튼 (pendingStats > 0 시)
      if (pendingStats > 0) {
        const btnX = colX + colW - plusW;

        // ── plusBg / plusTxt : 씬 직접 배치 + depth 맞춤 ──────────
        // ✏️ addR(컨테이너 depth≈10) 대신 씬에 직접 올려서
        //    pH(depth 20) 바로 아래에 렌더되도록 함.
        //    컨테이너 안에 넣으면 글로우가 pH 뒤에 가려져 보이지 않는 버그 수정.
        const plusBg  = scene.add.graphics().setDepth(18);
        const plusTxt = scene.add.text(btnX + (plusW - 1) / 2, midY, '+', {
          fontSize: rfs(16), fill: statCol, fontFamily: FontManager.MONO,
        }).setOrigin(0.5).setDepth(19);

        // 파괴 추적에만 등록 (컨테이너에는 넣지 않음)
        tab._rightDetailObjs.push(plusBg, plusTxt);

        // ── hover 상태 드로우 함수 ──────────────────────────────
        const _drawPlus = (hover) => {
          plusBg.clear();
          if (hover) {
            const hc = parseInt(statCol.replace('#', '0x'));
            [{pad:6,a:0.08},{pad:3,a:0.20},{pad:1,a:0.50}].forEach(({pad:p,a}) => {
              plusBg.lineStyle(1, hc, a);
              plusBg.strokeRect(btnX - p, sy + 1 - p, plusW - 1 + p * 2, rowH - 2 + p * 2);
            });
            plusBg.fillStyle(hc, 0.18);
            plusBg.fillRect(btnX, sy + 1, plusW - 1, rowH - 2);
            plusBg.lineStyle(1, hc, 0.9);
            plusBg.strokeRect(btnX, sy + 1, plusW - 1, rowH - 2);
          } else {
            plusBg.fillStyle(0x0a1a0a, 0.9);
            plusBg.lineStyle(1, 0x2a4a18, 0.8);
            plusBg.strokeRect(btnX, sy + 1, plusW - 1, rowH - 2);
            plusBg.fillRect(btnX, sy + 1, plusW - 1, rowH - 2);
          }
        };
        _drawPlus(false);

        // ── hit rectangle : depth 20 (pH가 plusTxt 위) ──────────
        const pH = scene.add.rectangle(btnX + (plusW - 1) / 2, midY, plusW, rowH, 0, 0)
          .setDepth(20).setInteractive({ useHandCursor: true });
        tab._rightDetailObjs.push(pH);

        // ── hover / out 이벤트 ──
        pH.on('pointerover', () => {
          _drawPlus(true);
          plusTxt.setStyle({ fill: '#ffffff' });
        });
        pH.on('pointerout', () => {
          _drawPlus(false);
          plusTxt.setStyle({ fill: statCol });
        });

        // ── 클릭: spendStat + burst + 수치 갱신 ──
        pH.on('pointerup', () => {
          const ok = (typeof CharacterManager !== 'undefined')
            ? CharacterManager.spendStat(char, key)
            : false;
          if (!ok) return;
          _burst(btnX + plusW / 2, midY, statCol); // ✏️ btnX(좌측끝) → 버튼 중앙
          const ne = (typeof CharacterManager !== 'undefined')
            ? CharacterManager.getEffectiveStat(char, key)
            : (char.stats[key] || 0);
          // ✏️ 수치 갱신도 base→effective 형식 유지
          if (char.overclock && char.overclock.statKey === key) {
            _valTxts[key].setText(`${char.stats[key]||0}→${ne}`);
          } else {
            _valTxts[key].setText(`${ne}`);
          }
          if (_pendingTxt) _pendingTxt.setText(`잔여  +${char.pendingStats || 0}`);
          // hp 스탯이면 HP 바 실시간 갱신
          if (key === 'hp' && typeof onHpChange === 'function') onHpChange();
          if ((char.pendingStats || 0) <= 0) {
            _plusButtons.forEach(({ bg, txt, hit }) => {
              bg.setVisible(false);
              txt.setVisible(false);
              hit.disableInteractive();
            });
            if (_pendingTxt) _pendingTxt.setVisible(false);
            // + 버튼 사라진 후 수치 텍스트 우측정렬 위치 실시간 보정
            Object.values(_valTxts).forEach(vt => {
              if (vt && vt.active) vt.setX(colX + colW - 8);
            });
          }
        });

        _plusButtons.push({ bg: plusBg, txt: plusTxt, hit: pH });
      }
    });

    curY += statBH + parseInt(rfs(3));

    if (pendingStats > 0) {
      const pendH  = parseInt(rfs(18));
      const pendBg = scene.add.graphics();
      pendBg.fillStyle(0x060810, 0.85);
      pendBg.lineStyle(1, 0x2a1a08, 0.5);
      pendBg.strokeRect(colX, curY, colW, pendH);
      pendBg.fillRect(colX, curY, colW, pendH);
      addR(pendBg);
      addR(scene.add.text(colX + 8, curY + pendH / 2, '배분 가능', {
        fontSize: rfs(12), fill: '#7a6040', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));
      _pendingTxt = scene.add.text(colX + colW - 8, curY + pendH / 2,
        `잔여  +${pendingStats}`, {
          fontSize: rfs(13), fill: '#f0d060', fontFamily: FontManager.MONO,
        }).setOrigin(1, 0.5);
      addR(_pendingTxt);
      curY += pendH + parseInt(rfs(4));
    }

    return curY;
  },

  // ── 어빌리티 — 세로 목록 (패시브 / 일반행동 / 강화행동 / 피날레)
  // ✏️ 전면 교체: 가로 3칸 → 세로 4행
  //   각 행: [라벨]  [이름]  ← 마우스오버 시 상세 툴팁
  //   POSITION 필드 완전 제거 (v6 기준)
  _buildAbilRow(tab, char, addR, addHit, _showTip, _moveTip, _hideTip, fs, rfs, colX, colW, startY, ry, rh, rpad) {
    const { scene, W, H } = tab;

    // 회복 버튼 공간 제외한 잔여 높이
    const healReserve = parseInt(rfs(34)) + rpad * 2;
    const availH = (ry + rh) - startY - healReserve;

    // ── 능력 이름 조회 헬퍼 (AbilityIndex 우선) ─────────────────
    const _resolveAbilName = (type, id) => {
      if (!id || id === '—') return '—';
      if (typeof AbilityIndex !== 'undefined') {
        const n = AbilityIndex.getName(type, id);
        if (n && n !== id) return n;
      }
      return id;
    };

    // ── 능력 상세 툴팁 문자열 생성 ───────────────────────────────
    // 첫 줄: [유형 · 직업/공통] 이름
    // 이후:  설명 + 발동조건(enhanced)
    const _resolveAbilTip = (type, id) => {
      if (!id || id === '—') return '—\n정보 없음';
      let name = id, desc = '', extra = '';

      if (typeof AbilityIndex !== 'undefined') {
        const data = AbilityIndex.getData(type, id);
        if (data) {
          name  = data.name || id;
          desc  = data.description || '';
          const jobTag = data.job === 'common' ? '공통' : (data.job || '');
          const typeLabel = { passive:'패시브', action:'일반행동', enhanced:'강화행동', finale:'피날레' }[type] || type;
          const cogTag  = data.cogMin ? `Cog ${data.cogMin}+` : '';
          extra = [typeLabel, jobTag, cogTag].filter(Boolean).join('  ·  ');
          // enhanced는 발동조건 추가
          if (type === 'enhanced' && data.triggerType) {
            const trigMap = {
              attack_count: `공격 ${data.triggerValue}회마다`,
              on_hit:       '피격 시',
              hp_below:     `HP ${data.triggerValue}% 이하 시`,
              kill:         '적 처치 시',
            };
            const cond = trigMap[data.triggerType] || data.triggerType;
            extra += `\n발동: ${cond}`;
          }
          // finale는 게이지 수치 표시
          if (type === 'finale' && data.gaugeRequired) {
            extra += `\n필요 게이지: ${data.gaugeRequired}`;
          }
        }
      }

      const lines = [name];
      if (extra) lines.push(extra);
      if (desc)  lines.push(desc);
      return lines.join('\n');
    };

    // ── 세로 목록 정의 (4행) ──────────────────────────────────────
    const abilRows = [
      {
        label:  'PASSIVE',
        labelColor: '#a0d080',
        id:     char.passive,
        type:   'passive',
        name:   _resolveAbilName('passive', char.passive),
      },
      {
        label:  'ACTION',
        labelColor: '#c8a060',
        id:     char.action,
        type:   'action',
        name:   _resolveAbilName('action', char.action),
      },
      {
        label:  'ENHANCED',
        labelColor: '#80b8e0',
        id:     char.enhanced,
        type:   'enhanced',
        name:   _resolveAbilName('enhanced', char.enhanced),
      },
      {
        label:  'FINALE',
        labelColor: '#ff88aa',
        id:     char.finale,
        type:   'finale',
        name:   (() => {
          const n = _resolveAbilName('finale', char.finale);
          const g = (typeof AbilityIndex !== 'undefined' && char.finale)
            ? AbilityIndex.getGauge(char.finale) : null;
          return n + (g ? `  (${g})` : '');
        })(),
      },
    ];

    const rowCount  = abilRows.length;
    const rowH      = Math.max(parseInt(rfs(20)), Math.floor(availH / rowCount));
    const labelW    = Math.round(colW * 0.32);   // 라벨 열 너비
    const nameW     = colW - labelW;             // 이름 열 너비
    const innerPadX = parseInt(rfs(5));
    const innerPadY = Math.round(rowH * 0.5);

    abilRows.forEach((row, idx) => {
      const rowY = startY + idx * rowH;
      const midY = rowY + rowH / 2;

      // 행 배경
      const rowBg = scene.add.graphics();
      rowBg.fillStyle(0x060810, idx % 2 === 0 ? 0.85 : 0.70);
      rowBg.lineStyle(1, 0x1e1a08, 0.5);
      if (idx === 0) {
        rowBg.strokeRect(colX, rowY, colW, rowH);
        rowBg.fillRect(colX, rowY, colW, rowH);
      } else {
        // 위쪽 선만 생략(이전 행 하단선과 겹치므로)
        rowBg.fillRect(colX, rowY, colW, rowH);
        rowBg.lineBetween(colX, rowY + rowH, colX + colW, rowY + rowH);
        rowBg.lineBetween(colX, rowY, colX, rowY + rowH);
        rowBg.lineBetween(colX + colW, rowY, colX + colW, rowY + rowH);
      }
      addR(rowBg);

      // 라벨 (좌측 고정폭)
      const labelTxt = scene.add.text(
        colX + innerPadX, midY, row.label, {
        fontSize:   rfs(9),
        fill:       row.labelColor,
        fontFamily: FontManager.MONO,
        letterSpacing: 1,
      }).setOrigin(0, 0.5);
      addR(labelTxt);

      // 세로 구분선
      const divLine = scene.add.graphics();
      divLine.lineStyle(1, 0x2a1a08, 0.7);
      divLine.lineBetween(colX + labelW, rowY + 3, colX + labelW, rowY + rowH - 3);
      addR(divLine);

      // 능력 이름 (우측)
      const nameTxt = scene.add.text(
        colX + labelW + innerPadX, midY, row.name, {
        fontSize:   rfs(11),
        fill:       '#c8bfb0',
        fontFamily: FontManager.TITLE,
        wordWrap:   { width: nameW - innerPadX * 2 },
      }).setOrigin(0, 0.5);
      addR(nameTxt);

      // 툴팁 hit — 전체 행
      const tipText = _resolveAbilTip(row.type, row.id);
      const hitBox  = scene.add.rectangle(
        colX + colW / 2, midY, colW, rowH, 0, 0
      ).setInteractive({ useHandCursor: false }).setDepth(20);
      hitBox.on('pointerover', (ptr) => {
        rowBg.clear();
        rowBg.fillStyle(0x0e1820, 1);
        rowBg.lineStyle(1, parseInt(row.labelColor.replace('#','0x')), 0.5);
        rowBg.strokeRect(colX, rowY, colW, rowH);
        rowBg.fillRect(colX, rowY, colW, rowH);
        nameTxt.setStyle({ fill: row.labelColor });
        _showTip(ptr.x, ptr.y, tipText);
      });
      hitBox.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      hitBox.on('pointerout',  () => {
        rowBg.clear();
        rowBg.fillStyle(0x060810, idx % 2 === 0 ? 0.85 : 0.70);
        rowBg.lineStyle(1, 0x1e1a08, 0.5);
        rowBg.strokeRect(colX, rowY, colW, rowH);
        rowBg.fillRect(colX, rowY, colW, rowH);
        nameTxt.setStyle({ fill: '#c8bfb0' });
        _hideTip();
      });
      tab._rightDetailObjs.push(hitBox);
    });
  },
};
