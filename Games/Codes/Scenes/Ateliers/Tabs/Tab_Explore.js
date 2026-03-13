// ================================================================
//  Tab_Explore.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Explore.js
//
//  수정:
//    - Tab_Base 상속 (issue 7): _container/_tweens/_timers/_sceneHits/_tween/_delay/show/hide/destroy 제거
//    - destroy() 제거 → Tab_Base.destroy(true) 사용 (issue 3: _container.destroy(true))
//    - cs = 14 고정픽셀 → scaledFontSize 기반으로 변경 (issue 5)
//    - 코너 장식 8줄 → drawCornerDeco() 단일 호출로 교체 (issue 6)
// ================================================================

class Tab_Explore extends Tab_Base {
  constructor(scene, W, H) {
    super(scene, W, H);
    this._build();
  }

  _build() {
    const { scene, W, H } = this;
    const cx = W / 2;
    const cy = H * 0.52;

    const panelW = W * 0.60;
    const panelH = H * 0.55;

    // ── 패널 배경 ────────────────────────────────────────────
    const panel = scene.add.graphics();
    panel.fillStyle(0x120d07, 1);
    panel.lineStyle(2, 0x7a4018, 0.85);
    panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
    panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    // ── 코너 장식 (drawCornerDeco 사용, 고정픽셀 → scaledFontSize 기반) ──
    const deco = scene.add.graphics();
    const cs   = parseInt(scaledFontSize(14, scene.scale));
    const pad  = parseInt(scaledFontSize(8, scene.scale));
    drawCornerDeco(
      deco,
      cx - panelW / 2 + pad, cy - panelH / 2 + pad,
      panelW - pad * 2, panelH - pad * 2,
      cs, 0x7a4018, 0.7
    );

    // ── 상단 라벨 ────────────────────────────────────────────
    const labelY = cy - panelH / 2 + parseInt(scaledFontSize(26, scene.scale));
    const labelTxt = scene.add.text(cx, labelY, '[ 탐  색 ]', {
      fontSize:      scaledFontSize(13, scene.scale),
      fill:          '#7a5028',
      fontFamily:    FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0.5, 0.5);

    // ── 구분선 ───────────────────────────────────────────────
    const lineY = cy - panelH / 2 + parseInt(scaledFontSize(44, scene.scale));
    const lineG = scene.add.graphics();
    lineG.lineStyle(1, 0x4a2a10, 0.9);
    lineG.lineBetween(cx - panelW / 2 + 20, lineY, cx + panelW / 2 - 20, lineY);

    // ── 메인 텍스트 (한 줄 — 타이핑으로 등장) ───────────────
    const txt = scene.add.text(cx, cy - panelH * 0.06, '', {
      fontSize:   scaledFontSize(32, scene.scale),
      fill:       '#e8c080',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0);

    // ── 확인 버튼 (처음엔 숨김) ──────────────────────────────
    const btnW = parseInt(scaledFontSize(130, scene.scale));
    const btnH = parseInt(scaledFontSize(50, scene.scale));
    const btnY = cy + panelH * 0.30;

    const btnBg   = scene.add.graphics().setAlpha(0);
    const btnGlow = scene.add.graphics().setAlpha(0);

    const drawBtn = (state) => {
      btnBg.clear();
      if (state === 'hover') {
        btnBg.fillStyle(0x5a1010, 1);
        btnBg.lineStyle(2, 0xff5533, 1);
      } else if (state === 'down') {
        btnBg.fillStyle(0x300808, 1);
        btnBg.lineStyle(2, 0xcc3318, 1);
      } else {
        btnBg.fillStyle(0x3a0e0e, 1);
        btnBg.lineStyle(2, 0xbb2810, 0.95);
      }
      btnBg.strokeRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
      btnBg.fillRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
    };
    drawBtn('normal');

    // 글로우 그리기 (외부 발광 레이어)
    const drawGlow = (intensity) => {
      btnGlow.clear();
      const layers = [
        { pad: 14, alpha: 0.05 * intensity, col: 0xff2200 },
        { pad:  8, alpha: 0.13 * intensity, col: 0xff3310 },
        { pad:  4, alpha: 0.28 * intensity, col: 0xdd2200 },
        { pad:  1, alpha: 0.52 * intensity, col: 0xcc1800 },
      ];
      layers.forEach(({ pad, alpha, col }) => {
        btnGlow.lineStyle(2, col, alpha);
        btnGlow.strokeRect(
          cx - btnW / 2 - pad, btnY - btnH / 2 - pad,
          btnW + pad * 2, btnH + pad * 2
        );
      });
    };

    const btnTxt = scene.add.text(cx, btnY, '확  인', {
      fontSize:   scaledFontSize(24, scene.scale),
      fill:       '#ee5533',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5).setAlpha(0);

    const hit = scene.add.rectangle(cx, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      drawBtn('hover');
      btnTxt.setStyle({ fill: '#ff7755' });
    });
    hit.on('pointerout', () => {
      drawBtn('normal');
      btnTxt.setStyle({ fill: '#ee5533' });
    });
    hit.on('pointerdown', () => {
      drawBtn('down');
      btnTxt.setStyle({ fill: '#ff3311' });
    });
    hit.on('pointerup', () => {
      // 버튼 비활성화 (중복 클릭 방지)
      hit.disableInteractive();
      drawBtn('down');

      // AtelierScene의 슬라이드아웃 연출 호출 → 완료 후 씬 전환
      if (scene._slideOutUIThen) {
        scene._slideOutUIThen(() => {
          scene.scene.start('ExploreScene', { from: 'AtelierScene' });
        });
      } else {
        scene.scene.start('ExploreScene', { from: 'AtelierScene' });
      }
    });

    // ── 모두 container에 추가 (hit 제외 — 씬 직접 추가로 분리) ──
    this._container.add([
      panel, deco, labelTxt, lineG,
      txt,
      btnGlow, btnBg, btnTxt,
    ]);
    // hit은 씬 직접 추가 — 컨테이너 tween 이동 시 좌표 어긋남 방지
    hit.setDepth(20);
    this._sceneHits.push(hit);

    // ── 타이핑 시퀀스 시작 ───────────────────────────────────
    this._delay(80, () => {
      this._typeText(txt, '심해를 직면할 준비가 되었습니까?', 52, () => {
        this._delay(180, () => {
          this._revealButton(btnBg, btnGlow, btnTxt, drawBtn, drawGlow);
        });
      });
    });
  }

  // ── 버튼 등장 애니메이션 ─────────────────────────────────────
  _revealButton(btnBg, btnGlow, btnTxt, drawBtn, drawGlow) {
    // 버튼 배경 페이드인
    this._tween({ targets: btnBg, alpha: { from: 0, to: 1 }, duration: 220 });

    // 글로우 등장
    this._delay(80, () => {
      btnGlow.setAlpha(1);
      const glowObj = { v: 0 };
      this._tween({
        targets: glowObj, v: 1, duration: 550, ease: 'Sine.easeOut',
        onUpdate: () => drawGlow(glowObj.v),
        onComplete: () => {
          // 맥박 점멸
          this._tween({
            targets: glowObj,
            v: { from: 1, to: 0.35 },
            duration: 850,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            onUpdate: () => drawGlow(glowObj.v),
          });
        },
      });
    });

    // 버튼 텍스트 페이드인 + 미세 점멸
    this._delay(100, () => {
      this._tween({ targets: btnTxt, alpha: { from: 0, to: 1 }, duration: 280 });
      this._delay(300, () => {
        this._tween({
          targets: btnTxt, alpha: { from: 1, to: 0.65 },
          duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      });
    });
  }

  // ── 타이핑 효과 ─────────────────────────────────────────────
  _typeText(textObj, fullText, charDelay, onDone) {
    textObj.setAlpha(1).setText('');
    const chars = [...fullText];
    let i = 0;
    const tick = () => {
      if (!textObj || !textObj.scene) return;
      if (i < chars.length) {
        textObj.setText(chars.slice(0, ++i).join(''));
        this._timers.push(this.scene.time.delayedCall(charDelay, tick));
      } else {
        if (onDone) onDone();
      }
    };
    this._timers.push(this.scene.time.delayedCall(charDelay, tick));
  }
}
