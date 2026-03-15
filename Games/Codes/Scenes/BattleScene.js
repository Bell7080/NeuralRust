// ================================================================
//  BattleScene.js
//  경로: Games/Codes/Scenes/BattleScene.js
//
//  역할: 인게임 자동전투
//    - BattleReadyScene에서 전투파티 + cogMax 전달받아 진입
//    - 상단: 적 이형 (도형 임시 표현 + HP바)
//    - 중단: 전투 로그 피드
//    - 하단: 아군 초상화 (원 도형 + HP바 + 게이지바)
//    - 자동전투 진행 (민첩 기반 공격속도)
//    - 전투 종료 → 결산 팝업 → RoundSlotScene (추후)
//
//  진입 데이터:
//    { cogMax: number, battleParty: string[] }
//    battleParty = 전투에 참여할 캐릭터 id 배열 (파티 편성 순 = 배치 순)
//
//  전투 로직:
//    - 아군: agility 기반 attackInterval(ms) 개별 타이머로 자동 공격
//            attackInterval = Math.max(500, 3000 - agility * 100)
//    - 적  : agility 기반 동일 방식
//    - 크리티컬: luck / 100 확률, 데미지 2배
//    - 사망: currentHp <= 0 → 전투불능 처리
//    - 전투 종료 조건:
//        아군 전원 전투불능 → 패배
//        적 전원 사망       → 승리
//
//  TODO:
//    - 스킬 발동 (게이지 충전 후 초상화 클릭)
//    - 포지션(공격 범위) 적용
//    - 패시브 자동 발동
//    - 이형 wave 보너스 적용
//    - 전투불능 영구사망 판정 (탐사 실패 시)
//    - RoundSlotScene 구현 후 연결
// ================================================================

class BattleScene extends Phaser.Scene {
  constructor() { super({ key: 'BattleScene' }); }

  // ── 진입 데이터 ──────────────────────────────────────────────────
  init(data) {
    this._cogMax      = data.cogMax      || 1;
    this._battleParty = data.battleParty || [];  // 전투 참여 캐릭터 id 배열
    this._round       = data.round       || 1;   // 현재 라운드 번호
  }

  // ── 씬 생성 ──────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    // ── 전투 상태 초기화 ──────────────────────────────────────────
    this._battleActive  = false;  // 전투 진행 중 플래그
    this._attackTimers  = [];     // Phaser TimerEvent 목록 (shutdown 시 정리)
    this._logLines      = [];     // 전투 로그 텍스트 오브젝트
    this._allyObjs      = [];     // 아군 UI 오브젝트 배열
    this._enemyObjs     = [];     // 적 UI 오브젝트 배열
    this._allChars      = CharacterManager.loadAll() || [];

    // ── 전투 파티 캐릭터 객체 로드 (배치 순서 유지) ───────────────
    this._allies = this._battleParty
      .map(id => this._allChars.find(c => c.id === id))
      .filter(Boolean)
      .map(c => ({
        ...c,
        // 전투용 임시 HP (원본 건드리지 않음 — 전투 종료 후 반영)
        _hp:    c.currentHp,
        _maxHp: c.maxHp,
        _gauge: c._gauge || 0,   // 게이지 (라운드 간 유지)
        _dead:  false,
        _attackCount: 0,
      }));

    // ── 적 생성 (cogMax 기반) ─────────────────────────────────────
    this._enemies = this._spawnEnemies(this._cogMax);

