// ================================================================
//  BattleReadyScene.js
//  경로: Games/Codes/Scenes/BattleReadyScene.js
//
//  역할: 매 전투 전 전투파티 재편성
//    - ExploreScene(난이도 선택)에서 cogMax 전달받아 진입
//    - 탐사 파티(nr_party) 내에서 전투에 보낼 캐릭터 선택
//    - 배치 순서 = 전투 내 포지션 인덱스 (가운데 정렬)
//      · 1명: [  1  ]
//      · 3명: [1][2][3]
//      · 추가 시 왼쪽으로 밀림 (먼저 넣은 캐릭터가 왼쪽)
//    - Cog > cogMax 캐릭터는 선택 불가 (회색 처리)
//    - 출발 → BattleScene 진입
//    - 뒤로가기 없음 (탐사 진입 후 확정)
//
//  TODO: 양옆 캐릭터에게 효과를 주는 스킬, 모서리 발동 스킬 등
//        포지션 인덱스 기반 스킬 로직은 BattleScene에서 구현
// ================================================================

class BattleReadyScene extends Phaser.Scene {
  constructor() { super({ key: 'BattleReadyScene' }); }

  init(data) {
    this._cogMax      = data.cogMax || 1;
    this._round       = data.round  || 1;
    this._battleParty = [];   // 전투에 보낼 캐릭터 id 배열 (순서 = 배치 순서)
    this._sceneHits   = [];
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    // 탐사 파티 로드 (PartyScene에서 저장한 nr_party)
    const partyIds  = CharacterManager.loadParty() || [];
    const allChars  = CharacterManager.loadAll()   || [];
    this._partyChars = partyIds
      .map(id => allChars.find(c => c.id === id))
      .filter(Boolean);

    this._buildBackground(W, H);
    this._buildHeader(W, H);
    this._buildBattleSlots(W, H);
    this._buildCharList(W, H);
    this._buildFooter(W, H);
  }

