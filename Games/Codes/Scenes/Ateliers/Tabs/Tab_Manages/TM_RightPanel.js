// ================================================================
//  TM_RightPanel.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Manages/TM_RightPanel.js
//
//  역할: 우측 패널 — 이름/숙련도/직업/오버클럭/HP/Cog/스탯/스킬탭/회복
//        스킬탭(POSITION·PASSIVE·SKILL)은 스탯 아래에 일렬로 배치
//
//  ✏️ 버그 수정:
//    - hHit, tipHit, statHit, pH 의 setDepth(602/603) 전부 제거
//      → 컨테이너(_rightPanel) 자식 객체에 setDepth 적용 시 씬 depth 기준으로 동작하여
//         다른 UI(사이드버튼 등, depth 0)와 클릭 이벤트 충돌 → 버튼 클릭 불가 버그 발생
//      → depth 는 _container(Tab_Manage_Full) 레벨에서만 관리하도록 통일
//    - 툴팁 bgObj/txtObj 도 addR 로 _rightPanel 에 추가 → tab destroy 시 함께 제거됨
//    - _burst 파티클의 setDepth(603) 도 제거 (컨테이너가 충분히 위에 있으면 불필요)
// ================================================================

const TM_RightPanel = {

  // ── 초기 우측 패널 배경만 ────────────────────────────────────
  buildRightPanel(tab, fs) {
    const { scene, H } = tab;
    const pm = tab._panelMargin || 0;
    tab._rightPanel = scene.add.container(0, 0);

    const rx = tab._listW + tab._centerW;
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
    // 이전 디테일 파기
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
    const rpad = parseInt(fs(12));
    const colX = rx + rpad, colW = rw - rpad * 2;
    let curY   = ry + rpad;

    const SC = (typeof CharacterManager !== 'undefined' && CharacterManager.STAT_COLORS)
      ? CharacterManager.STAT_COLORS
      : { hp:'#ff88bb', health:'#ff4466', attack:'#ff3333', agility:'#55ccff', luck:'#88ff88' };

    // ✏️ addR: _rightPanel 컨테이너에 추가 + _rightDetailObjs에 추적
    //    → tab.destroy() 또는 _rightPanel.setVisible(false) 시 함께 제어
    const addR = (obj) => { tab._rightPanel.add(obj); tab._rightDetailObjs.push(obj); return obj; };

    // ── 툴팁 ────────────────────────────────────────────────
    let _tip = null;
    const _showTip = (x, y, text) => {
      _hideTip();
      const tpad = 10, maxW = parseInt(fs(200));
      // ✏️ 툴팁 텍스트/배경도 addR 로 컨테이너에 추가 → 탭 전환 시 잔존 방지
      const txtObj = addR(scene.add.text(0, 0, text, {
        fontSize: fs(11), fill: '#f0e0b0', fontFamily: FontManager.MONO, wordWrap: { width: maxW },
      }));
      const bw = txtObj.width + tpad * 2, bh = txtObj.height + tpad * 2;
      let tx = x + 16, ty = y + 16;
      if (tx + bw > W - 8) tx = x - bw - 8;
      if (ty + bh > H - 8) ty = y - bh - 8;
      const bgObj = addR(scene.add.graphics());
      bgObj.fillStyle(0x0d0b07, 0.97);
      bgObj.lineStyle(2, 0x9a6020, 1);
      bgObj.strokeRect(tx, ty, bw, bh);
      bgObj.fillRect(tx, ty, bw, bh);
      bgObj.lineStyle(1, 0x3a2010, 0.5);
      bgObj.strokeRect(tx + 3, ty + 3, bw - 6, bh - 6);
      txtObj.setPosition(tx + tpad, ty + tpad);
      _tip = { bg: bgObj, txt: txtObj };
    };
    const _moveTip = (x, y) => {
      if (!_tip) return;
      const { txt, bg } = _tip, tpad = 10;
      const bw = txt.width + tpad * 2, bh = txt.height + tpad * 2;
      let tx = x + 16, ty = y + 16;
      if (tx + bw > W - 8) tx = x - bw - 8;
      if (ty + bh > H - 8) ty = y - bh - 8;
      bg.clear();
      bg.fillStyle(0x0d0b07, 0.97);
      bg.lineStyle(2, 0x9a6020, 1);
      bg.strokeRect(tx, ty, bw, bh);
      bg.fillRect(tx, ty, bw, bh);
      bg.lineStyle(1, 0x3a2010, 0.5);
      bg.strokeRect(tx + 3, ty + 3, bw - 6, bh - 6);
      txt.setPosition(tx + tpad, ty + tpad);
    };
    const _hideTip = () => {
      if (_tip) {
        // _rightDetailObjs 에서도 제거
        const rmv = (o) => {
          try { o.destroy(); } catch(e) {}
          const i = tab._rightDetailObjs.indexOf(o);
          if (i !== -1) tab._rightDetailObjs.splice(i, 1);
        };
        rmv(_tip.bg);
        rmv(_tip.txt);
        _tip = null;
      }
    };

    const _persistTweens = [];

    const cogCol = (typeof CharacterManager !== 'undefined' && CharacterManager.getCogColor)
      ? CharacterManager.getCogColor(char.cog).css : '#c8a040';

    // ── 이름 ────────────────────────────────────────────────
    addR(scene.add.text(colX, curY, char.name, {
      fontSize: fs(22), fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0));
    curY += parseInt(fs(28));

    // ── 숙련도 ──────────────────────────────────────────────
    const masteryLv = char.mastery || 0;
    addR(scene.add.text(colX, curY, `숙련도  Lv.${masteryLv}`, {
      fontSize: fs(11),
      fill: masteryLv > 0 ? '#c8a060' : '#4a3018',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(fs(16));

    // ── 직업 ────────────────────────────────────────────────
    addR(scene.add.text(colX, curY, char.jobLabel || char.job, {
      fontSize: fs(11), fill: '#7a5030', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(fs(20));

    // ── 오버클럭 배너 ────────────────────────────────────────
    if (char.overclock) {
      const ocBanH = parseInt(fs(18));
      const ocBg   = scene.add.graphics();
      const ocHex  = parseInt((char.overclock.color || '#ff4400').replace('#', '0x'));
      ocBg.fillStyle(0x0c0608, 0.9);
      [{pad:4,a:0.06},{pad:2,a:0.14},{pad:1,a:0.28}].forEach(({pad:p,a})=>{
        ocBg.lineStyle(1, ocHex, a);
        ocBg.strokeRect(colX - p, curY - p, colW + p*2, ocBanH + p*2);
      });
      ocBg.lineStyle(1, ocHex, 0.7);
      ocBg.strokeRect(colX, curY, colW, ocBanH);
      ocBg.fillRect(colX, curY, colW, ocBanH);
      addR(ocBg);
      addR(scene.add.text(colX + colW / 2, curY + ocBanH / 2, char.overclock.label || '⚡ 오버클럭', {
        fontSize: fs(9), fill: char.overclock.color || '#ff4400', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
      curY += ocBanH + parseInt(fs(4));
    }

    // ── HP 바 ────────────────────────────────────────────────
    const hpBarH = parseInt(fs(20));
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
        fontSize: fs(9), fill: '#d0b060', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    curY += hpBarH + parseInt(fs(6));

    // ── Cog 바 ──────────────────────────────────────────────
    const cogBarH = parseInt(fs(20));
    const cogBgG  = scene.add.graphics();
    cogBgG.fillStyle(0x060810, 0.9);
    cogBgG.lineStyle(1, 0x4a2a10, 0.8);
    cogBgG.strokeRect(colX, curY, colW, cogBarH);
    cogBgG.fillRect(colX, curY, colW, cogBarH);
    addR(cogBgG);
    addR(scene.add.text(colX + colW / 2, curY + cogBarH / 2,
      `◈  Cog  ${char.cog}  ◈`, {
        fontSize: fs(11), fill: cogCol, fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    curY += cogBarH + parseInt(fs(8));

    // ── 스탯 블록 ────────────────────────────────────────────
    curY = TM_RightPanel._buildStats(
      tab, char, addR, _showTip, _moveTip, _hideTip, _persistTweens,
      SC, fs, colX, colW, curY, ry, rh, rpad
    );

    // ── 어빌리티 (스탯 아래 일렬) ───────────────────────────
    TM_RightPanel._buildAbilRow(
      tab, char, addR, _showTip, _moveTip, _hideTip, fs, colX, colW, curY
    );

    // ── 회복 버튼 ────────────────────────────────────────────
    const missing  = char.maxHp - char.currentHp;
    const healCost = Math.ceil(missing * 0.5);
    const btnH     = parseInt(fs(26));
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
          fontSize: fs(9), fill: '#6a9060', fontFamily: FontManager.MONO,
        }).setOrigin(0.5);

      // ✏️ setDepth(602) 제거 — _rightPanel 컨테이너에 addR 로 추가
      //    depth 는 Tab_Manage_Full._container 에서 관리
      const hHit = scene.add.rectangle(
        colX + colW / 2, btnY + btnH / 2, colW, btnH, 0, 0
      ).setInteractive({ useHandCursor: true });

      hHit.on('pointerover',  () => dH(true));
      hHit.on('pointerout',   () => dH(false));
      hHit.on('pointerup',    () => tab._doHeal(char, healCost));

      addR(hBg);
      addR(hTxt);
      addR(hHit);
    }

    tab._detailTweens = _persistTweens;
  },

  // ── 스탯 블록 ────────────────────────────────────────────────
  _buildStats(tab, char, addR, _showTip, _moveTip, _hideTip, _persistTweens, SC, fs, colX, colW, curY, ry, rh, rpad) {
    const { scene } = tab;
    const pendingStats = char.pendingStats || 0;
    const ocKey  = char.overclock ? char.overclock.statKey : null;
    const ocHex  = ocKey ? parseInt((char.overclock.color || '#ff4400').replace('#', '0x')) : null;
    const rowH   = parseInt(fs(19));
    const plusW  = parseInt(fs(19));

    const STAT_DEFS = [
      { key:'hp',      label:'체력', tip:'체력 — 최대 HP에 직접 영향.' },
      { key:'health',  label:'건강', tip:'건강 — 상태이상 저항 및 회복 속도.' },
      { key:'attack',  label:'공격', tip:'공격 — 기본 전투 피해량 계수.' },
      { key:'agility', label:'민첩', tip:'민첩 — 행동 순서와 회피율에 영향.' },
      { key:'luck',    label:'행운', tip:'행운 — 드롭, 크리티컬, 이벤트 결과.' },
    ];

    const statBH  = STAT_DEFS.length * rowH + parseInt(fs(3));
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

    const statStartY   = curY + parseInt(fs(2));
    const _plusButtons = [];
    const _valTxts     = {};
    let _pendingTxt    = null;

    // ✏️ _burst 파티클: setDepth(603) 제거 → 씬에 직접 추가 (단명 이펙트이므로 무관)
    const _burst = (x, y, color) => {
      const hc = parseInt(color.replace('#', '0x'));
      for (let k = 0; k < 8; k++) {
        const angle = (Math.PI * 2 / 8) * k;
        const dot   = scene.add.graphics();
        dot.fillStyle(hc, 1);
        dot.fillCircle(x, y, parseInt(fs(2.5)));
        scene.tweens.add({
          targets: dot,
          x: x + Math.cos(angle) * parseInt(fs(14)),
          y: y + Math.sin(angle) * parseInt(fs(14)),
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

      const statT  = scene.add.text(colX + 8, midY, label, {
        fontSize: fs(11), fill: isOc ? statCol : statCol + 'cc', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);
      const valStr = isOc ? `${char.stats[key]||0}→${effVal}` : `${effVal}`;
      const valT   = scene.add.text(
        pendingStats > 0 ? colX + colW - plusW - 14 : colX + colW - 8,
        midY, valStr, {
          fontSize: fs(isOc ? 10 : 13),
          fill: isOc ? (char.overclock.color || '#ff4400') : statCol,
          fontFamily: FontManager.MONO,
        }).setOrigin(1, 0.5);
      _valTxts[key] = valT;

      const tipText = isOc
        ? `${tip}\n\n[ ${char.overclock.name} ]\n${char.overclock.description}`
        : tip;

      // ✏️ setDepth(602) 제거 — _rightPanel 컨테이너 자식으로 addR
      const statHit = scene.add.rectangle(
        colX + colW / 2, midY,
        colW - (pendingStats > 0 ? plusW + 4 : 0), rowH,
        0, 0
      ).setInteractive({ useHandCursor: false });

      statHit.on('pointerover',  (ptr) => _showTip(ptr.x, ptr.y, tipText));
      statHit.on('pointermove',  (ptr) => _moveTip(ptr.x, ptr.y));
      statHit.on('pointerout',   ()    => _hideTip());

      addR(statT);
      addR(valT);
      addR(statHit);

      // ── + 버튼 ────────────────────────────────────────────
      const btnX   = colX + colW - plusW / 2 - 3;
      const plusBg = scene.add.graphics();
      const plusTxt = scene.add.text(btnX, midY, '+', {
        fontSize: fs(13), fill: statCol, fontFamily: FontManager.MONO,
      }).setOrigin(0.5);

      const _dP = (hover) => {
        plusBg.clear();
        if (hover) {
          const hc = parseInt(statCol.replace('#', '0x'));
          [{pad:5,a:0.08},{pad:3,a:0.20},{pad:1,a:0.50}].forEach(({pad:p,a}) => {
            plusBg.lineStyle(1, hc, a);
            plusBg.strokeRect(btnX - plusW/2 - p, midY - rowH/2 + 2 - p, plusW + p*2, rowH - 4 + p*2);
          });
          plusBg.fillStyle(hc, 0.18);
          plusBg.fillRect(btnX - plusW/2, midY - rowH/2 + 2, plusW, rowH - 4);
          plusBg.lineStyle(1, hc, 0.9);
          plusBg.strokeRect(btnX - plusW/2, midY - rowH/2 + 2, plusW, rowH - 4);
        } else {
          plusBg.fillStyle(0x0e0a06, 0.8);
          plusBg.lineStyle(1, 0x3a2010, 0.7);
          plusBg.fillRect(btnX - plusW/2, midY - rowH/2 + 2, plusW, rowH - 4);
          plusBg.strokeRect(btnX - plusW/2, midY - rowH/2 + 2, plusW, rowH - 4);
        }
      };

      const iv = pendingStats > 0;
      plusBg.setVisible(iv);
      plusTxt.setVisible(iv);
      _dP(false);

      // ✏️ setDepth(603) 제거 — addR 로 _rightPanel 컨테이너에 종속
      const pH = scene.add.rectangle(btnX, midY, plusW, rowH - 4, 0, 0);
      if (iv) pH.setInteractive({ useHandCursor: true });

      pH.on('pointerover',  () => { _dP(true);  plusTxt.setStyle({ fill: '#ffffff' }); });
      pH.on('pointerout',   () => { _dP(false); plusTxt.setStyle({ fill: statCol }); });
      pH.on('pointerdown',  () => {
        const ok = (typeof CharacterManager !== 'undefined')
          ? CharacterManager.spendStat(char, key)
          : false;
        if (!ok) return;
        _burst(btnX, midY, statCol);
        const ne = (typeof CharacterManager !== 'undefined')
          ? CharacterManager.getEffectiveStat(char, key)
          : (char.stats[key] || 0);
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
      addR(pH);
      _plusButtons.push({ bg: plusBg, txt: plusTxt, hit: pH });
    });

    curY += statBH + parseInt(fs(3));

    if (pendingStats > 0) {
      const pendH  = parseInt(fs(16));
      const pendBg = scene.add.graphics();
      pendBg.fillStyle(0x060810, 0.85);
      pendBg.lineStyle(1, 0x2a1a08, 0.5);
      pendBg.strokeRect(colX, curY, colW, pendH);
      pendBg.fillRect(colX, curY, colW, pendH);
      addR(pendBg);
      addR(scene.add.text(colX + 8, curY + pendH / 2, '배분 가능', {
        fontSize: fs(8), fill: '#7a6040', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));
      _pendingTxt = scene.add.text(colX + colW - 8, curY + pendH / 2,
        `잔여  +${pendingStats}`, {
          fontSize: fs(9), fill: '#f0d060', fontFamily: FontManager.MONO,
        }).setOrigin(1, 0.5);
      addR(_pendingTxt);
      curY += pendH + parseInt(fs(4));
    }

    return curY;
  },

  // ── 어빌리티 — 스탯 아래에 가로 일렬 배치 ──────────────────
  _buildAbilRow(tab, char, addR, _showTip, _moveTip, _hideTip, fs, colX, colW, startY) {
    const { scene, W, H } = tab;
    const abilItems = [
      {
        title: 'POSITION',
        name: char.position || '—',
        desc: (typeof getPositionDescription === 'function')
          ? getPositionDescription(char.position) : (char.position || ''),
        col: '#c8a060',
      },
      {
        title: 'PASSIVE',
        name: char.passive || '—',
        desc: (typeof getPassiveDescription === 'function')
          ? getPassiveDescription(char.passive) : (char.passive || ''),
        col: '#a0d080',
      },
      {
        title: 'SKILL',
        name: char.skill || '—',
        desc: (typeof getSkillDescription === 'function')
          ? getSkillDescription(char.skill) : (char.skill || ''),
        col: '#80b0e0',
      },
    ];

    const inner = parseInt(fs(7));
    const nameH = parseInt(fs(15));
    const descH = parseInt(fs(10));
    const boxH  = inner + parseInt(fs(9)) + 3 + nameH + descH + inner;
    const gap   = parseInt(fs(5));
    let curY    = startY + parseInt(fs(6));

    abilItems.forEach(({ title, name, desc, col }) => {
      const bG = scene.add.graphics();
      bG.fillStyle(0x060810, 0.75);
      bG.lineStyle(1, 0x2a1e10, 0.7);
      bG.strokeRect(colX, curY, colW, boxH);
      bG.fillRect(colX, curY, colW, boxH);
      addR(bG);

      addR(scene.add.text(colX + inner, curY + inner, title, {
        fontSize: fs(7), fill: '#5a3818', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0));

      addR(scene.add.text(colX + inner, curY + inner + parseInt(fs(9)) + 2, name, {
        fontSize: fs(12), fill: col, fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0));

      addR(scene.add.text(
        colX + inner, curY + inner + parseInt(fs(9)) + 2 + nameH,
        desc || '', {
          fontSize: fs(8), fill: '#7a5830', fontFamily: FontManager.MONO,
          wordWrap: { width: colW - inner * 2 },
        }).setOrigin(0, 0));

      // ✏️ tipHit setDepth(602) 제거 — addR 로 _rightPanel 컨테이너에 종속
      const tipHit = scene.add.rectangle(
        colX + colW / 2, curY + boxH / 2, colW, boxH, 0, 0
      ).setInteractive({ useHandCursor: false });

      tipHit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, `[ ${name} ]\n\n${desc}`));
      tipHit.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      tipHit.on('pointerout',  ()    => _hideTip());
      addR(tipHit);

      curY += boxH + gap;
    });
  },
};
