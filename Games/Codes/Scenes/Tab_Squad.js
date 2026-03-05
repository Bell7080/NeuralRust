// ================================================================
//  Tab_Squad.js
//  경로: Games/Codes/Scenes/Tab_Squad.js
//
//  레이아웃 (이미지3 참고)
//  ┌──────────────────────────────────────────────┐
//  │                                              │
//  │   [←]  [캐릭터 카드 슬라이드]  [→]          │
//  │                                              │
//  │         ┌─────3×3 배치판─────┐              │
//  │         │  [칸][칸][칸]       │              │
//  │         │  [칸][칸][칸]       │              │
//  │         │  [칸][칸][칸]       │              │
//  │         └────────────────────┘              │
//  │  [ 직업 필터 ]  [ Cog 필터 ]                 │
//  └──────────────────────────────────────────────┘
// ================================================================

class Tab_Squad {
  constructor(scene, W, H) {
    this.scene = scene;
    this.W = W;
    this.H = H;
    this._container = scene.add.container(0, 0);

    this._squad        = CharacterManager.loadSquad(); // 9 슬롯
    this._selectedSlot = null;   // 선택된 배치 슬롯 인덱스
    this._filterJob    = 'all';
    this._filterCog    = 'all';
    this._sliderOffset = 0;
    this._dragging     = false;
    this._dragStartX   = 0;
    this._dragStartOff = 0;

    this._build();
  }

  _build() {
    const { scene, W, H } = this;

    const panelX = W * 0.14;
    const panelY = H * 0.13;
    const panelW = W * 0.72;
    const panelH = H * 0.76;

    // 패널 배경
    const bg = scene.add.graphics();
    bg.fillStyle(0x0d0a06,0.97);
    bg.lineStyle(1,0x4a2a10,0.8);
    bg.strokeRect(panelX, panelY, panelW, panelH);
    bg.fillRect(panelX, panelY, panelW, panelH);
    this._container.add(bg);

    // 헤더
    const hdr = scene.add.text(panelX+16, panelY+16, '[ 탐 사 대 ]', {
      fontSize:scaledFontSize(12,scene.scale), fill:'#5a3818', fontFamily:FontManager.MONO,
    }).setOrigin(0,0);
    this._container.add(hdr);

    const cx = panelX + panelW/2;

    // ── 필터 바 ───────────────────────────────────────────
    this._filterY = panelY + panelH - parseInt(scaledFontSize(36,scene.scale));
    this._buildFilters(panelX, panelW, this._filterY);

    // ── 3×3 배치판 ────────────────────────────────────────
    const gridSize  = Math.min(panelW * 0.42, panelH * 0.46);
    const cellSize  = gridSize / 3;
    const gridX     = cx - gridSize/2;
    const gridY     = panelY + panelH*0.46 - gridSize/2;
    this._gridX     = gridX;
    this._gridY     = gridY;
    this._cellSize  = cellSize;
    this._gridCells = [];
    this._buildGrid(gridX, gridY, cellSize);

    // ── 캐릭터 슬라이더 ───────────────────────────────────
    this._sliderAreaX = panelX + 10;
    this._sliderAreaY = panelY + parseInt(scaledFontSize(44,scene.scale));
    this._sliderAreaW = panelW - 20;
    this._sliderAreaH = parseInt(scaledFontSize(110,scene.scale));
    this._buildSlider();
    this._buildSliderDrag();
  }

  // ── 3×3 격자 ──────────────────────────────────────────────────
  _buildGrid(gx, gy, cs) {
    const { scene } = this;
    const chars = CharacterManager.loadAll() || [];

    for (let row=0; row<3; row++) {
      for (let col=0; col<3; col++) {
        const idx  = row*3 + col;
        const cx   = gx + col*cs + cs/2;
        const cyy  = gy + row*cs + cs/2;
        const cell = this._makeGridCell(idx, cx, cyy, cs*0.88, chars);
        this._gridCells.push(cell);
      }
    }

    // 격자 외곽
    const outline = scene.add.graphics();
    outline.lineStyle(1, 0x4a2a10, 0.6);
    outline.strokeRect(gx, gy, cs*3, cs*3);
    // 진입 칸 표시 (오른쪽)
    const entX = gx + cs*3 + 8;
    scene.add.text(entX, gy + cs*1.5, '← 입구', {
      fontSize:scaledFontSize(9,scene.scale), fill:'#5a3010', fontFamily:FontManager.MONO,
    }).setOrigin(0,0.5);
    // 잠수정 표시 (왼쪽)
    const subX = gx - 8;
    scene.add.text(subX, gy + cs*1.5, '잠수정 →', {
      fontSize:scaledFontSize(9,scene.scale), fill:'#304858', fontFamily:FontManager.MONO,
    }).setOrigin(1,0.5);
    this._container.add(outline);
  }

