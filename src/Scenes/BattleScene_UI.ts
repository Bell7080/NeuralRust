// ================================================================
//  BattleScene_UI.ts
//  경로: src/Scenes/BattleScene_UI.ts
//
//  역할: Phase 2 — 전투 UI 렌더링
//        적/아군 Phaser 오브젝트 빌드
//        로그 영역 (CSS DOM — .battle-log)
//        결산 팝업 (Phaser)
//
//  상속: BattleSceneSetup → BattleSceneUI → BattleSceneBattle → BattleScene
// ================================================================

import Phaser from 'phaser';
import { CharacterManager } from '../Managers/CharacterManager';
import { FontManager }      from '../Managers/FontManager';
import {
  BattleSceneSetup,
  AllyInstance, EnemyInstance,
  AllyUnitObjs, EnemyUnitObjs,
} from './BattleScene_Setup';

export abstract class BattleSceneUI extends BattleSceneSetup {
  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  // ── 상태 (BattleSceneBattle에서 사용) ───────────────────────
  protected _allies:       AllyInstance[]          = [];
  protected _enemies:      EnemyInstance[]          = [];
  protected _allyObjs:     AllyUnitObjs[]           = [];
  protected _enemyObjs:    EnemyUnitObjs[]          = [];
  protected _attackTimers: Phaser.Time.TimerEvent[] = [];
  protected _battleActive  = false;

  // ── CSS DOM 로그 ─────────────────────────────────────────────
  private _logEl!: HTMLElement;

