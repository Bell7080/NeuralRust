// ================================================================
//  Tab_Squad_Slider.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Squads/Tab_Squad_Slider.js
//
//  역할: 탐사대 탭 — 캐릭터 슬라이더, 카드 생성, 미니맵,
//                    필터 바, 토스트 메시지, 생명주기
//
//  ── 드래그 관련 변경사항 ────────────────────────────────────
//  카드(hit)에서 pointermove 핸들러를 완전히 제거했습니다.
//  카드는 pointerdown에서 드래그 시작 조건만 감지하고,
//  실제 드래그 처리는 Tab_Squad_Drag.js의 전역 리스너가 담당합니다.
//
//  의존: Tab_Squad.js, Tab_Squad_Drag.js (prototype 확장)
// ================================================================

Object.assign(Tab_Squad.prototype, {

  // ── 슬라이더 영역 빌드 ───────────────────────────────────────
  _buildSlider() {
    const { scene } = this;
    const { _sliderAreaX: aX, _sliderAreaY: aY, _sliderAreaW: aW, _sliderAreaH: aH } = this;

    const areaBg = scene.add.graphics();
    areaBg.fillStyle(0x0a0807, 0.6);
    areaBg.lineStyle(1, 0x2a1a08, 0.6);
    areaBg.strokeRect(aX, aY, aW, aH);
    areaBg.fillRect(aX, aY, aW, aH);
    this._container.add(areaBg);

    this._container.add(scene.add.text(aX + 8, aY + 6,
      '캐릭터를 격자 칸에 드래그하여 배치  ·  배치된 칸 클릭으로 회수  ·  카드 클릭으로 프로필', {
      fontSize: scaledFontSize(8, scene.scale), fill: '#3a2510', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0));

    const labelH        = parseInt(scaledFontSize(16, scene.scale));
    this._sliderRow     = scene.add.container(aX, aY + labelH);
    this._sliderCardW   = parseInt(scaledFontSize(76, scene.scale));
    this._sliderCardH   = parseInt(scaledFontSize(150, scene.scale)); // 미니맵 포함 최대치 여유
    this._sliderCardGap = parseInt(scaledFontSize(6,  scene.scale));

    const maskGfx = scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    // 마스크를 aH 전체가 아닌 충분히 큰 고정값으로 — 카드 높이가 영역보다 클 수 있음
    maskGfx.fillRect(aX, aY + labelH, aW, aH - labelH + parseInt(scaledFontSize(60, scene.scale)));
    maskGfx.setVisible(false);
    this._sliderRow.setMask(maskGfx.createGeometryMask());
    this._container.add(this._sliderRow);
    this._sliderMaskGfx = maskGfx;

    this._populateSlider();

    // 전역 드래그 리스너 등록 (Tab_Squad_Drag.js)
    this._setupDragListeners();
  },

  // ── 슬라이더 카드 채우기 ─────────────────────────────────────
  _populateSlider() {
    if (this._sliderRow) this._sliderRow.removeAll(true);
    const chars    = CharacterManager.loadAll() || [];
    const filtered = this._applyFilter(chars);
    const { _sliderCardW: cw, _sliderCardH: ch, _sliderCardGap: gap,
            _sliderAreaW: aW, _sliderAreaX: aX } = this;

    filtered.forEach((char, i) => {
      this._sliderRow.add(this._makeSliderCard(char, i * (cw + gap), 0, cw, ch));
    });
    this._sliderTotalW = filtered.length * (cw + gap) - gap;
    this._sliderOffset = Math.max(-(Math.max(0, this._sliderTotalW - aW)), Math.min(0, this._sliderOffset));
    this._sliderRow.x  = aX + this._sliderOffset;
  },

  // ── 슬라이더 카드 1장 ────────────────────────────────────────
  //
  //  레이아웃 (위→아래):
  //  ┌──────────────────────┐
  //  │  Cog N  (크고 선명)  │  ← cogH: Cog 등급 강조 + 직종 약자
  //  ├──────────────────────┤
  //  │  이 름  (크게)       │  ← nameH: TITLE 폰트
  //  ├──────────────────────┤
  //  │                      │
  //  │   초상화 (portH)     │  ← FISH/DIVE/A·I 워터마크
  //  │                      │
  //  ├──────────────────────┤
  //  │  ██████ HP 바        │  ← hpBarH
  //  ├──────────────────────┤
  //  │  미니맵 (배치 시)    │  ← mapH, 넓게
  //  └──────────────────────┘
  //
  _makeSliderCard(char, x, y, cw, ch) {
    const { scene } = this;

    const deploySlots = this._getDeploySlots(char.id);
    const deployCount = deploySlots.length;
    const inSquad     = deployCount > 0;

    const JOB_COLOR  = { fisher: 0x0e1e32, diver: 0x0e1e14, ai: 0x1a0e2a };
    const JOB_BORDER = { fisher: 0x3a6888, diver: 0x3a7050, ai: 0x6a4888 };
    const JOB_BAND   = { fisher: 0x152a48, diver: 0x152a1c, ai: 0x24143a };
    const JOB_SHORT  = { fisher: 'FISH',   diver: 'DIVE',   ai: 'A·I'   };

    // ── 높이 구성 계산 ────────────────────────────────────────
    const pad      = 3;
    const cogH     = parseInt(scaledFontSize(18, scene.scale));  // ① Cog 등급
    const nameH    = parseInt(scaledFontSize(16, scene.scale));  // ② 이름
    const portW    = cw - pad * 2;
    const portH    = Math.floor(cw * 0.68);                      // ③ 초상화
    const hpBarH   = 4;                                          // ④ HP 바
    const botPad   = 5;
    // 미니맵은 초상화 하단부 오버레이로 처리 — 별도 높이 없음

    const cardH = cogH + nameH + portH + hpBarH + botPad;

    const c   = scene.add.container(x, y);
    const cbg = scene.add.graphics();

    const drawCbg = (hover = false) => {
      cbg.clear();
      cbg.fillStyle(JOB_COLOR[char.job] || 0x181410, 1);
      cbg.lineStyle(
        inSquad ? 2 : 1,
        inSquad ? 0xffd060 : hover ? 0xc8a060 : (JOB_BORDER[char.job] || 0x3a2010),
        0.95
      );
      cbg.strokeRect(0, 0, cw, cardH);
      cbg.fillRect(0, 0, cw, cardH);
    };
    drawCbg();

    // ── ① Cog 등급 띠 ─────────────────────────────────────────
    const bandG = scene.add.graphics();
    bandG.fillStyle(JOB_BAND[char.job] || 0x1a1410, 1);
    bandG.fillRect(0, 0, cw, cogH);
    bandG.lineStyle(1, JOB_BORDER[char.job] || 0x3a2010, 0.4);
    bandG.lineBetween(0, cogH, cw, cogH);

    // 직종 약자 (좌, 작게)
    const jobLbl = scene.add.text(pad + 2, cogH / 2,
      JOB_SHORT[char.job] || '???', {
      fontSize: scaledFontSize(6.5, scene.scale),
      fill: `#${(JOB_BORDER[char.job] || 0x3a6888).toString(16).padStart(6,'0')}`,
      fontFamily: FontManager.MONO,
    }).setOrigin(0, 0.5);

    // Cog 등급 (중앙, 크고 밝게)
    const cogBadge = scene.add.text(cw / 2, cogH / 2,
      `Cog  ${char.cog}`, {
      fontSize: scaledFontSize(11, scene.scale),
      fill: inSquad ? '#ffd060' : '#c8a040',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5, 0.5);

    // ── ② 이름 ────────────────────────────────────────────────
    const nameY = cogH;
    const nameT = scene.add.text(cw / 2, nameY + nameH / 2, char.name, {
      fontSize: scaledFontSize(10, scene.scale),
      fill: inSquad ? '#ffe090' : '#d8b878',
      fontFamily: FontManager.TITLE,
    }).setOrigin(0.5, 0.5);

    // ── ③ 초상화 영역 ─────────────────────────────────────────
    const portY  = cogH + nameH;
    const portBg = scene.add.graphics();
    portBg.fillStyle(0x060504, 1);
    portBg.fillRect(pad, portY, portW, portH);

    // 캐릭터 스프라이트 (없으면 직종 워터마크 폴백)
    let watermark;
    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img = scene.add.image(pad + portW / 2, portY + portH * 0.50, char.spriteKey)
        .setOrigin(0.5);
      const scale = Math.min(portW / img.width, portH / img.height);
      img.setScale(scale);
      watermark = img;
    } else {
      watermark = scene.add.text(pad + portW / 2, portY + portH * 0.50,
        JOB_SHORT[char.job] || '???', {
        fontSize: scaledFontSize(20, scene.scale),
        fill: `#${(JOB_BAND[char.job] || 0x1a1410).toString(16).padStart(6,'0')}`,
        fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
    }

    // ── ④ HP 바 ───────────────────────────────────────────────
    const hpY   = portY + portH;
    const hpPct = char.maxHp > 0 ? char.currentHp / char.maxHp : 1;
    const hpCol = hpPct > 0.6 ? 0x2a6030 : hpPct > 0.3 ? 0x705820 : 0x702020;
    const hpBg  = scene.add.graphics();
    hpBg.fillStyle(0x050404, 1);
    hpBg.fillRect(pad, hpY, portW, hpBarH);
    const hpFg  = scene.add.graphics();
    hpFg.fillStyle(hpCol, 1);
    hpFg.fillRect(pad, hpY, Math.max(1, Math.round(portW * hpPct)), hpBarH);

    // ── ⑤ 미니맵 (배치 시) — 초상화 하단부 오버레이 ──────────
    // Graphics는 컨테이너 로컬 좌표로 직접 그려야 오버플로우 없음
    let miniMapGfx = null;
    if (inSquad) {
      miniMapGfx = this._buildMiniMapOverlay(scene, pad, portY, portW, portH, deploySlots);
    }

    const items = [cbg, bandG, jobLbl, cogBadge, nameT, portBg, watermark, hpBg, hpFg];
    if (miniMapGfx) items.push(miniMapGfx);
    c.add(items);

    // ── 히트 영역 ───────────────────────────────────────────────
    // pointermove는 등록하지 않음 — 전역 리스너(Tab_Squad_Drag)가 처리
    const hit = scene.add.rectangle(cw / 2, cardH / 2, cw, cardH, 0, 0)
      .setInteractive({ useHandCursor: true });

    let _downX = 0, _downY = 0, _dragging = false;

    hit.on('pointerover', () => {
      if (this._isDraggingAny) return;
      drawCbg(true);
    });
    hit.on('pointerout', () => {
      if (!_dragging) drawCbg(false);
    });

    // pointerdown: 시작 좌표 기록
    hit.on('pointerdown', (ptr) => {
      _downX    = ptr.x;
      _downY    = ptr.y;
      _dragging = false;
    });

    // pointermove: 임계치 초과 시 드래그 시작 신호 발신
    // 전역 리스너의 pointermove와 중복되지 않도록
    // _startDrag 호출만 하고 이후는 전역이 담당
    hit.on('pointermove', (ptr) => {
      if (!ptr.isDown || _dragging) return;
      const dx = Math.abs(ptr.x - _downX);
      const dy = Math.abs(ptr.y - _downY);
      if (dx > 6 || dy > 6) {
        _dragging = true;
        this._startDrag(char, ptr);
      }
    });

    // pointerup: 드래그 아니면 팝업 오픈
    hit.on('pointerup', () => {
      if (_dragging) {
        _dragging = false;
      } else {
        if (!this._sliderDragged) this._openSquadPopup(char);
      }
      drawCbg(false);
    });

    c.add(hit);
    return c;
  },

  // ── 배치 슬롯 조회 헬퍼 ──────────────────────────────────────
  _getDeploySlots(charId) {
    const slots = [];
    this._squad.forEach((slot, idx) => {
      if (Array.isArray(slot) && slot.includes(charId)) slots.push(idx);
    });
    return slots;
  },

  // ── 미니맵 오버레이 빌드 ────────────────────────────────────
  //  단일 Graphics 오브젝트에 모든 셀을 그림
  //  → 컨테이너에 add() 시 로컬 좌표 그대로 적용되어 오버플로우 없음
  //
  //  배치: 초상화 영역(portY ~ portY+portH) 하단 절반에 오버레이
  //        잠수정 칸(슬롯9)은 3×3 그리드 좌측에 붙여서 표시
  _buildMiniMapOverlay(scene, pad, portY, portW, portH, deploySlots) {
    const g      = scene.add.graphics();
    const gap    = 1;

    // 원래 계산식 기반, 상하좌우 4px 여백을 줘서 초상화 안에 가운데 정렬
    const margin = 4;
    const cellSz = Math.max(5, Math.floor((portW - margin * 2 - gap * 4) / 4.2));
    const gridW  = cellSz * 3 + gap * 2;
    const gridH  = cellSz * 3 + gap * 2;
    const subW   = cellSz;
    const totalW = subW + gap + gridW;

    // 초상화 영역 하단 중앙 정렬 (하단 margin 여백)
    const startX = pad + (portW - totalW) / 2;
    const startY = portY + portH - gridH - margin;

    const drawCell = (lx, ly, filled, isBlue = false) => {
      if (filled) {
        // 배치됨 — 원래 색감 유지
        g.fillStyle(isBlue ? 0x3a8aaa : 0xffd060, 0.9);
        g.lineStyle(1, isBlue ? 0x2a6a8a : 0xb08840, 1);
      } else {
        // 비어있음 — fill 어둡게, 라인은 밝게 올려서 격자 가시성 확보
        g.fillStyle(0x080808, 0.85);
        g.lineStyle(1, 0x666666, 1);
      }
      g.strokeRect(lx, ly, cellSz, cellSz);
      g.fillRect(lx, ly, cellSz, cellSz);
    };

    // 잠수정 칸 (슬롯 9, 그리드 좌측 중단)
    drawCell(startX, startY + cellSz + gap, deploySlots.includes(9), true);

    // 3×3 격자
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const lx  = startX + subW + gap + col * (cellSz + gap);
        const ly  = startY + row  * (cellSz + gap);
        drawCell(lx, ly, deploySlots.includes(idx));
      }
    }
    return g;
  },

  // ── 필터 ─────────────────────────────────────────────────────
  _applyFilter(chars) {
    return chars.filter(c => {
      const jobOk = this._filterJob === 'all' || c.job === this._filterJob;
      const cogOk = this._filterCog === 'all' || c.cog === parseInt(this._filterCog);
      return jobOk && cogOk;
    });
  },

  _buildFilters(panelX, panelW, fy) {
    const JOB = [
      { key: 'all', label: '전체' }, { key: 'fisher', label: '낚시꾼' },
      { key: 'diver', label: '잠수부' }, { key: 'ai', label: 'AI' },
    ];
    const COG = [
      { key: 'all', label: '전체' },
      ...[1,2,3,4,5,6,7].map(n => ({ key: `${n}`, label: `Cog${n}` })),
    ];
    let bx = panelX + 16;
    JOB.forEach(f => {
      bx = this._makeFilterBtn(bx, fy + 6, f.label,
        () => { this._filterJob = f.key; this._populateSlider(); this._rebuildFilterBar(panelX, panelW, fy); },
        this._filterJob === f.key);
    });
    bx += 14;
    COG.forEach(f => {
      bx = this._makeFilterBtn(bx, fy + 6, f.label,
        () => { this._filterCog = f.key; this._populateSlider(); this._rebuildFilterBar(panelX, panelW, fy); },
        this._filterCog === f.key);
    });
  },

  _rebuildFilterBar(panelX, panelW, fy) {
    this._filterBarObjs.forEach(o => o.destroy());
    this._filterBarObjs = [];
    const JOB = [
      { key: 'all', label: '전체' }, { key: 'fisher', label: '낚시꾼' },
      { key: 'diver', label: '잠수부' }, { key: 'ai', label: 'AI' },
    ];
    const COG = [
      { key: 'all', label: '전체' },
      ...[1,2,3,4,5,6,7].map(n => ({ key: `${n}`, label: `Cog${n}` })),
    ];
    let bx = panelX + 16;
    JOB.forEach(f => {
      bx = this._makeFilterBtn(bx, fy + 6, f.label,
        () => { this._filterJob = f.key; this._populateSlider(); this._rebuildFilterBar(panelX, panelW, fy); },
        this._filterJob === f.key, true);
    });
    bx += 14;
    COG.forEach(f => {
      bx = this._makeFilterBtn(bx, fy + 6, f.label,
        () => { this._filterCog = f.key; this._populateSlider(); this._rebuildFilterBar(panelX, panelW, fy); },
        this._filterCog === f.key, true);
    });
  },

  _makeFilterBtn(x, y, label, onClick, active, tracked = false) {
    const { scene } = this;
    const fs2 = scaledFontSize(9, scene.scale);
    const tmp  = scene.add.text(0, -9999, label, { fontSize: fs2, fontFamily: FontManager.MONO });
    const bw   = tmp.width + 14; tmp.destroy();
    const bh   = parseInt(scaledFontSize(20, scene.scale));
    const bg2  = scene.add.graphics();
    const draw2 = (h) => {
      bg2.clear();
      bg2.fillStyle(active ? (h ? 0x3a2810 : 0x2a1c0a) : (h ? 0x1a1208 : 0x0e0a05), 1);
      bg2.lineStyle(1, active ? 0x8a5820 : (h ? 0x4a2810 : 0x2a1808), 0.9);
      bg2.strokeRect(x, y, bw, bh);
      bg2.fillRect(x, y, bw, bh);
    };
    draw2(false);
    const txt2 = scene.add.text(x + bw / 2, y + bh / 2, label, {
      fontSize: fs2, fill: active ? '#e8a040' : '#5a3818', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    const hit2 = scene.add.rectangle(x + bw / 2, y + bh / 2, bw, bh, 0, 0)
      .setInteractive({ useHandCursor: true });
    hit2.on('pointerover', () => draw2(true));
    hit2.on('pointerout',  () => draw2(false));
    hit2.on('pointerup',   onClick);
    if (tracked) { this._filterBarObjs.push(bg2, txt2, hit2); }
    else         { this._container.add([bg2, txt2, hit2]); }
    return x + bw + 4;
  },

  // ── 토스트 메시지 ─────────────────────────────────────────────
  _showToast(msg) {
    const { scene, W, H } = this;
    const t = scene.add.text(W / 2, H * 0.5, msg, {
      fontSize: scaledFontSize(14, scene.scale), fill: '#cc5533', fontFamily: FontManager.MONO,
    }).setOrigin(0.5).setDepth(500).setAlpha(0);
    scene.tweens.add({
      targets: t, alpha: 1, duration: 200,
      onComplete: () => {
        scene.time.delayedCall(1200, () => {
          scene.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() });
        });
      },
    });
  },

  // ── 생명주기 ─────────────────────────────────────────────────
  show()    { this._container.setVisible(true); },
  hide()    { this._container.setVisible(false); },
  destroy() {
    this._clearCellGlow();
    this._destroyDragGhost();
    this._closeSquadPopup();
    if (this._sliderMaskGfx) { this._sliderMaskGfx.destroy(); this._sliderMaskGfx = null; }
    const si = this.scene.input;
    if (this._sliderOnDown)  si.off('pointerdown', this._sliderOnDown);
    if (this._sliderOnMove)  si.off('pointermove', this._sliderOnMove);
    if (this._sliderOnUp)    si.off('pointerup',   this._sliderOnUp);
    if (this._sliderOnWheel) si.off('wheel',        this._sliderOnWheel);
    this._container.destroy();
  },

});
