// ================================================================
//  PartyScene.js
//  경로: Games/Codes/Scenes/PartyScene.js
//
//  역할: 탐사 파티 편성 화면 (탐사 전체에서 데려갈 인원 결정)
//    - Tab_Explore의 "파티 편성" 버튼으로 진입
//    - 인원 제한 없음 (Arc 비용 = 파티 내 cog 합산)
//    - Arc 부족 시 출발 버튼 비활성
//    - 출발 확정 → Arc 차감 → nr_party 저장 → ExploreScene (난이도 선택)
//
//  ※ 탐사 진입 후 뒤로가기 없음 — ExploreScene에서 난이도 선택 순간 확정
//
//  TODO: 추후 음식 시스템 개발 후 Arc 비용을 음식 소모로 대체 예정
//        (현재: 파티 cog 합산 Arc 소모 / 추후: 인원당 음식 N개 소모)
//
//  컬러 참조: README.md 팔레트
//    BG #050407 / ACCENT #a05018 / BRIGHT #c8a070 / TEXT #c8bfb0
// ================================================================

class PartyScene extends Phaser.Scene {
  constructor() { super({ key: 'PartyScene' }); }

  init(data) {
    this._party    = [];   // 현재 선택된 캐릭터 id 배열
    this._chars    = [];   // 전체 캐릭터 목록
    this._sceneHits = [];
    // 파티 인원 제한 없음 — Arc 비용으로 압박
    // (cogMax 필터 없음 — 모든 캐릭터 선택 가능)
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;

    InputManager.reinit(this);

    this._chars    = CharacterManager.loadAll() || [];
    this._filtered = this._chars; // 탐사 파티는 전원 선택 가능 (cogMax 필터 없음)

    this._buildBackground(W, H);
    this._buildHeader(W, H);
    this._buildPartySlots(W, H);
    this._buildCharList(W, H);
    this._buildFooter(W, H);
  }

  // ── 배경 ─────────────────────────────────────────────────────────
  _buildBackground(W, H) {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);

