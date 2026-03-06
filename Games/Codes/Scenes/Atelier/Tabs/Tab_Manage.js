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
    const totalSlots = Math.max(chars.length, cols * 2);

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

    const JOB_COLOR  = { fisher: 0x1a3050, diver: 0x1a3020, ai: 0x2a1a3a };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };
    const JOB_SHORT  = { fisher: 'FISH',   diver: 'DIVE',   ai: 'A·I'   };

    const fill   = char ? (JOB_COLOR[char.job]  || 0x1a1810) : 0x0c0a07;
    const border = char ? (JOB_BORDER[char.job] || 0x4a3010) : 0x1a1208;

    const bg = scene.add.graphics();
    const drawBg = (hover = false) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.lineStyle(hover ? 2 : 1, hover ? 0xc8a060 : border, 0.9);
      bg.strokeRect(0, 0, cw, ch);
      bg.fillRect(0, 0, cw, ch);
    };
    drawBg();

    if (char) {
      const portH = ch * 0.52;
      const portW = cw * 0.72;
      const portX = (cw - portW) / 2;
      const portY = ch * 0.05;

      const port = scene.add.graphics();
      port.fillStyle(0x080605, 0.85);
      port.lineStyle(1, border, 0.5);
      port.strokeRect(portX, portY, portW, portH);
      port.fillRect(portX, portY, portW, portH);

      const iconT = scene.add.text(portX + portW / 2, portY + portH / 2,
        JOB_SHORT[char.job] || '???', {
        fontSize: scaledFontSize(10, scene.scale), fill: '#3a5566', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);

      const nameT = scene.add.text(cw / 2,
        portY + portH + parseInt(scaledFontSize(4, scene.scale)), char.name, {
        fontSize: scaledFontSize(9, scene.scale), fill: '#c8a060', fontFamily: FontManager.TITLE,
      }).setOrigin(0.5, 0);

      const jobT = scene.add.text(cw / 2,
        portY + portH + parseInt(scaledFontSize(14, scene.scale)),
        `${char.jobLabel}  Cog${char.cog}`, {
        fontSize: scaledFontSize(7, scene.scale), fill: '#7a5830', fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0);

      const barY  = portY + portH - 5;
      const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
      const hpCol = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
      const barBg = scene.add.graphics();
      barBg.fillStyle(0x050404, 1);
      barBg.fillRect(portX, barY, portW, 5);
      const barFg = scene.add.graphics();
      barFg.fillStyle(hpCol, 1);
      barFg.fillRect(portX, barY, Math.round(portW * hpPct), 5);

      const hit = scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => drawBg(true));
      hit.on('pointerout',  () => drawBg(false));
      hit.on('pointerup',   () => {
        if (this._dragged) return;
        if (this._openCharId === char.id) this._closePopup();
        else this._openPopup(char);
      });

      c.add([bg, port, iconT, nameT, jobT, barBg, barFg, hit]);
    } else {
      const emptyG = scene.add.graphics();
      emptyG.lineStyle(1, 0x1a1208, 0.4);
      emptyG.strokeRect(0, 0, cw, ch);
      c.add([bg, emptyG]);
    }

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
