// ================================================================
//  DiveScene.js
//  경로: Games/Codes/Scenes/DiveScene.js
//
//  역할: 탐사 로비 — 라운드 슬롯 + 탐사 현황 패널
//    - BattleReadyScene에서 cogMax + battleParty 전달받아 진입
//    - 중앙: 라운드 슬롯머신 (수동 스핀, 3칸 중 1칸 선택)
//    - 좌측 패널: 심해화폐 / 가방(획득 아이템) / 기록지 / 파티 상태
//    - 슬롯 결과: 일반전 / 웨이브전 / 레이드전
//    - 전투 종료 후 승리 시 이 씬으로 복귀 (round + 1)
//    - 최대 라운드 도달 or 철수 → AtelierScene
//
//  진입 데이터:
//    {
//      cogMax:      number,    // 탐사 코그 상한
//      battleParty: string[],  // 전투 참여 캐릭터 id 배열
//      round:       number,    // 현재 라운드 (1~)
//      maxRound:    number,    // 최대 라운드 (기본 5)
//      deepCoin:    number,    // 심해화폐 (재굴림 소모)
//      log:         object[],  // 탐사 기록지 [{round, type, result, note}]
//    }
//
//  슬롯 전투 유형:
//    'normal' — 일반전  (랜덤 이형, 일반 등장 수)
//    'wave'   — 웨이브전 (침수자 강제 or 다수 등장, spawnCount 상한 부스트)
//    'raid'   — 레이드전 (적 1마리 강제, 스탯 ×2.5 보스 보정)
//
//  TODO:
//    - 황금 코인 아이템으로 슬롯 보정 (좋은 이벤트 유도)
//    - 음식 시스템 — 소모 시 maxRound 연장 가능
//    - 가방 탭 — 획득 아이템 목록 실제 연동
//    - 파티 탭 — HP 회복 / 전투불능 상태 표시
//    - 심해화폐 재굴림 — 소모량 밸런스 확정 후 적용
// ================================================================

// ── 슬롯 카드 정의 ────────────────────────────────────────────────
const DIVE_SLOT_CARDS = [
  {
    type:        'normal',
    label:       '일  반  전',
    desc:        '무작위 이형이 출현한다',
    color:       '#8a9060',
    borderHex:   0x505828,
    borderColor: '#505828',
    weight:      5,
  },
  {
    type:        'wave',
    label:       '웨  이  브',
    desc:        '다수의 이형이 떼를 지어 몰려온다',
    color:       '#406090',
    borderHex:   0x284868,
    borderColor: '#284868',
    weight:      3,
  },
  {
    type:        'raid',
    label:       '레  이  드',
    desc:        '강대한 이형 하나가 단독으로 나타난다',
    color:       '#904030',
    borderHex:   0x682818,
    borderColor: '#682818',
    weight:      2,
  },
];

function _drawDiveCard() {
  const total = DIVE_SLOT_CARDS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const card of DIVE_SLOT_CARDS) {
    r -= card.weight;
    if (r <= 0) return card;
  }
  return DIVE_SLOT_CARDS[0];
}

function _makeDiveStrip(count) {
  return Array.from({ length: count }, () => _drawDiveCard());
}

// ================================================================
class DiveScene extends Phaser.Scene {
  constructor() { super({ key: 'DiveScene' }); }

  // ── 진입 데이터 ──────────────────────────────────────────────────
  init(data) {
    this._cogMax      = data.cogMax      || 1;
    this._battleParty = data.battleParty || [];
    this._round       = data.round       || 1;
    this._maxRound    = data.maxRound    || 5;
    this._deepCoin    = data.deepCoin    || 0;
    this._log         = data.log         || [];   // 탐사 기록지
    this._sceneHits   = [];
  }

  // ── 씬 생성 ──────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    this._phase      = 'idle';    // 'idle' | 'spinning' | 'stopped' | 'chosen'
    this._results    = [null, null, null];
    this._chosen     = -1;
    this._canChoose  = false;
    this._slots      = [];

    this._buildBackground(W, H);
    this._buildLeftPanel(W, H);
    this._buildCenterSlot(W, H);
    this._buildSpinButton(W, H);

    // 라운드 최대치 도달 시 바로 철수 처리
    if (this._round > this._maxRound) {
      this.time.delayedCall(300, () => this._exitExpedition());
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  배경
  // ════════════════════════════════════════════════════════════════
  _buildBackground(W, H) {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      scan.lineStyle(1, 0x1a0e06, 0.15);
      scan.lineBetween(0, y, W, y);
    }
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    grid.lineStyle(1, 0x0f0a05, 0.45);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);

