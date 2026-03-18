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

    const fs    = scene._fs.bind(scene);
    const pm    = scene._pm;
    const aX    = scene._slotAreaX + pm;
    const aY    = scene._slotAreaY + pm;
    const aW    = scene._slotAreaW - pm * 2;
    const aH    = scene._slotAreaH - pm * 2;
    const count = scene._party.length;

    // ── 빈 상태 ─────────────────────────────────────────────────
    if(count === 0){
      scene._slotContainer.removeAll(true);
      scene._slotConMap = {};
      scene._slotContainer.add(scene.add.text(aX + aW/2, aY + aH/2,
        '캐릭터를 선택하면\n파티에 추가됩니다', {
          fontSize:fs(11), fill:'#2a1808', fontFamily:FontManager.MONO, align:'center', lineSpacing:4,
        }).setOrigin(0.5).setAlpha(0.4));
      return;
    }

    // ── 고정 슬롯 크기 (정사각형, 패널 좌상단 기준 배치) ────────
    //  - 한 열에 최대 6칸
    //  - 슬롯 크기는 고정 (aH / 6의 ~80%) — 패널을 가득 채우지 않음
    const PER_COL = 6;
    const slotSz  = Math.floor((aH - parseInt(fs(3)) * (PER_COL - 1)) / PER_COL * 0.82);
    scene._slotSzCache = slotSz;
    const gap     = parseInt(fs(3));
    const colGap  = parseInt(fs(5));

    const posOf = (idx) => {
      const col = Math.floor(idx / PER_COL);
      const row = idx % PER_COL;
      return {
        cx: aX + col * (slotSz + colGap) + slotSz / 2,
        cy: aY + row * (slotSz + gap)    + slotSz / 2,
        col, row,
      };
    };

    // ── 맵 초기화 ────────────────────────────────────────────────
    if(!scene._slotConMap) scene._slotConMap = {};

    // 빈 힌트가 있으면(이전 count===0) 컨테이너 초기화
    const hadHint = Object.keys(scene._slotConMap).length === 0 && count === 1;
    if(hadHint) scene._slotContainer.removeAll(true);

    // 파티에서 빠진 id 제거
    const currentSet = new Set(scene._party);
    Object.keys(scene._slotConMap).forEach(id => {
      if(!currentSet.has(id)){
        try{ scene._slotConMap[id].destroy(); }catch(e){}
        delete scene._slotConMap[id];
      }
    });

    // 열이 늘었는지 판별 (밀기 애니메이션 트리거)
    const prevCount = scene._slotPrevCount || 0;
    const prevCols  = Math.ceil(Math.max(prevCount, 1) / PER_COL);
    const newCols   = Math.ceil(count / PER_COL);
    const colAdded  = newCols > prevCols;
    scene._slotPrevCount = count;

    scene._party.forEach((charId, idx) => {
      const { cx, cy, row } = posOf(idx);
      const isNew = !scene._slotConMap[charId];

      // ── 기존 슬롯: 열이 늘 때만 위치 트윈, 나머지는 그대로 ───
      if(!isNew){
        const con = scene._slotConMap[charId];
        if(colAdded){
          scene.tweens.add({ targets:con, x:cx, y:cy, duration:220, ease:'Cubic.easeOut' });
        } else {
          con.setPosition(cx, cy);
        }
        con._refreshSel && con._refreshSel();

        // 히트박스 재등록 (월드 좌표)
        const hit = scene.add.rectangle(cx, cy, slotSz, slotSz, 0, 0)
          .setInteractive({ useHandCursor:true }).setDepth(22);
        scene._slotHits.push(hit);
        PS_RightPanel._bindHit(scene, hit, charId);
        return;
      }

      // ── 신규 슬롯 빌드 ───────────────────────────────────────
      const char  = scene._chars.find(c => c.id === charId);
      if(!char) return;
      const cogC  = CharacterManager.getCogColor(char.cog);
      const isSel = () => scene._slotSelected === charId;

      const con = scene.add.container(cx, cy).setAlpha(0);
      scene._slotContainer.add(con);
      scene._slotConMap[charId] = con;

      // 배경
      const bg = scene.add.graphics();
      const drawBg = (hov) => {
        bg.clear();
        if(isSel())   { bg.fillStyle(0x2a0808,1); bg.lineStyle(2,0xff4444,1); }
        else if(hov)  { bg.fillStyle(0x1e1a10,1); bg.lineStyle(2,cogC.phaser,1); }
        else          { bg.fillStyle(0x110e08,1); bg.lineStyle(1,cogC.phaser,0.55); }
        bg.fillRect(-slotSz/2,-slotSz/2,slotSz,slotSz);
        bg.strokeRect(-slotSz/2,-slotSz/2,slotSz,slotSz);
      };
      drawBg(false);
      con.add(bg);

      // 스프라이트 (상단 62%)
      const portH = Math.round(slotSz * 0.62);
      const portY = -slotSz/2 + portH/2;
      const pBg = scene.add.graphics();
      pBg.fillStyle(0x030303,0.65);
      pBg.fillRect(-slotSz/2+1,-slotSz/2+1,slotSz-2,portH-1);
      con.add(pBg);

      if(char.spriteKey && scene.textures.exists(char.spriteKey)){
        const img = scene.add.image(0, portY, char.spriteKey).setOrigin(0.5);
        img.setScale(Math.min((slotSz-4)/img.width, (portH-4)/img.height));
        con.add(img);
      } else {
        const JS = {fisher:'F',diver:'D',ai:'AI'};
        con.add(scene.add.text(0, portY, JS[char.job]||'?', {
          fontSize:fs(11), fill:'#2a3038', fontFamily:FontManager.MONO,
        }).setOrigin(0.5));
      }

      // 이름 (하단)
      const nameY = -slotSz/2 + portH + (slotSz - portH)/2;
      con.add(scene.add.text(0, nameY, char.name, {
        fontSize:fs(6), fill:'#c8bfb0', fontFamily:FontManager.TITLE,
        wordWrap:{width:slotSz-4}, align:'center',
      }).setOrigin(0.5));

      // Cog 뱃지 좌상단
      con.add(scene.add.text(-slotSz/2+2,-slotSz/2+2, `C${char.cog}`, {
        fontSize:fs(6), fill:cogC.css, fontFamily:FontManager.MONO,
      }).setOrigin(0,0));

      // × 마크 우상단 (선택 시만 표시)
      const xMark = scene.add.text(slotSz/2-2,-slotSz/2+1, '×', {
        fontSize:fs(9), fill:'#ff4444', fontFamily:FontManager.MONO,
      }).setOrigin(1,0).setVisible(false);
      con.add(xMark);

      con._drawBg    = drawBg;
      con._refreshSel = () => { xMark.setVisible(isSel()); drawBg(false); };

      // 히트박스
      const hit = scene.add.rectangle(cx, cy, slotSz, slotSz, 0, 0)
        .setInteractive({ useHandCursor:true }).setDepth(22);
      scene._slotHits.push(hit);
      PS_RightPanel._bindHit(scene, hit, charId);

      // ── 등장 애니메이션 ──────────────────────────────────────
      // 새 열(colAdded) → 오른쪽에서 스윽 슬라이드 인, 열 내 칸 순차
      // 같은 열 추가   → 페이드 인만 (깜빡임 없이 부드럽게)
      if(colAdded){
        con.setX(cx + slotSz * 0.6);
        scene.tweens.add({
          targets:con, x:cx, alpha:1,
          duration:220, ease:'Cubic.easeOut', delay: row * 20,
        });
      } else {
        scene.tweens.add({
          targets:con, alpha:1,
          duration:160, ease:'Sine.easeOut',
        });
      }
    });
  },

  // 슬롯 히트박스 이벤트 바인딩
  _bindHit(scene, hit, charId) {
    const con = () => scene._slotConMap && scene._slotConMap[charId];
    hit.on('pointerover', () => { con() && con()._drawBg && con()._drawBg(true);  });
    hit.on('pointerout',  () => { con() && con()._drawBg && con()._drawBg(false); });
    hit.on('pointerup', () => {
      if(scene._slotSelected === charId){
        scene._slotSelected = null;
        scene._removeFromPartyById(charId);
      } else {
        scene._slotSelected = charId;
        // 선택 상태 시각만 갱신 — 전체 재빌드 없이
        Object.values(scene._slotConMap||{}).forEach(c => c._refreshSel && c._refreshSel());
        // 히트박스만 재등록
        scene._slotHits.forEach(h=>{ try{h.destroy();}catch(e){} });
        scene._slotHits = [];
        scene._party.forEach((id, idx) => {
          const { cx, cy } = PS_RightPanel._posOf(scene, idx);
          const sz = scene._slotSzCache;
          if(!sz) return;
          const h = scene.add.rectangle(cx, cy, sz, sz, 0, 0)
            .setInteractive({ useHandCursor:true }).setDepth(22);
          scene._slotHits.push(h);
          PS_RightPanel._bindHit(scene, h, id);
        });
        const ch = scene._chars.find(c => c.id === charId);
        if(ch) PS_CenterPanel.openProfile(scene, ch);
      }
    });
  },

  // 위치 계산 (외부 재사용용)
  _posOf(scene, idx) {
    const sz     = scene._slotSzCache || 0;
    const pm     = scene._pm;
    const aX     = scene._slotAreaX + pm;
    const aY     = scene._slotAreaY + pm;
    const fs     = n => FontManager.adjustedSize(n, scene.scale);
    const gap    = parseInt(fs(3));
    const colGap = parseInt(fs(5));
    const PER_COL = 6;
    const col = Math.floor(idx / PER_COL);
    const row = idx % PER_COL;
    return {
      cx: aX + col * (sz + colGap) + sz / 2,
      cy: aY + row * (sz + gap)    + sz / 2,
      col, row,
    };
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
