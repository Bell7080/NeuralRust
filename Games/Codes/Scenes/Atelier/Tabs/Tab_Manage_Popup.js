// ================================================================
//  Tab_Manage_Popup.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Manage_Popup.js
//
//  역할: 관리 탭 — 캐릭터 프로필 팝업 UI
//  의존: Tab_Manage.js (prototype 확장), Tab_Manage_Utils.js
// ================================================================

Object.assign(Tab_Manage.prototype, {

  _openPopup(char) {
    this._closePopup();
    this._openCharId = char.id;

    const { scene, W, H } = this;
    const pw = W * 0.32;
    const ph = H * 0.74;
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;

    // 배경 딤
    const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55)
      .setOrigin(0).setDepth(400).setInteractive();
    overlay.on('pointerup', () => this._closePopup());
    this._popupOverlay = overlay;

    const g = scene.add.container(0, 0).setDepth(401);
    this._popupGroup = g;

    // 팝업 배경 + 코너 장식
    const popBg = scene.add.graphics();
    popBg.fillStyle(0x0a0806, 0.99);
    popBg.lineStyle(1, 0x6a3a10, 0.9);
    popBg.strokeRect(px, py, pw, ph);
    popBg.fillRect(px, py, pw, ph);
    popBg.lineStyle(1, 0x8a5020, 0.7);
    const cs = 10;
    [[px+4,py+4,1,1],[px+pw-4,py+4,-1,1],[px+4,py+ph-4,1,-1],[px+pw-4,py+ph-4,-1,-1]]
      .forEach(([ox, oy, sx, sy]) => {
        popBg.lineBetween(ox, oy, ox + cs * sx, oy);
        popBg.lineBetween(ox, oy, ox, oy + cs * sy);
      });
    g.add(popBg);

    const pad      = pw * 0.06;
    const contentX = px + pad;
    const contentW = pw - pad * 2;
    let   curY     = py + pad;
    const fs       = n => scaledFontSize(n, scene.scale);

    // ── 초상화 ──────────────────────────────────────────────────
    const portW   = contentW;
    const portH   = parseInt(fs(90));
    const portBox = scene.add.graphics();
    portBox.fillStyle(0x080605, 0.9);
    portBox.lineStyle(1, 0x3a2510, 0.5);
    portBox.strokeRect(contentX, curY, portW, portH);
    portBox.fillRect(contentX, curY, portW, portH);

    const JOB_SHORT = { fisher: 'FISH', diver: 'DIVE', ai: 'A·I' };
    const portIcon  = scene.add.text(contentX + portW / 2, curY + portH / 2,
      JOB_SHORT[char.job] || '???', {
      fontSize: fs(14), fill: '#2a3a44', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    g.add([portBox, portIcon]);

    // HP 바
    const hpBarH  = 14;
    const hpBarY  = curY + portH - hpBarH;
    const hpPct   = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol   = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    const hpBg    = scene.add.graphics();
    hpBg.fillStyle(0x050404, 0.9);
    hpBg.fillRect(contentX, hpBarY, portW, hpBarH);
    const hpFg    = scene.add.graphics();
    hpFg.fillStyle(hpCol, 1);
    hpFg.fillRect(contentX, hpBarY, Math.round(portW * hpPct), hpBarH);
    const hpTxt   = scene.add.text(contentX + portW / 2, hpBarY + hpBarH / 2,
      `HP  ${char.currentHp} / ${char.maxHp}`, {
      fontSize: fs(11), fill: '#d0b060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    g.add([hpBg, hpFg, hpTxt]);
    curY += portH + parseInt(fs(8));

    // ── 이름 ────────────────────────────────────────────────────
    g.add(scene.add.text(contentX, curY, char.name, {
      fontSize: fs(15), fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0));
    curY += parseInt(fs(18));

    // ── 나이 ────────────────────────────────────────────────────
    g.add(scene.add.text(contentX, curY, `나이  ${char.age}세`, {
      fontSize: fs(9), fill: '#5a4020', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(fs(13));

    // ── 직업 (툴팁) ─────────────────────────────────────────────
    const JOB_TIPS = {
      fisher: '낚시꾼 — 수면 탐색 특화. 자원 수집 효율 +20%, 어획물 판별 능력 보유.',
      diver:  '잠수부 — 심해 탐색 특화. 수압 저항, 수중 작업 시간 +30%.',
      ai:     'A.I — 기계 지성체. 연산 속도 탁월, 감정 연산 미탑재.',
    };
    const jobLbl = scene.add.text(contentX, curY, `직업  :  ${char.jobLabel}`, {
      fontSize: fs(10), fill: '#c8802a', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    const jobHit = scene.add.rectangle(contentX, curY + parseInt(fs(7)), jobLbl.width, parseInt(fs(14)), 0, 0)
      .setInteractive({ useHandCursor: false }).setOrigin(0, 0.5);
    jobHit.on('pointerover', (ptr) => this._showTooltip(ptr.x, ptr.y, JOB_TIPS[char.job] || char.jobLabel));
    jobHit.on('pointermove', (ptr) => this._moveTooltip(ptr.x, ptr.y));
    jobHit.on('pointerout',  ()    => this._hideTooltip());
    g.add([jobLbl, jobHit]);
    curY += parseInt(fs(16));

    // ── Cog 등급 ────────────────────────────────────────────────
    const cogBg = scene.add.graphics();
    cogBg.fillStyle(0x0e0b07, 1);
    cogBg.lineStyle(1, 0x4a2a10, 0.8);
    cogBg.strokeRect(contentX, curY, contentW, parseInt(fs(28)));
    cogBg.fillRect(contentX, curY, contentW, parseInt(fs(28)));
    g.add([cogBg, scene.add.text(contentX + contentW / 2, curY + parseInt(fs(14)),
      `◈  Cog  ${char.cog}  ◈`, {
      fontSize: fs(14), fill: '#e8c040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5)]);
    curY += parseInt(fs(34));

    // ── 구분선 ──────────────────────────────────────────────────
    const makeSep = (yy) => {
      const s = scene.add.graphics();
      s.lineStyle(1, 0x2a1a08, 0.9);
      s.lineBetween(px + pad / 2, yy, px + pw - pad / 2, yy);
      g.add(s);
    };
    makeSep(curY);
    curY += parseInt(fs(6));

    // ── 스탯 블록 ───────────────────────────────────────────────
    g.add(scene.add.text(contentX, curY, '[ 스  탯 ]', {
      fontSize: fs(10), fill: '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(fs(14));

    const STAT_DEFS = [
      { key: '체력', val: char.stats.hp,      tip: '체력 — 최대 HP에 직접 영향. 높을수록 오래 버팁니다.' },
      { key: '건강', val: char.stats.health,  tip: '건강 — 상태이상 저항 및 자연 회복 속도에 영향.' },
      { key: '공격', val: char.stats.attack,  tip: '공격 — 기본 전투 피해량 계수. 무기 보정과 곱연산.' },
      { key: '민첩', val: char.stats.agility, tip: '민첩 — 행동 순서와 회피율에 영향. 높을수록 선공 확률 증가.' },
      { key: '행운', val: char.stats.luck,    tip: '행운 — 아이템 드롭, 크리티컬 확률, 이벤트 결과에 영향.' },
    ];
    const rowH   = parseInt(fs(17));
    const statBH = STAT_DEFS.length * rowH + parseInt(fs(6));
    const statBg = scene.add.graphics();
    statBg.fillStyle(0x0e0b07, 1);
    statBg.lineStyle(1, 0x2a1a08, 0.7);
    statBg.strokeRect(contentX, curY, contentW, statBH);
    statBg.fillRect(contentX, curY, contentW, statBH);
    g.add(statBg);
    curY += parseInt(fs(3));

    STAT_DEFS.forEach(({ key, val, tip }) => {
      const rowY    = curY;
      const statT   = scene.add.text(contentX + 8, rowY, `${key.padEnd(2, '　')}   ${val}`, {
        fontSize: fs(12), fill: '#c8a060', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0);
      const statHit = scene.add.rectangle(contentX + 4, rowY + rowH / 2, contentW - 8, rowH, 0, 0)
        .setInteractive({ useHandCursor: false }).setOrigin(0, 0.5);
      statHit.on('pointerover', (ptr) => this._showTooltip(ptr.x, ptr.y, tip));
      statHit.on('pointermove', (ptr) => this._moveTooltip(ptr.x, ptr.y));
      statHit.on('pointerout',  ()    => this._hideTooltip());
      g.add([statT, statHit]);
      curY += rowH;
    });
    curY += parseInt(fs(8));

    makeSep(curY);
    curY += parseInt(fs(6));

    // ── 패시브 / 스킬 박스 ──────────────────────────────────────
    const makeBox = (titleStr, bodyStr, yy) => {
      const bh   = parseInt(fs(40));
      const boxG = scene.add.graphics();
      boxG.fillStyle(0x0e0b07, 1);
      boxG.lineStyle(1, 0x3a2010, 0.7);
      boxG.strokeRect(contentX, yy, contentW, bh);
      boxG.fillRect(contentX, yy, contentW, bh);
      g.add([boxG,
        scene.add.text(contentX + 6, yy + 4, titleStr, {
          fontSize: fs(8), fill: '#5a3818', fontFamily: FontManager.MONO,
        }).setOrigin(0, 0),
        scene.add.text(contentX + 6, yy + 4 + parseInt(fs(11)), bodyStr, {
          fontSize: fs(10), fill: '#c8a060', fontFamily: FontManager.TITLE,
          wordWrap: { width: contentW - 12 },
        }).setOrigin(0, 0),
      ]);
      return yy + bh + 6;
    };
    curY = makeBox('PASSIVE', char.passive, curY);
    curY = makeBox('SKILL',   char.skill,   curY);

    // ── 하단 버튼 ────────────────────────────────────────────────
    const missing  = char.maxHp - char.currentHp;
    const healCost = Math.ceil(missing * 0.5);
    const btnH2    = parseInt(fs(26));
    const btnY2    = py + ph - btnH2 - parseInt(fs(10));
    const btnW2    = (contentW - pad) / 2;

    if (missing > 0) {
      const healBg  = scene.add.graphics();
      const healTxt = scene.add.text(contentX + btnW2 / 2, btnY2 + btnH2 / 2,
        `회복  (${healCost} Arc)`, {
        fontSize: fs(9), fill: '#6a9060', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      const healHit = scene.add.rectangle(contentX + btnW2 / 2, btnY2 + btnH2 / 2, btnW2, btnH2, 0, 0)
        .setInteractive({ useHandCursor: true });
      this._drawBtn(healBg, contentX, btnY2, btnW2, btnH2, false);
      healHit.on('pointerover', () => this._drawBtn(healBg, contentX, btnY2, btnW2, btnH2, false, true));
      healHit.on('pointerout',  () => this._drawBtn(healBg, contentX, btnY2, btnW2, btnH2, false, false));
      healHit.on('pointerup',   () => this._doHeal(char, healCost));
      g.add([healBg, healTxt, healHit]);
    }

    const closeX   = contentX + btnW2 + pad;
    const closeBg  = scene.add.graphics();
    const closeTxt = scene.add.text(closeX + btnW2 / 2, btnY2 + btnH2 / 2, '닫  기', {
      fontSize: fs(9), fill: '#8a3820', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    const closeHit = scene.add.rectangle(closeX + btnW2 / 2, btnY2 + btnH2 / 2, btnW2, btnH2, 0, 0)
      .setInteractive({ useHandCursor: true });
    this._drawBtn(closeBg, closeX, btnY2, btnW2, btnH2, true);
    closeHit.on('pointerover', () => this._drawBtn(closeBg, closeX, btnY2, btnW2, btnH2, true, true));
    closeHit.on('pointerout',  () => this._drawBtn(closeBg, closeX, btnY2, btnW2, btnH2, true, false));
    closeHit.on('pointerup',   () => this._closePopup());
    g.add([closeBg, closeTxt, closeHit]);
  },

});
