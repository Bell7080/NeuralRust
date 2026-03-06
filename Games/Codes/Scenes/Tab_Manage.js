// ================================================================
//  Tab_Manage.js
//  경로: Games/Codes/Scenes/Tab_Manage.js
//
//  레이아웃
//  ┌────────────────────────────────────────┐
//  │  [카드][카드][카드][카드][카드][카드] ▌│  ← 가로 스크롤
//  │                                        │
//  │  (카드 클릭 → 우측에 프로필 팝업)      │
//  └────────────────────────────────────────┘
//
//  프로필 팝업 (이미지2 참고)
//  ┌─────────────────┐
//  │ [초상화] 이름/직업/Cog  │
//  │          나이/스탯 바  │
//  │ [패시브 박스]           │
//  │ [스킬 박스]             │
//  │ [회복] [닫기]           │
//  └─────────────────┘
// ================================================================

class Tab_Manage {
  constructor(scene, W, H) {
    this.scene = scene;
    this.W = W;
    this.H = H;
    this._container  = scene.add.container(0, 0);
    this._popupGroup = null;     // 현재 열린 팝업
    this._openCharId = null;     // 열린 카드 ID
    this._scrollX    = 0;        // 카드 열 스크롤 오프셋
    this._dragStart  = null;
    this._cardObjs   = [];       // { cardContainer, char }
    this._maskShape  = null;
    this._build();
  }

