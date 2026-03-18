// ================================================================
//  PartyScene.js  (REDESIGN v3 — 크로노 아크 스타일)
//  경로: Games/Codes/Scenes/PartyScene.js
//
//  레이아웃 (좌30 / 중40 / 우30):
//
//  LEFT 30%              CENTER 40%              RIGHT 30%
//  ┌───────────────┐     ┌──────────────────┐    ┌─────────────┐
//  │ 필터바        │     │ BG_007 배경 투명  │    │ 파티 슬롯   │
//  │               │     │ 캐릭터 일러스트   │    │ (세로 배열) │
//  │ 캐릭터 그리드 │     │ (크게, 중앙)      │    │             │
//  │ (반투명 bg)   │     │ ─────────────── │    │ ─────────── │
//  │               │     │ 이름 / Cog       │    │ 파티 현황   │
//  │               │     │ 스탯 블록         │    │             │
//  │               │     │ 포지션/패시브/스킬│    │ ─────────── │
//  ├───────────────┤     └──────────────────┘    │ 출발 버튼   │
//  │ 돌아가기      │                              └─────────────┘
//  └───────────────┘
//
//  인터랙션:
//    카드 1회 클릭  → 중앙에 일러스트+프로필 오픈
//    카드 2회 클릭  → 파티 추가/제거
//    파티 슬롯 1회  → 빨간 강조 + 중앙 프로필 오픈
//    파티 슬롯 2회  → 파티 제거
//
//  컨테이너 구조:
//    _bgContainer      — depth 0  : 배경(BG_007) + 기본 암막
//    _leftContainer    — depth 5  : 좌측 패널 (그리드 + 필터)
//    _centerContainer  — depth 4  : 중앙 패널 배경
//    _profileContainer — depth 6  : 중앙 프로필 (동적 재빌드)
//    _rightContainer   — depth 5  : 우측 패널 (파티슬롯 + 관리)
//    _slotContainer    — depth 7  : 파티 슬롯 (동적 재빌드)
//    _manageContainer  — depth 7  : 관리 패널 (동적 재빌드)
//    _hdrContainer     — depth 10 : 헤더 (최상위)
// ================================================================

class PartyScene extends Phaser.Scene {
  constructor() { super({ key: 'PartyScene' }); }

  init() {
    this._party         = [];
    this._chars         = [];
    this._sceneHits     = [];
    this._slotHits      = [];   // 슬롯 전용 hit — 재빌드 시 정리
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

    // 컨테이너 refs
    this._bgContainer      = null;
    this._leftContainer    = null;
    this._centerContainer  = null;
    this._profileContainer = null;
    this._rightContainer   = null;
    this._slotContainer    = null;
    this._manageContainer  = null;
    this._hdrContainer     = null;
  }

  preload() {
    if (!this.textures.exists('bg_party')) {
      this.load.image('bg_party', 'Games/Assets/Sprites/Background_007.png');
    }
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    if (typeof InputManager !== 'undefined') InputManager.reinit(this);

    const all      = CharacterManager.loadAll() || [];
    this._chars    = all.filter(c => !c.status || c.status === 'alive' || c.status === 'ai');
    this._fs       = n => FontManager.adjustedSize(n, this.scale);

    this._calcLayout();
    this._buildContainers();
    this._buildBackground();
    this._buildHeader();
    this._buildLeftPanel();
    this._buildCenterBg();
    this._buildCenterEmpty();
    this._buildRightPanel();
    this._buildPartySlots();
    this._buildManagePanel();
    this._setupDrag();
  }

  // ══════════════════════════════════════════════════════════════
  //  레이아웃 수치 — 한 곳에서 관리
  // ══════════════════════════════════════════════════════════════
  _calcLayout() {
    const { W, H } = this;
    const fs  = this._fs.bind(this);
    const pm  = Math.round(W * 0.010);

    // 비율 상수 (여기만 수정하면 전체 반영)
    const LEFT_RATIO   = 0.30;
    const CENTER_RATIO = 0.40;

    this._pm   = pm;
    this._lw   = Math.floor(W * LEFT_RATIO);
    this._cw   = Math.floor(W * CENTER_RATIO);
    this._rw   = W - this._lw - this._cw;
    this._hdrH = parseInt(fs(44));
    this._backH= parseInt(fs(52));
    this._bodyY= this._hdrH + pm;
    this._bodyH= H - this._bodyY - pm;

    // 좌측 카드 그리드 영역
    const rowH          = parseInt(fs(32));
    const filterRowCount= 3;   // 직업·Cog·정렬
    const filterGapH    = parseInt(fs(4)) * 2 + parseInt(fs(6));
    this._filterY       = this._bodyY + pm;
    this._filterTotalH  = rowH * filterRowCount + filterGapH;
    this._cardAreaX     = pm + 4;
    this._cardAreaY     = this._filterY + this._filterTotalH + parseInt(fs(6));
    this._cardAreaW     = this._lw - pm * 2 - 8;
    this._cardAreaH     = H - this._cardAreaY - this._backH - pm;

    // 우측 파티슬롯 / 관리 분할 (슬롯 60%, 관리 40%)
    this._slotAreaX = this._lw + this._cw + pm;
    this._slotAreaY = this._bodyY + pm;
    this._slotAreaW = this._rw - pm * 2;
    this._slotAreaH = Math.round(this._bodyH * 0.60);
    this._manageY   = this._slotAreaY + this._slotAreaH;
    this._manageH   = H - this._manageY - pm;
  }