  _makeGridCell(idx, cx, cy, size, chars) {
    const { scene } = this;
    const charId = this._squad[idx];
    const char   = charId ? chars.find(c=>c.id===charId) : null;

    const JOB_COLOR  = { fisher:0x1a3050, diver:0x1a3020, ai:0x2a1a3a };
    const JOB_BORDER = { fisher:0x3a6888, diver:0x3a7050, ai:0x6a4888 };

    const cellBg = scene.add.graphics();
    const drawCell = (hover=false, selected=false) => {
      cellBg.clear();
      const fillC = char ? (JOB_COLOR[char.job]||0x181410) : 0x0e0b07;
      const lineC = selected ? 0xffd060 : hover ? 0x8a6030 : char ? (JOB_BORDER[char.job]||0x3a2010) : 0x2a1a08;
      cellBg.fillStyle(fillC,1);
      cellBg.lineStyle(selected?2:1,lineC,0.9);
      cellBg.strokeRect(cx-size/2, cy-size/2, size, size);
      cellBg.fillRect(cx-size/2, cy-size/2, size, size);
    };
    drawCell();
    this._container.add(cellBg);

    // 캐릭터 있으면 아이콘+이름
    let iconObj=null, nameObj=null;
    if (char) {
      iconObj = scene.add.text(cx, cy-4,
        char.job==='fisher'?'🎣':char.job==='diver'?'🤿':'🤖',{
        fontSize:scaledFontSize(14,scene.scale)
      }).setOrigin(0.5);
      nameObj = scene.add.text(cx, cy+size*0.28, char.name,{
        fontSize:scaledFontSize(7,scene.scale), fill:'#c8a060', fontFamily:FontManager.MONO,
      }).setOrigin(0.5);
      this._container.add([iconObj, nameObj]);
    } else {
      const emptyT = scene.add.text(cx, cy, `${idx+1}`,{
        fontSize:scaledFontSize(10,scene.scale), fill:'#2a1a08', fontFamily:FontManager.MONO,
      }).setOrigin(0.5);
      this._container.add(emptyT);
    }

    // 히트 영역
    const hit = scene.add.rectangle(cx, cy, size, size, 0,0)
      .setInteractive({useHandCursor:true});
    hit.on('pointerover',  ()=>{ if(this._selectedSlot!==idx) drawCell(true,false); });
    hit.on('pointerout',   ()=>{ drawCell(false, this._selectedSlot===idx); });
    hit.on('pointerup', ()=>{
      if (this._selectedSlot === idx) {
        // 이미 선택된 칸 재클릭 → 해제 또는 제거
        this._removeFromSlot(idx);
      } else {
        this._selectedSlot = idx;
        this._rebuildGrid();
      }
    });
    this._container.add(hit);

    return { idx, drawCell, cellBg, hit };
  }

  _removeFromSlot(idx) {
    this._squad[idx] = null;
    CharacterManager.saveSquad(this._squad);
    this._selectedSlot = null;
    this._rebuildGrid();
  }

  _rebuildGrid() {
    // 격자 재빌드 (선택 상태 반영)
    this._gridCells.forEach(cell => {
      cell.drawCell(false, this._selectedSlot === cell.idx);
    });
  }

