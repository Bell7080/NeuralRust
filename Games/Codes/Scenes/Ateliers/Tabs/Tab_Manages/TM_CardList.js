// ================================================================
//  TM_CardList.js  (GRID REWORK)
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Manages/TM_CardList.js
//
//  역할: 좌측 패널 — 필터 바 + 정렬 버튼 + 캐릭터 그리드 초상화판 + 스크롤
//
//  ✏️ 변경사항 (Grid Rework):
//    - 기존 슬라이스형 카드 목록 → 바둑판 그리드 초상화판으로 전면 교체
//      · 2열 고정, 정사각형에 가까운 카드 (초상화 꽉 채움)
//      · 카드 하단에 이름 + HP바만 표시 (슬림하게)
//    - 필터 바는 기존 직업/Cog 구조 그대로 유지, 상단에 배치
//    - 정렬 버튼 추가: 최신순 / 스탯순
//      · 한 번 클릭 → 높은 순 (▼)
//      · 두 번 클릭 → 낮은 순 (▲)
//      · 세 번 클릭 → 해제 (기본)
//    - 하단 돌아가기 버튼은 TM_Layout.buildBackBtn 그대로 사용 (변경 없음)
//
//  ✏️ 버그 수정 유지:
//    - _makeChip: bg/txt/hit 모두 tab._listPanel.add + _filterBarObjs 추적
//    - maskGfx 씬 절대좌표 기준
//    - pointerout _inCardArea 체크
// ================================================================

