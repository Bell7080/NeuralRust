// ================================================================
//  Tab_Squad.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Squad.js
//
//  레이아웃
//  ┌──────────────────────────────────────────────┐
//  │                                              │
//  │   [←]  [캐릭터 카드 슬라이드]  [→]          │
//  │                                              │
//  │         ┌─────3×3 배치판─────┐              │
//  │         │  [칸][칸][칸]       │              │
//  │         │  [칸][칸][칸]       │              │
//  │         │  [칸][칸][칸]       │              │
//  │         └────────────────────┘              │
//  │  [ 직업 필터 ]  [ Cog 필터 ]                 │
//  └──────────────────────────────────────────────┘
//
//  분할:
//    Tab_Squad_Grid.js    — 3×3 격자 빌드 + 셀 조작
//    Tab_Squad_Slider.js  — 슬라이더, 필터, 드래그, 생명주기
// ================================================================

class Tab_Squad {
  constructor(scene, W, H) {
    this.scene  = scene;
    this.W      = W;
    this.H      = H;
    this._container = scene.add.container(0, 0);

    this._squad         = CharacterManager.loadSquad(); // 9 슬롯
    this._selectedSlot  = null;
    this._filterJob     = 'all';
    this._filterCog     = 'all';
    this._sliderOffset  = 0;
    this._sliderDragged = false;
    this._filterBarObjs = [];

    this._build();
  }

  _build() {
    const { scene, W, H } = this;

    const panelX = W * 0.20;
    const panelY = H * 0.22;
    const panelW = W * 0.60;
    const panelH = H * 0.55;

    // 패널 배경
    const bg = scene.add.graphics();
    bg.fillStyle(0x0d0a06, 0.97);
    bg.lineStyle(1, 0x4a2a10, 0.8);
    bg.strokeRect(panelX, panelY, panelW, panelH);
    bg.fillRect(panelX, panelY, panelW, panelH);
    this._container.add(bg);

    // 헤더
    this._container.add(scene.add.text(panelX + 16, panelY + 16, '[ 탐 사 대 ]', {
      fontSize: scaledFontSize(12, scene.scale), fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));

    const cx = panelX + panelW / 2;

    // ── 필터 바 (패널 하단)
    this._filterY = panelY + panelH - parseInt(scaledFontSize(36, scene.scale));
    this._buildFilters(panelX, panelW, this._filterY);

    // ── 3×3 배치판
    const gridSize = Math.min(panelW * 0.42, panelH * 0.40);
    const cellSize = gridSize / 3;
    const gridX    = cx - gridSize / 2;
    const gridY    = panelY + parseInt(scaledFontSize(48, scene.scale));

    this._gridX     = gridX;
    this._gridY     = gridY;
    this._cellSize  = cellSize;
    this._gridCells = [];
    this._buildGrid(gridX, gridY, cellSize);

    // ── 캐릭터 슬라이더 (격자 아래)
    const sliderTopY  = gridY + gridSize + parseInt(scaledFontSize(14, scene.scale));
    const sliderBotY  = this._filterY - parseInt(scaledFontSize(8, scene.scale));
    this._sliderAreaX = panelX + 10;
    this._sliderAreaY = sliderTopY;
    this._sliderAreaW = panelW - 20;
    this._sliderAreaH = Math.max(parseInt(scaledFontSize(90, scene.scale)), sliderBotY - sliderTopY);
    this._buildSlider();
    this._buildSliderDrag();
  }
}
