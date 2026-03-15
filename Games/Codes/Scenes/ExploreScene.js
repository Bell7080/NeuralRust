// ================================================================
//  ExploreScene.js
//  경로: Games/Codes/Scenes/ExploreScene.js
//
//  슬롯 3칸 — 각 칸이 랜덤 카드로 회전 후 순서대로 정지
//  카드 레이아웃: Cog 숫자 크게 (중앙) / "전투" 작게 (아래)
// ================================================================

// ── 난이도 슬롯: Cog 1~10 전투 카드만 사용 ──────────────────────
// 이 슬롯은 탐사 난이도(적 Cog 상한)를 결정한다.
// 선택 순간 탐사 진입 확정 — 이후 뒤로가기 없음.
//
// TODO: 라운드 슬롯(RoundSlotScene)은 별도 씬으로 구현 예정.
//       라운드 슬롯에는 전투 외에 이벤트(낚시/잔해수집/전선연결/상점 등)도 포함될 예정.
const EXPLORE_CARDS = [
  { type:'combat', cog:1,  label:'전  투', mainText:'1',  color:'#6b8040', border:0x4a5828, weight:14 },
  { type:'combat', cog:2,  label:'전  투', mainText:'2',  color:'#6b8040', border:0x4a5828, weight:13 },
  { type:'combat', cog:3,  label:'전  투', mainText:'3',  color:'#7a8030', border:0x505820, weight:12 },
  { type:'combat', cog:4,  label:'전  투', mainText:'4',  color:'#8a7828', border:0x605018, weight:10 },
  { type:'combat', cog:5,  label:'전  투', mainText:'5',  color:'#9a6820', border:0x6a4810, weight:9  },
  { type:'combat', cog:6,  label:'전  투', mainText:'6',  color:'#a85820', border:0x783810, weight:7  },
  { type:'combat', cog:7,  label:'전  투', mainText:'7',  color:'#b84820', border:0x803010, weight:6  },
  { type:'combat', cog:8,  label:'전  투', mainText:'8',  color:'#c03828', border:0x882018, weight:4  },
  { type:'combat', cog:9,  label:'전  투', mainText:'9',  color:'#cc2828', border:0x901818, weight:3  },
  { type:'combat', cog:10, label:'전  투', mainText:'10', color:'#e01818', border:0xa80808, weight:2  },
];

function drawCard() {
  const total = EXPLORE_CARDS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const card of EXPLORE_CARDS) { r -= card.weight; if (r <= 0) return card; }
  return EXPLORE_CARDS[0];
}

function makeSlotStrip(count) {
  return Array.from({ length: count }, () => drawCard());
}

class ExploreScene extends Phaser.Scene {
  constructor() { super({ key: 'ExploreScene' }); }
  init(data) { this._from = data.from || 'AtelierScene'; }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    this._phase = 'spinning';
    this._results = [null, null, null];
    this._chosen = -1;
    this._canChoose = false;