    this.add.text(W / 2, H / 2, 'DIVE', {
      fontSize:   FontManager.adjustedSize(110, this.scale),
      fill:       '#0a0705',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.07);
  }

  // ════════════════════════════════════════════════════════════════
  //  좌측 패널 (심해화폐 · 가방 · 기록지 · 파티)
  // ════════════════════════════════════════════════════════════════
  _buildLeftPanel(W, H) {
    const fs     = n => FontManager.adjustedSize(n, this.scale);
    const panelW = W * 0.22;
    const panelH = H * 0.88;
    const panelX = W * 0.015;
    const panelY = H * 0.06;

    // 패널 외곽
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0807, 0.85);
    panelBg.lineStyle(1, 0x2a1a0a, 0.9);
    panelBg.fillRect(panelX, panelY, panelW, panelH);
    panelBg.strokeRect(panelX, panelY, panelW, panelH);

    const cx = panelX + panelW / 2;
    let   y  = panelY + panelH * 0.04;

    // ── 탐사 정보 헤더 ────────────────────────────────────────────
    this.add.text(cx, y, `DIVE  —  COG ${this._cogMax}`, {
      fontSize: fs(11), fill: '#3a2010', fontFamily: FontManager.MONO, letterSpacing: 2,
    }).setOrigin(0.5);
    y += parseInt(fs(16));

