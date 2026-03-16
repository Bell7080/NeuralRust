// ================================================================
//  DiveScene.js
//  경로: Games/Codes/Scenes/DiveScene.js
//
//  역할: 탐사 로비 — 라운드 슬롯 + 탐사 현황
//
//  ── 레이아웃 (기획 이미지 기준) ──────────────────────────────
//
//  ┌──────┬────────────────────────────────────────────────────┐
//  │      │  재화 / 라운드 진행 / 수치 스탯          [상단 패널] │
//  │ 좌측 ├────────────────────────────────────────────────────┤
//  │ 탭   │                                                    │
//  │ 버튼 │   [슬롯1]   [슬롯2]   [슬롯3]   [레버]  [중앙 영역] │
//  │      │                                                    │
//  │ 인벤 │                                                    │
//  │ 파티 ├────────────────────────────────────────────────────┤
//  │ 상점 │  [탭 콘텐츠 패널 — 선택한 탭 내용]       [하단 패널] │
//  │ 일지 │                                                    │
//  └──────┴────────────────────────────────────────────────────┘
//
//  좌측: 탭 버튼 4개 (인벤토리 / 파티 관리 / 심해 상점 / 탐사 일지)
//  우상단 패널: 심해화폐 / 현재 라운드 / Cog / 철수 버튼
//  중앙: 슬롯 3개 + 우측 레버 (재설정/스핀)
//  하단 패널: 선택된 탭 콘텐츠
//
//  슬롯 전투 유형:
//    'normal' — 일반전
//    'wave'   — 웨이브전
//    'raid'   — 레이드전
//
//  TODO:
//    - 인벤토리 탭 — 획득 아이템 목록 실제 연동
//    - 파티 관리 탭 — HP 회복 / 전투불능 상태 표시
//    - 심해 상점 탭 — 심해화폐 소모 구매
//    - 음식 시스템 — maxRound 연장
//    - 황금 코인 — 슬롯 보정 아이템
// ================================================================