const TM_CardList = {

  // ── 좌측 패널 컨테이너 + 필터 + 정렬 + 그리드 빌드 ──────────
  buildListPanel(tab, fs, backBtnH) {
    const { scene, W, H } = tab;
    const { _listW: lw, _bodyY: by } = tab;
    const pm = tab._panelMargin || 0;

    tab._listPanel = scene.add.container(0, 0);
    tab._container.add(tab._listPanel);

    // 좌측 패널 배경
    const panelH  = H - by - backBtnH - pm;
    const panelBg = scene.add.graphics();
    panelBg.fillStyle(0x05080c, 0.96);
    panelBg.lineStyle(1, 0x2a1a08, 0.5);
    panelBg.strokeRect(pm, by, lw - pm * 2, panelH);
    panelBg.fillRect(pm, by, lw - pm * 2, panelH);
    tab._listPanel.add(panelBg);

    // 정렬 상태 초기화
    tab._sortMode  = 'none';   // 'none' | 'date' | 'stat'
    tab._sortOrder = 'desc';   // 'desc'(높은순) | 'asc'(낮은순)

    tab._filterY       = by + parseInt(fs(8));
    tab._filterBarObjs = [];
    TM_CardList.buildFilterBar(tab, fs);

    // 필터 높이 계산 (직업행 + Cog행 + 정렬행) — rowH는 buildFilterBar와 동일하게 fs(32)
    const rowH       = parseInt(fs(32));
    const filterRowH = rowH + parseInt(fs(4));   // 직업행 + 간격
    const filterJobH = rowH + parseInt(fs(4));   // Cog행  + 간격
    const sortRowH   = rowH + parseInt(fs(6));   // 정렬행 + 간격

    tab._cardAreaX = pm + 4;
    tab._cardAreaY = tab._filterY + filterRowH + filterJobH + sortRowH + parseInt(fs(4));
    tab._cardAreaW = lw - pm * 2 - 8;
    tab._cardAreaH = H - tab._cardAreaY - backBtnH - pm - 4;

    TM_CardList.buildCardList(tab, fs);
  },

  // ── 그리드 카드 목록 빌드 ────────────────────────────────────
  buildCardList(tab, fs) {
    const { scene } = tab;
    const fsFn = fs || (n => FontManager.adjustedSize(n, scene.scale));

    // 기존 카드 오브젝트 정리
    if (tab._cardObjs && tab._cardObjs.length > 0) {
      tab._cardObjs.forEach(({ container: c }) => {
        try { c.destroy(); } catch(e) {}
      });
    }
    tab._cardObjs = [];
    if (tab._maskGfx) { try { tab._maskGfx.destroy(); } catch(e){} tab._maskGfx = null; }
    if (tab._cardRow)  { try { tab._cardRow.destroy();  } catch(e){} tab._cardRow  = null; }

    const allChars = CharacterManager.loadAll ? CharacterManager.loadAll() : (CharacterManager.initIfEmpty ? CharacterManager.initIfEmpty() : []);
    const alive    = allChars.filter(c => !c.status || c.status === 'alive' || c.status === 'ai');
    const chars    = TM_CardList._applyFilterAndSort(tab, alive);

    // ── 그리드 치수 ────────────────────────────────────────────
    const cols  = 3;
    const gap   = parseInt(fsFn(4));
    const cardW = Math.floor((tab._cardAreaW - gap * (cols - 1)) / cols);
    const cardH = Math.round(cardW * 1.22);   // 세로형 비율 (초상화 꽉 채움)

    tab._cardW   = cardW;
    tab._cardH   = cardH;
    tab._cardGap = gap;
    tab._scrollY = 0;

    // 마스크 (씬 절대좌표 기준)
    const maskGfx = scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(tab._cardAreaX, tab._cardAreaY, tab._cardAreaW, tab._cardAreaH);
    maskGfx.setVisible(false);
    tab._maskGfx = maskGfx;

    tab._cardRow = scene.add.container(tab._cardAreaX, tab._cardAreaY);
    tab._cardRow.setMask(maskGfx.createGeometryMask());
    tab._listPanel.add(maskGfx);
    tab._listPanel.add(tab._cardRow);

    chars.forEach((char, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = col * (cardW + gap);
      const cy  = row * (cardH + gap);
      const card = TM_CardList._makeGridCard(tab, char, cx, cy, cardW, cardH, fsFn);
      tab._cardRow.add(card);
      tab._cardObjs.push({ container: card, char });
    });

    const rowCount = Math.ceil(chars.length / cols);
    tab._totalCardH = rowCount > 0 ? rowCount * (cardH + gap) - gap : 0;
  },

  // ── 필터 + 정렬 바 ──────────────────────────────────────────
  buildFilterBar(tab, fs) {
    const { scene } = tab;
    const fsFn = fs || (n => FontManager.adjustedSize(n, scene.scale));
    const fy   = tab._filterY;
    const rowH = parseInt(fsFn(32));   // ✏️ 26 → 32 (버튼 높이 증가)

    const JOB_FILTERS = [
      { key:'all',    label:'전체'   },
      { key:'fisher', label:'낚시꾼' },
      { key:'diver',  label:'잠수부' },
      { key:'ai',     label:'AI'    },
    ];
    const COG_FILTERS = [
      { key:'all', label:'전체' },
      ...[1,2,3,4,5,6,7,8,9,10].map(n => ({ key:`${n}`, label:`${n}` })),
    ];

    // ── 직업 필터 행 ───────────────────────────────────────────
    const jobLbl = scene.add.text(6, fy + rowH / 2, '직업', {
      fontSize: fsFn(10), fill: '#4a2e10', fontFamily: FontManager.MONO,  // ✏️ 8 → 10
    }).setOrigin(0, 0.5);
    tab._listPanel.add(jobLbl);
    tab._filterBarObjs.push(jobLbl);

    let bx = 6 + parseInt(fsFn(26));  // ✏️ 22 → 26
    JOB_FILTERS.forEach(f => {
      bx = TM_CardList._makeChip(tab, bx, fy, f.label, rowH, fsFn,
        () => { tab._filterJob = f.key; tab._refreshCards(); TM_CardList._rebuildFilterBar(tab, fsFn); },
        tab._filterJob === f.key);
    });

    // ── Cog 필터 행 ───────────────────────────────────────────
    const cogFy  = fy + rowH + parseInt(fsFn(4));
    const cogLbl = scene.add.text(6, cogFy + rowH / 2, 'Cog', {
      fontSize: fsFn(10), fill: '#4a2e10', fontFamily: FontManager.MONO,  // ✏️ 8 → 10
    }).setOrigin(0, 0.5);
    tab._listPanel.add(cogLbl);
    tab._filterBarObjs.push(cogLbl);

    let cbx = 6 + parseInt(fsFn(26));  // ✏️ 22 → 26
    COG_FILTERS.forEach(f => {
      cbx = TM_CardList._makeChip(tab, cbx, cogFy, f.label, rowH, fsFn,
        () => { tab._filterCog = f.key; tab._refreshCards(); TM_CardList._rebuildFilterBar(tab, fsFn); },
        tab._filterCog === f.key);
    });

    // ── 정렬 행 ───────────────────────────────────────────────
    const sortFy  = cogFy + rowH + parseInt(fsFn(6));
    const sortLbl = scene.add.text(6, sortFy + rowH / 2, '정렬', {
      fontSize: fsFn(10), fill: '#4a2e10', fontFamily: FontManager.MONO,  // ✏️ 8 → 10
    }).setOrigin(0, 0.5);
    tab._listPanel.add(sortLbl);
    tab._filterBarObjs.push(sortLbl);

    const sortBtns = [
      { key: 'date', label: '최신순' },
      { key: 'stat', label: '스탯순' },
    ];

    let sx = 6 + parseInt(fsFn(22));
    sortBtns.forEach(s => {
      // 상태 판별: 현재 이 버튼이 활성 정렬인지
      const isActive = tab._sortMode === s.key;
      // 표시 레이블: 활성이면 방향 화살표 붙임
      const icon  = isActive ? (tab._sortOrder === 'desc' ? ' ▼' : ' ▲') : '';
      const lbl   = s.label + icon;

      const onClick = () => {
        if (tab._sortMode !== s.key) {
          // 처음 클릭 → 활성, 높은순
          tab._sortMode  = s.key;
          tab._sortOrder = 'desc';
        } else if (tab._sortOrder === 'desc') {
          // 두 번째 클릭 → 낮은순
          tab._sortOrder = 'asc';
        } else {
          // 세 번째 클릭 → 해제
          tab._sortMode  = 'none';
          tab._sortOrder = 'desc';
        }
        tab._refreshCards();
        TM_CardList._rebuildFilterBar(tab, fsFn);
      };

      sx = TM_CardList._makeChip(tab, sx, sortFy, lbl, rowH, fsFn, onClick, isActive, true);
    });
  },

  _rebuildFilterBar(tab, fs) {
    tab._filterBarObjs.forEach(o => { try { o.destroy(); } catch(e){} });
    tab._filterBarObjs = [];
    TM_CardList.buildFilterBar(tab, fs);
  },

  // ── 필터 + 정렬 적용 ────────────────────────────────────────
  _applyFilterAndSort(tab, chars) {
    let result = chars.slice();

    // 직업 필터
    if (tab._filterJob && tab._filterJob !== 'all') {
      result = result.filter(c => c.job === tab._filterJob);
    }
    // Cog 필터
    if (tab._filterCog && tab._filterCog !== 'all') {
      result = result.filter(c => String(c.cog) === String(tab._filterCog));
    }

    // 정렬
    if (tab._sortMode === 'date') {
      // 최신순: id = 'c_타임스탬프_xxx' 형태에서 두 번째 세그먼트가 Date.now() 값
      const parseTs = id => {
        if (!id) return 0;
        const parts = id.split('_');
        const ts = parseInt(parts[1], 10);
        return isNaN(ts) ? 0 : ts;
      };
      result.sort((a, b) =>
        tab._sortOrder === 'desc'
          ? parseTs(b.id) - parseTs(a.id)
          : parseTs(a.id) - parseTs(b.id)
      );
    } else if (tab._sortMode === 'stat') {
      // 스탯순: char.statSum 필드 직접 사용 (CharacterManager 생성 시 자동 계산)
      // statSum 없을 경우 char.stats 객체 합산으로 폴백
      const getSum = c => {
        if (c.statSum != null) return c.statSum;
        if (c.stats && typeof c.stats === 'object')
          return Object.values(c.stats).reduce((a, v) => a + (v || 0), 0);
        return 0;
      };
      result.sort((a, b) =>
        tab._sortOrder === 'desc'
          ? getSum(b) - getSum(a)
          : getSum(a) - getSum(b)
      );
    }

    return result;
  },

  // ── 그리드 카드 1장 ─────────────────────────────────────────
  _makeGridCard(tab, char, x, y, cw, ch, fsFn) {
    const { scene } = tab;
    const fs = fsFn || (n => FontManager.adjustedSize(n, scene.scale));

    const JOB_BG     = { fisher:0x0b1822, diver:0x0b1a10, ai:0x16091e };
    const JOB_BORDER = { fisher:0x3a6888, diver:0x3a7050, ai:0x6a4888 };
    const JOB_ACCENT = { fisher:0x1a3a5a, diver:0x1a3a28, ai:0x2a1240 };
    const JOB_SHORT  = { fisher:'FISH',   diver:'DIVE',   ai:'A·I'   };

    const c = scene.add.container(x, y);

    // ── 배경 ───────────────────────────────────────────────────
    const cbg     = scene.add.graphics();
    const drawCbg = (hover, sel) => {
      cbg.clear();
      if (sel) {
        cbg.fillStyle(JOB_ACCENT[char.job] || 0x1a1810, 0.95);
        cbg.lineStyle(2, 0xc8a060, 1);
      } else if (hover) {
        cbg.fillStyle(JOB_BG[char.job] || 0x181410, 0.85);
        cbg.lineStyle(1, 0xc8a060, 0.7);
      } else {
        cbg.fillStyle(JOB_BG[char.job] || 0x181410, 0.65);
        cbg.lineStyle(1, JOB_BORDER[char.job] || 0x3a2010, 0.6);
      }
      cbg.strokeRect(0, 0, cw, ch);
      cbg.fillRect(0, 0, cw, ch);
    };
    drawCbg(false, tab._selectedChar && tab._selectedChar.id === char.id);
    c._drawCbg = drawCbg;

    // ── 초상화 영역 (카드 상단 약 78% 높이) ───────────────────
    const portH = Math.round(ch * 0.78);
    const portBg = scene.add.graphics();
    portBg.fillStyle(0x030303, 0.8);
    portBg.fillRect(2, 2, cw - 4, portH - 2);
    c.add([cbg, portBg]);

    if (char.spriteKey && scene.textures.exists(char.spriteKey)) {
      const img = scene.add.image(cw / 2, portH / 2 + 2, char.spriteKey).setOrigin(0.5);
      const maxW = cw - 4, maxH = portH - 4;
      img.setScale(Math.min(maxW / img.width, maxH / img.height));
      c.add(img);
    } else {
      const fallback = scene.add.text(cw / 2, portH / 2 + 2, JOB_SHORT[char.job] || '?', {
        fontSize: fs(20), fill: '#2a3038', fontFamily: FontManager.MONO,
      }).setOrigin(0.5);
      c.add(fallback);
    }

    // ── Cog 뱃지 (좌상단) ──────────────────────────────────────
    const cogCol = (typeof CharacterManager !== 'undefined' && CharacterManager.getCogColor)
      ? CharacterManager.getCogColor(char.cog)
      : { css: '#a08060' };
    const cogBadgeBg = scene.add.graphics();
    cogBadgeBg.fillStyle(0x000000, 0.65);
    cogBadgeBg.fillRect(2, 2, parseInt(fs(14)), parseInt(fs(11)));
    const cogTxt = scene.add.text(4, 3, `C${char.cog}`, {
      fontSize: fs(8), fill: cogCol.css || '#a08060', fontFamily: FontManager.MONO,
    }).setOrigin(0, 0);
    c.add([cogBadgeBg, cogTxt]);

    // ── 선택 마크 (우상단) — _drawCbg로 테두리로 표현하므로 별도 마크 불필요
    // ✏️ 제거: 첫 번째 카드에 ✓가 기본으로 찍히는 버그 원인이었음
    //    선택 표시는 drawCbg(sel=true)의 금색 테두리로만 표현

    // ── 하단 정보 영역 ─────────────────────────────────────────
    const infoY = portH + 2;
    const infoH = ch - infoY - 2;

    // 이름
    const nameTxt = scene.add.text(cw / 2, infoY + infoH * 0.30, char.name || '???', {
      fontSize: fs(8),
      fill: '#c8bfb0',
      fontFamily: FontManager.TITLE,
      wordWrap: { width: cw - 4 },
      align: 'center',
    }).setOrigin(0.5, 0.5);
    c.add(nameTxt);

    // HP 바
    const hpPct = (char.maxHp > 0) ? Math.max(0, char.currentHp / char.maxHp) : 1;
    const bX = 4, bW = cw - 8, bH = 3;
    const bY = infoY + infoH * 0.72;
    const hpBar = scene.add.graphics();
    hpBar.fillStyle(0x1a1008, 1);
    hpBar.fillRect(bX, bY, bW, bH);
    const hpCol = hpPct > 0.6 ? 0x306030 : hpPct > 0.3 ? 0x806020 : 0x803020;
    hpBar.fillStyle(hpCol, 1);
    hpBar.fillRect(bX, bY, Math.max(1, Math.round(bW * hpPct)), bH);
    c.add(hpBar);

    // ── 히트 영역 ─────────────────────────────────────────────
    // ✏️ 컨테이너(c) 안에 add — scene._panelContent 없는 씬에서 depth 꼬임 방지
    const hit = scene.add.rectangle(cw / 2, ch / 2, cw, ch, 0, 0)
      .setInteractive({ useHandCursor: true });

    // 씬 절대좌표로 카드 영역 판별용 (마스크 밖 hover 방지)
    const _inArea = (ptr) => {
      const ax = tab._cardAreaX, ay = tab._cardAreaY;
      const aw = tab._cardAreaW, ah = tab._cardAreaH;
      return ptr.x >= ax && ptr.x <= ax + aw && ptr.y >= ay && ptr.y <= ay + ah;
    };

    hit.on('pointerover', (ptr) => {
      if (!_inArea(ptr)) return;
      drawCbg(true, tab._selectedChar && tab._selectedChar.id === char.id);
    });
    hit.on('pointerout', (ptr) => {
      if (!_inArea(ptr)) { drawCbg(false, tab._selectedChar && tab._selectedChar.id === char.id); return; }
      drawCbg(false, tab._selectedChar && tab._selectedChar.id === char.id);
    });
    hit.on('pointerup', (ptr) => {
      if (!_inArea(ptr)) return;
      if (tab._dragged) return;
      tab._selectChar && tab._selectChar(char);
    });

    c.add(hit);
    return c;
  },
  // isSortBtn: true이면 너비를 조금 더 여유 있게
  _makeChip(tab, x, y, label, h, fs, onClick, active, isSortBtn = false) {
    const { scene } = tab;
    const tmp = scene.add.text(-9999, -9999, label, {
      fontSize: fs(12), fontFamily: FontManager.MONO,  // ✏️ 9 → 12
    });
    const bw = tmp.width + (isSortBtn ? 20 : 14);  // ✏️ 패딩 증가
    tmp.destroy();

    const bg = scene.add.graphics();
    const draw = (hov) => {
      bg.clear();
      bg.fillStyle(
        active ? (hov ? 0x2a1e0c : 0x181208) : (hov ? 0x141008 : 0x000000),
        active ? 0.85 : 0.5
      );
      bg.lineStyle(1, active ? 0x9a6020 : (hov ? 0x4a2810 : 0x221608), 0.9);
      bg.strokeRect(x, y, bw, h);
      bg.fillRect(x, y, bw, h);
    };
    draw(false);

    const txt = scene.add.text(x + bw / 2, y + h / 2, label, {
      fontSize: fs(12),          // ✏️ 9 → 12
      fill: active ? '#e8a040' : '#5a3818',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);

    // ✏️ hit: 씬에 직접 추가 (컨테이너 좌표계 충돌 방지), depth 21로 필터 위
    const hit = scene.add.rectangle(x + bw / 2, y + h / 2, bw, h, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(21);
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout',  () => draw(false));
    hit.on('pointerup',   onClick);

    tab._listPanel.add([bg, txt]);
    tab._filterBarObjs.push(bg, txt, hit);
    return x + bw + 4;  // ✏️ 3 → 4 (칩 간격 살짝 증가)
  },

  // ── 드래그 스크롤 설정 (TM_Main에서 호출) ───────────────────
  setupDrag(tab) {
    const { scene } = tab;
    let startY = 0, startScroll = 0, dragging = false;

    const _inListArea = (ptr) =>
      ptr.x >= tab._cardAreaX &&
      ptr.x <= tab._cardAreaX + tab._cardAreaW &&
      ptr.y >= tab._cardAreaY &&
      ptr.y <= tab._cardAreaY + tab._cardAreaH;

    tab._dragDown = (ptr) => {
      if (!_inListArea(ptr)) return;
      dragging    = true;
      tab._dragged = false;
      startY      = ptr.y;
      startScroll = tab._scrollY;
    };
    tab._dragMove = (ptr) => {
      if (!dragging) return;
      const dy = startY - ptr.y;
      if (Math.abs(dy) > 4) tab._dragged = true;
      const maxScroll = Math.max(0, tab._totalCardH - tab._cardAreaH);
      tab._scrollY    = Math.max(0, Math.min(startScroll + dy, maxScroll));
      if (tab._cardRow) tab._cardRow.setY(tab._cardAreaY - tab._scrollY);
    };
    tab._dragUp = () => {
      dragging = false;
      if (tab._dragTimer) { tab._dragTimer.remove(); tab._dragTimer = null; }
      tab._dragTimer = scene.time.delayedCall(100, () => { tab._dragged = false; });
    };
    tab._dragWheel = (ptr, objs, dx, dy) => {
      if (!_inListArea(ptr)) return;
      const maxScroll = Math.max(0, tab._totalCardH - tab._cardAreaH);
      tab._scrollY    = Math.max(0, Math.min(tab._scrollY + dy * 0.5, maxScroll));
      if (tab._cardRow) tab._cardRow.setY(tab._cardAreaY - tab._scrollY);
    };

    scene.input.on('pointerdown', tab._dragDown);
    scene.input.on('pointermove', tab._dragMove);
    scene.input.on('pointerup',   tab._dragUp);
    scene.input.on('wheel',       tab._dragWheel);
  },
};
