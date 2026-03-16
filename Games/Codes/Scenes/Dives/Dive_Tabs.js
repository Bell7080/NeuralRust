// ================================================================
//  Dive_Tabs.js
//  경로: Games/Codes/Scenes/Dives/Dive_Tabs.js
//
//  역할: DiveScene 좌측 탭 버튼 + 슬라이드인 패널 + 닫기 버튼
//
//  ── 동작 ────────────────────────────────────────────────────
//  탭 클릭          → 패널 슬라이드인 (탭 버튼 우측에서 등장)
//  같은 탭 재클릭   → 슬라이드아웃 (닫힘)
//  다른 탭 클릭     → 패널 위치 유지, 콘텐츠만 교체
//  닫기 버튼 클릭   → 슬라이드아웃
//  닫기 버튼        → 패널 열린 동안만 좌측 하단에 표시
//
//  ── 구조 ────────────────────────────────────────────────────
//  메인화면 = 슬롯 화면 (풀 영역)
//  패널     = 그 위에 슬라이드인으로 뜨는 오버레이
//
//  탭 목록:
//    'inventory' — 인벤토리
//    'submarine' — 잠수정
//    'shop'      — 심해 상점
//    'party'     — 파티 관리
//    'journal'   — 탐사 일지
// ================================================================

const DIVE_TABS = [
  { id: 'inventory', label: '인벤토리' },
  { id: 'submarine', label: '잠수정'   },
  { id: 'shop',      label: '심해 상점' },
  { id: 'party',     label: '파티 관리' },
  { id: 'journal',   label: '탐사 일지' },
];

// 패널 너비 — shop/submarine은 넓게
const PANEL_W_DEFAULT = 0.38;
const PANEL_W_WIDE    = 0.55;
const WIDE_TABS       = new Set(['shop', 'submarine']);

