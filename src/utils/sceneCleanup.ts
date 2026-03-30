// ================================================================
//  sceneCleanup.ts
//  경로: src/utils/sceneCleanup.ts
//
//  역할: 씬 전환 시 HTML DOM 잔여물 일괄 제거
//        모든 씬의 create() 최상단에서 호출할 것
// ================================================================

const SCENE_DOM_IDS = [
  'atelier-hud',
  'atelier-welcome-overlay',
  'dialogue-hud',
  'char-profile-overlay',
  'battle-setup',
  'battle-hud',
  'dive-dim',
  'dive-panel',
] as const;

export function clearAllSceneDom(): void {
  SCENE_DOM_IDS.forEach(id => {
    document.getElementById(id)?.remove();
  });
}
