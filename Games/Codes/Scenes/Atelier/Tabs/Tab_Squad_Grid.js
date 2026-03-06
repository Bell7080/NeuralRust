// ================================================================
//  Tab_Squad_Grid.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Squad_Grid.js
//
//  역할: 탐사대 탭 — 3×3 배치판 빌드 + 셀 선택 / 제거 / 재빌드
//  의존: Tab_Squad.js (prototype 확장)
// ================================================================

Object.assign(Tab_Squad.prototype, {

  // ── 3×3 격자 + 잠수정 / 입구 장식 ────────────────────────────
  _buildGrid(gx, gy, cs) {
    const { scene } = this;
    const chars = CharacterManager.loadAll() || [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx  = row * 3 + col;
        const cell = this._makeGridCell(
          idx,
          gx + col * cs + cs / 2,
          gy + row * cs + cs / 2,
          cs * 0.88,
          chars
        );
        this._gridCells.push(cell);
      }
    }

    // 격자 외곽선
    const outline = scene.add.graphics();
    outline.lineStyle(1, 0x4a2a10, 0.6);
    outline.strokeRect(gx, gy, cs * 3, cs * 3);

    // ── 잠수정 (격자 왼쪽) ──────────────────────────────────────
    const subSize = cs * 0.88;
    const subCx   = gx - cs * 0.5;
    const subCy   = gy + cs * 1.5;
    const subBg   = scene.add.graphics();
    subBg.fillStyle(0x0a1828, 1);
    subBg.lineStyle(2, 0x3a6888, 0.85);
    subBg.strokeRect(subCx - subSize / 2, subCy - subSize / 2, subSize, subSize);
    subBg.fillRect(subCx - subSize / 2, subCy - subSize / 2, subSize, subSize);

    const fs7 = scaledFontSize(7, scene.scale);
    const subLbl1 = scene.add.text(subCx, subCy - parseInt(fs7), '잠수정', {
      fontSize: fs7, fill: '#4a8aaa', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    const subLbl2 = scene.add.text(subCx, subCy + parseInt(fs7), 'SUB', {
      fontSize: fs7, fill: '#2a5868', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const subArrow = scene.add.graphics();
    subArrow.lineStyle(1, 0x3a6888, 0.5);
    subArrow.lineBetween(subCx + subSize / 2, subCy, gx, subCy);
    this._container.add([subBg, subLbl1, subLbl2, subArrow]);

    // ── 입구 화살표 (격자 오른쪽) ───────────────────────────────
    const entCx  = gx + cs * 3 + cs * 0.5;
    const entCy  = gy + cs * 1.5;
    const arrW   = cs * 0.52;
    const arrH   = cs * 0.44;
    const shaftH = cs * 0.20;

    const entGfx = scene.add.graphics();
    entGfx.fillStyle(0x4a1010, 0.85);
    entGfx.lineStyle(2, 0xaa3020, 0.9);
    const ax  = entCx + arrW / 2;
    const tip = entCx - arrW / 2;
    entGfx.fillPoints([
      { x: ax,    y: entCy - shaftH / 2 },
      { x: ax,    y: entCy + shaftH / 2 },
      { x: entCx, y: entCy + shaftH / 2 },
      { x: entCx, y: entCy + arrH / 2   },
      { x: tip,   y: entCy              },
      { x: entCx, y: entCy - arrH / 2   },
      { x: entCx, y: entCy - shaftH / 2 },
    ], true);
    entGfx.strokePoints([
      { x: ax,    y: entCy - shaftH / 2 },
      { x: ax,    y: entCy + shaftH / 2 },
      { x: entCx, y: entCy + shaftH / 2 },
      { x: entCx, y: entCy + arrH / 2   },
      { x: tip,   y: entCy              },
      { x: entCx, y: entCy - arrH / 2   },
      { x: entCx, y: entCy - shaftH / 2 },
    ], true);

    const entLbl  = scene.add.text(
      entCx + arrW * 0.05,
      entCy + arrH / 2 + parseInt(scaledFontSize(5, scene.scale)),
      '입  구', {
        fontSize: fs7, fill: '#8a4030', fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0);
    const entLine = scene.add.graphics();
    entLine.lineStyle(1, 0x6a2010, 0.5);
    entLine.lineBetween(gx + cs * 3, entCy, tip, entCy);
    this._container.add([entGfx, entLbl, entLine, outline]);
  },

  // ── 격자 셀 하나 ─────────────────────────────────────────────
  _makeGridCell(idx, cx, cy, size, chars) {
    const { scene } = this;
    const charId = this._squad[idx];
    const char   = charId ? chars.find(c => c.id === charId) : null;

    const JOB_COLOR  = { fisher: 0x1a3050, diver: 0x1a3020, ai: 0x2a1a3a };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };

    const cellBg   = scene.add.graphics();
    const drawCell = (hover = false, selected = false) => {
      cellBg.clear();
      const fillC = char ? (JOB_COLOR[char.job] || 0x181410) : 0x0e0b07;
      const lineC = selected ? 0xffd060
        : hover   ? 0x8a6030
        : char    ? (JOB_BORDER[char.job] || 0x3a2010)
        :           0x2a1a08;
      cellBg.fillStyle(fillC, 1);
      cellBg.lineStyle(selected ? 2 : 1, lineC, 0.9);
      cellBg.strokeRect(cx - size / 2, cy - size / 2, size, size);
      cellBg.fillRect(cx - size / 2, cy - size / 2, size, size);
    };
    drawCell();
    this._container.add(cellBg);

    if (char) {
      const JOB_SHORT = { fisher: 'FISH', diver: 'DIVE', ai: 'A·I' };
      this._container.add([
        scene.add.text(cx, cy - 4, JOB_SHORT[char.job] || '???', {
          fontSize: scaledFontSize(8, scene.scale), fill: '#5a7888', fontFamily: FontManager.MONO,
        }).setOrigin(0.5),
        scene.add.text(cx, cy + size * 0.28, char.name, {
          fontSize: scaledFontSize(7, scene.scale), fill: '#c8a060', fontFamily: FontManager.MONO,
        }).setOrigin(0.5),
      ]);
    } else {
      this._container.add(scene.add.text(cx, cy, `${idx + 1}`, {
        fontSize: scaledFontSize(10, scene.scale), fill: '#2a1a08', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    }

    const hit = scene.add.rectangle(cx, cy, size, size, 0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { if (this._selectedSlot !== idx) drawCell(true, false); });
    hit.on('pointerout',  () => drawCell(false, this._selectedSlot === idx));
    hit.on('pointerup',   () => {
      if (this._selectedSlot === idx) this._removeFromSlot(idx);
      else { this._selectedSlot = idx; this._rebuildGrid(); }
    });
    this._container.add(hit);

    return { idx, drawCell, cellBg, hit };
  },

  // ── 슬롯 제거 ────────────────────────────────────────────────
  _removeFromSlot(idx) {
    this._squad[idx] = null;
    CharacterManager.saveSquad(this._squad);
    this._selectedSlot = null;
    this._rebuildGrid();
  },

  // ── 선택 상태만 갱신 (빠른 리드로우) ─────────────────────────
  _rebuildGrid() {
    this._gridCells.forEach(cell => {
      cell.drawCell(false, this._selectedSlot === cell.idx);
    });
  },

  // ── 배치 변경 후 격자 전체 재빌드 ────────────────────────────
  _rebuildGridFull() {
    this._gridCells.forEach(cell => { cell.cellBg.destroy(); cell.hit.destroy(); });
    this._gridCells = [];
    const chars = CharacterManager.loadAll() || [];
    const { _gridX: gx, _gridY: gy, _cellSize: cs } = this;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx  = row * 3 + col;
        this._gridCells.push(this._makeGridCell(
          idx, gx + col * cs + cs / 2, gy + row * cs + cs / 2, cs * 0.88, chars
        ));
      }
    }
  },

});