  // ══════════════════════════════════════════════════════════════
  //  컨테이너 생성 — depth 계층 명확히
  // ══════════════════════════════════════════════════════════════
  _buildContainers() {
    this._bgContainer      = this.add.container(0, 0).setDepth(0);
    this._centerContainer  = this.add.container(0, 0).setDepth(4);
    this._leftContainer    = this.add.container(0, 0).setDepth(5);
    this._rightContainer   = this.add.container(0, 0).setDepth(5);
    this._profileContainer = this.add.container(0, 0).setDepth(6);
    this._slotContainer    = this.add.container(0, 0).setDepth(7);
    this._manageContainer  = this.add.container(0, 0).setDepth(7);
    this._hdrContainer     = this.add.container(0, 0).setDepth(10);
  }

  // ══════════════════════════════════════════════════════════════
  //  배경
  // ══════════════════════════════════════════════════════════════
  _buildBackground() {
    const { W, H } = this;
    const bg = this._bgContainer;

    // 기본 배경색
    bg.add(this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0));

    // BG_007 이미지 (전체화면 cover)
    if (this.textures.exists('bg_party')) {
      const img = this.add.image(W / 2, H / 2, 'bg_party').setOrigin(0.5);
      const sc  = Math.max(W / img.width, H / img.height);
      img.setScale(sc).setAlpha(0.35);
      bg.add(img);
    }

    // 전체 암막 (중앙은 밝게, 좌우는 어둡게)
    const overlay = this.add.graphics();
    overlay.fillStyle(0x050407, 0.55);
    overlay.fillRect(0, 0, W, H);
    // 중앙 영역은 암막 제거 — 투명 구멍
    overlay.fillStyle(0x000000, 0.0);
    overlay.fillRect(this._lw, 0, this._cw, H);
    bg.add(overlay);

