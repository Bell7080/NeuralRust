// ================================================================
//  AtelierScene.ts
//  경로: src/Scenes/AtelierScene.ts
//
//  Phaser 레이어: 배경 이미지, 전환 플래시
//  HTML 레이어:   AtelierHUD (#atelier-hud) — 사이드 버튼, HUD, 탭 콘텐츠
// ================================================================

import { SaveManager }    from '../Managers/SaveManager';
import { InputManager }   from '../Managers/InputManager';
import { CharacterManager } from '../Managers/CharacterManager';
import { AtelierHUD, type TabKey } from './Ateliers/AtelierHUD';
import { Tab_Welcome }    from './Ateliers/Tab_Welcome';
import { Tab_Explore }    from './Ateliers/Tab_Explore';
import { Tab_Recruit }    from './Ateliers/Tab_Recruit';
import { Tab_Manage_Full } from './Ateliers/Tab_Manage_Full';
import { Tab_Facility, Tab_Outsource, Tab_Dredge,
         Tab_Shop, Tab_Storage, Tab_Codex, Tab_Memory } from './Ateliers/Tab_Stubs';

type TabInstance = {
  show: ()  => void;
  hide: ()  => void;
  destroy: () => void;
  readonly _container: null;
};

const TAB_MAP = {
  explore:   Tab_Explore,
  recruit:   Tab_Recruit,
  manage:    Tab_Manage_Full,
  facility:  Tab_Facility,
  outsource: Tab_Outsource,
  dredge:    Tab_Dredge,
  shop:      Tab_Shop,
  storage:   Tab_Storage,
  codex:     Tab_Codex,
  memory:    Tab_Memory,
} as const;

export class AtelierScene extends Phaser.Scene {
  constructor() { super({ key: 'AtelierScene' }); }

  private W = 0;
  private H = 0;

  private _pendingTab!:  TabKey;
  private _activeTab:    TabKey | null = null;
  private _fromScene!:   string;
  private _skipWelcome!: boolean;
  private _preManageTab: TabKey = 'explore';

  private _hud!:           AtelierHUD;
  private _currentTabObj:  TabInstance | null = null;
  private _welcomeObj:     Tab_Welcome | null = null;
  private _tabSwitching  = false;

  // ════════════════════════════════════════════════════════════
  //  생명주기
  // ════════════════════════════════════════════════════════════
  init(data: { tab?: string; from?: string; skipWelcome?: boolean }): void {
    this._pendingTab   = (data.tab  || 'explore') as TabKey;
    this._activeTab    = null;
    this._fromScene    = data.from  || 'LobbyScene';
    this._skipWelcome  = data.skipWelcome || false;
    this._preManageTab = 'explore';
  }

  preload(): void {
    if (!this.textures.exists('bg_atelier'))
      this.load.image('bg_atelier', 'Games/Assets/Sprites/Background_009.png');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W;
    this.H = H;

    SaveManager.saveCurrentScene('AtelierScene', {});
    InputManager.reinit(this);
    CharacterManager.initIfEmpty();

    this._buildBackground(W, H);
    this._buildHUD();

    this._switchTab(this._pendingTab, true);

    if (!this._skipWelcome && this._fromScene === 'LobbyScene') {
      this._showWelcome();
    } else {
      this._hud.show();
    }
  }

  shutdown(): void {
    this._welcomeObj?.destroy();
    this._currentTabObj?.destroy();
    this._hud?.destroy();
    // 씬 전환 시 미처 닫히지 않은 팝업 정리
    document.getElementById('char-profile-overlay')?.remove();
  }

  // ── 배경 ──────────────────────────────────────────────────────
  private _buildBackground(W: number, H: number): void {
    this.add.rectangle(0, 0, W, H, 0x060408).setOrigin(0);

    if (this.textures.exists('bg_atelier')) {
      this.add.image(W / 2, H / 2, 'bg_atelier')
        .setDisplaySize(W, H).setDepth(0);
    }

    this.add.rectangle(0, 0, W, H, 0x020103, 0.72).setOrigin(0).setDepth(1);
  }

