// ================================================================
//  Dive_Tabs.js
//  경로: Games/Codes/Scenes/Dives/Dive_Tabs.js
//
//  역할: DiveScene 좌측 탭 버튼 + 화면 중앙 오버레이 슬라이드인 패널
//
//  ── 동작 ────────────────────────────────────────────────────
//  탭 클릭          → 패널이 화면 왼쪽 밖에서 슬라이드인 (중앙 오버레이)
//  같은 탭 재클릭   → 슬라이드아웃으로 닫힘
//  다른 탭 클릭     → 콘텐츠만 즉시 교체 (패널 위치 유지)
//  닫기 버튼 클릭   → 슬라이드아웃
//  닫기 버튼        → 패널 열린 동안만 탭 열 하단에 표시
//
//  ── 패널 스펙 ───────────────────────────────────────────────
//  기본 탭: 화면 가로 42%, 세로 72% — 중앙 정렬
//  넓은 탭 (shop, submarine): 화면 가로 65%, 세로 78%
//  배경: 반투명 다크 (슬롯 화면 위에 뜸)
//  딤 오버레이: 패널 뒤쪽 화면 살짝 어둡게
// ================================================================

const DIVE_TABS = [
  { id: 'inventory', label: '인벤토리' },
  { id: 'submarine', label: '잠수정'   },
  { id: 'shop',      label: '심해 상점' },
  { id: 'party',     label: '파티 관리' },
  { id: 'journal',   label: '탐사 일지' },
];

const DIVE_PANEL_SIZE = {
  default:    { wRatio: 0.42, hRatio: 0.72 },
  shop:       { wRatio: 0.65, hRatio: 0.78 },
  submarine:  { wRatio: 0.65, hRatio: 0.78 },
};

