// ================================================================
//  BattleScene_Battle.ts
//  경로: src/Scenes/BattleScene_Battle.ts
//
//  역할: Phase 2 — 자동전투 루프, 타이머, 데미지 계산
//
//  상속: BattleSceneSetup → BattleSceneUI → BattleSceneBattle → BattleScene
// ================================================================

import Phaser from 'phaser';
import { CharacterManager } from '../Managers/CharacterManager';
import { SaveManager }      from '../Managers/SaveManager';
import { BattleSceneUI }    from './BattleScene_UI';
import { AllyInstance, EnemyInstance } from './BattleScene_Setup';

export abstract class BattleSceneBattle extends BattleSceneUI {
  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  // ════════════════════════════════════════════════════════════
  //  Phase 1 → Phase 2 전환
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
      const W = this.scale.width, H = this.scale.height;
      // 전투 진입: 적을 화면 폭에 맞춰 1단으로 재배치
      this._rebuildEnemyAreaForBattle(W, H);
      this._buildAllyArea(W, H);
      this._startBattle();
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

  // ── 아군 공격 ────────────────────────────────────────────────
  protected _allyAttack(ally: AllyInstance, allyIdx: number): void {
    const liveEnemies = this._enemies.filter(e => !e._dead);
    if (!liveEnemies.length) return;

    const target  = liveEnemies[Math.floor(Math.random() * liveEnemies.length)];
    const eff     = CharacterManager.getEffectiveStat(ally, 'attack');
    const luck    = CharacterManager.getEffectiveStat(ally, 'luck');
    const isCrit  = Math.random() < luck / 100;
    let   dmg     = Math.max(1, eff + Math.floor(Math.random() * 3));
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

  // ── 적 공격 ──────────────────────────────────────────────────
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

  // ── 아군 사망 ────────────────────────────────────────────────
  protected _killAlly(ally: AllyInstance, killedBy: string): void {
    ally._dead = true;
    this._allyObjs[this._allies.indexOf(ally)]?.destroyAll();
    const day  = SaveManager.load()?.day ?? 1;
    const char = this._allChars.find(c => c.id === ally.id);
    if (char) {
      CharacterManager.killCharacter(char, {
        day, cog: this._cogMax, round: this._round, killedBy,
      });
    }
    this._addLog(`${ally.name}  사망`, '#cc3030');
  }

  // ── 데미지 플래시 ────────────────────────────────────────────
  protected _flashDamage(shape: Phaser.GameObjects.Graphics | Phaser.GameObjects.Arc): void {
    if (!shape?.active) return;
    const orig = shape.alpha;
    this.tweens.add({
      targets: shape, alpha: 0.2, duration: 80, yoyo: true, repeat: 1,
      onComplete: () => { if (shape.active) shape.setAlpha(orig); },
    });
  }

  // ── 승패 판정 ────────────────────────────────────────────────
  protected _checkBattleEnd(): void {
    if (!this._battleActive) return;
    if (this._enemies.every(e => e._dead))   this._endBattle('victory');
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
}
