// ================================================================
//  main.ts
//  경로: src/main.ts
//
//  역할: Vite 진입점 — CSS 임포트, 버전 주입, 게임 초기화
//
//  변환 전: Games/Codes/main.js (전역 스크립트)
//  변환 후: ES 모듈 진입점
//
//  Electron 이식 시 주요 변경 지점:
//    1. fsOverlay 클릭 → app.whenReady() 후 바로 startGame() 호출
//    2. requestFullscreen → win.setFullScreen(true) (BrowserWindow)
//    3. F11 전체화면 토글 → Electron globalShortcut 등록
//    4. localStorage → electron-store 또는 fs 로 교체
// ================================================================

// ── CSS 임포트 (Vite 가 번들링) ──────────────────────────────────
import './styles/global.css';
import './styles/overlay.css';
import './styles/shader.css';
// ── Scene CSS (컴포넌트 이미 global.css에서 임포트됨) ────────────
import './Scenes/LobbyScene.css';
import './Scenes/LoadingScene.css';
import './Scenes/AtelierScene.css';
import './Scenes/SettingsScene.css';
import './Scenes/BattleScene.css';

// ── 상수 ─────────────────────────────────────────────────────────
import { GAME_VERSION } from './constants';

// ── Managers (Step 4) ─────────────────────────────────────────────
import { FontManager }            from './Managers/FontManager';
import { AudioManager }           from './Managers/AudioManager';
import { ShaderManager }          from './Managers/ShaderManager';
import { InputManager }           from './Managers/InputManager';

// ── Step 6~7 완료 씬 ─────────────────────────────────────────────
import { LobbyScene }             from './Scenes/LobbyScene';
import { LoadingScene }           from './Scenes/LoadingScene';
import { SettingsScene }          from './Scenes/SettingsScene';
// ── Step 8 완료 후 주석 해제 ─────────────────────────────────────
// import { DialogueScene }          from './Dialogues/DialogueScene';
// import { AtelierScene }           from './Scenes/AtelierScene';
// import { ExploreScene }           from './Scenes/ExploreScene';
// import { PartyScene }             from './Scenes/PartyScene';
// import { BattleScene }            from './Scenes/BattleScene';
// import { DiveScene }              from './Scenes/DiveScene';

// ── 버전 정보 주입 ────────────────────────────────────────────────
const elAtmosphere = document.getElementById('overlay-atmosphere');
const elVersion    = document.getElementById('overlay-version');
const elStack      = document.getElementById('overlay-stack');

if (elAtmosphere) elAtmosphere.textContent = GAME_VERSION.atmosphere;
if (elVersion)    elVersion.textContent    = GAME_VERSION.footerLeft;
if (elStack)      elStack.textContent      = GAME_VERSION.footerRight;

// ── 전역 이벤트 차단 ─────────────────────────────────────────────
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart',   e => e.preventDefault());
document.addEventListener('mousedown',   e => { if (e.button === 1) e.preventDefault(); });

// ── 게임 초기화 ───────────────────────────────────────────────────
const fsOverlay = document.getElementById('fs-overlay')!;

function startGame(): void {
  if ((window as Window & { _gameStarted?: boolean })._gameStarted) return;
  (window as Window & { _gameStarted?: boolean })._gameStarted = true;

  fsOverlay.style.opacity = '0';
  setTimeout(() => { fsOverlay.remove(); }, 500);

  const el        = document.documentElement;
  const fsRequest = (
    el.requestFullscreen        ||
    (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen ||
    (el as HTMLElement & { mozRequestFullScreen?:    () => Promise<void> }).mozRequestFullScreen
  );
  if (fsRequest) fsRequest.call(el).catch(() => {});

  FontManager.init().then(_initGame).catch(_initGame);
}

function _initGame(): void {
  try {
    AudioManager._load();
    ShaderManager.init();
    InputManager._loadBinds();

    const game = new Phaser.Game({
      type:            Phaser.AUTO,
      backgroundColor: '#050407',
      parent:          'game-container',
      scene:           [LobbyScene, LoadingScene, SettingsScene],
      // Step 8 완료 후 추가: DialogueScene, AtelierScene, ExploreScene, PartyScene, BattleScene, DiveScene
      scale: {
        mode:       Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:      1920,
        height:     1080,
      },
    });

    (window as Window & { _phaserGame?: Phaser.Game })._phaserGame = game;

    _setupWindowEvents(game);

  } catch (err) {
    console.error('[main.ts] 초기화 실패:', err);
  }
}

function _setupWindowEvents(game: Phaser.Game | null): void {
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      game?.scale.resize(window.innerWidth, window.innerHeight);
    }, 100);
  });

  function handleFsChange(): void {
    setTimeout(() => {
      game?.scale.resize(window.innerWidth, window.innerHeight);
      game?.scene.getScenes(true).forEach(scene => {
        const s = scene as Phaser.Scene & { _activeTab?: string; fromScene?: string };
        if (s.scene.key === 'SettingsScene' && s._activeTab === 'video') {
          s.scene.restart({ from: s.fromScene, tab: 'video' });
        }
      });
    }, 100);
  }
  document.addEventListener('fullscreenchange',       handleFsChange);
  document.addEventListener('webkitfullscreenchange', handleFsChange);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      return;
    }
    if (e.key === 'Escape') {
      const activeScenes = game?.scene.getScenes(true) ?? [];
      const inGame = activeScenes.some(s => s.scene.key === 'GameScene');
      if (inGame) {
        e.preventDefault();
        e.stopImmediatePropagation();
        game?.scene.start('LobbyScene');
      }
    }
  }, true);
}

// 오버레이 클릭 → 게임 시작
fsOverlay.addEventListener('click', startGame, { once: true });
