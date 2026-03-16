// ================================================================
//  Dive_Tabs.js
//  경로: Games/Codes/Scenes/Dives/Dive_Tabs.js
//
//  역할: DiveScene 좌측 탭 버튼 + 중앙 오버레이 슬라이드인 패널
//
//  ── 레이아웃 원칙 ────────────────────────────────────────────
//  · 모든 위치/크기 = W * 비율 or H * 비율 (하드코딩 없음)
//  · 폰트 = FontManager.adjustedSize(basePx, scene.scale)
//  · 패널 컨테이너 내부 오브젝트 = 컨테이너 로컬좌표(0,0 기준)
//  · 슬라이드: 컨테이너 x 만 이동 (-panelW ↔ openX)
//
//  ── 탭 동작 ─────────────────────────────────────────────────
//  탭 클릭          → 슬라이드인 (왼쪽 밖 → 화면 중앙)
//  같은 탭 재클릭   → 슬라이드아웃
//  다른 탭 클릭     → 콘텐츠만 교체 (패널 위치 유지)
//  딤 or 닫기 클릭  → 슬라이드아웃
//
//  ── 패널 크기 ────────────────────────────────────────────────
//  기본: W * 0.55, H * 0.75
//  넓은 탭 (shop, submarine): W * 0.72, H * 0.80
// ================================================================

const DIVE_TABS = [
  { id: 'inventory', label: '인벤토리' },
  { id: 'submarine', label: '잠수정'   },
  { id: 'shop',      label: '심해 상점' },
  { id: 'party',     label: '파티 관리' },
  { id: 'journal',   label: '탐사 일지' },
];

// 패널 크기 비율 (W/H 기준)
const _PANEL_RATIO = {
  default:   { w: 0.55, h: 0.75 },
  submarine: { w: 0.72, h: 0.80 },
  shop:      { w: 0.72, h: 0.80 },
};
const _WIDE_TABS = new Set(['submarine', 'shop']);

// ════════════════════════════════════════════════════════════════
//  탭 버튼 + 패널 빌드 진입점
// ════════════════════════════════════════════════════════════════
function DiveBuildTabs(scene, W, H) {
  const fs   = n => FontManager.adjustedSize(n, scene.scale);
  const tabW = W * 0.10;
  const tabH = H * 0.09;
  const gapY = H * 0.004;

  scene._tabBtnObjs = {};
  scene._panelOpen  = false;
  scene._panelTween = null;

  // ── 탭 열 배경 ───────────────────────────────────────────────
  const colBg = scene.add.graphics().setDepth(8);
  colBg.fillStyle(0x080607, 0.92);
  colBg.lineStyle(1, 0x1e1008, 0.6);
  colBg.fillRect(0, 0, tabW, H);
  colBg.strokeRect(0, 0, tabW, H);

  // 탭 버튼 수직 중앙 정렬
  const totalH = DIVE_TABS.length * tabH + (DIVE_TABS.length - 1) * gapY;
  const startY = H / 2 - totalH / 2;

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
      fontFamily: FontManager.TITLE, align: 'center',
      wordWrap: { width: tabW - W * 0.008 },
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

  // ── 닫기 버튼 ─────────────────────────────────────────────────
  _diveBuildCloseBtn(scene, W, H, tabW, tabH, fs);

  // ── 슬라이드 패널 ─────────────────────────────────────────────
  _diveBuildPanel(scene, W, H, fs);
}