  // ── 슬라이더 (가로 스크롤 캐릭터 선택) ───────────────────────
  _buildSlider() {
    const { scene } = this;
    const aX = this._sliderAreaX;
    const aY = this._sliderAreaY;
    const aW = this._sliderAreaW;
    const aH = this._sliderAreaH;

    // 영역 배경
    const areaBg = scene.add.graphics();
    areaBg.fillStyle(0x0a0807,0.6);
    areaBg.lineStyle(1,0x2a1a08,0.6);
    areaBg.strokeRect(aX, aY, aW, aH);
    areaBg.fillRect(aX, aY, aW, aH);
    this._container.add(areaBg);

    // 슬라이더 레이블
    const lbl = scene.add.text(aX+8, aY+6, '편성할 캐릭터 선택  ·  칸 선택 후 클릭', {
      fontSize:scaledFontSize(8,scene.scale), fill:'#3a2510', fontFamily:FontManager.MONO,
    }).setOrigin(0,0);
    this._container.add(lbl);

    // 카드 컨테이너
    this._sliderRow = scene.add.container(aX, aY + parseInt(scaledFontSize(18,scene.scale)));
    const maskGfx2 = scene.add.graphics();
    maskGfx2.fillStyle(0xffffff,1);
    maskGfx2.fillRect(aX, aY+parseInt(scaledFontSize(18,scene.scale)), aW, aH-parseInt(scaledFontSize(18,scene.scale)));
    this._sliderRow.setMask(maskGfx2.createGeometryMask());
    this._container.add(this._sliderRow);
    this._sliderMaskGfx = maskGfx2;

    this._sliderCardW   = parseInt(scaledFontSize(78,scene.scale));
    this._sliderCardH   = parseInt(scaledFontSize(82,scene.scale));
    this._sliderCardGap = parseInt(scaledFontSize(8,scene.scale));

    this._populateSlider();
  }

  _populateSlider() {
    if (this._sliderRow) {
      this._sliderRow.removeAll(true);
    }
    const { scene } = this;
    const chars = CharacterManager.loadAll() || [];
    const filtered = this._applyFilter(chars);
    const cw = this._sliderCardW;
    const ch = this._sliderCardH;
    const gap = this._sliderCardGap;

    filtered.forEach((char, i) => {
      const cx = i * (cw + gap);
      const c  = this._makeSliderCard(char, cx, 0, cw, ch);
      this._sliderRow.add(c);
    });
    this._sliderTotalW = filtered.length*(cw+gap) - gap;
    this._sliderOffset = Math.max(-(Math.max(0, this._sliderTotalW - this._sliderAreaW)), Math.min(0, this._sliderOffset));
    this._sliderRow.x  = this._sliderAreaX + this._sliderOffset;
  }

  _makeSliderCard(char, x, y, cw, ch) {
    const { scene } = this;
    const inSquad = this._squad.includes(char.id);
    const JOB_COLOR  = { fisher:0x1a3050, diver:0x1a3020, ai:0x2a1a3a };
    const JOB_BORDER = { fisher:0x3a6888, diver:0x3a7050, ai:0x6a4888 };

    const c   = scene.add.container(x, y);
    const cbg = scene.add.graphics();
    const drawCbg = (hover=false) => {
      cbg.clear();
      const fillC  = inSquad ? 0x302010 : (JOB_COLOR[char.job]||0x181410);
      const lineC  = inSquad ? 0xffd060 : hover ? 0x8a6030 : (JOB_BORDER[char.job]||0x3a2010);
      const alpha  = inSquad ? 0.5 : 1;
      cbg.fillStyle(fillC,alpha);
      cbg.lineStyle(inSquad?2:1,lineC,0.9);
      cbg.strokeRect(0,0,cw,ch);
      cbg.fillRect(0,0,cw,ch);
    };
    drawCbg();

    const icon = scene.add.text(cw/2, ch*0.28,
      char.job==='fisher'?'🎣':char.job==='diver'?'🤿':'🤖',{
      fontSize:scaledFontSize(14,scene.scale)
    }).setOrigin(0.5);
    const nameT = scene.add.text(cw/2, ch*0.54, char.name,{
      fontSize:scaledFontSize(8,scene.scale), fill:'#c8a060', fontFamily:FontManager.TITLE,
    }).setOrigin(0.5,0);
    const cogT = scene.add.text(cw/2, ch*0.72, `Cog${char.cog}`,{
      fontSize:scaledFontSize(7,scene.scale), fill:'#7a5030', fontFamily:FontManager.MONO,
    }).setOrigin(0.5,0);
    if (inSquad) {
      const inT = scene.add.text(cw/2, ch*0.88, '배치됨',{
        fontSize:scaledFontSize(7,scene.scale), fill:'#c89030', fontFamily:FontManager.MONO,
      }).setOrigin(0.5,0);
      c.add(inT);
    }
    c.add([cbg, icon, nameT, cogT]);

    const hit = scene.add.rectangle(cw/2, ch/2, cw, ch, 0,0)
      .setInteractive({useHandCursor: !inSquad});
    hit.on('pointerover', ()=>{ if(!inSquad) drawCbg(true); });
    hit.on('pointerout',  ()=>{ drawCbg(false); });
    hit.on('pointerup', ()=>{
      if (this._sliderDragged) return;
      if (inSquad) return;
      if (this._selectedSlot === null) {
        this._showToast('먼저 배치할 칸을 선택하세요');
        return;
      }
      // 배치 실행
      this._squad[this._selectedSlot] = char.id;
      CharacterManager.saveSquad(this._squad);
      this._selectedSlot = null;
      this._rebuildGridFull();
      this._populateSlider();
    });
    c.add(hit);
    return c;
  }