    // 그리드
    const grid = this.add.graphics();
    const step = Math.round(W / 56);
    grid.lineStyle(1, 0x0f0a05, 0.5);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);

    // 워터마크
    this.add.text(W / 2, H / 2, 'PARTY', {
      fontSize: FontManager.adjustedSize(110, this.scale),
      fill: '#0a0705', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.06);
  }

  // ── 헤더 ─────────────────────────────────────────────────────────
  _buildHeader(W, H) {
    this.add.text(W / 2, H * 0.07, '탐  사  파  티  편  성', {
      fontSize: FontManager.adjustedSize(26, this.scale),
      fill: '#6b4020', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.07 + parseInt(FontManager.adjustedSize(30, this.scale)),
      '탐사에 데려갈 인원을 결정합니다  —  비용: 파티 Cog 합산 Arc', {
        fontSize: FontManager.adjustedSize(12, this.scale),
        fill: '#5a3a18', fontFamily: FontManager.MONO, letterSpacing: 2,
      }).setOrigin(0.5);

    // 구분선
    const lg = this.add.graphics();
    lg.lineStyle(1, 0x2a1a0a, 0.8);
    lg.lineBetween(W * 0.05, H * 0.13, W * 0.95, H * 0.13);
    // 뒤로가기 없음 — 탐사 파티 편성 시작 = 탐사 진입 의사 표명
  }

  // ── 파티 슬롯 (상단 영역) ──────────────────────────────────────────
  _buildPartySlots(W, H) {
    this._partySlotObjs = [];

    const slotW  = Math.round(W * 0.09);
    const slotH  = Math.round(H * 0.22);
    // 최대 동시 표시 슬롯 8칸 (인원 제한 없으므로 스크롤 없이 8명까지 표시)
    const VISIBLE_SLOTS = 8;
    const totalSlotW = VISIBLE_SLOTS * slotW + (VISIBLE_SLOTS - 1) * 12;
    const startX = W / 2 - totalSlotW / 2 + slotW / 2;
    const slotY  = H * 0.26;

    this._slotW = slotW; this._slotH = slotH;
    this._slotY = slotY; this._slotStartX = startX;
    this._VISIBLE_SLOTS = VISIBLE_SLOTS;

    this.add.text(W / 2, H * 0.16, '탐  사  파  티', {
      fontSize: FontManager.adjustedSize(15, this.scale),
      fill: '#4a2a10', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    for (let i = 0; i < VISIBLE_SLOTS; i++) {
      const cx = startX + i * (slotW + 12);
      const objs = this._makePartySlot(cx, slotY, slotW, slotH, i);
      this._partySlotObjs.push(objs);
    }
  }

  _makePartySlot(cx, cy, w, h, idx) {
    const bg = this.add.graphics();

    const draw = (char) => {
      bg.clear();
      if (char) {
        bg.fillStyle(0x1e1008, 1);
        const cogC = CharacterManager.getCogColor(char.cog);
        bg.lineStyle(2, cogC.phaser, 0.9);
      } else {
        bg.fillStyle(0x080507, 0.7);
        bg.lineStyle(1, 0x1e1008, 0.5);
      }
      bg.fillRect(cx - w / 2, cy - h / 2, w, h);
      bg.strokeRect(cx - w / 2, cy - h / 2, w, h);
    };

    draw(null);

    // 빈 슬롯 표시
    const plusTxt = this.add.text(cx, cy - 10, '+', {
      fontSize: FontManager.adjustedSize(28, this.scale),
      fill: '#1e1008', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const slotNumTxt = this.add.text(cx, cy + parseInt(FontManager.adjustedSize(20, this.scale)), `${idx + 1}`, {
      fontSize: FontManager.adjustedSize(11, this.scale),
      fill: '#1a0e06', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    // 캐릭터 배치 시 표시될 텍스트들 (초기 숨김)
    const nameTxt = this.add.text(cx, cy - h * 0.28, '', {
      fontSize: FontManager.adjustedSize(11, this.scale),
      fill: '#c8bfb0', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0);

    const cogTxt = this.add.text(cx, cy - h * 0.38, '', {
      fontSize: FontManager.adjustedSize(10, this.scale),
      fill: '#a05018', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0);

    const sprite = this.add.image(cx, cy + h * 0.05, '__DEFAULT').setAlpha(0);
    sprite.setDisplaySize(w * 0.75, w * 0.75);

    const removeTxt = this.add.text(cx, cy + h * 0.38, '[ 제거 ]', {
      fontSize: FontManager.adjustedSize(10, this.scale),
      fill: '#3d2010', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0);

    // hit
    const hit = this.add.rectangle(cx, cy, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(20);
    this._sceneHits.push(hit);

    hit.on('pointerdown', () => {
      const charId = this._party[idx];
      if (charId) this._removeFromParty(idx);
    });

    return { bg, draw, plusTxt, slotNumTxt, nameTxt, cogTxt, sprite, removeTxt, hit, idx };
  }

  _refreshPartySlots() {
    this._partySlotObjs.forEach((slot, idx) => {
      const charId = this._party[idx];
      const char   = charId ? this._chars.find(c => c.id === charId) : null;

      slot.draw(char);

      if (char) {
        slot.plusTxt.setAlpha(0);
        slot.slotNumTxt.setAlpha(0);

        const cogC = CharacterManager.getCogColor(char.cog);
        slot.cogTxt.setText(`Cog ${char.cog}  ${char.jobLabel}`).setStyle({ fill: cogC.css }).setAlpha(1);
        slot.nameTxt.setText(char.name).setAlpha(1);
        slot.removeTxt.setAlpha(1);

        // 스프라이트
        if (this.textures.exists(char.spriteKey)) {
          slot.sprite.setTexture(char.spriteKey).setAlpha(1);
        } else {
          slot.sprite.setAlpha(0);
        }
      } else {
        slot.plusTxt.setAlpha(1);
        slot.slotNumTxt.setAlpha(1);
        slot.cogTxt.setAlpha(0);
        slot.nameTxt.setAlpha(0);
        slot.sprite.setAlpha(0);
        slot.removeTxt.setAlpha(0);
      }
    });

    this._refreshStartBtn();
  }

  // ── 캐릭터 목록 (하단 스크롤) ─────────────────────────────────────
  _buildCharList(W, H) {
    this._cardObjs = [];

    const listY    = H * 0.51;
    const listH    = H * 0.36;
    const cardW    = Math.round(W * 0.095);
    const cardH    = Math.round(H * 0.28);
    const gapX     = Math.round(W * 0.012);
    const cols     = Math.floor((W * 0.9) / (cardW + gapX));
    const startX   = W / 2 - ((cols - 1) / 2) * (cardW + gapX);

    this.add.text(W / 2, H * 0.44, '캐  릭  터', {
      fontSize: FontManager.adjustedSize(15, this.scale),
      fill: '#4a2a10', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.44 + parseInt(FontManager.adjustedSize(18, this.scale)),
      '클릭으로 파티에 추가 / 제거',
      {
        fontSize: FontManager.adjustedSize(10, this.scale),
        fill: '#2a1508', fontFamily: FontManager.MONO, letterSpacing: 2,
      }
    ).setOrigin(0.5);

    // 구분선
    const lg2 = this.add.graphics();
    lg2.lineStyle(1, 0x1e1008, 0.6);
    lg2.lineBetween(W * 0.05, H * 0.48, W * 0.95, H * 0.48);

    // 마스크 영역
    const maskRect = this.make.graphics({});
    maskRect.fillStyle(0xffffff, 1);
    maskRect.fillRect(0, listY - listH / 2, W, listH);
    const mask = maskRect.createGeometryMask();

    const container = this.add.container(0, 0).setMask(mask);
    this._listContainer = container;
    this._listScrollY   = 0;

    const rowCount = Math.ceil(this._chars.length / cols);
    const totalH   = rowCount * (cardH + gapX);

    this._chars.forEach((char, i) => {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const cx   = startX + col * (cardW + gapX);
      const cy   = listY + row * (cardH + gapX);

      const cardObjs = this._makeCharCard(char, cx, cy, cardW, cardH, false, container);
      this._cardObjs.push({ char, ...cardObjs, disabled: false });
    });

    // 스크롤 이벤트
    this.input.on('wheel', (ptr, objs, dx, dy) => {
      const maxScroll = Math.max(0, totalH - listH);
      this._listScrollY = Math.max(0, Math.min(this._listScrollY + dy * 0.5, maxScroll));
      container.setY(-this._listScrollY);
    });
  }

  _makeCharCard(char, cx, cy, w, h, disabled, container) {
    const alpha  = disabled ? 0.25 : 1;
    const cogC   = CharacterManager.getCogColor(char.cog);
    const inPart = () => this._party.includes(char.id);

    const bg = this.add.graphics().setAlpha(alpha);
    container.add(bg);

    const drawBg = (hover) => {
      bg.clear();
      const inP = inPart();
      if (inP) {
        bg.fillStyle(0x2a1a08, 1);
        bg.lineStyle(2, 0xffd060, 1);
      } else if (hover) {
        bg.fillStyle(0x1a1008, 1);
        bg.lineStyle(1, 0xa05018, 0.9);
      } else {
        bg.fillStyle(0x0c0906, 0.9);
        bg.lineStyle(1, 0x1e1008, 0.5);
      }
      bg.fillRect(cx - w / 2, cy - h / 2, w, h);
      bg.strokeRect(cx - w / 2, cy - h / 2, w, h);
    };
    drawBg(false);

    // Cog 뱃지
    const cogTxt = this.add.text(cx - w * 0.35, cy - h * 0.42, `Cog${char.cog}`, {
      fontSize: FontManager.adjustedSize(9, this.scale),
      fill: cogC.css, fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setAlpha(alpha);
    container.add(cogTxt);

    // 직업
    const jobTxt = this.add.text(cx + w * 0.4, cy - h * 0.42, char.jobLabel, {
      fontSize: FontManager.adjustedSize(9, this.scale),
      fill: '#4a3020', fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5).setAlpha(alpha);
    container.add(jobTxt);

    // 스프라이트
    let spriteImg = null;
    if (!disabled && this.textures.exists(char.spriteKey)) {
      spriteImg = this.add.image(cx, cy - h * 0.08, char.spriteKey)
        .setDisplaySize(w * 0.72, w * 0.72);
      container.add(spriteImg);
    }

    // 이름
    const nameTxt = this.add.text(cx, cy + h * 0.3, char.name, {
      fontSize: FontManager.adjustedSize(11, this.scale),
      fill: disabled ? '#2a1a0a' : '#c8bfb0', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(alpha);
    container.add(nameTxt);

    // HP 바
    const hpRatio = (char.currentHp || 0) / (char.maxHp || 1);
    const barW    = w * 0.8;
    const barH    = Math.round(H * 0.008);
    const barX    = cx - barW / 2;
    const barY    = cy + h * 0.42;
    const hpBar   = this.add.graphics().setAlpha(alpha);
    hpBar.fillStyle(0x1a1008, 1);
    hpBar.fillRect(barX, barY, barW, barH);
    const hpFill  = hpRatio > 0.7 ? 0x40a060 : hpRatio > 0.3 ? 0xa0a020 : 0xa03018;
    hpBar.fillStyle(hpFill, 1);
    hpBar.fillRect(barX, barY, barW * hpRatio, barH);
    container.add(hpBar);

    // 파티 편성 중 표시
    const inPartMark = this.add.text(cx, cy - h * 0.28, '▶ 편성중', {
      fontSize: FontManager.adjustedSize(9, this.scale),
      fill: '#ffd060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0);
    container.add(inPartMark);

    // 비활성 오버레이
    if (disabled) {
      const overBg = this.add.graphics();
      overBg.fillStyle(0x050407, 0.45);
      overBg.fillRect(cx - w / 2, cy - h / 2, w, h);
      container.add(overBg);

      const lockTxt = this.add.text(cx, cy, `Cog ${char.cog}\n상한 초과`, {
        fontSize: FontManager.adjustedSize(10, this.scale),
        fill: '#3d2010', fontFamily: FontManager.MONO, align: 'center',
      }).setOrigin(0.5);
      container.add(lockTxt);
    }

    // hit (씬에 직접, 마스크 밖에서도 판정 통일)
    if (!disabled) {
      const hit = this.add.rectangle(cx, cy, w, h, 0x000000, 0)
        .setInteractive({ useHandCursor: true }).setDepth(20);
      this._sceneHits.push(hit);

      hit.on('pointerover', () => {
        drawBg(true);
        if (nameTxt) nameTxt.setStyle({ fill: '#c8a070' });
      });
      hit.on('pointerout', () => {
        drawBg(false);
        if (nameTxt) nameTxt.setStyle({ fill: '#c8bfb0' });
      });
      hit.on('pointerdown', () => {
        if (inPart()) {
          this._removeFromPartyById(char.id);
        } else {
          this._addToParty(char.id);
        }
      });
    }

    return { bg, drawBg, cogTxt, nameTxt, inPartMark, spriteImg };
  }

  // ── 파티 조작 ────────────────────────────────────────────────────
  _addToParty(charId) {
    if (this._party.includes(charId)) return;
    // 인원 제한 없음 — Arc 비용(cog 합산)으로 압박
    // 표시 슬롯(VISIBLE_SLOTS=8) 초과 시 추후 스크롤 구현 예정
    this._party.push(charId);
    this._refreshPartySlots();
    this._refreshCharListMarks();
    this._refreshStartBtn();
  }

  _removeFromParty(slotIdx) {
    if (this._party[slotIdx] == null) return;
    this._party.splice(slotIdx, 1);
    this._refreshPartySlots();
    this._refreshCharListMarks();
    this._refreshStartBtn();
  }

  _removeFromPartyById(charId) {
    const idx = this._party.indexOf(charId);
    if (idx !== -1) this._removeFromParty(idx);
  }

  _refreshCharListMarks() {
    this._cardObjs.forEach(({ char, drawBg, inPartMark }) => {
      const inP = this._party.includes(char.id);
      drawBg(false);
      if (inPartMark) inPartMark.setAlpha(inP ? 1 : 0);
    });
  }

  // ── 하단 버튼 ────────────────────────────────────────────────────
  _buildFooter(W, H) {
    const btnY = H * 0.91;
    const btnW = Math.round(W * 0.14);
    const btnH = Math.round(H * 0.055);

    // 출발 버튼
    const startBg = this.add.graphics();
    const startTxt = this.add.text(W / 2, btnY, '출  발', {
      fontSize: FontManager.adjustedSize(18, this.scale),
      fill: '#c8a070', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const drawStartBtn = (state) => {
      startBg.clear();
      if (state === 'disabled') {
        startBg.fillStyle(0x0a0807, 1);
        startBg.lineStyle(1, 0x1a1008, 0.5);
        startTxt.setStyle({ fill: '#2a1a0a' });
      } else if (state === 'hover') {
        startBg.fillStyle(0x2a1a08, 1);
        startBg.lineStyle(2, 0xc8a070, 1);
        startTxt.setStyle({ fill: '#e8d090' });
      } else {
        startBg.fillStyle(0x1e1008, 1);
        startBg.lineStyle(2, 0xa05018, 0.9);
        startTxt.setStyle({ fill: '#c8a070' });
      }
      startBg.fillRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
      startBg.strokeRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
    };

    this._drawStartBtn  = drawStartBtn;
    this._startBtnState = 'disabled';
    drawStartBtn('disabled');

    const startHit = this.add.rectangle(W / 2, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(20);
    this._sceneHits.push(startHit);
    this._startBtnHit = startHit;

    startHit.on('pointerover', () => {
      if (this._startBtnState !== 'disabled') drawStartBtn('hover');
    });
    startHit.on('pointerout', () => {
      if (this._startBtnState !== 'disabled') drawStartBtn('active');
    });
    startHit.on('pointerdown', () => {
      if (this._startBtnState === 'disabled') return;
      this._depart();
    });

    // 파티 인원 카운트 표시
    this._partyCountTxt = this.add.text(W / 2, btnY - btnH / 2 - 14, '', {
      fontSize: FontManager.adjustedSize(11, this.scale),
      fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    this._refreshStartBtn();
  }

  // Arc 비용 = 파티 내 캐릭터 cog 합산
  // TODO: 추후 음식 시스템 개발 후 Arc 비용을 음식 소모로 대체 예정
  _calcPartyCost() {
    return this._party.reduce((sum, id) => {
      const c = this._chars.find(ch => ch.id === id);
      return sum + (c ? c.cog : 0);
    }, 0);
  }

  _refreshStartBtn() {
    const count   = this._party.length;
    const cost    = this._calcPartyCost();
    const arc     = SaveManager.getArc();
    const canAfford = arc >= cost;
    const hasParty  = count > 0;
    const canStart  = hasParty && canAfford;

    this._startBtnState = canStart ? 'active' : 'disabled';
    this._drawStartBtn(this._startBtnState);

    // 비용 / 인원 표시
    const costColor = canAfford ? '#a05018' : '#a03018';
    const arcColor  = canAfford ? '#c8a070' : '#cc4444';
    this._partyCountTxt.setText(
      `파티 ${count}명  |  비용 ${cost} Arc  (보유 ${arc})`
    );
    this._partyCountTxt.setStyle({ fill: canStart ? costColor : '#5a2a2a' });
  }

  // ── 출발 ─────────────────────────────────────────────────────────
  _depart() {
    const cost = this._calcPartyCost();

    // Arc 차감 (부족 시 방어)
    const ok = SaveManager.spendArc(cost);
    if (!ok) {
      this._refreshStartBtn(); // 버튼 상태 재갱신
      return;
    }

    // 탐사 파티 저장
    CharacterManager.saveParty(this._party);

    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);

    this.tweens.add({
      targets: flash, alpha: 1, duration: 350, ease: 'Sine.easeIn',
      onComplete: () => {
        // 탐사 파티 확정 → 난이도 선택(ExploreScene)으로 진입
        // ExploreScene에서 Cog 선택 후 BattleReadyScene(전투파티 재편성) → BattleScene
        this.scene.start('ExploreScene', { from: 'PartyScene' });
      },
    });
  }

  // ── 정리 ─────────────────────────────────────────────────────────
  shutdown() {
    this._sceneHits.forEach(h => { try { h.destroy(); } catch (e) {} });
    this._sceneHits = [];
  }
}