    this.add.text(cx, y, `라운드  ${this._round} / ${this._maxRound}`, {
      fontSize: fs(14), fill: '#a05018', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    y += parseInt(fs(20));

    // 구분선
    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.7);
    lg.lineBetween(panelX + 8, y, panelX + panelW - 8, y);
    y += parseInt(fs(10));

    // ── 심해화폐 ──────────────────────────────────────────────────
    this.add.text(panelX + 10, y, '◈ 심해화폐', {
      fontSize: fs(10), fill: '#2a3a50', fontFamily: FontManager.MONO,
    });
    this._deepCoinTxt = this.add.text(panelX + panelW - 10, y, `${this._deepCoin}`, {
      fontSize: fs(12), fill: '#4a7ab0', fontFamily: FontManager.MONO,
    }).setOrigin(1, 0);
    y += parseInt(fs(18));

    // 구분선
    const lg2 = this.add.graphics();
    lg2.lineStyle(1, 0x1e1008, 0.5);
    lg2.lineBetween(panelX + 8, y, panelX + panelW - 8, y);
    y += parseInt(fs(8));

    // ── 가방 (획득 아이템 — 추후 연동) ───────────────────────────
    this.add.text(panelX + 10, y, '▣ 가방', {
      fontSize: fs(10), fill: '#3a2a10', fontFamily: FontManager.MONO,
    });
    y += parseInt(fs(15));
    this.add.text(panelX + 14, y, '(아이템 없음)', {
      fontSize: fs(9), fill: '#1e1408', fontFamily: FontManager.MONO,
    });
    y += parseInt(fs(18));

    // 구분선
    const lg3 = this.add.graphics();
    lg3.lineStyle(1, 0x1e1008, 0.5);
    lg3.lineBetween(panelX + 8, y, panelX + panelW - 8, y);
    y += parseInt(fs(8));

    // ── 기록지 ────────────────────────────────────────────────────
    this.add.text(panelX + 10, y, '◉ 기록지', {
      fontSize: fs(10), fill: '#3a2a10', fontFamily: FontManager.MONO,
    });
    y += parseInt(fs(15));

    const logAreaH = panelH * 0.28;
    const logClip  = this.add.graphics();
    logClip.fillRect(panelX + 4, y, panelW - 8, logAreaH);
    const logMask = logClip.createGeometryMask();

    const logLines = this._log.length
      ? this._log.slice(-8).reverse()
      : [{ note: '기록 없음' }];

    logLines.forEach((entry, i) => {
      const txt = entry.note || `R${entry.round} ${entry.type || ''} — ${entry.result || ''}`;
      const col = entry.result === 'defeat' ? '#5a2010'
                : entry.result === 'victory' ? '#305020'
                : '#2a1a08';
      this.add.text(panelX + 12, y + i * parseInt(fs(13)), txt, {
        fontSize: fs(9), fill: col, fontFamily: FontManager.MONO,
        wordWrap: { width: panelW - 24 },
      }).setMask(logMask);
    });
    y += logAreaH + parseInt(fs(8));

    // 구분선
    const lg4 = this.add.graphics();
    lg4.lineStyle(1, 0x1e1008, 0.5);
    lg4.lineBetween(panelX + 8, y, panelX + panelW - 8, y);
    y += parseInt(fs(8));

    // ── 파티 상태 ─────────────────────────────────────────────────
    this.add.text(panelX + 10, y, '▷ 파티', {
      fontSize: fs(10), fill: '#3a2a10', fontFamily: FontManager.MONO,
    });
    y += parseInt(fs(15));

    const allChars = CharacterManager.loadAll() || [];
    this._battleParty.forEach(id => {
      const c = allChars.find(ch => ch.id === id);
      if (!c) return;
      const hpPct  = c.maxHp > 0 ? c.currentHp / c.maxHp : 0;
      const hpCol  = hpPct > 0.6 ? '#306030' : hpPct > 0.3 ? '#806020' : '#802020';
      const dead   = c.currentHp <= 0;
      const nameC  = dead ? '#5a2222' : '#a09080';
      this.add.text(panelX + 12, y, `${c.name}`, {
        fontSize: fs(9), fill: nameC, fontFamily: FontManager.MONO,
      });
      if (!dead) {
        const barW  = panelW - 24;
        const barH  = Math.max(3, Math.round(H * 0.008));
        const barY  = y + parseInt(fs(11));
        const barBg = this.add.graphics();
        barBg.fillStyle(0x1a0a06, 1);
        barBg.fillRect(panelX + 12, barY, barW, barH);
        const barFg = this.add.graphics();
        barFg.fillStyle(Phaser.Display.Color.HexStringToColor(hpCol).color, 1);
        barFg.fillRect(panelX + 12, barY, Math.round(barW * hpPct), barH);
        y += parseInt(fs(9)) + barH + parseInt(fs(5));
      } else {
        this.add.text(panelX + 14, y + parseInt(fs(10)), '전투불능', {
          fontSize: fs(8), fill: '#5a2222', fontFamily: FontManager.MONO,
        });
        y += parseInt(fs(22));
      }
    });

    // ── 철수 버튼 ─────────────────────────────────────────────────
    const exitY  = panelY + panelH - parseInt(fs(28));
    const exitBg = this.add.graphics();
    const drawExit = (hover) => {
      exitBg.clear();
      exitBg.fillStyle(hover ? 0x1a0a06 : 0x0e0704, 1);
      exitBg.lineStyle(1, hover ? 0x804020 : 0x3a1a0a, 0.9);
      exitBg.fillRect(panelX + 8, exitY, panelW - 16, parseInt(fs(22)));
      exitBg.strokeRect(panelX + 8, exitY, panelW - 16, parseInt(fs(22)));
    };
    drawExit(false);
    const exitTxt = this.add.text(cx, exitY + parseInt(fs(11)), '철  수', {
      fontSize: fs(12), fill: '#5a3010', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    const exitHit = this.add.rectangle(cx, exitY + parseInt(fs(11)), panelW - 16, parseInt(fs(22)), 0, 0)
      .setInteractive({ useHandCursor: true });
    exitHit.on('pointerover', () => { drawExit(true); exitTxt.setStyle({ fill: '#c06030' }); });
    exitHit.on('pointerout',  () => { drawExit(false); exitTxt.setStyle({ fill: '#5a3010' }); });
    exitHit.on('pointerup',   () => this._exitExpedition());
    this._sceneHits.push(exitHit);
  }

  // ════════════════════════════════════════════════════════════════
  //  중앙 슬롯머신
  // ════════════════════════════════════════════════════════════════
  _buildCenterSlot(W, H) {
    const fs = n => FontManager.adjustedSize(n, this.scale);

    // 헤더
    this.add.text(W * 0.61, H * 0.07, '라운드  선택', {
      fontSize: fs(24), fill: '#6b4020', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    this.add.text(W * 0.61, H * 0.07 + parseInt(fs(26)), `ROUND  ${this._round}  —  SELECT ENCOUNTER`, {
      fontSize: fs(10), fill: '#2a1508', fontFamily: FontManager.MONO, letterSpacing: 3,
    }).setOrigin(0.5);

    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x2a1a0a, 0.7);
    lineG.lineBetween(W * 0.27, H * 0.16, W * 0.97, H * 0.16);

    this._hintText = this.add.text(W * 0.61, H * 0.20, '슬롯을 돌려 라운드를 결정하십시오', {
      fontSize: fs(12), fill: '#2a1508', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    // 슬롯 3칸
    const cardW  = W * 0.19;
    const cardH  = H * 0.58;
    const cardY  = H * 0.545;
    const gap    = W * 0.022;
    const totalW = cardW * 3 + gap * 2;
    const startX = W * 0.27 + (W * 0.70 - totalW) / 2;

    this._slots = [];
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + gap) + cardW / 2;
      this._slots.push(this._buildOneSlot(cx, cardY, cardW, cardH, i));
    }
  }

  _buildOneSlot(cx, cy, cw, ch, idx) {
    const frame = this.add.graphics();
    frame.lineStyle(1, 0x2a1a0a, 0.6);
    frame.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);

    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    const mask = maskShape.createGeometryMask();

    const strip   = _makeDiveStrip(22);
    const stripCt = this.add.container(cx, cy - ch / 2);
    stripCt.setMask(mask);

    // 카드 렌더
    strip.forEach((card, j) => {
      const cardY = j * ch;
      const bg = this.add.graphics();
      bg.fillStyle(0x0e0c08, 1);
      bg.lineStyle(1, card.borderHex, 0.5);
      bg.fillRect(-cw / 2, cardY, cw, ch);
      bg.strokeRect(-cw / 2, cardY, cw, ch);

      // 유형명 크게
      const mainTxt = this.add.text(0, cardY + ch * 0.38, card.label, {
        fontSize: FontManager.adjustedSize(16, this.scale),
        fill: card.color, fontFamily: FontManager.TITLE,
        align: 'center', wordWrap: { width: cw * 0.85 },
      }).setOrigin(0.5, 0.5);

      // 설명 한 줄
      const descTxt = this.add.text(0, cardY + ch * 0.62, card.desc, {
        fontSize: FontManager.adjustedSize(9, this.scale),
        fill: card.color, fontFamily: FontManager.MONO,
        alpha: 0.7, align: 'center', wordWrap: { width: cw * 0.82 },
      }).setOrigin(0.5, 0.5);

      stripCt.add([bg, mainTxt, descTxt]);
    });

    // hit area (선택용 — 슬롯 정지 후 활성화)
    const hitArea = this.add.rectangle(cx, cy, cw, ch, 0, 0).setDepth(5);

    return { frame, stripCt, mask, strip, cx, cy, cw, ch, stopped: false, targetCard: null, hitArea };
  }

  // ════════════════════════════════════════════════════════════════
  //  스핀 버튼
  // ════════════════════════════════════════════════════════════════
  _buildSpinButton(W, H) {
    const fs   = n => FontManager.adjustedSize(n, this.scale);
    const btnX = W * 0.61;
    const btnY = H * 0.91;
    const btnW = Math.round(W * 0.22);
    const btnH = Math.round(H * 0.055);

    this._spinBtnBg  = this.add.graphics();
    this._spinBtnTxt = this.add.text(btnX, btnY, '▶  슬롯  돌리기', {
      fontSize: fs(16), fill: '#80c080', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const drawSpin = (state) => {
      this._spinBtnBg.clear();
      if (state === 'disabled') {
        this._spinBtnBg.fillStyle(0x080a08, 1);
        this._spinBtnBg.lineStyle(1, 0x1a2a1a, 0.5);
      } else if (state === 'hover') {
        this._spinBtnBg.fillStyle(0x1a2a1a, 1);
        this._spinBtnBg.lineStyle(2, 0x60c060, 1);
      } else {
        this._spinBtnBg.fillStyle(0x0e180e, 1);
        this._spinBtnBg.lineStyle(2, 0x308030, 0.9);
      }
      this._spinBtnBg.fillRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH);
      this._spinBtnBg.strokeRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH);
    };
    this._drawSpinBtn = drawSpin;
    drawSpin('normal');

    const hit = this.add.rectangle(btnX, btnY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(10);
    this._spinHit = hit;

    hit.on('pointerover', () => { if (this._phase === 'idle') drawSpin('hover'); });
    hit.on('pointerout',  () => { if (this._phase === 'idle') drawSpin('normal'); });
    hit.on('pointerdown', () => { if (this._phase === 'idle') drawSpin('down'); });
    hit.on('pointerup',   () => {
      if (this._phase !== 'idle') return;
      this._startSpin();
    });
    this._sceneHits.push(hit);

    // ── 재굴림 버튼 (슬롯 정지 후 표시, 심해화폐 소모) ───────────
    const rerollX = W * 0.61;
    const rerollY = btnY + btnH * 1.5;
    this._rerollBg  = this.add.graphics().setAlpha(0);
    this._rerollTxt = this.add.text(rerollX, rerollY, '◈ 재굴림  (심해화폐 1)', {
      fontSize: fs(10), fill: '#2a3a50', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0);

    const rerollHit = this.add.rectangle(rerollX, rerollY, W * 0.20, btnH * 0.7, 0, 0)
      .setDepth(10).setAlpha(0);
    this._rerollHit = rerollHit;

    rerollHit.on('pointerover', () => {
      this._rerollTxt.setStyle({ fill: '#6ab0e0' });
    });
    rerollHit.on('pointerout', () => {
      this._rerollTxt.setStyle({ fill: '#2a3a50' });
    });
    rerollHit.on('pointerup', () => {
      if (this._deepCoin < 1) return;
      this._deepCoin -= 1;
      if (this._deepCoinTxt) this._deepCoinTxt.setText(`${this._deepCoin}`);
      this._resetSlots();
      this._startSpin();
    });
    this._sceneHits.push(rerollHit);
  }

  // ════════════════════════════════════════════════════════════════
  //  슬롯 스핀 로직
  // ════════════════════════════════════════════════════════════════
  _startSpin() {
    this._phase     = 'spinning';
    this._results   = [null, null, null];
    this._chosen    = -1;
    this._canChoose = false;

    this._drawSpinBtn('disabled');
    this._spinHit.disableInteractive();
    this._hintText.setText('라운드를 결정하는 중...');
    this._hintText.setStyle({ fill: '#2a1508' });

    // 재굴림 버튼 숨김
    this._rerollBg.setAlpha(0);
    this._rerollTxt.setAlpha(0);
    this._rerollHit.setAlpha(0).disableInteractive();

    const stopDelays = [1400, 2200, 3000];
    this._slots.forEach((slot, i) => {
      const totalItems   = slot.strip.length;
      const finalCardIdx = totalItems - 2;
      slot.targetCard    = slot.strip[finalCardIdx];
      slot.stopped       = false;
      const spinDist     = slot.ch * (totalItems - 2);

      // 초기 위치 리셋
      slot.stripCt.setY(slot.cy - slot.ch / 2);

      this.tweens.add({
        targets:  slot.stripCt,
        y:        slot.cy - slot.ch / 2 - spinDist,
        duration: stopDelays[i] + 600,
        ease:     'Cubic.easeOut',
        onComplete: () => {
          slot.stopped = true;
          this._results[i] = slot.targetCard;
          this._onSlotStopped(i);
        },
      });
    });

    // 로딩 도트 애니
    let dotCount = 0;
    this._spinTimer = this.time.addEvent({
      delay: 400, loop: true,
      callback: () => {
        this._hintText.setText('라운드를 결정하는 중  ' + ['·', '· ·', '· · ·'][dotCount++ % 3]);
      },
    });
  }

  _onSlotStopped(idx) {
    const slot = this._slots[idx];
    // 테두리 강조
    slot.frame.clear();
    slot.frame.lineStyle(2, slot.targetCard.borderHex, 1);
    slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);

    if (!this._slots.every(s => s.stopped)) return;

    // 전체 정지
    if (this._spinTimer) this._spinTimer.remove();
    this._phase     = 'stopped';
    this._canChoose = true;

    this._hintText.setText('라운드 유형을 선택하십시오');
    this._hintText.setStyle({ fill: '#8a6040' });

    // 재굴림 버튼 표시 (심해화폐 있을 때)
    if (this._deepCoin > 0) {
      this._rerollBg.setAlpha(1);
      this._rerollTxt.setAlpha(1).setText(`◈ 재굴림  (심해화폐 ${this._deepCoin})`);
      this._rerollHit.setAlpha(1).setInteractive({ useHandCursor: true });
    }

    this._enableCardSelection();
  }

  _enableCardSelection() {
    this._slots.forEach((slot, i) => {
      const hit = slot.hitArea;
      hit.setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (this._chosen >= 0) return;
        slot.frame.clear();
        slot.frame.lineStyle(2, slot.targetCard.borderHex, 1);
        slot.frame.fillStyle(0x140c05, 0.3);
        slot.frame.fillRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
        slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      });
      hit.on('pointerout', () => {
        if (this._chosen >= 0) return;
        slot.frame.clear();
        slot.frame.lineStyle(2, slot.targetCard.borderHex, 1);
        slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      });
      hit.on('pointerdown', () => {
        if (!this._canChoose || this._chosen >= 0) return;
        this._chooseCard(i);
      });
    });
  }

  _chooseCard(idx) {
    this._chosen    = idx;
    this._canChoose = false;
    this._phase     = 'chosen';

    // 재굴림 숨김
    this._rerollBg.setAlpha(0);
    this._rerollTxt.setAlpha(0);
    this._rerollHit.disableInteractive().setAlpha(0);

    // 선택 카드 강조
    const chosen = this._slots[idx];
    chosen.frame.clear();
    chosen.frame.lineStyle(3, chosen.targetCard.borderHex, 1);
    chosen.frame.fillStyle(0x1e1008, 0.4);
    chosen.frame.fillRect(chosen.cx - chosen.cw / 2, chosen.cy - chosen.ch / 2, chosen.cw, chosen.ch);
    chosen.frame.strokeRect(chosen.cx - chosen.cw / 2, chosen.cy - chosen.ch / 2, chosen.cw, chosen.ch);

    // 미선택 카드 dim
    this._slots.forEach((slot, i) => {
      if (i === idx) return;
      slot.frame.clear();
      slot.frame.lineStyle(1, 0x1a1008, 0.3);
      slot.frame.fillStyle(0x000000, 0.55);
      slot.frame.fillRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      slot.hitArea.disableInteractive();
    });

    const card = chosen.targetCard;
    this._hintText.setText(`${card.label.replace(/\s/g, '')}  —  전투 시작`);
    this._hintText.setStyle({ fill: card.color });

    // 기록지 추가
    this._log.push({ round: this._round, type: card.type, result: 'pending', note: `R${this._round} ${card.label.replace(/\s/g, '')}` });

    this.time.delayedCall(800, () => this._enterBattle(card.type));
  }

  // ════════════════════════════════════════════════════════════════
  //  씬 전환
  // ════════════════════════════════════════════════════════════════
  _enterBattle(battleType) {
    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 350, ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.start('BattleReadyScene', {
          cogMax:      this._cogMax,
          battleParty: this._battleParty,
          round:       this._round,
          battleType:  battleType,   // ← BattleScene으로 전달
          maxRound:    this._maxRound,
          deepCoin:    this._deepCoin,
          log:         this._log,
        });
      },
    });
  }

  _exitExpedition() {
    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 400, ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.start('AtelierScene');
      },
    });
  }

  // ── 슬롯 리셋 (재굴림용) ─────────────────────────────────────────
  _resetSlots() {
    this._slots.forEach(slot => {
      slot.stopped = false;
      const newStrip = _makeDiveStrip(22);
      slot.strip = newStrip;
      // 스트립 컨테이너 자식 재생성
      slot.stripCt.removeAll(true);
      const { cw, ch } = slot;
      newStrip.forEach((card, j) => {
        const cardY = j * ch;
        const bg = this.add.graphics();
        bg.fillStyle(0x0e0c08, 1);
        bg.lineStyle(1, card.borderHex, 0.5);
        bg.fillRect(-cw / 2, cardY, cw, ch);
        bg.strokeRect(-cw / 2, cardY, cw, ch);
        const mainTxt = this.add.text(0, cardY + ch * 0.38, card.label, {
          fontSize: FontManager.adjustedSize(16, this.scale),
          fill: card.color, fontFamily: FontManager.TITLE,
          align: 'center', wordWrap: { width: cw * 0.85 },
        }).setOrigin(0.5, 0.5);
        const descTxt = this.add.text(0, cardY + ch * 0.62, card.desc, {
          fontSize: FontManager.adjustedSize(9, this.scale),
          fill: card.color, fontFamily: FontManager.MONO,
          alpha: 0.7, align: 'center', wordWrap: { width: cw * 0.82 },
        }).setOrigin(0.5, 0.5);
        slot.stripCt.add([bg, mainTxt, descTxt]);
      });
      slot.frame.clear();
      slot.frame.lineStyle(1, 0x2a1a0a, 0.6);
      slot.frame.strokeRect(slot.cx - cw / 2, slot.cy - ch / 2, cw, ch);
      slot.hitArea.disableInteractive();
    });
    this._phase = 'idle';
    this._drawSpinBtn('normal');
    this._spinHit.setInteractive({ useHandCursor: true });
  }

  // ── 씬 정리 ──────────────────────────────────────────────────────
  shutdown() {
    if (this._spinTimer) this._spinTimer.remove();
    this._sceneHits.forEach(h => { try { h.destroy(); } catch(e) {} });
    this._sceneHits = [];
  }
}
