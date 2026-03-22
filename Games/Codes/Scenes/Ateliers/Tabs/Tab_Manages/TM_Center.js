// ================================================================
//  TM_Center.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Manages/TM_Center.js
//
//  역할: 중앙 패널 — 캐릭터 일러스트 표시
// ================================================================

const TM_Center = {

  // ── 초기 빈 패널 ────────────────────────────────────────────
  buildCenterPanel(tab, fs) {
    const { scene } = tab;
    tab._centerPanel = scene.add.container(0, 0);
    tab._container.add(tab._centerPanel);

    const fsFn = fs || (n => FontManager.adjustedSize(n, scene.scale));
    const cx   = tab._listW + tab._centerW / 2;
    const cy   = tab._bodyY + tab._bodyH / 2;

    const hint = scene.add.text(cx, cy, '캐릭터를 선택하세요', {
      fontSize: fsFn(16), fill: '#2a1c0a', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0.6);
    tab._centerPanel.add(hint);
    tab._detailObjs.push(hint);
  },

  // ── 선택된 캐릭터 일러스트 빌드 ─────────────────────────────
  buildDetail(tab, char) {
    if (tab._centerDetailObjs) {
      tab._centerDetailObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    }
    tab._centerDetailObjs = [];

    const { scene } = tab;
    const fs  = n => FontManager.adjustedSize(n, scene.scale);
    const cx  = tab._listW;
    const cy  = tab._bodyY;
    const cw  = tab._centerW;
    const ch  = tab._bodyH;

    const addC = (obj) => { tab._centerPanel.add(obj); tab._centerDetailObjs.push(obj); return obj; };

    const centerX = cx + cw / 2;
    const centerY = cy + ch / 2;

    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img = scene.add.image(centerX, centerY, char.spriteKey).setOrigin(0.5);
      img.setScale(Math.min(cw * 0.90 / img.width, ch * 0.94 / img.height));
      addC(img);
    } else {
      // 직업별 폴백 텍스트 — helmsman 포함
      const JOB_SHORT = { fisher: 'FISH', diver: 'DIVE', helmsman: 'HELM' };
      addC(scene.add.text(centerX, centerY, JOB_SHORT[char.job] || '?', {
        fontSize: fs(48), fill: '#1a2028', fontFamily: FontManager.MONO,
      }).setOrigin(0.5));
    }
  },
};