function DiveBuildTabs(scene, W, H) {
  const fs   = n => FontManager.adjustedSize(n, scene.scale);
  const tabW = W * 0.10;
  const tabH = H * 0.09;
  const gapY = 3;

  const totalH = DIVE_TABS.length * tabH + (DIVE_TABS.length - 1) * gapY;
  const startY = H / 2 - totalH / 2;

  // ── 탭 열 배경 ───────────────────────────────────────────────
  const colBg = scene.add.graphics().setDepth(8);
  colBg.fillStyle(0x080607, 0.92);
  colBg.lineStyle(1, 0x1e1008, 0.6);
  colBg.fillRect(0, 0, tabW, H);
  colBg.strokeRect(0, 0, tabW, H);

  scene._tabBtnObjs  = {};
  scene._panelOpen   = false;
  scene._panelTween  = null;

  // ── 탭 버튼 ──────────────────────────────────────────────────
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
  const lg = scene.add.graphics().setDepth(8);
  lg.lineStyle(1, 0x2a1a0a, 0.7);
  lg.lineBetween(tabW, 0, tabW, H);

  // ── 닫기 버튼 (패널 열린 동안만 표시) ────────────────────────
  const closeY = H * 0.88;
  const closeBg = scene.add.graphics().setDepth(9).setAlpha(0);
  closeBg.fillStyle(0x1a0a06, 1);
  closeBg.lineStyle(1, 0x804020, 0.8);
  closeBg.fillRect(0, closeY - tabH/2, tabW, tabH);
  closeBg.strokeRect(0, closeY - tabH/2, tabW, tabH);

  const closeTxt = scene.add.text(tabW/2, closeY, '닫  기', {
    fontSize: fs(10), fill: '#804020', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5).setDepth(10).setAlpha(0);

  const closeHit = scene.add.rectangle(tabW/2, closeY, tabW, tabH, 0, 0)
    .setDepth(15).setAlpha(0);
  scene._sceneHits.push(closeHit);

  closeHit.on('pointerover',  () => { closeTxt.setStyle({ fill: '#c8a070' }); });
  closeHit.on('pointerout',   () => { closeTxt.setStyle({ fill: '#804020' }); });
  closeHit.on('pointerdown',  () => { if (scene._activeTab) _diveClosePanel(scene); });

  scene._closeBg  = closeBg;
  scene._closeTxt = closeTxt;
  scene._closeHit = closeHit;

  // ── 슬라이드 패널 컨테이너 (초기 화면 밖) ─────────────────────
  _diveBuildSlidingPanel(scene, W, H, fs);
}

// ════════════════════════════════════════════════════════════════
//  슬라이딩 패널 빌드
// ════════════════════════════════════════════════════════════════
function _diveBuildSlidingPanel(scene, W, H, fs) {
  const tabW   = W * 0.10;
  const topH   = H * 0.12;

  // 패널 위치 계산 (tabId에 따라 넓이 달라지므로 최대치로 컨테이너 생성)
  scene._panelOpenX   = tabW;                    // 열린 위치
  scene._panelClosedX = tabW - W * PANEL_W_WIDE; // 닫힌 위치 (화면 밖)
  scene._panelY       = topH;
  scene._panelH       = H - topH;

  // 컨테이너 — 닫힌 위치에서 시작
  scene._panelContainer = scene.add.container(scene._panelClosedX, 0).setDepth(20);

  // 패널 배경 (최대 너비로, 실제 콘텐츠가 채움)
  const panelBg = scene.add.graphics();
  panelBg.fillStyle(0x0c0a08, 0.97);
  panelBg.lineStyle(2, 0x3a2010, 0.85);
  panelBg.fillRect(0, topH, W * PANEL_W_WIDE, H - topH);
  panelBg.strokeRect(0, topH, W * PANEL_W_WIDE, H - topH);
  scene._panelContainer.add(panelBg);
  scene._panelBg = panelBg;

  // 패널 타이틀
  scene._panelTitleTxt = scene.add.text(
    W * PANEL_W_WIDE / 2, topH + (H - topH) * 0.04, '', {
      fontSize: fs(15), fill: '#6b4020', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setDepth(21);
  scene._panelContainer.add(scene._panelTitleTxt);

  // 타이틀 구분선
  const titleLine = scene.add.graphics();
  titleLine.lineStyle(1, 0x2a1a0a, 0.7);
  titleLine.lineBetween(8, topH + (H - topH) * 0.085,
    W * PANEL_W_WIDE - 8, topH + (H - topH) * 0.085);
  scene._panelContainer.add(titleLine);

  // 콘텐츠 컨테이너
  scene._panelContent = scene.add.container(0, 0).setDepth(21);
  scene._panelContainer.add(scene._panelContent);
}

// ════════════════════════════════════════════════════════════════
//  탭 토글 / 열기 / 닫기
// ════════════════════════════════════════════════════════════════
function _diveToggleTab(scene, tabId, W, H, fs) {
  if (scene._activeTab === tabId && scene._panelOpen) {
    // 같은 탭 → 닫기
    _diveClosePanel(scene);
  } else if (scene._activeTab !== tabId && scene._panelOpen) {
    // 다른 탭 → 패널 너비 조정 후 콘텐츠만 교체
    scene._activeTab = tabId;
    _diveRefreshTabButtons(scene);
    _diveFillPanelContent(scene, tabId, W, H, fs);
    _diveAdjustPanelWidth(scene, tabId, W, H);
  } else {
    // 닫힌 상태 → 열기
    scene._activeTab = tabId;
    _diveRefreshTabButtons(scene);
    _diveFillPanelContent(scene, tabId, W, H, fs);
    _diveAdjustPanelWidth(scene, tabId, W, H);
    _diveOpenPanel(scene);
  }
}

function _diveOpenPanel(scene) {
  scene._panelOpen = true;
  if (scene._panelTween) scene._panelTween.stop();

  // 닫기 버튼 표시
  scene._closeBg.setAlpha(1);
  scene._closeTxt.setAlpha(1);
  scene._closeHit.setAlpha(1).setInteractive({ useHandCursor: true });

  scene._panelTween = scene.tweens.add({
    targets:  scene._panelContainer,
    x:        scene._panelOpenX,
    duration: 260,
    ease:     'Cubic.easeOut',
  });
}

function _diveClosePanel(scene) {
  scene._panelOpen = false;
  if (scene._panelTween) scene._panelTween.stop();

  // 닫기 버튼 숨김
  scene._closeBg.setAlpha(0);
  scene._closeTxt.setAlpha(0);
  scene._closeHit.disableInteractive().setAlpha(0);

  scene._panelTween = scene.tweens.add({
    targets:  scene._panelContainer,
    x:        scene._panelClosedX,
    duration: 220,
    ease:     'Cubic.easeIn',
    onComplete: () => {
      scene._activeTab = null;
      _diveRefreshTabButtons(scene);
    },
  });
}

function _diveAdjustPanelWidth(scene, tabId, W, H) {
  // 상점/잠수정은 넓게, 나머지는 기본 너비
  const ratio = WIDE_TABS.has(tabId) ? PANEL_W_WIDE : PANEL_W_DEFAULT;
  const topH  = scene._panelY;
  const panelW = W * ratio;

  scene._panelBg.clear();
  scene._panelBg.fillStyle(0x0c0a08, 0.97);
  scene._panelBg.lineStyle(2, 0x3a2010, 0.85);
  scene._panelBg.fillRect(0, topH, panelW, H - topH);
  scene._panelBg.strokeRect(0, topH, panelW, H - topH);

  scene._panelTitleTxt.setX(panelW / 2);

  // 닫힌 위치 업데이트
  scene._panelClosedX = scene._panelOpenX - panelW;
  scene._currentPanelW = panelW;
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
function _diveFillPanelContent(scene, tabId, W, H, fs) {
  scene._panelContent.removeAll(true);

  const TITLES = {
    inventory: '인  벤  토  리',
    submarine: '잠  수  정',
    shop:      '심  해  상  점',
    party:     '파  티  관  리',
    journal:   '탐  사  일  지',
  };
  scene._panelTitleTxt.setText(TITLES[tabId] || '');

  const ratio  = WIDE_TABS.has(tabId) ? PANEL_W_WIDE : PANEL_W_DEFAULT;
  const panelW = W * ratio;
  const topH   = scene._panelY;
  const panelH = H - topH;
  const px     = 12;
  const py     = topH + panelH * 0.10;
  const pw     = panelW - 24;
  const ph     = panelH - panelH * 0.10 - 10;

  switch (tabId) {
    case 'inventory': DivePanelInventory(scene, px, py, pw, ph, fs);  break;
    case 'submarine': DivePanelSubmarine(scene, px, py, pw, ph, fs);  break;
    case 'shop':      DivePanelShop(scene, px, py, pw, ph, fs);       break;
    case 'party':     DivePanelParty(scene, px, py, pw, ph, fs);      break;
    case 'journal':   DivePanelJournal(scene, px, py, pw, ph, fs);    break;
  }
}

// ── 외부 호출용 래퍼 (패널 파일에서 탭 전환 필요 시) ─────────────
function DiveSwitchTab(scene, tabId) {
  if (!scene._tabBtnObjs) return;
  const W  = scene.W;
  const H  = scene.H;
  const fs = n => FontManager.adjustedSize(n, scene.scale);

  scene._activeTab = tabId;
  _diveRefreshTabButtons(scene);
  _diveFillPanelContent(scene, tabId, W, H, fs);
  _diveAdjustPanelWidth(scene, tabId, W, H);

  // 패널이 닫혀있으면 열기
  if (!scene._panelOpen) _diveOpenPanel(scene);
}
