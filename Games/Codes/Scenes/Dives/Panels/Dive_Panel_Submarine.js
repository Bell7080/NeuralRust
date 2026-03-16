// ================================================================
//  Dive_Panel_Submarine.js
//  경로: Games/Codes/Scenes/Dives/Panels/Dive_Panel_Submarine.js
//
//  역할: 잠수정(潛水艇) 패널
//
//  ── 구조 ────────────────────────────────────────────────────
//  상단: 심해 별빛 대기 영역
//    - 구매한 증강이 랜덤 위치에 발광 별로 등장
//    - 클릭 → 우측상단에 설명창 (테트리스 모양 미리보기 + 능력)
//    - 클릭으로 하단 그리드에 자동 배치 시도
//
//  하단: 스팀펑크 테트리스 그리드
//    - 기계 내부 느낌 — 톱니/파이프 장식 셀
//    - 빛이 기계 사이사이를 채우는 느낌
//    - 증강 배치 시 해당 셀에 블럭 색으로 발광
//    - 배치된 블럭 클릭 → 대기 영역으로 반환
//    - 그리드에 배치해야 효과 발동
//
//  데이터 구조 (scene._submarine):
//    pending: [{ id, name, desc, shape, color, x, y }]  ← 대기 영역
//    grid:    Array(SUB_COLS × SUB_ROWS).fill(null)      ← 배치 그리드
//
//  외부 호출:
//    DivePanelSubmarine(scene, px, py, pw, ph, fs)
//    DiveSubmarineAddAugment(scene, augment)  ← 상점 구매 시
// ================================================================

const SUB_COLS = 8;
const SUB_ROWS = 4;

// ── 패널 렌더 ────────────────────────────────────────────────────
function DivePanelSubmarine(scene, px, py, pw, ph, fs) {
  if (!scene._submarine) {
    scene._submarine = {
      pending: [],
      grid:    new Array(SUB_COLS * SUB_ROWS).fill(null),
    };
  }

  const splitY = py + Math.round(ph * 0.42);
  const topH   = splitY - py;
  const botH   = ph - topH;

  _subBuildAbyssArea(scene, px, py, pw, topH, fs);
  _subBuildSteampunkGrid(scene, px, splitY, pw, botH, fs);
}

// ════════════════════════════════════════════════════════════════
//  상단: 심해 별빛 대기 영역
// ════════════════════════════════════════════════════════════════
function _subBuildAbyssArea(scene, px, py, pw, ph, fs) {
  // 심해 배경
  const bg = scene.add.graphics();
  bg.fillStyle(0x020308, 1);
  bg.lineStyle(1, 0x1a1a2a, 0.5);
  bg.fillRect(px, py, pw, ph);
  bg.strokeRect(px, py, pw, ph);
  scene._panelContent.add(bg);

  // 배경 별 (고정 분위기 파티클)
  const starGfx = scene.add.graphics();
  const rng = new Phaser.Math.RandomDataGenerator([`sub_${scene._round}`]);
  for (let i = 0; i < 55; i++) {
    const sx    = px + rng.realInRange(4, pw - 4);
    const sy    = py + rng.realInRange(4, ph - 4);
    const r     = rng.realInRange(0.4, 1.8);
    const alpha = rng.realInRange(0.10, 0.45);
    const hue   = rng.integerInRange(160, 240);
    const col   = Phaser.Display.Color.HSLToColor(hue / 360, 0.55, 0.65).color;
    starGfx.fillStyle(col, alpha);
    starGfx.fillCircle(sx, sy, r);
  }
  scene._panelContent.add(starGfx);

  // 섹션 라벨
  const lbl = scene.add.text(px + 6, py + 4, '대  기  —  클릭하여 장착', {
    fontSize: fs(8), fill: '#2a2a3a', fontFamily: FontManager.MONO, letterSpacing: 1,
  }).setDepth(6);
  scene._panelContent.add(lbl);

  // 대기 증강 렌더
  scene._submarine.pending.forEach(aug => {
    _subRenderPendingAug(scene, aug, px, py, pw, ph, fs);
  });
}

