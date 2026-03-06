// ================================================================
//  Tab_Manage_Popup.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Manage_Popup.js
//
//  역할: 관리 탭 — 캐릭터 프로필 팝업 UI
//  의존: Tab_Manage.js (prototype 확장), Tab_Manage_Utils.js
// ================================================================

Object.assign(Tab_Manage.prototype, {

  _openPopup(char) {
    this._closePopup();
    this._openCharId = char.id;

    const { scene, W, H } = this;
    const pw = W * 0.34;
    const ph = H * 0.82;
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

    // ── 패시브 박스 (폰트 크게 + 설명) ─────────────────────────
    const PASSIVE_DESC = {
      '윗칸 타격':        '자신의 바로 위 칸에 있는 적을 공격합니다.',
      '앞칸 타격':        '자신의 바로 앞 칸에 있는 적을 공격합니다.',
      '현재 칸 타격':     '자신이 위치한 칸의 적을 공격합니다.',
      '대각 타격':        '대각선 방향의 칸에 있는 적을 공격합니다.',
      '전열 전체 타격':   '앞쪽 세 칸 전체의 적을 동시에 공격합니다.',
      '후열 타격':        '자신의 뒤쪽 칸에 있는 적을 공격합니다.',
      '전/후열 동시 타격':'앞열과 뒷열 양쪽을 동시에 공격합니다.',
      '전체 칸 타격':     '배치판의 모든 칸에 있는 적을 공격합니다.',
    };
    const SKILL_DESC = {
      '기본 일격':    '기본 공격력으로 단일 대상을 타격합니다.',
      '빠른 찌르기':  '공격 속도가 증가하여 빠르게 단일 대상을 찌릅니다.',
      '연속 타격':    '같은 대상을 2회 연속으로 타격합니다.',
      '방어 자세':    '일정 시간 동안 받는 피해를 20% 감소시킵니다.',
      '강타':         '공격력의 150%로 단일 대상을 강하게 타격합니다.',
      '회피 기동':    '다음 공격을 1회 회피할 확률이 크게 증가합니다.',
      '독 도포':      '대상에게 독을 부여해 지속 피해를 입힙니다.',
      '광역 타격':    '인접한 모든 적에게 피해를 입힙니다.',
      '강화 독':      '더욱 강력한 독을 부여해 큰 지속 피해를 입힙니다.',
      '순간 가속':    '민첩이 일시적으로 크게 상승합니다.',
      '폭발 타격':    '공격력의 200%로 단일 대상을 폭발적으로 타격합니다.',
      '전방 스캔':    '앞열 전체의 적 정보를 스캔하고 약점을 파악합니다.',
      '철갑 관통':    '방어를 무시하고 순수 공격력으로 타격합니다.',
      '심해 압박':    '수압으로 대상의 이동 속도와 공격력을 감소시킵니다.',
      '전기 충격':    '전기 충격으로 대상을 잠시 경직시키고 피해를 입힙니다.',
      '철벽 방어':    '받는 피해를 50% 감소시키는 강력한 방어 태세를 취합니다.',
      '코어 오버로드':'자신의 코어를 과부하시켜 극대 피해를 입히지만 HP가 감소합니다.',
      '심연의 포효':  '주변 모든 적에게 공포를 부여하고 대미지를 입힙니다.',
    };

    const makeBox = (titleStr, nameStr, descStr, yy) => {
      const nameH = parseInt(fs(18));
      const descH = parseInt(fs(13));
      const bh    = parseInt(fs(10)) + nameH + descH + parseInt(fs(10));
      const boxG  = scene.add.graphics();
      boxG.fillStyle(0x0e0b07, 1);
      boxG.lineStyle(1, 0x3a2010, 0.7);
      boxG.strokeRect(contentX, yy, contentW, bh);
      boxG.fillRect(contentX, yy, contentW, bh);

      const titleT = scene.add.text(contentX + 6, yy + 5, titleStr, {
        fontSize: fs(9), fill: '#5a3818', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0);

      const nameT = scene.add.text(contentX + 6, yy + 5 + parseInt(fs(12)), nameStr, {
        fontSize: fs(14), fill: '#e8c060', fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0);

      const descT = scene.add.text(contentX + 6, yy + 5 + parseInt(fs(12)) + nameH + 2, descStr || '', {
        fontSize: fs(10), fill: '#7a5830', fontFamily: FontManager.MONO,
        wordWrap: { width: contentW - 12 },
      }).setOrigin(0, 0);

      g.add([boxG, titleT, nameT, descT]);
      return yy + bh + parseInt(fs(6));
    };

    curY = makeBox('PASSIVE', char.passive, PASSIVE_DESC[char.passive] || '', curY);
    curY = makeBox('SKILL',   char.skill,   SKILL_DESC[char.skill]     || '', curY);

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