  _rebuildGridFull() {
    // 격자 전체 재빌드 (배치 변경 후)
    this._gridCells.forEach(cell => {
      cell.cellBg.destroy();
      cell.hit.destroy();
    });
    this._gridCells = [];
    const chars = CharacterManager.loadAll() || [];
    const { _gridX:gx, _gridY:gy, _cellSize:cs } = this;
    for (let row=0; row<3; row++) {
      for (let col=0; col<3; col++) {
        const idx  = row*3+col;
        const cx   = gx+col*cs+cs/2;
        const cyy  = gy+row*cs+cs/2;
        const cell = this._makeGridCell(idx, cx, cyy, cs*0.88, chars);
        this._gridCells.push(cell);
      }
    }
  }

  _applyFilter(chars) {
    return chars.filter(c => {
      const jobOk = this._filterJob==='all' || c.job===this._filterJob;
      const cogOk = this._filterCog==='all' || c.cog===parseInt(this._filterCog);
      return jobOk && cogOk;
    });
  }

  // ── 필터 바 ───────────────────────────────────────────────────
  _buildFilters(panelX, panelW, fy) {
    const { scene } = this;
    const cx = panelX + panelW/2;

    // 직업 필터
    const jobFilters = [{key:'all',label:'전체'},{key:'fisher',label:'낚시꾼'},{key:'diver',label:'잠수부'},{key:'ai',label:'AI'}];
    const cogFilters = [{key:'all',label:'전체'},...[1,2,3,4,5,6,7].map(n=>({key:`${n}`,label:`Cog${n}`}))];

    let bx = panelX + 16;
    jobFilters.forEach(f => {
      bx = this._makeFilterBtn(bx, fy+6, f.label, ()=>{
        this._filterJob = f.key;
        this._populateSlider();
        this._rebuildFilterBar(panelX, panelW, fy);
      }, this._filterJob===f.key);
    });

    bx += 14;
    cogFilters.forEach(f => {
      bx = this._makeFilterBtn(bx, fy+6, f.label, ()=>{
        this._filterCog = f.key;
        this._populateSlider();
        this._rebuildFilterBar(panelX, panelW, fy);
      }, this._filterCog===f.key);
    });
  }

  _filterBarObjs = [];
  _rebuildFilterBar(panelX, panelW, fy) {
    this._filterBarObjs.forEach(o=>o.destroy());
    this._filterBarObjs = [];
    // 재빌드 (선택 상태 반영)
    const { scene } = this;
    const jobFilters = [{key:'all',label:'전체'},{key:'fisher',label:'낚시꾼'},{key:'diver',label:'잠수부'},{key:'ai',label:'AI'}];
    const cogFilters = [{key:'all',label:'전체'},...[1,2,3,4,5,6,7].map(n=>({key:`${n}`,label:`Cog${n}`}))];
    let bx = panelX + 16;
    jobFilters.forEach(f => {
      bx = this._makeFilterBtn(bx, fy+6, f.label, ()=>{
        this._filterJob=f.key; this._populateSlider(); this._rebuildFilterBar(panelX,panelW,fy);
      }, this._filterJob===f.key, true);
    });
    bx += 14;
    cogFilters.forEach(f => {
      bx = this._makeFilterBtn(bx, fy+6, f.label, ()=>{
        this._filterCog=f.key; this._populateSlider(); this._rebuildFilterBar(panelX,panelW,fy);
      }, this._filterCog===f.key, true);
    });
  }