function _subRenderPendingAug(scene, aug, areaX, areaY, areaW, areaH, fs) {
  // 위치 미확정이면 랜덤 배치
  if (aug.x === undefined) {
    aug.x = areaX + Phaser.Math.Between(24, areaW - 24);
    aug.y = areaY + Phaser.Math.Between(14, areaH - 14);
  }

  const cells = aug.shape ? aug.shape.flat().filter(Boolean).length : 1;
  const size  = 7 + cells * 2.2;
  const col   = Phaser.Display.Color.HexStringToColor(aug.color || '#4080c0').color;

  // 발광 레이어 (겹친 원)
  const glow = scene.add.graphics().setDepth(6);
  const drawGlow = (hover) => {
    glow.clear();
    glow.fillStyle(col, hover ? 0.28 : 0.14); glow.fillCircle(aug.x, aug.y, size * 2.0);
    glow.fillStyle(col, hover ? 0.45 : 0.28); glow.fillCircle(aug.x, aug.y, size * 1.1);
    glow.fillStyle(col, hover ? 1.0  : 0.75); glow.fillCircle(aug.x, aug.y, size * 0.42);
  };
  drawGlow(false);
  scene._panelContent.add(glow);

  // hit
  const hit = scene.add.circle(aug.x, aug.y, size * 2.0, 0, 0)
    .setInteractive({ useHandCursor: true }).setDepth(7);
  scene._panelContent.add(hit);

  hit.on('pointerover', () => {
    drawGlow(true);
    _subShowAugTooltip(scene, aug, aug.x, aug.y, fs);
  });
  hit.on('pointerout', () => {
    drawGlow(false);
    _subHideAugTooltip(scene);
  });
  hit.on('pointerdown', () => {
    _subHideAugTooltip(scene);
    _subPlaceToGrid(scene, aug);
  });
}

