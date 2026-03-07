// ================================================================
//  Tab_Squad_Slider.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Squad_Slider.js
//
//  역할: 탐사대 탭 — 캐릭터 슬라이더, 필터 바, 드래그앤드롭, 프로필팝업, 생명주기
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
      '캐릭터를 격자 칸에 드래그하여 배치  ·  배치된 칸 클릭으로 회수  ·  카드 클릭으로 프로필', {
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
    this._sliderCardH   = parseInt(scaledFontSize(88, scene.scale));
    this._sliderCardGap = parseInt(scaledFontSize(8,  scene.scale));

    // 드래그 고스트 컨테이너 (최상단 depth)
    this._dragGhost = null;
    this._dragCharId = null;
    this._dragTargetIdx = null;

    this._populateSlider();
    this._setupDragListeners();
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

  // ── 슬라이더 카드 1장 ────────────────────────────────────────
  _makeSliderCard(char, x, y, cw, ch) {
    const { scene } = this;

    const deploySlots = this._getDeploySlots(char.id);
    const deployCount = deploySlots.length;
    const inSquad = deployCount > 0;

    const JOB_COLOR  = { fisher: 0x1a3050, diver: 0x1a3020, ai: 0x2a1a3a };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };
    const JOB_SHORT  = { fisher: 'FISH',   diver: 'DIVE',   ai: 'A·I'   };

    const c   = scene.add.container(x, y);
    const cbg = scene.add.graphics();

    const drawCbg = (hover = false) => {
      cbg.clear();
      cbg.fillStyle(inSquad ? 0x1c1808 : (JOB_COLOR[char.job] || 0x181410), inSquad ? 0.85 : 1);
      cbg.lineStyle(inSquad ? 2 : 1,
        inSquad ? 0xffd060 : hover ? 0xc8a060 : (JOB_BORDER[char.job] || 0x3a2010), 0.9);
      cbg.strokeRect(0, 0, cw, ch);
      cbg.fillRect(0, 0, cw, ch);
    };
    drawCbg();

    // ── 초상화 영역 ─────────────────────────────────────────────
    const portH = Math.floor(ch * 0.46);
    const portW = Math.floor(cw * 0.76);
    const portX = Math.floor((cw - portW) / 2);
    const portY = Math.floor(ch * 0.04);

    const portBg = scene.add.graphics();
    portBg.fillStyle(0x080605, 0.85);
    portBg.lineStyle(1, JOB_BORDER[char.job] || 0x3a2010, 0.4);
    portBg.strokeRect(portX, portY, portW, portH);
    portBg.fillRect(portX, portY, portW, portH);

    const iconT = scene.add.text(portX + portW / 2, portY + portH * 0.42,
      JOB_SHORT[char.job] || '???', {
      fontSize: scaledFontSize(9, scene.scale), fill: '#2a3a44', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    let overlayG = null;
    let miniMapObjs = [];
    if (inSquad) {
      overlayG = scene.add.graphics();
      overlayG.fillStyle(0x000000, 0.52);
      overlayG.fillRect(portX, portY, portW, portH);
      miniMapObjs = this._buildMiniMap(scene, portX + portW / 2, portY + portH / 2, deploySlots, portW * 0.72);
    }

    const hpBarY  = portY + portH + 2;
    const hpBarH  = 4;
    const hpPct   = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol   = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;

    const hpBg = scene.add.graphics();
    hpBg.fillStyle(0x050404, 1);
    hpBg.fillRect(portX, hpBarY, portW, hpBarH);
    const hpFg = scene.add.graphics();
    hpFg.fillStyle(hpCol, 1);
    hpFg.fillRect(portX, hpBarY, Math.max(1, Math.round(portW * hpPct)), hpBarH);

    const textStartY = hpBarY + hpBarH + parseInt(scaledFontSize(3, scene.scale));

    const nameT = scene.add.text(cw / 2, textStartY, char.name, {
      fontSize: scaledFontSize(8, scene.scale), fill: '#c8a060', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    const cogY = textStartY + parseInt(scaledFontSize(10, scene.scale));
    const cogT = scene.add.text(cw / 2, cogY, `Cog${char.cog}`,
      { fontSize: scaledFontSize(7, scene.scale), fill: '#7a5030', fontFamily: FontManager.MONO }
    ).setOrigin(0.5, 0);

    let deployLbl = null;
    if (inSquad) {
      const deployY = cogY + parseInt(scaledFontSize(10, scene.scale));
      deployLbl = scene.add.text(cw / 2, deployY, `배치 ${deployCount}`,
        { fontSize: scaledFontSize(6.5, scene.scale), fill: '#c89030', fontFamily: FontManager.MONO }
      ).setOrigin(0.5, 0);
    }

    const items = [cbg, portBg, iconT, hpBg, hpFg, nameT, cogT];
    if (overlayG)   items.push(overlayG);
    if (miniMapObjs.length) items.push(...miniMapObjs);
    if (deployLbl)  items.push(deployLbl);
    c.add(items);

    // ── 히트 영역 ───────────────────────────────────────────────
    const hit = scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0, 0)
      .setInteractive({ useHandCursor: true, draggable: true });

    let _pointerDownX = 0, _pointerDownY = 0;
    let _isDragging = false;

    // _isDraggingAny: 어떤 카드라도 드래그 시작하면 true
    // _dragGhost 보다 먼저 세팅되므로 ghost null 타이밍 문제 해소
    hit.on('pointerover', () => {
      if (this._isDraggingAny) return;
      if (!this._sliderDragged && !_isDragging) drawCbg(true);
    });
    hit.on('pointerout',  () => {
      if (this._isDraggingAny) return;
      if (!_isDragging) drawCbg(false);
    });

    hit.on('pointerdown', (ptr) => {
      _pointerDownX = ptr.x;
      _pointerDownY = ptr.y;
      _isDragging = false;
    });

    hit.on('pointermove', (ptr) => {
      if (!ptr.isDown) return;
      const dx = Math.abs(ptr.x - _pointerDownX);
      const dy = Math.abs(ptr.y - _pointerDownY);
      if (!_isDragging && (dx > 6 || dy > 6)) {
        _isDragging = true;
        this._isDraggingAny = true;   // ← ghost 생성 전에 먼저 플래그
        this._startDrag(char, ptr);
      }
      if (_isDragging) {
        this._moveDrag(ptr);
      }
    });

    hit.on('pointerup', (ptr) => {
      if (_isDragging) {
        _isDragging = false;
      } else {
        if (!this._sliderDragged) {
          this._openSquadPopup(char);
        }
      }
      drawCbg(false);
    });

    c.add(hit);
    return c;
  },

  // ── 배치 슬롯 조회 헬퍼 ──────────────────────────────────────
  _getDeploySlots(charId) {
    const slots = [];
    this._squad.forEach((slot, idx) => {
      if (Array.isArray(slot) && slot.includes(charId)) {
        slots.push(idx);
      }
    });
    return slots;
  },

  // ── 미니맵 빌드 ──────────────────────────────────────────────
  _buildMiniMap(scene, cx, cy, deploySlots, maxW) {
    const objs = [];
    const cellSz = Math.max(5, Math.floor(maxW / 4.2));
    const gap    = 1;
    const gridW  = cellSz * 3 + gap * 2;
    const gridH  = cellSz * 3 + gap * 2;
    const subW   = cellSz;
    const totalW = subW + gap + gridW;
    const startX = cx - totalW / 2;
    const startY = cy - gridH / 2;

    const draw = (lx, ly, filled, isBlue = false) => {
      const g = scene.add.graphics();
      if (filled) {
        g.fillStyle(isBlue ? 0x3a8aaa : 0xffd060, 0.9);
        g.lineStyle(1, isBlue ? 0x2a6a8a : 0xb08840, 1);
      } else {
        g.fillStyle(0x0a0808, 0.7);
        g.lineStyle(1, 0x3a2a10, 0.7);
      }
      g.strokeRect(lx, ly, cellSz, cellSz);
      g.fillRect(lx, ly, cellSz, cellSz);
      objs.push(g);
    };

    const subX = startX;
    const subY = startY + cellSz + gap;
    draw(subX, subY, deploySlots.includes(9), true);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const lx  = startX + subW + gap + col * (cellSz + gap);
        const ly  = startY + row * (cellSz + gap);
        draw(lx, ly, deploySlots.includes(idx));
      }
    }

    return objs;
  },

  // ── 드래그 시작 ──────────────────────────────────────────────
  _startDrag(char, ptr) {
    this._destroyDragGhost();
    const { scene } = this;
    const cw = parseInt(scaledFontSize(64, scene.scale));
    const ch = parseInt(scaledFontSize(68, scene.scale));

    const JOB_COLOR  = { fisher: 0x1a3050, diver: 0x1a3020, ai: 0x2a1a3a };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };
    const JOB_SHORT  = { fisher: 'FISH',   diver: 'DIVE',   ai: 'A·I'   };

    const g = scene.add.container(ptr.x - cw / 2, ptr.y - ch * 0.3).setDepth(600);

    const bg = scene.add.graphics();
    bg.fillStyle(JOB_COLOR[char.job] || 0x1a1810, 0.92);
    bg.lineStyle(2, 0xffd060, 1);
    bg.strokeRect(0, 0, cw, ch);
    bg.fillRect(0, 0, cw, ch);

    const icon = scene.add.text(cw / 2, ch * 0.30, JOB_SHORT[char.job] || '???', {
      fontSize: scaledFontSize(8, scene.scale), fill: '#5a7888', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const nm = scene.add.text(cw / 2, ch * 0.52, char.name, {
      fontSize: scaledFontSize(7, scene.scale), fill: '#e8c060', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    const cog = scene.add.text(cw / 2, ch * 0.72, `Cog${char.cog}`, {
      fontSize: scaledFontSize(6, scene.scale), fill: '#7a5030', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    g.add([bg, icon, nm, cog]);
    scene.tweens.add({ targets: g, alpha: 0.88, duration: 80 });

    this._dragGhost  = g;
    this._dragChar   = char;
    this._dragCharId = char.id;
    this._dragTargetIdx = null;

    this._clearCellGlow();
  },

  _moveDrag(ptr) {
    if (!this._dragGhost) return;
    const cw = this._dragGhost.list[0]?.width || 64;
    const ch = this._dragGhost.list[0]?.height || 68;
    this._dragGhost.setPosition(ptr.x - cw / 2, ptr.y - ch * 0.3);

    const hitIdx = this._hitTestGrid(ptr.x, ptr.y);
    if (hitIdx !== this._dragTargetIdx) {
      this._dragTargetIdx = hitIdx;
      this._updateCellGlow(hitIdx);
    }
  },

  _endDrag(ptr, char) {
    this._clearCellGlow();
    this._destroyDragGhost();

    const hitIdx = this._hitTestGrid(ptr.x, ptr.y);
    if (hitIdx === null) return;

    const slot = this._squad[hitIdx] || [];
    if (slot.length >= 3) {
      this._showToast('해당 칸은 이미 가득 찼습니다 (최대 3명)');
      return;
    }
    if (slot.includes(char.id)) {
      this._showToast('이미 같은 칸에 배치된 캐릭터입니다');
      return;
    }

    slot.push(char.id);
    this._squad[hitIdx] = slot;
    CharacterManager.saveSquad(this._squad);
    this._rebuildGridFull();
    this._populateSlider();
  },

  _destroyDragGhost() {
    if (this._dragGhost) {
      this._dragGhost.destroy();
      this._dragGhost = null;
    }
    this._isDraggingAny = false;
    this._dragChar   = null;
    this._dragCharId = null;
    this._dragTargetIdx = null;
  },

  // ── 격자 히트 테스트 ──────────────────────────────────────────
  _hitTestGrid(px, py) {
    if (!this._gridCells) return null;
    const cs = this._cellSize;
    const subHalf = this._subSize / 2;
    if (Math.abs(px - this._subCx) < subHalf && Math.abs(py - this._subCy) < subHalf) {
      return 9;
    }
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cellCx = this._gridX + col * cs + cs / 2;
        const cellCy = this._gridY + row * cs + cs / 2;
        if (Math.abs(px - cellCx) < cs * 0.50 && Math.abs(py - cellCy) < cs * 0.50) {
          return row * 3 + col;
        }
      }
    }
    return null;
  },

  // ── 셀 발광 효과 ──────────────────────────────────────────────
  _updateCellGlow(idx) {
    this._clearCellGlow();
    if (idx === null) return;
    const { scene } = this;

    const glowG = scene.add.graphics().setDepth(500);
    this._glowGraphics = glowG;

    let cx, cy, sz;
    if (idx === 9) {
      cx = this._subCx; cy = this._subCy; sz = this._subSize;
    } else {
      const cs  = this._cellSize;
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      cx = this._gridX + col * cs + cs / 2;
      cy = this._gridY + row * cs + cs / 2;
      sz = cs * 0.90;
    }

    const layers = [
      { pad: 6, alpha: 0.10, col: 0xffd060 },
      { pad: 3, alpha: 0.22, col: 0xffd060 },
      { pad: 1, alpha: 0.45, col: 0xffe080 },
    ];
    layers.forEach(({ pad, alpha, col }) => {
      glowG.lineStyle(2 + pad, col, alpha);
      glowG.strokeRect(cx - sz / 2 - pad, cy - sz / 2 - pad, sz + pad * 2, sz + pad * 2);
    });
    glowG.lineStyle(2, 0xffd060, 1);
    glowG.strokeRect(cx - sz / 2, cy - sz / 2, sz, sz);
    glowG.fillStyle(0xffd060, 0.08);
    glowG.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);

    scene.tweens.add({
      targets: glowG, alpha: { from: 1, to: 0.55 },
      duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  },

  _clearCellGlow() {
    if (this._glowGraphics) {
      this._glowGraphics.destroy();
      this._glowGraphics = null;
    }
  },

  // ── 드래그 전역 리스너 ────────────────────────────────────────
  _setupDragListeners() {
    const { scene } = this;
    const { _sliderAreaX:aX, _sliderAreaY:aY, _sliderAreaW:aW, _sliderAreaH:aH } = this;
    let startX = 0, startOff = 0;

    const inArea = (ptr) => ptr.x >= aX && ptr.x <= aX + aW && ptr.y >= aY && ptr.y <= aY + aH;

    this._sliderOnDown  = (ptr) => {
      if (this._dragGhost) return;
      if (!inArea(ptr)) return;
      startX = ptr.x; startOff = this._sliderOffset; this._sliderDragged = false;
    };
    this._sliderOnMove  = (ptr) => {
      if (this._dragGhost) {
        this._moveDrag(ptr);
        return;
      }
      if (!ptr.isDown) return;
      if (!inArea({ x: ptr.x, y: ptr.y })) return;
      const dx = ptr.x - startX;
      if (Math.abs(dx) > 5) this._sliderDragged = true;
      if (!this._sliderDragged) return;
      const maxOff = -(Math.max(0, this._sliderTotalW - aW));
      this._sliderOffset = Math.max(maxOff, Math.min(0, startOff + dx));
      this._sliderRow.x  = aX + this._sliderOffset;
    };
    this._sliderOnUp    = (ptr) => {
      if (this._dragGhost) {
        const char = this._dragChar;
        this._clearCellGlow();
        this._destroyDragGhost();
        if (char) {
          const hitIdx = this._hitTestGrid(ptr.x, ptr.y);
          if (hitIdx !== null) {
            const slot = this._squad[hitIdx] || [];
            if (slot.length >= 3) {
              this._showToast('해당 칸은 이미 가득 찼습니다 (최대 3명)');
            } else if (slot.includes(char.id)) {
              this._showToast('이미 같은 칸에 배치된 캐릭터입니다');
            } else {
              slot.push(char.id);
              this._squad[hitIdx] = slot;
              CharacterManager.saveSquad(this._squad);
              this._rebuildGridFull();
              this._populateSlider();
            }
          }
        }
        return;
      }
      scene.time.delayedCall(50, () => { this._sliderDragged = false; });
    };
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

  // ── 프로필 팝업 ───────────────────────────────────────────────
  _openSquadPopup(char) {
    this._closeSquadPopup();
    this._squadOpenCharId = char.id;

    const { scene, W, H } = this;
    const pw = W * 0.34;
    const ph = H * 0.82;
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;

    const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55)
      .setOrigin(0).setDepth(400).setInteractive();
    overlay.on('pointerup', () => this._closeSquadPopup());
    this._squadPopupOverlay = overlay;

    const g = scene.add.container(0, 0).setDepth(401);
    this._squadPopupGroup = g;

    const popBg = scene.add.graphics();
    popBg.fillStyle(0x0a0806, 0.99);
    popBg.lineStyle(1, 0x6a3a10, 0.9);
    popBg.strokeRect(px, py, pw, ph);
    popBg.fillRect(px, py, pw, ph);
    popBg.lineStyle(1, 0x8a5020, 0.7);
    const cs2 = 10;
    [[px+4,py+4,1,1],[px+pw-4,py+4,-1,1],[px+4,py+ph-4,1,-1],[px+pw-4,py+ph-4,-1,-1]]
      .forEach(([ox, oy, sx, sy]) => {
        popBg.lineBetween(ox, oy, ox + cs2 * sx, oy);
        popBg.lineBetween(ox, oy, ox, oy + cs2 * sy);
      });
    g.add(popBg);

    const pad      = pw * 0.06;
    const contentX = px + pad;
    const contentW = pw - pad * 2;
    let   curY     = py + pad;
    const fs       = n => scaledFontSize(n, scene.scale);

    const portW   = contentW;
    const portH   = parseInt(fs(90));
    const portBox = scene.add.graphics();
    portBox.fillStyle(0x0c0a08, 0.95);
    portBox.lineStyle(1, 0x5a3520, 0.8);
    portBox.strokeRect(contentX, curY, portW, portH);
    portBox.fillRect(contentX, curY, portW, portH);

    const JOB_SHORT = { fisher: 'FISH', diver: 'DIVE', ai: 'A·I' };
    const portIcon  = scene.add.text(contentX + portW / 2, curY + portH / 2,
      JOB_SHORT[char.job] || '???', {
      fontSize: fs(14), fill: '#3a4a54', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    g.add([portBox, portIcon]);

    const hpBarH2  = 14;
    const hpBarY2  = curY + portH - hpBarH2;
    const hpPct2   = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol2   = hpPct2 > 0.6 ? 0x306030 : hpPct2 > 0.3 ? 0x806020 : 0x803020;
    const hpBg2    = scene.add.graphics();
    hpBg2.fillStyle(0x050404, 0.9);
    hpBg2.fillRect(contentX, hpBarY2, portW, hpBarH2);
    const hpFg2    = scene.add.graphics();
    hpFg2.fillStyle(hpCol2, 1);
    hpFg2.fillRect(contentX, hpBarY2, Math.round(portW * hpPct2), hpBarH2);
    const hpTxt2   = scene.add.text(contentX + portW / 2, hpBarY2 + hpBarH2 / 2,
      `HP  ${char.currentHp} / ${char.maxHp}`, {
      fontSize: fs(11), fill: '#d0b060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    g.add([hpBg2, hpFg2, hpTxt2]);
    curY += portH + parseInt(fs(8));

    g.add(scene.add.text(contentX, curY, char.name, {
      fontSize: fs(15), fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0));
    curY += parseInt(fs(18));

    g.add(scene.add.text(contentX, curY, `나이  ${char.age}세`, {
      fontSize: fs(9), fill: '#5a4020', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(fs(13));

    g.add(scene.add.text(contentX, curY, `직업  :  ${char.jobLabel}`, {
      fontSize: fs(10), fill: '#c8802a', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(fs(16));

    const cogBg2 = scene.add.graphics();
    cogBg2.fillStyle(0x0e0b07, 1);
    cogBg2.lineStyle(1, 0x4a2a10, 0.8);
    cogBg2.strokeRect(contentX, curY, contentW, parseInt(fs(28)));
    cogBg2.fillRect(contentX, curY, contentW, parseInt(fs(28)));
    g.add([cogBg2, scene.add.text(contentX + contentW / 2, curY + parseInt(fs(14)),
      `◈  Cog  ${char.cog}  ◈`, {
      fontSize: fs(14), fill: '#e8c040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5)]);
    curY += parseInt(fs(34));

    const makeSep2 = (yy) => {
      const s2 = scene.add.graphics();
      s2.lineStyle(1, 0x2a1a08, 0.9);
      s2.lineBetween(px + pad / 2, yy, px + pw - pad / 2, yy);
      g.add(s2);
    };
    makeSep2(curY); curY += parseInt(fs(6));

    g.add(scene.add.text(contentX, curY, '[ 스  탯 ]', {
      fontSize: fs(10), fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(fs(14));

    const STAT_DEFS2 = [
      { key: '체력', val: char.stats.hp },
      { key: '건강', val: char.stats.health },
      { key: '공격', val: char.stats.attack },
      { key: '민첩', val: char.stats.agility },
      { key: '행운', val: char.stats.luck },
    ];
    const rowH2   = parseInt(fs(17));
    const statBH2 = STAT_DEFS2.length * rowH2 + parseInt(fs(6));
    const statBg2 = scene.add.graphics();
    statBg2.fillStyle(0x0e0b07, 1);
    statBg2.lineStyle(1, 0x2a1a08, 0.7);
    statBg2.strokeRect(contentX, curY, contentW, statBH2);
    statBg2.fillRect(contentX, curY, contentW, statBH2);
    g.add(statBg2);
    curY += parseInt(fs(3));

    STAT_DEFS2.forEach(({ key, val }) => {
      g.add(scene.add.text(contentX + 8, curY, `${key.padEnd(2, '　')}   ${val}`, {
        fontSize: fs(12), fill: '#c8a060', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0));
      curY += rowH2;
    });
    curY += parseInt(fs(8));
    makeSep2(curY); curY += parseInt(fs(6));

    const PASSIVE_DESC = {
      '윗칸 타격':'자신의 바로 위 칸에 있는 적을 공격합니다.',
      '앞칸 타격':'자신의 바로 앞 칸에 있는 적을 공격합니다.',
      '현재 칸 타격':'자신이 위치한 칸의 적을 공격합니다.',
      '대각 타격':'대각선 방향의 칸에 있는 적을 공격합니다.',
      '전열 전체 타격':'앞쪽 세 칸 전체의 적을 동시에 공격합니다.',
      '후열 타격':'자신의 뒤쪽 칸에 있는 적을 공격합니다.',
      '전/후열 동시 타격':'앞열과 뒷열 양쪽을 동시에 공격합니다.',
      '전체 칸 타격':'배치판의 모든 칸에 있는 적을 공격합니다.',
    };
    const SKILL_DESC = {
      '기본 일격':'기본 공격력으로 단일 대상을 타격합니다.',
      '빠른 찌르기':'공격 속도가 증가하여 빠르게 단일 대상을 찌릅니다.',
      '연속 타격':'같은 대상을 2회 연속으로 타격합니다.',
      '방어 자세':'일정 시간 동안 받는 피해를 20% 감소시킵니다.',
      '강타':'공격력의 150%로 단일 대상을 강하게 타격합니다.',
      '회피 기동':'다음 공격을 1회 회피할 확률이 크게 증가합니다.',
      '독 도포':'대상에게 독을 부여해 지속 피해를 입힙니다.',
      '광역 타격':'인접한 모든 적에게 피해를 입힙니다.',
      '강화 독':'더욱 강력한 독을 부여해 큰 지속 피해를 입힙니다.',
      '순간 가속':'민첩이 일시적으로 크게 상승합니다.',
      '폭발 타격':'공격력의 200%로 단일 대상을 폭발적으로 타격합니다.',
      '전방 스캔':'앞열 전체의 적 정보를 스캔하고 약점을 파악합니다.',
      '철갑 관통':'방어를 무시하고 순수 공격력으로 타격합니다.',
      '심해 압박':'수압으로 대상의 이동 속도와 공격력을 감소시킵니다.',
      '전기 충격':'전기 충격으로 대상을 잠시 경직시키고 피해를 입힙니다.',
      '철벽 방어':'받는 피해를 50% 감소시키는 강력한 방어 태세를 취합니다.',
      '코어 오버로드':'자신의 코어를 과부하시켜 극대 피해를 입히지만 HP가 감소합니다.',
      '심연의 포효':'주변 모든 적에게 공포를 부여하고 대미지를 입힙니다.',
    };

    const makeBox2 = (titleStr, nameStr, descStr, yy) => {
      const nameH2 = parseInt(fs(18));
      const descH2 = parseInt(fs(13));
      const bh2    = parseInt(fs(10)) + nameH2 + descH2 + parseInt(fs(10));
      const boxG2  = scene.add.graphics();
      boxG2.fillStyle(0x0e0b07, 1);
      boxG2.lineStyle(1, 0x3a2010, 0.7);
      boxG2.strokeRect(contentX, yy, contentW, bh2);
      boxG2.fillRect(contentX, yy, contentW, bh2);
      g.add(boxG2);
      g.add(scene.add.text(contentX + 6, yy + 5, titleStr, {
        fontSize: fs(9), fill: '#5a3818', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0));
      g.add(scene.add.text(contentX + 6, yy + 5 + parseInt(fs(12)), nameStr, {
        fontSize: fs(14), fill: '#e8c060', fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0));
      g.add(scene.add.text(contentX + 6, yy + 5 + parseInt(fs(12)) + nameH2 + 2, descStr || '', {
        fontSize: fs(10), fill: '#7a5830', fontFamily: FontManager.MONO,
        wordWrap: { width: contentW - 12 },
      }).setOrigin(0, 0));
      return yy + bh2 + parseInt(fs(6));
    };

    curY = makeBox2('PASSIVE', char.passive, PASSIVE_DESC[char.passive] || '', curY);
    curY = makeBox2('SKILL',   char.skill,   SKILL_DESC[char.skill]     || '', curY);

    const btnH3    = parseInt(fs(26));
    const btnY3    = py + ph - btnH3 - parseInt(fs(10));
    const closeBg3  = scene.add.graphics();
    const closeTxt3 = scene.add.text(contentX + contentW / 2, btnY3 + btnH3 / 2, '닫  기', {
      fontSize: fs(9), fill: '#8a3820', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    const closeHit3 = scene.add.rectangle(contentX + contentW / 2, btnY3 + btnH3 / 2, contentW, btnH3, 0, 0)
      .setInteractive({ useHandCursor: true });
    this._drawPopupBtn(closeBg3, contentX, btnY3, contentW, btnH3, true);
    closeHit3.on('pointerover', () => this._drawPopupBtn(closeBg3, contentX, btnY3, contentW, btnH3, true, true));
    closeHit3.on('pointerout',  () => this._drawPopupBtn(closeBg3, contentX, btnY3, contentW, btnH3, true, false));
    closeHit3.on('pointerup',   () => this._closeSquadPopup());
    g.add([closeBg3, closeTxt3, closeHit3]);
  },

  _drawPopupBtn(gfx, x, y, w, h, danger, hover = false) {
    gfx.clear();
    if (danger) {
      gfx.fillStyle(hover ? 0x241010 : 0x180a08, 1);
      gfx.lineStyle(1, hover ? 0x8a3020 : 0x4a2010, 0.9);
    } else {
      gfx.fillStyle(hover ? 0x102010 : 0x0a1208, 1);
      gfx.lineStyle(1, hover ? 0x4a8030 : 0x2a4018, 0.9);
    }
    gfx.strokeRect(x, y, w, h);
    gfx.fillRect(x, y, w, h);
  },

  _closeSquadPopup() {
    if (this._squadPopupOverlay) { this._squadPopupOverlay.destroy(); this._squadPopupOverlay = null; }
    if (this._squadPopupGroup)   { this._squadPopupGroup.destroy();   this._squadPopupGroup   = null; }
    this._squadOpenCharId = null;
  },

  // ── 필터 ─────────────────────────────────────────────────────
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
    const fs2  = scaledFontSize(9, scene.scale);
    const tmp  = scene.add.text(0, -9999, label, { fontSize: fs2, fontFamily: FontManager.MONO });
    const bw   = tmp.width + 14; tmp.destroy();
    const bh   = parseInt(scaledFontSize(20, scene.scale));
    const bg2  = scene.add.graphics();
    const draw2 = (h) => {
      bg2.clear();
      bg2.fillStyle(active?(h?0x3a2810:0x2a1c0a):(h?0x1a1208:0x0e0a05),1);
      bg2.lineStyle(1,active?0x8a5820:(h?0x4a2810:0x2a1808),0.9);
      bg2.strokeRect(x,y,bw,bh); bg2.fillRect(x,y,bw,bh);
    };
    draw2(false);
    const txt2 = scene.add.text(x+bw/2,y+bh/2,label,{fontSize:fs2,fill:active?'#e8a040':'#5a3818',fontFamily:FontManager.MONO}).setOrigin(0.5);
    const hit2 = scene.add.rectangle(x+bw/2,y+bh/2,bw,bh,0,0).setInteractive({useHandCursor:true});
    hit2.on('pointerover',()=>draw2(true));
    hit2.on('pointerout', ()=>draw2(false));
    hit2.on('pointerup',  onClick);
    if (tracked) { this._filterBarObjs.push(bg2,txt2,hit2); }
    else { this._container.add([bg2,txt2,hit2]); }
    return x + bw + 4;
  },

  // ── 토스트 ───────────────────────────────────────────────────
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

  // ── 생명주기 ─────────────────────────────────────────────────
  show()    { this._container.setVisible(true); },
  hide()    { this._container.setVisible(false); },
  destroy() {
    this._clearCellGlow();
    this._destroyDragGhost();
    this._closeSquadPopup();
    if (this._sliderMaskGfx) { this._sliderMaskGfx.destroy(); this._sliderMaskGfx = null; }
    const si = this.scene.input;
    if (this._sliderOnDown)  si.off('pointerdown', this._sliderOnDown);
    if (this._sliderOnMove)  si.off('pointermove', this._sliderOnMove);
    if (this._sliderOnUp)    si.off('pointerup',   this._sliderOnUp);
    if (this._sliderOnWheel) si.off('wheel',        this._sliderOnWheel);
    this._container.destroy();
  },

});
