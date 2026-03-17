// ================================================================
//  BattleScene.js
//  경로: Games/Codes/Scenes/BattleScene.js
//
//  역할: 전투 편성 + 인게임 자동전투 통합
//
//  ── 페이즈 1: 편성 (phase = 'setup') ──────────────────────────
//    - 좌측: 탐사 파티 체스판형 초상화 그리드 (3열)
//    - 하단 (우측 영역): 전투 배치 슬롯 (클릭으로 추가/제거)
//    - 중앙 (우측 영역 중앙): [  진 행  ] 버튼
//    - 적 영역(상단)은 이미 표시 — 적 정보 미리 보임
//
//  ── 페이즈 2: 전투 (phase = 'battle') ─────────────────────────
//    - 좌측 편성 패널 slide-out
//    - 우측: 전투 로그 피드
//    - 아군 초상화 (하단 원형) 자동 전투 시작
//    - 종료 → 결산 팝업 → DiveScene 복귀 or AtelierScene
//
//  진입 데이터:
//    { cogMax, battleParty, round, battleType, maxRound, deepCoin, log,
//      inventory, submarine, shopItems }
//    battleParty = 탐사 파티 전원 id (편성 풀)
//    battleType  = 'normal' | 'wave' | 'raid'
//    inventory / submarine / shopItems = 탐사 내 라운드 간 유지 데이터
//
//  전투 유형:
//    normal — 가중치 추첨
//    wave   — 침수자 강제, spawnCount +2 부스트
//    raid   — 최강 이형 1마리, 스탯 ×2.5
//
//  TODO:
//    - 스킬 발동 (게이지 충전 후 초상화 클릭)
//    - 포지션(공격 범위) 적용
//    - 패시브 자동 발동
// ================================================================

class BattleScene extends Phaser.Scene {
  constructor() { super({ key: 'BattleScene' }); }

  // ── 진입 데이터 ──────────────────────────────────────────────────
  init(data) {
    this._cogMax      = data.cogMax      || 1;
    this._battleParty = data.battleParty || [];
    this._round       = data.round       || 1;
    this._battleType  = data.battleType  || 'normal';
    this._maxRound    = data.maxRound    || 5;
    this._deepCoin    = data.deepCoin    || 0;
    this._log         = data.log         || [];
    // 탐사 내 라운드 간 유지 데이터 (DiveScene ↔ BattleScene 왕복)
    this._inventory   = data.inventory   || null;
    this._submarine   = data.submarine   || null;
    this._shopItems   = data.shopItems   || null;
  }

  // ── 씬 생성 ──────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    // 전투 중엔 DiveScene으로 복귀 기록 — 전투 상태 재현은 불가하므로
    // 라운드는 현재 라운드 그대로 유지 (같은 라운드 슬롯부터 재시작)
    SaveManager.saveCurrentScene('DiveScene', {
      cogMax:      this._cogMax,
      round:       this._round,
      maxRound:    this._maxRound,
      deepCoin:    this._deepCoin,
      log:         this._log,
      battleParty: this._battleParty,
      inventory:   this._inventory,
      submarine:   this._submarine,
      shopItems:   this._shopItems,
    });

    this._phase        = 'setup';
    this._battleActive = false;
    this._attackTimers = [];
    this._logLines     = [];
    this._allyObjs     = [];
    this._enemyObjs    = [];
    this._sceneHits    = [];
    this._allChars     = CharacterManager.loadAll() || [];

    // 탐사 파티 (편성 풀) — dead_chip/gone 제외
    this._partyChars = this._battleParty
      .map(id => this._allChars.find(c => c.id === id))
      .filter(c => c && (!c.status || c.status === 'alive' || c.status === 'ai'));

    // 전투 편성 결과
    this._combatParty = [];

    // 적 생성
    this._enemies = this._spawnEnemies(this._cogMax);

