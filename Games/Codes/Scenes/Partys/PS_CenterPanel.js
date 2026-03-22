// ================================================================
//  PS_CenterPanel.js
//  경로: Games/Codes/Scenes/Partys/PS_CenterPanel.js
//
//  역할: PartyScene 중앙 패널
//        buildCenterBg / buildCenterEmpty / clearProfile / openProfile / buildProfile
//
//  ✏️ v6 수정사항
//    · 어빌리티 블록: POSITION/PASSIVE/SKILL 가로 3칸
//      → PASSIVE / ACTION / ENHANCED / FINALE 세로 4행으로 전환
//    · position 필드 완전 제거
//    · 툴팁: AbilityIndex.getDesc() 우선 조회
//    · helmsman(조타수) 폴백 추가
//
//  로드 순서: PS_LeftPanel.js → PS_CenterPanel.js → PS_RightPanel.js
// ================================================================

const PS_CenterPanel = {

  buildCenterBg(scene) {
    const H      = scene.H;
    const pm     = scene._pm;
    const lw     = scene._lw;
    const cw     = scene._cw;
    const hdrH   = scene._hdrH;
    const center = scene._centerContainer;

    const fadeW = Math.round(cw * 0.08);

    const leftFade = scene.add.graphics();
    for(let i = 0; i < fadeW; i++){
      const a = (1 - i/fadeW) * 0.5;
      leftFade.fillStyle(0x050407, a);
      leftFade.fillRect(lw + i, hdrH, 1, H - hdrH);
    }
    center.add(leftFade);

    const rightFade = scene.add.graphics();
    for(let i = 0; i < fadeW; i++){
      const a = (i/fadeW) * 0.5;
      rightFade.fillStyle(0x050407, a);
      rightFade.fillRect(lw + cw - fadeW + i, hdrH, 1, H - hdrH);
    }
    center.add(rightFade);

    const infoH = Math.round((H - hdrH) * 0.38);
    const infoBg= scene.add.graphics();
    infoBg.fillStyle(0x050407, 0.72);
    infoBg.fillRect(lw + fadeW, H - infoH, cw - fadeW*2, infoH);
    center.add(infoBg);

    scene._centerInfoY = H - infoH;
    scene._centerInfoH = infoH;
    scene._centerFadeW = fadeW;
  },

  buildCenterEmpty(scene) {
    PS_CenterPanel.clearProfile(scene);
    const lw  = scene._lw;
    const cw  = scene._cw;
    const hint= scene.add.text(lw + cw/2, scene._centerInfoY - 40,
      '캐릭터를 클릭하면 프로필이 표시됩니다', {
        fontSize: scene._fs(13), fill:'#2a1c0a', fontFamily:FontManager.MONO,
      }).setOrigin(0.5).setAlpha(0.4);
    scene._profileContainer.add(hint);
  },

  clearProfile(scene) {
    scene._profileContainer.removeAll(true);
  },

  openProfile(scene, char) {
    scene._selectedChar = char;
    scene._cardObjs.forEach(({container:c})=>{ if(c._drawCbg) c._drawCbg(false); });
    PS_CenterPanel.clearProfile(scene);
    PS_CenterPanel.buildProfile(scene, char);
  },

  buildProfile(scene, char) {
    const fs    = scene._fs.bind(scene);
    const pm    = scene._pm;
    const lw    = scene._lw;
    const cw    = scene._cw;
    const H     = scene.H;
    const W     = scene.W;
    const fadeW = scene._centerFadeW;
    const infoY = scene._centerInfoY;
    const infoH = scene._centerInfoH;
    const cx    = lw + cw / 2;
    const add   = (o) => { scene._profileContainer.add(o); return o; };

    // ── 툴팁 헬퍼 ────────────────────────────────────────
    const TIP_FS_TITLE = fs(15);
    const TIP_FS_DESC  = fs(12);
    const TIP_MAX_W    = Math.round(W * 0.20);
    let   _tip = null;

    const _showTip = (x, y, rawText) => {
      _hideTip();
      const lines     = rawText.split('\n');
      const titleLine = lines[0] || '';
      const descLines = lines.slice(1).join('\n').trim();
      const tpad = 12, tpadX = 14;
      const tObj = scene.add.text(0, 0, titleLine, {
        fontSize: TIP_FS_TITLE, fill: '#e8d080', fontFamily: FontManager.MONO,
        fontStyle: 'bold', wordWrap: {width: TIP_MAX_W - tpadX*2},
      }).setDepth(502);
      const dObj = descLines ? scene.add.text(0, 0, descLines, {
        fontSize: TIP_FS_DESC, fill: '#b8a890', fontFamily: FontManager.MONO,
        wordWrap: {width: TIP_MAX_W - tpadX*2},
      }).setDepth(502) : null;
      const tH = tObj.height, dH = dObj ? dObj.height : 0, sepH = descLines ? 6 : 0;
      const bw = Math.min(TIP_MAX_W, Math.max(tObj.width, dObj ? dObj.width : 0) + tpadX*2);
      const bh = tpad + tH + sepH + dH + tpad;
      let tx = x + 16, ty = y + 16;
      if(tx + bw > W - 8) tx = x - bw - 8;
      if(ty + bh > H - 8) ty = y - bh - 8;
      const bgObj = scene.add.graphics().setDepth(501);
      bgObj.fillStyle(0x0a0807, 0.97); bgObj.lineStyle(2, 0xb07828, 1);
      bgObj.strokeRect(tx,ty,bw,bh); bgObj.fillRect(tx,ty,bw,bh);
      bgObj.lineStyle(1, 0x3a2010, 0.5); bgObj.strokeRect(tx+3,ty+3,bw-6,bh-6);
      if(descLines){ bgObj.lineStyle(1,0x5a3810,0.6); bgObj.lineBetween(tx+tpadX,ty+tpad+tH+3,tx+bw-tpadX,ty+tpad+tH+3); }
      tObj.setPosition(tx+tpadX, ty+tpad);
      if(dObj) dObj.setPosition(tx+tpadX, ty+tpad+tH+sepH);
      scene._profileContainer.add([bgObj, tObj]);
      if(dObj) scene._profileContainer.add(dObj);
      _tip = { bg:bgObj, t:tObj, d:dObj };
    };
    const _moveTip = (x, y) => {
      if(!_tip) return;
      const {t,d,bg} = _tip;
      const tpad=12, tpadX=14, tH=t.height, dH=d?d.height:0, sepH=d?6:0;
      const bw=Math.min(TIP_MAX_W, Math.max(t.width, d?d.width:0)+tpadX*2);
      const bh=tpad+tH+sepH+dH+tpad;
      let tx=x+16, ty=y+16;
      if(tx+bw>W-8) tx=x-bw-8; if(ty+bh>H-8) ty=y-bh-8;
      bg.clear();
      bg.fillStyle(0x0a0807,0.97); bg.lineStyle(2,0xb07828,1);
      bg.strokeRect(tx,ty,bw,bh); bg.fillRect(tx,ty,bw,bh);
      bg.lineStyle(1,0x3a2010,0.5); bg.strokeRect(tx+3,ty+3,bw-6,bh-6);
      if(d){ bg.lineStyle(1,0x5a3810,0.6); bg.lineBetween(tx+tpadX,ty+tpad+tH+3,tx+bw-tpadX,ty+tpad+tH+3); }
      t.setPosition(tx+tpadX,ty+tpad); if(d) d.setPosition(tx+tpadX,ty+tpad+tH+sepH);
    };
    const _hideTip = () => {
      if(_tip){
        try{_tip.bg.destroy();}catch(e){}
        try{_tip.t.destroy();}catch(e){}
        try{if(_tip.d)_tip.d.destroy();}catch(e){}
        _tip = null;
      }
    };
    const mkHit = (x, y, w, h, tipText) => {
      const hit = scene.add.rectangle(x+w/2, y+h/2, w, h, 0, 0)
        .setInteractive({useHandCursor:false}).setDepth(30);
      hit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, tipText));
      hit.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      hit.on('pointerout',  () => _hideTip());
      scene._profileContainer.add(hit);
      return hit;
    };

    // ── 일러스트 (중앙 크게) ────────────────────────────────
    const imgAreaH = infoY - scene._hdrH - pm * 2;
    const imgAreaY = scene._hdrH + pm;
    if(char.spriteKey && scene.textures.exists(char.spriteKey)){
      const img = add(scene.add.image(cx, imgAreaY + imgAreaH * 0.55, char.spriteKey).setOrigin(0.5));
      const mw = cw * 0.72, mh = imgAreaH * 0.92;
      img.setScale(Math.min(mw/img.width, mh/img.height));
    } else {
      const JS = {fisher:'FISH', diver:'DIVE', helmsman:'HELM'};
      add(scene.add.text(cx, imgAreaY + imgAreaH*0.5, JS[char.job]||'?', {
        fontSize:fs(60), fill:'#1a2028', fontFamily:FontManager.MONO,
      }).setOrigin(0.5));
    }

    // ── 정보 영역 ────────────────────────────────────────────
    const infoX  = lw + fadeW + pm;
    const infoW  = cw - fadeW*2 - pm*2;
    const pad    = Math.max(parseInt(fs(8)), Math.floor(infoW*0.04));
    const rScale = Math.max(0.80, Math.min(1.3, infoW / 280));
    const rfs    = n => fs(Math.round(n * rScale));
    const colX   = infoX + pad;
    const colW   = infoW - pad*2;
    let   curY   = infoY + pad;

    // 이름 행
    const cogCC = CharacterManager.getCogColor ? CharacterManager.getCogColor(char.cog).css : '#c8a040';
    add(scene.add.text(colX, curY, char.name, {fontSize:rfs(24),fill:'#e8c070',fontFamily:FontManager.TITLE}).setOrigin(0,0));
    const cogTxt = add(scene.add.text(colX+colW, curY, `◈ Cog ${char.cog}`, {fontSize:rfs(13),fill:cogCC,fontFamily:FontManager.MONO}).setOrigin(1,0));
    mkHit(colX+colW - cogTxt.width - 4, curY, cogTxt.width+8, parseInt(rfs(16)),
      `Cog ${char.cog}\n스탯 합산 ${char.statSum||'—'} 기준 등급입니다.`);
    curY += parseInt(rfs(26));

    // 직업 행
    const jobDesc = (typeof getJobTooltip==='function') ? getJobTooltip(char.job) : (char.jobLabel||char.job);
    const jobTxt  = add(scene.add.text(colX, curY, char.jobLabel||char.job, {fontSize:rfs(12),fill:'#c8802a',fontFamily:FontManager.MONO}).setOrigin(0,0));
    mkHit(colX, curY, jobTxt.width+8, parseInt(rfs(15)), `${char.jobLabel||char.job}\n${jobDesc}`);
    curY += parseInt(rfs(16));

    // 오버클럭 행
    if(char.overclock){
      const ocData = (typeof OVERCLOCK_POOL !== 'undefined')
        ? (OVERCLOCK_POOL.find(o => o.id === char.overclock.id) || char.overclock)
        : char.overclock;
      const ocColor  = ocData.color || '#ff6655';
      const ocName   = ocData.name  || '오버클럭';
      const ocLabel  = ocData.label || `오버클럭 : ${ocName}`;
      const ocDesc   = ocData.description || '';
      const ocLine   = add(scene.add.text(colX, curY, ocLabel, {
        fontSize:rfs(11), fill:ocColor, fontFamily:FontManager.MONO,
      }).setOrigin(0,0));
      mkHit(colX, curY, ocLine.width+8, parseInt(rfs(14)), `${ocName}\n${ocDesc}`);
      const _ocP = {v:0};
      const tw = scene.tweens.add({
        targets:_ocP, v:{from:0,to:1}, duration:1400, yoyo:true, repeat:-1, ease:'Sine.easeInOut',
        onUpdate:()=>{ if(!ocLine.active)return; ocLine.setStyle({fill:ocColor,stroke:ocColor,strokeThickness:_ocP.v*1.5}); },
      });
      scene._profileContainer.once('destroy', ()=>{ try{tw.stop();tw.remove();}catch(e){} });
      curY += parseInt(rfs(16));
    }

    // HP 바
    const hpBH = parseInt(rfs(18));
    const hpP  = char.maxHp>0 ? char.currentHp/char.maxHp : 1;
    const hpC  = hpP>0.6?0x306030:hpP>0.3?0x806020:0x803020;
    const hpBg = add(scene.add.graphics());
    hpBg.fillStyle(0x030506,0.85); hpBg.lineStyle(1,0x2a1a08,0.6);
    hpBg.strokeRect(colX,curY,colW,hpBH); hpBg.fillRect(colX,curY,colW,hpBH);
    const hpFg = add(scene.add.graphics());
    hpFg.fillStyle(hpC,1); hpFg.fillRect(colX+1,curY+1,Math.max(0,Math.round((colW-2)*hpP)),hpBH-2);
    add(scene.add.text(colX+colW/2, curY+hpBH/2, `HP  ${char.currentHp} / ${char.maxHp}`,
      {fontSize:rfs(10),fill:'#d0b060',fontFamily:FontManager.MONO}).setOrigin(0.5));
    curY += hpBH + parseInt(rfs(5));

    // 스탯 블록 — 2열
    const SC    = CharacterManager.STAT_COLORS || {hp:'#ff88bb',health:'#88ddaa',attack:'#ff3333',agility:'#55ccff',luck:'#ddcc44'};
    const SDEFS = [{key:'hp',label:'체력'},{key:'health',label:'건강'},{key:'attack',label:'공격'},{key:'agility',label:'민첩'},{key:'luck',label:'행운'}];
    const ocKey = char.overclock ? char.overclock.statKey : null;
    const ocHex = ocKey ? parseInt((char.overclock.color||'#ff6655').replace('#','0x')) : null;
    const sRowH = parseInt(rfs(19));
    const sBH   = Math.ceil(SDEFS.length/2) * sRowH;
    const col2W = Math.floor(colW/2) - parseInt(rfs(3));

    const sBg = add(scene.add.graphics());
    sBg.fillStyle(0x060810,0.80);
    if(ocKey){[{p:2,a:0.15},{p:1,a:0.30}].forEach(({p,a})=>{ sBg.lineStyle(1,ocHex,a); sBg.strokeRect(colX-p,curY-p,colW+p*2,sBH+p*2); });}
    sBg.lineStyle(1,0x2a1a08,0.6); sBg.strokeRect(colX,curY,colW,sBH); sBg.fillRect(colX,curY,colW,sBH);

    SDEFS.forEach(({key,label},i)=>{
      const col   = i % 2;
      const row   = Math.floor(i / 2);
      const sx    = colX + col*(col2W + parseInt(rfs(6)));
      const sy    = curY + row*sRowH;
      const midY  = sy + sRowH/2;
      const isOc  = ocKey===key;
      const sCol  = SC[key]||'#c8bfb0';
      const eff   = CharacterManager.getEffectiveStat ? CharacterManager.getEffectiveStat(char,key) : (char.stats[key]||0);
      const base  = char.stats[key]||0;
      const vStr  = isOc ? `${base}→${eff}` : `${eff}`;
      if(i>0 && col===0){
        const sg=add(scene.add.graphics()); sg.lineStyle(1,0x1e1206,0.35); sg.lineBetween(colX+2,sy,colX+colW-2,sy);
      }
      if(isOc){
        const gB=add(scene.add.graphics()); const bw=col2W-2;
        for(let s=0;s<12;s++){gB.fillStyle(ocHex,0.18-(0.15*s/11));gB.fillRect(sx+1+s*(bw/12),sy+1,Math.ceil(bw/12),sRowH-2);}
        gB.fillStyle(ocHex,0.85); gB.fillRect(sx+1,sy+1,2,sRowH-2);
      }
      add(scene.add.text(sx+4, midY, label,
        {fontSize:rfs(10),fill:isOc?(char.overclock.color||'#ff6655'):sCol+'cc',fontFamily:FontManager.MONO}).setOrigin(0,0.5));
      add(scene.add.text(sx+col2W-4, midY, vStr,
        {fontSize:rfs(11),fill:isOc?(char.overclock.color||'#ff6655'):sCol,fontFamily:FontManager.MONO}).setOrigin(1,0.5));
      const tipText = (typeof getStatTooltipDynamic==='function') ? getStatTooltipDynamic(key,eff)
        : (typeof getStatTooltip==='function' ? getStatTooltip(key) : key);
      mkHit(sx, sy, col2W, sRowH, tipText);
    });
    curY += sBH + parseInt(rfs(4));

    // ── 어빌리티 — 세로 4행 (PASSIVE / ACTION / ENHANCED / FINALE) ──
    // ✏️ v6: 가로 3칸(POSITION/PASSIVE/SKILL) → 세로 4행으로 전환
    //        position 필드 완전 제거
    const _getAbilName = (type, id) => {
      if (!id || id === '—') return '—';
      if (typeof AbilityIndex !== 'undefined') {
        const n = AbilityIndex.getName(type, id);
        if (n && n !== id) return n;
      }
      return id;
    };
    const _getAbilDesc = (type, id) => {
      if (!id || id === '—') return '';
      if (typeof AbilityIndex !== 'undefined') return AbilityIndex.getDesc(type, id) || '';
      if (type === 'passive'  && typeof getPassiveDescription === 'function') return getPassiveDescription(id);
      return '';
    };
    const _getFinaleGauge = (id) => {
      if (typeof AbilityIndex !== 'undefined') return AbilityIndex.getGauge(id);
      return null;
    };

    const TRIGGER_LABEL = {
      attack_count: '공격 N회마다',
      on_hit:       '피격 시',
      hp_below:     'HP N% 이하',
      kill:         '처치 시',
    };

    // 4행 정의
    const finName  = _getAbilName('finale', char.finale);
    const finGauge = _getFinaleGauge(char.finale);

    const ABIL_ROWS = [
      {
        type: 'passive', title: 'PASSIVE', col: '#a0d080', id: char.passive,
        get name() { return _getAbilName('passive', this.id); },
        get desc() { return _getAbilDesc('passive', this.id); },
        get tip()  { return `${this.name}\n패시브 — 상시 발동\n${this.desc}`; },
      },
      {
        type: 'action', title: 'ACTION', col: '#c8a060', id: char.action,
        get name() { return _getAbilName('action', this.id); },
        get desc() { return _getAbilDesc('action', this.id); },
        get tip()  { return `${this.name}\n일반 행동\n${this.desc}`; },
      },
      {
        type: 'enhanced', title: 'ENHANCED', col: '#80b8e0', id: char.enhanced,
        get name() { return _getAbilName('enhanced', this.id); },
        get desc() { return _getAbilDesc('enhanced', this.id); },
        get tip()  {
          const data = (typeof AbilityIndex !== 'undefined') ? AbilityIndex.getData('enhanced', this.id) : null;
          const trig = data ? `${TRIGGER_LABEL[data.triggerType]||data.triggerType} (${data.triggerValue})` : '';
          return `${this.name}\n강화 행동${trig ? '  —  ' + trig : ''}\n${this.desc}`;
        },
      },
      {
        type: 'finale', title: 'FINALE', col: '#ff88aa', id: char.finale,
        get name() {
          const n = _getAbilName('finale', this.id);
          const g = _getFinaleGauge(this.id);
          return n + (g ? `  (${g})` : '');
        },
        get desc() { return _getAbilDesc('finale', this.id); },
        get tip()  {
          const g = _getFinaleGauge(this.id);
          return `${_getAbilName('finale', this.id)}\n피날레${g ? '  —  게이지 ' + g : ''}\n${this.desc}`;
        },
      },
    ];

    const remainH  = (infoY + infoH) - curY - pad;
    const rowCount = ABIL_ROWS.length;
    const abilRowH = Math.max(parseInt(rfs(16)), Math.floor(remainH / rowCount));
    const labelW   = Math.round(colW * 0.30);

    ABIL_ROWS.forEach((row, i) => {
      if (curY + abilRowH > infoY + infoH - 2) return;

      // 홀짝 교차 배경
      const rowBg = add(scene.add.graphics());
      const accentHex = parseInt(row.col.replace('#','0x'));
      rowBg.fillStyle(0x060810, i % 2 === 0 ? 0.85 : 0.70);
      rowBg.lineStyle(1, accentHex, 0.15);
      rowBg.strokeRect(colX, curY, colW, abilRowH);
      rowBg.fillRect(colX, curY, colW, abilRowH);

      // 좌측 컬러 강조 라인 2px
      const accentGfx = add(scene.add.graphics());
      accentGfx.fillStyle(accentHex, 0.7);
      accentGfx.fillRect(colX, curY + 1, 2, abilRowH - 2);

      const midY = curY + abilRowH / 2;

      // 타입 라벨 (고정폭 labelW)
      add(scene.add.text(colX + 8, midY, row.title, {
        fontSize: rfs(8), fill: row.col, fontFamily: FontManager.MONO,
        letterSpacing: 1,
      }).setOrigin(0, 0.5));

      // 능력 이름 (라벨 우측에 배치, 잘릴 경우 wordWrap)
      add(scene.add.text(colX + labelW + 4, midY, row.name, {
        fontSize: rfs(11), fill: '#e8c060', fontFamily: FontManager.TITLE,
        wordWrap: { width: colW - labelW - 8 },
      }).setOrigin(0, 0.5));

      // 툴팁 hit (행 전체)
      mkHit(colX, curY, colW, abilRowH, row.tip);

      curY += abilRowH;
    });
  },

};
