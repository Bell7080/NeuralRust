// ================================================================
//  PartyScene.ts
//  경로: src/Scenes/PartyScene.ts
//
//  역할: 탐사 파티 편성 씬
//        원본: 좌30(캐릭터 그리드)/중40(프로필)/우30(파티 슬롯+출발)
//        스텁: 기본 레이아웃 + 간소화된 카드 선택 + 출발
// ================================================================

import { FontManager }      from '../Managers/FontManager';
import { InputManager }     from '../Managers/InputManager';
import { SaveManager }      from '../Managers/SaveManager';
import { CharacterManager } from '../Managers/CharacterManager';
import { CharProfile }      from './Ateliers/CharProfile';
import { clearAllSceneDom } from '../utils/sceneCleanup';

export class PartyScene extends Phaser.Scene {
  constructor() { super({ key: 'PartyScene' }); }

  private W = 0;
  private H = 0;
  private _from = 'AtelierScene';
  private _party: string[] = [];
  private _partySlotObjs: Phaser.GameObjects.Text[] = [];
  private _cardObjs: { id: string; txt: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Graphics }[] = [];
  private _sceneHits: Phaser.GameObjects.GameObject[] = [];

  preload(): void {
    if (!this.textures.exists('bg_party'))
      this.load.image('bg_party', 'Games/Assets/Sprites/Background_007.png');
  }

  init(data: { from?: string }): void {
    this._from  = data.from || 'AtelierScene';
    this._party = [];
  }

  create(): void {
    // ★ 다른 씬의 DOM 잔여물 일괄 제거
    clearAllSceneDom();

    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    CharacterManager.initIfEmpty();
    const allChars = (CharacterManager.loadAll() || []) as Array<{
      id: string; name: string; job: string; cog: number;
      status?: string;
    }>;
    const chars = allChars.filter(c => !c.status || c.status === 'alive' || c.status === 'ai');

    this._buildBackground(W, H);
    this._buildHeader(W, H);
    this._buildCharGrid(W, H, chars);
    this._buildPartySlots(W, H);
    this._buildDepartBtn(W, H);
  }