    this._buildBackground(W, H);
    this._buildHUD(W, H);
    this._buildEnemyArea(W, H);
    this._buildSetupPanel(W, H);
    this._buildLogArea(W, H);
  }

  // ════════════════════════════════════════════════════════════════
  //  적 생성
  // ════════════════════════════════════════════════════════════════
  _spawnEnemies(cogMax) {
    if (this._battleType === 'raid') return this._spawnRaid(cogMax);
    if (this._battleType === 'wave') return this._spawnWave(cogMax);
    return this._spawnNormal(cogMax);
  }

  _spawnNormal(cogMax) {
    const pool = ENEMY_DATA.filter(e =>
      e.cogMin <= cogMax && (e.cogMax === null || e.cogMax >= cogMax)
    );
    if (!pool.length) return [];
    const totalW = pool.reduce((s, e) => s + e.spawnWeight, 0);
    let r = Math.random() * totalW, picked = pool[0];
    for (const e of pool) { r -= e.spawnWeight; if (r <= 0) { picked = e; break; } }
    const [minC, maxC] = picked.spawnCount;
    const count  = minC + Math.floor(Math.random() * (maxC - minC + 1));
    const scaled = getEnemyScaledStats(picked.id, cogMax);
    return this._buildEnemyArray(picked, scaled, count);
  }

  _spawnWave(cogMax) {
    const pool = ENEMY_DATA.filter(e =>
      e.cogMin <= cogMax && (e.cogMax === null || e.cogMax >= cogMax)
    );
    if (!pool.length) return this._spawnNormal(cogMax);
    let picked = pool.find(e => e.id === 'drowned')
      || pool.reduce((best, e) => e.spawnCount[1] > best.spawnCount[1] ? e : best, pool[0]);
    const [minC, maxC] = picked.spawnCount;
    const count  = (minC + 1) + Math.floor(Math.random() * (maxC - minC + 3));
    const scaled = getEnemyScaledStats(picked.id, cogMax);
    const enemies = this._buildEnemyArray(picked, scaled, count);
    if (picked.waveBonus) {
      const { attackBonus, hpBonus } = picked.waveBonus;
      const bonus = enemies.length - 1;
      enemies.forEach(e => {
        e.attack = Math.round(e.attack * (1 + attackBonus * bonus));
        e._hp    = Math.round(e._hp    * (1 + hpBonus    * bonus));
        e._maxHp = e._hp;
      });
    }
    return enemies;
  }

  _spawnRaid(cogMax) {
    const pool = ENEMY_DATA.filter(e =>
      e.cogMin <= cogMax && (e.cogMax === null || e.cogMax >= cogMax)
    );
    if (!pool.length) return [];
    const picked = pool.reduce((best, e) =>
      e.baseStats.hp > best.baseStats.hp ? e : best, pool[0]);
    const scaled = getEnemyScaledStats(picked.id, cogMax);
    const M = 2.5;
    return [{
      _uid: `e_raid_${Date.now()}`, id: picked.id,
      name: `[레이드] ${picked.name}`, behavior: picked.behavior,
      _hp: Math.round(scaled.hp * M), _maxHp: Math.round(scaled.hp * M),
      attack: Math.round(scaled.attack * M),
      agility: Math.round(scaled.agility * 1.2),
      luck:    Math.round(scaled.luck    * 1.5),
      _dead: false, _attackCount: 0,
    }];
  }

  _buildEnemyArray(picked, scaled, count) {
    return Array.from({ length: count }, (_, i) => ({
      _uid: `e_${i}_${Date.now()}`, id: picked.id,
      name: picked.name, behavior: picked.behavior,
      _hp: scaled.hp, _maxHp: scaled.hp,
      attack: scaled.attack, agility: scaled.agility, luck: scaled.luck,
      _dead: false, _attackCount: 0,
    }));
  }

  // ════════════════════════════════════════════════════════════════
  //  배경 / HUD
  // ════════════════════════════════════════════════════════════════
  _buildBackground(W, H) {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    const grid = this.add.graphics();
    const step = Math.round(W / 60);
    grid.lineStyle(1, 0x0d0a06, 0.5);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    this.add.text(W / 2, H / 2, 'BATTLE', {
      fontSize: FontManager.adjustedSize(100, this.scale),
      fill: '#0a0705', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.05);
  }

  _buildHUD(W, H) {
    const fs = n => FontManager.adjustedSize(n, this.scale);
    this.add.text(W * 0.05, H * 0.03, `ROUND  ${this._round} / ${this._maxRound}`, {
      fontSize: fs(14), fill: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const TYPE_LABELS = { normal: '일  반  전', wave: '웨  이  브', raid: '레  이  드' };
    const TYPE_COLORS = { normal: '#8a9060', wave: '#406090', raid: '#904030' };
    this.add.text(W * 0.5, H * 0.03,
      TYPE_LABELS[this._battleType] || '일  반  전', {
        fontSize: fs(13), fill: TYPE_COLORS[this._battleType] || '#8a9060',
        fontFamily: FontManager.MONO, letterSpacing: 2,
      }).setOrigin(0.5, 0.5);

    const cogC = CharacterManager.getCogColor(this._cogMax);
    this.add.text(W * 0.95, H * 0.03, `COG  ${this._cogMax}`, {
      fontSize: fs(14), fill: cogC.css, fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.8);
    lg.lineBetween(0, H * 0.06, W, H * 0.06);
  }

  // ════════════════════════════════════════════════════════════════
  //  적 영역 (상단 30%)
  // ════════════════════════════════════════════════════════════════
  _buildEnemyArea(W, H) {
    const areaY = H * 0.06, areaH = H * 0.30;
    const count = this._enemies.length;
    const unitW = Math.min(W * 0.18, areaH * 0.7);
    const gap   = W * 0.03;
    const totalW = count * unitW + (count - 1) * gap;
    const startX = W / 2 - totalW / 2 + unitW / 2;

    this._enemies.forEach((enemy, i) => {
      const cx = startX + i * (unitW + gap);
      const cy = areaY + areaH * 0.45;
      this._enemyObjs.push(this._makeEnemyUnit(enemy, cx, cy, unitW));
    });

    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.6);
    lg.lineBetween(W * 0.02, areaY + areaH, W * 0.98, areaY + areaH);
  }

  _makeEnemyUnit(enemy, cx, cy, size) {
    const fs = n => FontManager.adjustedSize(n, this.scale);
    const half = size * 0.38;

    const shape = this.add.graphics();
    shape.fillStyle(0x3a1a0a, 1);
    shape.lineStyle(2, 0xa03018, 0.9);
    shape.fillRect(cx - half, cy - half, half * 2, half * 2);
    shape.strokeRect(cx - half, cy - half, half * 2, half * 2);

    const nameTxt = this.add.text(cx, cy - half - Math.round(size * 0.04), enemy.name, {
      fontSize: fs(11), fill: '#c8a060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);

    const barW = size * 0.9, barH = Math.max(6, Math.round(size * 0.1));
    const barY = cy + half + Math.round(size * 0.06);
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x1a0a06, 1);
    hpBg.fillRect(cx - barW / 2, barY, barW, barH);
    const hpFg = this.add.graphics();
    const hpNumTxt = this.add.text(cx, barY + barH + Math.round(size * 0.03), '', {
      fontSize: fs(9), fill: '#a06040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    const refreshHp = () => {
      const pct = enemy._maxHp > 0 ? enemy._hp / enemy._maxHp : 0;
      const col = pct > 0.6 ? 0xa03018 : pct > 0.3 ? 0x904020 : 0x601010;
      hpFg.clear();
      if (pct > 0) {
        hpFg.fillStyle(col, 1);
        hpFg.fillRect(cx - barW / 2, barY, Math.max(1, Math.round(barW * pct)), barH);
      }
      hpNumTxt.setText(`${enemy._hp} / ${enemy._maxHp}`);
    };
    refreshHp();
    return { enemy, shape, nameTxt, hpBg, hpFg, hpNumTxt, refreshHp, cx, cy, half };
  }

  // ════════════════════════════════════════════════════════════════
  //  편성 패널 (좌측 고정 + 하단 슬롯 + 중앙 진행 버튼)
  // ════════════════════════════════════════════════════════════════
  _buildSetupPanel(W, H) {
    const fs     = n => FontManager.adjustedSize(n, this.scale);
    this._setupContainer = this.add.container(0, 0).setDepth(10);

    // ── 좌측 패널 배경 ────────────────────────────────────────────
    const panelW = W * 0.24;
    const panelY = H * 0.06;
    const panelH = H * 0.94;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x080608, 0.93);
    panelBg.lineStyle(1, 0x2a1a0a, 0.8);
    panelBg.fillRect(0, panelY, panelW, panelH);
    panelBg.strokeRect(0, panelY, panelW, panelH);
    this._setupContainer.add(panelBg);

    const labelTxt = this.add.text(panelW / 2, panelY + H * 0.025, '전  투  편  성', {
      fontSize: fs(13), fill: '#4a2a10', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    this._setupContainer.add(labelTxt);

    const subTxt = this.add.text(panelW / 2, panelY + H * 0.055,
      '클릭으로 배치 / 제거', {
        fontSize: fs(9), fill: '#2a1508', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
    this._setupContainer.add(subTxt);

    // ── 체스판형 그리드 ───────────────────────────────────────────
    const gridTopY  = panelY + H * 0.08;
    const cols      = 3;
    const cardW     = Math.round((panelW - 16) / cols) - 4;
    const cardH     = Math.round(cardW * 1.18);
    const gapX = Math.round(H * 0.004), gapY = Math.round(H * 0.004);
    const gridW     = cols * cardW + (cols - 1) * gapX;
    const gridStartX = panelW / 2 - gridW / 2 + cardW / 2;

    this._setupCardObjs = [];

    this._partyChars.forEach((char, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = gridStartX + col * (cardW + gapX);
      const cy  = gridTopY   + row * (cardH + gapY) + cardH / 2;

      const inCombat = () => this._combatParty.includes(char.id);
      const cogC     = CharacterManager.getCogColor(char.cog);

      const bg = this.add.graphics();
      const drawBg = (hover) => {
        bg.clear();
        if (inCombat()) {
          bg.fillStyle(0x1a2a1a, 1); bg.lineStyle(2, 0x60c060, 0.9);
        } else if (hover) {
          bg.fillStyle(0x1a1008, 1); bg.lineStyle(1, 0xa05018, 0.8);
        } else {
          bg.fillStyle(0x0c0906, 0.95); bg.lineStyle(1, cogC.phaser, 0.4);
        }
        bg.fillRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
        bg.strokeRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
      };
      drawBg(false);
      this._setupContainer.add(bg);

      // 스프라이트
      if (this.textures.exists(char.spriteKey)) {
        const spr = this.add.image(cx, cy - cardH * 0.08, char.spriteKey)
          .setDisplaySize(cardW * 0.72, cardW * 0.72);
        this._setupContainer.add(spr);
      }

      // 이름
      const nameTxt = this.add.text(cx, cy + cardH * 0.30, char.name, {
        fontSize: fs(8), fill: '#c8bfb0', fontFamily: FontManager.TITLE,
        wordWrap: { width: cardW - 4 }, align: 'center',
      }).setOrigin(0.5);
      this._setupContainer.add(nameTxt);

      // Cog 뱃지
      const cogTxt = this.add.text(cx - cardW * 0.44, cy - cardH * 0.44,
        `C${char.cog}`, {
          fontSize: fs(7), fill: cogC.css, fontFamily: FontManager.MONO,
        }).setOrigin(0, 0);
      this._setupContainer.add(cogTxt);

      // HP 바
      const bW = cardW * 0.82, bH = Math.max(2, Math.round(H * 0.006));
      const bY  = cy + cardH * 0.43;
      const hpBar = this.add.graphics();
      hpBar.fillStyle(0x1a1008, 1);
      hpBar.fillRect(cx - bW / 2, bY, bW, bH);
      const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
      const hpCol = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
      hpBar.fillStyle(hpCol, 1);
      hpBar.fillRect(cx - bW / 2, bY, Math.round(bW * hpPct), bH);
      this._setupContainer.add(hpBar);

      // 편성중 마크
      const inMark = this.add.text(cx, cy - cardH * 0.18, '▶', {
        fontSize: fs(10), fill: '#60c060', fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setAlpha(0);
      this._setupContainer.add(inMark);

      // hit
      const hit = this.add.rectangle(cx, cy, cardW, cardH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(15);
      this._sceneHits.push(hit);
      this._setupContainer.add(hit);

      hit.on('pointerover',  () => { drawBg(true);  nameTxt.setStyle({ fill: '#c8a070' }); });
      hit.on('pointerout',   () => { drawBg(false); nameTxt.setStyle({ fill: '#c8bfb0' }); });
      hit.on('pointerdown',  () => {
        inCombat() ? this._removeFromCombat(char.id) : this._addToCombat(char.id);
        drawBg(false);
        inMark.setAlpha(inCombat() ? 1 : 0);
      });

      this._setupCardObjs.push({ char, drawBg, inMark });
    });

    // ── 하단 배치 슬롯 ────────────────────────────────────────────
    this._buildCombatSlots(W, H, panelW, fs);

    // ── 중앙 진행 버튼 ────────────────────────────────────────────
    this._buildGoButton(W, H, panelW, fs);
  }

  _buildCombatSlots(W, H, panelW, fs) {
    const slotAreaY = H * 0.84;
    const slotAreaH = H * 0.14;
    const availW    = W - panelW - W * 0.01;
    const maxSlots  = Math.max(1, this._partyChars.length);
    const slotGap    = Math.round(H * 0.006);
    const slotW     = Math.min(
      Math.floor((availW - (maxSlots - 1) * slotGap) / maxSlots),
      Math.round(slotAreaH * 0.76)
    );
    const slotH     = slotW;
    const totalSW   = maxSlots * slotW + (maxSlots - 1) * slotGap;
    const startX    = panelW + (availW - totalSW) / 2 + slotW / 2;
    const slotY     = slotAreaY + slotAreaH / 2;

    // 구분선 + 라벨
    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.5);
    lg.lineBetween(panelW, slotAreaY, W, slotAreaY);
    this._setupContainer.add(lg);

    const lbl = this.add.text(panelW + availW / 2, slotAreaY - 4,
      '전  투  배  치  순  서', {
        fontSize: fs(9), fill: '#2a1508', fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 1);
    this._setupContainer.add(lbl);

    this._combatSlotObjs = [];
    for (let i = 0; i < maxSlots; i++) {
      const cx   = startX + i * (slotW + slotGap);
      const objs = this._makeCombatSlot(cx, slotY, slotW, slotH, i, fs);
      this._combatSlotObjs.push(objs);
    }
  }

  _makeCombatSlot(cx, cy, w, h, idx, fs) {
    const bg = this.add.graphics();
    const draw = (char) => {
      bg.clear();
      if (char) {
        const cogC = CharacterManager.getCogColor(char.cog);
        bg.fillStyle(0x1a1808, 1); bg.lineStyle(2, cogC.phaser, 0.8);
      } else {
        bg.fillStyle(0x080607, 0.7); bg.lineStyle(1, 0x1e1008, 0.35);
      }
      bg.fillRect(cx - w / 2, cy - h / 2, w, h);
      bg.strokeRect(cx - w / 2, cy - h / 2, w, h);
    };
    draw(null);
    this._setupContainer.add(bg);

    // 포지션 번호
    const numTxt = this.add.text(cx, cy - h / 2 + Math.round(h * 0.06), `${idx + 1}`, {
      fontSize: fs(8), fill: '#1e1008', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);
    this._setupContainer.add(numTxt);

    const plusTxt = this.add.text(cx, cy, '+', {
      fontSize: fs(18), fill: '#1e1008', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);
    this._setupContainer.add(plusTxt);

    const nameTxt = this.add.text(cx, cy + h * 0.22, '', {
      fontSize: fs(7), fill: '#c8bfb0', fontFamily: FontManager.TITLE,
      wordWrap: { width: w * 0.96 }, align: 'center',
    }).setOrigin(0.5).setAlpha(0);
    this._setupContainer.add(nameTxt);

    // 슬롯에 배치된 스프라이트 참조
    let spr = null;

    // hit — 슬롯 클릭 시 해당 슬롯의 캐릭터 제거
    const hit = this.add.rectangle(cx, cy, w, h, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(15);
    this._setupContainer.add(hit);
    this._sceneHits.push(hit);
    hit.on('pointerdown', () => {
      if (this._combatParty[idx]) this._removeFromCombatBySlot(idx);
    });

    return { bg, draw, plusTxt, nameTxt, spr, hit, cx, cy, w, h, idx };
  }

  // ── 편성 조작 ────────────────────────────────────────────────────
  _addToCombat(charId) {
    if (this._combatParty.includes(charId)) return;
    this._combatParty.push(charId);
    this._refreshCombatSlots();
    this._refreshSetupCards();
    this._refreshGoButton();
  }

  _removeFromCombat(charId) {
    const idx = this._combatParty.indexOf(charId);
    if (idx !== -1) this._removeFromCombatBySlot(idx);
  }

  _removeFromCombatBySlot(slotIdx) {
    if (this._combatParty[slotIdx] == null) return;
    this._combatParty.splice(slotIdx, 1);
    this._refreshCombatSlots();
    this._refreshSetupCards();
    this._refreshGoButton();
  }

  _refreshCombatSlots() {
    this._combatSlotObjs.forEach((slot, idx) => {
      const charId = this._combatParty[idx];
      const char   = charId ? this._partyChars.find(c => c.id === charId) : null;
      slot.draw(char);

      if (char) {
        slot.plusTxt.setAlpha(0);
        slot.nameTxt.setText(char.name).setAlpha(1);
        if (slot.spr) { slot.spr.destroy(); slot.spr = null; }
        if (this.textures.exists(char.spriteKey)) {
          slot.spr = this.add.image(slot.cx, slot.cy - slot.h * 0.08, char.spriteKey)
            .setDisplaySize(slot.w * 0.65, slot.w * 0.65).setDepth(11);
          this._setupContainer.add(slot.spr);
        }
      } else {
        slot.plusTxt.setAlpha(1);
        slot.nameTxt.setAlpha(0);
        if (slot.spr) { slot.spr.destroy(); slot.spr = null; }
      }
    });
  }

  _refreshSetupCards() {
    this._setupCardObjs.forEach(({ char, drawBg, inMark }) => {
      drawBg(false);
      inMark.setAlpha(this._combatParty.includes(char.id) ? 1 : 0);
    });
  }

  // ── 진행 버튼 (우측 영역 중앙) ───────────────────────────────────
  _buildGoButton(W, H, panelW, fs) {
    const availW = W - panelW;
    const btnCX  = panelW + availW / 2;
    const btnCY  = H * 0.50;
    const btnW   = Math.round(W * 0.18);
    const btnH   = Math.round(H * 0.075);

    this._goBtnBg  = this.add.graphics().setDepth(12);
    this._goBtnTxt = this.add.text(btnCX, btnCY, '진  행', {
      fontSize: fs(24), fill: '#c8a070', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setDepth(13);
    this._goBtnSub = this.add.text(btnCX, btnCY + parseInt(fs(26)),
      '1명 이상 배치 후 시작', {
        fontSize: fs(10), fill: '#3a2010', fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(13);

    this._setupContainer.add(this._goBtnBg);
    this._setupContainer.add(this._goBtnTxt);
    this._setupContainer.add(this._goBtnSub);

    const drawGo = (state) => {
      this._goBtnBg.clear();
      if (state === 'disabled') {
        this._goBtnBg.fillStyle(0x0a0807, 0.8);
        this._goBtnBg.lineStyle(1, 0x1e1008, 0.4);
        this._goBtnTxt.setStyle({ fill: '#2a1a0a' });
      } else if (state === 'hover') {
        this._goBtnBg.fillStyle(0x2a1a08, 1);
        this._goBtnBg.lineStyle(2, 0xc8a070, 1);
        this._goBtnTxt.setStyle({ fill: '#e8d090' });
      } else {
        this._goBtnBg.fillStyle(0x1e1008, 1);
        this._goBtnBg.lineStyle(2, 0xa05018, 0.9);
        this._goBtnTxt.setStyle({ fill: '#c8a070' });
      }
      this._goBtnBg.fillRect(btnCX - btnW / 2, btnCY - btnH / 2, btnW, btnH);
      this._goBtnBg.strokeRect(btnCX - btnW / 2, btnCY - btnH / 2, btnW, btnH);
    };
    this._drawGoBtn  = drawGo;
    this._goBtnState = 'disabled';
    drawGo('disabled');

    const hit = this.add.rectangle(btnCX, btnCY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(20);
    this._goBtnHit = hit;
    this._sceneHits.push(hit);
    this._setupContainer.add(hit);

    hit.on('pointerover', () => { if (this._goBtnState !== 'disabled') drawGo('hover'); });
    hit.on('pointerout',  () => { if (this._goBtnState !== 'disabled') drawGo('active'); });
    hit.on('pointerdown', () => {
      if (this._goBtnState === 'disabled') return;
      hit.disableInteractive();
      this._startCombatPhase();
    });
  }

  _refreshGoButton() {
    const has = this._combatParty.length > 0;
    this._goBtnState = has ? 'active' : 'disabled';
    this._drawGoBtn(this._goBtnState);
    this._goBtnSub.setText(
      has ? `${this._combatParty.length}명 편성  —  진행 버튼으로 시작` : '1명 이상 배치 후 시작'
    );
    this._goBtnSub.setStyle({ fill: has ? '#6a4020' : '#3a2010' });
  }

  // ── 편성 → 전투 전환 ─────────────────────────────────────────────
  _startCombatPhase() {
    this._phase = 'battle';

    // 전투 아군 확정
    this._allies = this._combatParty
      .map(id => this._allChars.find(c => c.id === id))
      .filter(Boolean)
      .map(c => ({
        ...c,
        _hp:          c.currentHp,
        _maxHp:       c.maxHp,
        _gauge:       c._gauge || 0,
        _dead:        false,
        _attackCount: 0,
      }));

    // 편성 패널 slide-out
    this.tweens.add({
      targets:  this._setupContainer,
      x:        -this.W * 0.26,
      duration: 320,
      ease:     'Cubic.easeIn',
      onComplete: () => {
        this._setupContainer.setVisible(false);
        this._buildAllyArea(this.W, this.H);
        this._startBattle();
      },
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  로그 영역 (우측)
  // ════════════════════════════════════════════════════════════════
  _buildLogArea(W, H) {
    const logX = W * 0.76, logY = H * 0.36;
    const logW = W * 0.22, logH = H * 0.55;

    const bg = this.add.graphics().setDepth(5);
    bg.fillStyle(0x080608, 0.85);
    bg.lineStyle(1, 0x1e1008, 0.5);
    bg.fillRect(logX, logY, logW, logH);
    bg.strokeRect(logX, logY, logW, logH);

    this._logAreaX    = logX + W * 0.004;
    this._logAreaY    = logY;
    this._logAreaH    = logH;
    this._logAreaW    = logW - W * 0.008;
    this._logLineH    = parseInt(FontManager.adjustedSize(12, this.scale)) + Math.round(H * 0.004);
    this._logMaxLines = Math.floor(logH / this._logLineH) - 1;

    const maskG = this.make.graphics({});
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(logX, logY, logW, logH);
    this._logMask      = maskG.createGeometryMask();
    this._logContainer = this.add.container(0, 0).setMask(this._logMask).setDepth(6);
  }

  _addLog(text, color = '#7a6040') {
    const fs = FontManager.adjustedSize(11, this.scale);
    const y  = this._logAreaY + this._logAreaH
      - this._logLineH * (this._logLines.length + 1);
    const t  = this.add.text(this._logAreaX, y, `> ${text}`, {
      fontSize: fs, fill: color, fontFamily: FontManager.MONO,
      wordWrap: { width: this._logAreaW },
    }).setDepth(6);
    this._logContainer.add(t);
    this._logLines.push(t);
    if (this._logLines.length > this._logMaxLines) {
      const old = this._logLines.shift();
      old.destroy();
    }
    this._logLines.forEach((line, i) => {
      line.setY(this._logAreaY + this._logAreaH
        - this._logLineH * (this._logLines.length - i));
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  아군 영역 (전투 시작 후 빌드)
  // ════════════════════════════════════════════════════════════════
  _buildAllyArea(W, H) {
    const areaY  = H * 0.55, areaH = H * 0.36;
    const count  = this._allies.length;
    if (!count) return;

    // 로그 영역(W*0.76) 좌측까지만
    const availW = W * 0.74;
    const unitW  = Math.min(availW * 0.14, areaH * 0.55);
    const gap    = Math.max(W * 0.01, (availW * 0.90 - unitW * count) / (count + 1));
    const totalW = count * unitW + (count - 1) * gap;
    const startX = availW / 2 - totalW / 2 + unitW / 2;

    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.6);
    lg.lineBetween(W * 0.02, areaY, W * 0.74, areaY);

    this._allies.forEach((ally, i) => {
      const cx   = startX + i * (unitW + gap);
      const cy   = areaY + areaH * 0.40;
      const objs = this._makeAllyUnit(ally, cx, cy, unitW, i);
      this._allyObjs.push(objs);
    });
  }

  _makeAllyUnit(ally, cx, cy, size, posIdx) {
    const fs   = n => FontManager.adjustedSize(n, this.scale);
    const cogC = CharacterManager.getCogColor(ally.cog);
    const rad  = size * 0.38;

    this.add.text(cx, cy - rad - Math.round(size * 0.16), `${posIdx + 1}`, {
      fontSize: fs(9), fill: '#2a1a0a', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);

    const shape = this.add.graphics();
    shape.fillStyle(0x0a1a2a, 1);
    shape.lineStyle(2, cogC.phaser, 0.85);
    shape.fillCircle(cx, cy, rad);
    shape.strokeCircle(cx, cy, rad);

    let spriteImg = null;
    if (this.textures.exists(ally.spriteKey)) {
      spriteImg = this.add.image(cx, cy, ally.spriteKey)
        .setDisplaySize(rad * 1.5, rad * 1.5).setAlpha(0.9);
    }

    const nameTxt = this.add.text(cx, cy + rad + Math.round(size * 0.04), ally.name, {
      fontSize: fs(10), fill: '#c8bfb0', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    const barW = size * 0.95, barH = Math.max(5, Math.round(size * 0.09));
    const hpBarY    = cy + rad + parseInt(fs(14)) + Math.round(size * 0.06);
    const gaugeBarY = hpBarY + barH + Math.round(size * 0.03);

    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x0a0808, 1);
    hpBg.fillRect(cx - barW / 2, hpBarY, barW, barH);
    const hpFg = this.add.graphics();

    const gaugeBg = this.add.graphics();
    gaugeBg.fillStyle(0x080a10, 1);
    gaugeBg.fillRect(cx - barW / 2, gaugeBarY, barW, barH);
    const gaugeFg = this.add.graphics();

    const hpTxt = this.add.text(cx, hpBarY - 1, '', {
      fontSize: fs(8), fill: '#7a6040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);
    const gaugeTxt = this.add.text(cx, gaugeBarY + barH + Math.round(size * 0.01), '', {
      fontSize: fs(8), fill: '#4a5870', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    const deadOverlay = this.add.graphics();
    const deadTxt     = this.add.text(cx, cy, '', { fontSize: fs(9) });

    const skillHit = this.add.circle(cx, cy, rad, 0x000000, 0)
      .setInteractive({ useHandCursor: false });

    const refreshHp = () => {
      const pct = ally._maxHp > 0 ? ally._hp / ally._maxHp : 0;
      const col = pct > 0.6 ? 0x306030 : pct > 0.3 ? 0x806020 : 0x803020;
      hpFg.clear();
      if (pct > 0) {
        hpFg.fillStyle(col, 1);
        hpFg.fillRect(cx - barW / 2, hpBarY, Math.max(1, Math.round(barW * pct)), barH);
      }
      hpTxt.setText(`${ally._hp}/${ally._maxHp}`);
    };

    const refreshGauge = () => {
      const skillDef = (typeof getSkillById === 'function') ? getSkillById(ally.skill) : null;
      const maxG = skillDef?.gaugeRequired || 300;
      const pct  = Math.min(1, ally._gauge / maxG);
      gaugeFg.clear();
      if (pct > 0) {
        gaugeFg.fillStyle(0x3a5878, 1);
        gaugeFg.fillRect(cx - barW / 2, gaugeBarY, Math.round(barW * pct), barH);
      }
      gaugeTxt.setText(`${ally._gauge}/${maxG}`);
      if (pct >= 1) {
        shape.clear();
        shape.fillStyle(0x0a2a3a, 1);
        shape.lineStyle(3, 0xc8a070, 1);
        shape.fillCircle(cx, cy, rad);
        shape.strokeCircle(cx, cy, rad);
        skillHit.setInteractive({ useHandCursor: true });
      }
    };

    // destroy — 사망 시 UI에서 완전 제거
    const destroyAll = () => {
      [shape, spriteImg, nameTxt, hpBg, hpFg, hpTxt,
       gaugeBg, gaugeFg, gaugeTxt, deadOverlay, deadTxt, skillHit]
        .forEach(o => { try { if (o && o.active !== false) o.destroy(); } catch(e){} });
    };

    refreshHp();
    refreshGauge();

    return {
      ally, shape, spriteImg, nameTxt,
      hpBg, hpFg, hpTxt, gaugeBg, gaugeFg, gaugeTxt,
      deadOverlay, deadTxt, skillHit,
      refreshHp, refreshGauge, destroyAll, cx, cy, rad,
    };
  }

  // ════════════════════════════════════════════════════════════════
  //  전투 로직
  // ════════════════════════════════════════════════════════════════
  _startBattle() {
    this._battleActive = true;
    this._addLog('전투 시작!', '#80c080');

    this._allies.forEach((ally, i) => {
      if (ally._dead) return;
      const eff      = CharacterManager.getEffectiveStat(ally, 'agility');
      const interval = Math.max(500, 3000 - eff * 100);
      const timer = this.time.addEvent({
        delay: interval + Math.random() * 300, loop: true,
        callback: () => {
          if (!this._battleActive || ally._dead) return;
          this._allyAttack(ally, i);
        },
      });
      this._attackTimers.push(timer);
    });

    this._enemies.forEach((enemy) => {
      const interval = Math.max(600, 3500 - enemy.agility * 100);
      const timer = this.time.addEvent({
        delay: interval * 1.2 + Math.random() * 400, loop: true,
        callback: () => {
          if (!this._battleActive || enemy._dead) return;
          this._enemyAttack(enemy);
        },
      });
      this._attackTimers.push(timer);
    });
  }

  _allyAttack(ally, allyIdx) {
    const liveEnemies = this._enemies.filter(e => !e._dead);
    if (!liveEnemies.length) return;

    const target = liveEnemies[Math.floor(Math.random() * liveEnemies.length)];
    const eff    = CharacterManager.getEffectiveStat(ally, 'attack');
    const luck   = CharacterManager.getEffectiveStat(ally, 'luck');
    const isCrit = Math.random() < luck / 100;
    let   dmg    = Math.max(1, eff + Math.floor(Math.random() * 3));
    if (isCrit) dmg = Math.round(dmg * 2);

    target._hp = Math.max(0, target._hp - dmg);
    ally._attackCount++;
    ally._gauge = Math.min(300, ally._gauge + 10);

    const eObj = this._enemyObjs.find(o => o.enemy._uid === target._uid);
    if (eObj) eObj.refreshHp();
    const aObj = this._allyObjs[allyIdx];
    if (aObj) aObj.refreshGauge();
    if (eObj) this._flashDamage(eObj.shape);

    const critTxt = isCrit ? ' ★크리!★' : '';
    this._addLog(`${ally.name} → ${target.name}  ${dmg}${critTxt}`, '#c8a060');

    if (target._hp <= 0) {
      target._dead = true;
      if (eObj) { eObj.shape.setAlpha(0.2); eObj.nameTxt.setStyle({ fill: '#3a1a0a' }); }
      this._addLog(`${target.name}  처치`, '#804020');
      this._checkBattleEnd();
    }
  }

  _enemyAttack(enemy) {
    const liveAllies = this._allies.filter(a => !a._dead);
    if (!liveAllies.length) return;

    let target;
    if (enemy.behavior === 'target_weak') {
      target = liveAllies.reduce((min, a) => a._hp < min._hp ? a : min);
    } else {
      target = liveAllies[Math.floor(Math.random() * liveAllies.length)];
    }

    const isCrit = Math.random() < enemy.luck / 100;
    let   dmg    = Math.max(1, enemy.attack + Math.floor(Math.random() * 3));
    if (isCrit) dmg = Math.round(dmg * 2);

    target._hp = Math.max(0, target._hp - dmg);
    enemy._attackCount++;
    target._gauge = Math.min(300, target._gauge + 5);

    const aIdx = this._allies.indexOf(target);
    const aObj = this._allyObjs[aIdx];
    if (aObj) { aObj.refreshHp(); aObj.refreshGauge(); }
    if (aObj) this._flashDamage(aObj.shape);

    const critTxt = isCrit ? ' ★크리!★' : '';
    this._addLog(`${enemy.name} → ${target.name}  ${dmg}${critTxt}`, '#c06040');

    if (target._hp <= 0) {
      this._killAlly(target, enemy.name);
      this._checkBattleEnd();
    }
  }

  // ── 아군 사망 처리 ───────────────────────────────────────────────
  // UI에서 즉시 소멸 + CharacterManager에 dead_chip/gone 기록
  _killAlly(ally, killedBy) {
    ally._dead = true;

    // 공격 타이머 즉시 중단
    // (loop 타이머에서 ally._dead 체크하므로 별도 제거 불필요)

    // UI 즉시 제거
    const aIdx = this._allies.indexOf(ally);
    const aObj = this._allyObjs[aIdx];
    if (aObj && aObj.destroyAll) aObj.destroyAll();

    // CharacterManager에 사망 기록 + 상태 전환
    const day   = (() => {
      try { return SaveManager.load()?.day || 1; } catch(e) { return 1; }
    })();
    const char = this._allChars.find(c => c.id === ally.id);
    if (char) {
      CharacterManager.killCharacter(char, {
        day, cog: this._cogMax, round: this._round, killedBy,
      });
    }

    this._addLog(`${ally.name}  사망`, '#cc3030');
  }

  _flashDamage(shape) {
    if (!shape || !shape.active) return;
    const orig = shape.alpha;
    this.tweens.add({
      targets: shape, alpha: 0.2, duration: 80, yoyo: true, repeat: 1,
      onComplete: () => { if (shape.active) shape.setAlpha(orig); },
    });
  }

  _checkBattleEnd() {
    if (!this._battleActive) return;
    if (this._enemies.every(e => e._dead)) this._endBattle('victory');
    else if (this._allies.every(a => a._dead)) this._endBattle('defeat');
  }

  _endBattle(result) {
    this._battleActive = false;
    this._attackTimers.forEach(t => { try { t.remove(); } catch(e) {} });
    this._attackTimers = [];

    // 생존자만 HP/게이지 반영 (사망자는 _killAlly에서 이미 처리됨)
    const chars = CharacterManager.loadAll() || [];
    this._allies.forEach(ally => {
      if (ally._dead) return;
      const char = chars.find(c => c.id === ally.id);
      if (char) { char.currentHp = ally._hp; char._gauge = ally._gauge; }
    });
    CharacterManager.saveAll(chars);

    if (result === 'victory') {
      this._addLog('── 전투 승리 ──', '#60c060');
      this.time.delayedCall(800, () => this._showResultPopup(true));
    } else {
      this._addLog('── 전투 패배 ──', '#cc2222');
      this.time.delayedCall(800, () => this._showResultPopup(false));
    }
  }

  // ── 결산 팝업 ────────────────────────────────────────────────────
  _showResultPopup(victory) {
    const { W, H } = this;
    const fs = n => FontManager.adjustedSize(n, this.scale);

    this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0).setDepth(50);

    const pw = W * 0.52, ph = H * 0.52;
    const px = W / 2 - pw / 2, py = H / 2 - ph / 2;

    const popBg = this.add.graphics().setDepth(51);
    popBg.fillStyle(0x0a0807, 1);
    popBg.lineStyle(2, victory ? 0x60a060 : 0xa03018, 1);
    popBg.fillRect(px, py, pw, ph);
    popBg.strokeRect(px, py, pw, ph);

    this.add.text(W / 2, py + ph * 0.12,
      victory ? '전  투  승  리' : '전  투  패  배', {
        fontSize: fs(24), fill: victory ? '#80e080' : '#e04040',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5).setDepth(52);

    let listY = py + ph * 0.28;
    this.add.text(W / 2, listY, '생존 현황', {
      fontSize: fs(12), fill: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(52);
    listY += parseInt(fs(18));

    this._allies.forEach(ally => {
      const col  = ally._dead ? '#5a2222' : '#c8bfb0';
      const stat = ally._dead ? '사망' : `HP ${ally._hp} / ${ally._maxHp}`;
      this.add.text(W / 2, listY, `${ally.name}  —  ${stat}`, {
        fontSize: fs(11), fill: col, fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(52);
      listY += parseInt(fs(15));
    });

    const btnY = py + ph * 0.86;
    const btnW = Math.round(W * 0.18), btnH = Math.round(H * 0.06);
    const btnBg  = this.add.graphics().setDepth(52);
    const btnTxt = this.add.text(W / 2, btnY,
      victory ? '다음으로' : '공방으로', {
        fontSize: fs(16), fill: '#c8a070', fontFamily: FontManager.TITLE,
      }).setOrigin(0.5).setDepth(53);

    const drawBtn = (hover) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x2a1a08 : 0x1e1008, 1);
      btnBg.lineStyle(2, hover ? 0xc8a070 : 0xa05018, 1);
      btnBg.fillRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
      btnBg.strokeRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
    };
    drawBtn(false);

    const btnHit = this.add.rectangle(W / 2, btnY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(54);

    btnHit.on('pointerover', () => { drawBtn(true);  btnTxt.setStyle({ fill: '#e8d090' }); });
    btnHit.on('pointerout',  () => { drawBtn(false); btnTxt.setStyle({ fill: '#c8a070' }); });
    btnHit.on('pointerup',   () => {
      btnHit.disableInteractive();
      const flash = this.add.rectangle(0, 0, W, H, 0x050407, 0)
        .setOrigin(0).setDepth(999);
      this.tweens.add({
        targets: flash, alpha: 1, duration: 350, ease: 'Sine.easeIn',
        onComplete: () => {
          if (victory) {
            const nextRound = this._round + 1;
            if (this._log.length > 0)
              this._log[this._log.length - 1].result = 'victory';
            if (nextRound > this._maxRound) {
              this.scene.start('AtelierScene');
            } else {
              this.scene.start('DiveScene', {
                cogMax:      this._cogMax,
                battleParty: this._battleParty,
                round:       nextRound,
                maxRound:    this._maxRound,
                deepCoin:    this._deepCoin,
                log:         this._log,
                inventory:   this._inventory,
                submarine:   this._submarine,
                shopItems:   this._shopItems,
              });
            }
          } else {
            if (this._log.length > 0)
              this._log[this._log.length - 1].result = 'defeat';
            this.scene.start('AtelierScene');
          }
        },
      });
    });
  }

  // ── 씬 정리 ──────────────────────────────────────────────────────
  shutdown() {
    this._battleActive = false;
    this._attackTimers.forEach(t => { try { t.remove(); } catch(e) {} });
    this._attackTimers = [];
    this._sceneHits.forEach(h => { try { h.destroy(); } catch(e) {} });
    this._sceneHits = [];
  }
}
