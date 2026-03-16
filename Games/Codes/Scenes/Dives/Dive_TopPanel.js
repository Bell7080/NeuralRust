// ================================================================
//  Dive_TopPanel.js
//  경로: Games/Codes/Scenes/Dives/Dive_TopPanel.js
//
//  역할: DiveScene 상단 패널
//    - 심해화폐 / ROUND / COG LIMIT / 파티 생존 / 철수 버튼
//  호출: DiveScene.create() → DiveBuildTopPanel(this, W, H)
//  반환: { deepCoinTxt }  ← DiveScene이 참조해야 할 동적 오브젝트
// ================================================================

function DiveBuildTopPanel(scene, W, H) {
  const fs     = n => FontManager.adjustedSize(n, scene.scale);
  const tabW   = W * 0.10;
  const panelX = tabW;
  const panelH = H * 0.13;
  const panelW = W - tabW;
  const cy     = panelH / 2;

  // 패널 배경
  const bg = scene.add.graphics();
  bg.fillStyle(0x0a0807, 0.9);
  bg.lineStyle(1, 0x2a1a0a, 0.7);
  bg.fillRect(panelX, 0, panelW, panelH);
  bg.strokeRect(panelX, 0, panelW, panelH);

  // ── 심해화폐 ──────────────────────────────────────────────────
  const coinX = panelX + panelW * 0.08;
  scene.add.text(coinX, cy - parseInt(fs(8)), '◈ 심해화폐', {
    fontSize: fs(9), fill: '#2a3a50', fontFamily: FontManager.MONO,
  }).setOrigin(0.5, 1);
  const deepCoinTxt = scene.add.text(coinX, cy + parseInt(fs(4)),
    `${scene._deepCoin}`, {
      fontSize: fs(16), fill: '#4a8ac0', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

  // ── 라운드 진행 ───────────────────────────────────────────────
  const roundX = panelX + panelW * 0.28;
  scene.add.text(roundX, cy - parseInt(fs(8)), 'ROUND', {
    fontSize: fs(9), fill: '#3a2010', fontFamily: FontManager.MONO, letterSpacing: 2,
  }).setOrigin(0.5, 1);
  scene.add.text(roundX, cy + parseInt(fs(4)),
    `${scene._round}  /  ${scene._maxRound}`, {
      fontSize: fs(16), fill: '#a05018', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

  // ── Cog 상한 ──────────────────────────────────────────────────
  const cogX = panelX + panelW * 0.48;
  const cogC = CharacterManager.getCogColor(scene._cogMax);
  scene.add.text(cogX, cy - parseInt(fs(8)), 'COG LIMIT', {
    fontSize: fs(9), fill: '#3a2010', fontFamily: FontManager.MONO, letterSpacing: 2,
  }).setOrigin(0.5, 1);
  scene.add.text(cogX, cy + parseInt(fs(4)), `${scene._cogMax}`, {
    fontSize: fs(16), fill: cogC.css, fontFamily: FontManager.TITLE,
  }).setOrigin(0.5, 0);

  // ── 파티 생존 ─────────────────────────────────────────────────
  const partyX  = panelX + panelW * 0.66;
  const allChars = CharacterManager.loadAll() || [];
  const alive    = scene._battleParty.filter(id => {
    const c = allChars.find(ch => ch.id === id);
    return c && c.currentHp > 0;
  }).length;
  scene.add.text(partyX, cy - parseInt(fs(8)), '파티 생존', {
    fontSize: fs(9), fill: '#3a2a10', fontFamily: FontManager.MONO,
  }).setOrigin(0.5, 1);
  scene.add.text(partyX, cy + parseInt(fs(4)),
    `${alive}  /  ${scene._battleParty.length}`, {
      fontSize: fs(16),
      fill: alive > 0 ? '#608060' : '#a03018',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

  // ── 철수 버튼 ─────────────────────────────────────────────────
  const exitX = panelX + panelW * 0.88;
  const exitW = Math.round(panelW * 0.16);
  const exitH = Math.round(panelH * 0.52);
  const exitBg = scene.add.graphics();
  const drawExit = (hover) => {
    exitBg.clear();
    exitBg.fillStyle(hover ? 0x1a0a06 : 0x0e0704, 1);
    exitBg.lineStyle(1, hover ? 0x804020 : 0x3a1a0a, 0.9);
    exitBg.fillRect(exitX - exitW / 2, cy - exitH / 2, exitW, exitH);
    exitBg.strokeRect(exitX - exitW / 2, cy - exitH / 2, exitW, exitH);
  };
  drawExit(false);
  const exitTxt = scene.add.text(exitX, cy, '철  수', {
    fontSize: fs(12), fill: '#5a3010', fontFamily: FontManager.TITLE,
  }).setOrigin(0.5);
  const exitHit = scene.add.rectangle(exitX, cy, exitW, exitH, 0, 0)
    .setInteractive({ useHandCursor: true }).setDepth(10);
  exitHit.on('pointerover', () => { drawExit(true);  exitTxt.setStyle({ fill: '#c06030' }); });
  exitHit.on('pointerout',  () => { drawExit(false); exitTxt.setStyle({ fill: '#5a3010' }); });
  exitHit.on('pointerup',   () => scene._exitExpedition());
  scene._sceneHits.push(exitHit);

  return { deepCoinTxt };
}
