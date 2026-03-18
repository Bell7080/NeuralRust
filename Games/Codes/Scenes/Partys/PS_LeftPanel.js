// ================================================================
//  PS_LeftPanel.js
//  경로: Games/Codes/Scenes/Partys/PS_LeftPanel.js
//
//  역할: PartyScene 좌측 패널
//        buildLeftPanel / buildFilterBar / buildCardGrid / makeCard / buildBackBtn
//
//  로드 순서: PS_Background.js → PS_LeftPanel.js → PS_CenterPanel.js
// ================================================================

const PS_LeftPanel = {

  // 좌측 패널 배경 + 하위 빌드 호출
  buildLeftPanel(scene) {
    const fs    = scene._fs.bind(scene);
    const pm    = scene._pm;
    const lw    = scene._lw;
    const bodyY = scene._bodyY;
    const bodyH = scene._bodyH;
    const left  = scene._leftContainer;

    const lBg = scene.add.graphics();
    lBg.fillStyle(0x05080c, 0.82);
    lBg.lineStyle(1, 0x1e1208, 0.5);
    lBg.strokeRect(pm, bodyY, lw - pm * 2, bodyH - scene._backH);
    lBg.fillRect(pm, bodyY, lw - pm * 2, bodyH - scene._backH);
    left.add(lBg);

    PS_LeftPanel.buildFilterBar(scene);
    PS_LeftPanel.buildCardGrid(scene);
    PS_LeftPanel.buildBackBtn(scene);
  },

  // 필터바 (직업 / Cog / 정렬)
  buildFilterBar(scene) {
    scene._filterBarObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    scene._filterBarObjs = [];

    const fs   = scene._fs.bind(scene);
    const pm   = scene._pm;
    const fy   = scene._filterY;
    const rowH = parseInt(fs(32));
    const left = scene._leftContainer;

    const JOB  = [
      {key:'all',label:'전체'}, {key:'fisher',label:'낚시꾼'},
      {key:'diver',label:'잠수부'}, {key:'ai',label:'AI'},
    ];
    const COG  = [{key:'all',label:'전체'}, ...[1,2,3,4,5,6,7,8,9,10].map(n => ({key:`${n}`,label:`${n}`}))];
    const SORT = [{key:'date',label:'최신순'}, {key:'stat',label:'스탯순'}];

    const chip = (x, y, label, active, cb, wide = false) => {
      const tmp = scene.add.text(-9999, -9999, label, {fontSize:fs(11), fontFamily:FontManager.MONO});
      const bw  = tmp.width + (wide ? 20 : 14);
      tmp.destroy();
      const bg   = scene.add.graphics();
      const draw = (h) => {
        bg.clear();
        bg.fillStyle(active?(h?0x2a1e0c:0x181208):(h?0x141008:0), active?0.85:0.5);
        bg.lineStyle(1, active?0x9a6020:(h?0x4a2810:0x221608), 0.9);
        bg.strokeRect(x, y, bw, rowH); bg.fillRect(x, y, bw, rowH);
      };
      draw(false);
      const txt = scene.add.text(x + bw/2, y + rowH/2, label, {
        fontSize: fs(11), fill: active?'#e8a040':'#5a3818', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      const hit = scene.add.rectangle(x+bw/2, y+rowH/2, bw, rowH, 0, 0)
        .setInteractive({useHandCursor:true}).setDepth(21);
      hit.on('pointerover', () => draw(true));
      hit.on('pointerout',  () => draw(false));
      hit.on('pointerup',   cb);
      left.add([bg, txt]);
      scene._filterBarObjs.push(bg, txt, hit);
      return x + bw + 4;
    };

    const lbl = (x, y, t) => {
      const o = scene.add.text(x, y + rowH/2, t, {
        fontSize: fs(10), fill: '#4a2e10', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);
      left.add(o);
      scene._filterBarObjs.push(o);
    };

    lbl(pm + 6, fy, '직업');
    let bx = pm + 6 + parseInt(fs(26));
    JOB.forEach(f => {
      bx = chip(bx, fy, f.label, scene._filterJob === f.key, () => {
        scene._filterJob = f.key;
        PS_LeftPanel.rebuildCards(scene);
        PS_LeftPanel.buildFilterBar(scene);
      });
    });

    const cogFy = fy + rowH + parseInt(fs(4));
    lbl(pm + 6, cogFy, 'Cog');
    let cx2 = pm + 6 + parseInt(fs(26));
    COG.forEach(f => {
      cx2 = chip(cx2, cogFy, f.label, scene._filterCog === f.key, () => {
        scene._filterCog = f.key;
        PS_LeftPanel.rebuildCards(scene);
        PS_LeftPanel.buildFilterBar(scene);
      });
    });

    const sortFy = cogFy + rowH + parseInt(fs(6));
    lbl(pm + 6, sortFy, '정렬');
    let sx = pm + 6 + parseInt(fs(22));
    SORT.forEach(s => {
      const isA = scene._sortMode === s.key;
      const icon = isA ? (scene._sortOrder === 'desc' ? ' ▼' : ' ▲') : '';
      sx = chip(sx, sortFy, s.label + icon, isA, () => {
        if (scene._sortMode !== s.key) { scene._sortMode = s.key; scene._sortOrder = 'desc'; }
        else if (scene._sortOrder === 'desc') { scene._sortOrder = 'asc'; }
        else { scene._sortMode = 'none'; scene._sortOrder = 'desc'; }
        PS_LeftPanel.rebuildCards(scene);
        PS_LeftPanel.buildFilterBar(scene);
      }, true);
    });
  },

  // 카드 그리드 빌드
  buildCardGrid(scene) {
    const fs   = scene._fs.bind(scene);
    const left = scene._leftContainer;

    scene._cardObjs.forEach(({container:c}) => { try { c.destroy(); } catch(e){} });
    scene._cardObjs = [];
    if (scene._maskGfx) { try { scene._maskGfx.destroy(); } catch(e){} scene._maskGfx = null; }
    if (scene._cardRow) { try { scene._cardRow.destroy();  } catch(e){} scene._cardRow  = null; }

    const chars = scene._applyFilter();
    const cols  = 3;
    const gap   = parseInt(fs(4));
    const cardW = Math.floor((scene._cardAreaW - gap * (cols - 1)) / cols);
    const cardH = Math.round(cardW * 1.22);
    scene._cardW = cardW; scene._cardH = cardH;
    scene._scrollY = 0;

    const mGfx = scene.add.graphics();
    mGfx.fillStyle(0xffffff, 1);
    mGfx.fillRect(scene._cardAreaX, scene._cardAreaY, scene._cardAreaW, scene._cardAreaH);
    mGfx.setVisible(false);
    scene._maskGfx = mGfx;
    left.add(mGfx);

    scene._cardRow = scene.add.container(scene._cardAreaX, scene._cardAreaY);
    scene._cardRow.setMask(mGfx.createGeometryMask());
    left.add(scene._cardRow);

    chars.forEach((char, i) => {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const card = PS_LeftPanel.makeCard(scene, char, col * (cardW + gap), row * (cardH + gap), cardW, cardH);
      scene._cardRow.add(card);
      scene._cardObjs.push({container: card, char});
    });

    const rc = Math.ceil(chars.length / cols);
    scene._totalCardH = rc > 0 ? rc * (cardH + gap) - gap : 0;
  },

  // 그리드 카드 1장 생성
  makeCard(scene, char, x, y, cw, ch) {
    const fs = scene._fs.bind(scene);
    const JB = {fisher:0x0b1822, diver:0x0b1a10, ai:0x16091e};
    const JD = {fisher:0x3a6888, diver:0x3a7050, ai:0x6a4888};
    const JA = {fisher:0x1a3a5a, diver:0x1a3a28, ai:0x2a1240};
    const JS = {fisher:'FISH',   diver:'DIVE',   ai:'A·I'  };

    const c   = scene.add.container(x, y);
    const cbg = scene.add.graphics();
    const inP = () => scene._party.includes(char.id);
    const iSel= () => scene._selectedChar && scene._selectedChar.id === char.id;

    const dCbg = (hov) => {
      cbg.clear();
      if (inP())       { cbg.fillStyle(JA[char.job]||0x1a2010, 0.95); cbg.lineStyle(2, 0xffd060, 1); }
      else if (iSel()) { cbg.fillStyle(JB[char.job]||0x181410, 0.90); cbg.lineStyle(2, 0xc8a060, 1); }
      else if (hov)    { cbg.fillStyle(JB[char.job]||0x181410, 0.85); cbg.lineStyle(1, 0xc8a060, 0.7); }
      else             { cbg.fillStyle(JB[char.job]||0x181410, 0.65); cbg.lineStyle(1, JD[char.job]||0x3a2010, 0.6); }
      cbg.strokeRect(0, 0, cw, ch); cbg.fillRect(0, 0, cw, ch);
    };
    dCbg(false);
    c._drawCbg = dCbg;

    const portH = Math.round(ch * 0.78);
    const pBg   = scene.add.graphics();
    pBg.fillStyle(0x030303, 0.8); pBg.fillRect(2, 2, cw - 4, portH - 2);
    c.add([cbg, pBg]);

    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img = scene.add.image(cw/2, portH/2 + 2, char.spriteKey).setOrigin(0.5);
      img.setScale(Math.min((cw - 4) / img.width, (portH - 4) / img.height));
      c.add(img);
    } else {
      c.add(scene.add.text(cw/2, portH/2 + 2, JS[char.job]||'?', {
        fontSize: fs(20), fill: '#2a3038', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    }

    const cogC  = CharacterManager.getCogColor ? CharacterManager.getCogColor(char.cog) : {css:'#a08060'};
    const cBdBg = scene.add.graphics();
    cBdBg.fillStyle(0, 0.65); cBdBg.fillRect(2, 2, parseInt(fs(14)), parseInt(fs(11)));
    c.add([cBdBg, scene.add.text(4, 3, `C${char.cog}`, {
      fontSize: fs(8), fill: cogC.css||'#a08060', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0)]);

    const mark = scene.add.text(cw/2, portH * 0.50, '편성중', {
      fontSize: fs(8), fill: '#ffd060', fontFamily: FontManager.MONO,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);
    c.add(mark);
    c._partyMark   = mark;
    c._refreshMark = () => mark.setAlpha(inP() ? 1 : 0);
    c._refreshMark();

    const infoY = portH + 2, infoH = ch - infoY - 2;
    c.add(scene.add.text(cw/2, infoY + infoH * 0.30, char.name||'???', {
      fontSize: fs(8), fill: '#c8bfb0', fontFamily: FontManager.TITLE,
      wordWrap: {width: cw - 4}, align: 'center',
    }).setOrigin(0.5));

    const hpP = char.maxHp > 0 ? Math.max(0, char.currentHp / char.maxHp) : 1;
    const hpB = scene.add.graphics();
    hpB.fillStyle(0x1a1008, 1); hpB.fillRect(4, infoY + infoH * 0.72, cw - 8, 3);
    const hpC = hpP > 0.6 ? 0x306030 : hpP > 0.3 ? 0x806020 : 0x803020;
    hpB.fillStyle(hpC, 1); hpB.fillRect(4, infoY + infoH * 0.72, Math.max(1, Math.round((cw - 8) * hpP)), 3);
    c.add(hpB);

    const inA = (ptr) =>
      ptr.x >= scene._cardAreaX && ptr.x <= scene._cardAreaX + scene._cardAreaW &&
      ptr.y >= scene._cardAreaY && ptr.y <= scene._cardAreaY + scene._cardAreaH;

    const hit = scene.add.rectangle(cw/2, ch/2, cw, ch, 0, 0).setInteractive({useHandCursor:true});
    hit.on('pointerover', (ptr) => { if (inA(ptr)) dCbg(true); });
    hit.on('pointerout',  ()    => dCbg(false));
    hit.on('pointerup',   (ptr) => {
      if (!inA(ptr) || scene._dragged) return;
      if (scene._lastClickId === char.id) {
        scene._lastClickId = null;
        if (scene._dblTimer) { scene._dblTimer.remove(); scene._dblTimer = null; }
        inP() ? scene._removeFromPartyById(char.id) : scene._addToParty(char.id);
      } else {
        scene._lastClickId = char.id;
        PS_CenterPanel.openProfile(scene, char);
        if (scene._dblTimer) scene._dblTimer.remove();
        scene._dblTimer = scene.time.delayedCall(400, () => { scene._lastClickId = null; });
      }
    });
    c.add(hit);
    return c;
  },

  // 카드 그리드 재빌드 (필터/정렬 변경 시)
  rebuildCards(scene) {
    scene._scrollY = 0;
    PS_LeftPanel.buildCardGrid(scene);
  },

  // 돌아가기 버튼
  buildBackBtn(scene) {
    const fs   = scene._fs.bind(scene);
    const pm   = scene._pm;
    const lw   = scene._lw;
    const left = scene._leftContainer;
    const btnY = scene._bodyY + scene._bodyH - scene._backH + pm;
    const btnH = scene._backH - pm * 2;
    const btnW = lw - pm * 2;

    const bg   = scene.add.graphics();
    const draw = (hov) => {
      bg.clear();
      bg.fillStyle(hov ? 0x100c08 : 0x080604, 0.95);
      bg.lineStyle(1, hov ? 0x6a4020 : 0x2a1808, 0.9);
      bg.strokeRect(pm, btnY, btnW, btnH); bg.fillRect(pm, btnY, btnW, btnH);
    };
    draw(false);
    const txt = scene.add.text(pm + btnW/2, btnY + btnH/2, '←  돌아가기', {
      fontSize: fs(14), fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    left.add([bg, txt]);

    const hit = scene.add.rectangle(pm + btnW/2, btnY + btnH/2, btnW, btnH, 0, 0)
      .setInteractive({useHandCursor:true}).setDepth(20);
    scene._sceneHits.push(hit);
    hit.on('pointerover', () => { draw(true);  txt.setStyle({fill:'#c8a060'}); });
    hit.on('pointerout',  () => { draw(false); txt.setStyle({fill:'#5a3818'}); });
    hit.on('pointerup',   () => {
      const fl = scene.add.rectangle(0, 0, scene.W, scene.H, 0x050407, 0).setOrigin(0).setDepth(999);
      scene.tweens.add({targets: fl, alpha: 1, duration: 250, ease: 'Sine.easeIn',
        onComplete: () => scene.scene.start('AtelierScene')});
    });
  },

};
