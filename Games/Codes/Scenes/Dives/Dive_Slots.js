// ================================================================
//  Dive_Slots.js
//  경로: Games/Codes/Scenes/Dives/Dive_Slots.js
//
//  역할: DiveScene 슬롯 3개 + 레버 빌드 및 스핀 로직
//  호출:
//    DiveBuildSlotArea(scene, W, H)        → create() 에서 호출
//    DiveStartSpin(scene)                  → 레버 당길 때
//    DiveOnSlotStopped(scene, idx)         → 각 슬롯 정지 시
//    DiveEnableCardSelection(scene)        → 전체 정지 후
//    DiveChooseCard(scene, idx)            → 카드 선택 시
//    DiveResetSlots(scene)                 → 재굴림 시
// ================================================================

// ── 슬롯 카드 정의 ────────────────────────────────────────────────
const DIVE_SLOT_CARDS = [
  { type: 'normal', label: '일  반  전', desc: '무작위 이형이 출현한다',            color: '#8a9060', borderHex: 0x505828, weight: 5 },
  { type: 'wave',   label: '웨  이  브', desc: '다수의 이형이 떼를 지어 몰려온다',  color: '#406090', borderHex: 0x284868, weight: 3 },
  { type: 'raid',   label: '레  이  드', desc: '강대한 이형 하나가 단독으로 나타난다', color: '#904030', borderHex: 0x682818, weight: 2 },
];

function _diveDrawCard() {
  const total = DIVE_SLOT_CARDS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const card of DIVE_SLOT_CARDS) { r -= card.weight; if (r <= 0) return card; }
  return DIVE_SLOT_CARDS[0];
}
function _makeDiveStrip(count) {
  return Array.from({ length: count }, () => _diveDrawCard());
}

