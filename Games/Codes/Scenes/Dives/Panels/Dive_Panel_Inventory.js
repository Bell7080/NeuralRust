// ================================================================
//  Dive_Panel_Inventory.js
//  경로: Games/Codes/Scenes/Dives/Panels/Dive_Panel_Inventory.js
//
//  역할: 인벤토리 패널 — 소모품 전용, 제한된 칸 수 (1칸=1아이템)
//
//  데이터 구조 (scene._inventory):
//    Array<{ itemId, name, desc, color } | null>
//    null = 빈 칸
//
//  칸 수: INVENTORY_COLS × INVENTORY_ROWS (기본 5×2 = 10칸)
//  칸 크기: 고정 정사각형, 아이콘 + 이름 툴팁
//
//  외부 호출:
//    DivePanelInventory(scene, px, py, pw, ph, fs)
//    DiveInventoryAddItem(scene, item)  ← 상점에서 구매 시
// ================================================================

const INVENTORY_COLS = 5;
const INVENTORY_ROWS = 2;
const INVENTORY_MAX  = INVENTORY_COLS * INVENTORY_ROWS;  // 10칸

// ── 패널 렌더 ────────────────────────────────────────────────────
function DivePanelInventory(scene, px, py, pw, ph, fs) {
  // 인벤토리 데이터 초기화 (없으면 빈 배열)
  if (!scene._inventory) {
    scene._inventory = new Array(INVENTORY_MAX).fill(null);
  }

  const cellSize = Math.min(
    Math.floor((pw - (INVENTORY_COLS - 1) * 6) / INVENTORY_COLS),
    Math.floor((ph - parseInt(fs(18)) - (INVENTORY_ROWS - 1) * 6) / INVENTORY_ROWS)
  );
  const gridW  = INVENTORY_COLS * cellSize + (INVENTORY_COLS - 1) * 6;
  const startX = px + (pw - gridW) / 2;
  const startY = py + parseInt(fs(18));

  // 섹션 라벨
  const lbl = scene.add.text(px, py, `인벤토리  (${scene._inventory.filter(Boolean).length} / ${INVENTORY_MAX})`, {
    fontSize: fs(11), fill: '#4a2a10', fontFamily: FontManager.TITLE,
  });
  scene._tabContentContainer.add(lbl);

  // 칸 렌더
  for (let row = 0; row < INVENTORY_ROWS; row++) {
    for (let col = 0; col < INVENTORY_COLS; col++) {
      const idx  = row * INVENTORY_COLS + col;
      const cx   = startX + col * (cellSize + 6) + cellSize / 2;
      const cy   = startY + row * (cellSize + 6) + cellSize / 2;
      const item = scene._inventory[idx];

      const cellBg = scene.add.graphics();
      cellBg.fillStyle(item ? 0x1a1408 : 0x0c0906, 1);
      cellBg.lineStyle(1, item ? 0x6a4020 : 0x1e1008, item ? 0.8 : 0.4);
      cellBg.fillRect(cx - cellSize/2, cy - cellSize/2, cellSize, cellSize);
      cellBg.strokeRect(cx - cellSize/2, cy - cellSize/2, cellSize, cellSize);
      scene._tabContentContainer.add(cellBg);

      if (item) {
        // 아이템 아이콘 (색상 원형)
        const icon = scene.add.graphics();
        icon.fillStyle(Phaser.Display.Color.HexStringToColor(item.color || '#a05018').color, 0.8);
        icon.fillCircle(cx, cy - cellSize * 0.1, cellSize * 0.26);
        scene._tabContentContainer.add(icon);

        // 아이템 이름
        const nameTxt = scene.add.text(cx, cy + cellSize * 0.28, item.name, {
          fontSize: fs(7), fill: '#c8bfb0', fontFamily: FontManager.MONO,
          wordWrap: { width: cellSize - 4 }, align: 'center',
        }).setOrigin(0.5);
        scene._tabContentContainer.add(nameTxt);

        // 호버 툴팁 hit
        const hit = scene.add.rectangle(cx, cy, cellSize, cellSize, 0, 0)
          .setInteractive({ useHandCursor: true }).setDepth(6);
        scene._tabContentContainer.add(hit);
        hit.on('pointerover', () => _diveShowItemTooltip(scene, cx, cy, item, cellSize));
        hit.on('pointerout',  () => _diveHideItemTooltip(scene));
      }

      // 인덱스 표시 (빈 칸)
      if (!item) {
        const numTxt = scene.add.text(cx, cy, `${idx + 1}`, {
          fontSize: fs(8), fill: '#1a1008', fontFamily: FontManager.MONO,
        }).setOrigin(0.5);
        scene._tabContentContainer.add(numTxt);
      }
    }
  }
}

// ── 아이템 추가 (상점에서 구매 시 호출) ───────────────────────────
function DiveInventoryAddItem(scene, item) {
  if (!scene._inventory) scene._inventory = new Array(INVENTORY_MAX).fill(null);

  const emptyIdx = scene._inventory.findIndex(slot => slot === null);
  if (emptyIdx === -1) return false;  // 인벤토리 가득 참

  scene._inventory[emptyIdx] = item;

  // 탭이 열려있으면 갱신
  if (scene._activeTab === 'inventory') {
    DiveSwitchTab(scene, 'inventory');
  }
  return true;
}

// ── 툴팁 ─────────────────────────────────────────────────────────
function _diveShowItemTooltip(scene, cx, cy, item, cellSize) {
  if (scene._itemTooltip) _diveHideItemTooltip(scene);

  const fs  = n => FontManager.adjustedSize(n, scene.scale);
  const ttW = Math.round(scene.W * 0.16);
  const ttH = Math.round(scene.H * 0.08);
  const ttX = Math.min(cx + cellSize / 2 + 4, scene.W - ttW - 4);
  const ttY = Math.max(cy - ttH / 2, scene._botPanelY + 4);

  const bg = scene.add.graphics().setDepth(20);
  bg.fillStyle(0x1a1008, 1);
  bg.lineStyle(1, 0xa05018, 0.9);
  bg.fillRect(ttX, ttY, ttW, ttH);
  bg.strokeRect(ttX, ttY, ttW, ttH);

  const nameTxt = scene.add.text(ttX + 6, ttY + 5, item.name, {
    fontSize: fs(10), fill: '#c8a070', fontFamily: FontManager.TITLE,
  }).setDepth(21);
  const descTxt = scene.add.text(ttX + 6, ttY + 5 + parseInt(fs(13)), item.desc || '', {
    fontSize: fs(9), fill: '#8a7060', fontFamily: FontManager.MONO,
    wordWrap: { width: ttW - 12 },
  }).setDepth(21);

  scene._itemTooltip = [bg, nameTxt, descTxt];
}

function _diveHideItemTooltip(scene) {
  if (!scene._itemTooltip) return;
  scene._itemTooltip.forEach(o => { try { o.destroy(); } catch(e){} });
  scene._itemTooltip = null;
}
