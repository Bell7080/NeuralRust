// ================================================================
//  Tab_Manage.js
// ================================================================

class Tab_Manage {
  constructor(scene, W, H) {
    this.scene = scene;
    this.W = W;
    this.H = H;
    this._container  = scene.add.container(0, 0);
    this._popupGroup = null;
    this._openCharId = null;
    this._scrollX    = 0;
    this._cardObjs   = [];
    this._tooltip    = null;   // 툴팁 오브젝트
    this._build();
  }

  // ── 전체 레이아웃 ─────────────────────────────────────────────
  _build() {
    const { scene, W, H } = this;

    const panelX = W * 0.14;
    const panelY = H * 0.13;
    const panelW = W * 0.72;
    const panelH = H * 0.76;

    const bg = scene.add.graphics();
    bg.fillStyle(0x0d0a06, 0.97);
    bg.lineStyle(1, 0x4a2a10, 0.8);
    bg.strokeRect(panelX, panelY, panelW, panelH);
    bg.fillRect(panelX, panelY, panelW, panelH);
    this._container.add(bg);

    const hdr = scene.add.text(panelX + 16, panelY + 16, '[ 관  리 ]', {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    this._container.add(hdr);

    // ── 카드 그리드 영역 (바둑판) ────────────────────────────
    // 카드 크기를 작게, 그리드로 배치
    const cardW   = parseInt(scaledFontSize(88, scene.scale));
    const cardH   = parseInt(scaledFontSize(88, scene.scale));
    const cardGap = parseInt(scaledFontSize(8, scene.scale));

    this._cardW   = cardW;
    this._cardH   = cardH;
    this._cardGap = cardGap;

    const gridStartX = panelX + 12;
    const gridStartY = panelY + parseInt(scaledFontSize(40, scene.scale));

    // 한 행에 몇 개 들어가는지 계산
    const availW    = panelW - 24;
    const cols      = Math.floor((availW + cardGap) / (cardW + cardGap));
    this._gridCols  = cols;
    this._gridStartX = gridStartX;
    this._gridStartY = gridStartY;

    // 카드 영역 높이: 최대 2행 표시 후 스크롤
    this._cardAreaX = gridStartX;
    this._cardAreaY = gridStartY;
    this._cardAreaW = availW;
    this._cardAreaH = (cardH + cardGap) * 2 + cardGap;

    const maskGfx = scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(this._cardAreaX, this._cardAreaY, this._cardAreaW, this._cardAreaH);
    maskGfx.setVisible(false);
    this._maskGfx = maskGfx;

    this._cardRow = scene.add.container(this._cardAreaX, this._cardAreaY);
    this._cardRow.setMask(maskGfx.createGeometryMask());
    this._container.add(this._cardRow);

    // 구분선
    const sepY = this._cardAreaY + this._cardAreaH + 6;
    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x2a1a08, 0.9);
    sep.lineBetween(panelX + 10, sepY, panelX + panelW - 10, sepY);
    this._container.add(sep);

    this._infoText = scene.add.text(panelX + 16, sepY + 10,
      '캐릭터를 클릭하면 프로필을 볼 수 있습니다', {
      fontSize: scaledFontSize(10, scene.scale),
      fill: '#3a2510', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    this._container.add(this._infoText);

    this._buildCards();
    this._setupDrag();
  }

  // ── 카드 생성 (그리드 배치) ───────────────────────────────────
  _buildCards() {
    const { scene } = this;
    const chars    = CharacterManager.initIfEmpty();
    const cw       = this._cardW;
    const ch       = this._cardH;
    const gap      = this._cardGap;
    const cols     = this._gridCols;

    // 최대 슬롯: 실제 캐릭터 수 이상, 최소 cols*2 (빈칸 채움)
    const totalSlots = Math.max(chars.length, cols * 2);

    for (let i = 0; i < totalSlots; i++) {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const cx   = col * (cw + gap);
      const cy   = row * (ch + gap);
      const char = chars[i] || null;
      const card = this._makeCard(char, cx, cy, cw, ch);
      this._cardRow.add(card);
      if (char) this._cardObjs.push({ container: card, char });
    }

    this._totalCardH = Math.ceil(totalSlots / cols) * (ch + gap) - gap;
    this._totalCardW = cols * (cw + gap) - gap; // 스크롤은 세로로
  }

  _makeCard(char, x, y, cw, ch) {
    const { scene } = this;
    const c = scene.add.container(x, y);

    const JOB_COLOR  = { fisher: 0x1a3050, diver: 0x1a3020, ai: 0x2a1a3a };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };
    const JOB_SHORT  = { fisher: 'FISH', diver: 'DIVE', ai: 'A·I' };

    const fill   = char ? (JOB_COLOR[char.job]  || 0x1a1810) : 0x0c0a07;
    const border = char ? (JOB_BORDER[char.job] || 0x4a3010) : 0x1a1208;

    const bg = scene.add.graphics();
    const drawBg = (hover=false) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.lineStyle(hover ? 2 : 1, hover ? 0xc8a060 : border, 0.9);
      bg.strokeRect(0, 0, cw, ch);
      bg.fillRect(0, 0, cw, ch);
    };
    drawBg();

    if (char) {
      // 초상화 영역 (비워둠 — 나중에 이미지 삽입 예정)
      const portH = ch * 0.52;
      const portW = cw * 0.72;
      const portX = (cw - portW) / 2;
      const portY = ch * 0.05;
      const port = scene.add.graphics();
      port.fillStyle(0x080605, 0.85);
      port.lineStyle(1, border, 0.5);
      port.strokeRect(portX, portY, portW, portH);
      port.fillRect(portX, portY, portW, portH);
      // 직업 약칭 (초상화 없을 때 임시 표시)
      const iconT = scene.add.text(portX + portW/2, portY + portH/2,
        JOB_SHORT[char.job] || '???', {
        fontSize: scaledFontSize(10, scene.scale), fill: '#3a5566', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);

      // 이름
      const nameT = scene.add.text(cw/2, portY + portH + parseInt(scaledFontSize(4,scene.scale)), char.name, {
        fontSize: scaledFontSize(9, scene.scale), fill: '#c8a060', fontFamily: FontManager.TITLE,
      }).setOrigin(0.5, 0);

      // 직업 + Cog (작게)
      const jobT = scene.add.text(cw/2, portY + portH + parseInt(scaledFontSize(14,scene.scale)),
        `${char.jobLabel}  Cog${char.cog}`, {
        fontSize: scaledFontSize(7, scene.scale), fill: '#7a5830', fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0);

      // HP 바 (초상화 바로 아래에 겹쳐서 작게)
      const barY  = portY + portH - 5;
      const barBg = scene.add.graphics();
      barBg.fillStyle(0x050404, 1);
      barBg.fillRect(portX, barY, portW, 5);
      const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
      const hpCol  = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
      const barFg  = scene.add.graphics();
      barFg.fillStyle(hpCol, 1);
      barFg.fillRect(portX, barY, Math.round(portW * hpPct), 5);

      c.add([bg, port, iconT, nameT, jobT, barBg, barFg]);

      // 클릭
      const hit = scene.add.rectangle(cw/2, ch/2, cw, ch, 0, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => drawBg(true));
      hit.on('pointerout',  () => drawBg(false));
      hit.on('pointerup', () => {
        if (this._dragged) return;
        if (this._openCharId === char.id) this._closePopup();
        else this._openPopup(char);
      });
      c.add(hit);
    } else {
      // 빈 슬롯
      const emptyG = scene.add.graphics();
      emptyG.lineStyle(1, 0x1a1208, 0.4);
      emptyG.strokeRect(0, 0, cw, ch);
      c.add(emptyG);
    }

    return c;
  }

  // ── 드래그 스크롤 (세로) ─────────────────────────────────────
  _setupDrag() {
    const { scene } = this;
    const aX = this._cardAreaX;
    const aY = this._cardAreaY;
    const aW = this._cardAreaW;
    const aH = this._cardAreaH;

    let startY      = 0;
    let startScroll = 0;
    this._dragged   = false;

    const inArea = (ptr) =>
      ptr.x >= aX && ptr.x <= aX + aW &&
      ptr.y >= aY && ptr.y <= aY + aH;

    this._dragOnDown = (ptr) => {
      if (!inArea(ptr)) return;
      startY = ptr.y;
      startScroll = this._scrollX;
      this._dragged = false;
    };
    this._dragOnMove = (ptr) => {
      if (!ptr.isDown) return;
      const dy = ptr.y - startY;
      if (Math.abs(dy) > 5) this._dragged = true;
      if (!this._dragged) return;
      this._scrollTo(startScroll + dy);
    };
    this._dragOnUp = () => {
      scene.time.delayedCall(50, () => { this._dragged = false; });
    };
    this._dragOnWheel = (ptr, objs, dx, dy) => {
      if (!inArea(ptr)) return;
      this._scrollTo(this._scrollX - dy * 0.8);
    };

    scene.input.on('pointerdown', this._dragOnDown);
    scene.input.on('pointermove', this._dragOnMove);
    scene.input.on('pointerup',   this._dragOnUp);
    scene.input.on('wheel',       this._dragOnWheel);
  }

  _scrollTo(y) {
    const maxScroll = Math.max(0, this._totalCardH - this._cardAreaH);
    this._scrollX = Math.max(-maxScroll, Math.min(0, y));  // _scrollX를 세로 오프셋으로 재활용
    this._cardRow.y = this._cardAreaY + this._scrollX;
  }

  // ── 프로필 팝업 ───────────────────────────────────────────────
  _openPopup(char) {
    this._closePopup();
    this._openCharId = char.id;

    const { scene, W, H } = this;
    const pw = W * 0.30;
    const ph = H * 0.72;
    const px = W * 0.84 - pw;
    const py = H * 0.14;

    const g = scene.add.container(0, 0).setDepth(100);
    this._popupGroup = g;
    this._container.add(g);

    // 팝업 배경
    const popBg = scene.add.graphics();
    popBg.fillStyle(0x0a0806, 0.98);
    popBg.lineStyle(1, 0x6a3a10, 0.9);
    popBg.strokeRect(px, py, pw, ph);
    popBg.fillRect(px, py, pw, ph);
    const cs = 10;
    popBg.lineStyle(1, 0x8a5020, 0.7);
    [[px+4,py+4,1,1],[px+pw-4,py+4,-1,1],[px+4,py+ph-4,1,-1],[px+pw-4,py+ph-4,-1,-1]].forEach(([ox,oy,sx,sy])=>{
      popBg.lineBetween(ox,oy,ox+cs*sx,oy);
      popBg.lineBetween(ox,oy,ox,oy+cs*sy);
    });
    g.add(popBg);

    const pad      = pw * 0.06;
    const contentX = px + pad;
    const contentW = pw - pad * 2;
    let   curY     = py + pad;

    const fs = n => scaledFontSize(n, scene.scale);

    // ── 초상화 (비워둠) ─────────────────────────────────────────
    const portW = contentW;
    const portH = parseInt(fs(90));
    const portBox = scene.add.graphics();
    portBox.fillStyle(0x080605, 0.9);
    portBox.lineStyle(1, 0x3a2510, 0.5);
    portBox.strokeRect(contentX, curY, portW, portH);
    portBox.fillRect(contentX, curY, portW, portH);
    // 임시 직업 아이콘
    const JOB_SHORT = { fisher:'FISH', diver:'DIVE', ai:'A·I' };
    const portIcon = scene.add.text(contentX + portW/2, curY + portH/2,
      JOB_SHORT[char.job]||'???', {
      fontSize: fs(14), fill: '#2a3a44', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    g.add([portBox, portIcon]);

    // HP 바 (초상화 하단에 겹쳐서)
    const hpBarH  = 8;
    const hpBarY  = curY + portH - hpBarH;
    const hpPct   = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol   = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    const hpBg    = scene.add.graphics();
    hpBg.fillStyle(0x050404, 0.9); hpBg.fillRect(contentX, hpBarY, portW, hpBarH);
    const hpFg    = scene.add.graphics();
    hpFg.fillStyle(hpCol, 1); hpFg.fillRect(contentX, hpBarY, Math.round(portW * hpPct), hpBarH);
    const hpTxt   = scene.add.text(contentX + portW/2, hpBarY + 4,
      `HP  ${char.currentHp} / ${char.maxHp}`, {
      fontSize: fs(7), fill: '#a07040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0.5);
    g.add([hpBg, hpFg, hpTxt]);
    curY += portH + parseInt(fs(8));

    // ── 이름 ────────────────────────────────────────────────────
    const nameT = scene.add.text(contentX, curY, char.name, {
      fontSize: fs(15), fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0);
    g.add(nameT);
    curY += parseInt(fs(18));

    // ── 나이 ────────────────────────────────────────────────────
    const ageT = scene.add.text(contentX, curY, `나이  ${char.age}세`, {
      fontSize: fs(9), fill: '#5a4020', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    g.add(ageT);
    curY += parseInt(fs(13));

    // ── 직업 (툴팁 포함) ────────────────────────────────────────
    const JOB_TIPS = {
      fisher: '낚시꾼 — 수면 탐색 특화. 자원 수집 효율 +20%, 어획물 판별 능력 보유.',
      diver:  '잠수부 — 심해 탐색 특화. 수압 저항, 수중 작업 시간 +30%.',
      ai:     'A.I — 기계 지성체. 연산 속도 탁월, 감정 연산 미탑재.',
    };
    const jobHit = scene.add.rectangle(contentX, curY, contentW/2, parseInt(fs(14)), 0, 0)
      .setInteractive({ useHandCursor: false }).setOrigin(0,0);
    const jobLbl = scene.add.text(contentX, curY,
      `직업  :  ${char.jobLabel}`, {
      fontSize: fs(10), fill: '#c8802a', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    jobHit.setSize(jobLbl.width, parseInt(fs(14)));
    jobHit.on('pointerover', (ptr) => this._showTooltip(ptr.x, ptr.y, JOB_TIPS[char.job]||char.jobLabel));
    jobHit.on('pointermove', (ptr) => this._moveTooltip(ptr.x, ptr.y));
    jobHit.on('pointerout',  () => this._hideTooltip());
    g.add([jobLbl, jobHit]);
    curY += parseInt(fs(16));

    // ── Cog 등급 (크게 강조) ────────────────────────────────────
    const cogBg = scene.add.graphics();
    cogBg.fillStyle(0x0e0b07, 1);
    cogBg.lineStyle(1, 0x4a2a10, 0.8);
    cogBg.strokeRect(contentX, curY, contentW, parseInt(fs(28)));
    cogBg.fillRect(contentX, curY, contentW, parseInt(fs(28)));
    const cogT = scene.add.text(contentX + contentW/2, curY + parseInt(fs(14)),
      `◈  Cog  ${char.cog}  ◈`, {
      fontSize: fs(14), fill: '#e8c040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    g.add([cogBg, cogT]);
    curY += parseInt(fs(34));

    // ── 구분선 ──────────────────────────────────────────────────
    const sep1 = scene.add.graphics();
    sep1.lineStyle(1, 0x2a1a08, 0.9);
    sep1.lineBetween(px + pad/2, curY, px + pw - pad/2, curY);
    g.add(sep1);
    curY += parseInt(fs(6));

    // ── 스탯 블록 ───────────────────────────────────────────────
    const statHdr = scene.add.text(contentX, curY, '[ 스  탯 ]', {
      fontSize: fs(10), fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    g.add(statHdr);
    curY += parseInt(fs(14));

    const STAT_DEFS = [
      { key:'체력',   val: char.stats.hp,      tip: '체력 — 최대 HP에 직접 영향. 높을수록 오래 버팁니다.' },
      { key:'건강',   val: char.stats.health,  tip: '건강 — 상태이상 저항 및 자연 회복 속도에 영향.' },
      { key:'공격',   val: char.stats.attack,  tip: '공격 — 기본 전투 피해량 계수. 무기 보정과 곱연산.' },
      { key:'민첩',   val: char.stats.agility, tip: '민첩 — 행동 순서와 회피율에 영향. 높을수록 선공 확률 증가.' },
      { key:'행운',   val: char.stats.luck,    tip: '행운 — 아이템 드롭, 크리티컬 확률, 이벤트 결과에 영향.' },
    ];
    const rowH     = parseInt(fs(17));
    const statBH   = STAT_DEFS.length * rowH + parseInt(fs(6));
    const statBg   = scene.add.graphics();
    statBg.fillStyle(0x0e0b07, 1);
    statBg.lineStyle(1, 0x2a1a08, 0.7);
    statBg.strokeRect(contentX, curY, contentW, statBH);
    statBg.fillRect(contentX, curY, contentW, statBH);
    g.add(statBg);
    curY += parseInt(fs(3));

    STAT_DEFS.forEach(({ key, val, tip }) => {
      const rowY = curY;
      const statT = scene.add.text(contentX + 8, rowY,
        `${key.padEnd(2, '　')}   ${val}`, {
        fontSize: fs(12), fill: '#c8a060', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0);
      const statHit = scene.add.rectangle(contentX + 4, rowY + rowH/2, contentW - 8, rowH, 0, 0)
        .setInteractive({ useHandCursor: false }).setOrigin(0, 0.5);
      statHit.on('pointerover', (ptr) => this._showTooltip(ptr.x, ptr.y, tip));
      statHit.on('pointermove', (ptr) => this._moveTooltip(ptr.x, ptr.y));
      statHit.on('pointerout',  () => this._hideTooltip());
      g.add([statT, statHit]);
      curY += rowH;
    });
    curY += parseInt(fs(8));

    // ── 구분선 ──────────────────────────────────────────────────
    const sep2 = scene.add.graphics();
    sep2.lineStyle(1, 0x2a1a08, 0.9);
    sep2.lineBetween(px + pad/2, curY, px + pw - pad/2, curY);
    g.add(sep2);
    curY += parseInt(fs(6));

    // ── 패시브 / 스킬 박스 ──────────────────────────────────────
    const makeBox = (titleStr, bodyStr, yy) => {
      const bh = parseInt(fs(40));
      const boxG = scene.add.graphics();
      boxG.fillStyle(0x0e0b07, 1);
      boxG.lineStyle(1, 0x3a2010, 0.7);
      boxG.strokeRect(contentX, yy, contentW, bh);
      boxG.fillRect(contentX, yy, contentW, bh);
      const titleT = scene.add.text(contentX + 6, yy + 4, titleStr, {
        fontSize: fs(8), fill: '#5a3818', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0);
      const bodyT = scene.add.text(contentX + 6, yy + 4 + parseInt(fs(11)), bodyStr, {
        fontSize: fs(10), fill: '#c8a060', fontFamily: FontManager.TITLE,
        wordWrap: { width: contentW - 12 },
      }).setOrigin(0, 0);
      g.add([boxG, titleT, bodyT]);
      return yy + bh + 6;
    };
    curY = makeBox('PASSIVE', char.passive, curY);
    curY = makeBox('SKILL',   char.skill,   curY);

    // ── 하단 버튼 ────────────────────────────────────────────────
    const missing  = char.maxHp - char.currentHp;
    const healCost = Math.ceil(missing * 0.5);
    const btnH2    = parseInt(fs(26));
    const btnY2    = py + ph - btnH2 - parseInt(fs(10));
    const btnW2    = (contentW - pad) / 2;

    if (missing > 0) {
      const healBg = scene.add.graphics();
      this._drawBtn(healBg, contentX, btnY2, btnW2, btnH2, false);
      const healTxt = scene.add.text(contentX + btnW2/2, btnY2 + btnH2/2,
        `회복  (${healCost} Arc)`, {
        fontSize: fs(9), fill: '#6a9060', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      const healHit = scene.add.rectangle(contentX + btnW2/2, btnY2 + btnH2/2, btnW2, btnH2, 0, 0)
        .setInteractive({ useHandCursor: true });
      healHit.on('pointerover', () => this._drawBtn(healBg, contentX, btnY2, btnW2, btnH2, false, true));
      healHit.on('pointerout',  () => this._drawBtn(healBg, contentX, btnY2, btnW2, btnH2, false, false));
      healHit.on('pointerup',   () => this._doHeal(char, healCost));
      g.add([healBg, healTxt, healHit]);
    }

    const closeX = contentX + btnW2 + pad;
    const closeBg = scene.add.graphics();
    this._drawBtn(closeBg, closeX, btnY2, btnW2, btnH2, true);
    const closeTxt = scene.add.text(closeX + btnW2/2, btnY2 + btnH2/2, '닫  기', {
      fontSize: fs(9), fill: '#8a3820', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    const closeHit = scene.add.rectangle(closeX + btnW2/2, btnY2 + btnH2/2, btnW2, btnH2, 0, 0)
      .setInteractive({ useHandCursor: true });
    closeHit.on('pointerover', () => this._drawBtn(closeBg, closeX, btnY2, btnW2, btnH2, true, true));
    closeHit.on('pointerout',  () => this._drawBtn(closeBg, closeX, btnY2, btnW2, btnH2, true, false));
    closeHit.on('pointerup',   () => this._closePopup());
    g.add([closeBg, closeTxt, closeHit]);
  }

  // ── 툴팁 ─────────────────────────────────────────────────────
  _showTooltip(x, y, text) {
    this._hideTooltip();
    const { scene } = this;
    const fs = n => scaledFontSize(n, scene.scale);
    const offX = 14, offY = -8;
    const txtObj = scene.add.text(x + offX, y + offY, text, {
      fontSize: fs(8), fill: '#e8d8a0', fontFamily: FontManager.MONO,
      wordWrap: { width: parseInt(scaledFontSize(180, scene.scale)) },
    }).setOrigin(0, 1).setDepth(300);
    const bw = txtObj.width  + 12;
    const bh = txtObj.height + 8;
    // 화면 밖으로 나가지 않게 조정
    let tx = x + offX - 6;
    let ty = y + offY - bh - 2;
    if (tx + bw > this.W * 0.86) tx = this.W * 0.86 - bw;
    const bgObj = scene.add.graphics().setDepth(299);
    bgObj.fillStyle(0x080604, 0.95);
    bgObj.lineStyle(1, 0x6a4010, 0.9);
    bgObj.strokeRect(tx, ty, bw, bh);
    bgObj.fillRect(tx, ty, bw, bh);
    txtObj.setPosition(tx + 6, ty + bh - 4);
    this._tooltip = { bg: bgObj, txt: txtObj };
    this._container.add([bgObj, txtObj]);
  }

  _moveTooltip(x, y) {
    if (!this._tooltip) return;
    const offX = 14, offY = -8;
    const { txt, bg } = this._tooltip;
    let tx = x + offX - 6;
    let ty = y + offY - txt.height - 8 - 2;
    if (tx + txt.width + 12 > this.W * 0.86) tx = this.W * 0.86 - txt.width - 12;
    bg.clear();
    bg.fillStyle(0x080604, 0.95);
    bg.lineStyle(1, 0x6a4010, 0.9);
    bg.strokeRect(tx, ty, txt.width + 12, txt.height + 8);
    bg.fillRect(tx, ty, txt.width + 12, txt.height + 8);
    txt.setPosition(tx + 6, ty + 4);
  }

  _hideTooltip() {
    if (this._tooltip) {
      this._tooltip.bg.destroy();
      this._tooltip.txt.destroy();
      this._tooltip = null;
    }
  }

  _drawBtn(gfx, x, y, w, h, danger, hover=false) {
    gfx.clear();
    if (danger) {
      gfx.fillStyle(hover?0x241010:0x180a08,1);
      gfx.lineStyle(1, hover?0x8a3020:0x4a2010, 0.9);
    } else {
      gfx.fillStyle(hover?0x102010:0x0a1208,1);
      gfx.lineStyle(1, hover?0x4a8030:0x2a4018, 0.9);
    }
    gfx.strokeRect(x,y,w,h); gfx.fillRect(x,y,w,h);
  }

  _doHeal(char, cost) {
    const save = SaveManager.load();
    const arc  = save?.arc ?? 0;
    if (arc < cost) { this._showToast('Arc가 부족합니다'); return; }
    if (save) { save.arc = arc - cost; SaveManager.save(save); }
    const chars = CharacterManager.loadAll();
    const target = chars.find(c => c.id === char.id);
    if (target) { target.currentHp = target.maxHp; CharacterManager.saveAll(chars); }
    this._closePopup();
    this._refreshCards();
  }

  _refreshCards() {
    this._cardObjs = [];
    this._cardRow.destroy();
    this._cardRow = this.scene.add.container(this._cardAreaX, this._cardAreaY + this._scrollX);
    this._cardRow.setMask(this._maskGfx.createGeometryMask());
    this._container.add(this._cardRow);
    this._buildCards();
  }

  _showToast(msg) {
    const { scene, W, H } = this;
    const t = scene.add.text(W/2, H*0.5, msg, {
      fontSize: scaledFontSize(16, scene.scale), fill: '#cc5533', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    scene.tweens.add({ targets:t, alpha:1, duration:200, onComplete:()=>{
      scene.time.delayedCall(1200, ()=>{
        scene.tweens.add({ targets:t, alpha:0, duration:300, onComplete:()=>t.destroy() });
      });
    }});
  }

  _closePopup() {
    this._hideTooltip();
    if (this._popupGroup) { this._popupGroup.destroy(); this._popupGroup = null; }
    this._openCharId = null;
  }

  show()    { this._container.setVisible(true);  }
  hide()    { this._container.setVisible(false); this._hideTooltip(); }
  destroy() {
    this._closePopup();
    this._hideTooltip();
    if (this._maskGfx) { this._maskGfx.destroy(); this._maskGfx = null; }
    const si = this.scene.input;
    if (this._dragOnDown)  si.off('pointerdown', this._dragOnDown);
    if (this._dragOnMove)  si.off('pointermove', this._dragOnMove);
    if (this._dragOnUp)    si.off('pointerup',   this._dragOnUp);
    if (this._dragOnWheel) si.off('wheel',        this._dragOnWheel);
    this._container.destroy();
  }
}
