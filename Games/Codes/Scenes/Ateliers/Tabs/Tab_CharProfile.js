// ================================================================
//  Tab_CharProfile.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_CharProfile.js
//
//  역할: 캐릭터 프로필 팝업 — 공용 모듈
//
//  ✏️ 툴팁 연동
//    · 스탯 tip       → Data_Tooltips.js getStatTooltip()
//    · 직업 tip       → Data_Tooltips.js getJobTooltip()
//    · 포지션 desc    → Data_Tooltips.js getPositionTooltip()
//    · 패시브 desc    → Data_Tooltips.js getPassiveTooltip()
//    · 스킬 desc      → Data_Tooltips.js getSkillTooltip()
//
//  의존: FontManager, scaledFontSize (utils.js)
//        CharacterManager (STAT_COLORS, spendStat, getEffectiveStat)
//        Data_Tooltips.js
// ================================================================

const CharProfile = {

  open(scene, W, H, char, opts = {}) {
    const { onClose, onHeal, extraBtns = [] } = opts;

    const pw = W * 0.42;
    const ph = H * 0.68;
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;
    const fs = n => FontManager.adjustedSize(n, scene.scale);

    const SC = (typeof CharacterManager !== 'undefined' && CharacterManager.STAT_COLORS)
      ? CharacterManager.STAT_COLORS
      : { hp:'#ff88bb', health:'#ff4466', attack:'#ff3333', agility:'#55ccff', luck:'#88ff88' };

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
    // 코너 장식 (고정픽셀 10 → scaledFontSize 기반, drawCornerDeco 사용)
    const csDec = parseInt(fs(10));
    const cdPad = parseInt(fs(4));
    drawCornerDeco(popBg, px + cdPad, py + cdPad, pw - cdPad * 2, ph - cdPad * 2, csDec, 0x8a5020, 0.7);
    g.add(popBg);

    // ── 레이아웃 ─────────────────────────────────────────────────
    const pad      = pw * 0.04;
    const topY     = py + pad;
    const btnH2    = parseInt(fs(26));
    const btnY2    = py + ph - btnH2 - parseInt(fs(10));
    const bodyH    = btnY2 - topY - parseInt(fs(6));
    const topAreaH = bodyH * 0.30;
    const topAreaBot = topY + topAreaH;
    const botAreaY = topAreaBot + parseInt(fs(8));

    const sepLine = scene.add.graphics();
    sepLine.lineStyle(1, 0x3a2010, 0.6);
    sepLine.lineBetween(px+pad*0.5, topAreaBot+parseInt(fs(4)),
                        px+pw-pad*0.5, topAreaBot+parseInt(fs(4)));
    g.add(sepLine);

    // ════════════════════════════════════════════════════════════
    //  상단 좌: 일러스트
    // ════════════════════════════════════════════════════════════
    const portW = pw * 0.36;
    const portH = topAreaH;
    const portX = px + pad;
    const portY = topY;

    const portBox = scene.add.graphics();
    portBox.fillStyle(0x1e1810, 0.95);
    portBox.lineStyle(1, 0x5a3a18, 0.7);
    portBox.strokeRect(portX, portY, portW, portH);
    portBox.fillRect(portX, portY, portW, portH);
    g.add(portBox);

    const JOB_SHORT = { fisher:'FISH', diver:'DIVE', ai:'A·I' };
    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img   = scene.add.image(portX+portW/2, portY+portH/2, char.spriteKey).setOrigin(0.5);
      const scale = Math.min(portW*0.90/img.width, portH*0.90/img.height);
      img.setScale(scale);
      g.add(img);
    } else {
      g.add(scene.add.text(portX+portW/2, portY+portH/2,
        JOB_SHORT[char.job]||'???', {
        fontSize:fs(16), fill:'#2a3a44', fontFamily:FontManager.MONO,
      }).setOrigin(0.5));
    }

    const _persistTweens = [];

    // ════════════════════════════════════════════════════════════
    //  툴팁 헬퍼
    // ════════════════════════════════════════════════════════════
    let _tooltip = null;
    const _showTip = (x, y, text) => {
      _hideTip();
      const tpad = 12, maxW = parseInt(fs(220));
      const txtObj = scene.add.text(0, 0, text, {
        fontSize:fs(13), fill:'#f0e0b0', fontFamily:FontManager.MONO,
        wordWrap:{ width:maxW },
      }).setDepth(502);
      const bw = txtObj.width+tpad*2, bh = txtObj.height+tpad*2;
      let tx = x+18, ty = y+18;
      if (tx+bw > W-10) tx = x-bw-10;
      if (ty+bh > H-10) ty = y-bh-10;
      const bgObj = scene.add.graphics().setDepth(501);
      bgObj.fillStyle(0x0d0b07,0.97);
      bgObj.lineStyle(2,0x9a6020,1);
      bgObj.strokeRect(tx,ty,bw,bh);
      bgObj.fillRect(tx,ty,bw,bh);
      bgObj.lineStyle(1,0x3a2010,0.5);
      bgObj.strokeRect(tx+3,ty+3,bw-6,bh-6);
      txtObj.setPosition(tx+tpad, ty+tpad);
      _tooltip = { bg:bgObj, txt:txtObj };
    };
    const _moveTip = (x,y) => {
      if (!_tooltip) return;
      const {txt,bg} = _tooltip;
      const tpad=12, bw=txt.width+tpad*2, bh=txt.height+tpad*2;
      let tx=x+18, ty=y+18;
      if (tx+bw>W-10) tx=x-bw-10;
      if (ty+bh>H-10) ty=y-bh-10;
      bg.clear();
      bg.fillStyle(0x0d0b07,0.97); bg.lineStyle(2,0x9a6020,1);
      bg.strokeRect(tx,ty,bw,bh); bg.fillRect(tx,ty,bw,bh);
      bg.lineStyle(1,0x3a2010,0.5); bg.strokeRect(tx+3,ty+3,bw-6,bh-6);
      txt.setPosition(tx+tpad, ty+tpad);
    };
    const _hideTip = () => {
      if (_tooltip) { _tooltip.bg.destroy(); _tooltip.txt.destroy(); _tooltip=null; }
    };

    // ════════════════════════════════════════════════════════════
    //  상단 우: 이름 / 숙련도 / 직업 / 오버클럭 / HP바
    // ════════════════════════════════════════════════════════════
    const infoX = portX + portW + pad * 0.8;
    const infoW = px + pw - pad - infoX;
    let   infoY = topY;

    g.add(scene.add.text(infoX, infoY, char.name, {
      fontSize:fs(26), fill:'#e8c070', fontFamily:FontManager.TITLE,
    }).setOrigin(0,0));
    infoY += parseInt(fs(32));

    const masteryLv = char.mastery || 0;
    g.add(scene.add.text(infoX, infoY, `숙련도  Lv.${masteryLv}`, {
      fontSize: fs(13), fill: masteryLv > 0 ? '#b8a060' : '#5a4a28',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    infoY += parseInt(fs(18));

    // ✏️ 직업 툴팁 → Data_Tooltips.js getJobTooltip()
    const jobLbl = scene.add.text(infoX, infoY, `직업  :  ${char.jobLabel}`, {
      fontSize:fs(14), fill:'#c8802a', fontFamily:FontManager.MONO,
    }).setOrigin(0,0);
    const jobHit = scene.add.rectangle(
      infoX, infoY+parseInt(fs(9)), jobLbl.width, parseInt(fs(18)), 0, 0
    ).setInteractive({useHandCursor:false}).setOrigin(0,0.5).setDepth(402);
    jobHit.on('pointerover',(ptr)=>_showTip(ptr.x,ptr.y, getJobTooltip(char.job)));
    jobHit.on('pointermove',(ptr)=>_moveTip(ptr.x,ptr.y));
    jobHit.on('pointerout', ()=>_hideTip());
    g.add([jobLbl, jobHit]);
    infoY += parseInt(fs(20));

    // ── 오버클럭 ────────────────────────────────────────────────
    if (char.overclock) {
      const ocColor = char.overclock.color || '#ff4400';
      // ✅ label은 Data_Overclock.js 단일 소스에서 직접 사용 — 하드코딩 제거
      const ocLabel = char.overclock.label || char.overclock.name || '오버클럭';

      const ocLine = scene.add.text(infoX, infoY, ocLabel, {
        fontSize: fs(12), fill: ocColor, fontFamily: FontManager.MONO,
        stroke: ocColor, strokeThickness: 0,
      }).setOrigin(0, 0);
      g.add(ocLine);

      const ocHitBox = scene.add.rectangle(
        infoX + ocLine.width/2, infoY + parseInt(fs(7)),
        ocLine.width + 10, parseInt(fs(16)), 0, 0
      ).setInteractive({useHandCursor:false}).setDepth(402);
      ocHitBox.on('pointerover', (ptr) =>
        _showTip(ptr.x, ptr.y, `[ ${char.overclock.name} ]\n\n${char.overclock.description}`));
      ocHitBox.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      ocHitBox.on('pointerout',  () => _hideTip());
      g.add(ocHitBox);

      const _ocPulse = { v: 0 };
      const _applyGlow = (v) => {
        if (!ocLine.active) return;
        ocLine.setStyle({ fill: ocColor, stroke: ocColor, strokeThickness: v * 1.5 });
      };
      const _ocTw = scene.tweens.add({
        targets: _ocPulse, v: { from: 0, to: 1 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        onUpdate: () => _applyGlow(_ocPulse.v),
      });
      _persistTweens.push(_ocTw);
      infoY += parseInt(fs(18));
    }

    // HP 바
    const hpBarH  = parseInt(fs(18));
    const hpBarY  = topAreaBot - hpBarH - parseInt(fs(4));
    const hpPct   = char.maxHp > 0 ? char.currentHp/char.maxHp : 1;
    const hpCol   = hpPct>0.6 ? 0x306030 : hpPct>0.3 ? 0x806020 : 0x803020;
    const hpBg    = scene.add.graphics();
    hpBg.fillStyle(0x050404,0.9); hpBg.lineStyle(1,0x2a1a08,0.7);
    hpBg.strokeRect(infoX,hpBarY,infoW,hpBarH);
    hpBg.fillRect(infoX,hpBarY,infoW,hpBarH);
    const hpFg = scene.add.graphics();
    hpFg.fillStyle(hpCol,1);
    hpFg.fillRect(infoX+1,hpBarY+1,Math.max(0,Math.round((infoW-2)*hpPct)),hpBarH-2);
    g.add([hpBg, hpFg,
      scene.add.text(infoX+infoW/2, hpBarY+hpBarH/2,
        `HP  ${char.currentHp} / ${char.maxHp}`, {
        fontSize:fs(10), fill:'#d0b060', fontFamily:FontManager.MONO,
      }).setOrigin(0.5)
    ]);

    // ════════════════════════════════════════════════════════════
    //  하단: Cog / 좌(스탯) + 우(POSITION/PASSIVE/SKILL) 2컬럼
    // ════════════════════════════════════════════════════════════
    const bodyX = px + pad;
    const bodyW = pw - pad * 2;
    let   curY  = botAreaY;

    // ── Cog 바 ───────────────────────────────────────────────────
    const cogBarH = parseInt(fs(24));
    const cogBg   = scene.add.graphics();
    cogBg.fillStyle(0x0e0b07,1);
    cogBg.lineStyle(1,0x4a2a10,0.8);
    cogBg.strokeRect(bodyX,curY,bodyW,cogBarH);
    cogBg.fillRect(bodyX,curY,bodyW,cogBarH);
    g.add(cogBg);
    g.add(scene.add.text(bodyX+bodyW/2, curY+cogBarH/2, `◈  Cog  ${char.cog}  ◈`, {
      fontSize:fs(13),
      fill: (typeof CharacterManager !== 'undefined' && CharacterManager.getCogColor)
        ? CharacterManager.getCogColor(char.cog).css : '#e8c040',
      fontFamily:FontManager.MONO,
    }).setOrigin(0.5));
    curY += cogBarH + parseInt(fs(6));

    // ── 2컬럼 레이아웃 ───────────────────────────────────────────
    const colGap    = parseInt(fs(8));
    const colW      = (bodyW - colGap) / 2;
    const leftColX  = bodyX;
    const rightColX = bodyX + colW + colGap;

    const pendingStats = char.pendingStats || 0;

    g.add(scene.add.text(leftColX, curY, '[ 스  탯 ]', {
      fontSize:fs(10), fill:'#5a3818', fontFamily:FontManager.MONO,
    }).setOrigin(0,0));
    curY += parseInt(fs(14));

    // ✏️ tip 텍스트 → Data_Tooltips.js getStatTooltip() 참조
    const STAT_DEFS = [
      { key:'hp',      label:'체력', tip: getStatTooltip('hp')      },
      { key:'health',  label:'건강', tip: getStatTooltip('health')   },
      { key:'attack',  label:'공격', tip: getStatTooltip('attack')   },
      { key:'agility', label:'민첩', tip: getStatTooltip('agility')  },
      { key:'luck',    label:'행운', tip: getStatTooltip('luck')     },
    ];

    const rowH   = parseInt(fs(20));
    const plusW  = parseInt(fs(20));
    const statBH = STAT_DEFS.length * rowH + parseInt(fs(4));
    const ocKey  = char.overclock ? char.overclock.statKey : null;
    const ocHex  = ocKey ? parseInt((char.overclock.color||'#ff4400').replace('#','0x')) : null;

    const statBg = scene.add.graphics();
    statBg.fillStyle(0x0e0b07,1);
    if (ocKey) {
      [{pad:6,a:0.08,col:ocHex},{pad:3,a:0.18,col:ocHex},{pad:1,a:0.35,col:ocHex}]
        .forEach(({pad:p,a,col})=>{
          statBg.lineStyle(1,col,a);
          statBg.strokeRect(leftColX-p,curY-p,colW+p*2,statBH+p*2);
        });
    }
    statBg.lineStyle(1,0x2a1a08,0.7);
    statBg.strokeRect(leftColX,curY,colW,statBH);
    statBg.fillRect(leftColX,curY,colW,statBH);
    g.add(statBg);

    const statStartY = curY + parseInt(fs(2));

    const _burstEffect = (x, y, color) => {
      const hc = parseInt(color.replace('#','0x'));
      for (let k = 0; k < 8; k++) {
        const angle = (Math.PI*2/8)*k;
        const dot = scene.add.graphics().setDepth(403);
        dot.fillStyle(hc,1);
        dot.fillCircle(x, y, parseInt(fs(3)));
        scene.tweens.add({
          targets: dot,
          x: x + Math.cos(angle)*parseInt(fs(16)),
          y: y + Math.sin(angle)*parseInt(fs(16)),
          alpha:0, scaleX:0, scaleY:0,
          duration:350, ease:'Cubic.easeOut',
          onComplete: ()=>dot.destroy(),
        });
      }
    };

    const _plusButtons = [];
    const _valTxts = {};
    let _pendingTxt = null;

    // + 버튼 visible 상태를 직접 보고 수치 텍스트 X를 결정
    const _refreshValPos = () => {
      _plusButtons.forEach(({ bg, valT: vt, btnX: bx }) => {
        if (!vt || !vt.active) return;
        vt.setX(bg.visible ? bx - plusW / 2 - 6 : leftColX + colW - 6);
      });
    };

    STAT_DEFS.forEach(({ key, label, tip }, i) => {
      const sy   = statStartY + i * rowH;
      const midY = sy + rowH / 2;

      if (i > 0) {
        const sepG = scene.add.graphics();
        sepG.lineStyle(1,0x1e1206,0.5);
        sepG.lineBetween(leftColX+4, sy, leftColX+colW-4, sy);
        g.add(sepG);
      }

      const isOc    = ocKey === key;
      const statCol = SC[key] || '#c8bfb0';
      const effVal  = (typeof CharacterManager !== 'undefined')
        ? CharacterManager.getEffectiveStat(char, key)
        : (char.stats[key] || 0);

      if (isOc) {
        const glowBar = scene.add.graphics();
        const slices  = 24;
        const barX    = leftColX + 1;
        const barY    = sy + 1;
        const barW    = colW - 2;
        const barH    = rowH - 2;
        const sliceW  = barW / slices;
        for (let s = 0; s < slices; s++) {
          const alpha = 0.28 - (0.26 * s / (slices - 1));
          glowBar.fillStyle(ocHex, alpha);
          glowBar.fillRect(barX + s * sliceW, barY, Math.ceil(sliceW), barH);
        }
        glowBar.fillStyle(ocHex, 0.85);
        glowBar.fillRect(leftColX + 1, sy + 1, 2, rowH - 2);
        g.add(glowBar);
      }

      const statT = scene.add.text(leftColX+10, midY, label, {
        fontSize:fs(12),
        fill: isOc ? statCol : statCol + 'cc',
        fontFamily:FontManager.MONO,
      }).setOrigin(0,0.5);

      const valStr = isOc
        ? `${char.stats[key] || 0}  →  ${effVal}`
        : `${effVal}`;

      const valT = scene.add.text(
        leftColX + colW - 10,
        midY, valStr, {
        fontSize:fs(isOc ? 11 : 14),
        fill: isOc ? (char.overclock.color||'#ff4400') : statCol,
        fontFamily:FontManager.MONO,
      }).setOrigin(1,0.5);
      _valTxts[key] = valT;

      const tipText = isOc
        ? `${tip}\n\n[ ${char.overclock.name} ]\n${char.overclock.description}`
        : tip;
      const statHit = scene.add.rectangle(
        leftColX+colW/2, midY, colW, rowH, 0, 0
      ).setInteractive({useHandCursor:false}).setDepth(402);
      statHit.on('pointerover',(ptr)=>_showTip(ptr.x,ptr.y,tipText));
      statHit.on('pointermove',(ptr)=>_moveTip(ptr.x,ptr.y));
      statHit.on('pointerout', ()=>_hideTip());
      g.add([statT, valT, statHit]);

      const btnX = leftColX + colW - plusW/2 - 4;
      const plusBg  = scene.add.graphics();
      const plusTxt = scene.add.text(btnX, midY, '+', {
        fontSize:fs(14), fill:statCol, fontFamily:FontManager.MONO,
      }).setOrigin(0.5);
      const _drawPlus = (hover) => {
        plusBg.clear();
        if (hover) {
          const hc = parseInt(statCol.replace('#','0x'));
          [{pad:6,a:0.08},{pad:3,a:0.20},{pad:1,a:0.50}].forEach(({pad:p,a})=>{
            plusBg.lineStyle(1,hc,a);
            plusBg.strokeRect(btnX-plusW/2-p, midY-rowH/2+2-p, plusW+p*2, rowH-4+p*2);
          });
          plusBg.fillStyle(hc,0.18);
          plusBg.fillRect(btnX-plusW/2, midY-rowH/2+2, plusW, rowH-4);
          plusBg.lineStyle(1,hc,0.9);
          plusBg.strokeRect(btnX-plusW/2, midY-rowH/2+2, plusW, rowH-4);
        } else {
          plusBg.fillStyle(0x1e1008,1);
          plusBg.lineStyle(1,0x3a2010,0.7);
          plusBg.fillRect(btnX-plusW/2, midY-rowH/2+2, plusW, rowH-4);
          plusBg.strokeRect(btnX-plusW/2, midY-rowH/2+2, plusW, rowH-4);
        }
      };

      const initVisible = pendingStats > 0;
      plusBg.setVisible(initVisible);
      plusTxt.setVisible(initVisible);
      _drawPlus(false);

      const plusHit = scene.add.rectangle(btnX, midY, plusW, rowH-4, 0, 0).setDepth(403);
      if (initVisible) plusHit.setInteractive({useHandCursor:true});

      plusHit.on('pointerover', () => { _drawPlus(true);  plusTxt.setStyle({fill:'#ffffff'}); });
      plusHit.on('pointerout',  () => { _drawPlus(false); plusTxt.setStyle({fill:statCol}); });
      plusHit.on('pointerdown', () => {
        const ok = (typeof CharacterManager !== 'undefined')
          ? CharacterManager.spendStat(char, key) : false;
        if (!ok) return;
        _burstEffect(btnX, midY, statCol);
        const newEff = (typeof CharacterManager !== 'undefined')
          ? CharacterManager.getEffectiveStat(char, key)
          : (char.stats[key] || 0);
        if (char.overclock && char.overclock.statKey === key) {
          _valTxts[key].setText(`${char.stats[key] || 0}  →  ${newEff}`);
        } else {
          _valTxts[key].setText(`${newEff}`);
        }
        const remaining = char.pendingStats || 0;

        if (_pendingTxt) {
          _pendingTxt.setText(`잔여 스탯  +${remaining}`);
        }
        if (remaining <= 0) {
          _plusButtons.forEach(({bg, txt, hit}) => {
            bg.setVisible(false); txt.setVisible(false); hit.disableInteractive();
          });
          if (_pendingTxt) _pendingTxt.setVisible(false);
          const pendingRow = _pendingTxt ? _pendingTxt.getData('rowBg') : null;
          if (pendingRow) pendingRow.setVisible(false);
        }
        // + 버튼 visible 기준으로 수치 텍스트 위치 즉시 갱신
        _refreshValPos();
      });

      g.add([plusBg, plusTxt, plusHit]);
      _plusButtons.push({bg: plusBg, txt: plusTxt, hit: plusHit, valT, btnX});
    });

    // 초기 + 버튼 visible 기준으로 수치 텍스트 위치 세팅
    _refreshValPos();

    curY += statBH + parseInt(fs(4));

    // ── 잔여스탯 행 ──────────────────────────────────────────────
    if (pendingStats > 0) {
      const pendH  = parseInt(fs(18));
      const pendBg = scene.add.graphics();
      pendBg.fillStyle(0x0e0b07,1);
      pendBg.lineStyle(1,0x2a1a08,0.5);
      pendBg.strokeRect(leftColX,curY,colW,pendH);
      pendBg.fillRect(leftColX,curY,colW,pendH);
      g.add(pendBg);
      g.add(scene.add.text(leftColX+10, curY+pendH/2, `배분 가능`, {
        fontSize:fs(9), fill:'#7a6040', fontFamily:FontManager.MONO,
      }).setOrigin(0,0.5));
      _pendingTxt = scene.add.text(leftColX+colW-10, curY+pendH/2,
        `잔여 스탯  +${pendingStats}`, {
        fontSize:fs(10), fill:'#f0d060', fontFamily:FontManager.MONO,
      }).setOrigin(1,0.5);
      _pendingTxt.setData('rowBg', pendBg);
      g.add(_pendingTxt);
      curY += pendH + parseInt(fs(4));
    }

    // ── 우측 컬럼: POSITION / PASSIVE / SKILL ────────────────────
    const makeAbilBox = (titleStr, nameStr, descStr, yy, accentCol, colX, colWd) => {
      const nameH  = parseInt(fs(16));
      const descH  = parseInt(fs(11));
      const inner  = 8;
      const bh     = inner + parseInt(fs(10)) + 4 + nameH + descH + inner;
      const boxG   = scene.add.graphics();
      boxG.fillStyle(0x0e0b07,1);
      boxG.lineStyle(1,0x3a2010,0.7);
      boxG.strokeRect(colX,yy,colWd,bh);
      boxG.fillRect(colX,yy,colWd,bh);
      g.add(boxG);
      g.add(scene.add.text(colX+inner, yy+inner, titleStr, {
        fontSize:fs(8), fill:'#5a3818', fontFamily:FontManager.MONO,
      }).setOrigin(0,0));
      g.add(scene.add.text(colX+inner, yy+inner+parseInt(fs(10))+2, nameStr, {
        fontSize:fs(13), fill:accentCol||'#e8c060', fontFamily:FontManager.TITLE,
      }).setOrigin(0,0));
      g.add(scene.add.text(colX+inner, yy+inner+parseInt(fs(10))+2+nameH, descStr||'', {
        fontSize:fs(9), fill:'#7a5830', fontFamily:FontManager.MONO,
        wordWrap:{width:colWd-inner*2},
      }).setOrigin(0,0));
      return yy + bh + parseInt(fs(5));
    };

    let rightY = botAreaY + cogBarH + parseInt(fs(8));

    // ✏️ POSITION / PASSIVE / SKILL → Data_Tooltips.js 참조
    const posDesc = getPositionTooltip(char.position);
    rightY = makeAbilBox('POSITION', char.position||'—', posDesc, rightY, '#c8a060', rightColX, colW);

    const pasDesc = getPassiveTooltip(char.passive);
    rightY = makeAbilBox('PASSIVE', char.passive||'—', pasDesc, rightY, '#a0d080', rightColX, colW);

    const sklDesc = getSkillTooltip(char.skill);
    rightY = makeAbilBox('SKILL', char.skill||'—', sklDesc, rightY, '#80b0e0', rightColX, colW);

    // ── 하단 버튼 ────────────────────────────────────────────────
    const missing = char.maxHp - char.currentHp;
    const _drawBtn = (gfx, x, y, w, h, danger, hover=false) => {
      gfx.clear();
      if (danger) {
        gfx.fillStyle(hover?0x241010:0x180a08,1);
        gfx.lineStyle(1,hover?0x8a3020:0x4a2010,0.9);
      } else {
        gfx.fillStyle(hover?0x102010:0x0a1208,1);
        gfx.lineStyle(1,hover?0x4a8030:0x2a4018,0.9);
      }
      gfx.strokeRect(x,y,w,h); gfx.fillRect(x,y,w,h);
    };

    const btns = [];
    if (onHeal && missing > 0) {
      const healCost = Math.ceil(missing * 0.5);
      btns.push({ label:`회복  (${healCost} Arc)`, danger:false,
        onClick:()=>{ _close(); onHeal(char, healCost); } });
    }
    extraBtns.forEach(b => btns.push(b));
    btns.push({ label:'닫  기', danger:true, onClick:()=>_close() });

    const gap2  = parseInt(fs(8));
    const eachW = (pw - pad*2 - gap2*(btns.length-1)) / btns.length;
    btns.forEach((b, i) => {
      const bx  = px + pad + i*(eachW+gap2);
      const bg2 = scene.add.graphics();
      const t2  = scene.add.text(bx+eachW/2, btnY2+btnH2/2, b.label, {
        fontSize:fs(9), fill:b.danger?'#8a3820':'#6a9060', fontFamily:FontManager.MONO,
      }).setOrigin(0.5);
      const h2 = scene.add.rectangle(bx+eachW/2, btnY2+btnH2/2, eachW, btnH2, 0, 0)
        .setInteractive({useHandCursor:true}).setDepth(402);
      _drawBtn(bg2, bx, btnY2, eachW, btnH2, b.danger);
      h2.on('pointerover', ()=>_drawBtn(bg2,bx,btnY2,eachW,btnH2,b.danger,true));
      h2.on('pointerout',  ()=>_drawBtn(bg2,bx,btnY2,eachW,btnH2,b.danger,false));
      h2.on('pointerup',   ()=>b.onClick());
      g.add([bg2, t2, h2]);
    });

    function _close() {
      _hideTip();
      _persistTweens.forEach(tw => { try { tw.stop(); tw.remove(); } catch(e){} });
      scene.tweens.killTweensOf(g);
      overlay.destroy();
      // true: 컨테이너 자식(Text, Graphics, hit 박스 등)까지 모두 파기
      g.destroy(true);
      if (onClose) onClose();
    }

    g.setAlpha(0);
    scene.tweens.add({ targets:g, alpha:1, duration:120, ease:'Sine.easeOut' });
  },
};