// ════════════════════════════════════════════════════════════════
//  슬롯 영역 빌드
// ════════════════════════════════════════════════════════════════
function DiveBuildSlotArea(scene, W, H) {
  const fs       = n => FontManager.adjustedSize(n, scene.scale);
  const tabW     = W * 0.10;
  const topH     = H * 0.13;
  const areaX    = tabW;
  const areaY    = topH;
  const areaW    = W - tabW;
  const areaH    = H - topH;   // 하단 패널 없음 — 풀 높이

  // 힌트 텍스트
  scene._hintText = scene.add.text(
    areaX + areaW * 0.44, areaY + areaH * 0.10,
    '슬롯을 돌려 라운드를 결정하십시오', {
      fontSize: fs(12), fill: '#2a1508', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

  scene.add.text(
    areaX + areaW * 0.44, areaY + areaH * 0.04,
    `ROUND  ${scene._round}  —  SELECT ENCOUNTER`, {
      fontSize: fs(10), fill: '#1e1008', fontFamily: FontManager.MONO, letterSpacing: 3,
    }).setOrigin(0.5);

  const lineG = scene.add.graphics();
  lineG.lineStyle(1, 0x2a1a0a, 0.6);
  lineG.lineBetween(areaX + 8, areaY + areaH * 0.16, areaX + areaW * 0.88, areaY + areaH * 0.16);

  // 슬롯 3칸
  const slotZoneW = areaW * 0.86;
  const cardW     = slotZoneW * 0.26;
  const cardH     = areaH * 0.72;
  const cardY     = areaY + areaH * 0.57;
  const gap       = (slotZoneW - cardW * 3) / 4;
  const startX    = areaX + gap + cardW / 2;

  scene._slots = [];
  for (let i = 0; i < 3; i++) {
    const cx = startX + i * (cardW + gap);
    scene._slots.push(_diveBuildOneSlot(scene, cx, cardY, cardW, cardH));
  }

  // 레버
  _diveBuildLever(scene, areaX, areaY, areaW, areaH, fs);
}

function _diveBuildOneSlot(scene, cx, cy, cw, ch) {
  const frame = scene.add.graphics();
  frame.lineStyle(1, 0x2a1a0a, 0.6);
  frame.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);

  const maskShape = scene.make.graphics({});
  maskShape.fillStyle(0xffffff, 1);
  maskShape.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
  const mask = maskShape.createGeometryMask();

  const strip   = _makeDiveStrip(22);
  const stripCt = scene.add.container(cx, cy - ch / 2);
  stripCt.setMask(mask);

  _diveRenderStrip(scene, stripCt, strip, cw, ch);

  const hitArea = scene.add.rectangle(cx, cy, cw, ch, 0, 0).setDepth(5);
  return { frame, stripCt, mask, strip, cx, cy, cw, ch, stopped: false, targetCard: null, hitArea };
}

function _diveRenderStrip(scene, container, strip, cw, ch) {
  strip.forEach((card, j) => {
    const cardY = j * ch;
    const bg = scene.add.graphics();
    bg.fillStyle(0x0e0c08, 1);
    bg.lineStyle(1, card.borderHex, 0.5);
    bg.fillRect(-cw / 2, cardY, cw, ch);
    bg.strokeRect(-cw / 2, cardY, cw, ch);

    const mainTxt = scene.add.text(0, cardY + ch * 0.38, card.label, {
      fontSize: FontManager.adjustedSize(16, scene.scale),
      fill: card.color, fontFamily: FontManager.TITLE,
      align: 'center', wordWrap: { width: cw * 0.85 },
    }).setOrigin(0.5);

    const descTxt = scene.add.text(0, cardY + ch * 0.62, card.desc, {
      fontSize: FontManager.adjustedSize(9, scene.scale),
      fill: card.color, fontFamily: FontManager.MONO,
      alpha: 0.7, align: 'center', wordWrap: { width: cw * 0.82 },
    }).setOrigin(0.5);

    container.add([bg, mainTxt, descTxt]);
  });
}

// ── 레버 ─────────────────────────────────────────────────────────
function _diveBuildLever(scene, areaX, areaY, areaW, areaH, fs) {
  const leverX  = areaX + areaW * 0.92;
  const leverCY = areaY + areaH * 0.52;
  const leverW  = Math.round(areaW * 0.075);
  const leverH  = Math.round(areaH * 0.55);

  scene._leverX      = leverX;
  scene._leverCY     = leverCY;
  scene._leverW      = leverW;
  scene._leverH      = leverH;
  scene._leverKnobY  = leverCY - leverH * 0.35;

  const leverBg = scene.add.graphics();
  scene._drawLever = (state) => {
    leverBg.clear();
    if      (state === 'disabled') { leverBg.fillStyle(0x080a08,1); leverBg.lineStyle(1,0x1a2a1a,0.4); }
    else if (state === 'hover')    { leverBg.fillStyle(0x1a3a1a,1); leverBg.lineStyle(2,0x70d070,1);   }
    else if (state === 'active')   { leverBg.fillStyle(0x142014,1); leverBg.lineStyle(2,0x50a050,0.9); }
    else                           { leverBg.fillStyle(0x0a280a,1); leverBg.lineStyle(2,0x80ff80,1);   }
    leverBg.fillRect(leverX - leverW/2, leverCY - leverH/2, leverW, leverH);
    leverBg.strokeRect(leverX - leverW/2, leverCY - leverH/2, leverW, leverH);
  };
  scene._drawLever('active');

  // 기둥
  scene.add.graphics().lineStyle(3, 0x305030, 0.8)
    .lineBetween(leverX, leverCY - leverH * 0.35, leverX, leverCY + leverH * 0.1);

  // 손잡이
  scene._leverKnob = scene.add.graphics();
  _diveDrawKnob(scene, scene._leverKnobY);

  // 라벨
  scene._leverLabelTxt = scene.add.text(leverX, leverCY + leverH * 0.38, '▶ 당기기', {
    fontSize: fs(9), fill: '#50a050', fontFamily: FontManager.MONO,
  }).setOrigin(0.5);
  scene._rerollTxt = scene.add.text(leverX, leverCY + leverH * 0.52, `◈ ${scene._deepCoin}`, {
    fontSize: fs(9), fill: '#2a3a50', fontFamily: FontManager.MONO,
  }).setOrigin(0.5).setAlpha(0);

  const hit = scene.add.rectangle(leverX, leverCY, leverW, leverH, 0, 0)
    .setInteractive({ useHandCursor: true }).setDepth(10);
  scene._leverHit = hit;
  scene._sceneHits.push(hit);

  hit.on('pointerover', () => {
    if (scene._phase === 'idle')    { scene._drawLever('hover'); scene._leverLabelTxt.setStyle({ fill: '#80ff80' }); }
    if (scene._phase === 'stopped' && scene._deepCoin > 0) { scene._drawLever('hover'); scene._rerollTxt.setStyle({ fill: '#6ab0e0' }); }
  });
  hit.on('pointerout', () => {
    if (scene._phase === 'idle')    { scene._drawLever('active'); scene._leverLabelTxt.setStyle({ fill: '#50a050' }); }
    if (scene._phase === 'stopped') { scene._drawLever('active'); scene._rerollTxt.setStyle({ fill: '#2a3a50' }); }
  });
  hit.on('pointerdown', () => {
    if (scene._phase === 'idle') {
      scene._drawLever('pulling');
      _diveAnimLeverPull(scene, () => DiveStartSpin(scene));
    } else if (scene._phase === 'stopped' && scene._deepCoin > 0) {
      scene._deepCoin -= 1;
      if (scene._deepCoinTxt) scene._deepCoinTxt.setText(`${scene._deepCoin}`);
      scene._rerollTxt.setText(`◈ ${scene._deepCoin}`);
      DiveResetSlots(scene);
      _diveAnimLeverPull(scene, () => DiveStartSpin(scene));
    }
  });
}

function _diveDrawKnob(scene, y) {
  scene._leverKnob.clear();
  scene._leverKnob.fillStyle(0x60a060, 1);
  scene._leverKnob.fillCircle(scene._leverX, y, scene._leverW * 0.28);
  scene._leverKnob.lineStyle(2, 0x80d080, 0.8);
  scene._leverKnob.strokeCircle(scene._leverX, y, scene._leverW * 0.28);
}

function _diveAnimLeverPull(scene, onComplete) {
  const startY = scene._leverKnobY;
  const pullY  = scene._leverCY + scene._leverH * 0.1;
  let   progress = 0;
  scene.time.addEvent({
    delay: 16, repeat: 18,
    callback: () => {
      progress++;
      const y = progress <= 9
        ? startY + (pullY - startY) * (progress / 9)
        : pullY  + (startY - pullY) * ((progress - 9) / 9);
      _diveDrawKnob(scene, y);
      if (progress >= 18) { _diveDrawKnob(scene, startY); onComplete && onComplete(); }
    },
  });
}

// ════════════════════════════════════════════════════════════════
//  스핀 로직
// ════════════════════════════════════════════════════════════════
function DiveStartSpin(scene) {
  scene._phase     = 'spinning';
  scene._results   = [null, null, null];
  scene._chosen    = -1;
  scene._canChoose = false;

  scene._drawLever('disabled');
  scene._leverHit.disableInteractive();
  scene._leverLabelTxt.setStyle({ fill: '#2a4a2a' });
  scene._rerollTxt.setAlpha(0);
  scene._hintText.setText('라운드를 결정하는 중...');
  scene._hintText.setStyle({ fill: '#2a1508' });

  const stopDelays = [1400, 2200, 3000];
  scene._slots.forEach((slot, i) => {
    slot.targetCard = slot.strip[slot.strip.length - 2];
    slot.stopped    = false;
    slot.stripCt.setY(slot.cy - slot.ch / 2);

    scene.tweens.add({
      targets:  slot.stripCt,
      y:        slot.cy - slot.ch / 2 - slot.ch * (slot.strip.length - 2),
      duration: stopDelays[i] + 600,
      ease:     'Cubic.easeOut',
      onComplete: () => {
        slot.stopped     = true;
        scene._results[i] = slot.targetCard;
        DiveOnSlotStopped(scene, i);
      },
    });
  });

  let dotCount = 0;
  scene._spinTimer = scene.time.addEvent({
    delay: 400, loop: true,
    callback: () => {
      scene._hintText.setText('라운드를 결정하는 중  ' + ['·','· ·','· · ·'][dotCount++%3]);
    },
  });
}

function DiveOnSlotStopped(scene, idx) {
  const slot = scene._slots[idx];
  slot.frame.clear();
  slot.frame.lineStyle(2, slot.targetCard.borderHex, 1);
  slot.frame.strokeRect(slot.cx - slot.cw/2, slot.cy - slot.ch/2, slot.cw, slot.ch);

  if (!scene._slots.every(s => s.stopped)) return;

  if (scene._spinTimer) scene._spinTimer.remove();
  scene._phase     = 'stopped';
  scene._canChoose = true;
  scene._hintText.setText('라운드 유형을 선택하십시오');
  scene._hintText.setStyle({ fill: '#8a6040' });

  if (scene._deepCoin > 0) {
    scene._drawLever('active');
    scene._leverLabelTxt.setText('◈ 재굴림').setStyle({ fill: '#2a3a50' });
    scene._rerollTxt.setText(`심해화폐 ${scene._deepCoin}`).setAlpha(1);
    scene._leverHit.setInteractive({ useHandCursor: true });
  } else {
    scene._drawLever('disabled');
    scene._leverLabelTxt.setText('재굴림 불가').setStyle({ fill: '#2a1a0a' });
  }

  DiveEnableCardSelection(scene);
}

function DiveEnableCardSelection(scene) {
  scene._slots.forEach((slot, i) => {
    const hit = slot.hitArea;
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      if (scene._chosen >= 0) return;
      slot.frame.clear();
      slot.frame.lineStyle(2, slot.targetCard.borderHex, 1);
      slot.frame.fillStyle(0x140c05, 0.3);
      slot.frame.fillRect(slot.cx-slot.cw/2, slot.cy-slot.ch/2, slot.cw, slot.ch);
      slot.frame.strokeRect(slot.cx-slot.cw/2, slot.cy-slot.ch/2, slot.cw, slot.ch);
    });
    hit.on('pointerout', () => {
      if (scene._chosen >= 0) return;
      slot.frame.clear();
      slot.frame.lineStyle(2, slot.targetCard.borderHex, 1);
      slot.frame.strokeRect(slot.cx-slot.cw/2, slot.cy-slot.ch/2, slot.cw, slot.ch);
    });
    hit.on('pointerdown', () => {
      if (!scene._canChoose || scene._chosen >= 0) return;
      DiveChooseCard(scene, i);
    });
  });
}

