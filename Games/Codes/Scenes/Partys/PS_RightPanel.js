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
    const aY    = scene._slotAreaY + pm;
    const aW    = scene._slotAreaW - pm * 2;
    const aH    = scene._slotAreaH - pm * 2;
    const count = scene._party.length;

    if(count === 0){
      scene._slotContainer.add(scene.add.text(aX + aW/2, aY + aH/2,
        '캐릭터를 선택하면\n파티에 추가됩니다', {
          fontSize:fs(11), fill:'#2a1808', fontFamily:FontManager.MONO, align:'center', lineSpacing:4,
        }).setOrigin(0.5).setAlpha(0.4));
      return;
    }

    // ── 레이아웃 계산 ─────────────────────────────────────────────
    // 세로 한 열에 최대 6칸, 7번째부터 옆 열로 확장
    const PER_COL  = 6;
    const cols     = Math.ceil(count / PER_COL);  // 현재 열 수
    const gap      = parseInt(fs(3));
    const colGap   = parseInt(fs(4));

    // 열 너비: 열이 늘수록 좁아짐
    const colW  = Math.floor((aW - colGap * (cols - 1)) / cols);

    // 슬롯 높이: 1칸일 땐 크게, 6칸이면 영역 꽉 맞게 자동 축소
    // aH 기준으로 현재 열의 칸 수(perThisCol)에 맞게 계산
    const slotH = Math.floor((aH - gap * (PER_COL - 1)) / PER_COL);
    const slotW = colW;

    scene._party.forEach((charId, idx) => {
      const char = scene._chars.find(c => c.id === charId);
      if(!char) return;

      const col    = Math.floor(idx / PER_COL);   // 몇 번째 열
      const row    = idx % PER_COL;               // 열 안에서 몇 번째 칸
      const isNewCol = idx > 0 && row === 0;      // 새 열의 첫 칸

      const tX    = aX + col * (colW + colGap);
      const tY    = aY + row * (slotH + gap);
      const isSel = scene._slotSelected === charId;
      const cogC  = CharacterManager.getCogColor(char.cog);

      // 슬롯 컨테이너
      const cx = tX + slotW / 2;
      const cy = tY + slotH / 2;
      const slotCon = scene.add.container(cx, cy).setAlpha(0);
      scene._slotContainer.add(slotCon);

      // ── 배경 ──────────────────────────────────────────────────
      const bg = scene.add.graphics();
      const drawBg = (hov) => {
        bg.clear();
        if(isSel)     { bg.fillStyle(0x2a0808,1); bg.lineStyle(2,0xff4444,1); }
        else if(hov)  { bg.fillStyle(0x1e1a10,1); bg.lineStyle(2,cogC.phaser,1); }
        else          { bg.fillStyle(0x110e08,1); bg.lineStyle(1,cogC.phaser,0.60); }
        bg.fillRect(-slotW/2,-slotH/2,slotW,slotH);
        bg.strokeRect(-slotW/2,-slotH/2,slotW,slotH);
      };
      drawBg(false);
      slotCon.add(bg);

      // ── 스프라이트 (슬롯 좌측 정사각 영역) ───────────────────
      const portSz = slotH - 4;
      const portX  = -slotW/2 + portSz/2 + 2;
      const portBg = scene.add.graphics();
      portBg.fillStyle(0x030303, 0.65);
      portBg.fillRect(-slotW/2+1, -slotH/2+1, portSz+2, slotH-2);
      slotCon.add(portBg);

      if(char.spriteKey && scene.textures.exists(char.spriteKey)){
        const img = scene.add.image(portX, 0, char.spriteKey).setOrigin(0.5);
        img.setScale(Math.min(portSz / img.width, portSz / img.height));
        slotCon.add(img);
      } else {
        const JS = {fisher:'F', diver:'D', ai:'AI'};
        slotCon.add(scene.add.text(portX, 0, JS[char.job]||'?', {
          fontSize:fs(11), fill:'#2a3038', fontFamily:FontManager.MONO,
        }).setOrigin(0.5));
      }

      // ── 이름 + Cog (우측 텍스트 영역) ─────────────────────────
      const textX  = -slotW/2 + portSz + parseInt(fs(4)) + 2;
      const textW  = slotW - portSz - parseInt(fs(6));
      const nameFs = Math.max(6, Math.round(8 - cols * 0.5));  // 열 많을수록 살짝 작아짐

      slotCon.add(scene.add.text(textX, -slotH * 0.14, char.name, {
        fontSize: fs(nameFs), fill: isSel ? '#ff8888' : '#c8bfb0',
        fontFamily: FontManager.TITLE, wordWrap: { width: textW },
      }).setOrigin(0, 0.5));

      slotCon.add(scene.add.text(textX, slotH * 0.22, `C${char.cog}`, {
        fontSize: fs(Math.max(6, nameFs - 1)), fill: cogC.css,
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5));

      // ── 선택 시 × (우상단) ────────────────────────────────────
      if(isSel){
        slotCon.add(scene.add.text(slotW/2 - 2, -slotH/2 + 1, '×', {
          fontSize: fs(10), fill: '#ff4444', fontFamily: FontManager.MONO,
        }).setOrigin(1, 0));
      }

      // ── 히트박스 ──────────────────────────────────────────────
      const hit = scene.add.rectangle(0, 0, slotW, slotH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(22);
      slotCon.add(hit);
      scene._slotHits.push(hit);

      hit.on('pointerover', () => drawBg(true));
      hit.on('pointerout',  () => drawBg(false));
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

      // ── 애니메이션 ────────────────────────────────────────────
      // 기존 칸(같은 열): 위에서 차례로 내려오며 페이드
      // 새 열(7번째~): 오른쪽에서 스윽 밀려 들어옴
      if(isNewCol){
        // 새 열 전체 — 오른쪽 바깥에서 슬라이드 인
        slotCon.setX(cx + parseInt(fs(18)));
        scene.tweens.add({
          targets: slotCon, x: cx, alpha: 1,
          duration: 220, ease: 'Cubic.easeOut',
          delay: row * 22,   // 열 안 칸들도 순차 등장
        });
      } else {
        // 같은 열 — 살짝 위에서 내려오며 페이드 인
        slotCon.setY(cy - parseInt(fs(6)));
        scene.tweens.add({
          targets: slotCon, y: cy, alpha: 1,
          duration: 180, ease: 'Cubic.easeOut',
          delay: row * 30,
        });
      }
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
