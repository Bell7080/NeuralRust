// ================================================================
//  main.js
//  경로: Games/Codes/main.js
//
//  기준 해상도: 1920 × 1080 (16:9)
//  와이드 대응: Phaser.Scale.RESIZE — 캔버스가 실제 화면 전체를 채움
//              배경 이미지는 각 씬에서 ENVELOP(cover) 방식으로 배치
//              UI는 W/H 비율 기반이므로 어떤 해상도에서도 중앙 정렬 유지
//
//  Electron 이식 시 주요 변경 지점:
//    1. fsOverlay 클릭 → app.whenReady() 후 바로 startGame() 호출
//    2. requestFullscreen / exitFullscreen
//       → win.setFullScreen(true/false) (BrowserWindow)
//    3. F11 전체화면 토글 → Electron globalShortcut 등록
//    4. contextmenu / dragstart preventDefault
//       → Electron webPreferences: { contextIsolation: true } 로 대체 가능
//    5. localStorage (FontManager, SaveManager, InputManager, AudioManager)
//       → electron-store 또는 app.getPath('userData') 기반 fs 로 교체
// ================================================================

const fsOverlay = document.getElementById('fs-overlay');

function startGame() {
  if (window._gameStarted) return;
  window._gameStarted = true;

  fsOverlay.style.opacity = '0';
  setTimeout(() => {
    if (fsOverlay.parentNode) fsOverlay.remove();
  }, 500);

  const el        = document.documentElement;
  const fsRequest = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
  if (fsRequest) {
    fsRequest.call(el).catch(() => {});
  }

  FontManager.init().then(() => {
    _initGame();
  }).catch(() => {
    _initGame();
  });
}

function _initGame() {
  try {
    AudioManager._load();

    const game = new Phaser.Game({
      type:            Phaser.AUTO,
      backgroundColor: '#050407',
      parent:          'game-container',
      scene:           [LobbyScene, LoadingScene, DialogueScene, SettingsScene, GameScene, AtelierScene, ExploreScene, PartyScene],
      scale: {
        // RESIZE: 캔버스가 항상 실제 화면 크기와 동일
        // 배경 이미지를 ENVELOP(cover)로 깔면 와이드 화면에서 배경이 꽉 차고
        // UI 요소는 W/H 비율 기반이므로 어떤 비율에서도 중앙에 올바르게 배치됨
        mode:       Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:      1920,
        height:     1080,
      },
    });

    window._phaserGame = game;

    InputManager._loadBinds();

    // 창 크기 변경 시 캔버스 갱신 (디바운스 100ms)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        game.scale.resize(window.innerWidth, window.innerHeight);
      }, 100);
    });

    // 전체화면 전환 시 캔버스 + 설정 비디오 탭 갱신
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
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
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

  } catch (err) {
    console.error('[main.js] Phaser 초기화 실패:', err);
  }
}

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart',   e => e.preventDefault());
document.addEventListener('mousedown',   e => { if (e.button === 1) e.preventDefault(); });

fsOverlay.addEventListener('click', startGame, { once: true });
