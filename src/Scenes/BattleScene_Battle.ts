// ================================================================
//  BattleScene_Battle.ts
//  경로: src/Scenes/BattleScene_Battle.ts
//
//  역할: Phase 2 — 전투 로직
//        적/아군 Phaser 오브젝트 빌드, 자동전투 타이머,
//        로그 영역(CSS DOM), 결산 팝업
//
//  상속: BattleSceneSetup → BattleSceneBattle → BattleScene
// ================================================================

import Phaser from 'phaser';
import { CharacterManager } from '../Managers/CharacterManager';
import { FontManager }      from '../Managers/FontManager';
import { SaveManager }      from '../Managers/SaveManager';
import {
  BattleSceneSetup,
  AllyInstance, EnemyInstance,
  AllyUnitObjs, EnemyUnitObjs,
} from './BattleScene_Setup';

export abstract class BattleSceneBattle extends BattleSceneSetup {

  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  // ── 전투 상태 ─────────────────────────────────────────────────
  protected _allies:       AllyInstance[]            = [];
  protected _enemies:      EnemyInstance[]            = [];
  protected _allyObjs:     AllyUnitObjs[]             = [];
  protected _enemyObjs:    EnemyUnitObjs[]            = [];
  protected _attackTimers: Phaser.Time.TimerEvent[]   = [];
  protected _battleActive: boolean                    = false;

  // ── 로그 ──────────────────────────────────────────────────────
  private _logLines:    Phaser.GameObjects.Text[]       = [];
  private _logContainer!: Phaser.GameObjects.Container;
  private _logAreaX   = 0;
  private _logAreaY   = 0;
  private _logAreaH   = 0;
  private _logAreaW   = 0;
  private _logLineH   = 0;
  private _logMaxLines = 0;

