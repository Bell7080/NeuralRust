// ================================================================
//  main.js
//  경로: Games/Codes/main.js
// ================================================================

const fsOverlay = document.getElementById('fs-overlay');

function startGame() {
  const el = document.documentElement;
  const fsRequest = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
  const fsPromise = fsRequest ? fsRequest.call(el).catch(() => {}) : Promise.resolve();

  fsOverlay.style.opacity = '0';
  setTimeout(() => fsOverlay.remove(), 400);

  fsPromise.finally(() => {
    FontManager.init().then(() => {
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        backgroundColor: '#060608',
        parent: 'game-container',
        scene: [LobbyScene, LoadingScene, SettingsScene, GameScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width:  window.innerWidth,
          height: window.innerHeight,
        },
      });

      window._phaserGame = game;

      // ── window resize: 캔버스 크기만 맞추고 씬 재시작 없음 ──
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          game.scale.resize(window.innerWidth, window.innerHeight);
        }, 100);
      });

      // ── fullscreenchange: 비디오 탭만 재시작, 나머지는 resize만 ──
      function handleFsChange() {
        setTimeout(() => {
          game.scale.resize(window.innerWidth, window.innerHeight);

          // SettingsScene 비디오 탭일 때만 재시작 (선택 상태 동기화용)
          const activeScenes = game.scene.getScenes(true);
          activeScenes.forEach(scene => {
            if (scene.scene.key === 'SettingsScene' && scene._activeTab === 'video') {
              scene.scene.restart({ from: scene.fromScene, tab: 'video' });
            }
          });
        }, 100);
      }
      document.addEventListener('fullscreenchange', handleFsChange);
      document.addEventListener('webkitfullscreenchange', handleFsChange);

      // ── F11 전체화면 토글 ────────────────────────────────────
      window.addEventListener('keydown', (e) => {
        if (e.key === 'F11') {
          e.preventDefault();
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
          else                             document.exitFullscreen?.();
        }

        // ESC: GameScene에서는 전체화면 해제 없이 로비로
        if (e.key === 'Escape') {
          const activeScenes = game.scene.getScenes(true);
          const inGame = activeScenes.some(s => s.scene.key === 'GameScene');
          if (inGame) {
            e.preventDefault();
            e.stopImmediatePropagation();
            game.scene.start('LobbyScene');
          }
        }
      }, true); // capture: true — 브라우저 기본 ESC보다 먼저 처리
    });
  });
}

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart',   e => e.preventDefault());
document.addEventListener('mousedown',   e => { if (e.button === 1) e.preventDefault(); });

fsOverlay.addEventListener('click', startGame, { once: true });
