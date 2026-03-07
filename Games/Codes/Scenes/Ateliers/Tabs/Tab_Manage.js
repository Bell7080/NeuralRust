// ================================================================
//  Tab_Manage.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Manage.js
//
//  역할: 관리 탭 — 뼈대, 카드 그리드, 드래그 스크롤
//  분할:
//    Tab_Manage_Popup.js  — 프로필 팝업 UI
//    Tab_Manage_Utils.js  — 툴팁, 버튼, 토스트, 회복, 생명주기
// ================================================================

class Tab_Manage {
  constructor(scene, W, H) {
    this.scene        = scene;
    this.W            = W;
    this.H            = H;
    this._container   = scene.add.container(0, 0);
    this._popupGroup  = null;
    this._popupOverlay = null;
    this._openCharId  = null;
    this._scrollX     = 0;
    this._cardObjs    = [];
    this._tooltip     = null;
    this._build();
  }

  // ── 전체 레이아웃 ─────────────────────────────────────────────
  _build() {
    const { scene, W, H } = this;

    const panelX = W * 0.20;
    const panelY = H * 0.22;
    const panelW = W * 0.60;
    const panelH = H * 0.55;

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

    const cardW   = parseInt(scaledFontSize(88, scene.scale));
    const cardH   = parseInt(scaledFontSize(88, scene.scale));
    const cardGap = parseInt(scaledFontSize(8,  scene.scale));

    this._cardW   = cardW;
    this._cardH   = cardH;
    this._cardGap = cardGap;

    const gridStartX = panelX + 12;
    const gridStartY = panelY + parseInt(scaledFontSize(40, scene.scale));
    const availW     = panelW - 24;
    const cols       = Math.floor((availW + cardGap) / (cardW + cardGap));

    this._gridCols   = cols;
    this._gridStartX = gridStartX;
    this._gridStartY = gridStartY;
    this._cardAreaX  = gridStartX;
    this._cardAreaY  = gridStartY;
    this._cardAreaW  = availW;
    this._cardAreaH  = (cardH + cardGap) * 2 + cardGap;

    const maskGfx = scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(this._cardAreaX, this._cardAreaY, this._cardAreaW, this._cardAreaH);
    maskGfx.setVisible(false);
    this._maskGfx = maskGfx;

    this._cardRow = scene.add.container(this._cardAreaX, this._cardAreaY);
    this._cardRow.setMask(maskGfx.createGeometryMask());
    this._container.add(this._cardRow);

    const sepY = this._cardAreaY + this._cardAreaH + 6;
    const sep  = scene.add.graphics();
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

  // ── 카드 그리드 ───────────────────────────────────────────────
  _buildCards() {
    const { scene }  = this;
    const chars      = CharacterManager.initIfEmpty();
    const { _cardW: cw, _cardH: ch, _cardGap: gap, _gridCols: cols } = this;
    const totalSlots = chars.length;

    for (let i = 0; i < totalSlots; i++) {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const card = this._makeCard(chars[i] || null, col * (cw + gap), row * (ch + gap), cw, ch);
      this._cardRow.add(card);
      if (chars[i]) this._cardObjs.push({ container: card, char: chars[i] });
    }

    this._totalCardH = Math.ceil(totalSlots / cols) * (ch + gap) - gap;
  }

  _makeCard(char, x, y, cw, ch) {
    const { scene } = this;
    const c = scene.add.container(x, y);

    const JOB_COLOR  = { fisher: 0x0e1e32, diver: 0x0e1e14, ai: 0x1a0e2a };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };
    const JOB_BAND   = { fisher: 0x152a48, diver: 0x152a1c, ai: 0x24143a };
    const JOB_SHORT  = { fisher: 'FISH',   diver: 'DIVE',   ai: 'A·I'   };

    if (!char) {
      const emptyBg = scene.add.graphics();
      emptyBg.fillStyle(0x0c0a07, 1);
      emptyBg.lineStyle(1, 0x1a1208, 0.4);
      emptyBg.strokeRect(0, 0, cw, ch);
      emptyBg.fillRect(0, 0, cw, ch);
      c.add(emptyBg);
      return c;
    }

    // ── 높이 구성 (탐사대 슬라이더 카드와 동일한 양식) ──────────
    const pad    = 3;
    const cogH   = parseInt(scaledFontSize(18, scene.scale));  // ① Cog 등급 띠
    const nameH  = parseInt(scaledFontSize(16, scene.scale));  // ② 이름
    const portW  = cw - pad * 2;
    const portH  = ch - cogH - nameH - 4 - pad;               // ③ 초상화 (나머지)
    const hpBarH = 4;                                          // ④ HP 바

    // ── 카드 배경 ─────────────────────────────────────────────
    const cbg = scene.add.graphics();
    const drawCbg = (hover = false) => {
      cbg.clear();
      cbg.fillStyle(JOB_COLOR[char.job] || 0x181410, 1);
      cbg.lineStyle(hover ? 2 : 1,
        hover ? 0xc8a060 : (JOB_BORDER[char.job] || 0x3a2010), 0.95);
      cbg.strokeRect(0, 0, cw, ch);
      cbg.fillRect(0, 0, cw, ch);
    };
    drawCbg();

    // ── ① Cog 등급 띠 ────────────────────────────────────────
    const bandG = scene.add.graphics();
    bandG.fillStyle(JOB_BAND[char.job] || 0x1a1410, 1);
    bandG.fillRect(0, 0, cw, cogH);
    bandG.lineStyle(1, JOB_BORDER[char.job] || 0x3a2010, 0.4);
    bandG.lineBetween(0, cogH, cw, cogH);

    const jobLbl = scene.add.text(pad + 2, cogH / 2,
      JOB_SHORT[char.job] || '???', {
      fontSize: scaledFontSize(6.5, scene.scale),
      fill: `#${(JOB_BORDER[char.job] || 0x3a6888).toString(16).padStart(6, '0')}`,
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const cogBadge = scene.add.text(cw / 2, cogH / 2, `Cog  ${char.cog}`, {
      fontSize: scaledFontSize(11, scene.scale),
      fill: '#c8a040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0.5);

    // ── ② 이름 ───────────────────────────────────────────────
    const nameY = cogH;
    const nameT = scene.add.text(cw / 2, nameY + nameH / 2, char.name, {
      fontSize: scaledFontSize(10, scene.scale),
      fill: '#d8b878', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0.5);

    // ── ③ 초상화 ─────────────────────────────────────────────
    const portY  = cogH + nameH;
    const portBg = scene.add.graphics();
    portBg.fillStyle(0x060504, 1);
    portBg.fillRect(pad, portY, portW, portH);

    // 캐릭터 스프라이트 (없으면 직종 워터마크 폴백)
    let watermark;
    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img = scene.add.image(pad + portW / 2, portY + portH * 0.50, char.spriteKey)
        .setOrigin(0.5);
      // 비율 유지하며 portW x portH 안에 맞추기
      const texW = img.width;
      const texH = img.height;
      const scale = Math.min(portW / texW, portH / texH);
      img.setScale(scale);
      watermark = img;
    } else {
      watermark = scene.add.text(pad + portW / 2, portY + portH * 0.50,
        JOB_SHORT[char.job] || '???', {
        fontSize: scaledFontSize(20, scene.scale),
        fill: `#${(JOB_BAND[char.job] || 0x1a1410).toString(16).padStart(6, '0')}`,
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
    }

    // ── ④ HP 바 ──────────────────────────────────────────────
    const hpY   = portY + portH;
    const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol = hpPct > 0.6 ? 0x2a6030 : hpPct > 0.3 ? 0x705820 : 0x702020;
    const hpBg  = scene.add.graphics();
    hpBg.fillStyle(0x050404, 1);
    hpBg.fillRect(pad, hpY, portW, hpBarH);
    const hpFg  = scene.add.graphics();
    hpFg.fillStyle(hpCol, 1);
    hpFg.fillRect(pad, hpY, Math.max(1, Math.round(portW * hpPct)), hpBarH);

    // ── 히트 영역 ────────────────────────────────────────────
    const hit = scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => drawCbg(true));
    hit.on('pointerout',  () => drawCbg(false));
    hit.on('pointerup',   () => {
      if (this._dragged) return;
      if (this._openCharId === char.id) this._closePopup();
      else this._openPopup(char);
    });

    c.add([cbg, bandG, jobLbl, cogBadge, nameT, portBg, watermark, hpBg, hpFg, hit]);
    return c;
  }

  // ── 드래그 스크롤 ─────────────────────────────────────────────
  _setupDrag() {
    const { scene }   = this;
    const { _cardAreaX: aX, _cardAreaY: aY, _cardAreaW: aW, _cardAreaH: aH } = this;
    let startY = 0, startScroll = 0;
    this._dragged = false;

    const inArea = (ptr) =>
      ptr.x >= aX && ptr.x <= aX + aW && ptr.y >= aY && ptr.y <= aY + aH;

    this._dragOnDown  = (ptr) => { if (!inArea(ptr)) return; startY = ptr.y; startScroll = this._scrollX; this._dragged = false; };
    this._dragOnMove  = (ptr) => { if (!ptr.isDown) return; const dy = ptr.y - startY; if (Math.abs(dy) > 5) this._dragged = true; if (this._dragged) this._scrollTo(startScroll + dy); };
    this._dragOnUp    = ()    => { scene.time.delayedCall(50, () => { this._dragged = false; }); };
    this._dragOnWheel = (ptr, objs, dx, dy) => { if (inArea(ptr)) this._scrollTo(this._scrollX - dy * 0.8); };

    scene.input.on('pointerdown', this._dragOnDown);
    scene.input.on('pointermove', this._dragOnMove);
    scene.input.on('pointerup',   this._dragOnUp);
    scene.input.on('wheel',       this._dragOnWheel);
  }

  _scrollTo(y) {
    const maxScroll  = Math.max(0, this._totalCardH - this._cardAreaH);
    this._scrollX    = Math.max(-maxScroll, Math.min(0, y));
    this._cardRow.y  = this._cardAreaY + this._scrollX;
  }
}
