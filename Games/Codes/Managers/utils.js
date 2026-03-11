// ================================================================
//  utils.js
//  경로: Games/Codes/Managers/utils.js
//
//  역할: 어느 씬에서도 사용하는 전역 유틸 함수
//
//  기준 해상도: 1920 × 1080
//  basePx 수치는 1920×1080 기준으로 설계됨
//  최소 배율 0.40 — 작은 화면에서도 일정 크기 보장
// ================================================================

/**
 * 해상도에 비례하는 폰트 크기 반환
 * @param {number} basePx     - 1920x1080 기준 폰트 크기(px)
 * @param {object} sceneScale - Phaser scene.scale 객체 (선택)
 * @returns {string}          - '24px' 형태 문자열
 */
function scaledFontSize(basePx, sceneScale) {
  const s = sceneScale || { width: window.innerWidth, height: window.innerHeight };
  const ratio = Math.min(s.width / 1920, s.height / 1080);
  return `${Math.round(basePx * Math.max(ratio, 0.40))}px`;
}
