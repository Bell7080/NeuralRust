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
// ================================================================

const Settings_Tab_Audio = {

  build(scene, W, H, cx) {
    scene.add.text(W * 0.08, H * 0.32, '[ 오디오 ]', {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // effective 갱신 함수 목록 (마스터 변경 시 전체 갱신)
    const effectiveRefreshers = [];

    const sliders = [
      {
        label:   '마스터 볼륨',
        sub:     'MASTER',
        getPct:  () => AudioManager.getMasterPct(),
        setPct:  (v) => AudioManager.setMasterPct(v),
      },
      {
        label:   '배경음악',
        sub:     'BGM',
        getPct:  () => AudioManager.getBGMPct(),
        setPct:  (v) => AudioManager.setBGMPct(v),
        getEff:  () => Math.round(AudioManager.effectiveBGM * 100),
      },
      {
        label:   '효과음',
        sub:     'SFX',
        getPct:  () => AudioManager.getSFXPct(),
        setPct:  (v) => AudioManager.setSFXPct(v),
        getEff:  () => Math.round(AudioManager.effectiveSFX * 100),
      },
    ];

    const baseY  = H * 0.41;
    const rowGap = H * 0.175;

    sliders.forEach((cfg, i) => {
      const refreshEff = this._makeSlider(scene, cfg, W, cx, baseY + rowGap * i);
      if (refreshEff) effectiveRefreshers.push(refreshEff);
    });

    // 마스터 슬라이더 변경 시 effective 재렌더 연결
    // (슬라이더 내부 pointerdown/move 이후 호출됨)
    scene._audioEffRefreshers = effectiveRefreshers;

    scene.add.text(cx, H * 0.88, '배경음악 · 효과음 볼륨은 마스터 볼륨에 곱해서 적용됩니다', {
      fontSize: scaledFontSize(11, scene.scale),
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
      letterSpacing: 1,
    }).setOrigin(0.5);
  },

  // ── 슬라이더 1개 ──────────────────────────────────────────────
  // 반환값: effective 텍스트 갱신 함수 (없으면 null)
  _makeSlider(scene, cfg, W, cx, y) {
    const sliderW = W * 0.56;
    const sliderH = 6;
    const knobR   = 9;
    const sliderX = cx - sliderW / 2;
    const labelX  = W * 0.08;
    const valueX  = sliderX + sliderW + parseInt(scaledFontSize(18, scene.scale));

    // 라벨
    scene.add.text(labelX, y - parseInt(scaledFontSize(13, scene.scale)), cfg.label, {
      fontSize: scaledFontSize(16, scene.scale),
      fill: '#7a5028',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5);

    scene.add.text(labelX, y + parseInt(scaledFontSize(8, scene.scale)), cfg.sub, {
      fontSize: scaledFontSize(10, scene.scale),
      fill: '#2a1808',
      fontFamily: FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0, 0.5);

    // 트랙 + 채움
    const track  = scene.add.graphics();
    const filled = scene.add.graphics();
    const knob   = scene.add.graphics();

    const drawAll = (pct, hover = false) => {
      // 트랙
      track.clear();
      track.fillStyle(0x1a1008, 1);
      track.lineStyle(1, 0x3a2010, 0.8);
      track.strokeRect(sliderX, y - sliderH / 2, sliderW, sliderH);
      track.fillRect(sliderX, y - sliderH / 2, sliderW, sliderH);
      // 틱
      [0, 25, 50, 75, 100].forEach(tp => {
        const tx = sliderX + sliderW * (tp / 100);
        track.lineStyle(1, (tp === 0 || tp === 100) ? 0x3a2010 : 0x251508, 0.5);
        track.lineBetween(tx, y - sliderH / 2 - 3, tx, y + sliderH / 2 + 3);
      });
      // 채움
      filled.clear();
      filled.fillStyle(0x7a4018, 1);
      filled.fillRect(sliderX, y - sliderH / 2, sliderW * (pct / 100), sliderH);
      // 노브
      knob.clear();
      knob.fillStyle(hover ? 0xe8c080 : 0xc8a060, 1);
      knob.lineStyle(1.5, hover ? 0xffd090 : 0x8a5018, 1);
      const kx = sliderX + sliderW * (pct / 100);
      knob.strokeCircle(kx, y, knobR);
      knob.fillCircle(kx, y, knobR);
    };

    // 퍼센트 텍스트
    const valueTxt = scene.add.text(valueX, y, `${cfg.getPct()}%`, {
      fontSize: scaledFontSize(14, scene.scale),
      fill: '#c8a070',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // 실제 볼륨 (BGM/SFX만)
    let effTxt = null;
    if (cfg.getEff) {
      effTxt = scene.add.text(valueX, y + parseInt(scaledFontSize(14, scene.scale)), `→ ${cfg.getEff()}%`, {
        fontSize: scaledFontSize(10, scene.scale),
        fill: '#4a3010',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);
    }

    const refresh = (pct, hover = false) => {
      drawAll(pct, hover);
      valueTxt.setText(`${pct}%`);
      if (effTxt && cfg.getEff) effTxt.setText(`→ ${cfg.getEff()}%`);
    };

    refresh(cfg.getPct());

    // 히트 영역
    const hitArea = scene.add.rectangle(cx, y, sliderW + knobR * 2, knobR * 3, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    const pctFromX = (px) => Math.round(Math.max(0, Math.min(100, (px - sliderX) / sliderW * 100)));

    hitArea.on('pointerover', () => refresh(cfg.getPct(), true));
    hitArea.on('pointerout',  () => refresh(cfg.getPct(), false));
    hitArea.on('pointerdown', (ptr) => {
      const pct = pctFromX(ptr.x);
      cfg.setPct(pct);
      refresh(pct, true);
      // 마스터가 바뀌면 BGM/SFX effective도 갱신
      if (scene._audioEffRefreshers) scene._audioEffRefreshers.forEach(fn => fn());
    });

    scene.input.on('pointermove', (ptr) => {
      if (!ptr.isDown) return;
      if (ptr.x < sliderX - knobR || ptr.x > sliderX + sliderW + knobR) return;
      if (ptr.y < y - knobR * 2   || ptr.y > y + knobR * 2) return;
      const pct = pctFromX(ptr.x);
      cfg.setPct(pct);
      refresh(pct, true);
      if (scene._audioEffRefreshers) scene._audioEffRefreshers.forEach(fn => fn());
    });

    // effective 갱신 함수 반환
    return effTxt && cfg.getEff
      ? () => effTxt.setText(`→ ${cfg.getEff()}%`)
      : null;
  },
};
