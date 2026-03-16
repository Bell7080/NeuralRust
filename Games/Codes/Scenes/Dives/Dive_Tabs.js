// ================================================================
//  Dive_Tabs.js
//  경로: Games/Codes/Scenes/Dives/Dive_Tabs.js
//
//  역할: DiveScene 좌측 탭 버튼 + 하단 콘텐츠 패널 틀 + 탭 전환
//  호출:
//    DiveBuildTabs(scene, W, H)    → create() 에서 호출
//    DiveSwitchTab(scene, tabId)   → 탭 클릭 시
//
//  탭 목록:
//    'inventory' — 인벤토리 (소모품 칸 그리드)
//    'stowage'   — 적재 (심해 별빛 + 테트리스 그리드)
//    'shop'      — 심해 상점
//    'party'     — 파티 관리
//    'journal'   — 탐사 일지
// ================================================================

const DIVE_TABS = [
  { id: 'inventory',  label: '인벤토리' },
  { id: 'submarine',  label: '잠수정'   },
  { id: 'shop',       label: '심해 상점' },
  { id: 'party',      label: '파티 관리' },
  { id: 'journal',    label: '탐사 일지' },
];

function DiveBuildTabs(scene, W, H) {
  const fs   = n => FontManager.adjustedSize(n, scene.scale);
  const tabW = W * 0.10;
  const tabH = H * 0.09;
  const gapY = 3;

  const totalH = DIVE_TABS.length * tabH + (DIVE_TABS.length - 1) * gapY;
  const startY = H / 2 - totalH / 2;

  // 탭 열 배경
  const colBg = scene.add.graphics();
  colBg.fillStyle(0x080607, 0.9);
  colBg.lineStyle(1, 0x1e1008, 0.6);
  colBg.fillRect(0, 0, tabW, H);
  colBg.strokeRect(0, 0, tabW, H);

  scene._tabBtnObjs = {};

  DIVE_TABS.forEach((tab, i) => {
    const cy = startY + i * (tabH + gapY) + tabH / 2;
    const bg = scene.add.graphics();

    const drawTab = (active, hover) => {
      bg.clear();
      if (active)     { bg.fillStyle(0x2a1a08,1); bg.lineStyle(2,0xa05018,1);   }
      else if (hover) { bg.fillStyle(0x1a1008,1); bg.lineStyle(1,0x6a3010,0.8); }
      else            { bg.fillStyle(0x0c0906,0.85); bg.lineStyle(1,0x1e1008,0.4); }
      bg.fillRect(0, cy - tabH/2, tabW, tabH);
      bg.strokeRect(0, cy - tabH/2, tabW, tabH);
    };
    drawTab(tab.id === scene._activeTab, false);

    const txt = scene.add.text(tabW/2, cy, tab.label, {
      fontSize: fs(10), fill: tab.id === scene._activeTab ? '#c8a070' : '#6b4020',
      fontFamily: FontManager.TITLE, align: 'center', wordWrap: { width: tabW - 8 },
    }).setOrigin(0.5).setDepth(2);

    const hit = scene.add.rectangle(tabW/2, cy, tabW, tabH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);
    scene._sceneHits.push(hit);

    hit.on('pointerover', () => {
      if (scene._activeTab !== tab.id) drawTab(false, true);
      txt.setStyle({ fill: '#c8a070' });
    });
    hit.on('pointerout', () => {
      drawTab(scene._activeTab === tab.id, false);
      txt.setStyle({ fill: scene._activeTab === tab.id ? '#c8a070' : '#6b4020' });
    });
    hit.on('pointerdown', () => DiveSwitchTab(scene, tab.id));

    scene._tabBtnObjs[tab.id] = { bg, drawTab, txt };
  });

  // 탭 열 우측 구분선
  const lg = scene.add.graphics();
  lg.lineStyle(1, 0x2a1a0a, 0.7);
  lg.lineBetween(tabW, 0, tabW, H);

  // ── 하단 콘텐츠 패널 틀 ───────────────────────────────────────
  const tabW2  = W * 0.10;
  const botH   = H * 0.30;
  const panelX = tabW2;
  const panelY = H - botH;
  const panelW = W - tabW2;

  const panelBg = scene.add.graphics();
  panelBg.fillStyle(0x0a0807, 0.88);
  panelBg.lineStyle(1, 0x2a1a0a, 0.7);
  panelBg.fillRect(panelX, panelY, panelW, botH);
  panelBg.strokeRect(panelX, panelY, panelW, botH);

  scene._botPanelX = panelX;
  scene._botPanelY = panelY;
  scene._botPanelW = panelW;
  scene._botPanelH = botH;

  scene._tabContentContainer = scene.add.container(0, 0).setDepth(5);
}

// ── 탭 전환 ──────────────────────────────────────────────────────
function DiveSwitchTab(scene, tabId) {
  scene._activeTab = tabId;

  // 버튼 상태 갱신
  Object.keys(scene._tabBtnObjs).forEach(id => {
    const { drawTab, txt } = scene._tabBtnObjs[id];
    const isActive = id === tabId;
    drawTab(isActive, false);
    txt.setStyle({ fill: isActive ? '#c8a070' : '#6b4020' });
  });

  // 콘텐츠 교체
  scene._tabContentContainer.removeAll(true);

  const fs = n => FontManager.adjustedSize(n, scene.scale);
  const px = scene._botPanelX + 12;
  const py = scene._botPanelY + 10;
  const pw = scene._botPanelW - 24;
  const ph = scene._botPanelH - 20;

  switch (tabId) {
    case 'inventory':  DivePanelInventory(scene, px, py, pw, ph, fs);  break;
    case 'submarine':  DivePanelSubmarine(scene, px, py, pw, ph, fs);  break;
    case 'shop':       DivePanelShop(scene, px, py, pw, ph, fs);       break;
    case 'party':      DivePanelParty(scene, px, py, pw, ph, fs);      break;
    case 'journal':    DivePanelJournal(scene, px, py, pw, ph, fs);    break;
  }
}
