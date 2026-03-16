// ================================================================
//  Dive_Panel_Journal.js
//  경로: Games/Codes/Scenes/Dives/Panels/Dive_Panel_Journal.js
//
//  역할: 탐사 일지 패널 — 라운드 기록 표시
//  호출: DivePanelJournal(scene, px, py, pw, ph, fs)
// ================================================================

function DivePanelJournal(scene, px, py, pw, ph, fs) {
  const lbl = scene.add.text(px, py, '탐  사  일  지', {
    fontSize: fs(11), fill: '#4a2a10', fontFamily: FontManager.TITLE,
  });
  scene._panelContent.add(lbl);

  const logLines = scene._log.length
    ? scene._log.slice().reverse()
    : [{ note: '기록 없음' }];

  const lineH = parseInt(fs(14));

  logLines.forEach((entry, i) => {
    const txt = entry.note
      || `R${entry.round}  ${entry.type || ''}  —  ${entry.result || ''}`;
    const col = entry.result === 'defeat'  ? '#7a2a10'
              : entry.result === 'victory' ? '#305020'
              : '#3a2a10';
    const line = scene.add.text(
      px, py + parseInt(fs(20)) + i * lineH, `▸ ${txt}`, {
        fontSize: fs(10), fill: col, fontFamily: FontManager.MONO,
        wordWrap: { width: pw - 8 },
      });
    scene._panelContent.add(line);
  });
}
