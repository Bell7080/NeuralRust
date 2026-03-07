// ================================================================
//  CharacterSpriteManager.js
//  경로: Games/Codes/Managers/CharacterSpriteManager.js
//
//  역할: 캐릭터 스프라이트 시트 로드 및 키 관리
//
//  스프라이트 시트 구조:
//    Sd_Character_Sheet_001.png → char_000 ~ char_035 (6x6 = 36개)
//    Sd_Character_Sheet_002.png → char_036 ~ char_071 (6x6 = 36개)
//    총 72개, 각 셀 76x140px
//
//  사용법:
//    [LoadingScene] CharacterSpriteManager.preload(this);
//    [다른 씬]      CharacterSpriteManager.getKey(id)  → 'char_042'
//                   this.add.image(x, y, 'char_042')
// ================================================================

const CharacterSpriteManager = (() => {

  // ── 상수 ──────────────────────────────────────────────────
  const SHEET_1_KEY  = 'char_sheet_001';
  const SHEET_2_KEY  = 'char_sheet_002';
  const SHEET_1_PATH = 'Games/Assets/Sprites/Sd_Character_Sheet_001.png';
  const SHEET_2_PATH = 'Games/Assets/Sprites/Sd_Character_Sheet_002.png';

  const COLS      = 6;
  const ROWS      = 6;
  const CELL_W    = 76;   // px
  const CELL_H    = 140;  // px

  // Sheet001 실제 픽셀 경계 (y: EXPAND_TOP 8px 반영)
  const ROWS_1 = [[6,133],[129,259],[260,378],[384,500],[503,622],[626,744]];
  const COLS_1 = [[11,75],[92,155],[173,236],[257,316],[338,396],[415,481]];

  // Sheet002 실제 픽셀 경계
  const ROWS_2 = [[13,140],[154,288],[296,429],[438,563],[582,707],[720,845]];
  const COLS_2 = [[19,85],[113,176],[205,265],[296,358],[387,451],[478,543]];

  // ── preload ───────────────────────────────────────────────
  // LoadingScene.preload() 안에서 호출
  function preload(scene) {
    // 시트 전체를 spritesheet로 등록
    scene.load.spritesheet(SHEET_1_KEY, SHEET_1_PATH, {
      frameWidth:  CELL_W,
      frameHeight: CELL_H,
    });
    scene.load.spritesheet(SHEET_2_KEY, SHEET_2_PATH, {
      frameWidth:  CELL_W,
      frameHeight: CELL_H,
    });
  }

  // ── extractToTextures ─────────────────────────────────────
  // LoadingScene.create() 안에서 한 번 호출 → 개별 텍스처로 등록
  function extractToTextures(scene) {
    const registry = scene.textures;

    // Sheet001 → char_000 ~ char_035
    _extractSheet(scene, SHEET_1_KEY, ROWS_1, COLS_1, 0);

    // Sheet002 → char_036 ~ char_071
    _extractSheet(scene, SHEET_2_KEY, ROWS_2, COLS_2, 36);
  }

  function _extractSheet(scene, sheetKey, rowBounds, colBounds, startIdx) {
    const src = scene.textures.get(sheetKey).getSourceImage();
    let canvas = document.createElement('canvas');
    canvas.width  = CELL_W;
    canvas.height = CELL_H;
    let ctx = canvas.getContext('2d');

    let idx = startIdx;
    for (const [y0, y1] of rowBounds) {
      for (const [x0, x1] of colBounds) {
        const key = getKey(idx);

        // 이미 등록됐으면 스킵
        if (!scene.textures.exists(key)) {
          ctx.clearRect(0, 0, CELL_W, CELL_H);

          const cropW = x1 - x0;
          const cropH = y1 - y0;
          const px = Math.floor((CELL_W - cropW) / 2);
          const py = Math.floor((CELL_H - cropH) / 2);

          ctx.drawImage(src, x0, y0, cropW, cropH, px, py, cropW, cropH);
          scene.textures.addCanvas(key, canvas);

          // addCanvas는 참조를 공유하므로 즉시 새 canvas로 교체
          canvas = document.createElement('canvas');
          canvas.width  = CELL_W;
          canvas.height = CELL_H;
          ctx = canvas.getContext('2d');
        }
        idx++;
      }
    }
  }

  // ── getKey ────────────────────────────────────────────────
  // id: 0~71 → 'char_000' ~ 'char_071'
  function getKey(id) {
    return `char_${String(id).padStart(3, '0')}`;
  }

  // ── getTotal ──────────────────────────────────────────────
  function getTotal() {
    return COLS * ROWS * 2; // 72
  }

  // ── public ────────────────────────────────────────────────
  return { preload, extractToTextures, getKey, getTotal, CELL_W, CELL_H };

})();