  // ════════════════════════════════════════════════════════════
  //  적 영역 (상단 30%)  — Phaser
  //  편성 단계: 좌/우 패널(24%)에 가려지지 않도록 중앙 그리드(52%)
  //  전투 단계: 화면 폭에 맞춰 1단으로 좍 펼치기 (수가 많으면 작게)
  // ════════════════════════════════════════════════════════════
  protected _buildEnemyArea(
    W: number, H: number, mode: 'setup' | 'battle' = 'setup'
  ): void {
    const areaY = H * 0.06, areaH = H * 0.31;
    const count = this._enemies.length;
    if (!count) return;

    let layout: { cx: number; cy: number; size: number }[];

    if (mode === 'battle') {
      // 전투: 화면 가용 폭의 96% 안에 한 줄로 균등 배치
      const availW = W * 0.96;
      const startEdge = (W - availW) / 2;
      const gap   = Math.min(availW * 0.02, W * 0.015);
      const unitW = Math.min(
        (availW - gap * (count - 1)) / count,
        areaH * 0.65,
      );
      const totalW = count * unitW + (count - 1) * gap;
      const startX = startEdge + (availW - totalW) / 2 + unitW / 2;
      const cy     = areaY + areaH * 0.45;
      layout = this._enemies.map((_, i) => ({
        cx:   startX + i * (unitW + gap),
        cy,
        size: unitW,
      }));
    } else {
      // 편성: 중앙 52% 폭에 4열 그리드 (5명 이상이면 자동 다음 줄)
      const centerLeft = W * 0.25;
      const centerW    = W * 0.5;
      const cols  = Math.min(count, 4);
      const rows  = Math.ceil(count / cols);
      const gapX  = centerW * 0.015;
      const gapY  = areaH * 0.06;
      const rowH  = (areaH - gapY * (rows - 1)) / rows;
      const unitW = Math.min(
        (centerW - gapX * (cols - 1)) / cols,
        rowH * 1.05,
      );
      const totalW = cols * unitW + (cols - 1) * gapX;
      const startX = centerLeft + centerW / 2 - totalW / 2 + unitW / 2;
      const startY = areaY + rowH * 0.5;
      layout = this._enemies.map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        return {
          cx:   startX + c * (unitW + gapX),
          cy:   startY + r * (rowH + gapY),
          size: unitW,
        };
      });
    }

    this._enemies.forEach((enemy, i) => {
      const { cx, cy, size } = layout[i];
      this._enemyObjs.push(this._makeEnemyUnit(enemy, cx, cy, size));
    });

    this.add.graphics().lineStyle(1, 0x1e1008, 0.6)
      .lineBetween(W * 0.02, areaY + areaH, W * 0.98, areaY + areaH);
  }

  // ── 전투 진입 시 단일행으로 재배치 ─────────────────────────
  protected _rebuildEnemyAreaForBattle(W: number, H: number): void {
    this._enemyObjs.forEach(o => { try { o.destroyAll(); } catch (_) {} });
    this._enemyObjs = [];
    this._buildEnemyArea(W, H, 'battle');
  }

  protected _makeEnemyUnit(
    enemy: EnemyInstance, cx: number, cy: number, size: number
  ): EnemyUnitObjs {
    const half = size * 0.46;

    // 빈 graphics — flash 효과 호환용 (테두리 없음)
    const shape = this.add.graphics();

    // 적 스프라이트 이미지 (테두리/배경 없이 투명 PNG 그대로)
    let spriteImg: Phaser.GameObjects.Image | null = null;
    const sk = enemy.spriteKey ?? '';
    if (sk && this.textures.exists(sk)) {
      const frame = this.textures.get(sk).get();
      const imgW  = frame.realWidth  || frame.width  || half * 2;
      const imgH  = frame.realHeight || frame.height || half * 2;
      // contain: 박스 안에 비율 유지하며 들어가도록
      const scale = Math.min((half * 2) / imgW, (half * 2) / imgH);
      spriteImg = this.add.image(cx, cy, sk)
        .setDisplaySize(imgW * scale, imgH * scale)
        .setDepth(1);
    }

    const nameTxt = this.add.text(cx, cy - half - Math.round(size * 0.04), enemy.name, {
      fontSize: this._fs(11), color: '#c8a060', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1).setDepth(2);

    const barW = size * 0.9, barH = Math.max(6, Math.round(size * 0.1));
    const barY = cy + half + Math.round(size * 0.06);
    const hpBg = this.add.graphics().setDepth(2);
    hpBg.fillStyle(0x1a0a06, 1);
    hpBg.fillRect(cx - barW / 2, barY, barW, barH);
    const hpFg = this.add.graphics().setDepth(2);
    const hpNumTxt = this.add.text(cx, barY + barH + Math.round(size * 0.03), '', {
      fontSize: this._fs(9), color: '#a06040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0).setDepth(2);

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

    // 편성 단계(전투 시작 전)에 클릭 시 우측 정보 패널에 적 정보 표시
    const hit = this.add.rectangle(cx, cy, half * 2, half * 2, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(3);
    hit.on('pointerup', () => {
      if (this._battleActive) return;
      this._showEnemyInfo(enemy);
    });
    this._sceneHits.push(hit);

    const destroyAll = () => {
      ([shape, spriteImg, nameTxt, hpBg, hpFg, hpNumTxt, hit] as Array<{ active?: boolean; destroy(): void } | null>)
        .forEach(o => { try { if (o && o.active !== false) o.destroy(); } catch (_) {} });
      const idx = this._sceneHits.indexOf(hit);
      if (idx >= 0) this._sceneHits.splice(idx, 1);
    };

    return { enemy, shape, spriteImg, nameTxt, hpBg, hpFg, hpNumTxt, hit, refreshHp, destroyAll, cx, cy, half };
  }

  // ════════════════════════════════════════════════════════════
  //  아군 영역  — Phaser
  // ════════════════════════════════════════════════════════════
  protected _buildAllyArea(W: number, H: number): void {
    const areaY = H * 0.61, areaH = H * 0.30;
    const count = this._allies.length;
    if (!count) return;

    const availW = W;
    const unitW  = Math.min(availW * 0.14, areaH * 0.55);
    const gap    = Math.max(W * 0.01, (availW * 0.90 - unitW * count) / (count + 1));
    const totalW = count * unitW + (count - 1) * gap;
    const startX = W / 2 - totalW / 2 + unitW / 2;

    this.add.graphics().lineStyle(1, 0x1e1008, 0.6)
      .lineBetween(W * 0.02, areaY, W * 0.98, areaY);

    this._allies.forEach((ally, i) => {
      const cx = startX + i * (unitW + gap);
      const cy = areaY + areaH * 0.40;
      this._allyObjs.push(this._makeAllyUnit(ally, cx, cy, unitW, i));
    });
  }

  protected _makeAllyUnit(
    ally: AllyInstance, cx: number, cy: number, size: number, posIdx: number
  ): AllyUnitObjs {
    const cogC = CharacterManager.getCogColor(ally.cog);
    const halfW = size * 0.38;
    const halfH = halfW * 1.35;   // 초상화 세로 비율 (약 3:4)

    this.add.text(cx, cy - halfH - Math.round(size * 0.05), `${posIdx + 1}`, {
      fontSize: this._fs(9), color: '#2a1a0a', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);

    const shape = this.add.graphics();
    shape.fillStyle(0x0a1a2a, 1);
    shape.lineStyle(2, cogC.phaser, 0.85);
    shape.fillRect(cx - halfW, cy - halfH, halfW * 2, halfH * 2);
    shape.strokeRect(cx - halfW, cy - halfH, halfW * 2, halfH * 2);
    shape.setDepth(1);

    let spriteImg: Phaser.GameObjects.Image | null = null;
    let maskGfx:   Phaser.GameObjects.Graphics | null = null;
    if (this.textures.exists(ally.spriteKey)) {
      const frame    = this.textures.get(ally.spriteKey).get();
      const imgW     = frame.realWidth  || frame.width  || halfW * 2;
      const imgH     = frame.realHeight || frame.height || halfH * 2;
      const coverScale  = Math.max((halfW * 2) / imgW, (halfH * 2) / imgH);
      const sW       = imgW * coverScale;
      const sH       = imgH * coverScale;
      // object-position: center 15% — 상단 15% 여백만 잘리도록 이미지 아래로 이동
      const yOverflow   = Math.max(0, sH - halfH * 2);
      const portraitCy  = cy + yOverflow * 0.35;

      maskGfx = this.make.graphics({ x: 0, y: 0 });
      maskGfx.fillStyle(0xffffff);
      maskGfx.fillRect(cx - halfW, cy - halfH, halfW * 2, halfH * 2);

      spriteImg = this.add.image(cx, portraitCy, ally.spriteKey)
        .setDisplaySize(sW, sH)
        .setAlpha(1)
        .setDepth(2)
        .setMask(maskGfx.createGeometryMask());
    }

    const nameTxt = this.add.text(cx, cy + halfH + Math.round(size * 0.04), ally.name, {
      fontSize: this._fs(10), color: '#c8bfb0', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    const barW      = size * 0.95, barH = Math.max(5, Math.round(size * 0.09));
    const hpBarY    = cy + halfH + parseInt(this._fs(14)) + Math.round(size * 0.06);
    const gaugeBarY = hpBarY + barH + Math.round(size * 0.03);

    const hpBg    = this.add.graphics();
    hpBg.fillStyle(0x0a0808, 1);
    hpBg.fillRect(cx - barW / 2, hpBarY, barW, barH);
    const hpFg    = this.add.graphics();
    const gaugeBg = this.add.graphics();
    gaugeBg.fillStyle(0x080a10, 1);
    gaugeBg.fillRect(cx - barW / 2, gaugeBarY, barW, barH);
    const gaugeFg = this.add.graphics();

    const hpTxt    = this.add.text(cx, hpBarY - 1, '', {
      fontSize: this._fs(8), color: '#7a6040', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 1);
    const gaugeTxt = this.add.text(cx, gaugeBarY + barH + Math.round(size * 0.01), '', {
      fontSize: this._fs(8), color: '#4a5870', fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    const skillHit = this.add.rectangle(cx, cy, halfW * 2, halfH * 2, 0x000000, 0)
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
      const maxG = 300, pct = Math.min(1, ally._gauge / maxG);
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
        shape.fillRect(cx - halfW, cy - halfH, halfW * 2, halfH * 2);
        shape.strokeRect(cx - halfW, cy - halfH, halfW * 2, halfH * 2);
        spriteImg?.setDepth(2);
        skillHit.setInteractive({ useHandCursor: true });
      }
    };
    const destroyAll = () => {
      ([shape, spriteImg, maskGfx, nameTxt, hpBg, hpFg, hpTxt,
        gaugeBg, gaugeFg, gaugeTxt, skillHit] as Array<{ active?: boolean; destroy(): void } | null>)
        .forEach(o => { try { if (o && o.active !== false) o.destroy(); } catch (_) {} });
    };
    refreshHp(); refreshGauge();
    return { ally, shape, spriteImg, nameTxt, hpBg, hpFg, hpTxt, gaugeBg, gaugeFg, gaugeTxt,
             skillHit, refreshHp, refreshGauge, destroyAll, cx, cy, rad: halfW };
  }

  // ════════════════════════════════════════════════════════════
  //  로그 영역 — CSS DOM (.battle-log inside #battle-hud)
  // ════════════════════════════════════════════════════════════
  protected _buildLogArea(_W: number, _H: number): void {
    // #battle-hud가 없으면 생성
    let hud = document.getElementById('battle-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'battle-hud';
      hud.classList.add('visible');
      document.body.appendChild(hud);
    }
    const log = document.createElement('div');
    log.className = 'battle-log';
    hud.appendChild(log);
    this._logEl = log;
  }

  protected _addLog(text: string, color = '#c8c0b0'): void {
    if (!this._logEl) return;
    const entry = document.createElement('div');
    entry.className = 'battle-log__entry';
    entry.style.color = color;
    entry.textContent = `> ${text}`;
    this._logEl.prepend(entry);
    // 최대 40줄 유지
    while (this._logEl.children.length > 40) {
      this._logEl.lastElementChild?.remove();
    }
  }

  protected _cleanupLogEl(): void {
    this._logEl?.remove();
  }

  // ════════════════════════════════════════════════════════════
  //  결산 팝업  — Phaser
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
      victory ? '다음으로' : '계속 진행', {
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
            if (this._log.length > 0) this._log[this._log.length - 1].result = 'victory';
            if (nextRound > this._maxRound) {
              this.scene.start('AtelierScene');
            } else {
              this.scene.start('DiveScene', {
                cogMax: this._cogMax, battleParty: this._battleParty,
                round: nextRound, maxRound: this._maxRound,
                deepCoin: this._deepCoin, log: this._log,
                inventory: this._inventory, submarine: this._submarine,
                shopItems: this._shopItems,
              });
            }
          } else {
            if (this._log.length > 0) this._log[this._log.length - 1].result = 'defeat';
            // 패배 시에도 전멸이 아니라면 생존 파티원으로 다음 라운드를 이어서 진행한다.
            const chars = CharacterManager.loadAll() ?? [];
            const aliveParty = this._battleParty.filter(id =>
              chars.some(char => char.id === id && char.status === 'alive')
            );
            // 탐사 인원이 모두 사라졌을 때만 공방으로 복귀한다.
            if (aliveParty.length === 0) {
              this.scene.start('AtelierScene');
            } else {
              this.scene.start('DiveScene', {
                cogMax: this._cogMax, battleParty: aliveParty,
                round: this._round + 1, maxRound: this._maxRound,
                deepCoin: this._deepCoin, log: this._log,
                inventory: this._inventory, submarine: this._submarine,
                shopItems: this._shopItems,
              });
            }
          }
        },
      });
    });
  }
}