// ── 슬롯 카드 정의 ────────────────────────────────────────────────
const DIVE_SLOT_CARDS = [
  {
    type:      'normal',
    label:     '일  반  전',
    desc:      '무작위 이형이 출현한다',
    color:     '#8a9060',
    borderHex: 0x505828,
    weight:    5,
  },
  {
    type:      'wave',
    label:     '웨  이  브',
    desc:      '다수의 이형이 떼를 지어 몰려온다',
    color:     '#406090',
    borderHex: 0x284868,
    weight:    3,
  },
  {
    type:      'raid',
    label:     '레  이  드',
    desc:      '강대한 이형 하나가 단독으로 나타난다',
    color:     '#904030',
    borderHex: 0x682818,
    weight:    2,
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
    this._round       = data.round       || 1;
    this._maxRound    = data.maxRound    || 5;
    this._deepCoin    = data.deepCoin    || 0;
    this._log         = data.log         || [];
    this._battleParty = data.battleParty && data.battleParty.length
      ? data.battleParty
      : (CharacterManager.loadParty() || []);
    this._sceneHits   = [];
    this._activeTab   = 'party';  // 'inventory' | 'party' | 'shop' | 'journal'
  }

  // ── 씬 생성 ──────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    this._phase     = 'idle';
    this._results   = [null, null, null];
    this._chosen    = -1;
    this._canChoose = false;
    this._slots     = [];

    this._buildBackground(W, H);
    this._buildLeftTabs(W, H);
    this._buildTopPanel(W, H);
    this._buildSlotArea(W, H);
    this._buildBottomPanel(W, H);
    this._switchTab(this._activeTab);

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
      scan.lineStyle(1, 0x1a0e06, 0.13);
      scan.lineBetween(0, y, W, y);
    }
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    grid.lineStyle(1, 0x0f0a05, 0.4);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);

    this.add.text(W / 2, H / 2, 'DIVE', {
      fontSize: FontManager.adjustedSize(110, this.scale),
      fill: '#0a0705', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.06);
  }

  // ════════════════════════════════════════════════════════════════
  //  좌측 탭 버튼 (세로 4개)
  // ════════════════════════════════════════════════════════════════
  _buildLeftTabs(W, H) {
    const fs      = n => FontManager.adjustedSize(n, this.scale);
    const tabW    = W * 0.10;
    const tabH    = H * 0.10;
    const tabX    = 0;
    const gapY    = 4;
    const tabs = [
      { id: 'inventory', label: '인벤토리' },
      { id: 'party',     label: '파티 관리' },
      { id: 'shop',      label: '심해 상점' },
      { id: 'journal',   label: '탐사 일지' },
    ];

    // 탭 버튼들을 수직 중앙 정렬
    const totalH  = tabs.length * tabH + (tabs.length - 1) * gapY;
    const startY  = H / 2 - totalH / 2;

    this._tabBtnObjs = {};

    tabs.forEach((tab, i) => {
      const cy = startY + i * (tabH + gapY) + tabH / 2;
      const cx = tabX + tabW / 2;

      const bg = this.add.graphics();
      const drawTab = (active, hover) => {
        bg.clear();
        if (active) {
          bg.fillStyle(0x2a1a08, 1);
          bg.lineStyle(2, 0xa05018, 1);
        } else if (hover) {
          bg.fillStyle(0x1a1008, 1);
          bg.lineStyle(1, 0x6a3010, 0.8);
        } else {
          bg.fillStyle(0x0e0904, 0.9);
          bg.lineStyle(1, 0x1e1008, 0.5);
        }
        bg.fillRect(tabX, cy - tabH / 2, tabW, tabH);
        bg.strokeRect(tabX, cy - tabH / 2, tabW, tabH);
      };
      drawTab(tab.id === this._activeTab, false);

      const txt = this.add.text(cx, cy, tab.label, {
        fontSize: fs(10), fill: '#6b4020', fontFamily: FontManager.TITLE,
        align: 'center', wordWrap: { width: tabW - 8 },
      }).setOrigin(0.5);

      const hit = this.add.rectangle(cx, cy, tabW, tabH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(20);
      this._sceneHits.push(hit);

      hit.on('pointerover', () => {
        if (this._activeTab !== tab.id) drawTab(false, true);
        txt.setStyle({ fill: '#c8a070' });
      });
      hit.on('pointerout', () => {
        drawTab(this._activeTab === tab.id, false);
        txt.setStyle({ fill: this._activeTab === tab.id ? '#c8a070' : '#6b4020' });
      });
      hit.on('pointerdown', () => this._switchTab(tab.id));

      this._tabBtnObjs[tab.id] = { bg, drawTab, txt };
    });

    // 탭 영역 우측 구분선
    const lg = this.add.graphics();
    lg.lineStyle(1, 0x2a1a0a, 0.7);
    lg.lineBetween(tabW, 0, tabW, H);
  }

  // ════════════════════════════════════════════════════════════════
  //  우상단 패널 — 재화 / 라운드 / Cog / 철수
  // ════════════════════════════════════════════════════════════════
  _buildTopPanel(W, H) {
    const fs      = n => FontManager.adjustedSize(n, this.scale);
    const tabW    = W * 0.10;
    const panelX  = tabW;
    const panelH  = H * 0.13;
    const panelW  = W - tabW;

    // 패널 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0807, 0.9);
    bg.lineStyle(1, 0x2a1a0a, 0.7);
    bg.fillRect(panelX, 0, panelW, panelH);
    bg.strokeRect(panelX, 0, panelW, panelH);

    const cy = panelH / 2;

    // ── 심해화폐 ──────────────────────────────────────────────────
    const coinX = panelX + panelW * 0.08;
    this.add.text(coinX, cy - parseInt(fs(8)), '◈ 심해화폐', {
      fontSize: fs(9), fill: '#2a3a50', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);
    this._deepCoinTxt = this.add.text(coinX, cy + parseInt(fs(4)), `${this._deepCoin}`, {
      fontSize: fs(16), fill: '#4a8ac0', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    // ── 라운드 진행 ───────────────────────────────────────────────
    const roundX = panelX + panelW * 0.28;
    this.add.text(roundX, cy - parseInt(fs(8)), 'ROUND', {
      fontSize: fs(9), fill: '#3a2010', fontFamily: FontManager.MONO, letterSpacing: 2,
    }).setOrigin(0.5, 1);
    this.add.text(roundX, cy + parseInt(fs(4)),
      `${this._round}  /  ${this._maxRound}`, {
        fontSize: fs(16), fill: '#a05018', fontFamily: FontManager.TITLE,
      }).setOrigin(0.5, 0);

    // ── Cog 상한 ──────────────────────────────────────────────────
    const cogX = panelX + panelW * 0.48;
    const cogC = CharacterManager.getCogColor(this._cogMax);
    this.add.text(cogX, cy - parseInt(fs(8)), 'COG LIMIT', {
      fontSize: fs(9), fill: '#3a2010', fontFamily: FontManager.MONO, letterSpacing: 2,
    }).setOrigin(0.5, 1);
    this.add.text(cogX, cy + parseInt(fs(4)), `${this._cogMax}`, {
      fontSize: fs(16), fill: cogC.css, fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0);

    // ── 탐사 파티 인원 ────────────────────────────────────────────
    const partyX = panelX + panelW * 0.66;
    const allChars = CharacterManager.loadAll() || [];
    const alive = this._battleParty.filter(id => {
      const c = allChars.find(ch => ch.id === id);
      return c && c.currentHp > 0;
    }).length;
    this.add.text(partyX, cy - parseInt(fs(8)), '파티 생존', {
      fontSize: fs(9), fill: '#3a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);
    this.add.text(partyX, cy + parseInt(fs(4)),
      `${alive}  /  ${this._battleParty.length}`, {
        fontSize: fs(16),
        fill: alive > 0 ? '#608060' : '#a03018',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5, 0);

    // ── 철수 버튼 ─────────────────────────────────────────────────
    const exitX = panelX + panelW * 0.88;
    const exitW = Math.round(panelW * 0.16);
    const exitH = Math.round(panelH * 0.52);
    const exitBg = this.add.graphics();
    const drawExit = (hover) => {
      exitBg.clear();
      exitBg.fillStyle(hover ? 0x1a0a06 : 0x0e0704, 1);
      exitBg.lineStyle(1, hover ? 0x804020 : 0x3a1a0a, 0.9);
      exitBg.fillRect(exitX - exitW / 2, cy - exitH / 2, exitW, exitH);
      exitBg.strokeRect(exitX - exitW / 2, cy - exitH / 2, exitW, exitH);
    };
    drawExit(false);
    const exitTxt = this.add.text(exitX, cy, '철  수', {
      fontSize: fs(12), fill: '#5a3010', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    const exitHit = this.add.rectangle(exitX, cy, exitW, exitH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(10);
    exitHit.on('pointerover', () => { drawExit(true);  exitTxt.setStyle({ fill: '#c06030' }); });
    exitHit.on('pointerout',  () => { drawExit(false); exitTxt.setStyle({ fill: '#5a3010' }); });
    exitHit.on('pointerup',   () => this._exitExpedition());
    this._sceneHits.push(exitHit);
  }

  // ════════════════════════════════════════════════════════════════
  //  슬롯 영역 — 슬롯 3개 + 우측 레버
  // ════════════════════════════════════════════════════════════════
  _buildSlotArea(W, H) {
    const fs     = n => FontManager.adjustedSize(n, this.scale);
    const tabW   = W * 0.10;
    const topH   = H * 0.13;
    const botH   = H * 0.30;

    // 슬롯 가용 영역
    const slotAreaX = tabW;
    const slotAreaY = topH;
    const slotAreaW = W - tabW;
    const slotAreaH = H - topH - botH;

    // 힌트 텍스트
    this._hintText = this.add.text(
      slotAreaX + slotAreaW * 0.44,
      slotAreaY + slotAreaH * 0.10,
      '슬롯을 돌려 라운드를 결정하십시오', {
        fontSize: fs(12), fill: '#2a1508', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);

    // 라운드 라벨
    this.add.text(
      slotAreaX + slotAreaW * 0.44,
      slotAreaY + slotAreaH * 0.04,
      `ROUND  ${this._round}  —  SELECT ENCOUNTER`, {
        fontSize: fs(10), fill: '#1e1008', fontFamily: FontManager.MONO, letterSpacing: 3,
      }).setOrigin(0.5);

    // 구분선
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x2a1a0a, 0.6);
    lineG.lineBetween(slotAreaX + 8, slotAreaY + slotAreaH * 0.16,
      slotAreaX + slotAreaW * 0.88, slotAreaY + slotAreaH * 0.16);

    // ── 슬롯 3칸 배치 ─────────────────────────────────────────────
    // 레버 공간(오른쪽 12%) 제외하고 배치
    const slotZoneW = slotAreaW * 0.86;
    const cardW     = slotZoneW * 0.26;
    const cardH     = slotAreaH * 0.72;
    const cardY     = slotAreaY + slotAreaH * 0.57;
    const gap       = (slotZoneW - cardW * 3) / 4;
    const startX    = slotAreaX + gap + cardW / 2;

    this._slots = [];
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + gap);
      this._slots.push(this._buildOneSlot(cx, cardY, cardW, cardH, i));
    }

    // ── 레버 (우측) ───────────────────────────────────────────────
    this._buildLever(W, H, slotAreaX, slotAreaY, slotAreaW, slotAreaH, fs);
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

    strip.forEach((card, j) => {
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

      stripCt.add([bg, mainTxt, descTxt]);
    });

    const hitArea = this.add.rectangle(cx, cy, cw, ch, 0, 0).setDepth(5);
    return { frame, stripCt, mask, strip, cx, cy, cw, ch, stopped: false, targetCard: null, hitArea };
  }

  // ── 레버 (스핀 + 재굴림) ─────────────────────────────────────────
  _buildLever(W, H, areaX, areaY, areaW, areaH, fs) {
    const leverX  = areaX + areaW * 0.92;
    const leverCY = areaY + areaH * 0.52;
    const leverW  = Math.round(areaW * 0.075);
    const leverH  = Math.round(areaH * 0.55);

    // 레버 배경 박스
    const leverBg = this.add.graphics();
    const drawLever = (state) => {
      leverBg.clear();
      if (state === 'disabled') {
        leverBg.fillStyle(0x080a08, 1);
        leverBg.lineStyle(1, 0x1a2a1a, 0.4);
      } else if (state === 'hover') {
        leverBg.fillStyle(0x1a3a1a, 1);
        leverBg.lineStyle(2, 0x70d070, 1);
      } else if (state === 'active') {
        leverBg.fillStyle(0x142014, 1);
        leverBg.lineStyle(2, 0x50a050, 0.9);
      } else { // pulling
        leverBg.fillStyle(0x0a280a, 1);
        leverBg.lineStyle(2, 0x80ff80, 1);
      }
      leverBg.fillRect(leverX - leverW / 2, leverCY - leverH / 2, leverW, leverH);
      leverBg.strokeRect(leverX - leverW / 2, leverCY - leverH / 2, leverW, leverH);
    };
    this._drawLever  = drawLever;
    this._leverState = 'active';
    drawLever('active');

    // 레버 기둥
    const leverPole = this.add.graphics();
    leverPole.lineStyle(3, 0x305030, 0.8);
    leverPole.lineBetween(leverX, leverCY - leverH * 0.35, leverX, leverCY + leverH * 0.1);

    // 레버 손잡이 (당기는 느낌 표시)
    this._leverKnob = this.add.graphics();
    const knobY = leverCY - leverH * 0.35;
    this._leverKnobY = knobY;
    this._leverKnobCY = leverCY;
    this._leverPole   = leverPole;
    this._leverX      = leverX;
    this._leverW      = leverW;
    this._leverH      = leverH;
    this._drawKnob(knobY);

    // 레버 라벨
    this._leverLabelTxt = this.add.text(leverX, leverCY + leverH * 0.38, '▶ 당기기', {
      fontSize: fs(9), fill: '#50a050', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    // 재굴림 텍스트 (슬롯 정지 후 표시)
    this._rerollTxt = this.add.text(leverX, leverCY + leverH * 0.52,
      `◈ ${this._deepCoin}`, {
        fontSize: fs(9), fill: '#2a3a50', fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setAlpha(0);

    // hit
    const hit = this.add.rectangle(leverX, leverCY, leverW, leverH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(10);
    this._leverHit = hit;
    this._sceneHits.push(hit);

    hit.on('pointerover', () => {
      if (this._phase === 'idle') { drawLever('hover'); this._leverLabelTxt.setStyle({ fill: '#80ff80' }); }
      if (this._phase === 'stopped' && this._deepCoin > 0) {
        drawLever('hover'); this._rerollTxt.setStyle({ fill: '#6ab0e0' });
      }
    });
    hit.on('pointerout', () => {
      if (this._phase === 'idle') { drawLever('active'); this._leverLabelTxt.setStyle({ fill: '#50a050' }); }
      if (this._phase === 'stopped') { drawLever('active'); this._rerollTxt.setStyle({ fill: '#2a3a50' }); }
    });
    hit.on('pointerdown', () => {
      if (this._phase === 'idle') {
        // 레버 당기기 애니
        drawLever('pulling');
        this._animLeverPull(() => this._startSpin());
      } else if (this._phase === 'stopped' && this._deepCoin > 0) {
        this._deepCoin -= 1;
        if (this._deepCoinTxt) this._deepCoinTxt.setText(`${this._deepCoin}`);
        this._rerollTxt.setText(`◈ ${this._deepCoin}`);
        this._resetSlots();
        this._animLeverPull(() => this._startSpin());
      }
    });
  }

  _drawKnob(y) {
    this._leverKnob.clear();
    this._leverKnob.fillStyle(0x60a060, 1);
    this._leverKnob.fillCircle(this._leverX, y, this._leverW * 0.28);
    this._leverKnob.lineStyle(2, 0x80d080, 0.8);
    this._leverKnob.strokeCircle(this._leverX, y, this._leverW * 0.28);
  }

  _animLeverPull(onComplete) {
    // 손잡이가 아래로 내려갔다가 복귀하는 애니
    const startY = this._leverKnobY;
    const pullY  = this._leverCY + this._leverH * 0.1;
    let progress = 0;
    const timer  = this.time.addEvent({
      delay: 16, repeat: 18,
      callback: () => {
        progress++;
        const t = progress / 18;
        const ease = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const y = progress <= 9
          ? startY + (pullY - startY) * (progress / 9)
          : pullY  + (startY - pullY) * ((progress - 9) / 9);
        this._drawKnob(y);
        if (progress >= 18) {
          this._drawKnob(startY);
          onComplete && onComplete();
        }
      },
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  하단 패널 — 탭 콘텐츠
  // ════════════════════════════════════════════════════════════════
  _buildBottomPanel(W, H) {
    const tabW   = W * 0.10;
    const botH   = H * 0.30;
    const panelX = tabW;
    const panelY = H - botH;
    const panelW = W - tabW;

    // 패널 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0807, 0.88);
    bg.lineStyle(1, 0x2a1a0a, 0.7);
    bg.fillRect(panelX, panelY, panelW, botH);
    bg.strokeRect(panelX, panelY, panelW, botH);

    this._botPanelX = panelX;
    this._botPanelY = panelY;
    this._botPanelW = panelW;
    this._botPanelH = botH;

    // 탭 콘텐츠 컨테이너 (탭 전환 시 교체)
    this._tabContentContainer = this.add.container(0, 0).setDepth(5);
  }

  // ── 탭 전환 ──────────────────────────────────────────────────────
  _switchTab(tabId) {
    this._activeTab = tabId;

    // 탭 버튼 상태 갱신
    Object.keys(this._tabBtnObjs).forEach(id => {
      const { drawTab, txt } = this._tabBtnObjs[id];
      const isActive = id === tabId;
      drawTab(isActive, false);
      txt.setStyle({ fill: isActive ? '#c8a070' : '#6b4020' });
    });

    // 콘텐츠 교체
    this._tabContentContainer.removeAll(true);

    const fs = n => FontManager.adjustedSize(n, this.scale);
    const px = this._botPanelX + 12;
    const py = this._botPanelY + 10;
    const pw = this._botPanelW - 24;
    const ph = this._botPanelH - 20;

    switch (tabId) {
      case 'inventory':  this._buildTabInventory(px, py, pw, ph, fs); break;
      case 'party':      this._buildTabParty(px, py, pw, ph, fs);     break;
      case 'shop':       this._buildTabShop(px, py, pw, ph, fs);      break;
      case 'journal':    this._buildTabJournal(px, py, pw, ph, fs);   break;
    }
  }

  // ── 인벤토리 탭 ──────────────────────────────────────────────────
  _buildTabInventory(px, py, pw, ph, fs) {
    const lbl = this.add.text(px, py, '인벤토리', {
      fontSize: fs(11), fill: '#4a2a10', fontFamily: FontManager.TITLE,
    });
    this._tabContentContainer.add(lbl);

    const sub = this.add.text(px, py + parseInt(fs(16)), '(아이템 없음)', {
      fontSize: fs(10), fill: '#1e1408', fontFamily: FontManager.MONO,
    });
    this._tabContentContainer.add(sub);
  }

  // ── 파티 관리 탭 ─────────────────────────────────────────────────
  _buildTabParty(px, py, pw, ph, fs) {
    const lbl = this.add.text(px, py, '파티 관리', {
      fontSize: fs(11), fill: '#4a2a10', fontFamily: FontManager.TITLE,
    });
    this._tabContentContainer.add(lbl);

    const allChars = CharacterManager.loadAll() || [];
    const cardW = Math.round(pw / 8) - 6;
    const cardH = Math.round(ph * 0.75);
    let   cx    = px + cardW / 2;

    this._battleParty.forEach(id => {
      const c = allChars.find(ch => ch.id === id);
      if (!c) return;
      const hpPct = c.maxHp > 0 ? c.currentHp / c.maxHp : 0;
      const dead  = c.currentHp <= 0;
      const cogC  = CharacterManager.getCogColor(c.cog);

      const cardBg = this.add.graphics();
      cardBg.fillStyle(dead ? 0x1a0808 : 0x0c0906, 1);
      cardBg.lineStyle(1, dead ? 0x5a1818 : cogC.phaser, 0.6);
      cardBg.fillRect(cx - cardW / 2, py + parseInt(fs(20)), cardW, cardH);
      cardBg.strokeRect(cx - cardW / 2, py + parseInt(fs(20)), cardW, cardH);
      this._tabContentContainer.add(cardBg);

      if (this.textures.exists(c.spriteKey)) {
        const spr = this.add.image(cx, py + parseInt(fs(20)) + cardH * 0.36, c.spriteKey)
          .setDisplaySize(cardW * 0.72, cardW * 0.72)
          .setAlpha(dead ? 0.25 : 0.85);
        this._tabContentContainer.add(spr);
      }

      const nameTxt = this.add.text(cx, py + parseInt(fs(20)) + cardH * 0.72, c.name, {
        fontSize: fs(8), fill: dead ? '#5a2222' : '#c8bfb0',
        fontFamily: FontManager.TITLE, wordWrap: { width: cardW - 4 }, align: 'center',
      }).setOrigin(0.5);
      this._tabContentContainer.add(nameTxt);

      if (!dead) {
        const bW = cardW * 0.82, bH = Math.max(3, 4);
        const bY = py + parseInt(fs(20)) + cardH * 0.88;
        const hpBar = this.add.graphics();
        hpBar.fillStyle(0x1a1008, 1);
        hpBar.fillRect(cx - bW / 2, bY, bW, bH);
        const col = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
        hpBar.fillStyle(col, 1);
        hpBar.fillRect(cx - bW / 2, bY, Math.round(bW * hpPct), bH);
        this._tabContentContainer.add(hpBar);
      } else {
        const deadTxt = this.add.text(cx, py + parseInt(fs(20)) + cardH * 0.50, '전투불능', {
          fontSize: fs(8), fill: '#c03030', fontFamily: FontManager.MONO,
        }).setOrigin(0.5);
        this._tabContentContainer.add(deadTxt);
      }

      cx += cardW + 6;
    });
  }

  // ── 심해 상점 탭 ─────────────────────────────────────────────────
  _buildTabShop(px, py, pw, ph, fs) {
    const lbl = this.add.text(px, py, '심해 상점', {
      fontSize: fs(11), fill: '#4a2a10', fontFamily: FontManager.TITLE,
    });
    this._tabContentContainer.add(lbl);
    const sub = this.add.text(px, py + parseInt(fs(16)), '(준비 중)', {
      fontSize: fs(10), fill: '#1e1408', fontFamily: FontManager.MONO,
    });
    this._tabContentContainer.add(sub);
  }

  // ── 탐사 일지 탭 ─────────────────────────────────────────────────
  _buildTabJournal(px, py, pw, ph, fs) {
    const lbl = this.add.text(px, py, '탐사 일지', {
      fontSize: fs(11), fill: '#4a2a10', fontFamily: FontManager.TITLE,
    });
    this._tabContentContainer.add(lbl);

    const logLines = this._log.length
      ? this._log.slice().reverse()
      : [{ note: '기록 없음' }];

    logLines.forEach((entry, i) => {
      const txt = entry.note
        || `R${entry.round}  ${entry.type || ''}  —  ${entry.result || ''}`;
      const col = entry.result === 'defeat'  ? '#7a2a10'
                : entry.result === 'victory' ? '#305020'
                : '#3a2a10';
      const line = this.add.text(
        px, py + parseInt(fs(20)) + i * parseInt(fs(14)), `▸ ${txt}`, {
          fontSize: fs(10), fill: col, fontFamily: FontManager.MONO,
          wordWrap: { width: pw - 8 },
        });
      this._tabContentContainer.add(line);
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  슬롯 스핀 로직
  // ════════════════════════════════════════════════════════════════
  _startSpin() {
    this._phase     = 'spinning';
    this._results   = [null, null, null];
    this._chosen    = -1;
    this._canChoose = false;

    this._drawLever('disabled');
    this._leverHit.disableInteractive();
    this._leverLabelTxt.setStyle({ fill: '#2a4a2a' });
    this._rerollTxt.setAlpha(0);
    this._hintText.setText('라운드를 결정하는 중...');
    this._hintText.setStyle({ fill: '#2a1508' });

    const stopDelays = [1400, 2200, 3000];
    this._slots.forEach((slot, i) => {
      const totalItems   = slot.strip.length;
      const finalCardIdx = totalItems - 2;
      slot.targetCard    = slot.strip[finalCardIdx];
      slot.stopped       = false;
      const spinDist     = slot.ch * (totalItems - 2);

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

    let dotCount = 0;
    this._spinTimer = this.time.addEvent({
      delay: 400, loop: true,
      callback: () => {
        this._hintText.setText('라운드를 결정하는 중  '
          + ['·', '· ·', '· · ·'][dotCount++ % 3]);
      },
    });
  }

  _onSlotStopped(idx) {
    const slot = this._slots[idx];
    slot.frame.clear();
    slot.frame.lineStyle(2, slot.targetCard.borderHex, 1);
    slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);

    if (!this._slots.every(s => s.stopped)) return;

    if (this._spinTimer) this._spinTimer.remove();
    this._phase     = 'stopped';
    this._canChoose = true;

    this._hintText.setText('라운드 유형을 선택하십시오');
    this._hintText.setStyle({ fill: '#8a6040' });

    // 레버 → 재굴림 모드
    if (this._deepCoin > 0) {
      this._drawLever('active');
      this._leverLabelTxt.setText('◈ 재굴림').setStyle({ fill: '#2a3a50' });
      this._rerollTxt.setText(`심해화폐 ${this._deepCoin}`).setAlpha(1);
      this._leverHit.setInteractive({ useHandCursor: true });
    } else {
      this._drawLever('disabled');
      this._leverLabelTxt.setText('재굴림 불가').setStyle({ fill: '#2a1a0a' });
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

    this._drawLever('disabled');
    this._leverHit.disableInteractive();
    this._rerollTxt.setAlpha(0);

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
    this._hintText.setText(`${card.label.replace(/\s/g, '')}  —  전투 진입`);
    this._hintText.setStyle({ fill: card.color });

    this._log.push({
      round:  this._round,
      type:   card.type,
      result: 'pending',
      note:   `R${this._round}  ${card.label.replace(/\s/g, '')}`,
    });

    this.time.delayedCall(800, () => this._enterBattle(card.type));
  }

  // ── 슬롯 리셋 ────────────────────────────────────────────────────
  _resetSlots() {
    this._slots.forEach(slot => {
      slot.stopped = false;
      const newStrip = _makeDiveStrip(22);
      slot.strip = newStrip;
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
    this._drawLever('active');
    this._leverLabelTxt.setText('▶ 당기기').setStyle({ fill: '#50a050' });
    this._leverHit.setInteractive({ useHandCursor: true });
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
        this.scene.start('BattleScene', {
          cogMax:      this._cogMax,
          battleParty: this._battleParty,
          round:       this._round,
          battleType,
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
      onComplete: () => this.scene.start('AtelierScene'),
    });
  }

  // ── 씬 정리 ──────────────────────────────────────────────────────
  shutdown() {
    if (this._spinTimer) this._spinTimer.remove();
    this._sceneHits.forEach(h => { try { h.destroy(); } catch(e) {} });
    this._sceneHits = [];
  }
}