  // ════════════════════════════════════════════════════════════
  //  Phase 1 → Phase 2 전환  (BattleSceneSetup.abstract 구현)
  // ════════════════════════════════════════════════════════════
  protected _startCombatPhase(): void {
    this._allies = this._combatParty
      .map(id => this._allChars.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map(c => ({
        ...c,
        _hp:          c.currentHp,
        _maxHp:       c.maxHp,
        _gauge:       0,
        _dead:        false,
        _attackCount: 0,
      } as AllyInstance));

    this._slideOutSetup(() => {
      this._buildAllyArea(this.scale.width, this.scale.height);
      this._startBattle();
    });
  }

  // ════════════════════════════════════════════════════════════
  //  적 영역 (상단 30%)
  // ════════════════════════════════════════════════════════════
  protected _buildEnemyArea(W: number, H: number): void {
    const areaY = H * 0.06, areaH = H * 0.30;
    const count = this._enemies.length;
    if (!count) return;

    const unitW  = Math.min(W * 0.18, areaH * 0.7);
    const gap    = W * 0.03;
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

  protected _makeEnemyUnit(
    enemy: EnemyInstance, cx: number, cy: number, size: number
  ): EnemyUnitObjs {
    const half = size * 0.38;

    const shape = this.add.graphics();
    shape.fillStyle(0x3a1a0a, 1);
    shape.lineStyle(2, 0xa03018, 0.9);
    shape.fillRect(cx - half, cy - half, half * 2, half * 2);
    shape.strokeRect(cx - half, cy - half, half * 2, half * 2);

    const nameTxt = this.add.text(
      cx, cy - half - Math.round(size * 0.04), enemy.name, {
        fontSize: this._fs(11), color: '#c8a060', fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 1);

    const barW = size * 0.9;
    const barH = Math.max(6, Math.round(size * 0.1));
    const barY = cy + half + Math.round(size * 0.06);

    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x1a0a06, 1);
    hpBg.fillRect(cx - barW / 2, barY, barW, barH);

    const hpFg = this.add.graphics();

    const hpNumTxt = this.add.text(
      cx, barY + barH + Math.round(size * 0.03), '', {
        fontSize: this._fs(9), color: '#a06040', fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0);

    const refreshHp = () => {
      const pct = enemy._maxHp > 0 ? enemy._hp / enemy._maxHp : 0;
      const col = pct > 0.6 ? 0xa03018 : pct > 0.3 ? 0x904020 : 0x601010;
      hpFg.clear();
      if (pct > 0) {
        hpFg.fillStyle(col, 1);
        hpFg.fillRect(
          cx - barW / 2, barY,
          Math.max(1, Math.round(barW * pct)), barH
        );
      }
      hpNumTxt.setText(`${enemy._hp} / ${enemy._maxHp}`);
    };
    refreshHp();

    return { enemy, shape, nameTxt, hpBg, hpFg, hpNumTxt, refreshHp, cx, cy, half };
  }

  // ════════════════════════════════════════════════════════════
  //  아군 영역 (전투 시작 후 빌드)
  // ════════════════════════════════════════════════════════════
  protected _buildAllyArea(W: number, H: number): void {
    const areaY  = H * 0.55, areaH = H * 0.36;
    const count  = this._allies.length;
    if (!count) return;

    const availW = W * 0.74;
    const unitW  = Math.min(availW * 0.14, areaH * 0.55);
    const gap    = Math.max(W * 0.01, (availW * 0.90 - unitW * count) / (count + 1));
    const totalW = count * unitW + (count - 1) * gap;
    const startX = availW / 2 - totalW / 2 + unitW / 2;

    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.6);
    lg.lineBetween(W * 0.02, areaY, W * 0.74, areaY);

    this._allies.forEach((ally, i) => {
      const cx  = startX + i * (unitW + gap);
      const cy  = areaY + areaH * 0.40;
      this._allyObjs.push(this._makeAllyUnit(ally, cx, cy, unitW, i));
    });
  }

  protected _makeAllyUnit(
    ally: AllyInstance, cx: number, cy: number, size: number, posIdx: number
  ): AllyUnitObjs {
    const cogC = CharacterManager.getCogColor(ally.cog);
    const rad  = size * 0.38;

    this.add.text(cx, cy - rad - Math.round(size * 0.16), `${posIdx + 1}`, {
      fontSize: this._fs(9), color: '#2a1a0a', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);

    const shape = this.add.graphics();
    shape.fillStyle(0x0a1a2a, 1);
    shape.lineStyle(2, cogC.phaser, 0.85);
    shape.fillCircle(cx, cy, rad);
    shape.strokeCircle(cx, cy, rad);

    let spriteImg: Phaser.GameObjects.Image | null = null;
    if (this.textures.exists(ally.spriteKey)) {
      spriteImg = this.add.image(cx, cy, ally.spriteKey)
        .setDisplaySize(rad * 1.5, rad * 1.5).setAlpha(0.9);
    }

    const nameTxt = this.add.text(cx, cy + rad + Math.round(size * 0.04), ally.name, {
      fontSize: this._fs(10), color: '#c8bfb0', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    const barW     = size * 0.95;
    const barH     = Math.max(5, Math.round(size * 0.09));
    const hpBarY   = cy + rad + parseInt(this._fs(14)) + Math.round(size * 0.06);
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
      fontSize: this._fs(8), color: '#7a6040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);

    const gaugeTxt = this.add.text(
      cx, gaugeBarY + barH + Math.round(size * 0.01), '', {
        fontSize: this._fs(8), color: '#4a5870', fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0);

    const skillHit = this.add.circle(cx, cy, rad, 0x000000, 0)
      .setInteractive({ useHandCursor: false });

    const refreshHp = () => {
      const pct = ally._maxHp > 0 ? ally._hp / ally._maxHp : 0;
      const col = pct > 0.6 ? 0x306030 : pct > 0.3 ? 0x806020 : 0x803020;
      hpFg.clear();
      if (pct > 0) {
        hpFg.fillStyle(col, 1);
        hpFg.fillRect(
          cx - barW / 2, hpBarY,
          Math.max(1, Math.round(barW * pct)), barH
        );
      }
      hpTxt.setText(`${ally._hp}/${ally._maxHp}`);
    };

    const refreshGauge = () => {
      const maxG = 300;
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

    const destroyAll = () => {
      ([shape, spriteImg, nameTxt, hpBg, hpFg, hpTxt,
        gaugeBg, gaugeFg, gaugeTxt, skillHit] as Array<{ active?: boolean; destroy(): void } | null>)
        .forEach(o => { try { if (o && o.active !== false) o.destroy(); } catch (_) {} });
    };

    refreshHp();
    refreshGauge();

    return {
      ally, shape, spriteImg, nameTxt,
      hpBg, hpFg, hpTxt, gaugeBg, gaugeFg, gaugeTxt,
      skillHit, refreshHp, refreshGauge, destroyAll, cx, cy, rad,
    };
  }

  // ════════════════════════════════════════════════════════════
  //  로그 영역 (우측)
  // ════════════════════════════════════════════════════════════
  protected _buildLogArea(W: number, H: number): void {
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
    this._logLineH    = parseInt(FontManager.adjustedSize(12, this.scale))
                      + Math.round(H * 0.004);
    this._logMaxLines = Math.floor(logH / this._logLineH) - 1;

    const maskG = this.make.graphics({});
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(logX, logY, logW, logH);
    const logMask = maskG.createGeometryMask();
    this._logContainer = this.add.container(0, 0).setMask(logMask).setDepth(6);
  }

  protected _addLog(text: string, color = '#7a6040'): void {
    if (!this._logContainer) return;
    const y = this._logAreaY + this._logAreaH
      - this._logLineH * (this._logLines.length + 1);
    const t = this.add.text(this._logAreaX, y, `> ${text}`, {
      fontSize: FontManager.adjustedSize(11, this.scale),
      color, fontFamily: FontManager.MONO,
      wordWrap: { width: this._logAreaW },
    }).setDepth(6);
    this._logContainer.add(t);
    this._logLines.push(t);
    if (this._logLines.length > this._logMaxLines) {
      this._logLines.shift()?.destroy();
    }
    this._logLines.forEach((line, i) => {
      line.setY(
        this._logAreaY + this._logAreaH
        - this._logLineH * (this._logLines.length - i)
      );
    });
  }

  // ════════════════════════════════════════════════════════════
  //  전투 루프
  // ════════════════════════════════════════════════════════════
  protected _startBattle(): void {
    this._battleActive = true;
    this._addLog('전투 시작!', '#80c080');

    this._allies.forEach((ally, i) => {
      if (ally._dead) return;
      const eff      = CharacterManager.getEffectiveStat(ally, 'agility');
      const interval = Math.max(500, 3000 - eff * 100);
      this._attackTimers.push(this.time.addEvent({
        delay: interval + Math.random() * 300, loop: true,
        callback: () => {
          if (!this._battleActive || ally._dead) return;
          this._allyAttack(ally, i);
        },
      }));
    });

    this._enemies.forEach(enemy => {
      const interval = Math.max(600, 3500 - enemy.agility * 100);
      this._attackTimers.push(this.time.addEvent({
        delay: interval * 1.2 + Math.random() * 400, loop: true,
        callback: () => {
          if (!this._battleActive || enemy._dead) return;
          this._enemyAttack(enemy);
        },
      }));
    });
  }

  protected _allyAttack(ally: AllyInstance, allyIdx: number): void {
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
    const aObj = this._allyObjs[allyIdx];
    eObj?.refreshHp();
    aObj?.refreshGauge();
    if (eObj) this._flashDamage(eObj.shape);

    this._addLog(
      `${ally.name} → ${target.name}  ${dmg}${isCrit ? ' ★크리!★' : ''}`,
      '#c8a060'
    );

    if (target._hp <= 0) {
      target._dead = true;
      if (eObj) {
        eObj.shape.setAlpha(0.2);
        eObj.nameTxt.setStyle({ color: '#3a1a0a' });
      }
      this._addLog(`${target.name}  처치`, '#804020');
      this._checkBattleEnd();
    }
  }

  protected _enemyAttack(enemy: EnemyInstance): void {
    const liveAllies = this._allies.filter(a => !a._dead);
    if (!liveAllies.length) return;

    const target = enemy.behavior === 'target_weak'
      ? liveAllies.reduce((min, a) => a._hp < min._hp ? a : min)
      : liveAllies[Math.floor(Math.random() * liveAllies.length)];

    const isCrit = Math.random() < enemy.luck / 100;
    let   dmg    = Math.max(1, enemy.attack + Math.floor(Math.random() * 3));
    if (isCrit) dmg = Math.round(dmg * 2);

    target._hp = Math.max(0, target._hp - dmg);
    enemy._attackCount++;
    target._gauge = Math.min(300, target._gauge + 5);

    const aIdx = this._allies.indexOf(target);
    const aObj = this._allyObjs[aIdx];
    if (aObj) { aObj.refreshHp(); aObj.refreshGauge(); this._flashDamage(aObj.shape); }

    this._addLog(
      `${enemy.name} → ${target.name}  ${dmg}${isCrit ? ' ★크리!★' : ''}`,
      '#c06040'
    );

    if (target._hp <= 0) {
      this._killAlly(target, enemy.name);
      this._checkBattleEnd();
    }
  }

  protected _killAlly(ally: AllyInstance, killedBy: string): void {
    ally._dead = true;
    const aObj = this._allyObjs[this._allies.indexOf(ally)];
    aObj?.destroyAll();

    const day = SaveManager.load()?.day ?? 1;
    const char = this._allChars.find(c => c.id === ally.id);
    if (char) {
      CharacterManager.killCharacter(char, {
        day, cog: this._cogMax, round: this._round, killedBy,
      });
    }
    this._addLog(`${ally.name}  사망`, '#cc3030');
  }

  protected _flashDamage(shape: Phaser.GameObjects.Graphics | Phaser.GameObjects.Arc): void {
    if (!shape?.active) return;
    const orig = shape.alpha;
    this.tweens.add({
      targets: shape, alpha: 0.2, duration: 80, yoyo: true, repeat: 1,
      onComplete: () => { if (shape.active) shape.setAlpha(orig); },
    });
  }

  protected _checkBattleEnd(): void {
    if (!this._battleActive) return;
    if (this._enemies.every(e => e._dead))  this._endBattle('victory');
    else if (this._allies.every(a => a._dead)) this._endBattle('defeat');
  }

  protected _endBattle(result: 'victory' | 'defeat'): void {
    this._battleActive = false;
    this._attackTimers.forEach(t => { try { t.remove(); } catch (_) {} });
    this._attackTimers = [];

    // 생존자 HP 반영
    const chars = CharacterManager.loadAll() ?? [];
    this._allies.forEach(ally => {
      if (ally._dead) return;
      const char = chars.find(c => c.id === ally.id);
      if (char) char.currentHp = ally._hp;
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

  // ════════════════════════════════════════════════════════════
  //  결산 팝업
  // ════════════════════════════════════════════════════════════
  protected _showResultPopup(victory: boolean): void {
    const W = this.scale.width, H = this.scale.height;

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
        fontSize: this._fs(24),
        color: victory ? '#80e080' : '#e04040',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5).setDepth(52);

    let listY = py + ph * 0.28;
    this.add.text(W / 2, listY, '생존 현황', {
      fontSize: this._fs(12), color: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(52);
    listY += parseInt(this._fs(18));

    this._allies.forEach(ally => {
      const col  = ally._dead ? '#5a2222' : '#c8bfb0';
      const stat = ally._dead ? '사망' : `HP ${ally._hp} / ${ally._maxHp}`;
      this.add.text(W / 2, listY, `${ally.name}  —  ${stat}`, {
        fontSize: this._fs(11), color: col, fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(52);
      listY += parseInt(this._fs(15));
    });

    const btnY = py + ph * 0.86;
    const btnW = Math.round(W * 0.18), btnH = Math.round(H * 0.06);
    const btnBg  = this.add.graphics().setDepth(52);
    const btnTxt = this.add.text(W / 2, btnY,
      victory ? '다음으로' : '공방으로', {
        fontSize: this._fs(16), color: '#c8a070', fontFamily: FontManager.TITLE,
      }).setOrigin(0.5).setDepth(53);

    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0x2a1a08 : 0x1e1008, 1);
      btnBg.lineStyle(2, hover ? 0xc8a070 : 0xa05018, 1);
      btnBg.fillRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
      btnBg.strokeRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);
    };
    drawBtn(false);

    const btnHit = this.add.rectangle(W / 2, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(54);

    btnHit.on('pointerover', () => { drawBtn(true);  btnTxt.setStyle({ color: '#e8d090' }); });
    btnHit.on('pointerout',  () => { drawBtn(false); btnTxt.setStyle({ color: '#c8a070' }); });
    btnHit.on('pointerup', () => {
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
}
