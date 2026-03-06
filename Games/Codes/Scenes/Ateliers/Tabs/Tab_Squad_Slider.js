// ================================================================
//  Tab_Squad_Slider.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Squad_Slider.js
//
//  역할: 탐사대 탭 — 캐릭터 슬라이더, 필터 바, 드래그, 생명주기
//  의존: Tab_Squad.js (prototype 확장)
// ================================================================

Object.assign(Tab_Squad.prototype, {

  _buildSlider() {
    const { scene } = this;
    const { _sliderAreaX: aX, _sliderAreaY: aY, _sliderAreaW: aW, _sliderAreaH: aH } = this;

    const areaBg = scene.add.graphics();
    areaBg.fillStyle(0x0a0807, 0.6);
    areaBg.lineStyle(1, 0x2a1a08, 0.6);
    areaBg.strokeRect(aX, aY, aW, aH);
    areaBg.fillRect(aX, aY, aW, aH);
    this._container.add(areaBg);

    this._container.add(scene.add.text(aX + 8, aY + 6,
      '배치할 캐릭터 선택  ·  칸 선택 후 클릭  ·  배치된 칸 클릭으로 회수', {
      fontSize: scaledFontSize(8, scene.scale), fill: '#3a2510', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));

    const labelH   = parseInt(scaledFontSize(18, scene.scale));
    this._sliderRow = scene.add.container(aX, aY + labelH);

    const maskGfx2 = scene.add.graphics();
    maskGfx2.fillStyle(0xffffff, 1);
    maskGfx2.fillRect(aX, aY + labelH, aW, aH - labelH);
    maskGfx2.setVisible(false);
    this._sliderRow.setMask(maskGfx2.createGeometryMask());
    this._container.add(this._sliderRow);
    this._sliderMaskGfx = maskGfx2;

    this._sliderCardW   = parseInt(scaledFontSize(78, scene.scale));
    this._sliderCardH   = parseInt(scaledFontSize(82, scene.scale));
    this._sliderCardGap = parseInt(scaledFontSize(8,  scene.scale));
    this._populateSlider();
  },

  _populateSlider() {
    if (this._sliderRow) this._sliderRow.removeAll(true);
    const chars    = CharacterManager.loadAll() || [];
    const filtered = this._applyFilter(chars);
    const { _sliderCardW: cw, _sliderCardH: ch, _sliderCardGap: gap,
            _sliderAreaW: aW, _sliderAreaX: aX } = this;

    filtered.forEach((char, i) => {
      this._sliderRow.add(this._makeSliderCard(char, i * (cw + gap), 0, cw, ch));
    });
    this._sliderTotalW = filtered.length * (cw + gap) - gap;
    this._sliderOffset = Math.max(-(Math.max(0, this._sliderTotalW - aW)), Math.min(0, this._sliderOffset));
    this._sliderRow.x  = aX + this._sliderOffset;
  },

  _makeSliderCard(char, x, y, cw, ch) {
    const { scene } = this;

    // 이 캐릭터가 몇 개 슬롯에 배치됐는지
    const deployCount = this._squad.reduce((acc, slot) => {
      return acc + (Array.isArray(slot) ? slot.filter(id => id === char.id).length : 0);
    }, 0);
    const inSquad = deployCount > 0;

    const JOB_COLOR  = { fisher: 0x1a3050, diver: 0x1a3020, ai: 0x2a1a3a };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };
    const JOB_SHORT  = { fisher: 'FISH',   diver: 'DIVE',   ai: 'A·I'   };

    const c   = scene.add.container(x, y);
    const cbg = scene.add.graphics();
    const drawCbg = (hover = false) => {
      cbg.clear();
      cbg.fillStyle(inSquad ? 0x302010 : (JOB_COLOR[char.job] || 0x181410), inSquad ? 0.5 : 1);
      cbg.lineStyle(inSquad ? 2 : 1, inSquad ? 0xffd060 : hover ? 0x8a6030 : (JOB_BORDER[char.job] || 0x3a2010), 0.9);
      cbg.strokeRect(0, 0, cw, ch);
      cbg.fillRect(0, 0, cw, ch);
    };
    drawCbg();

    const items = [cbg,
      scene.add.text(cw/2, ch*0.22, JOB_SHORT[char.job]||'???',
        { fontSize:scaledFontSize(9,scene.scale), fill:'#5a7888', fontFamily:FontManager.MONO }).setOrigin(0.5),
      scene.add.text(cw/2, ch*0.42, char.name,
        { fontSize:scaledFontSize(8,scene.scale), fill:'#c8a060', fontFamily:FontManager.TITLE }).setOrigin(0.5,0),
      scene.add.text(cw/2, ch*0.62, `Cog${char.cog}`,
        { fontSize:scaledFontSize(7,scene.scale), fill:'#7a5030', fontFamily:FontManager.MONO }).setOrigin(0.5,0),
    ];

    if (inSquad) {
      items.push(
        scene.add.text(cw/2, ch*0.80, `배치 ${deployCount}`,
          { fontSize:scaledFontSize(7,scene.scale), fill:'#c89030', fontFamily:FontManager.MONO }).setOrigin(0.5,0)
      );
    }
    c.add(items);

    const hit = scene.add.rectangle(cw/2, ch/2, cw, ch, 0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { if (!this._sliderDragged) drawCbg(true); });
    hit.on('pointerout',  () => drawCbg(false));
    hit.on('pointerup',   () => {
      if (this._sliderDragged) return;
      if (this._selectedSlot === null) {
        this._showToast('먼저 배치할 칸을 선택하세요');
        return;
      }
      const slot = this._squad[this._selectedSlot] || [];
      if (slot.length >= 3) {
        this._showToast('해당 칸은 이미 가득 찼습니다 (최대 3명)');
        return;
      }
      // 같은 슬롯에 같은 캐릭터 중복 배치 방지
      if (slot.includes(char.id)) {
        this._showToast('이미 같은 칸에 배치된 캐릭터입니다');
        return;
      }
      slot.push(char.id);
      this._squad[this._selectedSlot] = slot;
      CharacterManager.saveSquad(this._squad);

      // 슬롯이 꽉 찼으면 선택 해제, 아니면 유지
      if (slot.length >= 3) this._selectedSlot = null;
      this._updateHint();
      this._rebuildGridFull();
      this._populateSlider();
    });
    c.add(hit);
    return c;
  },

  _applyFilter(chars) {
    return chars.filter(c => {
      const jobOk = this._filterJob === 'all' || c.job === this._filterJob;
      const cogOk = this._filterCog === 'all' || c.cog === parseInt(this._filterCog);
      return jobOk && cogOk;
    });
  },

  _buildFilters(panelX, panelW, fy) {
    const JOB = [
      {key:'all',label:'전체'},{key:'fisher',label:'낚시꾼'},
      {key:'diver',label:'잠수부'},{key:'ai',label:'AI'},
    ];
    const COG = [
      {key:'all',label:'전체'},
      ...[1,2,3,4,5,6,7].map(n=>({key:`${n}`,label:`Cog${n}`})),
    ];
    let bx = panelX + 16;
    JOB.forEach(f => {
      bx = this._makeFilterBtn(bx, fy+6, f.label, ()=>{ this._filterJob=f.key; this._populateSlider(); this._rebuildFilterBar(panelX,panelW,fy); }, this._filterJob===f.key);
    });
    bx += 14;
    COG.forEach(f => {
      bx = this._makeFilterBtn(bx, fy+6, f.label, ()=>{ this._filterCog=f.key; this._populateSlider(); this._rebuildFilterBar(panelX,panelW,fy); }, this._filterCog===f.key);
    });
  },

  _rebuildFilterBar(panelX, panelW, fy) {
    this._filterBarObjs.forEach(o => o.destroy());
    this._filterBarObjs = [];
    const JOB = [
      {key:'all',label:'전체'},{key:'fisher',label:'낚시꾼'},
      {key:'diver',label:'잠수부'},{key:'ai',label:'AI'},
    ];
    const COG = [
      {key:'all',label:'전체'},
      ...[1,2,3,4,5,6,7].map(n=>({key:`${n}`,label:`Cog${n}`})),
    ];
    let bx = panelX + 16;
    JOB.forEach(f => {
      bx = this._makeFilterBtn(bx, fy+6, f.label, ()=>{ this._filterJob=f.key; this._populateSlider(); this._rebuildFilterBar(panelX,panelW,fy); }, this._filterJob===f.key, true);
    });
    bx += 14;
    COG.forEach(f => {
      bx = this._makeFilterBtn(bx, fy+6, f.label, ()=>{ this._filterCog=f.key; this._populateSlider(); this._rebuildFilterBar(panelX,panelW,fy); }, this._filterCog===f.key, true);
    });
  },

  _makeFilterBtn(x, y, label, onClick, active, tracked = false) {
    const { scene } = this;
    const fs  = scaledFontSize(9, scene.scale);
    const tmp = scene.add.text(0, -9999, label, { fontSize: fs, fontFamily: FontManager.MONO });
    const bw  = tmp.width + 14; tmp.destroy();
    const bh  = parseInt(scaledFontSize(20, scene.scale));
    const bg  = scene.add.graphics();
    const draw = (h) => {
      bg.clear();
      bg.fillStyle(active?(h?0x3a2810:0x2a1c0a):(h?0x1a1208:0x0e0a05),1);
      bg.lineStyle(1,active?0x8a5820:(h?0x4a2810:0x2a1808),0.9);
      bg.strokeRect(x,y,bw,bh); bg.fillRect(x,y,bw,bh);
    };
    draw(false);
    const txt = scene.add.text(x+bw/2,y+bh/2,label,{fontSize:fs,fill:active?'#e8a040':'#5a3818',fontFamily:FontManager.MONO}).setOrigin(0.5);
    const hit = scene.add.rectangle(x+bw/2,y+bh/2,bw,bh,0,0).setInteractive({useHandCursor:true});
    hit.on('pointerover',()=>draw(true));
    hit.on('pointerout', ()=>draw(false));
    hit.on('pointerup',  onClick);
    if (tracked) { this._filterBarObjs.push(bg,txt,hit); }
    else { this._container.add([bg,txt,hit]); }
    return x + bw + 4;
  },

  _buildSliderDrag() {
    const { scene } = this;
    const { _sliderAreaX:aX, _sliderAreaY:aY, _sliderAreaW:aW, _sliderAreaH:aH } = this;
    let startX = 0, startOff = 0;
    const inArea = (ptr) => ptr.x>=aX && ptr.x<=aX+aW && ptr.y>=aY && ptr.y<=aY+aH;

    this._sliderOnDown  = (ptr) => { if (!inArea(ptr)) return; startX=ptr.x; startOff=this._sliderOffset; this._sliderDragged=false; };
    this._sliderOnMove  = (ptr) => {
      if (!ptr.isDown) return;
      const dx = ptr.x - startX;
      if (Math.abs(dx) > 5) this._sliderDragged = true;
      if (!this._sliderDragged) return;
      const maxOff = -(Math.max(0, this._sliderTotalW - aW));
      this._sliderOffset = Math.max(maxOff, Math.min(0, startOff + dx));
      this._sliderRow.x  = aX + this._sliderOffset;
    };
    this._sliderOnUp    = () => { scene.time.delayedCall(50, () => { this._sliderDragged = false; }); };
    this._sliderOnWheel = (ptr, objs, dx, dy) => {
      if (!inArea(ptr)) return;
      const maxOff = -(Math.max(0, this._sliderTotalW - aW));
      this._sliderOffset = Math.max(maxOff, Math.min(0, this._sliderOffset - dy * 0.6));
      this._sliderRow.x  = aX + this._sliderOffset;
    };
    scene.input.on('pointerdown', this._sliderOnDown);
    scene.input.on('pointermove', this._sliderOnMove);
    scene.input.on('pointerup',   this._sliderOnUp);
    scene.input.on('wheel',       this._sliderOnWheel);
  },

  _showToast(msg) {
    const { scene, W, H } = this;
    const t = scene.add.text(W/2, H*0.5, msg, {
      fontSize:scaledFontSize(14,scene.scale), fill:'#cc5533', fontFamily:FontManager.MONO,
    }).setOrigin(0.5).setDepth(500).setAlpha(0);
    scene.tweens.add({ targets:t, alpha:1, duration:200, onComplete:()=>{
      scene.time.delayedCall(1200, ()=>{
        scene.tweens.add({ targets:t, alpha:0, duration:300, onComplete:()=>t.destroy() });
      });
    }});
  },

  show()    { this._container.setVisible(true); },
  hide()    { this._container.setVisible(false); },
  destroy() {
    if (this._sliderMaskGfx) { this._sliderMaskGfx.destroy(); this._sliderMaskGfx = null; }
    const si = this.scene.input;
    if (this._sliderOnDown)  si.off('pointerdown', this._sliderOnDown);
    if (this._sliderOnMove)  si.off('pointermove', this._sliderOnMove);
    if (this._sliderOnUp)    si.off('pointerup',   this._sliderOnUp);
    if (this._sliderOnWheel) si.off('wheel',        this._sliderOnWheel);
    this._container.destroy();
  },

});
