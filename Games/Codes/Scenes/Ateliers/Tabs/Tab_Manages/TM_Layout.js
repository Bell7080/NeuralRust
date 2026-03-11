// ================================================================
//  TM_Layout.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Manages/TM_Layout.js
//
//  역할: 배경(BG_002 풀스크린) / 헤더 / 구분선 / 돌아가기 버튼
//
//  ✏️ 버그 수정:
//    - buildBackground: 비동기 applyBg 시 addAt 인덱스 충돌 수정
//      → _bgPlaceholder 를 index 1 자리에 미리 추가 → 비동기 완료 시 정확한 자리에 삽입
//      → 다른 패널(header/list/right)이 이미 자식 목록에 쌓인 후 addAt(img,1)을 호출하면
//         모든 자식이 뒤로 밀려 패널들이 배경 아래로 사라지던 버그 수정
//    - buildBackBtn: btn.setDepth(500) 완전 제거
//      → 컨테이너 자식 객체에 setDepth 혼용 시 씬 depth 기준으로 렌더되어
//         다른 UI와 depth 충돌 발생 → depth는 _container 레벨에서만 관리
//    - buildBackBtn: pointerdown+pointerup 이중 등록 → pointerdown 단독으로 변경
//      (pointerdown에서 즉시 onBack 호출, _backCalled 플래그 불필요)
//    - ulG: _backBtn 컨테이너에 완전히 종속 → setVisible/destroy 시 함께 제어
// ================================================================