// ════════════════════════════════════════════════════════════════
//  하단: 스팀펑크 테트리스 그리드
// ════════════════════════════════════════════════════════════════
function _subBuildSteampunkGrid(scene, px, py, pw, ph, fs) {
  const cellSize = Math.min(
    Math.floor((pw - (SUB_COLS - 1) * 3) / SUB_COLS),
    Math.floor((ph - parseInt(fs(16)) - (SUB_ROWS - 1) * 3) / SUB_ROWS)
  );
  const gridW  = SUB_COLS * cellSize + (SUB_COLS - 1) * 3;
  const gridH  = SUB_ROWS * cellSize + (SUB_ROWS - 1) * 3;
  const startX = px + Math.round((pw - gridW) / 2);
  const startY = py + parseInt(fs(16)) + Math.round((ph - parseInt(fs(16)) - gridH) / 2);

  scene._subCellSize = cellSize;
  scene._subGridX    = startX;
  scene._subGridY    = startY;

  // 섹션 라벨
  const lbl = scene.add.text(px + pw / 2, py + 3,
    '잠  수  정  —  장착 시 효과 발동', {
      fontSize: fs(8), fill: '#3a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0).setDepth(6);
  scene._panelContent.add(lbl);

  // 그리드 외곽 — 스팀펑크 파이프 느낌 테두리
  const outerBg = scene.add.graphics().setDepth(5);
  outerBg.fillStyle(0x0c0a08, 1);
  outerBg.lineStyle(2, 0x3a2a10, 0.8);
  outerBg.fillRect(startX - 6, startY - 6, gridW + 12, gridH + 12);
  outerBg.strokeRect(startX - 6, startY - 6, gridW + 12, gridH + 12);
  // 모서리 볼트 장식
  _subDrawCornerBolts(scene, outerBg, startX - 6, startY - 6, gridW + 12, gridH + 12);
  scene._panelContent.add(outerBg);

  // 셀 렌더
  for (let row = 0; row < SUB_ROWS; row++) {
    for (let col = 0; col < SUB_COLS; col++) {
      const idx  = row * SUB_COLS + col;
      const cx   = startX + col * (cellSize + 3) + cellSize / 2;
      const cy   = startY + row * (cellSize + 3) + cellSize / 2;
      const aug  = scene._submarine.grid[idx];

      const cell = scene.add.graphics().setDepth(6);
      _subDrawCell(cell, cx, cy, cellSize, aug);
      scene._panelContent.add(cell);

      if (aug) {
        // 배치된 증강 첫 칸에 이름
        const prevAug = col > 0 ? scene._submarine.grid[idx - 1] : null;
        if (prevAug !== aug) {
          const t = scene.add.text(cx - cellSize / 2 + 2, cy, aug.name, {
            fontSize: fs(7), fill: aug.color || '#c8a060',
            fontFamily: FontManager.MONO,
          }).setOrigin(0, 0.5).setDepth(8);
          scene._panelContent.add(t);
        }

        // 제거 hit
        const rmHit = scene.add.rectangle(cx, cy, cellSize, cellSize, 0, 0)
          .setInteractive({ useHandCursor: true }).setDepth(9);
        scene._panelContent.add(rmHit);
        rmHit.on('pointerover', () => {
          cell.clear();
          _subDrawCell(cell, cx, cy, cellSize, aug, true);
        });
        rmHit.on('pointerout', () => {
          cell.clear();
          _subDrawCell(cell, cx, cy, cellSize, aug, false);
        });
        rmHit.on('pointerdown', () => _subRemoveFromGrid(scene, aug));
      }
    }
  }
}

// ── 셀 드로우 (스팀펑크 스타일) ──────────────────────────────────
function _subDrawCell(gfx, cx, cy, size, aug, hover) {
  const half = size / 2;

  if (aug) {
    // 배치된 셀 — 블럭 색 발광
    const col = Phaser.Display.Color.HexStringToColor(aug.color || '#4080c0').color;
    gfx.fillStyle(col, hover ? 0.55 : 0.30);
    gfx.lineStyle(1, col, hover ? 1.0 : 0.65);
    gfx.fillRect(cx - half, cy - half, size, size);
    gfx.strokeRect(cx - half, cy - half, size, size);
    // 내부 발광 점
    gfx.fillStyle(col, hover ? 0.9 : 0.6);
    gfx.fillCircle(cx, cy, size * 0.12);
  } else {
    // 빈 셀 — 파이프/기계 내부 느낌
    gfx.fillStyle(0x0a0c0e, 1);
    gfx.lineStyle(1, 0x2a2018, 0.5);
    gfx.fillRect(cx - half, cy - half, size, size);
    gfx.strokeRect(cx - half, cy - half, size, size);

    // 내부 파이프 교차선 (작은 십자)
    gfx.lineStyle(1, 0x1a1810, 0.4);
    gfx.lineBetween(cx - half * 0.3, cy, cx + half * 0.3, cy);
    gfx.lineBetween(cx, cy - half * 0.3, cx, cy + half * 0.3);

    // 모서리 소형 볼트
    const br = size * 0.07;
    gfx.fillStyle(0x2a2010, 0.6);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy]) => {
      gfx.fillCircle(cx + dx * half * 0.75, cy + dy * half * 0.75, br);
    });
  }
}

// ── 그리드 외곽 볼트 장식 ────────────────────────────────────────
function _subDrawCornerBolts(scene, gfx, x, y, w, h) {
  const r = 4;
  gfx.fillStyle(0x4a3820, 1);
  gfx.lineStyle(1, 0x6a5030, 0.8);
  [[x+r, y+r],[x+w-r, y+r],[x+r, y+h-r],[x+w-r, y+h-r]].forEach(([bx,by]) => {
    gfx.fillCircle(bx, by, r);
    gfx.strokeCircle(bx, by, r);
    // 볼트 십자홈
    gfx.lineStyle(1, 0x2a1a08, 0.9);
    gfx.lineBetween(bx - r*0.5, by, bx + r*0.5, by);
    gfx.lineBetween(bx, by - r*0.5, bx, by + r*0.5);
  });
}

// ════════════════════════════════════════════════════════════════
//  배치 / 제거
// ════════════════════════════════════════════════════════════════
function _subPlaceToGrid(scene, aug) {
  const cells = aug.shape
    ? aug.shape.flat().filter(Boolean).length
    : 1;

  let placed = false;
  outer: for (let row = 0; row < SUB_ROWS; row++) {
    for (let col = 0; col <= SUB_COLS - cells; col++) {
      const fits = Array.from({ length: cells }, (_, k) =>
        scene._submarine.grid[row * SUB_COLS + col + k] === null
      ).every(Boolean);
      if (fits) {
        for (let k = 0; k < cells; k++) {
          scene._submarine.grid[row * SUB_COLS + col + k] = aug;
        }
        placed = true;
        break outer;
      }
    }
  }
  if (!placed) return;

  const pendIdx = scene._submarine.pending.indexOf(aug);
  if (pendIdx !== -1) scene._submarine.pending.splice(pendIdx, 1);

  DiveSwitchTab(scene, 'submarine');
}

