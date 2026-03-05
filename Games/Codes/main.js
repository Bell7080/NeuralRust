// ================================================================
//  main.js
//  경로: Games/Codes/main.js
//  NEURAL RUST — PROJECT001
//
//  ── Electron 이식 시 변경 지점 ──────────────────────────────────
//  [BROWSER-ONLY] 태그가 붙은 블록은 Electron 환경에서 제거하거나
//  Electron 전용 API 로 교체하세요.
//
//  주요 변경 지점:
//    1. fsOverlay 클릭 → app.whenReady() 후 바로 startGame() 호출
//    2. requestFullscreen / exitFullscreen
//       → win.setFullScreen(true/false) (BrowserWindow)
//    3. F11 전체화면 토글 → Electron 에서 직접 처리하거나 globalShortcut 등록
//    4. contextmenu / dragstart preventDefault
//       → Electron webPreferences: { contextIsolation: true } 로 대체 가능
//    5. localStorage (FontManager, SaveManager, InputManager, AudioManager)
//       → electron-store 또는 app.getPath('userData') 기반 fs 로 교체
// ================================================================

const fsOverlay = document.getElementById('fs-overlay');

function startGame() {

  const el        = document.documentElement;
  const fsRequest = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
  const fsPromise = fsRequest ? fsRequest.call(el).catch(() => {}) : Promise.resolve();

  fsOverlay.style.opacity = '0';
  setTimeout(() => fsOverlay.remove(), 500);

  fsPromise.finally(() => {
    FontManager.init().then(() => {

      // AudioManager 볼륨 불러오기 (씬 없이 초기화)
      AudioManager._load();

      const game = new Phaser.Game({
        type:            Phaser.AUTO,
        backgroundColor: '#050407',
        parent:          'game-container',
        scene:           [LobbyScene, LoadingScene, SettingsScene, GameScene, AtelierScene, ExploreScene],
        scale: {
          mode:       Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width:      window.innerWidth,
          height:     window.innerHeight,
        },
      });

      window._phaserGame = game;

      InputManager._loadBinds();

      let resizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          game.scale.resize(window.innerWidth, window.innerHeight);
        }, 100);
      });

      function handleFsChange() {
        setTimeout(() => {
          game.scale.resize(window.innerWidth, window.innerHeight);
          const activeScenes = game.scene.getScenes(true);
          activeScenes.forEach(scene => {
            if (scene.scene.key === 'SettingsScene' && scene._activeTab === 'video') {
              scene.scene.restart({ from: scene.fromScene, tab: 'video' });
            }
          });
        }, 100);
      }
      document.addEventListener('fullscreenchange',       handleFsChange);
      document.addEventListener('webkitfullscreenchange', handleFsChange);

      window.addEventListener('keydown', (e) => {

        if (e.key === 'F11') {
          e.preventDefault();
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
          else                             document.exitFullscreen?.();
          return;
        }

        if (e.key === 'Escape') {
          const activeScenes = game.scene.getScenes(true);
          const inGame = activeScenes.some(s => s.scene.key === 'GameScene');
          if (inGame) {
            e.preventDefault();
            e.stopImmediatePropagation();
            game.scene.start('LobbyScene');
          }
        }

      }, true);

    });
  });
}

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart',   e => e.preventDefault());
document.addEventListener('mousedown',   e => { if (e.button === 1) e.preventDefault(); });

fsOverlay.addEventListener('click', startGame, { once: true });
