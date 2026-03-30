// ================================================================
//  BattleScene.ts
//  경로: src/Scenes/BattleScene.ts
//
//  역할: 전투 씬 최종 클래스
//        init / create / shutdown + 적 생성 + 배경/HUD
//
//  상속: BattleSceneSetup → BattleSceneBattle → BattleScene
// ================================================================

import { CharacterManager } from '../Managers/CharacterManager';
import { FontManager }      from '../Managers/FontManager';
import { InputManager }     from '../Managers/InputManager';
import { SaveManager }      from '../Managers/SaveManager';
import { clearAllSceneDom } from '../utils/sceneCleanup';
import { ENEMY_DATA, getEnemyScaledStats } from '../Data/Data_Enemies';
import { BattleSceneBattle }               from './BattleScene_Battle';
import type { BattleInitData, EnemyInstance } from './BattleScene_Setup';

export class BattleScene extends BattleSceneBattle {
  constructor() { super({ key: 'BattleScene' }); }

  // ────────────────────────────────────────────────────────────
  init(data: BattleInitData): void {
    this._cogMax      = data.cogMax      ?? 1;
    this._battleParty = data.battleParty ?? [];
    this._round       = data.round       ?? 1;
    this._battleType  = data.battleType  ?? 'normal';
    this._maxRound    = data.maxRound    ?? 5;
    this._deepCoin    = data.deepCoin    ?? 0;
    this._log         = data.log         ?? [];
    this._inventory   = data.inventory   ?? null;
    this._submarine   = data.submarine   ?? null;
    this._shopItems   = data.shopItems   ?? null;
  }

  create(): void {
    clearAllSceneDom();
    const W = this.scale.width, H = this.scale.height;
    InputManager.reinit(this);

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

    // 상태 초기화
    this._battleActive = false;
    this._attackTimers = [];
    this._allyObjs     = [];
    this._enemyObjs    = [];
    this._sceneHits    = [];

    this._allChars   = CharacterManager.loadAll() ?? [];
    this._partyChars = this._battleParty
      .map(id => this._allChars.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> =>
        Boolean(c) && c!.status === 'alive'
      );
    this._combatParty = [];
    this._enemies     = this._spawnEnemies(this._cogMax);

    this._buildBackground(W, H);
    this._buildHUD(W, H);
    this._buildEnemyArea(W, H);
    this._buildSetupUI();
    this._buildLogArea(W, H);
  }

  shutdown(): void {
    this._battleActive = false;
    this._attackTimers.forEach(t => { try { t.remove(); } catch (_) {} });
    this._attackTimers = [];
    this._sceneHits.forEach(h => { try { h.destroy(); } catch (_) {} });
    this._sceneHits = [];
    if (this._setupEl?.parentElement) this._setupEl.remove();
    document.getElementById('battle-hud')?.remove();
  }

  // ════════════════════════════════════════════════════════════
  //  배경 / HUD
  // ════════════════════════════════════════════════════════════
  private _buildBackground(W: number, H: number): void {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    const grid = this.add.graphics();
    const step = Math.round(W / 60);
    grid.lineStyle(1, 0x0d0a06, 0.5);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
    this.add.text(W / 2, H / 2, 'BATTLE', {
      fontSize: FontManager.adjustedSize(100, this.scale),
      color: '#0a0705', fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0.05);
  }

  private _buildHUD(W: number, H: number): void {
    const TYPE_LABELS: Record<string, string> = {
      normal: '일  반  전', wave: '웨  이  브', raid: '레  이  드',
    };
    const TYPE_COLORS: Record<string, string> = {
      normal: '#8a9060', wave: '#406090', raid: '#904030',
    };

    this.add.text(W * 0.05, H * 0.03, `ROUND  ${this._round} / ${this._maxRound}`, {
      fontSize: this._fs(14), color: '#5a3a18', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    this.add.text(W * 0.5, H * 0.03,
      TYPE_LABELS[this._battleType] ?? '일  반  전', {
        fontSize: this._fs(13),
        color: TYPE_COLORS[this._battleType] ?? '#8a9060',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5, 0.5);

    const cogC = CharacterManager.getCogColor(this._cogMax);
    this.add.text(W * 0.95, H * 0.03, `COG  ${this._cogMax}`, {
      fontSize: this._fs(14), color: cogC.css, fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    const lg = this.add.graphics();
    lg.lineStyle(1, 0x1e1008, 0.8);
    lg.lineBetween(0, H * 0.06, W, H * 0.06);
  }

  // ════════════════════════════════════════════════════════════
  //  적 생성
  // ════════════════════════════════════════════════════════════
  private _spawnEnemies(cogMax: number): EnemyInstance[] {
    if (this._battleType === 'raid') return this._spawnRaid(cogMax);
    if (this._battleType === 'wave') return this._spawnWave(cogMax);
    return this._spawnNormal(cogMax);
  }

  private _spawnNormal(cogMax: number): EnemyInstance[] {
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
    if (!scaled) return [];
    return this._buildEnemyArray(picked.id, picked.name, picked.behavior, scaled, count);
  }

  private _spawnWave(cogMax: number): EnemyInstance[] {
    const pool = ENEMY_DATA.filter(e =>
      e.cogMin <= cogMax && (e.cogMax === null || e.cogMax >= cogMax)
    );
    if (!pool.length) return this._spawnNormal(cogMax);
    const picked = pool.find(e => e.id === 'drowned')
      ?? pool.reduce((best, e) =>
          e.spawnCount[1] > best.spawnCount[1] ? e : best, pool[0]);
    const [minC, maxC] = picked.spawnCount;
    const count  = (minC + 1) + Math.floor(Math.random() * (maxC - minC + 3));
    const scaled = getEnemyScaledStats(picked.id, cogMax);
    if (!scaled) return [];
    const enemies = this._buildEnemyArray(
      picked.id, picked.name, picked.behavior, scaled, count
    );
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

  private _spawnRaid(cogMax: number): EnemyInstance[] {
    const pool = ENEMY_DATA.filter(e =>
      e.cogMin <= cogMax && (e.cogMax === null || e.cogMax >= cogMax)
    );
    if (!pool.length) return [];
    const picked = pool.reduce((best, e) =>
      e.baseStats.hp > best.baseStats.hp ? e : best, pool[0]);
    const scaled = getEnemyScaledStats(picked.id, cogMax);
    if (!scaled) return [];
    const M = 2.5;
    return [{
      _uid: `e_raid_${Date.now()}`, id: picked.id,
      name: `[레이드] ${picked.name}`, behavior: picked.behavior,
      _hp:     Math.round(scaled.hp      * M),
      _maxHp:  Math.round(scaled.hp      * M),
      attack:  Math.round(scaled.attack  * M),
      agility: Math.round(scaled.agility * 1.2),
      luck:    Math.round(scaled.luck    * 1.5),
      _dead: false, _attackCount: 0,
    }];
  }

  private _buildEnemyArray(
    id: string, name: string, behavior: string,
    scaled: { hp: number; attack: number; agility: number; luck: number },
    count: number
  ): EnemyInstance[] {
    return Array.from({ length: count }, (_, i) => ({
      _uid: `e_${i}_${Date.now()}`, id, name, behavior,
      _hp: scaled.hp, _maxHp: scaled.hp,
      attack: scaled.attack, agility: scaled.agility, luck: scaled.luck,
      _dead: false, _attackCount: 0,
    }));
  }
}
