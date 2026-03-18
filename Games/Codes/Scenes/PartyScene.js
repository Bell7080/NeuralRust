// ================================================================
//  PartyScene.js  (REDESIGN v2)
//  경로: Games/Codes/Scenes/PartyScene.js
//
//  레이아웃 (좌50 / 우50):
//
//  LEFT 50%                       RIGHT 50%
//  ┌─────────────────────┐        ┌─────────────────────┐
//  │  파티 슬롯 (28%)    │        │  [초상화] | [스탯]  │  ← 상단 60%
//  │  (가운데 정렬,      │        │  (좌50%)  | (우50%) │
//  │   6칸 초과→2줄)     │        ├─────────────────────┤
//  ├─────────────────────┤        │ [파티현황] | [출발]  │  ← 하단 40%
//  │  필터 (직업/Cog/정렬)│        │  (좌50%)  | (우50%) │
//  ├─────────────────────┤        └─────────────────────┘
//  │  캐릭터 그리드      │
//  │  (3열, 드래그스크롤)│
//  ├─────────────────────┤
//  │  [돌아가기]         │
//  └─────────────────────┘
//
//  인터랙션:
//    카드 1회 클릭  → 우측 프로필 오픈
//    카드 2회 클릭  → 파티 추가 (이미 파티면 제거)
//    파티 슬롯 1회  → 빨간 강조 + 프로필 오픈
//    파티 슬롯 2회  → 파티 제거
//
//  비용: 파티 cog 합산 Arc
// ================================================================

class PartyScene extends Phaser.Scene {
  constructor() { super({ key: 'PartyScene' }); }

  init() {
    this._party         = [];
    this._chars         = [];
    this._sceneHits     = [];
    this._rightObjs     = [];
    this._rightTweens   = [];
    this._manageObjs    = [];
    this._cardObjs      = [];
    this._filterBarObjs = [];
    this._selectedChar  = null;
    this._lastClickId   = null;
    this._slotSelected  = null;
    this._filterJob     = 'all';
    this._filterCog     = 'all';
    this._sortMode      = 'none';
    this._sortOrder     = 'desc';
    this._scrollY       = 0;
    this._totalCardH    = 0;
    this._dragged       = false;
    this._maskGfx       = null;
    this._cardRow       = null;
    this._dragTimer     = null;
    this._dblTimer      = null;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;

    if (typeof InputManager !== 'undefined') InputManager.reinit(this);

    const all      = CharacterManager.loadAll() || [];
    this._chars    = all.filter(c => !c.status || c.status === 'alive' || c.status === 'ai');

    this._fs = n => FontManager.adjustedSize(n, this.scale);

    this._buildBackground();
    this._calcLayout();
    this._buildStructure();
    this._buildPartySlots();
    this._buildFilterBar();
    this._buildCardGrid();
    this._buildBackBtn();
    this._buildRightBg();
    this._buildRightEmpty();
    this._buildManagePanel();
    this._setupDrag();
  }