  // ── HUD 빌드 ─────────────────────────────────────────────────
  private _buildHUD(): void {
    this._hud = new AtelierHUD({
      onTab:      (key) => this._switchTab(key),
      onSettings: () => this.scene.start('SettingsScene', { from: 'AtelierScene' }),
      onLobby:    () => this._goLobby(),
    });

    // arcUpdated 이벤트 반영
    this.events.on('arcUpdated', (newArc: number) => {
      this._hud.updateArc(newArc);
    }, this);
  }

  // ── 웰컴 팝업 ────────────────────────────────────────────────
  private _showWelcome(): void {
    this._welcomeObj = new Tab_Welcome(
      this, this.W, this.H,
      () => {
        // 타이핑 완료 → HUD 표시
        this._hud.show();
      },
      this._hud.contentEl,
    );
  }

  // ════════════════════════════════════════════════════════════
  //  탭 전환
  // ════════════════════════════════════════════════════════════
  private _switchTab(key: TabKey, instant = false): void {
    if (!instant && key === this._activeTab && !this._welcomeObj) return;
    if (this._tabSwitching) return;

    if (key === 'manage') {
      this._enterManageFull();
      return;
    }

    const build = () => {
      this._tabSwitching = false;

      // 웰컴 팝업 제거
      if (this._welcomeObj) {
        const wo = this._welcomeObj;
        this._welcomeObj = null;
        wo.destroy();
      }

      // 이전 탭 제거
      if (this._currentTabObj) {
        this._currentTabObj.destroy();
        this._currentTabObj = null;
      }

      this._activeTab = key;
      this._hud.setActiveTab(key);

      const Cls = TAB_MAP[key];
      if (!Cls) return;

      const tab = new (Cls as new (
        scene: Phaser.Scene, W: number, H: number,
        contentEl: HTMLElement,
      ) => TabInstance)(
        this, this.W, this.H, this._hud.contentEl,
      );
      this._currentTabObj = tab;
      tab.show();
    };

    if (instant) { build(); return; }

    this._tabSwitching = true;
    const prev = this._currentTabObj;
    if (prev) {
      prev.hide();
      this.time.delayedCall(120, build);
    } else {
      build();
    }
  }

  // ── 관리 탭 진입 ─────────────────────────────────────────────
  private _enterManageFull(): void {
    if (this._tabSwitching) return;
    this._tabSwitching = true;

    if (!this._preManageTab) this._preManageTab = 'explore';

    this._hud.setManageMode(true);

    const W = this.W, H = this.H;

    this.time.delayedCall(260, () => {
      this._tabSwitching = false;

      if (this._currentTabObj) {
        this._currentTabObj.destroy();
        this._currentTabObj = null;
      }

      this._activeTab = 'manage';
      this._hud.setActiveTab('manage');

      const tab = new Tab_Manage_Full(
        this, W, H,
        () => this._exitManageFull(),
        this._hud.contentEl,
      );
      this._currentTabObj = tab;
      tab.show();
    });
  }

  // ── 관리 탭 퇴장 ─────────────────────────────────────────────
  private _exitManageFull(): void {
    if (this._currentTabObj) {
      this._currentTabObj.destroy();
      this._currentTabObj = null;
    }

    this._hud.setManageMode(false);

    const returnTab = this._preManageTab || 'explore';
    this._preManageTab = 'explore';
    this._activeTab    = null;

    this.time.delayedCall(160, () => {
      this._switchTab(returnTab, true);
    });
  }

  // ── 로비 전환 ─────────────────────────────────────────────────
  private _goLobby(): void {
    const flash = this.add.rectangle(0, 0, this.W, this.H, 0x060408, 0)
      .setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 1, duration: 300, ease: 'Sine.easeIn',
      onComplete: () => this.scene.start('LobbyScene'),
    });
  }

  // ── ExploreScene으로 전환 시 사용 (Tab_Explore에서 호출) ───────
  _slideOutUIThen(onComplete: () => void): void {
    this._hud.hide();
    this.time.delayedCall(320, () => {
      const flash = this.add.rectangle(0, 0, this.W, this.H, 0x060408, 0)
        .setOrigin(0).setDepth(999);
      this.tweens.add({
        targets: flash, alpha: 1, duration: 280, ease: 'Sine.easeIn',
        onComplete,
      });
    });
  }
}
