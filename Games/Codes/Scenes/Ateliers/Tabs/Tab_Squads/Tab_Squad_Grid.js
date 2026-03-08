// ================================================================
//  Tab_Squad_Grid.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Squads/Tab_Squad_Grid.js
//
//  역할: 탐사대 탭 — 3×3 배치 격자 + 잠수정 칸
//        셀 클릭 시 마지막 캐릭터 회수
//
//  ✏️ 수정:
//    - 배치된 캐릭터 스프라이트를 셀 위로 올려 "서 있는" 느낌
//      (던전메이커 스타일 — 발은 셀 하단, 몸은 셀 밖으로 돌출)
//    - 이름은 셀 하단 반투명 오버레이 위에 표시
//    - HP 미니바는 셀 하단에 유지
//    - 중복 배치 방지: _isCharDeployed() 헬퍼 추가
//
//  의존: Tab_Squad.js (prototype 확장)
// ================================================================

Object.assign(Tab_Squad.prototype, {

  _buildGrid(gx, gy, cs) {
    const { scene } = this;
    const chars = CharacterManager.loadAll() || [];

    // 격자 셀 전용 독립 컨테이너 — _container 자식 인덱스와 무관하게 재빌드 가능
    // _container와 같은 depth로 씬에 직접 추가, show/hide/destroy 시 함께 제어
    this._gridSubContainer = scene.add.container(0, 0);
    this._gridSubContainer.setDepth(this._container.depth ?? 0);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        this._gridCells.push(
          this._makeGridCell(idx, gx + col * cs + cs / 2, gy + row * cs + cs / 2, cs * 0.90, chars)
        );
      }
    }

    // 격자 외곽선
    const outline = scene.add.graphics();
    outline.lineStyle(1, 0x6a3a18, 0.8);
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

    // 잠수정 연결선
    const subLine = scene.add.graphics();
    subLine.lineStyle(1, 0x5a9aaa, 0.7);
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

  _makeGridCell(idx, cx, cy, size, chars, isSub = false) {
    const { scene } = this;

    const slotChars = (this._squad[idx] || [])
      .map(id => chars.find(c => c.id === id))
      .filter(Boolean);
    const count = slotChars.length;
    const MAX   = 3;

    const JOB_COLOR  = { fisher: 0x1e3a5c, diver: 0x1e3d28, ai: 0x2e2248 };

    const HEADER_R = isSub ? 0.28 : 0.0;
    const headerH  = size * HEADER_R;
    const bodyH    = size - headerH;

    const L = cx - size / 2;
    const T = cy - size / 2;
    const B = cy + size / 2;   // 셀 하단 Y

    // ── 셀 배경 ─────────────────────────────────────────────────
    const cellBg   = scene.add.graphics();
    const drawCell = (hover = false, glowing = false) => {
      cellBg.clear();
      const fillC = isSub ? 0x0e1f38 : 0x1a1410;
      const lineC = glowing ? 0xffd060
                  : hover   ? 0xc8a050
                  : isSub   ? 0x5a9aaa
                  :            0x4a3018;
      const lineW = glowing ? 2 : 1;
      cellBg.fillStyle(fillC, 1);
      cellBg.lineStyle(lineW, lineC, glowing ? 1 : 0.9);
      cellBg.strokeRect(L, T, size, size);
      cellBg.fillRect(L, T, size, size);
    };
    drawCell();
    this._gridSubContainer.add(cellBg);

    // ── 잠수정 헤더 ─────────────────────────────────────────
    if (isSub) {
      const hdrBg = scene.add.graphics();
      hdrBg.fillStyle(0x152d4a, 1);
      hdrBg.fillRect(L + 1, T + 1, size - 2, headerH - 1);
      hdrBg.lineStyle(1, 0x3a6888, 0.9);
      hdrBg.lineBetween(L, T + headerH, L + size, T + headerH);
      this._gridSubContainer.add(hdrBg);

      const fs7 = scaledFontSize(7, scene.scale);
      this._gridSubContainer.add(
        scene.add.text(cx, T + headerH * 0.32, '잠  수  정', {
          fontSize: fs7, fill: '#7abccc', fontFamily: FontManager.MONO,
        }).setOrigin(0.5, 0.5)
      );
      this._gridSubContainer.add(
        scene.add.text(cx, T + headerH * 0.72, 'SUB', {
          fontSize: fs7, fill: '#4a7a8a', fontFamily: FontManager.MONO,
        }).setOrigin(0.5, 0.5)
      );
    }

    // ── 셀 히트 영역 — 캐릭터보다 먼저 추가해야 img가 위에 그려짐
    // (컨테이너 내부는 depth 무시, 추가 순서 = 렌더 순서)
    const hit = scene.add.rectangle(cx, cy, size, size, 0, 0)
      .setInteractive({ useHandCursor: false });
    hit.on('pointerover', () => {
      if (!this._dragGhost) drawCell(true, false);
    });
    hit.on('pointerout',  () => drawCell(false, false));
    this._gridSubContainer.add(hit);

    // ── 캐릭터 배치 — 좌측 세로, 인원수별 위치, 고정 크기, 클릭 제거 ──
    if (count > 0) {
      // 고정 크기 (10% 증가)
      const spriteFixH = size * 0.836;   // 0.76 * 1.10
      const spriteFixW = size * 0.484;   // 0.44 * 1.10

      // 인원수별 Y 위치 (발 기준, T+size*비율)
      // 3명: 45%, 70%, 95%
      // 2명: 두 값의 중간 → 57.5%, 82.5%
      // 1명: 중단 70%
      const yByCount = {
        1: [0.70],
        2: [0.50, 0.88],
        3: [0.45,  0.70,  0.95],
      };
      const yRatios = yByCount[count] || yByCount[3];

      // 좌측 X — 더 왼쪽으로 이동 (L 기준 spriteFixW * 0.42)
      const charCx = L + spriteFixW * 0.42;

      slotChars.forEach((char, i) => {
        const footY = T + size * yRatios[i];

        if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
          const img = scene.add.image(charCx, footY, char.spriteKey)
            .setOrigin(0.5, 1)
            .setInteractive({ useHandCursor: true });

          const sc = Math.min(spriteFixW / img.width, spriteFixH / img.height);
          img.setScale(sc);

          // 호버 시 붉은 틴트 — "클릭하면 제거" 시각 피드백
          img.on('pointerover', () => {
            if (!this._dragGhost) img.setTint(0xff8888);
          });
          img.on('pointerout', () => img.clearTint());

          // 클릭 시 해당 캐릭터만 슬롯에서 제거
          img.on('pointerup', () => {
            if (this._dragGhost) return;
            this._removeCharFromSlot(idx, char.id);
          });

          // hit보다 나중에 추가 → 컨테이너 렌더 순서상 위에 그려져 이벤트 우선
          this._gridSubContainer.add(img);

        } else {
          const JOB_SHORT = { fisher: 'FISH', diver: 'DIVE', ai: 'A·I' };
          const fallback = scene.add.text(charCx, footY - spriteFixH * 0.5,
            JOB_SHORT[char.job] || '???', {
            fontSize: scaledFontSize(7, scene.scale),
            fill: '#5a7888', fontFamily: FontManager.MONO,
          }).setOrigin(0.5, 0.5)
            .setInteractive({ useHandCursor: true });
          fallback.on('pointerup', () => {
            if (this._dragGhost) return;
            this._removeCharFromSlot(idx, char.id);
          });
          this._gridSubContainer.add(fallback);
        }
      });

    } else if (!isSub) {
      // 빈 일반 셀: 슬롯 번호 + 안내
      this._gridSubContainer.add(
        scene.add.text(cx, cy - parseInt(scaledFontSize(4, scene.scale)), `${idx + 1}`, {
          fontSize: scaledFontSize(12, scene.scale),
          fill: '#3a2a14', fontFamily: FontManager.MONO,
        }).setOrigin(0.5, 0.5)
      );
      this._gridSubContainer.add(
        scene.add.text(cx, cy + parseInt(scaledFontSize(8, scene.scale)), '드롭', {
          fontSize: scaledFontSize(6, scene.scale),
          fill: '#2e2010', fontFamily: FontManager.MONO,
        }).setOrigin(0.5, 0.5)
      );
    }

    // 인원 배지 — 가장 마지막에 추가해 항상 최상단 렌더
    this._gridSubContainer.add(
      scene.add.text(L + size - 3, T + 3, `${count}/${MAX}`, {
        fontSize: scaledFontSize(6, scene.scale),
        fill: count >= MAX ? '#e8c040' : '#4a6878',
        fontFamily: FontManager.MONO,
      }).setOrigin(1, 0)
    );

    return { idx, drawCell, cellBg, hit };
  },

  // ── 캐릭터가 이미 어딘가에 배치되어 있는지 확인 ──────────────
  _isCharDeployed(charId) {
    return this._squad.some(slot => Array.isArray(slot) && slot.includes(charId));
  },

  // ── 특정 캐릭터 id를 슬롯에서 제거 (클릭 제거용) ─────────────
  _removeCharFromSlot(idx, charId) {
    const slot = this._squad[idx] || [];
    const pos  = slot.indexOf(charId);
    if (pos === -1) return;
    slot.splice(pos, 1);
    this._squad[idx] = slot;
    CharacterManager.saveSquad(this._squad);
    this._updateHint();
    this._rebuildGridFull();
    this._populateSlider();
  },

  // ── 마지막 캐릭터 회수 ──────────────────────────────────────
  _removeLastFromSlot(idx) {
    const slot = this._squad[idx] || [];
    if (!slot.length) return;
    slot.pop();
    this._squad[idx] = slot;
    CharacterManager.saveSquad(this._squad);
    this._updateHint();
    this._rebuildGridFull();
    this._populateSlider();
  },

  _updateHint() {
    if (!this._hintText) return;
    this._hintText.setText('카드를 칸에 드래그하여 배치  ·  배치된 칸 클릭으로 회수');
  },

  // ── 격자 전체 재빌드 ─────────────────────────────────────────
  // _gridSubContainer(독립 씬 컨테이너)만 교체 → _container 인덱스 무관
  _rebuildGridFull() {
    if (this._gridSubContainer) {
      this._gridSubContainer.destroy(true);
      this._gridSubContainer = null;
    }
    this._gridCells = [];

    this._gridSubContainer = this.scene.add.container(0, 0);
    this._gridSubContainer.setDepth(this._container.depth ?? 0);
    this._gridSubContainer.setVisible(this._container.visible);

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