// ════════════════════════════════════════════════════════════════
//  탭 버튼 빌드
// ════════════════════════════════════════════════════════════════
function DiveBuildTabs(scene, W, H) {
  const fs   = n => FontManager.adjustedSize(n, scene.scale);
  const tabW = W * 0.10;
  const tabH = H * 0.09;
  const gapY = 3;

  const totalH = DIVE_TABS.length * tabH + (DIVE_TABS.length - 1) * gapY;
  const startY = H / 2 - totalH / 2;

  // 탭 열 배경
  const colBg = scene.add.graphics().setDepth(8);
  colBg.fillStyle(0x080607, 0.92);
  colBg.lineStyle(1, 0x1e1008, 0.6);
  colBg.fillRect(0, 0, tabW, H);
  colBg.strokeRect(0, 0, tabW, H);

  scene._tabBtnObjs = {};
  scene._panelOpen  = false;
  scene._panelTween = null;

  DIVE_TABS.forEach((tab, i) => {
    const cy = startY + i * (tabH + gapY) + tabH / 2;
    const bg = scene.add.graphics().setDepth(9);

    const drawTab = (active, hover) => {
      bg.clear();
      if (active)     { bg.fillStyle(0x2a1a08,1); bg.lineStyle(2,0xa05018,1);      }
      else if (hover) { bg.fillStyle(0x1a1008,1); bg.lineStyle(1,0x6a3010,0.8);    }
      else            { bg.fillStyle(0x0c0906,0.85); bg.lineStyle(1,0x1e1008,0.4); }
      bg.fillRect(0, cy - tabH/2, tabW, tabH);
      bg.strokeRect(0, cy - tabH/2, tabW, tabH);
    };
    drawTab(false, false);

    const txt = scene.add.text(tabW/2, cy, tab.label, {
      fontSize: fs(10), fill: '#6b4020',
      fontFamily: FontManager.TITLE, align: 'center', wordWrap: { width: tabW - 8 },
    }).setOrigin(0.5).setDepth(10);

    const hit = scene.add.rectangle(tabW/2, cy, tabW, tabH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(15);
    scene._sceneHits.push(hit);

    hit.on('pointerover', () => {
      if (scene._activeTab !== tab.id) drawTab(false, true);
      txt.setStyle({ fill: '#c8a070' });
    });
    hit.on('pointerout', () => {
      drawTab(scene._activeTab === tab.id, false);
      txt.setStyle({ fill: scene._activeTab === tab.id ? '#c8a070' : '#6b4020' });
    });
    hit.on('pointerdown', () => _diveToggleTab(scene, tab.id, W, H, fs));

    scene._tabBtnObjs[tab.id] = { bg, drawTab, txt };
  });

  // 탭 열 우측 구분선
  scene.add.graphics().setDepth(8)
    .lineStyle(1, 0x2a1a0a, 0.7)
    .lineBetween(tabW, 0, tabW, H);

  // ── 닫기 버튼 (패널 열린 동안만) ─────────────────────────────
  const closeY = H * 0.90;
  const closeBg = scene.add.graphics().setDepth(9).setAlpha(0);
  closeBg.fillStyle(0x1a0a06, 1);
  closeBg.lineStyle(1, 0x804020, 0.8);
  closeBg.fillRect(2, closeY - tabH/2, tabW - 4, tabH);
  closeBg.strokeRect(2, closeY - tabH/2, tabW - 4, tabH);

  const closeTxt = scene.add.text(tabW/2, closeY, '닫  기', {
    fontSize: fs(10), fill: '#804020', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5).setDepth(10).setAlpha(0);

  const closeHit = scene.add.rectangle(tabW/2, closeY, tabW - 4, tabH, 0, 0)
    .setDepth(15).setAlpha(0);
  scene._sceneHits.push(closeHit);

  closeHit.on('pointerover', () => { closeTxt.setStyle({ fill: '#c8a070' }); });
  closeHit.on('pointerout',  () => { closeTxt.setStyle({ fill: '#804020' }); });
  closeHit.on('pointerdown', () => { if (scene._activeTab) _diveClosePanel(scene); });

  scene._closeBg  = closeBg;
  scene._closeTxt = closeTxt;
  scene._closeHit = closeHit;

  // ── 오버레이 패널 빌드 ────────────────────────────────────────
  _diveBuildOverlayPanel(scene, W, H, fs);
}

// ════════════════════════════════════════════════════════════════
//  오버레이 패널 (화면 중앙, 슬롯 위에 뜨는 반투명 창)
// ════════════════════════════════════════════════════════════════
function _diveBuildOverlayPanel(scene, W, H, fs) {
  // 딤 배경 (패널 뒤 전체화면 어둡게)
  scene._panelDim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55)
    .setOrigin(0).setDepth(28).setAlpha(0);
  // 딤 클릭으로도 닫기
  scene._panelDim.setInteractive();
  scene._panelDim.on('pointerdown', () => {
    if (scene._panelOpen) _diveClosePanel(scene);
  });

  // 컨테이너 — 초기 화면 왼쪽 밖
  scene._panelContainer = scene.add.container(-W, 0).setDepth(30);

  // 패널 배경 (크기는 탭 전환 시 동적 변경)
  scene._panelBg = scene.add.graphics().setDepth(30);
  scene._panelContainer.add(scene._panelBg);

  // 패널 테두리 장식 (볼트 느낌)
  scene._panelDeco = scene.add.graphics().setDepth(30);
  scene._panelContainer.add(scene._panelDeco);

  // 타이틀
  scene._panelTitleTxt = scene.add.text(0, 0, '', {
    fontSize: fs(16), fill: '#c8a070', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5).setDepth(31);
  scene._panelContainer.add(scene._panelTitleTxt);

  // 타이틀 구분선
  scene._panelTitleLine = scene.add.graphics().setDepth(31);
  scene._panelContainer.add(scene._panelTitleLine);

  // 콘텐츠 컨테이너
  scene._panelContent = scene.add.container(0, 0).setDepth(31);
  scene._panelContainer.add(scene._panelContent);
}

function _diveDrawPanelBg(scene, W, H, tabId) {
  const size   = DIVE_PANEL_SIZE[tabId] || DIVE_PANEL_SIZE.default;
  const panelW = Math.round(W * size.wRatio);
  const panelH = Math.round(H * size.hRatio);
  const panelX = Math.round((W - panelW) / 2);   // 화면 가로 중앙
  const panelY = Math.round((H - panelH) / 2);   // 화면 세로 중앙

  scene._currentPanelW = panelW;
  scene._currentPanelH = panelH;
  scene._currentPanelX = panelX;
  scene._currentPanelY = panelY;

  // 패널 배경
  scene._panelBg.clear();
  scene._panelBg.fillStyle(0x080708, 0.94);
  scene._panelBg.lineStyle(2, 0x3a2a10, 0.9);
  scene._panelBg.fillRect(panelX, panelY, panelW, panelH);
  scene._panelBg.strokeRect(panelX, panelY, panelW, panelH);

  // 모서리 볼트 장식
  scene._panelDeco.clear();
  const boltR = 5;
  const boltPositions = [
    [panelX + boltR + 4, panelY + boltR + 4],
    [panelX + panelW - boltR - 4, panelY + boltR + 4],
    [panelX + boltR + 4, panelY + panelH - boltR - 4],
    [panelX + panelW - boltR - 4, panelY + panelH - boltR - 4],
  ];
  boltPositions.forEach(([bx, by]) => {
    scene._panelDeco.fillStyle(0x4a3820, 1);
    scene._panelDeco.lineStyle(1, 0x6a5030, 0.8);
    scene._panelDeco.fillCircle(bx, by, boltR);
    scene._panelDeco.strokeCircle(bx, by, boltR);
    scene._panelDeco.lineStyle(1, 0x2a1a08, 0.9);
    scene._panelDeco.lineBetween(bx - boltR*0.5, by, bx + boltR*0.5, by);
    scene._panelDeco.lineBetween(bx, by - boltR*0.5, bx, by + boltR*0.5);
  });

  // 타이틀 위치
  scene._panelTitleTxt.setPosition(panelX + panelW/2, panelY + panelH * 0.06);

  // 타이틀 구분선
  scene._panelTitleLine.clear();
  scene._panelTitleLine.lineStyle(1, 0x2a1a0a, 0.7);
  scene._panelTitleLine.lineBetween(
    panelX + 12, panelY + panelH * 0.11,
    panelX + panelW - 12, panelY + panelH * 0.11
  );

  return { panelX, panelY, panelW, panelH };
}

// ════════════════════════════════════════════════════════════════
//  탭 토글 / 열기 / 닫기
// ════════════════════════════════════════════════════════════════
function _diveToggleTab(scene, tabId, W, H, fs) {
  if (scene._activeTab === tabId && scene._panelOpen) {
    _diveClosePanel(scene);
  } else if (scene._activeTab !== tabId && scene._panelOpen) {
    // 다른 탭 → 콘텐츠만 교체
    scene._activeTab = tabId;
    _diveRefreshTabButtons(scene);
    const { panelX, panelY, panelW, panelH } = _diveDrawPanelBg(scene, W, H, tabId);
    _diveFillContent(scene, tabId, panelX, panelY, panelW, panelH, fs);
  } else {
    // 닫힌 상태 → 열기
    scene._activeTab = tabId;
    _diveRefreshTabButtons(scene);
    const { panelX, panelY, panelW, panelH } = _diveDrawPanelBg(scene, W, H, tabId);
    _diveFillContent(scene, tabId, panelX, panelY, panelW, panelH, fs);
    _diveOpenPanel(scene, W);
  }
}

function _diveOpenPanel(scene, W) {
  scene._panelOpen = true;
  if (scene._panelTween) scene._panelTween.stop();

  // 딤 페이드인
  scene.tweens.add({ targets: scene._panelDim, alpha: 1, duration: 180 });

  // 패널 슬라이드인 (왼쪽 밖 → 제자리)
  scene._panelContainer.setX(-W);
  scene._panelTween = scene.tweens.add({
    targets:  scene._panelContainer,
    x:        0,
    duration: 280,
    ease:     'Cubic.easeOut',
  });

  // 닫기 버튼 표시
  scene._closeBg.setAlpha(1);
  scene._closeTxt.setAlpha(1);
  scene._closeHit.setAlpha(1).setInteractive({ useHandCursor: true });
}

function _diveClosePanel(scene) {
  scene._panelOpen = false;
  if (scene._panelTween) scene._panelTween.stop();

  // 딤 페이드아웃
  scene.tweens.add({ targets: scene._panelDim, alpha: 0, duration: 180 });

  // 패널 슬라이드아웃 (오른쪽 밖으로)
  scene._panelTween = scene.tweens.add({
    targets:  scene._panelContainer,
    x:        scene.W || 1920,
    duration: 220,
    ease:     'Cubic.easeIn',
    onComplete: () => {
      scene._panelContainer.setX(-(scene.W || 1920));
      scene._activeTab = null;
      _diveRefreshTabButtons(scene);
    },
  });

  // 닫기 버튼 숨김
  scene._closeBg.setAlpha(0);
  scene._closeTxt.setAlpha(0);
  scene._closeHit.disableInteractive().setAlpha(0);
}

function _diveRefreshTabButtons(scene) {
  Object.keys(scene._tabBtnObjs).forEach(id => {
    const { drawTab, txt } = scene._tabBtnObjs[id];
    const isActive = id === scene._activeTab;
    drawTab(isActive, false);
    txt.setStyle({ fill: isActive ? '#c8a070' : '#6b4020' });
  });
}

// ════════════════════════════════════════════════════════════════
//  패널 콘텐츠 채우기
// ════════════════════════════════════════════════════════════════
function _diveFillContent(scene, tabId, panelX, panelY, panelW, panelH, fs) {
  scene._panelContent.removeAll(true);

  const TITLES = {
    inventory: '인  벤  토  리',
    submarine: '잠  수  정',
    shop:      '심  해  상  점',
    party:     '파  티  관  리',
    journal:   '탐  사  일  지',
  };
  scene._panelTitleTxt.setText(TITLES[tabId] || '');

  const px = panelX + 14;
  const py = panelY + panelH * 0.13;
  const pw = panelW - 28;
  const ph = panelH * 0.84;

  switch (tabId) {
    case 'inventory': DivePanelInventory(scene, px, py, pw, ph, fs);  break;
    case 'submarine': DivePanelSubmarine(scene, px, py, pw, ph, fs);  break;
    case 'shop':      DivePanelShop(scene, px, py, pw, ph, fs);       break;
    case 'party':     DivePanelParty(scene, px, py, pw, ph, fs);      break;
    case 'journal':   DivePanelJournal(scene, px, py, pw, ph, fs);    break;
  }
}

// ── 외부 호출용 래퍼 ─────────────────────────────────────────────
function DiveSwitchTab(scene, tabId) {
  if (!scene._tabBtnObjs) return;
  const W  = scene.W;
  const H  = scene.H;
  const fs = n => FontManager.adjustedSize(n, scene.scale);

  scene._activeTab = tabId;
  _diveRefreshTabButtons(scene);

  const { panelX, panelY, panelW, panelH } = _diveDrawPanelBg(scene, W, H, tabId);
  _diveFillContent(scene, tabId, panelX, panelY, panelW, panelH, fs);

  if (!scene._panelOpen) _diveOpenPanel(scene, W);
}
