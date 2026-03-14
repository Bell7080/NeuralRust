// ================================================================
//  Settings_Tab_Audio.js
//  경로: Games/Codes/Scenes/Settings/Settings_Tab_Audio.js
//
//  역할: 설정 > 오디오 탭
//        마스터 / BGM / SFX 볼륨 슬라이더
//        실제 볼륨 = 채널 볼륨 × 마스터 볼륨
//
//  호출: Settings_Tab_Audio.build(scene, W, H, cx)
//  의존: FontManager, AudioManager, utils.js
//
//  레이아웃 원칙:
//    슬라이더 높이, 노브 반지름, 라벨 오프셋 모두 H 비례.
//    하드코딩 px 없음.
// ================================================================

const Settings_Tab_Audio = {

  build(scene, W, H, cx) {
    const marginX  = W * 0.06;
    const contentW = W * 0.88;

    // 섹션 라벨
    scene.add.text(marginX, H * 0.295, '[ 오디오 ]', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // effective 갱신 함수 목록 (마스터 변경 시 전체 갱신)
    const effectiveRefreshers = [];

    const sliders = [
      {
        label:  '마스터 볼륨',
        sub:    'MASTER',
        getPct: () => AudioManager.getMasterPct(),
        setPct: (v) => AudioManager.setMasterPct(v),
      },
      {
        label:  '배경음악',
        sub:    'BGM',
        getPct: () => AudioManager.getBGMPct(),
        setPct: (v) => AudioManager.setBGMPct(v),
        getEff: () => Math.round(AudioManager.effectiveBGM * 100),
      },
      {
        label:  '효과음',
        sub:    'SFX',
        getPct: () => AudioManager.getSFXPct(),
        setPct: (v) => AudioManager.setSFXPct(v),
        getEff: () => Math.round(AudioManager.effectiveSFX * 100),
      },
    ];

    // 3개 슬라이더를 H * 0.32 ~ H * 0.88 구간에 균등 배치
    const sliderAreaTop = H * 0.34;
    const sliderAreaH   = H * 0.50;
    const rowGap        = sliderAreaH / sliders.length;
    const firstY        = sliderAreaTop + rowGap * 0.5;

    sliders.forEach((cfg, i) => {
      const refreshEff = this._makeSlider(scene, cfg, W, H, cx, marginX, contentW, firstY + rowGap * i);
      if (refreshEff) effectiveRefreshers.push(refreshEff);
    });

    scene._audioEffRefreshers = effectiveRefreshers;

    // 안내 텍스트 — 슬라이더 아래 여백에
    scene.add.text(cx, sliderAreaTop + sliderAreaH + H * 0.025,
      '배경음악 · 효과음 볼륨은 마스터 볼륨에 곱해서 적용됩니다', {
        fontSize: scaledFontSize(13, scene.scale),
        fill: '#3d2810',
        fontFamily: FontManager.MONO,
        letterSpacing: 1,
      }).setOrigin(0.5, 0);
  },

  // ── 슬라이더 1개 ──────────────────────────────────────────────
  _makeSlider(scene, cfg, W, H, cx, marginX, contentW, cy) {
    // 슬라이더 크기 — H 비례
    const sliderW  = contentW * 0.60;
    const sliderH  = Math.max(5, Math.round(H * 0.007));
    const knobR    = Math.max(9, Math.round(H * 0.014));
    const sliderX  = cx - sliderW / 2;
    const labelX   = marginX;
    const valueX   = sliderX + sliderW + W * 0.018;

    // 라벨 위/아래 오프셋 — H 비례
    const labelOffsetUp   = H * 0.025;
    const labelOffsetDown = H * 0.015;

    // 라벨 (위)
    scene.add.text(labelX, cy - labelOffsetUp, cfg.label, {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#8a5a30',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5);

    // 서브 라벨 (아래)
    scene.add.text(labelX, cy + labelOffsetDown, cfg.sub, {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#3a2010',
      fontFamily: FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0, 0.5);

    // 그래픽 레이어
    const track  = scene.add.graphics();
    const filled = scene.add.graphics();
    const knob   = scene.add.graphics();

    const drawAll = (pct, hover = false) => {
      // 트랙 배경
      track.clear();
      track.fillStyle(0x1e1208, 1);
      track.lineStyle(1, 0x3a2010, 0.7);
      track.strokeRect(sliderX, cy - sliderH / 2, sliderW, sliderH);
      track.fillRect(sliderX, cy - sliderH / 2, sliderW, sliderH);

      // 틱 마크
      [0, 25, 50, 75, 100].forEach(tp => {
        const tx = sliderX + sliderW * (tp / 100);
        track.lineStyle(1, (tp === 0 || tp === 100) ? 0x4a2810 : 0x2a1808, 0.6);
        track.lineBetween(tx, cy - sliderH / 2 - 4, tx, cy + sliderH / 2 + 4);
      });

      // 채움
      filled.clear();
      filled.fillStyle(0x8a4820, 1);
      filled.fillRect(sliderX, cy - sliderH / 2, sliderW * (pct / 100), sliderH);

      // 노브
      knob.clear();
      knob.fillStyle(hover ? 0xf0c880 : 0xd0a858, 1);
      knob.lineStyle(1.5, hover ? 0xffd890 : 0x9a5820, 1);
      const kx = sliderX + sliderW * (pct / 100);
      knob.strokeCircle(kx, cy, knobR);
      knob.fillCircle(kx, cy, knobR);
    };

    // 퍼센트 텍스트
    const valueTxt = scene.add.text(valueX, cy - labelOffsetUp * 0.4, `${cfg.getPct()}%`, {
      fontSize: scaledFontSize(16, scene.scale),
      fill: '#c8a070',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // 실제 볼륨 텍스트 (BGM / SFX 만)
    let effTxt = null;
    if (cfg.getEff) {
      effTxt = scene.add.text(valueX, cy + labelOffsetDown * 1.2, `→ ${cfg.getEff()}%`, {
        fontSize: scaledFontSize(12, scene.scale),
        fill: '#5a3820',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);
    }

    const refresh = (pct, hover = false) => {
      drawAll(pct, hover);
      valueTxt.setText(`${pct}%`);
      if (effTxt && cfg.getEff) effTxt.setText(`→ ${cfg.getEff()}%`);
    };

    refresh(cfg.getPct());

    // 히트 영역 — 노브보다 여유 있게
    const hitH    = Math.max(knobR * 3, 40);
    const hitArea = scene.add.rectangle(cx, cy, sliderW + knobR * 2, hitH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    const pctFromX = (px) => Math.round(Math.max(0, Math.min(100, (px - sliderX) / sliderW * 100)));

    hitArea.on('pointerover', () => refresh(cfg.getPct(), true));
    hitArea.on('pointerout',  () => refresh(cfg.getPct(), false));
    hitArea.on('pointerdown', (ptr) => {
      const pct = pctFromX(ptr.x);
      cfg.setPct(pct);
      refresh(pct, true);
      if (scene._audioEffRefreshers) scene._audioEffRefreshers.forEach(fn => fn());
    });

    scene.input.on('pointermove', (ptr) => {
      if (!ptr.isDown) return;
      if (ptr.x < sliderX - knobR || ptr.x > sliderX + sliderW + knobR) return;
      if (ptr.y < cy - hitH / 2   || ptr.y > cy + hitH / 2) return;
      const pct = pctFromX(ptr.x);
      cfg.setPct(pct);
      refresh(pct, true);
      if (scene._audioEffRefreshers) scene._audioEffRefreshers.forEach(fn => fn());
    });

    return effTxt && cfg.getEff
      ? () => effTxt.setText(`→ ${cfg.getEff()}%`)
      : null;
  },
};
