// ================================================================
//  PS_RightPanel.js
//  경로: Games/Codes/Scenes/Partys/PS_RightPanel.js
//
//  역할: PartyScene 우측 패널
//        buildRightPanel / buildPartySlots / buildManagePanel
//
//  로드 순서: PS_CenterPanel.js → PS_RightPanel.js → PartyScene.js
// ================================================================

const PS_RightPanel = {

  buildRightPanel(scene) {
    const H  = scene.H;
    const pm = scene._pm;
    const right = scene._rightContainer;

    const rBg = scene.add.graphics();
    rBg.fillStyle(0x05080c, 0.90);
    rBg.lineStyle(1, 0x2a1a08, 0.5);
    rBg.strokeRect(scene._slotAreaX, scene._slotAreaY, scene._slotAreaW, H - scene._slotAreaY - pm);
    rBg.fillRect(scene._slotAreaX, scene._slotAreaY, scene._slotAreaW, H - scene._slotAreaY - pm);
    right.add(rBg);

    // 슬롯/관리 구분선
    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x1e1008, 0.6);
    sep.lineBetween(scene._slotAreaX + pm, scene._manageY, scene._slotAreaX + scene._slotAreaW - pm, scene._manageY);
    right.add(sep);

    // 슬롯 영역 레이블
    right.add(scene.add.text(scene._slotAreaX + pm + 4, scene._slotAreaY, '파  티  슬  롯', {
      fontSize: scene._fs(9), fill:'#3a1e08', fontFamily:FontManager.TITLE,
    }).setOrigin(0, 0));
  },

  // 파티 슬롯 (6칸 초과 시 2열)
  buildPartySlots(scene) {
    scene._slotHits.forEach(h=>{ try{h.destroy();}catch(e){} });
    scene._slotHits = [];
    scene._slotContainer.removeAll(true);

    const fs    = scene._fs.bind(scene);
    const pm    = scene._pm;
    const aX    = scene._slotAreaX + pm;
    const aY    = scene._slotAreaY + parseInt(fs(16));
    const aW    = scene._slotAreaW - pm * 2;
    const aH    = scene._slotAreaH - parseInt(fs(16)) - pm;
    const count = scene._party.length;

    if(count === 0){
      scene._slotContainer.add(scene.add.text(aX + aW/2, aY + aH/2,
        '캐릭터를 선택하면\n파티에 추가됩니다', {
          fontSize:fs(11), fill:'#2a1808', fontFamily:FontManager.MONO, align:'center', lineSpacing:4,
        }).setOrigin(0.5).setAlpha(0.4));
      return;
    }

    // 6칸까지는 1열, 초과 시 2열
    const COL_BREAK  = 6;
    const cols       = count > COL_BREAK ? 2 : 1;
    const perCol     = Math.ceil(count / cols);
    const colW       = cols === 2 ? Math.floor(aW / 2) - parseInt(fs(2)) : aW;
    const slotH      = Math.min(
      Math.floor(aH / perCol) - parseInt(fs(3)),
      Math.round(colW * 0.50)
    );
    const slotW      = colW;
    const gap        = Math.max(parseInt(fs(3)), Math.floor((aH - perCol * slotH) / (perCol + 1)));

    scene._party.forEach((charId, idx) => {
      const char = scene._chars.find(c => c.id === charId);
      if(!char) return;

      const colIdx = cols === 2 ? Math.floor(idx / perCol) : 0;
      const rowIdx = cols === 2 ? idx % perCol : idx;
      const cx     = aX + colIdx * (colW + parseInt(fs(2))) + slotW / 2;
      const cy     = aY + gap + rowIdx * (slotH + gap) + slotH / 2;
      const isSel  = scene._slotSelected === charId;
      const cogC   = CharacterManager.getCogColor(char.cog);

      const bg = scene.add.graphics();
      const drawBg = (sel) => {
        bg.clear();
        if(sel){ bg.fillStyle(0x2a0808,1); bg.lineStyle(2,0xff4444,1); }
        else   { bg.fillStyle(0x1a1008,1); bg.lineStyle(2,cogC.phaser,0.85); }
        bg.fillRect(cx-slotW/2, cy-slotH/2, slotW, slotH);
        bg.strokeRect(cx-slotW/2, cy-slotH/2, slotW, slotH);
      };
      drawBg(isSel);
      scene._slotContainer.add(bg);

      // 스프라이트 (슬롯 좌측)
      const portSize = slotH * 0.78;
      const portCX   = cx - slotW/2 + portSize/2 + parseInt(fs(3));
      if(scene.textures.exists(char.spriteKey)){
        const img = scene.add.image(portCX, cy, char.spriteKey).setDisplaySize(portSize, portSize);
        scene._slotContainer.add(img);
      }

      // 이름 + Cog (슬롯 우측)
      const textX = cx - slotW/2 + portSize + parseInt(fs(5));
      const textW = slotW - portSize - parseInt(fs(7));
      scene._slotContainer.add([
        scene.add.text(textX, cy - slotH*0.16, char.name, {
          fontSize:fs(9), fill:'#c8bfb0', fontFamily:FontManager.TITLE, wordWrap:{width:textW},
        }).setOrigin(0, 0.5),
        scene.add.text(textX, cy + slotH*0.18, `Cog ${char.cog}  ${char.jobLabel||''}`, {
          fontSize:fs(8), fill:cogC.css, fontFamily:FontManager.MONO,
        }).setOrigin(0, 0.5),
      ]);

      // 선택 시 × 표시
      if(isSel){
        scene._slotContainer.add(scene.add.text(cx + slotW/2 - parseInt(fs(3)), cy, '×', {
          fontSize:fs(13), fill:'#ff4444', fontFamily:FontManager.MONO,
        }).setOrigin(1, 0.5));
      }

      const hit = scene.add.rectangle(cx, cy, slotW, slotH, 0, 0)
        .setInteractive({useHandCursor:true}).setDepth(22);
      scene._slotHits.push(hit);
      hit.on('pointerup', () => {
        if(scene._slotSelected === charId){
          scene._slotSelected = null;
          scene._removeFromPartyById(charId);
        } else {
          scene._slotSelected = charId;
          PS_RightPanel.buildPartySlots(scene);
          const ch = scene._chars.find(c => c.id === charId);
          if(ch) PS_CenterPanel.openProfile(scene, ch);
        }
      });
    });
  },

  buildManagePanel(scene) {
    scene._manageContainer.removeAll(true);
    // 이전 출발버튼 sceneHit 정리
    scene._manageHits = scene._manageHits || [];
    scene._manageHits.forEach(h=>{ try{h.destroy();}catch(e){} });
    scene._manageHits = [];

    const fs   = scene._fs.bind(scene);
    const pm   = scene._pm;
    const mX   = scene._slotAreaX + pm;
    const mY   = scene._manageY + pm;
    const mW   = scene._slotAreaW - pm * 2;
    const mH   = scene._manageH - pm;
    const add  = (o) => { scene._manageContainer.add(o); return o; };

    const count     = scene._party.length;
    const cost      = scene._calcCost();
    const arc       = typeof SaveManager!=='undefined'&&SaveManager.getArc ? SaveManager.getArc() : 0;
    const canAfford = arc >= cost;
    const canStart  = count > 0 && canAfford;

    // 파티 현황 텍스트 (curY 누적)
    let curY = mY;
    add(scene.add.text(mX, curY, '파  티  현  황', {fontSize:fs(10),fill:'#4a2e10',fontFamily:FontManager.MONO}));
    curY += parseInt(fs(16));
    add(scene.add.text(mX, curY, `인  원  :  ${count}명`, {fontSize:fs(12),fill:'#c8bfb0',fontFamily:FontManager.MONO}));
    curY += parseInt(fs(15));
    add(scene.add.text(mX, curY, `비  용  :  ${cost} Arc`, {fontSize:fs(12),fill:canAfford?'#c8a060':'#cc4444',fontFamily:FontManager.MONO}));
    curY += parseInt(fs(15));
    add(scene.add.text(mX, curY, `보  유  :  ${arc} Arc`, {fontSize:fs(11),fill:'#5a4a28',fontFamily:FontManager.MONO}));
    curY += parseInt(fs(18));

    // 멤버 목록
    scene._party.forEach(id => {
      const ch = scene._chars.find(c=>c.id===id);
      if(!ch || curY + parseInt(fs(12)) > mY + mH - parseInt(fs(56))) return;
      const cc = CharacterManager.getCogColor(ch.cog);
      add(scene.add.text(mX, curY, `· ${ch.name}  C${ch.cog}`, {fontSize:fs(10),fill:cc.css,fontFamily:FontManager.MONO}));
      curY += parseInt(fs(13));
    });

    // 출발 버튼 (하단 고정)
    const btnH = parseInt(fs(44));
    const btnY = mY + mH - btnH;
    const btnW = mW;

    const sBg = add(scene.add.graphics());
    const drawS = (st) => {
      sBg.clear();
      if(st==='disabled'){ sBg.fillStyle(0x0a0807,1); sBg.lineStyle(1,0x1a1008,0.5); }
      else if(st==='hover'){ sBg.fillStyle(0x2a1a08,1); sBg.lineStyle(2,0xc8a070,1); }
      else { sBg.fillStyle(0x1e1008,1); sBg.lineStyle(2,0xa05018,0.9); }
      sBg.strokeRect(mX, btnY, btnW, btnH); sBg.fillRect(mX, btnY, btnW, btnH);
    };
    drawS(canStart?'active':'disabled');

    const sTxt = add(scene.add.text(mX + btnW/2, btnY + btnH/2, '출  발', {
      fontSize:fs(18), fill:canStart?'#c8a070':'#2a1a0a', fontFamily:FontManager.TITLE,
    }).setOrigin(0.5));

    const guide = canStart ? `${count}명  ·  ${cost} Arc 소모` : (count===0 ? '파티 인원을 선택하세요' : `Arc 부족  (${cost-arc} 부족)`);
    add(scene.add.text(mX + btnW/2, btnY - parseInt(fs(6)), guide, {
      fontSize:fs(9), fill:canStart?'#5a3a18':'#6a2020', fontFamily:FontManager.MONO,
    }).setOrigin(0.5, 1));

    if(canStart){
      const sH = scene.add.rectangle(mX+btnW/2, btnY+btnH/2, btnW, btnH, 0,0)
        .setInteractive({useHandCursor:true}).setDepth(20);
      scene._manageHits.push(sH);
      sH.on('pointerover',()=>{ drawS('hover'); sTxt.setStyle({fill:'#e8d090'}); });
      sH.on('pointerout', ()=>{ drawS('active'); sTxt.setStyle({fill:'#c8a070'}); });
      sH.on('pointerup',  ()=>scene._depart());
    }
  },

};
