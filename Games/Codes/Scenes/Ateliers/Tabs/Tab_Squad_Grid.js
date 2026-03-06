// ================================================================
//  Tab_Squad_Grid.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Squad_Grid.js
// ================================================================

Object.assign(Tab_Squad.prototype, {

  _buildGrid(gx, gy, cs) {
    const { scene } = this;
    const chars = CharacterManager.loadAll() || [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        this._gridCells.push(
          this._makeGridCell(idx, gx + col * cs + cs / 2, gy + row * cs + cs / 2, cs * 0.90, chars)
        );
      }
    }

    // 외곽선
    const outline = scene.add.graphics();
    outline.lineStyle(1, 0x4a2a10, 0.6);
    outline.strokeRect(gx, gy, cs * 3, cs * 3);
    this._container.add(outline);

    // 잠수정 칸 (인덱스 9)
    const subSize = cs * 0.90;
    const subCx   = gx - cs * 0.60;
    const subCy   = gy + cs * 1.5;
    this._subCx   = subCx;
    this._subCy   = subCy;
    this._subSize = subSize;
    this._gridCells.push(this._makeGridCell(9, subCx, subCy, subSize, chars, true));

    const subLine = scene.add.graphics();
    subLine.lineStyle(1, 0x3a6888, 0.5);
    subLine.lineBetween(subCx + subSize / 2, subCy, gx, subCy);
    this._container.add(subLine);

    // 입구 화살표
    const entCx  = gx + cs * 3 + cs * 0.50;
    const entCy  = gy + cs * 1.5;
    const arrW   = cs * 0.52;
    const arrH   = cs * 0.44;
    const shaftH = cs * 0.20;
    const ax     = entCx + arrW / 2;
    const tip    = entCx - arrW / 2;
    const pts    = [
      { x: ax,    y: entCy - shaftH / 2 },
      { x: ax,    y: entCy + shaftH / 2 },
      { x: entCx, y: entCy + shaftH / 2 },
      { x: entCx, y: entCy + arrH  / 2  },
      { x: tip,   y: entCy              },
      { x: entCx, y: entCy - arrH  / 2  },
      { x: entCx, y: entCy - shaftH / 2 },
    ];
    const entGfx = scene.add.graphics();
    entGfx.fillStyle(0x4a1010, 0.85);
    entGfx.lineStyle(2, 0xaa3020, 0.9);
    entGfx.fillPoints(pts, true);
    entGfx.strokePoints(pts, true);

    const entLbl = scene.add.text(
      entCx + arrW * 0.05,
      entCy + arrH / 2 + parseInt(scaledFontSize(5, scene.scale)),
      '입  구', {
        fontSize: scaledFontSize(7, scene.scale),
        fill: '#8a4030', fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0);

    const entLine = scene.add.graphics();
    entLine.lineStyle(1, 0x6a2010, 0.5);
    entLine.lineBetween(gx + cs * 3, entCy, tip, entCy);
    this._container.add([entGfx, entLbl, entLine]);
  },

  // ─────────────────────────────────────────────────────────────
  //  셀 레이아웃
  //
  //  [잠수정]                    [일반]
  //  ┌──────────────┐            ┌──────────────┐
  //  │  잠수정  SUB  │ ← 헤더    │  캐릭터 행 1  │ ← 3등분
  //  ├──────────────┤            │  캐릭터 행 2  │
  //  │  캐릭터 행 1  │ ← 3등분   │  캐릭터 행 3  │
  //  │  캐릭터 행 2  │            └──────────────┘
  //  │  캐릭터 행 3  │
  //  └──────────────┘
  // ─────────────────────────────────────────────────────────────
  _makeGridCell(idx, cx, cy, size, chars, isSub = false) {
    const { scene } = this;

    const slotChars = (this._squad[idx] || [])
      .map(id => chars.find(c => c.id === id))
      .filter(Boolean);
    const count = slotChars.length;
    const MAX   = 3;

    const JOB_COLOR  = { fisher: 0x152540, diver: 0x152a1a, ai: 0x201530 };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };
    const JOB_ABBR   = { fisher: 'F', diver: 'D', ai: 'A' };

    // 잠수정은 상단 30%를 헤더로 예약, 나머지 70%를 3등분
    const HEADER_R = isSub ? 0.28 : 0.0;
    const headerH  = size * HEADER_R;
    const bodyH    = size - headerH;
    const rowH     = bodyH / MAX;

    const L = cx - size / 2;  // cellLeft
    const T = cy - size / 2;  // cellTop

    // ── 셀 배경 (단일 중립색, 직업색 없음) ───────────────────
    const cellBg   = scene.add.graphics();
    const drawCell = (hover = false, selected = false) => {
      cellBg.clear();
      const fillC = isSub ? 0x060d18 : 0x0c0906;
      const lineC = selected ? 0xffd060
                  : hover    ? 0x8a6030
                  : isSub    ? 0x3a6888
                  :            0x2a1a08;
      cellBg.fillStyle(fillC, 1);
      cellBg.lineStyle(selected ? 2 : 1, lineC, 0.9);
      cellBg.strokeRect(L, T, size, size);
      cellBg.fillRect(L, T, size, size);
    };
    drawCell();
    this._container.add(cellBg);

    // ── 잠수정 헤더 (텍스트 + 하단 구분선) ───────────────────
    if (isSub) {
      const hdrBg = scene.add.graphics();
      hdrBg.fillStyle(0x0a1828, 1);
      hdrBg.fillRect(L + 1, T + 1, size - 2, headerH - 1);
      hdrBg.lineStyle(1, 0x1a4060, 0.8);
      hdrBg.lineBetween(L, T + headerH, L + size, T + headerH);
      this._container.add(hdrBg);

      const fs7 = scaledFontSize(7, scene.scale);
      // 잠수정 / SUB 텍스트 — 헤더 안에 고정
      this._container.add(
        scene.add.text(cx, T + headerH * 0.32, '잠  수  정', {
          fontSize: fs7, fill: '#4a8aaa', fontFamily: FontManager.MONO,
        }).setOrigin(0.5, 0.5)
      );
      this._container.add(
        scene.add.text(cx, T + headerH * 0.72, 'SUB', {
          fontSize: fs7, fill: '#1f4a5a', fontFamily: FontManager.MONO,
        }).setOrigin(0.5, 0.5)
      );
    }

    // ── 캐릭터 미니 행 ────────────────────────────────────────
    for (let i = 0; i < MAX; i++) {
      const rowTop = T + headerH + rowH * i;
      const rowMid = rowTop + rowH / 2;

      if (i < count) {
        // ▶ 배치된 캐릭터
        const char = slotChars[i];

        // 행 배경 (직업 색 — 이 행 안에만)
        const rowBg = scene.add.graphics();
        rowBg.fillStyle(JOB_COLOR[char.job] || 0x181410, 0.9);
        rowBg.fillRect(L + 1, rowTop + 1, size - 2, rowH - 2);
        this._container.add(rowBg);

        // 행 구분선 (2번째 행부터)
        if (i > 0) {
          const sep = scene.add.graphics();
          sep.lineStyle(1, 0x050403, 0.9);
          sep.lineBetween(L + 2, rowTop, L + size - 2, rowTop);
          this._container.add(sep);
        }

        // 직업 약자 + 이름
        this._container.add(
          scene.add.text(cx, rowMid, `${JOB_ABBR[char.job] || '?'}  ${char.name}`, {
            fontSize: scaledFontSize(6.5, scene.scale),
            fill: '#c8a060', fontFamily: FontManager.MONO,
          }).setOrigin(0.5, 0.5)
        );

      } else {
        // ▶ 빈 행 — 미세한 구분선만
        if (i > 0 || isSub) {
          const sep = scene.add.graphics();
          sep.lineStyle(1, 0x160e06, 0.5);
          sep.lineBetween(L + 4, rowTop, L + size - 4, rowTop);
          this._container.add(sep);
        }
      }
    }

    // 완전 빈 일반 셀: 중앙에 슬롯 번호
    if (!isSub && count === 0) {
      this._container.add(
        scene.add.text(cx, cy, `${idx + 1}`, {
          fontSize: scaledFontSize(12, scene.scale),
          fill: '#1e1208', fontFamily: FontManager.MONO,
        }).setOrigin(0.5, 0.5)
      );
    }

    // 인원 배지 (우상단)
    this._container.add(
      scene.add.text(L + size - 3, T + 3, `${count}/${MAX}`, {
        fontSize: scaledFontSize(6, scene.scale),
        fill: count >= MAX ? '#e8c040' : '#2a4050',
        fontFamily: FontManager.MONO,
      }).setOrigin(1, 0)
    );

    // 히트 영역
    const hit = scene.add.rectangle(cx, cy, size, size, 0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { if (this._selectedSlot !== idx) drawCell(true, false); });
    hit.on('pointerout',  () => drawCell(false, this._selectedSlot === idx));
    hit.on('pointerup',   () => this._onCellClick(idx, count, MAX));
    this._container.add(hit);

    return { idx, drawCell, cellBg, hit };
  },

  // ── 셀 클릭 ─────────────────────────────────────────────────
  _onCellClick(idx, count, MAX) {
    if (this._selectedSlot === idx) {
      if (count > 0) { this._removeLastFromSlot(idx); }
      else           { this._selectedSlot = null; this._updateHint(); this._rebuildGrid(); }
      return;
    }
    if (count >= MAX) { this._removeLastFromSlot(idx); return; }
    this._selectedSlot = idx;
    this._updateHint();
    this._rebuildGrid();
  },

  _removeLastFromSlot(idx) {
    const slot = this._squad[idx] || [];
    if (!slot.length) return;
    slot.pop();
    this._squad[idx] = slot;
    CharacterManager.saveSquad(this._squad);
    if (!slot.length && this._selectedSlot === idx) this._selectedSlot = null;
    this._updateHint();
    this._rebuildGridFull();
    this._populateSlider();
  },

  _updateHint() {
    if (!this._hintText) return;
    if (this._selectedSlot === null) { this._hintText.setText(''); return; }
    const label = this._selectedSlot === 9 ? '잠수정' : `${this._selectedSlot + 1}번 칸`;
    const cnt   = (this._squad[this._selectedSlot] || []).length;
    this._hintText.setText(`▶ ${label} 선택 중 (${cnt}/3)  —  아래 카드 클릭으로 배치`);
  },

  _rebuildGrid() {
    this._gridCells.forEach(cell =>
      cell.drawCell(false, this._selectedSlot === cell.idx)
    );
  },

  _rebuildGridFull() {
    this._gridCells.forEach(cell => { cell.cellBg.destroy(); cell.hit.destroy(); });
    this._gridCells = [];
    const chars = CharacterManager.loadAll() || [];
    const { _gridX: gx, _gridY: gy, _cellSize: cs } = this;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        this._gridCells.push(this._makeGridCell(
          idx, gx + col * cs + cs / 2, gy + row * cs + cs / 2, cs * 0.90, chars
        ));
      }
    }
    this._gridCells.push(this._makeGridCell(
      9, this._subCx, this._subCy, this._subSize, chars, true
    ));
  },

});