    // ── UI 빌드 ───────────────────────────────────────────────────
    this._buildBackground(W, H);
    this._buildHUD(W, H);
    this._buildEnemyArea(W, H);
    this._buildLogArea(W, H);
    this._buildAllyArea(W, H);
    this._buildStartButton(W, H);
  }

  // ════════════════════════════════════════════════════════════════
  //  적 생성
  // ════════════════════════════════════════════════════════════════
  _spawnEnemies(cogMax) {
    // cogMax 이하 등장 가능한 이형 목록에서 가중치 추첨
    const pool = ENEMY_DATA.filter(e =>
      e.cogMin <= cogMax && (e.cogMax === null || e.cogMax >= cogMax)
    );
    if (!pool.length) return [];

    // 가중치 추첨으로 이형 종류 선택
    const totalW = pool.reduce((s, e) => s + e.spawnWeight, 0);
    let r = Math.random() * totalW;
    let picked = pool[0];
    for (const e of pool) { r -= e.spawnWeight; if (r <= 0) { picked = e; break; } }

    // 등장 수 결정
    const [minC, maxC] = picked.spawnCount;
    const count = minC + Math.floor(Math.random() * (maxC - minC + 1));

    // 스탯 스케일 적용
    const scaled = getEnemyScaledStats(picked.id, cogMax);

    const enemies = [];
    for (let i = 0; i < count; i++) {
      // wave 보너스: 침수자 등 — 동종 수에 비례 스탯 증가
      let hp     = scaled.hp;
      let attack = scaled.attack;
      if (picked.behavior === 'wave' && picked.waveBonus) {
        const bonus = count - 1; // 자신 제외 동종 수
        hp     = Math.round(hp     * (1 + picked.waveBonus.hpBonus     * bonus));
        attack = Math.round(attack * (1 + picked.waveBonus.attackBonus * bonus));
      }
      enemies.push({
        _uid:     `e_${i}`,
        id:       picked.id,
        name:     picked.name,
        behavior: picked.behavior,
        _hp:      hp,
        _maxHp:   hp,
        attack,
        agility:  scaled.agility,
        luck:     scaled.luck,
        _dead:    false,
        _attackCount: 0,
      });
    }
    return enemies;
  }

  // ════════════════════════════════════════════════════════════════
  //  UI 빌드
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

    // 라운드 표시
    this.add.text(W * 0.05, H * 0.03, `ROUND  ${this._round}`, {
      fontSize: fs(14), fill: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // Cog 난이도
    const cogC = CharacterManager.getCogColor(this._cogMax);
    this.add.text(W * 0.95, H * 0.03, `COG  ${this._cogMax}`, {
      fontSize: fs(14), fill: cogC.css, fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    // 구분선
    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.8);
    lg.lineBetween(0, H * 0.06, W, H * 0.06);
  }

  // ── 적 영역 (상단 30%) ───────────────────────────────────────────
  _buildEnemyArea(W, H) {
    const areaY    = H * 0.06;
    const areaH    = H * 0.30;
    const count    = this._enemies.length;
    const unitW    = Math.min(W * 0.18, areaH * 0.7);
    const gap      = W * 0.03;
    const totalW   = count * unitW + (count - 1) * gap;
    const startX   = W / 2 - totalW / 2 + unitW / 2;

    this._enemies.forEach((enemy, i) => {
      const cx = startX + i * (unitW + gap);
      const cy = areaY + areaH * 0.45;
      const objs = this._makeEnemyUnit(enemy, cx, cy, unitW);
      this._enemyObjs.push(objs);
    });

    // 적 영역 구분선
    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.6);
    lg.lineBetween(W * 0.02, areaY + areaH, W * 0.98, areaY + areaH);
  }

  _makeEnemyUnit(enemy, cx, cy, size) {
    const fs = n => FontManager.adjustedSize(n, this.scale);

    // 도형 (적 = 사각형)
    const shape = this.add.graphics();
    const half  = size * 0.38;
    shape.fillStyle(0x3a1a0a, 1);
    shape.lineStyle(2, 0xa03018, 0.9);
    shape.fillRect(cx - half, cy - half, half * 2, half * 2);
    shape.strokeRect(cx - half, cy - half, half * 2, half * 2);

    // 이름
    const nameTxt = this.add.text(cx, cy - half - 4, enemy.name, {
      fontSize: fs(11), fill: '#c8a060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);

    // HP 바
    const barW = size * 0.9;
    const barH = Math.max(6, Math.round(size * 0.1));
    const barY = cy + half + 4;
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x1a0a06, 1);
    hpBg.fillRect(cx - barW / 2, barY, barW, barH);
    const hpFg = this.add.graphics();

    const hpNumTxt = this.add.text(cx, barY + barH + 2, '', {
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

  // ── 로그 영역 (중단 20%) ─────────────────────────────────────────
  _buildLogArea(W, H) {
    const logY = H * 0.36;
    const logH = H * 0.18;

    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x080608, 0.85);
    bg.lineStyle(1, 0x1e1008, 0.5);
    bg.fillRect(W * 0.02, logY, W * 0.96, logH);
    bg.strokeRect(W * 0.02, logY, W * 0.96, logH);

    this._logAreaY  = logY;
    this._logAreaH  = logH;
    this._logAreaX  = W * 0.04;
    this._logAreaW  = W * 0.92;
    this._logLineH  = parseInt(FontManager.adjustedSize(13, this.scale)) + 4;
    this._logMaxLines = Math.floor(logH / this._logLineH) - 1;

    // 마스크
    const maskG = this.make.graphics({});
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(W * 0.02, logY, W * 0.96, logH);
    this._logMask = maskG.createGeometryMask();

    this._logContainer = this.add.container(0, 0).setMask(this._logMask);
  }

  _addLog(text, color = '#7a6040') {
    const fs = FontManager.adjustedSize(12, this.scale);
    const y  = this._logAreaY + this._logAreaH - this._logLineH * (this._logLines.length + 1);
    const t  = this.add.text(this._logAreaX, y, `> ${text}`, {
      fontSize: fs, fill: color, fontFamily: FontManager.MONO,
    });
    this._logContainer.add(t);
    this._logLines.push(t);

    // 오래된 로그 위로 밀기
    if (this._logLines.length > this._logMaxLines) {
      const old = this._logLines.shift();
      old.destroy();
    }
    // 전체 재배치 (최신이 아래)
    this._logLines.forEach((line, i) => {
      const newY = this._logAreaY + this._logAreaH
        - this._logLineH * (this._logLines.length - i);
      line.setY(newY);
    });
  }

  // ── 아군 영역 (하단 36%) ─────────────────────────────────────────
  _buildAllyArea(W, H) {
    const areaY  = H * 0.55;
    const areaH  = H * 0.36;
    const count  = this._allies.length;
    if (!count) return;

    const unitW  = Math.min(W * 0.14, areaH * 0.55);
    const gap    = Math.max(W * 0.01, (W * 0.92 - unitW * count) / (count + 1));
    const totalW = count * unitW + (count - 1) * gap;
    const startX = W / 2 - totalW / 2 + unitW / 2;

    // 구분선
    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.6);
    lg.lineBetween(W * 0.02, areaY, W * 0.98, areaY);

    this._allies.forEach((ally, i) => {
      const cx  = startX + i * (unitW + gap);
      const cy  = areaY + areaH * 0.40;
      const objs = this._makeAllyUnit(ally, cx, cy, unitW, i);
      this._allyObjs.push(objs);
    });
  }

  _makeAllyUnit(ally, cx, cy, size, posIdx) {
    const fs    = n => FontManager.adjustedSize(n, this.scale);
    const cogC  = CharacterManager.getCogColor(ally.cog);
    const rad   = size * 0.38;

    // 포지션 번호 (배치 순서 표시)
    this.add.text(cx, cy - rad - 16, `${posIdx + 1}`, {
      fontSize: fs(9), fill: '#2a1a0a', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);

    // 도형 (아군 = 원)
    const shape = this.add.graphics();
    shape.fillStyle(0x0a1a2a, 1);
    shape.lineStyle(2, cogC.phaser, 0.85);
    shape.fillCircle(cx, cy, rad);
    shape.strokeCircle(cx, cy, rad);

    // 스프라이트 (있으면 표시)
    let spriteImg = null;
    if (this.textures.exists(ally.spriteKey)) {
      spriteImg = this.add.image(cx, cy, ally.spriteKey)
        .setDisplaySize(rad * 1.5, rad * 1.5)
        .setAlpha(0.9);
    }

    // 이름
    const nameTxt = this.add.text(cx, cy + rad + 4, ally.name, {
      fontSize: fs(10), fill: '#c8bfb0', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    // HP 바
    const barW  = size * 0.95;
    const barH  = Math.max(5, Math.round(size * 0.09));
    const hpBarY = cy + rad + parseInt(fs(14)) + 6;
    const hpBg  = this.add.graphics();
    hpBg.fillStyle(0x0a0808, 1);
    hpBg.fillRect(cx - barW / 2, hpBarY, barW, barH);
    const hpFg  = this.add.graphics();

    // 게이지 바 (HP 바 아래)
    const gaugeBarY = hpBarY + barH + 3;
    const gaugeBg   = this.add.graphics();
    gaugeBg.fillStyle(0x080a10, 1);
    gaugeBg.fillRect(cx - barW / 2, gaugeBarY, barW, barH);
    const gaugeFg = this.add.graphics();

    // HP / 게이지 수치 텍스트
    const hpTxt = this.add.text(cx, hpBarY - 1, '', {
      fontSize: fs(8), fill: '#7a6040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);

    const gaugeTxt = this.add.text(cx, gaugeBarY + barH + 1, '', {
      fontSize: fs(8), fill: '#4a5870', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    // 전투불능 오버레이 (초기 숨김)
    const deadOverlay = this.add.graphics().setAlpha(0);
    deadOverlay.fillStyle(0x000000, 0.65);
    deadOverlay.fillCircle(cx, cy, rad + 2);
    const deadTxt = this.add.text(cx, cy, '전투불능', {
      fontSize: fs(9), fill: '#cc2222', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setAlpha(0);

    // 스킬 버튼 hit (게이지 충전 시 활성 — 추후 스킬 발동 구현)
    // TODO: 게이지 max 도달 시 초상화 글로우 + 클릭으로 스킬 발동
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
      const maxG     = skillDef?.gaugeRequired || 300;
      const pct      = Math.min(1, ally._gauge / maxG);
      gaugeFg.clear();
      if (pct > 0) {
        gaugeFg.fillStyle(0x3a5878, 1);
        gaugeFg.fillRect(cx - barW / 2, gaugeBarY, Math.round(barW * pct), barH);
      }
      gaugeTxt.setText(`${ally._gauge}/${maxG}`);

      // TODO: 게이지 풀 충전 시 skillHit 활성화 + 글로우 애니메이션
      if (pct >= 1) {
        shape.clear();
        shape.fillStyle(0x0a2a3a, 1);
        shape.lineStyle(3, 0xc8a070, 1);
        shape.fillCircle(cx, cy, rad);
        shape.strokeCircle(cx, cy, rad);
        skillHit.setInteractive({ useHandCursor: true });
      }
    };

    const setDead = () => {
      ally._dead = true;
      shape.clear();
      shape.fillStyle(0x0a0808, 1);
      shape.lineStyle(1, 0x3a1a1a, 0.5);
      shape.fillCircle(cx, cy, rad);
      shape.strokeCircle(cx, cy, rad);
      if (spriteImg) spriteImg.setAlpha(0.2);
      deadOverlay.setAlpha(1);
      deadTxt.setAlpha(1);
      skillHit.disableInteractive();
    };

    refreshHp();
    refreshGauge();

    return {
      ally, shape, spriteImg, nameTxt,
      hpBg, hpFg, hpTxt, gaugeBg, gaugeFg, gaugeTxt,
      deadOverlay, deadTxt, skillHit,
      refreshHp, refreshGauge, setDead,
      cx, cy, rad,
    };
  }

  // ── 전투 시작 버튼 ───────────────────────────────────────────────
  _buildStartButton(W, H) {
    const fs   = n => FontManager.adjustedSize(n, this.scale);
    const btnY = H * 0.96;
    const btnW = Math.round(W * 0.18);
    const btnH = Math.round(H * 0.05);

    const bg = this.add.graphics();
    const drawBtn = (state) => {
      bg.clear();
      if (state === 'hover') {
        bg.fillStyle(0x1a2a1a, 1); bg.lineStyle(2, 0x60c060, 1);
      } else if (state === 'down') {
        bg.fillStyle(0x0e180e, 1); bg.lineStyle(2, 0x408040, 1);
      } else {
        bg.fillStyle(0x0e180e, 1); bg.lineStyle(2, 0x308030, 0.9);
      }
      bg.fillRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
      bg.strokeRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
    };
    drawBtn('normal');

    const txt = this.add.text(W / 2, btnY, '전  투  시  작', {
      fontSize: fs(16), fill: '#60c060', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5);

    const hit = this.add.rectangle(W / 2, btnY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(10);

    hit.on('pointerover', () => drawBtn('hover'));
    hit.on('pointerout',  () => drawBtn('normal'));
    hit.on('pointerdown', () => drawBtn('down'));
    hit.on('pointerup',   () => {
      hit.disableInteractive();
      bg.destroy(); txt.destroy();
      this._startBattle();
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  전투 로직
  // ════════════════════════════════════════════════════════════════
  _startBattle() {
    this._battleActive = true;
    this._addLog('전투 시작!', '#80c080');

    // 아군 자동 공격 타이머
    this._allies.forEach((ally, i) => {
      if (ally._dead) return;
      const eff      = CharacterManager.getEffectiveStat(ally, 'agility');
      const interval = Math.max(500, 3000 - eff * 100);
      const timer = this.time.addEvent({
        delay: interval + Math.random() * 300, // 약간의 랜덤 오프셋
        loop:  true,
        callback: () => {
          if (!this._battleActive || ally._dead) return;
          this._allyAttack(ally, i);
        },
      });
      this._attackTimers.push(timer);
    });

    // 적 자동 공격 타이머
    this._enemies.forEach((enemy, i) => {
      const interval = Math.max(600, 3500 - enemy.agility * 100);
      const timer = this.time.addEvent({
        delay: interval * 1.2 + Math.random() * 400,
        loop:  true,
        callback: () => {
          if (!this._battleActive || enemy._dead) return;
          this._enemyAttack(enemy);
        },
      });
      this._attackTimers.push(timer);
    });
  }

  // ── 아군 공격 ────────────────────────────────────────────────────
  _allyAttack(ally, allyIdx) {
    const liveEnemies = this._enemies.filter(e => !e._dead);
    if (!liveEnemies.length) return;

    // 공격 대상 선택 (랜덤 — 포지션 로직은 추후 적용)
    // TODO: ally.position 기반 공격 범위 적용
    const target = liveEnemies[Math.floor(Math.random() * liveEnemies.length)];

    const eff    = CharacterManager.getEffectiveStat(ally, 'attack');
    const luck   = CharacterManager.getEffectiveStat(ally, 'luck');
    const isCrit = Math.random() < luck / 100;
    let   dmg    = Math.max(1, eff + Math.floor(Math.random() * 3));
    if (isCrit) dmg = Math.round(dmg * 2);

    target._hp = Math.max(0, target._hp - dmg);
    ally._attackCount++;

    // 게이지 충전 (공격 1회당 +10)
    ally._gauge = Math.min(300, ally._gauge + 10);

    // UI 갱신
    const eObj = this._enemyObjs.find(o => o.enemy._uid === target._uid);
    if (eObj) eObj.refreshHp();
    const aObj = this._allyObjs[allyIdx];
    if (aObj) aObj.refreshGauge();

    // 플래시 이펙트
    if (eObj) this._flashDamage(eObj.shape);

    const critTxt = isCrit ? ' ★크리!★' : '';
    this._addLog(`${ally.name} → ${target.name}  ${dmg} 피해${critTxt}`, '#c8a060');

    // 적 사망 체크
    if (target._hp <= 0) {
      target._dead = true;
      if (eObj) {
        eObj.shape.setAlpha(0.2);
        eObj.nameTxt.setStyle({ fill: '#3a1a0a' });
      }
      this._addLog(`${target.name}  전투불능`, '#804020');
      this._checkBattleEnd();
    }
  }

  // ── 적 공격 ──────────────────────────────────────────────────────
  _enemyAttack(enemy) {
    const liveAllies = this._allies.filter(a => !a._dead);
    if (!liveAllies.length) return;

    // 행동 패턴에 따른 대상 선택
    let target;
    if (enemy.behavior === 'target_weak') {
      // HP가 가장 낮은 아군 우선
      target = liveAllies.reduce((min, a) => a._hp < min._hp ? a : min);
    } else {
      // random / wave — 랜덤
      target = liveAllies[Math.floor(Math.random() * liveAllies.length)];
    }

    const isCrit = Math.random() < enemy.luck / 100;
    let   dmg    = Math.max(1, enemy.attack + Math.floor(Math.random() * 3));
    if (isCrit) dmg = Math.round(dmg * 2);

    target._hp = Math.max(0, target._hp - dmg);
    enemy._attackCount++;

    // 피격 시 게이지 충전 (+5)
    target._gauge = Math.min(300, target._gauge + 5);

    // UI 갱신
    const aIdx = this._allies.indexOf(target);
    const aObj = this._allyObjs[aIdx];
    if (aObj) { aObj.refreshHp(); aObj.refreshGauge(); }

    if (aObj) this._flashDamage(aObj.shape);

    const critTxt = isCrit ? ' ★크리!★' : '';
    this._addLog(`${enemy.name} → ${target.name}  ${dmg} 피해${critTxt}`, '#c06040');

    // 아군 사망 체크
    if (target._hp <= 0) {
      const oObj = this._allyObjs[aIdx];
      if (oObj) oObj.setDead();
      this._addLog(`${target.name}  전투불능`, '#803020');
      this._checkBattleEnd();
    }
  }

  // ── 데미지 플래시 ────────────────────────────────────────────────
  _flashDamage(shape) {
    if (!shape || !shape.active) return;
    const orig = shape.alpha;
    this.tweens.add({
      targets: shape, alpha: 0.2,
      duration: 80, yoyo: true, repeat: 1,
      onComplete: () => { if (shape.active) shape.setAlpha(orig); },
    });
  }

  // ── 전투 종료 체크 ───────────────────────────────────────────────
  _checkBattleEnd() {
    if (!this._battleActive) return;

    const allEnemiesDead = this._enemies.every(e => e._dead);
    const allAlliesDead  = this._allies.every(a => a._dead);

    if (allEnemiesDead) {
      this._endBattle('victory');
    } else if (allAlliesDead) {
      this._endBattle('defeat');
    }
  }

  // ── 전투 종료 ────────────────────────────────────────────────────
  _endBattle(result) {
    this._battleActive = false;

    // 모든 타이머 정지
    this._attackTimers.forEach(t => { try { t.remove(); } catch(e) {} });
    this._attackTimers = [];

    // HP 실제 캐릭터에 반영
    this._allies.forEach(ally => {
      const char = this._allChars.find(c => c.id === ally.id);
      if (char) {
        char.currentHp = ally._hp;
        char._gauge    = ally._gauge;
      }
    });
    CharacterManager.saveAll(this._allChars);

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

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.7)
      .setOrigin(0).setDepth(50);

    const pw = W * 0.52;
    const ph = H * 0.48;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2;

    const popBg = this.add.graphics().setDepth(51);
    popBg.fillStyle(0x0a0807, 1);
    popBg.lineStyle(2, victory ? 0x60a060 : 0xa03018, 1);
    popBg.fillRect(px, py, pw, ph);
    popBg.strokeRect(px, py, pw, ph);

    // 결과 타이틀
    this.add.text(W / 2, py + ph * 0.15,
      victory ? '전  투  승  리' : '전  투  패  배', {
        fontSize: fs(24),
        fill: victory ? '#80e080' : '#e04040',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5).setDepth(52);

    // 생존 캐릭터 목록
    let listY = py + ph * 0.30;
    this.add.text(W / 2, listY, '생존 현황', {
      fontSize: fs(12), fill: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(52);
    listY += parseInt(fs(18));

    this._allies.forEach(ally => {
      const col  = ally._dead ? '#5a2222' : '#c8bfb0';
      const stat = ally._dead ? '전투불능' : `HP ${ally._hp} / ${ally._maxHp}`;
      this.add.text(W / 2, listY, `${ally.name}  —  ${stat}`, {
        fontSize: fs(11), fill: col, fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(52);
      listY += parseInt(fs(15));
    });

    // 계속 버튼
    const btnY = py + ph * 0.85;
    const btnW = Math.round(W * 0.18);
    const btnH = Math.round(H * 0.06);
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

    btnHit.on('pointerover', () => { drawBtn(true); btnTxt.setStyle({ fill: '#e8d090' }); });
    btnHit.on('pointerout',  () => { drawBtn(false); btnTxt.setStyle({ fill: '#c8a070' }); });
    btnHit.on('pointerup',   () => {
      btnHit.disableInteractive();
      const flash = this.add.rectangle(0, 0, W, H, 0x050407, 0)
        .setOrigin(0).setDepth(999);
      this.tweens.add({
        targets: flash, alpha: 1, duration: 350, ease: 'Sine.easeIn',
        onComplete: () => {
          if (victory) {
            // TODO: RoundSlotScene 구현 후 연결
            // this.scene.start('RoundSlotScene', { cogMax: this._cogMax, round: this._round + 1 });
            this.scene.start('AtelierScene', { tab: 'explore' });
          } else {
            // 패배 → 공방으로
            this.scene.start('AtelierScene', { tab: 'explore' });
          }
        },
      });
    });
  }

  // ── 씬 종료 시 정리 ──────────────────────────────────────────────
  shutdown() {
    this._battleActive = false;
    this._attackTimers.forEach(t => { try { t.remove(); } catch(e) {} });
    this._attackTimers = [];
  }
}
