// ================================================================
//  Settings_Tab_Video.js
//  경로: Games/Codes/Scenes/Settings/Settings_Tab_Video.js
//
//  역할: 설정 > 비디오 탭
//    · 화면 모드 (전체화면 / 창 모드)
//    · 심해 필터 강도 슬라이더 (ShaderManager 연동)
//
//  호출: Settings_Tab_Video.build(scene, W, H, cx)
//  의존: FontManager, utils.js, ShaderManager
//        scene.drawOptionBox
//
//  레이아웃 원칙:
//    모든 위치·크기는 W / H 비율 기반 — 하드코딩 없음.
//    optionBoxH, sliderH 등 높이값도 H 비례로 계산.
//
//  ✏️ 수정 내역
//    · hintY: optionBoxH * 0.05 뺄셈 → + optionBoxH * 0.55 로 변경
//      (마지막 옵션박스 아래로 충분히 내려가도록 — 박스 겹침 버그 수정)
//    · _buildShaderSlider: 오디오 탭(_makeSlider) 스타일로 전면 재작성
//      - scene.add.circle → Graphics 기반 knob (오디오와 동일)
//      - knobR: H * 0.013 → H * 0.014 (오디오와 동일)
//      - sliderH: H * 0.006 → H * 0.007 (오디오와 동일)
//      - 슬라이더 폰트 크기 16/18 (오디오와 동일)
//      - 섹션 라벨 폰트 18 (오디오와 동일)
//      - section2Y: dividerY + H * 0.04 → dividerY + H * 0.05
//        프리셋 버튼까지 포함한 전체 높이 계산으로 뒤로가기 버튼 겹침 방지
// ================================================================