    // 그리드 패턴 (은은하게)
    const grid = this.add.graphics();
    const step = Math.round(W / 72);
    grid.lineStyle(1, 0x0c0a06, 0.25);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    bg.add(grid);
  }

  // ══════════════════════════════════════════════════════════════
  //  헤더
  // ══════════════════════════════════════════════════════════════
  _buildHeader() {
    const { W }  = this;
    const fs     = this._fs.bind(this);
    const hdrH   = this._hdrH;
    const hdr    = this._hdrContainer;

    const hBg = this.add.graphics();
    hBg.fillStyle(0x060810, 0.92);
    hBg.lineStyle(1, 0x2a1a08, 0.5);
    hBg.fillRect(0, 0, W, hdrH);
    hBg.strokeRect(0, 0, W, hdrH);
    hdr.add(hBg);

    hdr.add(this.add.text(W / 2, hdrH / 2, '탐  사  파  티  편  성', {
      fontSize: fs(20), fill: '#6b4020', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5));

    hdr.add(this.add.text(this._pm + 6, hdrH / 2, '비용 : 파티 Cog 합산 Arc', {
      fontSize: fs(10), fill: '#3a2010', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5));
  }

  // ══════════════════════════════════════════════════════════════
  //  좌측 패널 — 필터 + 그리드 + 돌아가기
  // ══════════════════════════════════════════════════════════════
  _buildLeftPanel() {
    const { H }  = this;
    const fs     = this._fs.bind(this);
    const pm     = this._pm;
    const lw     = this._lw;
    const bodyY  = this._bodyY;
    const bodyH  = this._bodyH;
    const left   = this._leftContainer;

    // 좌측 패널 반투명 배경
    const lBg = this.add.graphics();
    lBg.fillStyle(0x05080c, 0.82);
    lBg.lineStyle(1, 0x1e1208, 0.5);
    lBg.strokeRect(pm, bodyY, lw - pm * 2, bodyH - this._backH);
    lBg.fillRect(pm, bodyY, lw - pm * 2, bodyH - this._backH);
    left.add(lBg);

    // 필터바
    this._buildFilterBar();

    // 카드 그리드
    this._buildCardGrid();

    // 돌아가기 버튼
    this._buildBackBtn();
  }

  // ── 필터바 ─────────────────────────────────────────────────────
  _buildFilterBar() {
    this._filterBarObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    this._filterBarObjs = [];

    const fs   = this._fs.bind(this);
    const pm   = this._pm;
    const fy   = this._filterY;
    const rowH = parseInt(fs(32));
    const left = this._leftContainer;

    const JOB  = [{key:'all',label:'전체'},{key:'fisher',label:'낚시꾼'},{key:'diver',label:'잠수부'},{key:'ai',label:'AI'}];
    const COG  = [{key:'all',label:'전체'},...[1,2,3,4,5,6,7,8,9,10].map(n=>({key:`${n}`,label:`${n}`}))];
    const SORT = [{key:'date',label:'최신순'},{key:'stat',label:'스탯순'}];

    const chip = (x, y, label, active, cb, wide=false) => {
      const tmp = this.add.text(-9999,-9999,label,{fontSize:fs(11),fontFamily:FontManager.MONO});
      const bw  = tmp.width + (wide ? 20 : 14);
      tmp.destroy();
      const bg  = this.add.graphics();
      const draw= (h) => {
        bg.clear();
        bg.fillStyle(active?(h?0x2a1e0c:0x181208):(h?0x141008:0), active?0.85:0.5);
        bg.lineStyle(1, active?0x9a6020:(h?0x4a2810:0x221608), 0.9);
        bg.strokeRect(x,y,bw,rowH); bg.fillRect(x,y,bw,rowH);
      };
      draw(false);
      const txt = this.add.text(x+bw/2, y+rowH/2, label, {
        fontSize:fs(11), fill:active?'#e8a040':'#5a3818', fontFamily:FontManager.MONO,
      }).setOrigin(0.5);
      const hit = this.add.rectangle(x+bw/2,y+rowH/2,bw,rowH,0,0)
        .setInteractive({useHandCursor:true}).setDepth(21);
      hit.on('pointerover',()=>draw(true)); hit.on('pointerout',()=>draw(false)); hit.on('pointerup',cb);
      left.add([bg, txt]); this._filterBarObjs.push(bg, txt, hit);
      return x + bw + 4;
    };
    const lbl = (x, y, t) => {
      const o = this.add.text(x, y+rowH/2, t, {fontSize:fs(10),fill:'#4a2e10',fontFamily:FontManager.MONO}).setOrigin(0,0.5);
      left.add(o); this._filterBarObjs.push(o);
    };

    lbl(pm+6, fy, '직업');
    let bx = pm+6+parseInt(fs(26));
    JOB.forEach(f => { bx = chip(bx, fy, f.label, this._filterJob===f.key, ()=>{ this._filterJob=f.key; this._rebuildCards(); this._buildFilterBar(); }); });

    const cogFy = fy+rowH+parseInt(fs(4));
    lbl(pm+6, cogFy, 'Cog');
    let cx2 = pm+6+parseInt(fs(26));
    COG.forEach(f => { cx2 = chip(cx2, cogFy, f.label, this._filterCog===f.key, ()=>{ this._filterCog=f.key; this._rebuildCards(); this._buildFilterBar(); }); });

    const sortFy = cogFy+rowH+parseInt(fs(6));
    lbl(pm+6, sortFy, '정렬');
    let sx = pm+6+parseInt(fs(22));
    SORT.forEach(s => {
      const isA = this._sortMode===s.key;
      const icon= isA?(this._sortOrder==='desc'?' ▼':' ▲'):'';
      sx = chip(sx, sortFy, s.label+icon, isA, ()=>{
        if(this._sortMode!==s.key){this._sortMode=s.key;this._sortOrder='desc';}
        else if(this._sortOrder==='desc'){this._sortOrder='asc';}
        else{this._sortMode='none';this._sortOrder='desc';}
        this._rebuildCards(); this._buildFilterBar();
      }, true);
    });
  }

  // ── 카드 그리드 ────────────────────────────────────────────────
  _buildCardGrid() {
    const fs   = this._fs.bind(this);
    const left = this._leftContainer;

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
    left.add(mGfx);

    this._cardRow = this.add.container(this._cardAreaX, this._cardAreaY);
    this._cardRow.setMask(mGfx.createGeometryMask());
    left.add(this._cardRow);

    chars.forEach((char, i) => {
      const col  = i % cols, row = Math.floor(i / cols);
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
    const JB = {fisher:0x0b1822, diver:0x0b1a10, ai:0x16091e};
    const JD = {fisher:0x3a6888, diver:0x3a7050, ai:0x6a4888};
    const JA = {fisher:0x1a3a5a, diver:0x1a3a28, ai:0x2a1240};
    const JS = {fisher:'FISH',   diver:'DIVE',   ai:'A·I'  };

    const c   = this.add.container(x, y);
    const cbg = this.add.graphics();
    const inP = () => this._party.includes(char.id);
    const iSel= () => this._selectedChar && this._selectedChar.id===char.id;

    const dCbg = (hov) => {
      cbg.clear();
      if(inP())       { cbg.fillStyle(JA[char.job]||0x1a2010,0.95); cbg.lineStyle(2,0xffd060,1); }
      else if(iSel()) { cbg.fillStyle(JB[char.job]||0x181410,0.90); cbg.lineStyle(2,0xc8a060,1); }
      else if(hov)    { cbg.fillStyle(JB[char.job]||0x181410,0.85); cbg.lineStyle(1,0xc8a060,0.7); }
      else            { cbg.fillStyle(JB[char.job]||0x181410,0.65); cbg.lineStyle(1,JD[char.job]||0x3a2010,0.6); }
      cbg.strokeRect(0,0,cw,ch); cbg.fillRect(0,0,cw,ch);
    };
    dCbg(false);
    c._drawCbg = dCbg;

    const portH = Math.round(ch*0.78);
    const pBg   = this.add.graphics();
    pBg.fillStyle(0x030303,0.8); pBg.fillRect(2,2,cw-4,portH-2);
    c.add([cbg, pBg]);

    if(char.spriteKey && this.textures.exists(char.spriteKey)){
      const img = this.add.image(cw/2, portH/2+2, char.spriteKey).setOrigin(0.5);
      img.setScale(Math.min((cw-4)/img.width, (portH-4)/img.height));
      c.add(img);
    } else {
      c.add(this.add.text(cw/2, portH/2+2, JS[char.job]||'?', {fontSize:fs(20),fill:'#2a3038',fontFamily:FontManager.MONO}).setOrigin(0.5));
    }

    const cogC = CharacterManager.getCogColor ? CharacterManager.getCogColor(char.cog) : {css:'#a08060'};
    const cBdBg= this.add.graphics();
    cBdBg.fillStyle(0,0.65); cBdBg.fillRect(2,2,parseInt(fs(14)),parseInt(fs(11)));
    c.add([cBdBg, this.add.text(4,3,`C${char.cog}`,{fontSize:fs(8),fill:cogC.css||'#a08060',fontFamily:FontManager.MONO}).setOrigin(0,0)]);

    const mark = this.add.text(cw/2, portH*0.50, '편성중',{fontSize:fs(8),fill:'#ffd060',fontFamily:FontManager.MONO,stroke:'#000000',strokeThickness:3}).setOrigin(0.5).setAlpha(0);
    c.add(mark);
    c._partyMark  = mark;
    c._refreshMark= () => mark.setAlpha(inP()?1:0);
    c._refreshMark();

    const infoY = portH+2, infoH = ch-infoY-2;
    c.add(this.add.text(cw/2, infoY+infoH*0.30, char.name||'???',{fontSize:fs(8),fill:'#c8bfb0',fontFamily:FontManager.TITLE,wordWrap:{width:cw-4},align:'center'}).setOrigin(0.5));

    const hpP = char.maxHp>0 ? Math.max(0,char.currentHp/char.maxHp) : 1;
    const hpB = this.add.graphics();
    hpB.fillStyle(0x1a1008,1); hpB.fillRect(4,infoY+infoH*0.72,cw-8,3);
    const hpC = hpP>0.6?0x306030:hpP>0.3?0x806020:0x803020;
    hpB.fillStyle(hpC,1); hpB.fillRect(4,infoY+infoH*0.72,Math.max(1,Math.round((cw-8)*hpP)),3);
    c.add(hpB);

    const inA = (ptr) => ptr.x>=this._cardAreaX && ptr.x<=this._cardAreaX+this._cardAreaW && ptr.y>=this._cardAreaY && ptr.y<=this._cardAreaY+this._cardAreaH;
    const hit = this.add.rectangle(cw/2,ch/2,cw,ch,0,0).setInteractive({useHandCursor:true});
    hit.on('pointerover',(ptr)=>{ if(inA(ptr)) dCbg(true); });
    hit.on('pointerout', ()=>dCbg(false));
    hit.on('pointerup',  (ptr)=>{
      if(!inA(ptr)||this._dragged) return;
      if(this._lastClickId===char.id){
        this._lastClickId=null;
        if(this._dblTimer){this._dblTimer.remove();this._dblTimer=null;}
        inP() ? this._removeFromPartyById(char.id) : this._addToParty(char.id);
      } else {
        this._lastClickId=char.id;
        this._openProfile(char);
        if(this._dblTimer) this._dblTimer.remove();
        this._dblTimer=this.time.delayedCall(400,()=>{ this._lastClickId=null; });
      }
    });
    c.add(hit);
    return c;
  }

  // ── 돌아가기 버튼 ──────────────────────────────────────────────
  _buildBackBtn() {
    const fs   = this._fs.bind(this);
    const pm   = this._pm;
    const lw   = this._lw;
    const left = this._leftContainer;
    const btnY = this._bodyY + this._bodyH - this._backH + pm;
    const btnH = this._backH - pm * 2;
    const btnW = lw - pm * 2;

    const bg  = this.add.graphics();
    const draw= (hov) => {
      bg.clear();
      bg.fillStyle(hov?0x100c08:0x080604, 0.95);
      bg.lineStyle(1, hov?0x6a4020:0x2a1808, 0.9);
      bg.strokeRect(pm,btnY,btnW,btnH); bg.fillRect(pm,btnY,btnW,btnH);
    };
    draw(false);
    const txt = this.add.text(pm+btnW/2, btnY+btnH/2, '←  돌아가기', {
      fontSize:fs(14), fill:'#5a3818', fontFamily:FontManager.MONO,
    }).setOrigin(0.5);
    left.add([bg, txt]);

    const hit = this.add.rectangle(pm+btnW/2, btnY+btnH/2, btnW, btnH, 0,0)
      .setInteractive({useHandCursor:true}).setDepth(20);
    this._sceneHits.push(hit);
    hit.on('pointerover',()=>{ draw(true); txt.setStyle({fill:'#c8a060'}); });
    hit.on('pointerout', ()=>{ draw(false); txt.setStyle({fill:'#5a3818'}); });
    hit.on('pointerup',  ()=>{
      const fl = this.add.rectangle(0,0,this.W,this.H,0x050407,0).setOrigin(0).setDepth(999);
      this.tweens.add({targets:fl, alpha:1, duration:250, ease:'Sine.easeIn',
        onComplete:()=>this.scene.start('AtelierScene')});
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  중앙 패널 배경
  // ══════════════════════════════════════════════════════════════
  _buildCenterBg() {
    const { H }  = this;
    const pm     = this._pm;
    const lw     = this._lw;
    const cw     = this._cw;
    const hdrH   = this._hdrH;
    const center = this._centerContainer;

    // 중앙은 배경 투명하게 — 좌우 경계에만 얇은 그라데이션 암막
    const fadeW = Math.round(cw * 0.08);

    const leftFade = this.add.graphics();
    for(let i = 0; i < fadeW; i++){
      const a = (1 - i/fadeW) * 0.5;
      leftFade.fillStyle(0x050407, a);
      leftFade.fillRect(lw + i, hdrH, 1, H - hdrH);
    }
    center.add(leftFade);

    const rightFade = this.add.graphics();
    for(let i = 0; i < fadeW; i++){
      const a = (i/fadeW) * 0.5;
      rightFade.fillStyle(0x050407, a);
      rightFade.fillRect(lw + cw - fadeW + i, hdrH, 1, H - hdrH);
    }
    center.add(rightFade);

    // 하단 정보 영역 (일러스트 아래쪽) — 반투명 배경
    const infoH = Math.round((H - hdrH) * 0.38);
    const infoBg= this.add.graphics();
    infoBg.fillStyle(0x050407, 0.72);
    infoBg.fillRect(lw + fadeW, H - infoH, cw - fadeW*2, infoH);
    center.add(infoBg);

    // 중앙 상단: 빈 상태 힌트 (프로필 오픈 시 교체)
    this._centerInfoY = H - infoH;
    this._centerInfoH = infoH;
    this._centerFadeW = fadeW;
  }

  _buildCenterEmpty() {
    this._clearProfile();
    const lw  = this._lw;
    const cw  = this._cw;
    const H   = this.H;
    const hint= this.add.text(lw + cw/2, this._centerInfoY - 40,
      '캐릭터를 클릭하면 프로필이 표시됩니다', {
        fontSize: this._fs(13), fill:'#2a1c0a', fontFamily:FontManager.MONO,
      }).setOrigin(0.5).setAlpha(0.4);
    this._profileContainer.add(hint);
  }

  _clearProfile() {
    this._profileContainer.removeAll(true);
  }

  // ══════════════════════════════════════════════════════════════
  //  우측 패널 배경
  // ══════════════════════════════════════════════════════════════
  _buildRightPanel() {
    const { H } = this;
    const pm    = this._pm;
    const right = this._rightContainer;

    const rBg = this.add.graphics();
    rBg.fillStyle(0x05080c, 0.90);
    rBg.lineStyle(1, 0x2a1a08, 0.5);
    rBg.strokeRect(this._slotAreaX, this._slotAreaY, this._slotAreaW, H - this._slotAreaY - pm);
    rBg.fillRect(this._slotAreaX, this._slotAreaY, this._slotAreaW, H - this._slotAreaY - pm);
    right.add(rBg);

    // 슬롯/관리 구분선
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x1e1008, 0.6);
    sep.lineBetween(this._slotAreaX + pm, this._manageY, this._slotAreaX + this._slotAreaW - pm, this._manageY);
    right.add(sep);

    // 슬롯 영역 레이블
    right.add(this.add.text(this._slotAreaX + pm + 4, this._slotAreaY, '파  티  슬  롯', {
      fontSize: this._fs(9), fill:'#3a1e08', fontFamily:FontManager.TITLE,
    }).setOrigin(0, 0));
  }

  // ══════════════════════════════════════════════════════════════
  //  파티 슬롯 (우측 상단 세로 배열)
  // ══════════════════════════════════════════════════════════════
  _buildPartySlots() {
    // 기존 슬롯 hit 정리
    this._slotHits.forEach(h=>{ try{h.destroy();}catch(e){} });
    this._slotHits = [];
    this._slotContainer.removeAll(true);

    const fs    = this._fs.bind(this);
    const pm    = this._pm;
    const aX    = this._slotAreaX + pm;
    const aY    = this._slotAreaY + parseInt(fs(16));
    const aW    = this._slotAreaW - pm * 2;
    const aH    = this._slotAreaH - parseInt(fs(16)) - pm;
    const count = this._party.length;

    if(count === 0){
      const hint = this.add.text(aX + aW/2, aY + aH/2,
        '캐릭터를 선택하면\n파티에 추가됩니다', {
          fontSize:fs(11), fill:'#2a1808', fontFamily:FontManager.MONO, align:'center', lineSpacing:4,
        }).setOrigin(0.5).setAlpha(0.4);
      this._slotContainer.add(hint);
      return;
    }

    // 슬롯 크기 — 세로 배열, aH 안에 균등 분배 (최대 6칸 기준)
    const maxVisible = 6;
    const slotH = Math.min(Math.floor(aH / Math.min(count, maxVisible)) - parseInt(fs(3)), Math.round(aW * 0.55));
    const slotW = Math.round(slotH * 1.6);
    const gap   = Math.max(parseInt(fs(3)), Math.floor((aH - Math.min(count, maxVisible) * slotH) / (Math.min(count, maxVisible) + 1)));

    this._party.forEach((charId, idx) => {
      const char = this._chars.find(c => c.id === charId);
      if(!char) return;
      if(idx >= maxVisible) return; // 6명 초과 시 스크롤 추후 구현

      const cy = aY + gap + idx * (slotH + gap) + slotH / 2;
      const cx = aX + aW / 2;
      const isSel = this._slotSelected === charId;
      const cogC  = CharacterManager.getCogColor(char.cog);

      const bg = this.add.graphics();
      const drawBg = (sel) => {
        bg.clear();
        if(sel){ bg.fillStyle(0x2a0808,1); bg.lineStyle(2,0xff4444,1); }
        else   { bg.fillStyle(0x1a1008,1); bg.lineStyle(2,cogC.phaser,0.85); }
        bg.fillRect(cx-slotW/2, cy-slotH/2, slotW, slotH);
        bg.strokeRect(cx-slotW/2, cy-slotH/2, slotW, slotH);
      };
      drawBg(isSel);
      this._slotContainer.add(bg);

      // 스프라이트 (슬롯 좌측 영역)
      const portSize = slotH * 0.80;
      const portCX   = cx - slotW/2 + portSize/2 + parseInt(fs(3));
      if(this.textures.exists(char.spriteKey)){
        const img = this.add.image(portCX, cy, char.spriteKey).setDisplaySize(portSize, portSize);
        this._slotContainer.add(img);
      }

      // 이름 + Cog (슬롯 우측)
      const textX = cx - slotW/2 + portSize + parseInt(fs(6));
      const textW = slotW - portSize - parseInt(fs(8));
      this._slotContainer.add([
        this.add.text(textX, cy - slotH*0.18, char.name, {
          fontSize:fs(9), fill:'#c8bfb0', fontFamily:FontManager.TITLE, wordWrap:{width:textW},
        }).setOrigin(0, 0.5),
        this.add.text(textX, cy + slotH*0.18, `Cog ${char.cog}  ${char.jobLabel||''}`, {
          fontSize:fs(8), fill:cogC.css, fontFamily:FontManager.MONO,
        }).setOrigin(0, 0.5),
      ]);

      // 제거 힌트 (선택 시 표시)
      if(isSel){
        const rmTxt = this.add.text(cx + slotW/2 - parseInt(fs(4)), cy, '×', {
          fontSize:fs(14), fill:'#ff4444', fontFamily:FontManager.MONO,
        }).setOrigin(1, 0.5);
        this._slotContainer.add(rmTxt);
      }

      const hit = this.add.rectangle(cx, cy, slotW, slotH, 0, 0)
        .setInteractive({useHandCursor:true}).setDepth(22);
      this._slotHits.push(hit);

      hit.on('pointerup', () => {
        if(this._slotSelected === charId){
          this._slotSelected = null;
          this._removeFromPartyById(charId);
        } else {
          this._slotSelected = charId;
          this._buildPartySlots();
          const ch = this._chars.find(c => c.id === charId);
          if(ch) this._openProfile(ch);
        }
      });
    });

    // 6명 초과 표시
    if(this._party.length > maxVisible){
      const cy = aY + gap + maxVisible*(slotH+gap) + parseInt(fs(8));
      this._slotContainer.add(this.add.text(aX + aW/2, cy,
        `+${this._party.length - maxVisible}명 더`, {
          fontSize:fs(10), fill:'#5a3818', fontFamily:FontManager.MONO,
        }).setOrigin(0.5));
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  관리 패널 (우측 하단)
  // ══════════════════════════════════════════════════════════════
  _buildManagePanel() {
    this._manageContainer.removeAll(true);
    // 이전 출발버튼 sceneHit 정리
    this._manageHits = this._manageHits || [];
    this._manageHits.forEach(h=>{ try{h.destroy();}catch(e){} });
    this._manageHits = [];

    const fs   = this._fs.bind(this);
    const pm   = this._pm;
    const mX   = this._slotAreaX + pm;
    const mY   = this._manageY + pm;
    const mW   = this._slotAreaW - pm * 2;
    const mH   = this._manageH - pm;
    const add  = (o) => { this._manageContainer.add(o); return o; };

    const count     = this._party.length;
    const cost      = this._calcCost();
    const arc       = typeof SaveManager!=='undefined'&&SaveManager.getArc ? SaveManager.getArc() : 0;
    const canAfford = arc >= cost;
    const canStart  = count > 0 && canAfford;

    // 파티 현황 텍스트 (curY 누적)
    let curY = mY;
    add(this.add.text(mX, curY, '파  티  현  황', {fontSize:fs(10),fill:'#4a2e10',fontFamily:FontManager.MONO}));
    curY += parseInt(fs(16));
    add(this.add.text(mX, curY, `인  원  :  ${count}명`, {fontSize:fs(12),fill:'#c8bfb0',fontFamily:FontManager.MONO}));
    curY += parseInt(fs(15));
    add(this.add.text(mX, curY, `비  용  :  ${cost} Arc`, {fontSize:fs(12),fill:canAfford?'#c8a060':'#cc4444',fontFamily:FontManager.MONO}));
    curY += parseInt(fs(15));
    add(this.add.text(mX, curY, `보  유  :  ${arc} Arc`, {fontSize:fs(11),fill:'#5a4a28',fontFamily:FontManager.MONO}));
    curY += parseInt(fs(18));

    // 멤버 목록
    this._party.forEach(id => {
      const ch = this._chars.find(c=>c.id===id);
      if(!ch || curY + parseInt(fs(12)) > mY + mH - parseInt(fs(56))) return;
      const cc = CharacterManager.getCogColor(ch.cog);
      add(this.add.text(mX, curY, `· ${ch.name}  C${ch.cog}`, {fontSize:fs(10),fill:cc.css,fontFamily:FontManager.MONO}));
      curY += parseInt(fs(13));
    });

    // 출발 버튼 (하단 고정)
    const btnH = parseInt(fs(44));
    const btnY = mY + mH - btnH;
    const btnW = mW;

    const sBg = add(this.add.graphics());
    const drawS = (st) => {
      sBg.clear();
      if(st==='disabled'){ sBg.fillStyle(0x0a0807,1); sBg.lineStyle(1,0x1a1008,0.5); }
      else if(st==='hover'){ sBg.fillStyle(0x2a1a08,1); sBg.lineStyle(2,0xc8a070,1); }
      else { sBg.fillStyle(0x1e1008,1); sBg.lineStyle(2,0xa05018,0.9); }
      sBg.strokeRect(mX, btnY, btnW, btnH); sBg.fillRect(mX, btnY, btnW, btnH);
    };
    drawS(canStart?'active':'disabled');

    const sTxt = add(this.add.text(mX + btnW/2, btnY + btnH/2, '출  발', {
      fontSize:fs(18), fill:canStart?'#c8a070':'#2a1a0a', fontFamily:FontManager.TITLE,
    }).setOrigin(0.5));

    const guide = canStart ? `${count}명  ·  ${cost} Arc 소모` : (count===0 ? '파티 인원을 선택하세요' : `Arc 부족  (${cost-arc} 부족)`);
    add(this.add.text(mX + btnW/2, btnY - parseInt(fs(6)), guide, {
      fontSize:fs(9), fill:canStart?'#5a3a18':'#6a2020', fontFamily:FontManager.MONO,
    }).setOrigin(0.5, 1));

    if(canStart){
      const sH = this.add.rectangle(mX+btnW/2, btnY+btnH/2, btnW, btnH, 0,0)
        .setInteractive({useHandCursor:true}).setDepth(20);
      this._manageHits.push(sH);
      sH.on('pointerover',()=>{ drawS('hover'); sTxt.setStyle({fill:'#e8d090'}); });
      sH.on('pointerout', ()=>{ drawS('active'); sTxt.setStyle({fill:'#c8a070'}); });
      sH.on('pointerup',  ()=>this._depart());
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  프로필 (중앙 패널 동적)
  // ══════════════════════════════════════════════════════════════
  _openProfile(char) {
    this._selectedChar = char;
    this._cardObjs.forEach(({container:c})=>{ if(c._drawCbg) c._drawCbg(false); });
    this._clearProfile();
    this._buildProfile(char);
  }

  _buildProfile(char) {
    const fs    = this._fs.bind(this);
    const pm    = this._pm;
    const lw    = this._lw;
    const cw    = this._cw;
    const H     = this.H;
    const fadeW = this._centerFadeW;
    const infoY = this._centerInfoY;
    const infoH = this._centerInfoH;
    const cx    = lw + cw / 2;
    const add   = (o) => { this._profileContainer.add(o); return o; };

    // ── 일러스트 (중앙 크게) ────────────────────────────────
    const imgAreaH = infoY - this._hdrH - pm * 2;
    const imgAreaY = this._hdrH + pm;

    if(char.spriteKey && this.textures.exists(char.spriteKey)){
      const img = add(this.add.image(cx, imgAreaY + imgAreaH * 0.55, char.spriteKey).setOrigin(0.5));
      const mw  = cw * 0.72, mh = imgAreaH * 0.92;
      img.setScale(Math.min(mw/img.width, mh/img.height));
    } else {
      const JS = {fisher:'FISH', diver:'DIVE', ai:'A·I'};
      add(this.add.text(cx, imgAreaY + imgAreaH*0.5, JS[char.job]||'?', {
        fontSize:fs(60), fill:'#1a2028', fontFamily:FontManager.MONO,
      }).setOrigin(0.5));
    }

    // ── 정보 영역 (하단 반투명 박스 안) ────────────────────
    const infoX = lw + fadeW + pm;
    const infoW = cw - fadeW*2 - pm*2;
    const pad   = Math.max(parseInt(fs(8)), Math.floor(infoW*0.04));
    const rScale= Math.max(0.80, Math.min(1.3, infoW / 280));
    const rfs   = n => fs(Math.round(n * rScale));
    const colX  = infoX + pad;
    const colW  = infoW - pad*2;
    let curY    = infoY + pad;

    // 이름 + 직업 + Cog 한 줄
    const cogCC = CharacterManager.getCogColor ? CharacterManager.getCogColor(char.cog).css : '#c8a040';
    add(this.add.text(colX, curY, char.name, {fontSize:rfs(24),fill:'#e8c070',fontFamily:FontManager.TITLE}).setOrigin(0,0));
    add(this.add.text(colX+colW, curY, `◈ Cog ${char.cog}`, {fontSize:rfs(13),fill:cogCC,fontFamily:FontManager.MONO}).setOrigin(1,0));
    curY += parseInt(rfs(26));

    // 직업 + 오버클럭
    const jobLine = `${char.jobLabel||char.job}${char.overclock ? '  ·  '+( char.overclock.name||'오버클럭') : ''}`;
    const jobCol  = char.overclock ? (char.overclock.color||'#ff4400') : '#c8802a';
    add(this.add.text(colX, curY, jobLine, {fontSize:rfs(12),fill:jobCol,fontFamily:FontManager.MONO}).setOrigin(0,0));
    curY += parseInt(rfs(16));

    // HP 바
    const hpBH = parseInt(rfs(18));
    const hpP  = char.maxHp>0 ? char.currentHp/char.maxHp : 1;
    const hpC  = hpP>0.6?0x306030:hpP>0.3?0x806020:0x803020;
    const hpBg = add(this.add.graphics()); hpBg.fillStyle(0x030506,0.85); hpBg.lineStyle(1,0x2a1a08,0.6); hpBg.strokeRect(colX,curY,colW,hpBH); hpBg.fillRect(colX,curY,colW,hpBH);
    const hpFg = add(this.add.graphics()); hpFg.fillStyle(hpC,1); hpFg.fillRect(colX+1,curY+1,Math.max(0,Math.round((colW-2)*hpP)),hpBH-2);
    add(this.add.text(colX+colW/2, curY+hpBH/2, `HP  ${char.currentHp} / ${char.maxHp}`, {fontSize:rfs(10),fill:'#d0b060',fontFamily:FontManager.MONO}).setOrigin(0.5));
    curY += hpBH + parseInt(rfs(5));

    // 스탯 블록 — 2열로 간략하게
    const SC    = CharacterManager.STAT_COLORS || {hp:'#ff88bb',health:'#88ddaa',attack:'#ff3333',agility:'#55ccff',luck:'#ddcc44'};
    const SDEFS = [{key:'hp',label:'체력'},{key:'health',label:'건강'},{key:'attack',label:'공격'},{key:'agility',label:'민첩'},{key:'luck',label:'행운'}];
    const ocKey = char.overclock ? char.overclock.statKey : null;
    const ocHex = ocKey ? parseInt((char.overclock.color||'#ff4400').replace('#','0x')) : null;
    const sRowH = parseInt(rfs(19));
    const sBH   = Math.ceil(SDEFS.length/2) * sRowH;
    const col2W = Math.floor(colW/2) - parseInt(rfs(3));

    const sBg = add(this.add.graphics());
    sBg.fillStyle(0x060810,0.80);
    if(ocKey){[{p:2,a:0.15},{p:1,a:0.30}].forEach(({p,a})=>{sBg.lineStyle(1,ocHex,a);sBg.strokeRect(colX-p,curY-p,colW+p*2,sBH+p*2);});}
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
        const sg=add(this.add.graphics());sg.lineStyle(1,0x1e1206,0.35);sg.lineBetween(colX+2,sy,colX+colW-2,sy);
      }
      if(isOc){const gB=add(this.add.graphics());const bw=col2W-2;for(let s=0;s<12;s++){gB.fillStyle(ocHex,0.18-(0.15*s/11));gB.fillRect(sx+1+s*(bw/12),sy+1,Math.ceil(bw/12),sRowH-2);}gB.fillStyle(ocHex,0.85);gB.fillRect(sx+1,sy+1,2,sRowH-2);}
      add(this.add.text(sx+4,midY,label,{fontSize:rfs(10),fill:isOc?(char.overclock.color||'#ff4400'):sCol+'cc',fontFamily:FontManager.MONO}).setOrigin(0,0.5));
      add(this.add.text(sx+col2W-4,midY,vStr,{fontSize:rfs(11),fill:isOc?(char.overclock.color||'#ff4400'):sCol,fontFamily:FontManager.MONO}).setOrigin(1,0.5));
    });
    curY += sBH + parseInt(rfs(4));

    // 어빌리티 (포지션/패시브/스킬) 한 줄씩
    [{label:'포지션',val:char.position||'—'},{label:'패시브',val:char.passive||'—'},{label:'스킬',val:char.skill||'—'}]
      .forEach(({label,val})=>{
        if(curY + parseInt(rfs(16)) > infoY + infoH - pad) return;
        const rb=add(this.add.graphics());rb.fillStyle(0x0a0c10,0.65);rb.lineStyle(1,0x1e1a0c,0.4);rb.fillRect(colX,curY,colW,parseInt(rfs(16)));rb.strokeRect(colX,curY,colW,parseInt(rfs(16)));
        add(this.add.text(colX+5,curY+parseInt(rfs(8)),label,{fontSize:rfs(9),fill:'#4a3018',fontFamily:FontManager.MONO}).setOrigin(0,0.5));
        add(this.add.text(colX+colW-5,curY+parseInt(rfs(8)),val,{fontSize:rfs(9),fill:'#c8a060',fontFamily:FontManager.MONO,wordWrap:{width:colW*0.70}}).setOrigin(1,0.5));
        curY += parseInt(rfs(16))+2;
      });
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
    return this._party.reduce((s,id)=>{ const c=this._chars.find(ch=>ch.id===id); return s+(c?c.cog:0); },0);
  }

  // ══════════════════════════════════════════════════════════════
  //  필터
  // ══════════════════════════════════════════════════════════════
  _applyFilter() {
    let r = this._chars.slice();
    if(this._filterJob!=='all') r=r.filter(c=>c.job===this._filterJob);
    if(this._filterCog!=='all') r=r.filter(c=>String(c.cog)===String(this._filterCog));
    if(this._sortMode==='date'){
      const ts=id=>{ const p=(id||'').split('_'); const t=parseInt(p[1],10); return isNaN(t)?0:t; };
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
    let sy=0, ss=0, drag=false;
    const inA=(ptr)=>ptr.x>=this._cardAreaX&&ptr.x<=this._cardAreaX+this._cardAreaW&&ptr.y>=this._cardAreaY&&ptr.y<=this._cardAreaY+this._cardAreaH;
    this._dragDown=(ptr)=>{ if(!inA(ptr))return; drag=true; this._dragged=false; sy=ptr.y; ss=this._scrollY; };
    this._dragMove=(ptr)=>{ if(!drag)return; const dy=sy-ptr.y; if(Math.abs(dy)>4)this._dragged=true; const mx=Math.max(0,this._totalCardH-this._cardAreaH); this._scrollY=Math.max(0,Math.min(ss+dy,mx)); if(this._cardRow)this._cardRow.setY(this._cardAreaY-this._scrollY); };
    this._dragUp=()=>{ drag=false; if(this._dragTimer){this._dragTimer.remove();this._dragTimer=null;} this._dragTimer=this.time.delayedCall(100,()=>{this._dragged=false;}); };
    this._dragWheel=(ptr,o,dx,dy)=>{ if(!inA(ptr))return; const mx=Math.max(0,this._totalCardH-this._cardAreaH); this._scrollY=Math.max(0,Math.min(this._scrollY+dy*0.5,mx)); if(this._cardRow)this._cardRow.setY(this._cardAreaY-this._scrollY); };
    this.input.on('pointerdown', this._dragDown);
    this.input.on('pointermove', this._dragMove);
    this.input.on('pointerup',   this._dragUp);
    this.input.on('wheel',       this._dragWheel);
  }

  // ══════════════════════════════════════════════════════════════
  //  출발
  // ══════════════════════════════════════════════════════════════
  _depart() {
    const cost = this._calcCost();
    const ok   = SaveManager.spendArc ? SaveManager.spendArc(cost) : true;
    if(!ok){ this._buildManagePanel(); return; }
    if(CharacterManager.saveParty) CharacterManager.saveParty(this._party);
    const fl = this.add.rectangle(0,0,this.W,this.H,0x050407,0).setOrigin(0).setDepth(999);
    this.tweens.add({targets:fl, alpha:1, duration:350, ease:'Sine.easeIn',
      onComplete:()=>this.scene.start('ExploreScene',{from:'PartyScene'})});
  }

  // ══════════════════════════════════════════════════════════════
  //  정리
  // ══════════════════════════════════════════════════════════════
  shutdown() {
    this._sceneHits.forEach(h=>{ try{h.destroy();}catch(e){} });
    this._slotHits.forEach(h=>{  try{h.destroy();}catch(e){} });
    if(this._manageHits) this._manageHits.forEach(h=>{ try{h.destroy();}catch(e){} });
    this._sceneHits = []; this._slotHits = [];
    if(this._dragTimer){ try{this._dragTimer.remove();}catch(e){} }
    if(this._dblTimer){  try{this._dblTimer.remove(); }catch(e){} }
    this.input.off('pointerdown', this._dragDown);
    this.input.off('pointermove', this._dragMove);
    this.input.off('pointerup',   this._dragUp);
    this.input.off('wheel',       this._dragWheel);
  }
}