  // ── 배경 ─────────────────────────────────────────────────────────
  _buildBackground(W, H) {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    grid.lineStyle(1, 0x0f0a05, 0.5);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    this.add.text(W / 2, H / 2, 'READY', {
      fontSize: FontManager.adjustedSize(110, this.scale),
      fill: '#0a0705', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.05);
  }

  // ── 헤더 ─────────────────────────────────────────────────────────
  _buildHeader(W, H) {
    const fs = n => FontManager.adjustedSize(n, this.scale);

    this.add.text(W / 2, H * 0.07, '전  투  편  성', {
      fontSize: fs(26), fill: '#6b4020', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const cogC = CharacterManager.getCogColor(this._cogMax);
    this.add.text(W / 2, H * 0.07 + parseInt(fs(30)),
      `Cog ${this._cogMax} 이하  전투 참여  —  배치 순서 = 포지션`, {
        fontSize: fs(12), fill: cogC.css, fontFamily: FontManager.MONO, letterSpacing: 2,
      }).setOrigin(0.5);

    const lg = this.add.graphics();
    lg.lineStyle(1, 0x2a1a0a, 0.8);
    lg.lineBetween(W * 0.05, H * 0.13, W * 0.95, H * 0.13);
  }

  // ── 전투 슬롯 (배치 순서 미리보기) ───────────────────────────────
  _buildBattleSlots(W, H) {
    this._battleSlotObjs = [];
    const MAX_VISIBLE = 8;
    const slotW  = Math.round(W * 0.09);
    const slotH  = Math.round(H * 0.20);
    const slotY  = H * 0.26;
    const totalW = MAX_VISIBLE * slotW + (MAX_VISIBLE - 1) * 10;
    const startX = W / 2 - totalW / 2 + slotW / 2;

    this._slotW      = slotW;
    this._slotH      = slotH;
    this._slotY      = slotY;
    this._slotStartX = startX;

    this.add.text(W / 2, H * 0.15, '전  투  배  치', {
      fontSize: FontManager.adjustedSize(13, this.scale),
      fill: '#4a2a10', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    for (let i = 0; i < MAX_VISIBLE; i++) {
      const cx   = startX + i * (slotW + 10);
      const objs = this._makeSlot(cx, slotY, slotW, slotH, i);
      this._battleSlotObjs.push(objs);
    }
  }

  _makeSlot(cx, cy, w, h, idx) {
    const fs = n => FontManager.adjustedSize(n, this.scale);

    const bg = this.add.graphics();
    const draw = (char) => {
      bg.clear();
      if (char) {
        const cogC = CharacterManager.getCogColor(char.cog);
        bg.fillStyle(0x1e1008, 1);
        bg.lineStyle(2, cogC.phaser, 0.9);
      } else {
        bg.fillStyle(0x080507, 0.6);
        bg.lineStyle(1, 0x1e1008, 0.4);
      }
      bg.fillRect(cx - w / 2, cy - h / 2, w, h);
      bg.strokeRect(cx - w / 2, cy - h / 2, w, h);
    };
    draw(null);

    // 포지션 번호
    const posNumTxt = this.add.text(cx, cy - h / 2 + 6, `${idx + 1}`, {
      fontSize: fs(9), fill: '#2a1a08', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    const plusTxt = this.add.text(cx, cy, '+', {
      fontSize: fs(24), fill: '#1e1008', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const nameTxt = this.add.text(cx, cy + h * 0.10, '', {
      fontSize: fs(10), fill: '#c8bfb0', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0);

    const cogTxt = this.add.text(cx, cy - h * 0.30, '', {
      fontSize: fs(9), fill: '#a08040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0);

    const hpTxt = this.add.text(cx, cy + h * 0.30, '', {
      fontSize: fs(8), fill: '#608060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0);

    const removeTxt = this.add.text(cx, cy + h * 0.44, '[제거]', {
      fontSize: fs(9), fill: '#3d2010', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0);

    let spriteImg = null;

    // 슬롯 클릭 → 제거
    const hit = this.add.rectangle(cx, cy, w, h, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(20);
    this._sceneHits.push(hit);
    hit.on('pointerdown', () => {
      const charId = this._battleParty[idx];
      if (charId) this._removeFromBattle(idx);
    });

    return { bg, draw, posNumTxt, plusTxt, nameTxt, cogTxt, hpTxt, removeTxt, spriteImg, hit, idx };
  }

  _refreshBattleSlots() {
    this._battleSlotObjs.forEach((slot, idx) => {
      const charId = this._battleParty[idx];
      const char   = charId
        ? this._partyChars.find(c => c.id === charId)
        : null;

      slot.draw(char);

      if (char) {
        const cogC = CharacterManager.getCogColor(char.cog);
        slot.plusTxt.setAlpha(0);
        slot.nameTxt.setText(char.name).setAlpha(1);
        slot.cogTxt.setText(`Cog ${char.cog}`).setStyle({ fill: cogC.css }).setAlpha(1);
        slot.hpTxt.setText(`HP ${char.currentHp}/${char.maxHp}`).setAlpha(1);
        slot.removeTxt.setAlpha(1);

        // 스프라이트 갱신
        if (slot.spriteImg) { slot.spriteImg.destroy(); slot.spriteImg = null; }
        if (this.textures.exists(char.spriteKey)) {
          slot.spriteImg = this.add.image(slot.cx || 0, (slot.cy || 0) - slot.h * 0.05,
            char.spriteKey)
            .setDisplaySize(this._slotW * 0.7, this._slotW * 0.7)
            .setAlpha(0.85).setDepth(1);
        }
      } else {
        slot.plusTxt.setAlpha(idx === 0 || this._battleParty.length >= idx ? 0.4 : 0.1);
        slot.nameTxt.setAlpha(0);
        slot.cogTxt.setAlpha(0);
        slot.hpTxt.setAlpha(0);
        slot.removeTxt.setAlpha(0);
        if (slot.spriteImg) { slot.spriteImg.destroy(); slot.spriteImg = null; }
      }
    });

    this._refreshFooter();
  }

  // ── 캐릭터 목록 (탐사 파티 내에서 선택) ──────────────────────────
  _buildCharList(W, H) {
    this._cardObjs = [];

    const listY  = H * 0.50;
    const listH  = H * 0.37;
    const cardW  = Math.round(W * 0.09);
    const cardH  = Math.round(H * 0.25);
    const gapX   = Math.round(W * 0.012);
    const cols   = Math.floor((W * 0.92) / (cardW + gapX));
    const startX = W / 2 - ((cols - 1) / 2) * (cardW + gapX);

    this.add.text(W / 2, H * 0.44, '탐  사  파  티', {
      fontSize: FontManager.adjustedSize(13, this.scale),
      fill: '#4a2a10', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.44 + parseInt(FontManager.adjustedSize(16, this.scale)),
      `Cog ${this._cogMax} 초과 캐릭터는 이번 전투 참여 불가`, {
        fontSize: FontManager.adjustedSize(10, this.scale),
        fill: '#3a2010', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);

    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.5);
    lg.lineBetween(W * 0.04, H * 0.475, W * 0.96, H * 0.475);

    // 마스크
    const maskG = this.make.graphics({});
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(0, listY - listH / 2, W, listH);
    const mask   = maskG.createGeometryMask();
    const ct     = this.add.container(0, 0).setMask(mask);
    this._listCt = ct;
    this._listScrollY = 0;

    const rowCount = Math.ceil(this._partyChars.length / cols);
    const totalH   = rowCount * (cardH + gapX);

    this._partyChars.forEach((char, i) => {
      const col      = i % cols;
      const row      = Math.floor(i / cols);
      const cx       = startX + col * (cardW + gapX);
      const cy       = listY  + row * (cardH + gapX);
      const disabled = char.cog > this._cogMax;
      const alpha    = disabled ? 0.25 : 1;
      const cogC     = CharacterManager.getCogColor(char.cog);

      // 카드 배경
      const bg = this.add.graphics().setAlpha(alpha);
      ct.add(bg);
      const inBattle = () => this._battleParty.includes(char.id);
      const drawBg = (hover) => {
        bg.clear();
        if (inBattle()) {
          bg.fillStyle(0x1a2a1a, 1); bg.lineStyle(2, 0x60c060, 1);
        } else if (hover) {
          bg.fillStyle(0x1a1008, 1); bg.lineStyle(1, 0xa05018, 0.9);
        } else {
          bg.fillStyle(0x0c0906, 0.9); bg.lineStyle(1, 0x1e1008, 0.5);
        }
        bg.fillRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
        bg.strokeRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
      };
      drawBg(false);

      // Cog 뱃지
      const cogTxt = this.add.text(cx, cy - cardH * 0.38, `Cog ${char.cog}`, {
        fontSize: FontManager.adjustedSize(9, this.scale),
        fill: cogC.css, fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setAlpha(alpha);
      ct.add(cogTxt);

      // 스프라이트
      let spr = null;
      if (this.textures.exists(char.spriteKey)) {
        spr = this.add.image(cx, cy - cardH * 0.05, char.spriteKey)
          .setDisplaySize(cardW * 0.7, cardW * 0.7).setAlpha(alpha);
        ct.add(spr);
      }

      // 이름
      const nameTxt = this.add.text(cx, cy + cardH * 0.30, char.name, {
        fontSize: FontManager.adjustedSize(10, this.scale),
        fill: disabled ? '#2a1a0a' : '#c8bfb0', fontFamily: FontManager.TITLE,
      }).setOrigin(0.5).setAlpha(alpha);
      ct.add(nameTxt);

      // HP 바
      const bW = cardW * 0.8, bH = 4;
      const bY = cy + cardH * 0.43;
      const hpBar = this.add.graphics().setAlpha(alpha);
      hpBar.fillStyle(0x1a1008, 1);
      hpBar.fillRect(cx - bW / 2, bY, bW, bH);
      const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
      const hpCol = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
      hpBar.fillStyle(hpCol, 1);
      hpBar.fillRect(cx - bW / 2, bY, Math.round(bW * hpPct), bH);
      ct.add(hpBar);

      // 편성중 마크
      const inMark = this.add.text(cx, cy - cardH * 0.18, '▶ 편성중', {
        fontSize: FontManager.adjustedSize(8, this.scale),
        fill: '#60c060', fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setAlpha(0);
      ct.add(inMark);

      // Cog 초과 표시
      if (disabled) {
        const overBg = this.add.graphics();
        overBg.fillStyle(0x050407, 0.5);
        overBg.fillRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
        ct.add(overBg);
        const lockTxt = this.add.text(cx, cy, `Cog ${char.cog}\n상한 초과`, {
          fontSize: FontManager.adjustedSize(9, this.scale),
          fill: '#3d2010', fontFamily: FontManager.MONO, align: 'center',
        }).setOrigin(0.5);
        ct.add(lockTxt);
      }

      // hit
      if (!disabled) {
        const hit = this.add.rectangle(cx, cy, cardW, cardH, 0, 0)
          .setInteractive({ useHandCursor: true }).setDepth(20);
        this._sceneHits.push(hit);
        hit.on('pointerover',  () => { drawBg(true);  if (nameTxt) nameTxt.setStyle({ fill: '#c8a070' }); });
        hit.on('pointerout',   () => { drawBg(false); if (nameTxt) nameTxt.setStyle({ fill: '#c8bfb0' }); });
        hit.on('pointerdown',  () => {
          if (inBattle()) {
            this._removeFromBattleById(char.id);
          } else {
            this._addToBattle(char.id);
          }
          drawBg(false);
          inMark.setAlpha(inBattle() ? 1 : 0);
        });
      }

      this._cardObjs.push({ char, drawBg, inMark });
    });

    // 스크롤
    this.input.on('wheel', (ptr, objs, dx, dy) => {
      const maxScroll = Math.max(0, totalH - listH);
      this._listScrollY = Math.max(0, Math.min(this._listScrollY + dy * 0.5, maxScroll));
      ct.setY(-this._listScrollY);
    });
  }

  // ── 전투 파티 조작 ───────────────────────────────────────────────
  _addToBattle(charId) {
    if (this._battleParty.includes(charId)) return;
    this._battleParty.push(charId);
    this._refreshBattleSlots();
    this._refreshCardMarks();
  }

  _removeFromBattle(slotIdx) {
    if (this._battleParty[slotIdx] == null) return;
    this._battleParty.splice(slotIdx, 1);
    this._refreshBattleSlots();
    this._refreshCardMarks();
  }

  _removeFromBattleById(charId) {
    const idx = this._battleParty.indexOf(charId);
    if (idx !== -1) this._removeFromBattle(idx);
  }

  _refreshCardMarks() {
    this._cardObjs.forEach(({ char, drawBg, inMark }) => {
      const inB = this._battleParty.includes(char.id);
      drawBg(false);
      inMark.setAlpha(inB ? 1 : 0);
    });
  }

  // ── 하단 버튼 ────────────────────────────────────────────────────
  _buildFooter(W, H) {
    const fs   = n => FontManager.adjustedSize(n, this.scale);
    const btnY = H * 0.92;
    const btnW = Math.round(W * 0.16);
    const btnH = Math.round(H * 0.055);

    const startBg  = this.add.graphics();
    const startTxt = this.add.text(W / 2, btnY, '전  투  시  작', {
      fontSize: fs(18), fill: '#c8a070', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const drawBtn = (state) => {
      startBg.clear();
      if (state === 'disabled') {
        startBg.fillStyle(0x0a0807, 1); startBg.lineStyle(1, 0x1a1008, 0.4);
        startTxt.setStyle({ fill: '#2a1a0a' });
      } else if (state === 'hover') {
        startBg.fillStyle(0x2a1a08, 1); startBg.lineStyle(2, 0xc8a070, 1);
        startTxt.setStyle({ fill: '#e8d090' });
      } else {
        startBg.fillStyle(0x1e1008, 1); startBg.lineStyle(2, 0xa05018, 0.9);
        startTxt.setStyle({ fill: '#c8a070' });
      }
      startBg.fillRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
      startBg.strokeRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
    };

    this._drawStartBtn  = drawBtn;
    this._startBtnState = 'disabled';
    drawBtn('disabled');

    // 인원 / 상태 텍스트
    this._footerTxt = this.add.text(W / 2, btnY - btnH / 2 - 12, '', {
      fontSize: fs(11), fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    const startHit = this.add.rectangle(W / 2, btnY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(20);
    this._sceneHits.push(startHit);

    startHit.on('pointerover', () => { if (this._startBtnState !== 'disabled') drawBtn('hover'); });
    startHit.on('pointerout',  () => { if (this._startBtnState !== 'disabled') drawBtn('active'); });
    startHit.on('pointerdown', () => { if (this._startBtnState === 'disabled') return; this._depart(); });

    this._refreshFooter();
  }

  _refreshFooter() {
    const count    = this._battleParty.length;
    const hasParty = count > 0;
    this._startBtnState = hasParty ? 'active' : 'disabled';
    this._drawStartBtn(this._startBtnState);
    this._footerTxt.setText(
      hasParty
        ? `전투 편성 ${count}명  —  배치 순서: 좌→우`
        : '전투에 참여할 캐릭터를 선택하세요'
    );
    this._footerTxt.setStyle({ fill: hasParty ? '#a05018' : '#3a2010' });
  }

  // ── 전투 진입 ────────────────────────────────────────────────────
  _depart() {
    if (!this._battleParty.length) return;

    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 300, ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.start('BattleScene', {
          cogMax:      this._cogMax,
          battleParty: this._battleParty,
          round:       this._round,
        });
      },
    });
  }

  // ── 정리 ─────────────────────────────────────────────────────────
  shutdown() {
    this._sceneHits.forEach(h => { try { h.destroy(); } catch(e) {} });
    this._sceneHits = [];
  }
}
