// ================================================================
//  Tab_CharProfile.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_CharProfile.js
//
//  역할: 캐릭터 프로필 팝업 — 공용 모듈
//        관리 탭(Tab_Manage)과 탐사대 탭(Tab_Squad) 모두에서 사용
//
//  사용법:
//    CharProfile.open(scene, W, H, char, {
//      onClose:   () => {},            // 닫기 시 호출 (필수)
//      onHeal:    (char, cost) => {},  // 회복 버튼 콜백 (없으면 버튼 미표시)
//      extraBtns: [                    // 추가 하단 버튼 (선택)
//        { label: '마지막 배치 회수', danger: true, onClick: () => {} }
//      ],
//    });
//
//  의존: FontManager, scaledFontSize (utils.js)
// ================================================================

const CharProfile = {

  open(scene, W, H, char, opts = {}) {
    const { onClose, onHeal, extraBtns = [] } = opts;

    // ── 팝업 레이아웃 ─────────────────────────────────────────
    const pw = W * 0.34;
    const ph = H * 0.82;
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;
    const fs = n => scaledFontSize(n, scene.scale);

    // ── 오버레이 ─────────────────────────────────────────────
    const overlay = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55)
      .setOrigin(0).setDepth(400).setInteractive();
    overlay.on('pointerup', () => _close());

    const g = scene.add.container(0, 0).setDepth(401);

    // ── 배경 + 코너 장식 ─────────────────────────────────────
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

    // ── 초상화 ───────────────────────────────────────────────
    const portW  = contentW;
    const portH  = parseInt(fs(90));
    const portBox = scene.add.graphics();
    portBox.fillStyle(0x080605, 0.9);
    portBox.lineStyle(1, 0x3a2510, 0.5);
    portBox.strokeRect(contentX, curY, portW, portH);
    portBox.fillRect(contentX, curY, portW, portH);

    const JOB_SHORT = { fisher: 'FISH', diver: 'DIVE', ai: 'A·I' };
    // 캐릭터 스프라이트 (없으면 직종 텍스트 폴백)
    let portIcon;
    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img = scene.add.image(contentX + portW / 2, curY + portH * 0.38, char.spriteKey)
        .setOrigin(0.5);
      const scale = Math.min(portW / img.width, portH / img.height);
      img.setScale(scale);
      portIcon = img;
    } else {
      portIcon = scene.add.text(contentX + portW / 2, curY + portH / 2,
        JOB_SHORT[char.job] || '???', {
        fontSize: fs(14), fill: '#2a3a44', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
    }
    g.add([portBox, portIcon]);

    // HP 바
    const hpBarH = 14;
    const hpBarY = curY + portH - hpBarH;
    const hpPct  = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol  = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    const hpBg   = scene.add.graphics();
    hpBg.fillStyle(0x050404, 0.9);
    hpBg.fillRect(contentX, hpBarY, portW, hpBarH);
    const hpFg   = scene.add.graphics();
    hpFg.fillStyle(hpCol, 1);
    hpFg.fillRect(contentX, hpBarY, Math.round(portW * hpPct), hpBarH);
    const hpTxt  = scene.add.text(contentX + portW / 2, hpBarY + hpBarH / 2,
      `HP  ${char.currentHp} / ${char.maxHp}`, {
      fontSize: fs(11), fill: '#d0b060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    g.add([hpBg, hpFg, hpTxt]);
    curY += portH + parseInt(fs(8));

    // ── 이름 ─────────────────────────────────────────────────
    g.add(scene.add.text(contentX, curY, char.name, {
      fontSize: fs(15), fill: '#e8c070', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0));
    curY += parseInt(fs(18));

    // ── 나이 ─────────────────────────────────────────────────
    g.add(scene.add.text(contentX, curY, `나이  ${char.age}세`, {
      fontSize: fs(9), fill: '#5a4020', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));
    curY += parseInt(fs(13));

    // ── 직업 (툴팁) ──────────────────────────────────────────
    // 직업 설명 — JobData.js 참조
    const JOB_TIPS = {
      fisher: getJobDescription('fisher'),
      diver:  getJobDescription('diver'),
      ai:     getJobDescription('ai'),
    };
    const jobLbl = scene.add.text(contentX, curY, `직업  :  ${char.jobLabel}`, {
      fontSize: fs(10), fill: '#c8802a', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);

    // 인라인 툴팁
    let _tooltip = null;
    const _showTip = (x, y, text) => {
      _hideTip();
      const tpad = 12, maxW = parseInt(fs(220));
      const txtObj = scene.add.text(0, 0, text, {
        fontSize: fs(13), fill: '#f0e0b0', fontFamily: FontManager.MONO,
        wordWrap: { width: maxW },
      }).setDepth(502);
      const bw = txtObj.width + tpad * 2;
      const bh = txtObj.height + tpad * 2;
      let tx = x + 18, ty = y + 18;
      if (tx + bw > W - 10) tx = x - bw - 10;
      if (ty + bh > H - 10) ty = y - bh - 10;
      const bgObj = scene.add.graphics().setDepth(501);
      bgObj.fillStyle(0x0d0b07, 0.97);
      bgObj.lineStyle(2, 0x9a6020, 1);
      bgObj.strokeRect(tx, ty, bw, bh);
      bgObj.fillRect(tx, ty, bw, bh);
      bgObj.lineStyle(1, 0x3a2010, 0.5);
      bgObj.strokeRect(tx+3, ty+3, bw-6, bh-6);
      txtObj.setPosition(tx + tpad, ty + tpad);
      _tooltip = { bg: bgObj, txt: txtObj };
    };
    const _moveTip = (x, y) => {
      if (!_tooltip) return;
      const { txt, bg } = _tooltip;
      const tpad = 12;
      const bw = txt.width + tpad * 2, bh = txt.height + tpad * 2;
      let tx = x + 18, ty = y + 18;
      if (tx + bw > W - 10) tx = x - bw - 10;
      if (ty + bh > H - 10) ty = y - bh - 10;
      bg.clear();
      bg.fillStyle(0x0d0b07, 0.97);
      bg.lineStyle(2, 0x9a6020, 1);
      bg.strokeRect(tx, ty, bw, bh);
      bg.fillRect(tx, ty, bw, bh);
      bg.lineStyle(1, 0x3a2010, 0.5);
      bg.strokeRect(tx+3, ty+3, bw-6, bh-6);
      txt.setPosition(tx + tpad, ty + tpad);
    };
    const _hideTip = () => {
      if (_tooltip) { _tooltip.bg.destroy(); _tooltip.txt.destroy(); _tooltip = null; }
    };

    const jobHit = scene.add.rectangle(
      contentX, curY + parseInt(fs(7)), jobLbl.width, parseInt(fs(14)), 0, 0
    ).setInteractive({ useHandCursor: false }).setOrigin(0, 0.5).setDepth(402);
    jobHit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, JOB_TIPS[char.job] || char.jobLabel));
    jobHit.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
    jobHit.on('pointerout',  ()    => _hideTip());
    g.add([jobLbl, jobHit]);
    curY += parseInt(fs(16));

    // ── Cog 등급 ─────────────────────────────────────────────
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

    // ── 구분선 헬퍼 ──────────────────────────────────────────
    const makeSep = (yy) => {
      const s = scene.add.graphics();
      s.lineStyle(1, 0x2a1a08, 0.9);
      s.lineBetween(px + pad / 2, yy, px + pw - pad / 2, yy);
      g.add(s);
    };
    makeSep(curY);
    curY += parseInt(fs(6));

    // ── 스탯 블록 ────────────────────────────────────────────
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
      const rowY   = curY;
      const statT  = scene.add.text(contentX + 8, rowY, `${key.padEnd(2, '　')}   ${val}`, {
        fontSize: fs(12), fill: '#c8a060', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0);
      const statHit = scene.add.rectangle(
        contentX + 4, rowY + rowH / 2, contentW - 8, rowH, 0, 0
      ).setInteractive({ useHandCursor: false }).setOrigin(0, 0.5).setDepth(402);
      statHit.on('pointerover', (ptr) => _showTip(ptr.x, ptr.y, tip));
      statHit.on('pointermove', (ptr) => _moveTip(ptr.x, ptr.y));
      statHit.on('pointerout',  ()    => _hideTip());
      g.add([statT, statHit]);
      curY += rowH;
    });
    curY += parseInt(fs(8));

    makeSep(curY);
    curY += parseInt(fs(6));

    // ── 패시브 / 스킬 박스 ───────────────────────────────────
    // 패시브 / 스킬 설명 — PassiveData.js / SkillData.js 참조
    const makeBox = (titleStr, nameStr, descStr, yy) => {
      const nameH2 = parseInt(fs(18));
      const bh     = parseInt(fs(10)) + nameH2 + parseInt(fs(13)) + parseInt(fs(10));
      const boxG   = scene.add.graphics();
      boxG.fillStyle(0x0e0b07, 1);
      boxG.lineStyle(1, 0x3a2010, 0.7);
      boxG.strokeRect(contentX, yy, contentW, bh);
      boxG.fillRect(contentX, yy, contentW, bh);
      g.add(boxG);
      g.add(scene.add.text(contentX + 6, yy + 5, titleStr, {
        fontSize: fs(9), fill: '#5a3818', fontFamily: FontManager.MONO,
      }).setOrigin(0, 0));
      g.add(scene.add.text(contentX + 6, yy + 5 + parseInt(fs(12)), nameStr, {
        fontSize: fs(14), fill: '#e8c060', fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0));
      g.add(scene.add.text(contentX + 6, yy + 5 + parseInt(fs(12)) + nameH2 + 2, descStr || '', {
        fontSize: fs(10), fill: '#7a5830', fontFamily: FontManager.MONO,
        wordWrap: { width: contentW - 12 },
      }).setOrigin(0, 0));
      return yy + bh + parseInt(fs(6));
    };

    curY = makeBox('PASSIVE', char.passive, getPassiveDescription(char.passive), curY);
    curY = makeBox('SKILL',   char.skill,   getSkillDescription(char.skill),     curY);

    // ── 하단 버튼 ────────────────────────────────────────────
    const btnH2   = parseInt(fs(26));
    const btnY2   = py + ph - btnH2 - parseInt(fs(10));
    const missing = char.maxHp - char.currentHp;

    const _drawBtnGfx = (gfx, x, y, w, h, danger, hover = false) => {
      gfx.clear();
      if (danger) {
        gfx.fillStyle(hover ? 0x241010 : 0x180a08, 1);
        gfx.lineStyle(1, hover ? 0x8a3020 : 0x4a2010, 0.9);
      } else {
        gfx.fillStyle(hover ? 0x102010 : 0x0a1208, 1);
        gfx.lineStyle(1, hover ? 0x4a8030 : 0x2a4018, 0.9);
      }
      gfx.strokeRect(x, y, w, h);
      gfx.fillRect(x, y, w, h);
    };

    // 버튼 목록 구성
    const btns = [];
    if (onHeal && missing > 0) {
      const healCost = Math.ceil(missing * 0.5);
      btns.push({
        label:   `회복  (${healCost} Arc)`,
        danger:  false,
        onClick: () => { _close(); onHeal(char, healCost); },
      });
    }
    extraBtns.forEach(b => btns.push(b));
    btns.push({ label: '닫  기', danger: true, onClick: () => _close() });

    const btnCount = btns.length;
    const gap2     = parseInt(fs(8));
    const eachW    = (contentW - gap2 * (btnCount - 1)) / btnCount;

    btns.forEach((b, i) => {
      const bx   = contentX + i * (eachW + gap2);
      const bg2  = scene.add.graphics();
      const txt2 = scene.add.text(bx + eachW / 2, btnY2 + btnH2 / 2, b.label, {
        fontSize: fs(9),
        fill: b.danger ? '#8a3820' : '#6a9060',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      const hit2 = scene.add.rectangle(bx + eachW / 2, btnY2 + btnH2 / 2, eachW, btnH2, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(402);
      _drawBtnGfx(bg2, bx, btnY2, eachW, btnH2, b.danger);
      hit2.on('pointerover', () => _drawBtnGfx(bg2, bx, btnY2, eachW, btnH2, b.danger, true));
      hit2.on('pointerout',  () => _drawBtnGfx(bg2, bx, btnY2, eachW, btnH2, b.danger, false));
      hit2.on('pointerup',   () => b.onClick());
      g.add([bg2, txt2, hit2]);
    });

    // ── 닫기 ─────────────────────────────────────────────────
    function _close() {
      _hideTip();
      overlay.destroy();
      g.destroy();
      if (onClose) onClose();
    }

    // 페이드인
    g.setAlpha(0);
    scene.tweens.add({ targets: g, alpha: 1, duration: 120, ease: 'Sine.easeOut' });
  },
};