  // ── 배경 ──────────────────────────────────────────────────────
  private _buildBackground(W: number, H: number): void {
    this.add.rectangle(0, 0, W, H, 0x050407).setOrigin(0);
    if (this.textures.exists('bg_party')) {
      const bg = this.add.image(W / 2, H / 2, 'bg_party');
      const scale = Math.max(W / bg.width, H / bg.height);
      bg.setScale(scale).setDepth(0);
    }
    this.add.rectangle(0, 0, W, H, 0x020103, 0.78).setOrigin(0).setDepth(1);

    const grid = this.add.graphics().setDepth(2);
    const step = Math.round(W / 60);
    grid.lineStyle(1, 0x0d0a06, 0.4);
    for (let x = 0; x <= W; x += step) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) grid.lineBetween(0, y, W, y);
  }

  // ── 헤더 ──────────────────────────────────────────────────────
  private _buildHeader(W: number, H: number): void {
    this.add.text(W / 2, H * 0.05, '파 티 편 성', {
      fontSize:   FontManager.adjustedSize(26, this.scale),
      color:      '#6b4020',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setDepth(3);

    this.add.text(W / 2, H * 0.05 + parseInt(FontManager.adjustedSize(22, this.scale)), 'PARTY SETUP', {
      fontSize:      FontManager.adjustedSize(10, this.scale),
      color:         '#2a1508',
      fontFamily:    FontManager.MONO,
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(3);

    const line = this.add.graphics().setDepth(3);
    line.lineStyle(1, 0x2a1a0a, 0.8);
    line.lineBetween(W * 0.05, H * 0.12, W * 0.95, H * 0.12);

    // 뒤로가기
    const backTxt = this.add.text(W * 0.04, H * 0.06, '← 돌아가기', {
      fontSize:   FontManager.adjustedSize(13, this.scale),
      color:      '#5a3a18',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5).setDepth(3).setInteractive({ useHandCursor: true });
    backTxt.on('pointerover',  () => backTxt.setStyle({ color: '#c8a070' }));
    backTxt.on('pointerout',   () => backTxt.setStyle({ color: '#5a3a18' }));
    backTxt.on('pointerdown',  () => this.scene.start('AtelierScene', { skipWelcome: true }));
    this._sceneHits.push(backTxt);
  }

  // ── 캐릭터 그리드 (좌측 60%) ──────────────────────────────────
  private _buildCharGrid(
    W: number, H: number,
    chars: Array<{ id: string; name: string; job: string; cog: number; status?: string }>
  ): void {
    const cols = 4;
    const cardW = W * 0.13;
    const cardH = H * 0.18;
    const startX = W * 0.04;
    const startY = H * 0.15;
    const gapX   = W * 0.015;
    const gapY   = H * 0.02;

    this._cardObjs = [];

    chars.slice(0, 20).forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = startX + col * (cardW + gapX) + cardW / 2;
      const cy  = startY + row * (cardH + gapY) + cardH / 2;

      const bg = this.add.graphics().setDepth(3);
      const drawCard = (selected: boolean, hover: boolean) => {
        bg.clear();
        const borderColor = selected ? 0xc8a070 : hover ? 0x6a4820 : 0x2a1a0a;
        bg.fillStyle(selected ? 0x201408 : 0x0e0a07, 1);
        bg.lineStyle(1, borderColor, 1);
        bg.strokeRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
        bg.fillRect  (cx - cardW / 2, cy - cardH / 2, cardW, cardH);
      };
      drawCard(false, false);

      const nameTxt = this.add.text(cx, cy - cardH * 0.08, c.name, {
        fontSize:   FontManager.adjustedSize(14, this.scale),
        color:      '#c8a070',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0.5).setDepth(4);

      const jobTxt = this.add.text(cx, cy + cardH * 0.2, `${c.job}  COG ${c.cog}`, {
        fontSize:   FontManager.adjustedSize(9, this.scale),
        color:      '#5a3a18',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(4);

      this.add.text(cx, cy + cardH * 0.42, '더블클릭 → 프로필', {
        fontSize:   FontManager.adjustedSize(7, this.scale),
        color:      '#2a1a08',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(4);

      const hit = this.add.rectangle(cx, cy, cardW, cardH, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(5);

      const isSelected = () => this._party.includes(c.id);

      hit.on('pointerover', () => {
        drawCard(isSelected(), true);
        nameTxt.setStyle({ color: '#e8d090' });
      });
      hit.on('pointerout', () => {
        drawCard(isSelected(), false);
        nameTxt.setStyle({ color: isSelected() ? '#e8c080' : '#c8a070' });
      });
      // 단일 클릭: 파티 선택/해제 | 더블클릭: 프로필 팝업
      let _clickTimer: ReturnType<typeof setTimeout> | null = null;
      hit.on('pointerdown', () => {
        if (_clickTimer) {
          clearTimeout(_clickTimer);
          _clickTimer = null;
          // 더블클릭 — 프로필
          const allChars = (CharacterManager.loadAll() || []) as ReturnType<typeof CharacterManager.loadAll>;
          const full = allChars?.find(ch => ch.id === c.id);
          if (full) CharProfile.open(full, { scene: this });
          return;
        }
        _clickTimer = setTimeout(() => {
          _clickTimer = null;
          // 단일 클릭 — 파티 토글
          if (isSelected()) {
            this._party = this._party.filter(id => id !== c.id);
          } else if (this._party.length < 4) {
            this._party.push(c.id);
          }
          this._refreshPartySlots();
          this._cardObjs.forEach(obj => {
            const sel = this._party.includes(obj.id);
            drawCard(sel, false);
          });
          nameTxt.setStyle({ color: isSelected() ? '#e8c080' : '#c8a070' });
        }, 220);
      });

      this._cardObjs.push({ id: c.id, txt: nameTxt, bg });
      this._sceneHits.push(hit);
    });

    if (chars.length === 0) {
      this.add.text(W * 0.32, H * 0.5, '등록된 캐릭터가 없습니다.', {
        fontSize:   FontManager.adjustedSize(16, this.scale),
        color:      '#3a2010',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5).setDepth(3);
    }
  }

  // ── 파티 슬롯 (우측) ─────────────────────────────────────────
  private _buildPartySlots(W: number, H: number): void {
    const rx = W * 0.72;
    this.add.text(rx, H * 0.15, '파 티 현 황', {
      fontSize:   FontManager.adjustedSize(15, this.scale),
      color:      '#7a5028',
      fontFamily: FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(3);

    this._partySlotObjs = [];
    for (let i = 0; i < 4; i++) {
      const slotY = H * 0.23 + i * H * 0.1;
      this.add.text(rx - W * 0.10, slotY, `SLOT ${i + 1}`, {
        fontSize:   FontManager.adjustedSize(10, this.scale),
        color:      '#3a2a10',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5).setDepth(3);

      const slotLine = this.add.graphics().setDepth(3);
      slotLine.lineStyle(1, 0x2a1a0a, 0.8);
      slotLine.lineBetween(rx - W * 0.10, slotY + parseInt(FontManager.adjustedSize(8, this.scale)),
                           rx + W * 0.14, slotY + parseInt(FontManager.adjustedSize(8, this.scale)));

      const txt = this.add.text(rx - W * 0.06, slotY, '—', {
        fontSize:   FontManager.adjustedSize(15, this.scale),
        color:      '#3a2a10',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0.5).setDepth(4);
      this._partySlotObjs.push(txt);
    }
    this._refreshPartySlots();
  }

  private _refreshPartySlots(): void {
    const allChars = (CharacterManager.loadAll() || []) as Array<{ id: string; name: string }>;
    this._partySlotObjs.forEach((txt, i) => {
      const id   = this._party[i];
      const char = id ? allChars.find(c => c.id === id) : null;
      txt.setText(char ? char.name : '—');
      txt.setStyle({ color: char ? '#c8a070' : '#3a2a10' });
    });
  }

  // ── 출발 버튼 ─────────────────────────────────────────────────
  private _buildDepartBtn(W: number, H: number): void {
    const bx = W * 0.84;
    const by = H * 0.78;
    const bw = W * 0.14;
    const bh = H * 0.07;

    const bg = this.add.graphics().setDepth(3);
    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(hover ? 0x2a1a08 : 0x1e1008, 1);
      bg.lineStyle(2, hover ? 0xc8a070 : 0xa05018, 0.9);
      bg.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);
      bg.fillRect  (bx - bw / 2, by - bh / 2, bw, bh);
    };
    draw(false);

    const txt = this.add.text(bx, by, '출    발', {
      fontSize:   FontManager.adjustedSize(20, this.scale),
      color:      '#c8a070',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setDepth(4);

    const costTxt = this.add.text(bx, by + parseInt(FontManager.adjustedSize(14, this.scale)) + 4,
      '파티를 선택하세요', {
      fontSize:   FontManager.adjustedSize(9, this.scale),
      color:      '#5a3a18',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(4);

    const hit = this.add.rectangle(bx, by, bw, bh, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);

    hit.on('pointerover', () => { draw(true); txt.setStyle({ color: '#e8d090' }); });
    hit.on('pointerout',  () => { draw(false); txt.setStyle({ color: '#c8a070' }); });
    hit.on('pointerdown', () => {
      if (this._party.length === 0) return;
      hit.disableInteractive();
      draw(false);

      const cost = this._party.reduce((s, id) => {
        const allChars = (CharacterManager.loadAll() || []) as Array<{ id: string; cog: number }>;
        const c = allChars.find(ch => ch.id === id);
        return s + (c?.cog ?? 0);
      }, 0);
      costTxt.setText(`Arc 소비: ${cost}`);

      const ok = SaveManager.spendArc ? (SaveManager.spendArc as (n: number) => boolean)(cost) : true;
      if (!ok) {
        costTxt.setText('Arc 부족');
        hit.setInteractive({ useHandCursor: true });
        return;
      }

      if ((CharacterManager as unknown as { saveParty?: (p: string[]) => void }).saveParty) {
        (CharacterManager as unknown as { saveParty: (p: string[]) => void }).saveParty(this._party);
      }

      const fl = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
        .setOrigin(0).setDepth(999);
      this.tweens.add({
        targets: fl, alpha: 1, duration: 350, ease: 'Sine.easeIn',
        onComplete: () => this.scene.start('ExploreScene', { from: 'PartyScene' }),
      });
    });

    // party 변경 시 cost 텍스트 갱신 (timers로 polling 대신 직접 갱신)
    this.events.on('update', () => {
      if (this._party.length === 0) {
        costTxt.setText('파티를 선택하세요');
      } else {
        const allChars = (CharacterManager.loadAll() || []) as Array<{ id: string; cog: number }>;
        const cost = this._party.reduce((s, id) => {
          const c = allChars.find(ch => ch.id === id);
          return s + (c?.cog ?? 0);
        }, 0);
        const arc = (SaveManager.getProgress() as { arc?: number })?.arc ?? 0;
        costTxt.setText(`Arc ${arc}  →  소비 ${cost}`);
      }
    });

    this._sceneHits.push(hit);
  }

  shutdown(): void {
    this._sceneHits.forEach(h => { try { h.destroy(); } catch (_) {} });
    this._sceneHits = [];
  }
}