  // ── 배경 ───────────────────────────────────────────────────────
  _buildBackground() {
    const { W, H } = this;
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    const grid = this.add.graphics();
    const step = Math.round(W / 60);
    grid.lineStyle(1, 0x0c0a06, 0.4);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    this.add.text(W / 2, H / 2, 'NEURAL  RUST', {
      fontSize: this._fs(90), fill: '#080508', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.04);
  }

  // ── 레이아웃 수치 계산 ─────────────────────────────────────────
  _calcLayout() {
    const { W, H } = this;
    const fs = this._fs.bind(this);
    const pm = Math.round(W * 0.010);

    this._pm    = pm;
    this._lw    = Math.floor(W * 0.50);
    this._rw    = W - this._lw;
    this._hdrH  = parseInt(fs(44));
    this._backH = parseInt(fs(52));
    this._bodyY = this._hdrH + pm;
    this._bodyH = H - this._bodyY - this._backH - pm;

    // 슬롯 영역
    this._slotAreaY = this._bodyY + pm;
    this._slotAreaH = Math.round(this._bodyH * 0.28);

    // 필터 영역
    const rowH = parseInt(fs(32));
    this._filterY = this._slotAreaY + this._slotAreaH + parseInt(fs(10));
    this._filterTotalH = rowH * 3 + parseInt(fs(4)) * 2 + parseInt(fs(6));

    // 카드 그리드 영역
    this._cardAreaX = pm + 4;
    this._cardAreaY = this._filterY + this._filterTotalH + parseInt(fs(4));
    this._cardAreaW = this._lw - pm * 2 - 8;
    this._cardAreaH = this._bodyY + this._bodyH - this._cardAreaY - pm;

    // 우측 프로필/관리 분할
    this._profileH = Math.round((H - this._hdrH - pm * 2) * 0.60);
    this._manageY  = this._hdrH + pm + this._profileH;
    this._manageH  = H - this._manageY - pm;
  }

  // ── 구조 (헤더·패널 배경·구분선) ──────────────────────────────
  _buildStructure() {
    const { W, H } = this;
    const fs = this._fs.bind(this);
    const { _pm: pm, _lw: lw, _hdrH: hdrH, _bodyY: bodyY, _bodyH: bodyH, _manageY: manageY } = this;

    // 헤더
    const hBg = this.add.graphics();
    hBg.fillStyle(0x060810, 0.95);
    hBg.lineStyle(1, 0x2a1a08, 0.6);
    hBg.fillRect(0, 0, W, hdrH);
    hBg.strokeRect(0, 0, W, hdrH);
    this.add.text(lw / 2, hdrH / 2, '탐  사  파  티  편  성', {
      fontSize: fs(20), fill: '#6b4020', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    this.add.text(pm + 6, hdrH / 2, '비용 : 파티 Cog 합산 Arc', {
      fontSize: fs(10), fill: '#3a2010', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // 좌측 패널 배경
    const lBg = this.add.graphics();
    lBg.fillStyle(0x05080c, 0.94);
    lBg.lineStyle(1, 0x2a1a08, 0.4);
    lBg.strokeRect(pm, bodyY, lw - pm * 2, bodyH);
    lBg.fillRect(pm, bodyY, lw - pm * 2, bodyH);

    // 슬롯 레이블
    this.add.text(pm + 8, this._slotAreaY, '파  티', {
      fontSize: fs(9), fill: '#3a1e08', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0);
    const slotSep = this.add.graphics();
    slotSep.lineStyle(1, 0x1e1008, 0.5);
    slotSep.lineBetween(pm + 4, this._slotAreaY + this._slotAreaH + 4,
      lw - pm - 4, this._slotAreaY + this._slotAreaH + 4);

    // 좌/우 세로 구분선
    const div = this.add.graphics();
    div.lineStyle(1, 0x1e1008, 0.7);
    div.lineBetween(lw, hdrH, lw, H);

    // 우측 프로필/관리 가로 구분선
    const sepH = this.add.graphics();
    sepH.lineStyle(1, 0x1e1008, 0.6);
    sepH.lineBetween(lw + pm + 4, manageY, W - pm - 4, manageY);

    // 관리 영역 세로 구분선
    const midX = lw + Math.floor(this._rw / 2);
    const sepV = this.add.graphics();
    sepV.lineStyle(1, 0x1e1008, 0.5);
    sepV.lineBetween(midX, manageY + 4, midX, H - pm - 4);
  }

  // ── 파티 슬롯 ──────────────────────────────────────────────────
  _buildPartySlots() {
    if (this._slotContainer) { this._slotContainer.destroy(true); }
    this._slotContainer = this.add.container(0, 0);

    const fs    = this._fs.bind(this);
    const pm    = this._pm;
    const lw    = this._lw;
    const areaY = this._slotAreaY + parseInt(fs(14));
    const areaH = this._slotAreaH - parseInt(fs(14));
    const areaW = lw - pm * 2 - 8;
    const count = this._party.length;

    if (count === 0) {
      const hint = this.add.text(pm + 4 + areaW / 2, areaY + areaH / 2,
        '캐릭터를 선택해 파티에 추가하세요', {
          fontSize: fs(10), fill: '#2a1808', fontFamily: FontManager.MONO,
        }).setOrigin(0.5).setAlpha(0.5);
      this._slotContainer.add(hint);
      return;
    }

    const perRow = 6;
    const rows   = count <= perRow ? 1 : 2;
    const cols   = rows === 1 ? count : Math.ceil(count / 2);
    const slotH  = rows === 1 ? Math.round(areaH * 0.80) : Math.round(areaH * 0.44);
    const slotW  = Math.round(slotH * 0.72);
    const gap    = Math.max(4, Math.round(slotW * 0.10));
    const rowW   = cols * slotW + (cols - 1) * gap;
    const startX = pm + 4 + (areaW - rowW) / 2;

    this._party.forEach((charId, idx) => {
      const char = this._chars.find(c => c.id === charId);
      if (!char) return;

      const row  = rows === 2 ? (idx < Math.ceil(count / 2) ? 0 : 1) : 0;
      const col  = rows === 2 ? (row === 0 ? idx : idx - Math.ceil(count / 2)) : idx;
      const rowStartX = rows === 2
        ? pm + 4 + (areaW - (Math.ceil(count / 2) * slotW + (Math.ceil(count / 2) - 1) * gap)) / 2
        : startX;
      const cx = rowStartX + col * (slotW + gap) + slotW / 2;
      const cy = areaY + row * (slotH + gap) + slotH / 2;

      const isSel = this._slotSelected === charId;
      const cogC  = CharacterManager.getCogColor(char.cog);

      const bg = this.add.graphics();
      const drawBg = (sel) => {
        bg.clear();
        if (sel) {
          bg.fillStyle(0x2a0808, 1);
          bg.lineStyle(2, 0xff4444, 1);
        } else {
          bg.fillStyle(0x1a1008, 1);
          bg.lineStyle(2, cogC.phaser, 0.85);
        }
        bg.fillRect(cx - slotW / 2, cy - slotH / 2, slotW, slotH);
        bg.strokeRect(cx - slotW / 2, cy - slotH / 2, slotW, slotH);
      };
      drawBg(isSel);
      this._slotContainer.add(bg);

      if (this.textures.exists(char.spriteKey)) {
        const img = this.add.image(cx, cy - slotH * 0.06, char.spriteKey)
          .setDisplaySize(slotW * 0.68, slotW * 0.68);
        this._slotContainer.add(img);
      }

      this._slotContainer.add([
        this.add.text(cx, cy - slotH * 0.40, `Cog${char.cog}`, {
          fontSize: fs(7), fill: cogC.css, fontFamily: FontManager.MONO,
        }).setOrigin(0.5),
        this.add.text(cx, cy + slotH * 0.34, char.name, {
          fontSize: fs(7), fill: '#c8bfb0', fontFamily: FontManager.TITLE,
          wordWrap: { width: slotW - 2 }, align: 'center',
        }).setOrigin(0.5),
      ]);

      const hit = this.add.rectangle(cx, cy, slotW, slotH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(22);
      this._sceneHits.push(hit);
      hit.on('pointerup', () => {
        if (this._slotSelected === charId) {
          this._slotSelected = null;
          this._removeFromPartyById(charId);
        } else {
          this._slotSelected = charId;
          this._buildPartySlots();
          const ch = this._chars.find(c => c.id === charId);
          if (ch) this._openProfile(ch);
        }
      });
    });
  }

  // ── 필터바 ─────────────────────────────────────────────────────
  _buildFilterBar() {
    this._filterBarObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    this._filterBarObjs = [];

    const fs  = this._fs.bind(this);
    const pm  = this._pm;
    const fy  = this._filterY;
    const rowH = parseInt(fs(32));

    const JOB = [
      {key:'all',label:'전체'},{key:'fisher',label:'낚시꾼'},
      {key:'diver',label:'잠수부'},{key:'ai',label:'AI'},
    ];
    const COG = [{key:'all',label:'전체'}, ...[1,2,3,4,5,6,7,8,9,10].map(n=>({key:`${n}`,label:`${n}`}))];
    const SORT = [{key:'date',label:'최신순'},{key:'stat',label:'스탯순'}];

    const makeChip = (x, y, label, active, cb, wide = false) => {
      const tmp = this.add.text(-9999, -9999, label, { fontSize: fs(11), fontFamily: FontManager.MONO });
      const bw  = tmp.width + (wide ? 20 : 14);
      tmp.destroy();
      const bg = this.add.graphics();
      const draw = (hov) => {
        bg.clear();
        bg.fillStyle(active?(hov?0x2a1e0c:0x181208):(hov?0x141008:0), active?0.85:0.5);
        bg.lineStyle(1, active?0x9a6020:(hov?0x4a2810:0x221608), 0.9);
        bg.strokeRect(x,y,bw,rowH); bg.fillRect(x,y,bw,rowH);
      };
      draw(false);
      const txt = this.add.text(x + bw/2, y + rowH/2, label, {
        fontSize: fs(11), fill: active?'#e8a040':'#5a3818', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      const hit = this.add.rectangle(x+bw/2, y+rowH/2, bw, rowH, 0, 0)
        .setInteractive({useHandCursor:true}).setDepth(21);
      hit.on('pointerover',()=>draw(true)); hit.on('pointerout',()=>draw(false)); hit.on('pointerup',cb);
      this._filterBarObjs.push(bg,txt,hit);
      return x + bw + 4;
    };
    const addLbl = (x, y, t) => {
      const o = this.add.text(x, y+rowH/2, t, {fontSize:fs(10),fill:'#4a2e10',fontFamily:FontManager.MONO}).setOrigin(0,0.5);
      this._filterBarObjs.push(o);
    };

    addLbl(pm+6, fy, '직업');
    let bx = pm + 6 + parseInt(fs(26));
    JOB.forEach(f => { bx = makeChip(bx, fy, f.label, this._filterJob===f.key, ()=>{ this._filterJob=f.key; this._rebuildCards(); this._buildFilterBar(); }); });

    const cogFy = fy + rowH + parseInt(fs(4));
    addLbl(pm+6, cogFy, 'Cog');
    let cx2 = pm + 6 + parseInt(fs(26));
    COG.forEach(f => { cx2 = makeChip(cx2, cogFy, f.label, this._filterCog===f.key, ()=>{ this._filterCog=f.key; this._rebuildCards(); this._buildFilterBar(); }); });

    const sortFy = cogFy + rowH + parseInt(fs(6));
    addLbl(pm+6, sortFy, '정렬');
    let sx = pm + 6 + parseInt(fs(22));
    SORT.forEach(s => {
      const isA = this._sortMode===s.key;
      const icon = isA?(this._sortOrder==='desc'?' ▼':' ▲'):'';
      sx = makeChip(sx, sortFy, s.label+icon, isA, ()=>{
        if(this._sortMode!==s.key){this._sortMode=s.key;this._sortOrder='desc';}
        else if(this._sortOrder==='desc'){this._sortOrder='asc';}
        else{this._sortMode='none';this._sortOrder='desc';}
        this._rebuildCards(); this._buildFilterBar();
      }, true);
    });
  }

  // ── 카드 그리드 ────────────────────────────────────────────────
  _buildCardGrid() {
    const fs = this._fs.bind(this);
    this._cardObjs.forEach(({container:c})=>{try{c.destroy();}catch(e){}});
    this._cardObjs = [];
    if(this._maskGfx){try{this._maskGfx.destroy();}catch(e){}this._maskGfx=null;}
    if(this._cardRow){try{this._cardRow.destroy();}catch(e){}this._cardRow=null;}

    const chars = this._applyFilter();
    const cols  = 3, gap = parseInt(fs(4));
    const cardW = Math.floor((this._cardAreaW - gap*(cols-1))/cols);
    const cardH = Math.round(cardW * 1.22);
    this._cardW = cardW; this._cardH = cardH;
    this._scrollY = 0;

    const mGfx = this.add.graphics();
    mGfx.fillStyle(0xffffff,1);
    mGfx.fillRect(this._cardAreaX, this._cardAreaY, this._cardAreaW, this._cardAreaH);
    mGfx.setVisible(false);
    this._maskGfx = mGfx;

    this._cardRow = this.add.container(this._cardAreaX, this._cardAreaY);
    this._cardRow.setMask(mGfx.createGeometryMask());

    chars.forEach((char, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const card = this._makeCard(char, col*(cardW+gap), row*(cardH+gap), cardW, cardH);
      this._cardRow.add(card);
      this._cardObjs.push({container:card, char});
    });
    const rc = Math.ceil(chars.length / cols);
    this._totalCardH = rc > 0 ? rc*(cardH+gap)-gap : 0;
  }

  _rebuildCards() { this._scrollY = 0; this._buildCardGrid(); }

  // ── 그리드 카드 1장 ────────────────────────────────────────────
  _makeCard(char, x, y, cw, ch) {
    const fs = this._fs.bind(this);
    const JOB_BG     = {fisher:0x0b1822,diver:0x0b1a10,ai:0x16091e};
    const JOB_BORDER = {fisher:0x3a6888,diver:0x3a7050,ai:0x6a4888};
    const JOB_ACCENT = {fisher:0x1a3a5a,diver:0x1a3a28,ai:0x2a1240};
    const JOB_SHORT  = {fisher:'FISH',  diver:'DIVE',  ai:'A·I' };
    const c   = this.add.container(x, y);
    const cbg = this.add.graphics();

    const inParty   = () => this._party.includes(char.id);
    const isSelected= () => this._selectedChar && this._selectedChar.id === char.id;

    const drawCbg = (hover) => {
      cbg.clear();
      if (inParty()) {
        cbg.fillStyle(JOB_ACCENT[char.job]||0x1a2010, 0.95);
        cbg.lineStyle(2, 0xffd060, 1);
      } else if (isSelected()) {
        cbg.fillStyle(JOB_BG[char.job]||0x181410, 0.9);
        cbg.lineStyle(2, 0xc8a060, 1);
      } else if (hover) {
        cbg.fillStyle(JOB_BG[char.job]||0x181410, 0.85);
        cbg.lineStyle(1, 0xc8a060, 0.7);
      } else {
        cbg.fillStyle(JOB_BG[char.job]||0x181410, 0.65);
        cbg.lineStyle(1, JOB_BORDER[char.job]||0x3a2010, 0.6);
      }
      cbg.strokeRect(0,0,cw,ch); cbg.fillRect(0,0,cw,ch);
    };
    drawCbg(false);
    c._drawCbg = drawCbg;

    const portH = Math.round(ch * 0.78);
    const portBg = this.add.graphics();
    portBg.fillStyle(0x030303, 0.8); portBg.fillRect(2,2,cw-4,portH-2);
    c.add([cbg, portBg]);

    if (char.spriteKey && this.textures.exists(char.spriteKey)) {
      const img = this.add.image(cw/2, portH/2+2, char.spriteKey).setOrigin(0.5);
      img.setScale(Math.min((cw-4)/img.width, (portH-4)/img.height));
      c.add(img);
    } else {
      c.add(this.add.text(cw/2, portH/2+2, JOB_SHORT[char.job]||'?', {
        fontSize:fs(20), fill:'#2a3038', fontFamily:FontManager.MONO,
      }).setOrigin(0.5));
    }

    const cogCol = CharacterManager.getCogColor ? CharacterManager.getCogColor(char.cog) : {css:'#a08060'};
    const cogBdBg = this.add.graphics();
    cogBdBg.fillStyle(0,0.65); cogBdBg.fillRect(2,2,parseInt(fs(14)),parseInt(fs(11)));
    c.add([cogBdBg, this.add.text(4,3,`C${char.cog}`,{fontSize:fs(8),fill:cogCol.css||'#a08060',fontFamily:FontManager.MONO}).setOrigin(0,0)]);

    // 파티 마크
    const mark = this.add.text(cw/2, portH*0.50, '편성중', {
      fontSize:fs(8), fill:'#ffd060', fontFamily:FontManager.MONO,
      stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5).setAlpha(0);
    c.add(mark);
    c._partyMark = mark;
    c._refreshMark = () => mark.setAlpha(inParty()?1:0);
    c._refreshMark();

    const infoY = portH+2, infoH = ch-infoY-2;
    c.add(this.add.text(cw/2, infoY+infoH*0.30, char.name||'???', {
      fontSize:fs(8), fill:'#c8bfb0', fontFamily:FontManager.TITLE,
      wordWrap:{width:cw-4}, align:'center',
    }).setOrigin(0.5));

    const hpPct = char.maxHp>0 ? Math.max(0,char.currentHp/char.maxHp) : 1;
    const hpBar = this.add.graphics();
    hpBar.fillStyle(0x1a1008,1); hpBar.fillRect(4,infoY+infoH*0.72,cw-8,3);
    const hpc = hpPct>0.6?0x306030:hpPct>0.3?0x806020:0x803020;
    hpBar.fillStyle(hpc,1); hpBar.fillRect(4,infoY+infoH*0.72,Math.max(1,Math.round((cw-8)*hpPct)),3);
    c.add(hpBar);

    const inArea = (ptr) =>
      ptr.x>=this._cardAreaX && ptr.x<=this._cardAreaX+this._cardAreaW &&
      ptr.y>=this._cardAreaY && ptr.y<=this._cardAreaY+this._cardAreaH;

    const hit = this.add.rectangle(cw/2,ch/2,cw,ch,0,0).setInteractive({useHandCursor:true});
    hit.on('pointerover',(ptr)=>{if(inArea(ptr))drawCbg(true);});
    hit.on('pointerout', ()=>drawCbg(false));
    hit.on('pointerup',  (ptr)=>{
      if(!inArea(ptr)||this._dragged) return;
      if (this._lastClickId===char.id) {
        this._lastClickId = null;
        if(this._dblTimer){this._dblTimer.remove();this._dblTimer=null;}
        inParty() ? this._removeFromPartyById(char.id) : this._addToParty(char.id);
      } else {
        this._lastClickId = char.id;
        this._openProfile(char);
        if(this._dblTimer) this._dblTimer.remove();
        this._dblTimer = this.time.delayedCall(400, ()=>{ this._lastClickId=null; });
      }
    });
    c.add(hit);
    return c;
  }

  // ── 돌아가기 버튼 ──────────────────────────────────────────────
  _buildBackBtn() {
    const fs  = this._fs.bind(this);
    const pm  = this._pm;
    const lw  = this._lw;
    const btnY = this._bodyY + this._bodyH + pm;
    const btnH = this._backH - pm;
    const btnW = lw - pm * 2;

    const bg = this.add.graphics();
    const draw = (hov) => {
      bg.clear();
      bg.fillStyle(hov?0x100c08:0x080604, 0.95);
      bg.lineStyle(1, hov?0x6a4020:0x2a1808, 0.9);
      bg.strokeRect(pm,btnY,btnW,btnH); bg.fillRect(pm,btnY,btnW,btnH);
    };
    draw(false);
    const txt = this.add.text(pm+btnW/2, btnY+btnH/2, '←  돌아가기', {
      fontSize:fs(14), fill:'#5a3818', fontFamily:FontManager.MONO,
    }).setOrigin(0.5);
    const hit = this.add.rectangle(pm+btnW/2, btnY+btnH/2, btnW, btnH, 0,0)
      .setInteractive({useHandCursor:true}).setDepth(20);
    this._sceneHits.push(hit);
    hit.on('pointerover',()=>{draw(true);txt.setStyle({fill:'#c8a060'});});
    hit.on('pointerout', ()=>{draw(false);txt.setStyle({fill:'#5a3818'});});
    hit.on('pointerup',  ()=>{
      const fl = this.add.rectangle(0,0,this.W,this.H,0x050407,0).setOrigin(0).setDepth(999);
      this.tweens.add({targets:fl,alpha:1,duration:250,ease:'Sine.easeIn',
        onComplete:()=>this.scene.start('AtelierScene')});
    });
  }

  // ── 우측 패널 배경 ─────────────────────────────────────────────
  _buildRightBg() {
    const { W, H } = this;
    const pm  = this._pm;
    const lw  = this._lw;
    const hdrH = this._hdrH;
    const rBg = this.add.graphics();
    rBg.fillStyle(0x050810, 0.88);
    rBg.lineStyle(1, 0x2a1a08, 0.4);
    rBg.strokeRect(lw+pm, hdrH+pm, W-lw-pm*2, H-hdrH-pm*2);
    rBg.fillRect(lw+pm, hdrH+pm, W-lw-pm*2, H-hdrH-pm*2);
  }

  // ── 우측 빈 상태 ───────────────────────────────────────────────
  _buildRightEmpty() {
    this._clearRight();
    const lw  = this._lw;
    const rw  = this._rw;
    const hdrH = this._hdrH;
    const pm  = this._pm;
    const hint = this.add.text(lw+rw/2, hdrH+pm+this._profileH/2,
      '캐릭터를 클릭하면\n프로필이 표시됩니다', {
        fontSize:this._fs(14), fill:'#2a1c0a', fontFamily:FontManager.MONO,
        align:'center', lineSpacing:6,
      }).setOrigin(0.5).setAlpha(0.5);
    this._rightObjs.push(hint);
  }

  _clearRight() {
    this._rightTweens.forEach(tw=>{try{tw.stop();tw.remove();}catch(e){}});
    this._rightTweens = [];
    this._rightObjs.forEach(o=>{try{o.destroy();}catch(e){}});
    this._rightObjs = [];
  }

  // ── 프로필 오픈 ────────────────────────────────────────────────
  _openProfile(char) {
    this._selectedChar = char;
    this._cardObjs.forEach(({container:c})=>{if(c._drawCbg)c._drawCbg(false);});
    this._clearRight();
    this._buildProfilePanel(char);
  }

  // ── 프로필 패널 (우측 상단 60%) ───────────────────────────────
  _buildProfilePanel(char) {
    const fs    = this._fs.bind(this);
    const pm    = this._pm;
    const lw    = this._lw;
    const rw    = this._rw;
    const hdrH  = this._hdrH;
    const profY = hdrH + pm;
    const profH = this._profileH;
    const halfW = Math.floor(rw / 2);

    const addR = (o) => { this._rightObjs.push(o); return o; };

    // ── 좌: 초상화 ──────────────────────────────────────────
    const portCX = lw + pm + (halfW - pm) / 2;
    const portCY = profY + profH / 2;
    if (char.spriteKey && this.textures.exists(char.spriteKey)) {
      const img = addR(this.add.image(portCX, portCY, char.spriteKey).setOrigin(0.5));
      const mw = (halfW-pm)*0.90, mh = profH*0.90;
      img.setScale(Math.min(mw/img.width, mh/img.height));
    } else {
      const JS = {fisher:'FISH',diver:'DIVE',ai:'A·I'};
      addR(this.add.text(portCX, portCY, JS[char.job]||'?', {
        fontSize:fs(40), fill:'#1a2028', fontFamily:FontManager.MONO,
      }).setOrigin(0.5));
    }

    // 초상화/스탯 구분선
    const dg = addR(this.add.graphics());
    dg.lineStyle(1, 0x1e1008, 0.5);
    dg.lineBetween(lw+halfW, profY+4, lw+halfW, profY+profH-4);

    // ── 우: 스탯 정보 ───────────────────────────────────────
    const infoX  = lw + halfW + pm;
    const infoW  = rw - halfW - pm * 2;
    const pad    = Math.max(parseInt(fs(6)), Math.floor(infoW * 0.04));
    const rScale = Math.max(0.75, Math.min(1.4, infoW / 260));
    const rfs    = n => fs(Math.round(n * rScale));
    const colX   = infoX + pad;
    const colW   = infoW - pad * 2;
    let curY     = profY + pad;

    addR(this.add.text(colX, curY, char.name, {fontSize:rfs(26),fill:'#e8c070',fontFamily:FontManager.TITLE}).setOrigin(0,0));
    curY += parseInt(rfs(30));

    const ml = char.mastery||0;
    addR(this.add.text(colX, curY, `숙련도  Lv.${ml}`, {fontSize:rfs(13),fill:ml>0?'#b8a060':'#5a4a28',fontFamily:FontManager.MONO}).setOrigin(0,0));
    curY += parseInt(rfs(17));

    addR(this.add.text(colX, curY, `직업  :  ${char.jobLabel||char.job}`, {fontSize:rfs(13),fill:'#c8802a',fontFamily:FontManager.MONO}).setOrigin(0,0));
    curY += parseInt(rfs(17));

    if (char.overclock) {
      const ocC = char.overclock.color||'#ff4400';
      addR(this.add.text(colX, curY, char.overclock.label||char.overclock.name||'오버클럭', {fontSize:rfs(12),fill:ocC,fontFamily:FontManager.MONO}).setOrigin(0,0));
      curY += parseInt(rfs(16));
    }

    // HP 바
    const hpBH = parseInt(rfs(20));
    const hpP  = char.maxHp>0 ? char.currentHp/char.maxHp : 1;
    const hpC  = hpP>0.6?0x306030:hpP>0.3?0x806020:0x803020;
    const hpBg = addR(this.add.graphics()); hpBg.fillStyle(0x030506,0.9); hpBg.lineStyle(1,0x2a1a08,0.7); hpBg.strokeRect(colX,curY,colW,hpBH); hpBg.fillRect(colX,curY,colW,hpBH);
    const hpFg = addR(this.add.graphics()); hpFg.fillStyle(hpC,1); hpFg.fillRect(colX+1,curY+1,Math.max(0,Math.round((colW-2)*hpP)),hpBH-2);
    addR(this.add.text(colX+colW/2, curY+hpBH/2, `HP  ${char.currentHp} / ${char.maxHp}`, {fontSize:rfs(11),fill:'#d0b060',fontFamily:FontManager.MONO}).setOrigin(0.5));
    curY += hpBH + parseInt(rfs(5));

    // Cog 바
    const cogBH = parseInt(rfs(22));
    const cogCC = CharacterManager.getCogColor ? CharacterManager.getCogColor(char.cog).css : '#c8a040';
    const cogBg = addR(this.add.graphics()); cogBg.fillStyle(0x060810,0.9); cogBg.lineStyle(1,0x4a2a10,0.8); cogBg.strokeRect(colX,curY,colW,cogBH); cogBg.fillRect(colX,curY,colW,cogBH);
    addR(this.add.text(colX+colW/2, curY+cogBH/2, `◈  Cog  ${char.cog}  ◈`, {fontSize:rfs(14),fill:cogCC,fontFamily:FontManager.MONO}).setOrigin(0.5));
    curY += cogBH + parseInt(rfs(5));

    // 스탯 블록
    const SC = CharacterManager.STAT_COLORS || {hp:'#ff88bb',health:'#88ddaa',attack:'#ff3333',agility:'#55ccff',luck:'#ddcc44'};
    const SDEFS = [{key:'hp',label:'체력'},{key:'health',label:'건강'},{key:'attack',label:'공격'},{key:'agility',label:'민첩'},{key:'luck',label:'행운'}];
    const sRowH = parseInt(rfs(21));
    const sBH   = SDEFS.length * sRowH;
    const ocKey = char.overclock ? char.overclock.statKey : null;
    const ocHex = ocKey ? parseInt((char.overclock.color||'#ff4400').replace('#','0x')) : null;

    const sBg = addR(this.add.graphics());
    sBg.fillStyle(0x060810,0.85);
    if(ocKey){[{p:3,a:0.12},{p:1,a:0.30}].forEach(({p,a})=>{sBg.lineStyle(1,ocHex,a);sBg.strokeRect(colX-p,curY-p,colW+p*2,sBH+p*2);});}
    sBg.lineStyle(1,0x2a1a08,0.7); sBg.strokeRect(colX,curY,colW,sBH); sBg.fillRect(colX,curY,colW,sBH);

    SDEFS.forEach(({key,label},i)=>{
      const sy = curY+i*sRowH, midY = sy+sRowH/2;
      if(i>0){const sg=addR(this.add.graphics());sg.lineStyle(1,0x1e1206,0.4);sg.lineBetween(colX+2,sy,colX+colW-2,sy);}
      const isOc = ocKey===key;
      const sCol = SC[key]||'#c8bfb0';
      const eff  = CharacterManager.getEffectiveStat ? CharacterManager.getEffectiveStat(char,key) : (char.stats[key]||0);
      const base = char.stats[key]||0;
      const vStr = isOc ? `${base}→${eff}` : `${eff}`;
      if(isOc){const gB=addR(this.add.graphics());const bw=colW-2;for(let s=0;s<16;s++){gB.fillStyle(ocHex,0.22-(0.20*s/15));gB.fillRect(colX+1+s*(bw/16),sy+1,Math.ceil(bw/16),sRowH-2);}gB.fillStyle(ocHex,0.85);gB.fillRect(colX+1,sy+1,2,sRowH-2);}
      addR(this.add.text(colX+5,midY,label,{fontSize:rfs(11),fill:isOc?(char.overclock.color||'#ff4400'):sCol+'cc',fontFamily:FontManager.MONO}).setOrigin(0,0.5));
      addR(this.add.text(colX+colW-5,midY,vStr,{fontSize:rfs(13),fill:isOc?(char.overclock.color||'#ff4400'):sCol,fontFamily:FontManager.MONO}).setOrigin(1,0.5));
    });
    curY += sBH + parseInt(rfs(5));

    // 어빌리티 간략 표시
    [{label:'포지션',val:char.position||'—'},{label:'패시브',val:char.passive||'—'},{label:'스킬',val:char.skill||'—'}]
      .forEach(({label,val})=>{
        if(curY+parseInt(rfs(17)) > profY+profH-pad) return;
        const rb=addR(this.add.graphics());rb.fillStyle(0x0a0c10,0.7);rb.lineStyle(1,0x1e1a0c,0.5);rb.fillRect(colX,curY,colW,parseInt(rfs(17)));rb.strokeRect(colX,curY,colW,parseInt(rfs(17)));
        addR(this.add.text(colX+5,curY+parseInt(rfs(8.5)),label,{fontSize:rfs(9),fill:'#4a3018',fontFamily:FontManager.MONO}).setOrigin(0,0.5));
        addR(this.add.text(colX+colW-5,curY+parseInt(rfs(8.5)),val,{fontSize:rfs(9),fill:'#c8a060',fontFamily:FontManager.MONO,wordWrap:{width:colW*0.65}}).setOrigin(1,0.5));
        curY += parseInt(rfs(17))+2;
      });
  }

  // ── 관리 패널 (우측 하단 40%) ─────────────────────────────────
  _buildManagePanel() {
    if(this._manageObjs){this._manageObjs.forEach(o=>{try{o.destroy();}catch(e){}});}
    this._manageObjs = [];
    const addM = (o) => { this._manageObjs.push(o); return o; };

    const fs   = this._fs.bind(this);
    const pm   = this._pm;
    const lw   = this._lw;
    const rw   = this._rw;
    const W    = this.W;
    const manY = this._manageY + pm;
    const manH = this._manageH - pm;
    const halfW= Math.floor(rw / 2);
    const pad  = pm * 2;

    const count     = this._party.length;
    const cost      = this._calcCost();
    const arc       = typeof SaveManager!=='undefined'&&SaveManager.getArc ? SaveManager.getArc() : 0;
    const canAfford = arc >= cost;
    const canStart  = count > 0 && canAfford;

    // ── 좌: 파티 현황 ───────────────────────────────────────
    const lx = lw + pm + pad;
    const lw2 = halfW - pm - pad * 2;

    addM(this.add.text(lx, manY+parseInt(fs(4)), '파  티  현  황', {fontSize:fs(11),fill:'#4a2e10',fontFamily:FontManager.MONO}));
    addM(this.add.text(lx, manY+parseInt(fs(22)), `인  원  :  ${count}명`, {fontSize:fs(13),fill:'#c8bfb0',fontFamily:FontManager.MONO}));
    addM(this.add.text(lx, manY+parseInt(fs(38)), `비  용  :  ${cost} Arc`, {fontSize:fs(13),fill:canAfford?'#c8a060':'#cc4444',fontFamily:FontManager.MONO}));
    addM(this.add.text(lx, manY+parseInt(fs(54)), `보  유  :  ${arc} Arc`, {fontSize:fs(12),fill:'#5a4a28',fontFamily:FontManager.MONO}));

    let mY = manY + parseInt(fs(72));
    this._party.slice(0,5).forEach(id=>{
      const ch = this._chars.find(c=>c.id===id);
      if(!ch || mY+parseInt(fs(13))>manY+manH-pm) return;
      const cc = CharacterManager.getCogColor(ch.cog);
      addM(this.add.text(lx, mY, `· ${ch.name}  Cog${ch.cog}`, {fontSize:fs(10),fill:cc.css,fontFamily:FontManager.MONO}));
      mY += parseInt(fs(13));
    });
    if(this._party.length>5){addM(this.add.text(lx, mY, `  +${this._party.length-5}명 더`, {fontSize:fs(9),fill:'#3a2810',fontFamily:FontManager.MONO}));}

    // ── 우: 출발 버튼 ───────────────────────────────────────
    const rx  = lw + halfW + pm;
    const rw2 = rw - halfW - pm * 2;
    const bW  = rw2 - pad * 2;
    const bH  = parseInt(fs(46));
    const bX  = rx + pad;
    const bY  = manY + manH/2 - bH/2;

    const sBg = addM(this.add.graphics());
    const drawS = (st) => {
      sBg.clear();
      if(st==='disabled'){sBg.fillStyle(0x0a0807,1);sBg.lineStyle(1,0x1a1008,0.5);}
      else if(st==='hover'){sBg.fillStyle(0x2a1a08,1);sBg.lineStyle(2,0xc8a070,1);}
      else{sBg.fillStyle(0x1e1008,1);sBg.lineStyle(2,0xa05018,0.9);}
      sBg.strokeRect(bX,bY,bW,bH); sBg.fillRect(bX,bY,bW,bH);
    };
    drawS(canStart?'active':'disabled');

    const sTxt = addM(this.add.text(bX+bW/2, bY+bH/2, '출  발', {
      fontSize:fs(18), fill:canStart?'#c8a070':'#2a1a0a', fontFamily:FontManager.TITLE,
    }).setOrigin(0.5));

    if (canStart) {
      const sH = this.add.rectangle(bX+bW/2, bY+bH/2, bW, bH, 0,0)
        .setInteractive({useHandCursor:true}).setDepth(20);
      addM(sH); this._sceneHits.push(sH);
      sH.on('pointerover',()=>{drawS('hover');sTxt.setStyle({fill:'#e8d090'});});
      sH.on('pointerout', ()=>{drawS('active');sTxt.setStyle({fill:'#c8a070'});});
      sH.on('pointerup',  ()=>this._depart());
    }

    const guide = canStart ? `${count}명  ·  ${cost} Arc 소모`
      : (count===0 ? '파티 인원을 선택하세요' : `Arc 부족  (${cost-arc} 부족)`);
    addM(this.add.text(bX+bW/2, bY+bH+parseInt(fs(7)), guide, {
      fontSize:fs(10), fill:canStart?'#5a3a18':'#6a2020', fontFamily:FontManager.MONO,
    }).setOrigin(0.5, 0));
  }

  // ══════════════════════════════════════════════════════════════
  //  파티 조작
  // ══════════════════════════════════════════════════════════════
  _addToParty(charId) {
    if(this._party.includes(charId)) return;
    this._party.push(charId);
    this._refreshAll();
  }
  _removeFromPartyById(charId) {
    const idx = this._party.indexOf(charId);
    if(idx===-1) return;
    this._party.splice(idx,1);
    if(this._slotSelected===charId) this._slotSelected=null;
    this._refreshAll();
  }
  _refreshAll() {
    this._buildPartySlots();
    this._cardObjs.forEach(({container:c})=>{ if(c._refreshMark)c._refreshMark(); if(c._drawCbg)c._drawCbg(false); });
    this._buildManagePanel();
  }
  _calcCost() {
    return this._party.reduce((s,id)=>{const c=this._chars.find(ch=>ch.id===id);return s+(c?c.cog:0);},0);
  }

  // ══════════════════════════════════════════════════════════════
  //  필터
  // ══════════════════════════════════════════════════════════════
  _applyFilter() {
    let r = this._chars.slice();
    if(this._filterJob!=='all') r=r.filter(c=>c.job===this._filterJob);
    if(this._filterCog!=='all') r=r.filter(c=>String(c.cog)===String(this._filterCog));
    if(this._sortMode==='date'){
      const ts=id=>{const p=(id||'').split('_');const t=parseInt(p[1],10);return isNaN(t)?0:t;};
      r.sort((a,b)=>this._sortOrder==='desc'?ts(b.id)-ts(a.id):ts(a.id)-ts(b.id));
    } else if(this._sortMode==='stat'){
      const sm=c=>c.statSum??Object.values(c.stats||{}).reduce((a,v)=>a+(v||0),0);
      r.sort((a,b)=>this._sortOrder==='desc'?sm(b)-sm(a):sm(a)-sm(b));
    }
    return r;
  }

  // ══════════════════════════════════════════════════════════════
  //  드래그 스크롤
  // ══════════════════════════════════════════════════════════════
  _setupDrag() {
    let sy=0,ss=0,drag=false;
    const inA=(ptr)=>ptr.x>=this._cardAreaX&&ptr.x<=this._cardAreaX+this._cardAreaW&&ptr.y>=this._cardAreaY&&ptr.y<=this._cardAreaY+this._cardAreaH;
    this._dragDown=(ptr)=>{if(!inA(ptr))return;drag=true;this._dragged=false;sy=ptr.y;ss=this._scrollY;};
    this._dragMove=(ptr)=>{if(!drag)return;const dy=sy-ptr.y;if(Math.abs(dy)>4)this._dragged=true;const mx=Math.max(0,this._totalCardH-this._cardAreaH);this._scrollY=Math.max(0,Math.min(ss+dy,mx));if(this._cardRow)this._cardRow.setY(this._cardAreaY-this._scrollY);};
    this._dragUp=()=>{drag=false;if(this._dragTimer){this._dragTimer.remove();this._dragTimer=null;}this._dragTimer=this.time.delayedCall(100,()=>{this._dragged=false;});};
    this._dragWheel=(ptr,o,dx,dy)=>{if(!inA(ptr))return;const mx=Math.max(0,this._totalCardH-this._cardAreaH);this._scrollY=Math.max(0,Math.min(this._scrollY+dy*0.5,mx));if(this._cardRow)this._cardRow.setY(this._cardAreaY-this._scrollY);};
    this.input.on('pointerdown',this._dragDown);
    this.input.on('pointermove',this._dragMove);
    this.input.on('pointerup',  this._dragUp);
    this.input.on('wheel',      this._dragWheel);
  }

  // ══════════════════════════════════════════════════════════════
  //  출발
  // ══════════════════════════════════════════════════════════════
  _depart() {
    const cost=this._calcCost();
    const ok=SaveManager.spendArc?SaveManager.spendArc(cost):true;
    if(!ok){this._buildManagePanel();return;}
    if(CharacterManager.saveParty) CharacterManager.saveParty(this._party);
    const fl=this.add.rectangle(0,0,this.W,this.H,0x050407,0).setOrigin(0).setDepth(999);
    this.tweens.add({targets:fl,alpha:1,duration:350,ease:'Sine.easeIn',
      onComplete:()=>this.scene.start('ExploreScene',{from:'PartyScene'})});
  }

  // ══════════════════════════════════════════════════════════════
  //  정리
  // ══════════════════════════════════════════════════════════════
  shutdown() {
    this._sceneHits.forEach(h=>{try{h.destroy();}catch(e){}});
    this._sceneHits=[];
    if(this._dragTimer){try{this._dragTimer.remove();}catch(e){}}
    if(this._dblTimer) {try{this._dblTimer.remove(); }catch(e){}}
    this.input.off('pointerdown',this._dragDown);
    this.input.off('pointermove',this._dragMove);
    this.input.off('pointerup',  this._dragUp);
    this.input.off('wheel',      this._dragWheel);
  }
}