  // ── 전체 레이아웃 ─────────────────────────────────────────────
  _build() {
    const { scene, W, H } = this;
    const cx  = W / 2;

    // 패널 영역
    const panelX = W * 0.14;
    const panelY = H * 0.13;
    const panelW = W * 0.72;
    const panelH = H * 0.76;

    // 패널 배경
    const bg = scene.add.graphics();
    bg.fillStyle(0x0d0a06, 0.97);
    bg.lineStyle(1, 0x4a2a10, 0.8);
    bg.strokeRect(panelX, panelY, panelW, panelH);
    bg.fillRect(panelX, panelY, panelW, panelH);
    this._container.add(bg);

    // 헤더 라벨
    const hdr = scene.add.text(panelX + 16, panelY + 16, '[ 관  리 ]', {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    this._container.add(hdr);

    // 카드 영역 설정
    this._cardAreaX = panelX + 10;
    this._cardAreaY = panelY + parseInt(scaledFontSize(44, scene.scale));
    this._cardAreaW = panelW - 20;
    this._cardAreaH = parseInt(scaledFontSize(140, scene.scale));

    // 카드 클리핑용 마스크 (visible false — 화면에 렌더되지 않음)
    const maskGfx = scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(this._cardAreaX, this._cardAreaY, this._cardAreaW, this._cardAreaH);
    maskGfx.setVisible(false);
    this._maskGfx = maskGfx;

    // 카드 컨테이너 (스크롤될 부분)
    this._cardRow = scene.add.container(this._cardAreaX, this._cardAreaY);
    this._cardRow.setMask(maskGfx.createGeometryMask());
    this._container.add(this._cardRow);

    // 구분선
    const sepY = this._cardAreaY + this._cardAreaH + 8;
    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x2a1a08, 0.9);
    sep.lineBetween(panelX + 10, sepY, panelX + panelW - 10, sepY);
    this._container.add(sep);

    // 설명 텍스트 (카드 아래)
    this._infoText = scene.add.text(panelX + 16, sepY + 14,
      '캐릭터를 클릭하면 프로필을 볼 수 있습니다', {
      fontSize: scaledFontSize(11, scene.scale),
      fill: '#3a2510', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    this._container.add(this._infoText);

    // 카드 빌드
    this._buildCards();

    // 드래그 입력 등록
    this._setupDrag();
  }

  // ── 카드 생성 ──────────────────────────────────────────────────
  _buildCards() {
    const { scene } = this;
    const chars   = CharacterManager.initIfEmpty();
    const cardW   = parseInt(scaledFontSize(120, scene.scale));
    const cardH   = parseInt(scaledFontSize(120, scene.scale));
    const cardGap = parseInt(scaledFontSize(14, scene.scale));
    this._cardW   = cardW;
    this._cardGap = cardGap;

    chars.forEach((char, i) => {
      const cx   = i * (cardW + cardGap);
      const card = this._makeCard(char, cx, 0, cardW, cardH);
      this._cardRow.add(card);
      this._cardObjs.push({ container: card, char });
    });

    // 총 스크롤 너비
    this._totalCardW = chars.length * (cardW + cardGap) - cardGap;
  }

  _makeCard(char, x, y, cw, ch) {
    const { scene } = this;
    const c = scene.add.container(x, y);

    // 직업별 색상
    const JOB_COLOR = { fisher: 0x1a3050, diver: 0x1a3020, ai: 0x2a1a3a };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };
    const fill   = JOB_COLOR[char.job]  || 0x1a1810;
    const border = JOB_BORDER[char.job] || 0x4a3010;

    const bg = scene.add.graphics();
    bg.fillStyle(fill, 1);
    bg.lineStyle(1, border, 0.9);
    bg.strokeRect(0, 0, cw, ch);
    bg.fillRect(0, 0, cw, ch);

    // 초상화 플레이스홀더
    const portrait = scene.add.graphics();
    const pw = cw * 0.6; const ph = ch * 0.45;
    const px = (cw - pw) / 2; const py = ch * 0.07;
    portrait.fillStyle(0x0a0806, 0.8);
    portrait.lineStyle(1, border, 0.6);
    portrait.strokeRect(px, py, pw, ph);
    portrait.fillRect(px, py, pw, ph);
    // 직업 약칭 텍스트 (이모지 대체)
    const JOB_SHORT = { fisher: 'FISH', diver: 'DIVE', ai: 'A·I' };
    const iconTxt = scene.add.text(px + pw / 2, py + ph / 2,
      JOB_SHORT[char.job] || '???', {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#6a8888', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    // 이름
    const name = scene.add.text(cw / 2, py + ph + 8, char.name, {
      fontSize: scaledFontSize(11, scene.scale),
      fill: '#c8a060', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    // 직업 + Cog
    const job = scene.add.text(cw / 2, py + ph + 24, `${char.jobLabel}  Cog${char.cog}`, {
      fontSize: scaledFontSize(9, scene.scale),
      fill: '#7a5830', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    // HP 바
    const barY = ch - 14;
    const barBg = scene.add.graphics();
    barBg.fillStyle(0x0a0806, 1);
    barBg.fillRect(6, barY, cw - 12, 6);
    const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const barFill = scene.add.graphics();
    const hpColor = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    barFill.fillStyle(hpColor, 1);
    barFill.fillRect(6, barY, Math.round((cw - 12) * hpPct), 6);

    c.add([bg, portrait, iconTxt, name, job, barBg, barFill]);

    // 히트 영역
    const hit = scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.lineStyle(2, 0xc8a060, 0.9);
      bg.strokeRect(0, 0, cw, ch);
      bg.fillRect(0, 0, cw, ch);
    });
    hit.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.lineStyle(1, border, 0.9);
      bg.strokeRect(0, 0, cw, ch);
      bg.fillRect(0, 0, cw, ch);
    });
    hit.on('pointerup', (ptr) => {
      if (this._dragged) return; // 드래그 중엔 카드 선택 방지
      if (this._openCharId === char.id) {
        this._closePopup();
      } else {
        this._openPopup(char);
      }
    });
    c.add(hit);

    return c;
  }

  // ── 드래그 스크롤 ─────────────────────────────────────────────
  // dragHit 대신 scene.input 레벨로 처리 → 카드 hit 영역 클릭 차단 방지
  _setupDrag() {
    const { scene } = this;
    const aX = this._cardAreaX;
    const aY = this._cardAreaY;
    const aW = this._cardAreaW;
    const aH = this._cardAreaH;

    let startX      = 0;
    let startScroll = 0;
    this._dragged   = false;

    const inArea = (ptr) =>
      ptr.x >= aX && ptr.x <= aX + aW &&
      ptr.y >= aY && ptr.y <= aY + aH;

    this._dragOnDown = (ptr) => {
      if (!inArea(ptr)) return;
      startX = ptr.x;
      startScroll = this._scrollX;
      this._dragged = false;
    };
    this._dragOnMove = (ptr) => {
      if (!ptr.isDown) return;
      const dx = ptr.x - startX;
      if (Math.abs(dx) > 5) this._dragged = true;
      if (!this._dragged) return;
      if (!inArea(ptr) && Math.abs(dx) < 60) return; // 약간 벗어나도 드래그 유지
      this._scrollTo(startScroll + dx);
    };
    this._dragOnUp = () => {
      scene.time.delayedCall(50, () => { this._dragged = false; });
    };

    scene.input.on('pointerdown', this._dragOnDown);
    scene.input.on('pointermove', this._dragOnMove);
    scene.input.on('pointerup',   this._dragOnUp);

    // 마우스 휠
    this._dragOnWheel = (ptr, objs, dx, dy) => {
      if (!inArea(ptr)) return;
      this._scrollTo(this._scrollX - dy * 0.8);
    };
    scene.input.on('wheel', this._dragOnWheel);
  }

  _scrollTo(x) {
    const maxScroll = Math.max(0, this._totalCardW - this._cardAreaW);
    this._scrollX = Math.max(-maxScroll, Math.min(0, x));
    this._cardRow.x = this._cardAreaX + this._scrollX;
  }

  // ── 프로필 팝업 ───────────────────────────────────────────────
  _openPopup(char) {
    this._closePopup();
    this._openCharId = char.id;

    const { scene, W, H } = this;
    const pw = W * 0.30;
    const ph = H * 0.68;
    // 팝업은 패널 오른쪽 안쪽에 붙임
    const px = W * 0.84 - pw;
    const py = H * 0.16;

    const g = scene.add.container(0, 0).setDepth(100);
    this._popupGroup = g;
    this._container.add(g);

    // 팝업 배경
    const popBg = scene.add.graphics();
    popBg.fillStyle(0x0a0806, 0.98);
    popBg.lineStyle(1, 0x6a3a10, 0.9);
    popBg.strokeRect(px, py, pw, ph);
    popBg.fillRect(px, py, pw, ph);
    // 코너 장식
    const cs = 10;
    popBg.lineStyle(1, 0x8a5020, 0.7);
    [[px+4,py+4,1,1],[px+pw-4,py+4,-1,1],[px+4,py+ph-4,1,-1],[px+pw-4,py+ph-4,-1,-1]].forEach(([ox,oy,sx,sy])=>{
      popBg.lineBetween(ox,oy,ox+cs*sx,oy);
      popBg.lineBetween(ox,oy,ox,oy+cs*sy);
    });
    g.add(popBg);

    const pad  = pw * 0.06;
    const contentX = px + pad;
    let   curY = py + pad;

    // ── 상단: 초상화 + 이름/직업 ─────────────────────────────
    const portW = pw * 0.32; const portH = portW * 1.15;
    const portPad = scene.add.graphics();
    portPad.fillStyle(0x0d0c08, 1);
    portPad.lineStyle(1, 0x4a3010, 0.7);
    portPad.strokeRect(contentX, curY, portW, portH);
    portPad.fillRect(contentX, curY, portW, portH);
    // 직업 약칭 + 이름 첫 글자 (이모지 대체)
    const JOB_SHORT = { fisher:'FISH', diver:'DIVE', ai:'A·I' };
    const portJobT = scene.add.text(contentX + portW/2, curY + portH*0.35,
      JOB_SHORT[char.job] || '???', {
      fontSize:scaledFontSize(11,scene.scale), fill:'#5a7888', fontFamily:FontManager.MONO,
    }).setOrigin(0.5);
    const portNameT = scene.add.text(contentX + portW/2, curY + portH*0.62,
      char.name[0], {
      fontSize:scaledFontSize(18,scene.scale), fill:'#8aaa88', fontFamily:FontManager.TITLE,
    }).setOrigin(0.5);
    g.add([portPad, portJobT, portNameT]);

    const infoX = contentX + portW + pad;
    const infoW = pw - pad*2 - portW - pad;
    // 이름
    const nameT = scene.add.text(infoX, curY, char.name, {
      fontSize:scaledFontSize(14,scene.scale), fill:'#e8c070', fontFamily:FontManager.TITLE,
    }).setOrigin(0,0);
    // 직업 + Cog
    const jobT = scene.add.text(infoX, curY+parseInt(scaledFontSize(16,scene.scale)),
      `${char.jobLabel}  /  Cog ${char.cog}`,{
      fontSize:scaledFontSize(9,scene.scale), fill:'#8a6030', fontFamily:FontManager.MONO,
    }).setOrigin(0,0);
    // 나이
    const ageT = scene.add.text(infoX, curY+parseInt(scaledFontSize(28,scene.scale)),
      `나이  ${char.age}세`, {
      fontSize:scaledFontSize(9,scene.scale), fill:'#5a4020', fontFamily:FontManager.MONO,
    }).setOrigin(0,0);
    // HP 바
    const hpBarY = curY + portH - 14;
    const hpBarW = pw - pad*2;
    const hpBg2 = scene.add.graphics();
    hpBg2.fillStyle(0x0a0806,1); hpBg2.fillRect(contentX, hpBarY, hpBarW, 8);
    const hpPct = char.maxHp>0?char.currentHp/char.maxHp:1;
    const hpFg2 = scene.add.graphics();
    const hpCol = hpPct>0.6?0x306030:hpPct>0.3?0x806020:0x803020;
    hpFg2.fillStyle(hpCol,1); hpFg2.fillRect(contentX, hpBarY, Math.round(hpBarW*hpPct),8);
    const hpTxt = scene.add.text(contentX+hpBarW/2, hpBarY+4,
      `HP  ${char.currentHp} / ${char.maxHp}`,{
      fontSize:scaledFontSize(8,scene.scale), fill:'#a07040', fontFamily:FontManager.MONO,
    }).setOrigin(0.5,0.5);
    g.add([nameT, jobT, ageT, hpBg2, hpFg2, hpTxt]);

    curY += portH + pad;

    // ── 구분선 ──────────────────────────────────────────────
    const sep1 = scene.add.graphics();
    sep1.lineStyle(1, 0x2a1a08, 0.9);
    sep1.lineBetween(px+pad/2, curY, px+pw-pad/2, curY);
    g.add(sep1);
    curY += 8;

    // ── 스탯 블록 ───────────────────────────────────────────
    const statLabel = scene.add.text(contentX, curY, '[ 스  탯 ]', {
      fontSize:scaledFontSize(9,scene.scale), fill:'#5a3818', fontFamily:FontManager.MONO,
    }).setOrigin(0,0);
    g.add(statLabel);
    curY += parseInt(scaledFontSize(14,scene.scale));

    const STAT_NAMES = [
      ['체력', char.stats.hp],   ['건강', char.stats.health],
      ['공격', char.stats.attack],['민첩', char.stats.agility],
      ['행운', char.stats.luck],
    ];
    const statBgG = scene.add.graphics();
    statBgG.fillStyle(0x0e0b07,1);
    statBgG.lineStyle(1,0x2a1a08,0.7);
    const statBlockH = STAT_NAMES.length * parseInt(scaledFontSize(14,scene.scale)) + 8;
    statBgG.strokeRect(contentX, curY, pw-pad*2, statBlockH);
    statBgG.fillRect(contentX, curY, pw-pad*2, statBlockH);
    g.add(statBgG);
    curY += 4;

    STAT_NAMES.forEach(([lbl, val]) => {
      const row = scene.add.text(contentX+6, curY, `${lbl.padEnd(3,'　')}  ${val}`, {
        fontSize:scaledFontSize(10,scene.scale), fill:'#a07840', fontFamily:FontManager.MONO,
      }).setOrigin(0,0);
      g.add(row);
      curY += parseInt(scaledFontSize(14,scene.scale));
    });
    curY += 4;

    // ── 구분선 ──────────────────────────────────────────────
    const sep2 = scene.add.graphics();
    sep2.lineStyle(1,0x2a1a08,0.9);
    sep2.lineBetween(px+pad/2, curY, px+pw-pad/2, curY);
    g.add(sep2); curY += 8;

    // ── 패시브 / 스킬 박스 ──────────────────────────────────
    const makeBox = (titleStr, bodyStr, yy) => {
      const bh = parseInt(scaledFontSize(44,scene.scale));
      const bx = contentX; const bw = pw - pad*2;
      const boxG = scene.add.graphics();
      boxG.fillStyle(0x0e0b07,1);
      boxG.lineStyle(1,0x3a2010,0.7);
      boxG.strokeRect(bx, yy, bw, bh);
      boxG.fillRect(bx, yy, bw, bh);
      const titleT = scene.add.text(bx+6, yy+4, titleStr,{
        fontSize:scaledFontSize(8,scene.scale), fill:'#5a3818', fontFamily:FontManager.MONO,
      }).setOrigin(0,0);
      const bodyT = scene.add.text(bx+6, yy+4+parseInt(scaledFontSize(10,scene.scale)), bodyStr,{
        fontSize:scaledFontSize(10,scene.scale), fill:'#c8a060', fontFamily:FontManager.TITLE,
        wordWrap:{width:bw-12},
      }).setOrigin(0,0);
      g.add([boxG, titleT, bodyT]);
      return yy + bh + 6;
    };
    curY = makeBox('PASSIVE', char.passive, curY);
    curY = makeBox('SKILL',   char.skill,   curY);

    // ── 하단 회복 버튼 ──────────────────────────────────────
    const missing = char.maxHp - char.currentHp;
    const healCost = Math.ceil(missing * 0.5); // 1HP당 0.5 Arc (반올림)
    const btnY2 = py + ph - parseInt(scaledFontSize(36,scene.scale));
    const btnW2 = (pw - pad*3) / 2;

    // 회복 버튼
    if (missing > 0) {
      const healBg = scene.add.graphics();
      this._drawBtn(healBg, contentX, btnY2, btnW2, parseInt(scaledFontSize(26,scene.scale)), false);
      const healTxt = scene.add.text(contentX + btnW2/2, btnY2+parseInt(scaledFontSize(13,scene.scale)),
        `회복  (${healCost} Arc)`, {
        fontSize:scaledFontSize(9,scene.scale), fill:'#6a9060', fontFamily:FontManager.MONO,
      }).setOrigin(0.5,0.5);
      const healHit = scene.add.rectangle(contentX+btnW2/2, btnY2+parseInt(scaledFontSize(13,scene.scale)),
        btnW2, parseInt(scaledFontSize(26,scene.scale)), 0,0).setInteractive({useHandCursor:true});
      healHit.on('pointerover',()=>this._drawBtn(healBg,contentX,btnY2,btnW2,parseInt(scaledFontSize(26,scene.scale)),false,true));
      healHit.on('pointerout', ()=>this._drawBtn(healBg,contentX,btnY2,btnW2,parseInt(scaledFontSize(26,scene.scale)),false,false));
      healHit.on('pointerup',()=> this._doHeal(char, healCost));
      g.add([healBg, healTxt, healHit]);
    }

    // 닫기 버튼
    const closeX = contentX + btnW2 + pad;
    const closeBg = scene.add.graphics();
    this._drawBtn(closeBg, closeX, btnY2, btnW2, parseInt(scaledFontSize(26,scene.scale)), true);
    const closeTxt = scene.add.text(closeX+btnW2/2, btnY2+parseInt(scaledFontSize(13,scene.scale)),
      '닫  기',{
      fontSize:scaledFontSize(9,scene.scale), fill:'#8a3820', fontFamily:FontManager.MONO,
    }).setOrigin(0.5,0.5);
    const closeHit = scene.add.rectangle(closeX+btnW2/2, btnY2+parseInt(scaledFontSize(13,scene.scale)),
      btnW2, parseInt(scaledFontSize(26,scene.scale)),0,0).setInteractive({useHandCursor:true});
    closeHit.on('pointerover',()=>this._drawBtn(closeBg,closeX,btnY2,btnW2,parseInt(scaledFontSize(26,scene.scale)),true,true));
    closeHit.on('pointerout', ()=>this._drawBtn(closeBg,closeX,btnY2,btnW2,parseInt(scaledFontSize(26,scene.scale)),true,false));
    closeHit.on('pointerup',()=>this._closePopup());
    g.add([closeBg, closeTxt, closeHit]);
  }

  _drawBtn(gfx, x, y, w, h, danger, hover=false) {
    gfx.clear();
    if (danger) {
      gfx.fillStyle(hover?0x241010:0x180a08,1);
      gfx.lineStyle(1,hover?0x8a3020:0x4a2010,0.9);
    } else {
      gfx.fillStyle(hover?0x102010:0x0a1208,1);
      gfx.lineStyle(1,hover?0x4a8030:0x2a4018,0.9);
    }
    gfx.strokeRect(x,y,w,h); gfx.fillRect(x,y,w,h);
  }

  _doHeal(char, cost) {
    const save = SaveManager.load();
    const arc  = save?.arc ?? 0;
    if (arc < cost) {
      this._showToast('Arc가 부족합니다');
      return;
    }
    // Arc 차감
    if (save) { save.arc = arc - cost; SaveManager.save(save); }
    // HP 회복
    const chars = CharacterManager.loadAll();
    const target = chars.find(c => c.id === char.id);
    if (target) { target.currentHp = target.maxHp; CharacterManager.saveAll(chars); }
    this._closePopup();
    this._refreshCards();
  }

  _refreshCards() {
    this._cardObjs = [];
    this._cardRow.destroy();
    this._cardRow = this.scene.add.container(this._cardAreaX + this._scrollX, this._cardAreaY);
    this._cardRow.setMask(this._maskGfx.createGeometryMask());
    this._container.add(this._cardRow);
    this._buildCards();
  }

  _showToast(msg) {
    const { scene, W, H } = this;
    const t = scene.add.text(W/2, H*0.5, msg, {
      fontSize:scaledFontSize(16,scene.scale), fill:'#cc5533', fontFamily:FontManager.MONO,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    scene.tweens.add({targets:t, alpha:1, duration:200, onComplete:()=>{
      scene.time.delayedCall(1200,()=>{
        scene.tweens.add({targets:t, alpha:0, duration:300, onComplete:()=>t.destroy()});
      });
    }});
  }

  _closePopup() {
    if (this._popupGroup) { this._popupGroup.destroy(); this._popupGroup = null; }
    this._openCharId = null;
  }

  show()    { this._container.setVisible(true);  }
  hide()    { this._container.setVisible(false); }
  destroy() {
    this._closePopup();
    if (this._maskGfx) { this._maskGfx.destroy(); this._maskGfx = null; }
    const si = this.scene.input;
    if (this._dragOnDown) si.off('pointerdown', this._dragOnDown);
    if (this._dragOnMove) si.off('pointermove', this._dragOnMove);
    if (this._dragOnUp)   si.off('pointerup',   this._dragOnUp);
    if (this._dragOnWheel)si.off('wheel',        this._dragOnWheel);
    this._container.destroy();
  }
}