function _subRemoveFromGrid(scene, aug) {
  for (let i = 0; i < scene._submarine.grid.length; i++) {
    if (scene._submarine.grid[i] === aug) scene._submarine.grid[i] = null;
  }
  aug.x = undefined; aug.y = undefined;
  scene._submarine.pending.push(aug);
  DiveSwitchTab(scene, 'submarine');
}

// ── 외부 호출 — 상점 구매 시 ─────────────────────────────────────
function DiveSubmarineAddAugment(scene, augment) {
  if (!scene._submarine) {
    scene._submarine = { pending: [], grid: new Array(SUB_COLS * SUB_ROWS).fill(null) };
  }
  augment.x = undefined; augment.y = undefined;
  scene._submarine.pending.push(augment);
  if (scene._activeTab === 'submarine') DiveSwitchTab(scene, 'submarine');
}

// ════════════════════════════════════════════════════════════════
//  증강 설명 툴팁 (마우스 우측상단)
// ════════════════════════════════════════════════════════════════
function _subShowAugTooltip(scene, aug, originX, originY, fs) {
  if (scene._augTooltip) _subHideAugTooltip(scene);

  const ttW = Math.round(scene.W * 0.20);
  const ttH = Math.round(scene.H * 0.15);
  const ttX = Math.min(originX + 18, scene.W - ttW - 6);
  const ttY = Math.max(originY - ttH - 6, scene._botPanelY + 4);

  const col = Phaser.Display.Color.HexStringToColor(aug.color || '#4080c0').color;

  const bg = scene.add.graphics().setDepth(25);
  bg.fillStyle(0x08090f, 0.97);
  bg.lineStyle(1, col, 0.75);
  bg.fillRect(ttX, ttY, ttW, ttH);
  bg.strokeRect(ttX, ttY, ttW, ttH);
  // 볼트 장식
  _subDrawCornerBolts(scene, bg, ttX, ttY, ttW, ttH);

  const objs = [bg];

  // 테트리스 모양 미리보기
  if (aug.shape) {
    const cellPx = 9;
    const shape  = aug.shape;
    const shW    = shape[0].length * cellPx;
    const spX    = ttX + ttW / 2 - shW / 2;
    const spY    = ttY + 10;
    shape.forEach((rowArr, r) => {
      rowArr.forEach((filled, c) => {
        if (!filled) return;
        const cg = scene.add.graphics().setDepth(26);
        cg.fillStyle(col, 0.75);
        cg.lineStyle(1, col, 0.9);
        cg.fillRect(spX + c * cellPx, spY + r * cellPx, cellPx - 1, cellPx - 1);
        cg.strokeRect(spX + c * cellPx, spY + r * cellPx, cellPx - 1, cellPx - 1);
        // 내부 빛 점
        cg.fillStyle(col, 1.0);
        cg.fillCircle(spX + c * cellPx + (cellPx-1)/2, spY + r * cellPx + (cellPx-1)/2, 1.5);
        objs.push(cg);
      });
    });
  }

  const nameY = ttY + (aug.shape ? aug.shape.length * 9 + 16 : 10);
  const nameTxt = scene.add.text(ttX + 6, nameY, aug.name, {
    fontSize: fs(11), fill: aug.color || '#4a8ac0', fontFamily: FontManager.TITLE,
  }).setDepth(26);
  const descTxt = scene.add.text(ttX + 6, nameY + parseInt(fs(14)), aug.desc || '', {
    fontSize: fs(9), fill: '#7a8a70', fontFamily: FontManager.MONO,
    wordWrap: { width: ttW - 12 },
  }).setDepth(26);

  objs.push(nameTxt, descTxt);
  scene._augTooltip = objs;
}

function _subHideAugTooltip(scene) {
  if (!scene._augTooltip) return;
  scene._augTooltip.forEach(o => { try { o.destroy(); } catch(e){} });
  scene._augTooltip = null;
}
