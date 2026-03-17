// ================================================================
//  DiveScene.js
//  경로: Games/Codes/Scenes/DiveScene.js
//
//  역할: 탐사 로비 메인 씬 — 조립 + 씬 전환만 담당
//
//  ── 레이아웃 ────────────────────────────────────────────────
//  ┌──────┬──────────────────────────────────────────────────┐
//  │      │  심해화폐 / ROUND / COG / 파티생존 / 철수         │ TopPanel
//  │ 탭   ├──────────────────────────────────────────────────┤
//  │ 버튼 │                                                  │
//  │      │  [슬롯1]  [슬롯2]  [슬롯3]  [레버]               │ SlotArea
//  │      │                                                  │
//  │      ├──────────────────────────────────────────────────┤
//  │      │  탭 콘텐츠 (하단 패널)                            │ BottomPanel
//  └──────┴──────────────────────────────────────────────────┘
//
//  ── 탭 목록 ────────────────────────────────────────────────
//    인벤토리  — 소모품 칸 그리드 (1칸=1아이템, 제한 칸 수)
//    잠수정    — 심해 별빛 대기 + 스팀펑크 테트리스 그리드
//    심해 상점 — 구매 → 인벤/잠수정 자동 분배
//    파티 관리 — 탐사 파티원 HP / 상태
//    탐사 일지 — 라운드 기록
//
//  ── index.html 로드 순서 ────────────────────────────────────
//  Dives/Dive_Background.js
//  Dives/Dive_TopPanel.js
//  Dives/Dive_Slots.js
//  Dives/Dive_Tabs.js
//  Dives/Panels/Dive_Panel_Inventory.js
//  Dives/Panels/Dive_Panel_Submarine.js
//  Dives/Panels/Dive_Panel_Shop.js
//  Dives/Panels/Dive_Panel_Party.js
//  Dives/Panels/Dive_Panel_Journal.js
//  DiveScene.js   ← 반드시 마지막
//
//  슬롯 유형: 'normal' | 'wave' | 'raid'
//
//  TODO:
//    - 음식 시스템 (maxRound 연장)
//    - 황금 코인 슬롯 보정 아이템
//    - 증강 효과 BattleScene 실제 연동
// ================================================================

class DiveScene extends Phaser.Scene {
  constructor() { super({ key: 'DiveScene' }); }

  // ── 진입 데이터 ──────────────────────────────────────────────────
  init(data) {
    this._cogMax      = data.cogMax      || 1;
    this._round       = data.round       || 1;
    this._maxRound    = data.maxRound    || 5;
    this._deepCoin    = data.deepCoin    || 0;
    this._log         = data.log         || [];
    this._battleParty = data.battleParty && data.battleParty.length
      ? data.battleParty
      : (CharacterManager.loadParty() || []);

    this._sceneHits = [];
    this._activeTab = null;

    // 탐사 내 라운드 간 유지 데이터
    this._inventory  = data.inventory  || null;
    this._submarine  = data.submarine  || null;
    this._shopItems  = data.shopItems  || null;
  }

  // ── 씬 생성 ──────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;
    InputManager.reinit(this);

    // 현재 씬 기록 — 로비 이어하기 시 탐사 로비로 복귀
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

    // 슬롯 상태
    this._phase      = 'idle';
    this._results    = [null, null, null];
    this._chosen     = -1;
    this._canChoose  = false;
    this._slots      = [];
    this._spinTimer  = null;

    // ── 빌드 ──────────────────────────────────────────────────────
    DiveBuildBackground(this, W, H);
    const { deepCoinTxt } = DiveBuildTopPanel(this, W, H);
    this._deepCoinTxt = deepCoinTxt;
    DiveBuildSlotArea(this, W, H);
    DiveBuildTabs(this, W, H);

    if (this._round > this._maxRound) {
      this.time.delayedCall(300, () => this._exitExpedition());
    }
  }

  // ── 씬 전환 ──────────────────────────────────────────────────────
  _enterBattle(battleType) {
    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 350, ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.start('BattleScene', {
          cogMax:      this._cogMax,
          battleParty: this._battleParty,
          round:       this._round,
          battleType,
          maxRound:    this._maxRound,
          deepCoin:    this._deepCoin,
          log:         this._log,
          // 탐사 내 유지 데이터 (라운드 복귀 시 이어받음)
          inventory:   this._inventory,
          submarine:   this._submarine,
          shopItems:   this._shopItems,
        });
      },
    });
  }

  _exitExpedition() {
    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 400, ease: 'Sine.easeIn',
      onComplete: () => this.scene.start('AtelierScene'),
    });
  }

  // ── 씬 정리 ──────────────────────────────────────────────────────
  shutdown() {
    if (this._spinTimer) this._spinTimer.remove();
    this._sceneHits.forEach(h => { try { h.destroy(); } catch(e){} });
    this._sceneHits = [];
  }
}