const Settings_Tab_Video = {

  build(scene, W, H, cx) {
    const isFullscreen = !!document.fullscreenElement;

    // ── 공통 레이아웃 상수 ─────────────────────────────────────
    const marginX    = W * 0.08;
    const contentW   = W * 0.84;
    const optionBoxH = Math.round(H * 0.10);
    const labelSize  = 16;
    const titleSize  = 20;

    // ── 섹션 1: 화면 모드 ─────────────────────────────────────
    const section1Y = H * 0.30;
    const option1Y  = H * 0.41;
    const optionGap = optionBoxH + H * 0.025;

    scene.add.text(marginX, section1Y, '[ 화면 모드 ]', {
      fontSize: scaledFontSize(labelSize, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    const options = [
      { key: 'fullscreen', label: '전체화면',  desc: 'F11 또는 이 항목으로 전환' },
      { key: 'windowed',   label: '창  모  드', desc: '창 모드로 전환' },
    ];

    options.forEach((opt, i) => {
      const y          = option1Y + optionGap * i;
      const boxTop     = y - optionBoxH / 2;
      const isSelected = isFullscreen ? opt.key === 'fullscreen' : opt.key === 'windowed';
      const box        = scene.add.graphics();
      scene.drawOptionBox(box, marginX, boxTop, contentW, optionBoxH, isSelected);

      scene.add.text(marginX + contentW * 0.055, y, isSelected ? '▶' : '·', {
        fontSize: scaledFontSize(labelSize, scene.scale),
        fill: isSelected ? '#a05018' : '#251508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      const nameText = scene.add.text(marginX + contentW * 0.09, y - optionBoxH * 0.16, opt.label, {
        fontSize: scaledFontSize(titleSize, scene.scale),
        fill: isSelected ? '#c8a070' : '#3d2010',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0.5);

      scene.add.text(marginX + contentW * 0.09, y + optionBoxH * 0.20, opt.desc, {
        fontSize: scaledFontSize(14, scene.scale),
        fill: isSelected ? '#5a3820' : '#2a1508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      const hit = scene.add.rectangle(cx, y, contentW, optionBoxH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!isSelected) {
          scene.drawOptionBox(box, marginX, boxTop, contentW, optionBoxH, false, true);
          nameText.setStyle({ fill: '#9a7040' });
        }
      });
      hit.on('pointerout', () => {
        if (!isSelected) {
          scene.drawOptionBox(box, marginX, boxTop, contentW, optionBoxH, false, false);
          nameText.setStyle({ fill: '#3d2010' });
        }
      });
      hit.on('pointerdown', () => {
        if (opt.key === 'fullscreen') document.documentElement.requestFullscreen?.().catch(() => {});
        else                          document.exitFullscreen?.().catch(() => {});
      });
    });

    // ── 안내 텍스트 — 마지막 옵션박스 아래로 충분히 내려서 배치 ──
    // ✏️ 수정: - optionBoxH * 0.05 → + optionBoxH * 0.55
    //    이전: option1Y + optionGap * 2 - optionBoxH * 0.05
    //          ≈ H*0.41 + (optionBoxH+H*0.025)*2 - optionBoxH*0.05
    //          마지막 박스 중앙 + optionGap - optionBoxH*0.05
    //          = 마지막 박스 하단보다 위 → 박스 안에 겹침
    //    이후: option1Y + optionGap * (options.length - 1) + optionBoxH * 0.55
    //          마지막 박스 중앙 + 박스 높이의 55% = 박스 하단 + 여유 5%
    const lastOptY = option1Y + optionGap * (options.length - 1);
    const hintY    = lastOptY + optionBoxH * 0.55;
    scene.add.text(cx, hintY, 'F11 키로도 전체화면을 전환할 수 있습니다', {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#2a1508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0);

    // ── 구분선 ─────────────────────────────────────────────────
    const dividerY = hintY + H * 0.055;
    const divider  = scene.add.graphics();
    divider.lineStyle(1, 0x1e1008, 0.7);
    divider.lineBetween(marginX, dividerY, marginX + contentW, dividerY);

    // ── 섹션 2: 심해 필터 ─────────────────────────────────────
    // ✏️ 수정: H * 0.04 → H * 0.05 (구분선과의 여백 소폭 확보)
    const section2Y = dividerY + H * 0.05;
    this._buildShaderSlider(scene, W, H, cx, marginX, contentW, section2Y);
  },

  // ── 쉐이더 슬라이더 — 오디오 탭 _makeSlider 스타일로 통일 ─────
  // ✏️ 전면 재작성:
  //   · scene.add.circle → Graphics knob (오디오와 동일한 방식)
  //   · knobR H * 0.014, sliderH H * 0.007 (오디오와 동일)
  //   · 라벨/값 폰트: 18 / 16 (오디오와 동일)
  //   · 섹션 라벨 폰트: 18 (오디오와 동일)
  //   · sliderX: cx - sliderW/2 중앙 정렬 (오디오와 동일)
  //   · valueX: sliderX + sliderW + W * 0.018 (오디오와 동일)
  //   · 프리셋 버튼을 sliderY 기준으로 배치해 뒤로가기 버튼 겹침 방지
  _buildShaderSlider(scene, W, H, cx, marginX, contentW, startY) {

    // ── 섹션 라벨 (오디오와 동일한 크기 18) ──────────────────
    scene.add.text(marginX, startY, '[ 심해 필터 ]', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#5a3518',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // ── 슬라이더 레이아웃 (오디오 _makeSlider와 동일한 수치) ──
    const sliderW        = contentW * 0.60;
    const sliderH        = Math.max(5, Math.round(H * 0.007));
    const knobR          = Math.max(9, Math.round(H * 0.014));
    const sliderX        = cx - sliderW / 2;
    const sliderY        = startY + H * 0.095;   // 섹션 라벨 아래 여백
    const labelOffsetUp  = H * 0.025;
    const labelOffsetDown = H * 0.015;
    const valueX         = sliderX + sliderW + W * 0.018;

    // 라벨 (위) — 오디오와 동일 스타일
    scene.add.text(marginX, sliderY - labelOffsetUp, '심해 필터 강도', {
      fontSize: scaledFontSize(18, scene.scale),
      fill: '#8a5a30',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0, 0.5);

    // 서브 라벨 (아래) — 오디오와 동일 스타일
    scene.add.text(marginX, sliderY + labelOffsetDown, 'SHADER', {
      fontSize: scaledFontSize(12, scene.scale),
      fill: '#3a2010',
      fontFamily: FontManager.MONO,
      letterSpacing: 3,
    }).setOrigin(0, 0.5);

    // 설명 — 서브 라벨 아래
    scene.add.text(marginX, sliderY + labelOffsetDown + H * 0.032,
      '화면 톤·비네팅·스캔라인 강도를 조절합니다', {
        fontSize: scaledFontSize(13, scene.scale),
        fill: '#3d2810',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

    // ── 그래픽 레이어 (오디오와 동일한 Graphics 방식) ──────────
    const track  = scene.add.graphics();
    const filled = scene.add.graphics();
    const knob   = scene.add.graphics();

    const drawAll = (pct, hover = false) => {
      // 트랙 배경
      track.clear();
      track.fillStyle(0x1e1208, 1);
      track.lineStyle(1, 0x3a2010, 0.7);
      track.strokeRect(sliderX, sliderY - sliderH / 2, sliderW, sliderH);
      track.fillRect(sliderX, sliderY - sliderH / 2, sliderW, sliderH);

      // 틱 마크 (오디오와 동일)
      [0, 25, 50, 75, 100].forEach(tp => {
        const tx = sliderX + sliderW * (tp / 100);
        track.lineStyle(1, (tp === 0 || tp === 100) ? 0x4a2810 : 0x2a1808, 0.6);
        track.lineBetween(tx, sliderY - sliderH / 2 - 4, tx, sliderY + sliderH / 2 + 4);
      });

      // 채움
      filled.clear();
      filled.fillStyle(0x8a4820, 1);
      filled.fillRect(sliderX, sliderY - sliderH / 2, sliderW * pct, sliderH);

      // 노브
      knob.clear();
      knob.fillStyle(hover ? 0xf0c880 : 0xd0a858, 1);
      knob.lineStyle(1.5, hover ? 0xffd890 : 0x9a5820, 1);
      const kx = sliderX + sliderW * pct;
      knob.strokeCircle(kx, sliderY, knobR);
      knob.fillCircle(kx, sliderY, knobR);
    };

    // 값 텍스트 (오디오와 동일 스타일: 16)
    const valueTxt = scene.add.text(valueX, sliderY - labelOffsetUp * 0.4,
      `${Math.round(ShaderManager.getIntensity() * 100)}%`, {
        fontSize: scaledFontSize(16, scene.scale),
        fill: '#c8a070',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

    const refresh = (pct, hover = false) => {
      drawAll(pct, hover);
      valueTxt.setText(`${Math.round(pct * 100)}%`);
    };

    refresh(ShaderManager.getIntensity());

    // ── 히트 영역 (오디오와 동일) ────────────────────────────
    const hitH    = Math.max(knobR * 3, 40);
    const hitArea = scene.add.rectangle(cx, sliderY, sliderW + knobR * 2, hitH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    const pctFromX = (px) => Math.max(0, Math.min(1, (px - sliderX) / sliderW));

    hitArea.on('pointerover', () => refresh(ShaderManager.getIntensity(), true));
    hitArea.on('pointerout',  () => refresh(ShaderManager.getIntensity(), false));
    hitArea.on('pointerdown', (ptr) => {
      const pct = pctFromX(ptr.x);
      ShaderManager.setIntensity(pct);
      refresh(pct, true);
    });

    scene.input.on('pointermove', (ptr) => {
      if (!ptr.isDown) return;
      if (ptr.x < sliderX - knobR || ptr.x > sliderX + sliderW + knobR) return;
      if (ptr.y < sliderY - hitH / 2 || ptr.y > sliderY + hitH / 2) return;
      const pct = pctFromX(ptr.x);
      ShaderManager.setIntensity(pct);
      refresh(pct, true);
    });

    // ── 프리셋 버튼 ──────────────────────────────────────────
    const presets = [
      { label: '꺼짐',   v: 0.0  },
      { label: '약하게', v: 0.35 },
      { label: '보통',   v: 0.70 },
      { label: '강하게', v: 1.0  },
    ];

    // ✏️ 수정: presetY = sliderY + knobR + H * 0.055
    //    이전: startY + H * 0.10 (sliderY) + knobR + H * 0.055
    //          슬라이더 위치가 startY 기준이므로 실제 Y가 section2Y에 따라
    //          H * 0.935 뒤로가기 버튼까지 공간이 부족했음
    //    이후: sliderY 직접 참조하므로 항상 슬라이더 기준으로 아래에 위치
    const presetY = sliderY + knobR + H * 0.055;
    const presetW = sliderW / presets.length;
    const btnH    = Math.max(28, Math.round(H * 0.038));
    const btnGap  = W * 0.008;

    presets.forEach((p, i) => {
      const bx = sliderX + presetW * i + presetW / 2 - btnGap / 2;

      const btnBg = scene.add.graphics();
      const drawBtn = (hover) => {
        btnBg.clear();
        btnBg.lineStyle(1, hover ? 0x6b3010 : 0x2a1a0a, 1);
        btnBg.strokeRect(bx - presetW * 0.42, presetY - btnH / 2, presetW * 0.84, btnH);
        if (hover) {
          btnBg.fillStyle(0x1a0c04, 1);
          btnBg.fillRect(bx - presetW * 0.42 + 1, presetY - btnH / 2 + 1, presetW * 0.84 - 2, btnH - 2);
        }
      };
      drawBtn(false);

      scene.add.text(bx, presetY, p.label, {
        fontSize: scaledFontSize(14, scene.scale),
        fill: '#3d2010',
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5);

      const btnHit = scene.add.rectangle(bx, presetY, presetW * 0.84, btnH, 0, 0)
        .setInteractive({ useHandCursor: true });

      btnHit.on('pointerover',  () => drawBtn(true));
      btnHit.on('pointerout',   () => drawBtn(false));
      btnHit.on('pointerdown',  () => {
        ShaderManager.setIntensity(p.v);
        refresh(p.v);
      });
    });
  },
};