// ── 닫기 버튼 (패널 열린 동안만 표시) ────────────────────────────
function _diveBuildCloseBtn(scene, W, H, tabW, tabH, fs) {
  const closeY = H * 0.90;
  const closeBg = scene.add.graphics().setDepth(9).setAlpha(0);

  const _draw = (hover) => {
    closeBg.clear();
    closeBg.fillStyle(hover ? 0x2a1008 : 0x1a0a06, 1);
    closeBg.lineStyle(1, hover ? 0xc06030 : 0x804020, 0.9);
    closeBg.fillRect(W * 0.002, closeY - tabH/2, tabW - W * 0.004, tabH);
    closeBg.strokeRect(W * 0.002, closeY - tabH/2, tabW - W * 0.004, tabH);
  };
  _draw(false);

  const closeTxt = scene.add.text(tabW/2, closeY, '닫  기', {
    fontSize: fs(10), fill: '#804020', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5).setDepth(10).setAlpha(0);

  const closeHit = scene.add.rectangle(tabW/2, closeY, tabW - W * 0.004, tabH, 0, 0)
    .setDepth(15).setAlpha(0);
  scene._sceneHits.push(closeHit);

  closeHit.on('pointerover',  () => { _draw(true);  closeTxt.setStyle({ fill: '#c8a070' }); });
  closeHit.on('pointerout',   () => { _draw(false); closeTxt.setStyle({ fill: '#804020' }); });
  closeHit.on('pointerdown',  () => { if (scene._panelOpen) _diveClosePanel(scene); });

  scene._closeBg  = closeBg;
  scene._closeTxt = closeTxt;
  scene._closeHit = closeHit;
}

// ════════════════════════════════════════════════════════════════
//  패널 빌드 — 컨테이너 로컬좌표 기준
// ════════════════════════════════════════════════════════════════
function _diveBuildPanel(scene, W, H, fs) {
  // 딤 오버레이 (컨테이너 밖, 항상 전체 화면)
  scene._panelDim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.60)
    .setOrigin(0).setDepth(28).setAlpha(0);
  scene._panelDim.setInteractive();
  scene._panelDim.on('pointerdown', () => {
    if (scene._panelOpen) _diveClosePanel(scene);
  });

  // 컨테이너 — 최대 패널 크기 기준으로 생성, 초기 위치: 화면 왼쪽 밖
  const maxRatio  = _PANEL_RATIO.submarine;
  const maxPanelW = Math.round(W * maxRatio.w);
  scene._panelContainer = scene.add.container(-maxPanelW - W * 0.01, 0).setDepth(30);

  // 패널 배경 그래픽 (로컬 좌표 — 탭 전환 시 clear & redraw)
  scene._panelBg   = scene.add.graphics();
  scene._panelDeco = scene.add.graphics();
  scene._panelContainer.add([scene._panelBg, scene._panelDeco]);

  // 타이틀 텍스트 (로컬 좌표 — 위치는 _diveDrawPanelSurface에서 설정)
  scene._panelTitleTxt = scene.add.text(0, 0, '', {
    fontSize: fs(16), fill: '#c8a070', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5);
  scene._panelContainer.add(scene._panelTitleTxt);

  // 타이틀 구분선
  scene._panelTitleLine = scene.add.graphics();
  scene._panelContainer.add(scene._panelTitleLine);

  // 콘텐츠 컨테이너 (패널 파일들이 여기에 오브젝트 추가)
  scene._panelContent = scene.add.container(0, 0);
  scene._panelContainer.add(scene._panelContent);

  // 초기 패널 크기 저장
  scene._panelW = 0;
  scene._panelH = 0;
}

// ── 패널 배경/장식 그리기 (로컬 좌표 기준) ───────────────────────
function _diveDrawPanelSurface(scene, W, H, tabId) {
  const ratio  = _PANEL_RATIO[tabId] || _PANEL_RATIO.default;
  const pW     = Math.round(W * ratio.w);
  const pH     = Math.round(H * ratio.h);
  const openX  = Math.round((W - pW) / 2);   // 화면 가로 중앙
  const openY  = Math.round((H - pH) / 2);   // 화면 세로 중앙

  scene._panelW    = pW;
  scene._panelH    = pH;
  scene._panelOpenX = openX;
  scene._panelOpenY = openY;

  // 컨테이너 Y는 openY로 고정 (x만 슬라이드)
  scene._panelContainer.setY(openY);

  // 패널 배경 (로컬 0,0 기준)
  scene._panelBg.clear();
  scene._panelBg.fillStyle(0x080708, 0.96);
  scene._panelBg.lineStyle(2, 0x3a2a10, 0.9);
  scene._panelBg.fillRect(0, 0, pW, pH);
  scene._panelBg.strokeRect(0, 0, pW, pH);

  // 모서리 장식 (drawCornerDeco 유틸 활용)
  scene._panelDeco.clear();
  const cs = Math.round(W * 0.012);   // 코너 선 길이도 W 비율
  drawCornerDeco(scene._panelDeco, 0, 0, pW, pH, cs, 0x6a5030, 0.8);

  // 볼트 4개
  const br  = Math.round(W * 0.003);
  const pad = Math.round(W * 0.005);
  [[pad, pad],[pW-pad, pad],[pad, pH-pad],[pW-pad, pH-pad]].forEach(([bx,by]) => {
    scene._panelDeco.fillStyle(0x4a3820, 1);
    scene._panelDeco.lineStyle(1, 0x6a5030, 0.8);
    scene._panelDeco.fillCircle(bx, by, br);
    scene._panelDeco.strokeCircle(bx, by, br);
    scene._panelDeco.lineStyle(1, 0x2a1a08, 0.9);
    scene._panelDeco.lineBetween(bx - br*0.5, by, bx + br*0.5, by);
    scene._panelDeco.lineBetween(bx, by - br*0.5, bx, by + br*0.5);
  });

  // 타이틀 위치 (로컬 좌표)
  scene._panelTitleTxt.setPosition(pW/2, pH * 0.055);

  // 타이틀 구분선 (로컬 좌표)
  scene._panelTitleLine.clear();
  scene._panelTitleLine.lineStyle(1, 0x2a1a0a, 0.7);
  scene._panelTitleLine.lineBetween(
    W * 0.008, pH * 0.10,
    pW - W * 0.008, pH * 0.10
  );
}

// ════════════════════════════════════════════════════════════════
//  탭 토글 / 열기 / 닫기
// ════════════════════════════════════════════════════════════════
function _diveToggleTab(scene, tabId, W, H, fs) {
  if (scene._activeTab === tabId && scene._panelOpen) {
    _diveClosePanel(scene);
  } else if (scene._panelOpen) {
    // 다른 탭 → 패널 크기 조정 + 콘텐츠 교체
    scene._activeTab = tabId;
    _diveRefreshTabBtns(scene);
    _diveDrawPanelSurface(scene, W, H, tabId);
    _diveFillContent(scene, tabId, W, H, fs);
    // 이미 열려있으면 openX 위치로 즉시 이동
    scene._panelContainer.setX(scene._panelOpenX);
  } else {
    // 패널 닫힘 → 열기
    scene._activeTab = tabId;
    _diveRefreshTabBtns(scene);
    _diveDrawPanelSurface(scene, W, H, tabId);
    _diveFillContent(scene, tabId, W, H, fs);
    _diveOpenPanel(scene);
  }
}

function _diveOpenPanel(scene) {
  scene._panelOpen = true;
  if (scene._panelTween) scene._panelTween.stop();

  // 딤 페이드인
  scene.tweens.add({ targets: scene._panelDim, alpha: 1, duration: 180, ease: 'Linear' });

  // 패널 슬라이드인: 왼쪽 밖 → openX
  scene._panelContainer.setX(-scene._panelW - scene.W * 0.01);
  scene._panelTween = scene.tweens.add({
    targets:  scene._panelContainer,
    x:        scene._panelOpenX,
    duration: 300,
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
  scene.tweens.add({ targets: scene._panelDim, alpha: 0, duration: 180, ease: 'Linear' });

  // 패널 슬라이드아웃: openX → 오른쪽 밖
  scene._panelTween = scene.tweens.add({
    targets:  scene._panelContainer,
    x:        scene.W + scene._panelW * 0.1,
    duration: 240,
    ease:     'Cubic.easeIn',
    onComplete: () => {
      // 다음 열기 준비 — 왼쪽 밖으로 리셋
      scene._panelContainer.setX(-scene._panelW - scene.W * 0.01);
      scene._activeTab = null;
      _diveRefreshTabBtns(scene);
    },
  });

  // 닫기 버튼 숨김
  scene._closeBg.setAlpha(0);
  scene._closeTxt.setAlpha(0);
  scene._closeHit.disableInteractive().setAlpha(0);
}

function _diveRefreshTabBtns(scene) {
  Object.keys(scene._tabBtnObjs).forEach(id => {
    const { drawTab, txt } = scene._tabBtnObjs[id];
    const active = id === scene._activeTab;
    drawTab(active, false);
    txt.setStyle({ fill: active ? '#c8a070' : '#6b4020' });
  });
}

// ════════════════════════════════════════════════════════════════
//  패널 콘텐츠 채우기
//  — 패널 파일들은 scene._panelContent.add() 로 오브젝트 추가
//  — 좌표는 패널 로컬 (0,0) 기준
// ════════════════════════════════════════════════════════════════
function _diveFillContent(scene, tabId, W, H, fs) {
  scene._panelContent.removeAll(true);

  const TITLES = {
    inventory: '인  벤  토  리',
    submarine: '잠  수  정',
    shop:      '심  해  상  점',
    party:     '파  티  관  리',
    journal:   '탐  사  일  지',
  };
  scene._panelTitleTxt.setText(TITLES[tabId] || '');

  const pW = scene._panelW;
  const pH = scene._panelH;

  // 콘텐츠 영역 (패널 로컬 좌표 기준)
  const px = Math.round(pW * 0.02);
  const py = Math.round(pH * 0.12);
  const cw = pW - px * 2;
  const ch = pH - py - Math.round(pH * 0.02);

  switch (tabId) {
    case 'inventory': DivePanelInventory(scene, px, py, cw, ch, fs); break;
    case 'submarine': DivePanelSubmarine(scene, px, py, cw, ch, fs); break;
    case 'shop':      DivePanelShop(scene, px, py, cw, ch, fs);      break;
    case 'party':     DivePanelParty(scene, px, py, cw, ch, fs);     break;
    case 'journal':   DivePanelJournal(scene, px, py, cw, ch, fs);   break;
  }
}

// ── 외부 호출 래퍼 (패널 파일에서 탭 갱신 시 사용) ───────────────
function DiveSwitchTab(scene, tabId) {
  if (!scene._tabBtnObjs) return;
  const W  = scene.W;
  const H  = scene.H;
  const fs = n => FontManager.adjustedSize(n, scene.scale);
  scene._activeTab = tabId;
  _diveRefreshTabBtns(scene);
  _diveDrawPanelSurface(scene, W, H, tabId);
  _diveFillContent(scene, tabId, W, H, fs);
  if (!scene._panelOpen) _diveOpenPanel(scene);
}