function DiveChooseCard(scene, idx) {
  scene._chosen    = idx;
  scene._canChoose = false;
  scene._phase     = 'chosen';

  scene._drawLever('disabled');
  scene._leverHit.disableInteractive();
  scene._rerollTxt.setAlpha(0);

  const chosen = scene._slots[idx];
  chosen.frame.clear();
  chosen.frame.lineStyle(3, chosen.targetCard.borderHex, 1);
  chosen.frame.fillStyle(0x1e1008, 0.4);
  chosen.frame.fillRect(chosen.cx-chosen.cw/2, chosen.cy-chosen.ch/2, chosen.cw, chosen.ch);
  chosen.frame.strokeRect(chosen.cx-chosen.cw/2, chosen.cy-chosen.ch/2, chosen.cw, chosen.ch);

  scene._slots.forEach((slot, i) => {
    if (i === idx) return;
    slot.frame.clear();
    slot.frame.lineStyle(1, 0x1a1008, 0.3);
    slot.frame.fillStyle(0x000000, 0.55);
    slot.frame.fillRect(slot.cx-slot.cw/2, slot.cy-slot.ch/2, slot.cw, slot.ch);
    slot.frame.strokeRect(slot.cx-slot.cw/2, slot.cy-slot.ch/2, slot.cw, slot.ch);
    slot.hitArea.disableInteractive();
  });

  const card = chosen.targetCard;
  scene._hintText.setText(`${card.label.replace(/\s/g,'')}  —  전투 진입`);
  scene._hintText.setStyle({ fill: card.color });

  scene._log.push({
    round: scene._round, type: card.type, result: 'pending',
    note:  `R${scene._round}  ${card.label.replace(/\s/g,'')}`,
  });

  scene.time.delayedCall(800, () => scene._enterBattle(card.type));
}

function DiveResetSlots(scene) {
  scene._slots.forEach(slot => {
    slot.stopped = false;
    const ns = _makeDiveStrip(22);
    slot.strip = ns;
    slot.stripCt.removeAll(true);
    _diveRenderStrip(scene, slot.stripCt, ns, slot.cw, slot.ch);
    slot.frame.clear();
    slot.frame.lineStyle(1, 0x2a1a0a, 0.6);
    slot.frame.strokeRect(slot.cx-slot.cw/2, slot.cy-slot.ch/2, slot.cw, slot.ch);
    slot.hitArea.disableInteractive();
  });
  scene._phase = 'idle';
  scene._drawLever('active');
  scene._leverLabelTxt.setText('▶ 당기기').setStyle({ fill: '#50a050' });
  scene._leverHit.setInteractive({ useHandCursor: true });
}