    this._buildBackground(W, H);
    this._buildHeader(W, H);
    this._buildSlots(W, H);
    this._buildFooter(W, H);
    this._startSpin();
  }

  _buildBackground(W, H) {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    const scan = this.add.graphics();
    for (let y = 0; y < H; y += 4) { scan.lineStyle(1, 0x1a0e06, 0.18); scan.lineBetween(0, y, W, y); }
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    grid.lineStyle(1, 0x0f0a05, 0.5);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    this.add.text(W / 2, H / 2, 'EXPLORE', {
      fontSize: FontManager.adjustedSize(90, this.scale), fill: '#0a0705', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.08);
  }

  _buildHeader(W, H) {
    this.add.text(W / 2, H * 0.09, '난이도  선택', {
      fontSize: FontManager.adjustedSize(28, this.scale), fill: '#6b4020', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.09 + parseInt(FontManager.adjustedSize(26, this.scale)), 'SELECT DIFFICULTY — COG LIMIT', {
      fontSize: FontManager.adjustedSize(11, this.scale), fill: '#2a1508', fontFamily: FontManager.MONO, letterSpacing: 4,
    }).setOrigin(0.5);
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x2a1a0a, 0.8);
    lineG.lineBetween(W * 0.05, H * 0.17, W * 0.95, H * 0.17);
    this._hintText = this.add.text(W / 2, H * 0.21, '난이도를 불러오는 중...', {
      fontSize: FontManager.adjustedSize(13, this.scale), fill: '#2a1508', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
  }

  _buildSlots(W, H) {
    // 3칸을 화면 중앙에 모음
    const cardW  = W * 0.20;
    const cardH  = H * 0.58;
    const cardY  = H * 0.545;
    const gap    = W * 0.025;
    const totalW = cardW * 3 + gap * 2;
    const startX = W / 2 - totalW / 2;

    this._slots = [];
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + gap) + cardW / 2;
      this._slots.push(this._buildOneSlot(cx, cardY, cardW, cardH, i));
    }
  }

  _buildOneSlot(cx, cy, cw, ch, idx) {
    const frame = this.add.graphics();
    frame.lineStyle(1, 0x2a1a0a, 0.7);
    frame.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);

    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    const mask = maskShape.createGeometryMask();

    const strip   = makeSlotStrip(22);
    const itemH   = ch;
    const stripCt = this.add.container(cx, cy - ch / 2);
    stripCt.setMask(mask);

    strip.forEach((card, i) => {
      const itemY = i * itemH + itemH / 2;
      this._buildCardInStrip(stripCt, card, itemY, cw, itemH);
    });

    const hitArea = this.add.rectangle(cx, cy, cw, ch, 0x000000, 0).setDepth(10);
    return { cx, cy, cw, ch, frame, strip, stripCt, mask, maskShape, hitArea, targetCard: null, stopped: false, idx };
  }

  // ── 카드 1장: Cog 숫자 크게 / "전투" 작게 아래 ──────────────
  _buildCardInStrip(container, card, itemY, cw, ch) {
    const bg = this.add.graphics();
    bg.fillStyle(0x0c0a07, 1);
    bg.lineStyle(1, card.border, 0.35);
    bg.strokeRect(-cw / 2 + 1, itemY - ch / 2 + 1, cw - 2, ch - 2);
    bg.fillRect(-cw / 2 + 1, itemY - ch / 2 + 1, cw - 2, ch - 2);
    container.add(bg);

    if (card.type === 'combat') {
      // "COG" 소문자 라벨
      const cogLabel = this.add.text(0, itemY - ch * 0.25, 'COG', {
        fontSize: FontManager.adjustedSize(11, this.scale),
        fill: card.color, fontFamily: FontManager.MONO, letterSpacing: 4, alpha: 0.55,
      }).setOrigin(0.5);

      // Cog 번호 (크게)
      const numTxt = this.add.text(0, itemY - ch * 0.03, card.mainText, {
        fontSize: FontManager.adjustedSize(62, this.scale),
        fill: card.color, fontFamily: FontManager.TITLE,
      }).setOrigin(0.5);

      // "전 투" (작게, 숫자 바로 아래)
      const typeTxt = this.add.text(0, itemY + ch * 0.26, card.label, {
        fontSize: FontManager.adjustedSize(13, this.scale),
        fill: card.color, fontFamily: FontManager.MONO, alpha: 0.8,
      }).setOrigin(0.5);

      // 장식선
      const deco = this.add.graphics();
      deco.lineStyle(1, card.border, 0.35);
      deco.lineBetween(-cw * 0.25, itemY + ch * 0.20, cw * 0.25, itemY + ch * 0.20);

      container.add([cogLabel, numTxt, typeTxt, deco]);

    } else {
      const mainTxt = this.add.text(0, itemY - ch * 0.08, card.mainText, {
        fontSize: FontManager.adjustedSize(54, this.scale),
        fill: card.color, fontFamily: FontManager.TITLE,
      }).setOrigin(0.5);

      const subTxt = this.add.text(0, itemY + ch * 0.22, card.label, {
        fontSize: FontManager.adjustedSize(14, this.scale),
        fill: card.color, fontFamily: FontManager.MONO, alpha: 0.85,
      }).setOrigin(0.5);

      container.add([mainTxt, subTxt]);
    }
  }

  _buildFooter(W, H) {
    // 탐사 난이도 선택 화면에는 뒤로가기 없음 — 선택 순간 탐사 진입 확정
    // (PartyScene에서 탐사 파티 편성 + Arc 비용 차감이 이미 완료된 상태)
  }

  _startSpin() {
    const stopDelays = [1400, 2200, 3000];
    this._slots.forEach((slot, i) => {
      const totalItems   = slot.strip.length;
      const finalCardIdx = totalItems - 2;
      slot.targetCard    = slot.strip[finalCardIdx];
      const spinDist     = slot.ch * (totalItems - 2);

      this.tweens.add({
        targets: slot.stripCt,
        y: slot.cy - slot.ch / 2 - spinDist,
        duration: stopDelays[i] + 600,
        ease: 'Cubic.easeOut',
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
        this._hintText.setText('난이도를 불러오는 중  ' + ['·','· ·','· · ·'][dotCount++ % 3]);
      },
    });
  }

  _onSlotStopped(idx) {
    const slot = this._slots[idx];
    slot.frame.clear();
    slot.frame.lineStyle(2, slot.targetCard.border, 1);
    slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);

    if (!this._slots.every(s => s.stopped)) return;
    this._spinTimer.remove();
    this._phase = 'stopped';
    this._canChoose = true;
    this._hintText.setText('난이도를 선택하십시오  —  선택 후 탐사 진입');
    this._hintText.setStyle({ fill: '#8a6040' });
    this._enableCardSelection();
  }

  _enableCardSelection() {
    this._slots.forEach((slot, i) => {
      const hit = slot.hitArea;
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => {
        if (this._chosen >= 0) return;
        slot.frame.clear();
        slot.frame.lineStyle(2, slot.targetCard.border, 1);
        slot.frame.fillStyle(0x140c05, 0.35);
        slot.frame.fillRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
        slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      });
      hit.on('pointerout', () => {
        if (this._chosen >= 0) return;
        slot.frame.clear();
        slot.frame.lineStyle(2, slot.targetCard.border, 1);
        slot.frame.strokeRect(slot.cx - slot.cw / 2, slot.cy - slot.ch / 2, slot.cw, slot.ch);
      });
      hit.on('pointerdown', () => {
        if (!this._canChoose || this._chosen >= 0) return;
        this._chooseCard(i);
      });
    });
  }

  _chooseCard(idx) {
    this._chosen = idx;
    this._canChoose = false;
    this._phase = 'chosen';

    const chosen = this._slots[idx];
    chosen.frame.clear();
    chosen.frame.lineStyle(3, chosen.targetCard.border, 1);
    chosen.frame.fillStyle(0x1e1008, 0.45);
    chosen.frame.fillRect(chosen.cx - chosen.cw / 2, chosen.cy - chosen.ch / 2, chosen.cw, chosen.ch);
    chosen.frame.strokeRect(chosen.cx - chosen.cw / 2, chosen.cy - chosen.ch / 2, chosen.cw, chosen.ch);

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
    this._hintText.setText(`Cog ${card.cog}  —  탐사 진입`);
    this._hintText.setStyle({ fill: card.color });

    this.time.delayedCall(900, () => this._transitionToResult(card));
  }

  _transitionToResult(card) {
    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 400, ease: 'Sine.easeIn',
      onComplete: () => {
        // 난이도 선택 확정 → BattleReadyScene (전투 파티 재편성)으로 진입
        // 탐사 파티(nr_party)는 PartyScene에서 이미 저장됨
        this.scene.start('BattleReadyScene', { cogMax: card.cog });
      },
    });
  }
}