const TM_Layout = {

  // ── 전체 배경 + Background_002 풀스크린 페이드 ──────────────
  buildBackground(tab, fs) {
    const { scene, W, H } = tab;

    // ── index 0: 어두운 베이스 ──────────────────────────────
    const base = scene.add.graphics();
    base.fillStyle(0x060504, 1);
    base.fillRect(0, 0, W, H);
    tab._container.add(base);

    // ── index 1: BG_002 자리 플레이스홀더 ───────────────────
    // 비동기 로드 완료 시 이 인덱스에 img를 삽입 → 이후 추가된 자식들이 밀리지 않음
    const placeholder = scene.add.graphics(); // 빈 그래픽 (화면에 안 보임)
    tab._bgPlaceholder = placeholder;
    tab._container.add(placeholder); // 항상 index 1

    const BG_KEY  = 'manage_bg_002';
    const BG_PATH = 'Games/Assets/Sprites/Background_002.png';

    const applyBg = () => {
      if (!tab._container || !tab._container.scene) return;

      const img = scene.add.image(W / 2, H / 2, BG_KEY).setOrigin(0.5);
      const scale = Math.max(W / img.width, H / img.height);
      img.setScale(scale).setAlpha(0.75);

      const ov = scene.add.graphics();
      ov.fillStyle(0x000000, 0.20);
      ov.fillRect(0, 0, W, H);

      // 플레이스홀더 위치를 확인하고 그 자리에 img/ov 삽입
      const idx = tab._bgPlaceholder
        ? tab._container.getIndex(tab._bgPlaceholder)
        : -1;

      if (idx !== -1) {
        // 플레이스홀더 먼저 제거 후 같은 자리에 img → ov 순 삽입
        tab._bgPlaceholder.destroy();
        tab._bgPlaceholder = null;
        tab._container.addAt(img, idx);
        tab._container.addAt(ov,  idx + 1);
      } else {
        // 이미 placeholder 없으면 맨 앞에 삽입 (안전 폴백)
        tab._container.addAt(ov,  1);
        tab._container.addAt(img, 1);
      }
    };

    if (!scene.textures.exists(BG_KEY)) {
      scene.load.once('complete', applyBg);
      scene.load.image(BG_KEY, BG_PATH);
      scene.load.start();
    } else {
      applyBg();
    }
  },

  // ── 헤더 패널 ────────────────────────────────────────────────
  buildHeader(tab, fs, hdrH) {
    const { scene, W } = tab;
    tab._headerPanel = scene.add.container(0, 0);

    const hdrBg = scene.add.graphics();
    hdrBg.fillStyle(0x06090d, 0.88);
    hdrBg.lineStyle(1, 0x4a2a10, 0.8);
    hdrBg.fillRect(0, 0, W, hdrH);
    hdrBg.lineBetween(0, hdrH, W, hdrH);

    const title = scene.add.text(W / 2, hdrH / 2, '[ 캐 릭 터  관 리 ]', {
      fontSize: fs(15), fill: '#8a5828', fontFamily: FontManager.MONO, letterSpacing: 3,
    }).setOrigin(0.5);

    tab._headerPanel.add([hdrBg, title]);
    tab._container.add(tab._headerPanel);
  },

  // ── 구분선 ───────────────────────────────────────────────────
  buildDividers(tab, backBtnH) {
    const { scene, W, H } = tab;
    const { _listW: lw, _centerW: cw, _bodyY: by } = tab;

    const g  = scene.add.graphics();
    const pm = tab._panelMargin || 0;
    g.lineStyle(1, 0x3a1e0a, 0.35);
    const lineTop    = by;
    const lineBottom = H - backBtnH - pm;
    g.lineBetween(lw,      lineTop, lw,      lineBottom);
    g.lineBetween(lw + cw, lineTop, lw + cw, lineBottom);
    g.lineBetween(0, lineBottom, W, lineBottom);
    tab._container.add(g);
  },

  // ── 돌아가기 버튼 (하단, 사이드버튼 스타일) ─────────────────
  buildBackBtn(tab, fs, backBtnH) {
    const { scene, W, H } = tab;
    tab._backBtn = scene.add.container(0, 0);

    const btnY  = H - backBtnH / 2;
    const origX = parseInt(fs(72));
    const shift = parseInt(fs(8));

    const marker = scene.add.text(origX - parseInt(fs(26)), btnY, '│', {
      fontSize: fs(18), fill: '#4a2a10', fontFamily: FontManager.MONO,
    }).setOrigin(1, 0.5);

    // ✏️ setDepth(500) 제거 — 컨테이너 내부 객체는 씬 depth 미사용
    //    depth는 _container(=Tab_Manage_Full._container) 레벨에서만 관리
    const btn = scene.add.text(origX, btnY, '← 돌아가기', {
      fontSize: fs(26), fill: '#7a5030', fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    // ✏️ ulG를 _backBtn 컨테이너 자식으로 추가
    //    → _backBtn.setVisible(false) / destroy() 시 함께 제어됨
    const ulG = scene.add.graphics();
    const drawUL = (on) => {
      ulG.clear();
      if (!on) return;
      ulG.lineStyle(1, 0x8b4010, 0.9);
      ulG.lineBetween(
        origX,
        btnY + parseInt(fs(17)),
        origX + parseInt(fs(26)) * 3.8,
        btnY + parseInt(fs(17))
      );
    };

    btn.on('pointerover', () => {
      scene.tweens.add({ targets: btn, x: origX + shift, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#e8c080' });
      marker.setStyle({ fill: '#c06820' });
      ulG.setAlpha(1);
      drawUL(true);
    });
    btn.on('pointerout', () => {
      scene.tweens.add({ targets: btn, x: origX, duration: 100, ease: 'Sine.easeOut' });
      btn.setStyle({ fill: '#7a5030' });
      marker.setStyle({ fill: '#4a2a10' });
      ulG.setAlpha(0);
      drawUL(false);
    });

    // ✏️ pointerdown 단독 사용 (pointerdown+pointerup 이중 등록 제거)
    //    pointerup까지 기다릴 필요 없고, 이중 호출 위험도 제거
    btn.on('pointerdown', () => {
      if (tab.onBack) tab.onBack();
    });

    // ✏️ marker, btn, ulG 모두 _backBtn 컨테이너에 추가
    //    → AtelierScene._exitManageFull 의 tween 대상(_backBtn)에 포함됨
    tab._backBtn.add([marker, btn, ulG]);
    tab._backBtn._origX = origX;
    tab._container.add(tab._backBtn);
  },
};