  _makeFilterBtn(x, y, label, onClick, active, tracked=false) {
    const { scene } = this;
    const fs   = scaledFontSize(9, scene.scale);
    const tmp  = scene.add.text(0,-9999,label,{fontSize:fs,fontFamily:FontManager.MONO});
    const bw   = tmp.width + 14; tmp.destroy();
    const bh   = parseInt(scaledFontSize(20, scene.scale));

    const bg = scene.add.graphics();
    const draw = (h) => {
      bg.clear();
      bg.fillStyle(active?(h?0x3a2810:0x2a1c0a):( h?0x1a1208:0x0e0a05),1);
      bg.lineStyle(1,active?0x8a5820:(h?0x4a2810:0x2a1808),0.9);
      bg.strokeRect(x,y,bw,bh); bg.fillRect(x,y,bw,bh);
    };
    draw(false);
    const txt = scene.add.text(x+bw/2, y+bh/2, label,{
      fontSize:fs, fill:active?'#e8a040':'#5a3818', fontFamily:FontManager.MONO,
    }).setOrigin(0.5);
    const hit = scene.add.rectangle(x+bw/2, y+bh/2, bw, bh, 0,0)
      .setInteractive({useHandCursor:true});
    hit.on('pointerover',()=>draw(true));
    hit.on('pointerout', ()=>draw(false));
    hit.on('pointerup',  onClick);

    if (tracked) this._filterBarObjs.push(bg,txt,hit);
    else { this._container.add(bg); this._container.add(txt); this._container.add(hit); }

    return x + bw + 4;
  }

  // ── 슬라이더 드래그 ───────────────────────────────────────────
  _buildSliderDrag() {
    const { scene } = this;
    const aX = this._sliderAreaX;
    const aY = this._sliderAreaY;
    const aW = this._sliderAreaW;
    const aH = this._sliderAreaH;

    const dragHit = scene.add.rectangle(aX+aW/2, aY+aH/2, aW, aH, 0,0)
      .setInteractive({useHandCursor:true, draggable:true}).setDepth(5);
    this._container.add(dragHit);

    this._sliderDragged = false;
    let startX = 0; let startOff = 0;

    dragHit.on('pointerdown', (ptr) => {
      startX = ptr.x; startOff = this._sliderOffset; this._sliderDragged = false;
    });
    dragHit.on('pointermove', (ptr) => {
      if(!ptr.isDown) return;
      const dx = ptr.x - startX;
      if(Math.abs(dx)>5) this._sliderDragged = true;
      if(!this._sliderDragged) return;
      const maxOff = -(Math.max(0, this._sliderTotalW - aW));
      this._sliderOffset = Math.max(maxOff, Math.min(0, startOff+dx));
      this._sliderRow.x  = aX + this._sliderOffset;
    });
    dragHit.on('pointerup', ()=>{
      scene.time.delayedCall(50, ()=>{ this._sliderDragged=false; });
    });

    scene.input.on('wheel', (ptr,objs,dx,dy)=>{
      if(ptr.x<aX||ptr.x>aX+aW||ptr.y<aY||ptr.y>aY+aH) return;
      const maxOff = -(Math.max(0, this._sliderTotalW - aW));
      this._sliderOffset = Math.max(maxOff, Math.min(0, this._sliderOffset - dy*0.6));
      this._sliderRow.x  = aX + this._sliderOffset;
    });
  }

  _showToast(msg) {
    const {scene,W,H} = this;
    const t = scene.add.text(W/2,H*0.5,msg,{
      fontSize:scaledFontSize(14,scene.scale),fill:'#cc5533',fontFamily:FontManager.MONO,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    scene.tweens.add({targets:t,alpha:1,duration:200,onComplete:()=>{
      scene.time.delayedCall(1200,()=>{
        scene.tweens.add({targets:t,alpha:0,duration:300,onComplete:()=>t.destroy()});
      });
    }});
  }

  show()    { this._container.setVisible(true);  }
  hide()    { this._container.setVisible(false); }
  destroy() { this._container.destroy(); }
}
