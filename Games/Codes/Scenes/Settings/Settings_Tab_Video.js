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
// ================================================================

const Settings_Tab_Video = {

  build(scene, W, H, cx) {
    const isFullscreen = !!document.fullscreenElement;

    // ── 공통 레이아웃 상수 ─────────────────────────────────────
    const marginX    = W * 0.08;           // 좌우 여백
    const contentW   = W * 0.84;           // 콘텐츠 폭
    const optionBoxH = Math.round(H * 0.10);  // 옵션 박스 높이 (H 비례)
    const labelSize  = 16;                 // scaledFontSize 기준값
    const titleSize  = 20;

    // ── 섹션 1: 화면 모드 ─────────────────────────────────────
    const section1Y  = H * 0.30;
    const option1Y   = H * 0.41;          // 첫 옵션 박스 중앙 Y
    const optionGap  = optionBoxH + H * 0.025;  // 박스 간격

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

      // 아이콘 마커
      scene.add.text(marginX + contentW * 0.055, y, isSelected ? '▶' : '·', {
        fontSize: scaledFontSize(labelSize, scene.scale),
        fill: isSelected ? '#a05018' : '#251508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      // 옵션명
      const nameText = scene.add.text(marginX + contentW * 0.09, y - optionBoxH * 0.16, opt.label, {
        fontSize: scaledFontSize(titleSize, scene.scale),
        fill: isSelected ? '#c8a070' : '#3d2010',
        fontFamily: FontManager.TITLE,
      }).setOrigin(0, 0.5);

      // 설명
      scene.add.text(marginX + contentW * 0.09, y + optionBoxH * 0.20, opt.desc, {
        fontSize: scaledFontSize(14, scene.scale),
        fill: isSelected ? '#4a2810' : '#251508',
        fontFamily: FontManager.MONO,
      }).setOrigin(0, 0.5);

      // 히트 영역
      const hit = scene.add.rectangle(cx, y, contentW, optionBoxH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        if (!isSelected) {
          scene.drawOptionBox(box, marginX, boxTop, contentW, optionBoxH, false, true);
          nameText.setStyle({ fill: '#8a6040' });
        }
      });
      hit.on('pointerout', () => {
        if (!isSelected) {
          scene.drawOptionBox(box, marginX, boxTop, contentW, optionBoxH, false, false);
          nameText.setStyle({ fill: '#3d2010' });
        }
      });
      hit.on('pointerdown', () => {
        if (isSelected) return;
        if (opt.key === 'fullscreen') document.documentElement.requestFullscreen?.().catch(() => {});
        else                          document.exitFullscreen?.().catch(() => {});
      });
    });

    // 안내 텍스트 — 옵션 박스들 바로 아래
    const hintY = option1Y + optionGap * options.length - optionBoxH * 0.05;
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
    const section2Y = dividerY + H * 0.04;
    this._buildShaderSlider(scene, W, H, cx, marginX, contentW, section2Y, labelSize);
  },

  // ── 쉐이더 슬라이더 ───────────────────────────────────────────
  _buildShaderSlider(scene, W, H, cx, marginX, contentW, startY, labelSize) {

    // 섹션 제목
    scene.add.text(marginX, startY, '[ 심해 필터 ]', {
      fontSize: scaledFontSize(labelSize, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // 설명
    scene.add.text(marginX, startY + H * 0.038, '화면 톤·비네팅·스캔라인 강도를 조절합니다', {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#251508',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // ── 슬라이더 레이아웃 (H 비례) ────────────────────────────
    const sliderY    = startY + H * 0.10;
    const sliderW    = contentW * 0.65;
    const sliderH    = Math.max(4, Math.round(H * 0.006));  // 트랙 두께
    const knobR      = Math.max(8, Math.round(H * 0.013));  // 노브 반지름
    const sliderX    = marginX;                              // 트랙 시작 X

    // 트랙 배경
    const trackBg = scene.add.graphics();
    trackBg.fillStyle(0x1a0e06, 1);
    trackBg.fillRoundedRect(sliderX, sliderY - sliderH / 2, sliderW, sliderH, sliderH / 2);

    // 트랙 채움 (진행 부분)
    const trackFill = scene.add.graphics();

    // 노브
    const knob = scene.add.circle(0, sliderY, knobR, 0xa05018)
      .setStrokeStyle(1, 0x6b3010)
      .setInteractive({ useHandCursor: true });

    // 퍼센트 텍스트 (슬라이더 오른쪽)
    const pctText = scene.add.text(sliderX + sliderW + W * 0.02, sliderY, '', {
      fontSize: scaledFontSize(labelSize, scene.scale),
      fill: '#a05018',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // 라벨 텍스트 (슬라이더 위)
    const subLabel = scene.add.text(sliderX, sliderY - knobR - H * 0.015, '강도', {
      fontSize: scaledFontSize(13, scene.scale),
      fill: '#3d2010',
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // ── 그리기 함수 ───────────────────────────────────────────
    const redraw = () => {
      const pct = ShaderManager.getIntensity();
      const kx  = sliderX + pct * sliderW;
      knob.setPosition(kx, sliderY);

      trackFill.clear();
      trackFill.fillStyle(0xa05018, 1);
      trackFill.fillRoundedRect(sliderX, sliderY - sliderH / 2, pct * sliderW, sliderH, sliderH / 2);

      pctText.setText(Math.round(pct * 100) + '%');
    };

    redraw();

    // ── 드래그 처리 ───────────────────────────────────────────
    const setByX = (px) => {
      const pct = Math.max(0, Math.min(1, (px - sliderX) / sliderW));
      ShaderManager.setIntensity(pct);
      redraw();
    };

    const onMove = (ptr) => setByX(ptr.x);

    knob.on('pointerdown', () => {
      scene.input.on('pointermove', onMove);
      scene.input.once('pointerup', () => scene.input.off('pointermove', onMove));
    });

    // 트랙 히트 영역 (노브보다 큰 클릭 범위)
    const hitH    = Math.max(knobR * 2 + 8, 32);
    const hitZone = scene.add.rectangle(
      sliderX + sliderW / 2, sliderY,
      sliderW, hitH,
      0x000000, 0
    ).setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', (ptr) => {
      setByX(ptr.x);
      scene.input.on('pointermove', onMove);
      scene.input.once('pointerup', () => scene.input.off('pointermove', onMove));
    });

    // ── 프리셋 버튼 ───────────────────────────────────────────
    //    꺼짐 / 약하게 / 보통 / 강하게 — 빠른 설정용
    const presets = [
      { label: '꺼짐',   v: 0.0 },
      { label: '약하게', v: 0.35 },
      { label: '보통',   v: 0.70 },
      { label: '강하게', v: 1.0  },
    ];

    const presetY    = sliderY + knobR + H * 0.055;
    const presetW    = sliderW / presets.length;
    const btnH       = Math.max(28, Math.round(H * 0.038));
    const btnGap     = W * 0.008;
    const totalBtnW  = presets.length * presetW - btnGap;  // 근사

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
      btnHit.on('pointerdown',  () => { ShaderManager.setIntensity(p.v); redraw(); });
    });
  },
};
