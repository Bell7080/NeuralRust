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
    const fs   = n => scaledFontSize(n, scene.scale);
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
      : { hp:'#ff88bb', health:'#ff4466', attack:'#ff3333', agility:'#55ccff', luck:'#88ff88' };

    const addR   = (obj) => { tab._rightPanel.add(obj); tab._rightDetailObjs.push(obj); return obj; };
    const addHit = (obj) => { obj.setDepth(20); tab._rightDetailObjs.push(obj); return obj; };

    // ════════════════════════════════════════════════════════════
    //  ✏️ 툴팁 헬퍼 — 개선된 버전
    //    · 이름(제목): 고정 fontSize 18, 진한 색
    //    · 설명: 고정 fontSize 15, 연한 색
    //    · 좌측 정렬, 내용량에 따라 박스 자동 크기 조절
    // ════════════════════════════════════════════════════════════
    const TIP_FS_TITLE = 18;  // 고정 폰트 크기 (제목)
    const TIP_FS_DESC  = 15;  // 고정 폰트 크기 (설명)
    const TIP_MAX_W    = 320; // 툴팁 최대 너비 (px)

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
        fontSize: `${TIP_FS_TITLE}px`,
        fill: '#e8d080',
        fontFamily: FontManager.MONO,
        fontStyle: 'bold',
        wordWrap: { width: TIP_MAX_W - tpadX * 2 },
      }).setDepth(502);

      const descObj = descLines ? scene.add.text(0, 0, descLines, {
        fontSize: `${TIP_FS_DESC}px`,
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
    const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol  = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    const hpBgG  = scene.add.graphics();
    hpBgG.fillStyle(0x030506, 0.9);
    hpBgG.lineStyle(1, 0x2a1a08, 0.7);
    hpBgG.strokeRect(colX, curY, colW, hpBarH);
    hpBgG.fillRect(colX, curY, colW, hpBarH);
    const hpFgG  = scene.add.graphics();
    hpFgG.fillStyle(hpCol, 1);
    hpFgG.fillRect(colX + 1, curY + 1, Math.max(0, Math.round((colW - 2) * hpPct)), hpBarH - 2);
    addR(hpBgG);
    addR(hpFgG);
    addR(scene.add.text(colX + colW / 2, curY + hpBarH / 2,
      `HP  ${char.currentHp} / ${char.maxHp}`, {
        fontSize: rfs(13), fill: '#d0b060', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    curY += hpBarH + parseInt(rfs(6));

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
      SC, fs, rfs, colX, colW, curY, ry, rh, rpad
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
  _buildStats(tab, char, addR, addHit, _showTip, _moveTip, _hideTip, _persistTweens, SC, fs, rfs, colX, colW, curY, ry, rh, rpad) {
    const { scene } = tab;
    const pendingStats = char.pendingStats || 0;
    const ocKey  = char.overclock ? char.overclock.statKey : null;
    const ocHex  = ocKey ? parseInt((char.overclock.color || '#ff4400').replace('#', '0x')) : null;

    // ✏️ rowH 패널 비례
    const rowH  = parseInt(rfs(26));
    const plusW = parseInt(rfs(26));

    const STAT_DEFS = [
      { key:'hp',      label:'체력', tip: `체력\n${getStatTooltip('hp')}`      },
      { key:'health',  label:'건강', tip: `건강\n${getStatTooltip('health')}`   },
      { key:'attack',  label:'공격', tip: `공격\n${getStatTooltip('attack')}`   },
      { key:'agility', label:'민첩', tip: `민첩\n${getStatTooltip('agility')}`  },
      { key:'luck',    label:'행운', tip: `행운\n${getStatTooltip('luck')}`     },
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
      const hc = parseInt(color.replace('#', '0x'));
      for (let k = 0; k < 8; k++) {
        const angle = (Math.PI * 2 / 8) * k;
        const dot   = scene.add.graphics();
        dot.fillStyle(hc, 1);
        dot.fillCircle(x, y, parseInt(rfs(2.5)));
        scene.tweens.add({
          targets: dot,
          x: x + Math.cos(angle) * parseInt(rfs(14)),
          y: y + Math.sin(angle) * parseInt(rfs(14)),
          alpha: 0, scaleX: 0, scaleY: 0,
          duration: 320, ease: 'Cubic.easeOut',
          onComplete: () => dot.destroy(),
        });
      }
    };

    STAT_DEFS.forEach(({ key, label, tip }, i) => {
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
        const plusBg = scene.add.graphics();
        plusBg.fillStyle(0x0a1a0a, 0.9);
        plusBg.lineStyle(1, 0x2a4a18, 0.8);
        plusBg.strokeRect(btnX, sy + 1, plusW - 1, rowH - 2);
        plusBg.fillRect(btnX, sy + 1, plusW - 1, rowH - 2);
        const plusTxt = scene.add.text(btnX + (plusW - 1) / 2, midY, '+', {
          fontSize: rfs(16), fill: '#6a9050', fontFamily: FontManager.MONO,
        }).setOrigin(0.5);
        const pH = scene.add.rectangle(btnX + (plusW - 1)/2, midY, plusW, rowH, 0, 0)
          .setInteractive({ useHandCursor: true });
        pH.on('pointerup', () => {
          const ok = (typeof CharacterManager !== 'undefined')
            ? CharacterManager.spendStat(char, key)
            : false;
          if (!ok) return;
          _burst(btnX, midY, statCol);
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
          if ((char.pendingStats || 0) <= 0) {
            _plusButtons.forEach(({ bg, txt, hit }) => {
              bg.setVisible(false);
              txt.setVisible(false);
              hit.disableInteractive();
            });
            if (_pendingTxt) _pendingTxt.setVisible(false);
          }
        });
        addR(plusBg);
        addR(plusTxt);
        addHit(pH);
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

  // ── 어빌리티 — 스탯 아래에 가로 일렬 배치 ──────────────────
  // ✏️ rfs 추가, 패널 잔여 높이에 꽉 차도록 배치
  _buildAbilRow(tab, char, addR, addHit, _showTip, _moveTip, _hideTip, fs, rfs, colX, colW, startY, ry, rh, rpad) {
    const { scene, W, H } = tab;

    // 남은 패널 높이 (회복 버튼 공간 제외)
    const healReserve = parseInt(rfs(34)) + rpad * 2;
    const availH = (ry + rh) - startY - healReserve;
    const abilH  = Math.max(parseInt(rfs(50)), Math.floor(availH * 0.95));

    const abilItems = [
      {
        title: 'POSITION',
        name: char.position || '—',
        // ✏️ 툴팁: 제목\n설명 형식
        tip: `${char.position || '포지션'}\n${
          (typeof getPositionDescription === 'function') ? getPositionDescription(char.position) : (char.position || '')
        }`,
        col: '#c8a060',
      },
      {
        title: 'PASSIVE',
        name: char.passive || '—',
        tip: `${char.passive || '패시브'}\n${
          (typeof getPassiveDescription === 'function') ? getPassiveDescription(char.passive) : (char.passive || '')
        }`,
        col: '#a0d080',
      },
      {
        title: 'SKILL',
        name: char.skill || '—',
        tip: `${char.skill || '스킬'}\n${
          (typeof getSkillDescription === 'function') ? getSkillDescription(char.skill) : (char.skill || '')
        }`,
        col: '#80b8e0',
      },
    ];

    const abilW = Math.floor(colW / abilItems.length);

    abilItems.forEach((item, ai) => {
      const ax = colX + ai * abilW;
      const aw = (ai === abilItems.length - 1) ? colW - ai * abilW : abilW;

      // 배경
      const abg = scene.add.graphics();
      abg.fillStyle(0x060c1a, 0.9);
      abg.lineStyle(1, 0x2a1a08, 0.6);
      abg.strokeRect(ax, startY, aw - 1, abilH);
      abg.fillRect(ax, startY, aw - 1, abilH);
      addR(abg);

      // 타이틀 라벨 (작게, 위쪽)
      addR(scene.add.text(ax + 5, startY + parseInt(rfs(5)), item.title, {
        fontSize: rfs(9), fill: '#3a2808', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0));

      // 구분선
      const sg = scene.add.graphics();
      sg.lineStyle(1, 0x1e1206, 0.5);
      sg.lineBetween(ax + 3, startY + parseInt(rfs(17)), ax + aw - 4, startY + parseInt(rfs(17)));
      addR(sg);

      // ✏️ 이름 텍스트 — 패널 크기 비례 폰트, 중앙 배치
      const nameFontSize = rfs(12);
      const nameY = startY + parseInt(rfs(17)) + (abilH - parseInt(rfs(17))) / 2;
      const nameT = scene.add.text(ax + aw / 2, nameY, item.name, {
        fontSize: nameFontSize,
        fill: item.col,
        fontFamily: FontManager.MONO,
        align: 'center',
        wordWrap: { width: aw - 10 },
      }).setOrigin(0.5);
      addR(nameT);

      // 툴팁 hit
      const hitBox = scene.add.rectangle(
        ax + aw / 2, startY + abilH / 2, aw, abilH, 0, 0
      ).setInteractive({ useHandCursor: false });
      hitBox.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, item.tip));
      hitBox.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      hitBox.on('pointerout',  () => _hideTip());
      addHit(hitBox);
    });
  },
};
