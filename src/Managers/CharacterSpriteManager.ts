// ================================================================
//  CharacterSpriteManager.ts
//  경로: src/Managers/CharacterSpriteManager.ts
//
//  역할: 캐릭터 스프라이트 시트 로드 및 키 관리
//
//  스프라이트 시트 구조:
//    Sd_Character_Sheet_001.png → char_000 ~ char_035 (6x6 = 36개)
//    Sd_Character_Sheet_002.png → char_036 ~ char_071 (6x6 = 36개)
//    총 72개  ※ 두 시트 모두 998 x 1498 동일 크기
//
//  사용법:
//    [LoadingScene.preload]  CharacterSpriteManager.preload(this);
//    [LoadingScene.create]   CharacterSpriteManager.extractToTextures(this);
//    [다른 씬]               this.add.image(x, y, CharacterSpriteManager.getKey(id))
// ================================================================

// ── 경로 ──────────────────────────────────────────────────────────
const SHEET_1_KEY  = 'char_sheet_001';
const SHEET_2_KEY  = 'char_sheet_002';
const SHEET_1_PATH = 'Games/Assets/Sprites/Sd_Character_Sheet_001.png';
const SHEET_2_PATH = 'Games/Assets/Sprites/Sd_Character_Sheet_002.png';

// ── 실제 픽셀 경계 (998 x 1498 기준, 원본 × 2 업스케일) ──────────
const ROWS_1: [number, number][] = [[12,266],[258,518],[520,756],[768,1000],[1006,1244],[1252,1488]];
const COLS_1: [number, number][] = [[22,150],[184,310],[346,472],[514,632],[676,792],[830,962]];

const ROWS_2: [number, number][] = [[12,266],[258,518],[520,756],[768,1000],[1006,1244],[1252,1488]];
const COLS_2: [number, number][] = [[22,150],[184,310],[346,472],[514,632],[676,792],[830,962]];

const CELL_W = 152;
const CELL_H = 280;

function preload(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SHEET_1_KEY)) {
    scene.load.image(SHEET_1_KEY, SHEET_1_PATH);
  }
  if (!scene.textures.exists(SHEET_2_KEY)) {
    scene.load.image(SHEET_2_KEY, SHEET_2_PATH);
  }
}

function extractToTextures(scene: Phaser.Scene): void {
  _extractSheet(scene, SHEET_1_KEY, ROWS_1, COLS_1, 0);
  _extractSheet(scene, SHEET_2_KEY, ROWS_2, COLS_2, 36);
}

function _extractSheet(
  scene:      Phaser.Scene,
  sheetKey:   string,
  rowBounds:  [number, number][],
  colBounds:  [number, number][],
  startIdx:   number,
): void {
  if (!scene.textures.exists(sheetKey)) {
    console.warn('[CharacterSpriteManager] 시트 미로드:', sheetKey);
    return;
  }

  const src = scene.textures.get(sheetKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;

  let idx = startIdx;
  for (const [y0, y1] of rowBounds) {
    for (const [x0, x1] of colBounds) {
      const key = getKey(idx);
      idx++;

      if (scene.textures.exists(key)) continue;

      const cropW = x1 - x0;
      const cropH = y1 - y0;

      const canvas  = document.createElement('canvas');
      canvas.width  = CELL_W;
      canvas.height = CELL_H;
      const ctx     = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, CELL_W, CELL_H);

      const px = Math.floor((CELL_W - cropW) / 2);
      const py = Math.floor((CELL_H - cropH) / 2);
      ctx.drawImage(src, x0, y0, cropW, cropH, px, py, cropW, cropH);

      scene.textures.addCanvas(key, canvas);
    }
  }
}

function getKey(id: number): string {
  return `char_${String(id).padStart(3, '0')}`;
}

function getTotal(): number { return 72; }

export const CharacterSpriteManager = {
  preload,
  extractToTextures,
  getKey,
  getTotal,
  CELL_W,
  CELL_H,
};
