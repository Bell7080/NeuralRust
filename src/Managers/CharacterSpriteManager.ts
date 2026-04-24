// ================================================================
//  CharacterSpriteManager.ts
//  역할: 직업별 초상화 PNG/MP4 관리
//        diver    → Character_Noa_001 (잠수부)
//        fisher   → Character_Noa_002 (낚시꾼)
//        helmsman → Character_Noa_003 (조타수)
// ================================================================

const PORTRAITS: Record<string, { key: string; png: string; mp4: string }> = {
  diver:    { key: 'portrait_diver',    png: 'Games/Assets/Sprites/Character_Noa_001.png', mp4: 'Games/Assets/Sprites/Character_Noa_001.mp4' },
  fisher:   { key: 'portrait_fisher',   png: 'Games/Assets/Sprites/Character_Noa_002.png', mp4: 'Games/Assets/Sprites/Character_Noa_002.mp4' },
  helmsman: { key: 'portrait_helmsman', png: 'Games/Assets/Sprites/Character_Noa_003.png', mp4: 'Games/Assets/Sprites/Character_Noa_003.mp4' },
};

const FALLBACK_KEY = 'portrait_diver';

function preload(scene: Phaser.Scene): void {
  for (const p of Object.values(PORTRAITS)) {
    if (!scene.textures.exists(p.key)) {
      scene.load.image(p.key, p.png);
    }
  }
}

function getPortraitKey(job: string): string {
  return PORTRAITS[job]?.key ?? FALLBACK_KEY;
}

function getVideoPath(job: string): string {
  return PORTRAITS[job]?.mp4 ?? '';
}

export const CharacterSpriteManager = {
  preload,
  getPortraitKey,
  getVideoPath,
};
