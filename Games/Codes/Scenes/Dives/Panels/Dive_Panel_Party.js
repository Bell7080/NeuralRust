// ================================================================
//  Dive_Panel_Party.js
//  경로: Games/Codes/Scenes/Dives/Panels/Dive_Panel_Party.js
//
//  역할: 파티 관리 패널 — 탐사 파티원 HP / 상태 표시
//  호출: DivePanelParty(scene, px, py, pw, ph, fs)
// ================================================================

function DivePanelParty(scene, px, py, pw, ph, fs) {
  const allChars = CharacterManager.loadAll() || [];
  const cardW    = Math.round(pw / 8) - 6;
  const cardH    = Math.round(ph * 0.80);
  let   cx       = px + cardW / 2;

  // 타이틀
  const lbl = scene.add.text(px, py, '파  티  관  리', {
    fontSize: fs(11), fill: '#4a2a10', fontFamily: FontManager.TITLE,
  });
  scene._tabContentContainer.add(lbl);

  const cardTop = py + parseInt(fs(18));

  scene._battleParty.forEach(id => {
    const c = allChars.find(ch => ch.id === id);
    if (!c) return;

    const hpPct = c.maxHp > 0 ? c.currentHp / c.maxHp : 0;
    const dead  = c.currentHp <= 0;
    const cogC  = CharacterManager.getCogColor(c.cog);

    // 카드 배경
    const cardBg = scene.add.graphics();
    cardBg.fillStyle(dead ? 0x1a0808 : 0x0c0906, 1);
    cardBg.lineStyle(1, dead ? 0x5a1818 : cogC.phaser, 0.6);
    cardBg.fillRect(cx - cardW/2, cardTop, cardW, cardH);
    cardBg.strokeRect(cx - cardW/2, cardTop, cardW, cardH);
    scene._tabContentContainer.add(cardBg);

    // Cog 뱃지
    const cogTxt = scene.add.text(cx - cardW * 0.42, cardTop + 4,
      `C${c.cog}`, { fontSize: fs(7), fill: cogC.css, fontFamily: FontManager.MONO });
    scene._tabContentContainer.add(cogTxt);

    // 스프라이트
    if (scene.textures.exists(c.spriteKey)) {
      const spr = scene.add.image(cx, cardTop + cardH * 0.36, c.spriteKey)
        .setDisplaySize(cardW * 0.72, cardW * 0.72)
        .setAlpha(dead ? 0.22 : 0.88);
      scene._tabContentContainer.add(spr);
    }

    // 이름
    const nameTxt = scene.add.text(cx, cardTop + cardH * 0.72, c.name, {
      fontSize: fs(8), fill: dead ? '#5a2222' : '#c8bfb0',
      fontFamily: FontManager.TITLE, wordWrap: { width: cardW - 4 }, align: 'center',
    }).setOrigin(0.5);
    scene._tabContentContainer.add(nameTxt);

    // HP 바 or 전투불능
    if (!dead) {
      const bW  = cardW * 0.82, bH = 3;
      const bY  = cardTop + cardH * 0.88;
      const bar = scene.add.graphics();
      bar.fillStyle(0x1a1008, 1);
      bar.fillRect(cx - bW/2, bY, bW, bH);
      const col = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
      bar.fillStyle(col, 1);
      bar.fillRect(cx - bW/2, bY, Math.round(bW * hpPct), bH);
      scene._tabContentContainer.add(bar);

      // HP 수치
      const hpTxt = scene.add.text(cx, cardTop + cardH * 0.93,
        `${c.currentHp}/${c.maxHp}`, {
          fontSize: fs(7), fill: '#6a5030', fontFamily: FontManager.MONO,
        }).setOrigin(0.5);
      scene._tabContentContainer.add(hpTxt);
    } else {
      const deadTxt = scene.add.text(cx, cardTop + cardH * 0.50, '전투불능', {
        fontSize: fs(8), fill: '#c03030', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      scene._tabContentContainer.add(deadTxt);
    }

    cx += cardW + 6;
  });
}
