// ================================================================
//  PartyScene.js
//  경로: Games/Codes/Scenes/PartyScene.js
//
//  역할: 탐사 파티 편성 씬 — 진입점 (생명주기 + 위임 호출)
//
//  레이아웃 (좌30 / 중40 / 우30):
//    LEFT 30%   : 필터 + 캐릭터 그리드 + 돌아가기  (PS_LeftPanel)
//    CENTER 40% : BG_007 배경 + 캐릭터 일러스트 + 프로필  (PS_CenterPanel)
//    RIGHT 30%  : 파티 슬롯 + 파티현황 + 출발 버튼  (PS_RightPanel)
//
//  분할 파일 로드 순서 (index.html):
//    PS_Layout.js → PS_Background.js → PS_LeftPanel.js
//    → PS_CenterPanel.js → PS_RightPanel.js → PartyScene.js
//
//  인터랙션:
//    카드 1회 클릭  → 중앙 프로필 오픈
//    카드 2회 클릭  → 파티 추가/제거
//    파티 슬롯 1회  → 빨간 강조 + 중앙 프로필 오픈
//    파티 슬롯 2회  → 파티 제거
// ================================================================

class PartyScene extends Phaser.Scene {
  constructor() { super({ key: 'PartyScene' }); }

  // ── 상태 초기화 ────────────────────────────────────────────────
  init() {
    this._party         = [];
    this._chars         = [];
    this._sceneHits     = [];
    this._slotHits      = [];
    this._manageHits    = [];
    this._cardObjs      = [];
    this._filterBarObjs = [];
    this._selectedChar  = null;
    this._lastClickId   = null;
    this._slotSelected  = null;
    this._filterJob     = 'all';
    this._filterCog     = 'all';
    this._sortMode      = 'none';
    this._sortOrder     = 'desc';
    this._scrollY       = 0;
    this._totalCardH    = 0;
    this._dragged       = false;
    this._maskGfx       = null;
    this._cardRow       = null;
    this._dragTimer     = null;
    this._dblTimer      = null;

    // 컨테이너 refs
    this._bgContainer      = null;
    this._leftContainer    = null;
    this._centerContainer  = null;
    this._profileContainer = null;
    this._rightContainer   = null;
    this._slotContainer    = null;
    this._manageContainer  = null;
    this._hdrContainer     = null;
  }

  // ── 에셋 사전 로드 ─────────────────────────────────────────────
  preload() {
    if (!this.textures.exists('bg_party')) {
      this.load.image('bg_party', 'Games/Assets/Sprites/Background_007.png');
    }
  }

  // ── 씬 생성 ────────────────────────────────────────────────────
  create() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;
    if (typeof InputManager !== 'undefined') InputManager.reinit(this);

    const all      = CharacterManager.loadAll() || [];
    this._chars    = all.filter(c => !c.status || c.status === 'alive' || c.status === 'ai');
    this._fs       = n => FontManager.adjustedSize(n, this.scale);

    PS_Layout.calcLayout(this);
    PS_Layout.buildContainers(this);
    PS_Background.buildBackground(this);
    PS_Background.buildHeader(this);
    PS_LeftPanel.buildLeftPanel(this);
    PS_CenterPanel.buildCenterBg(this);
    PS_CenterPanel.buildCenterEmpty(this);
    PS_RightPanel.buildRightPanel(this);
    PS_RightPanel.buildPartySlots(this);
    PS_RightPanel.buildManagePanel(this);
    this._setupDrag();
  }

  // ══════════════════════════════════════════════════════════════
  //  파티 조작
  // ══════════════════════════════════════════════════════════════
  _addToParty(charId) {
    if(this._party.includes(charId)) return;
    this._party.push(charId);
    this._refreshAll();
  }

  _removeFromPartyById(charId) {
    const idx = this._party.indexOf(charId);
    if(idx === -1) return;
    this._party.splice(idx, 1);
    if(this._slotSelected === charId) this._slotSelected = null;
    this._refreshAll();
  }

  _refreshAll() {
    PS_RightPanel.buildPartySlots(this);
    this._cardObjs.forEach(({container:c}) => {
      if(c._refreshMark) c._refreshMark();
      if(c._drawCbg)     c._drawCbg(false);
    });
    PS_RightPanel.buildManagePanel(this);
  }

  _calcCost() {
    return this._party.reduce((s, id) => {
      const c = this._chars.find(ch => ch.id === id);
      return s + (c ? c.cog : 0);
    }, 0);
  }

  // ══════════════════════════════════════════════════════════════
  //  필터
  // ══════════════════════════════════════════════════════════════
  _applyFilter() {
    let r = this._chars.slice();
    if(this._filterJob !== 'all') r = r.filter(c => c.job === this._filterJob);
    if(this._filterCog !== 'all') r = r.filter(c => String(c.cog) === String(this._filterCog));
    if(this._sortMode === 'date') {
      const ts = id => { const p = (id||'').split('_'); const t = parseInt(p[1], 10); return isNaN(t) ? 0 : t; };
      r.sort((a, b) => this._sortOrder === 'desc' ? ts(b.id)-ts(a.id) : ts(a.id)-ts(b.id));
    } else if(this._sortMode === 'stat') {
      const sm = c => c.statSum ?? Object.values(c.stats||{}).reduce((a,v) => a+(v||0), 0);
      r.sort((a, b) => this._sortOrder === 'desc' ? sm(b)-sm(a) : sm(a)-sm(b));
    }
    return r;
  }

  // ══════════════════════════════════════════════════════════════
  //  드래그 스크롤
  // ══════════════════════════════════════════════════════════════
  _setupDrag() {
    let sy = 0, ss = 0, drag = false;
    const inA = (ptr) =>
      ptr.x >= this._cardAreaX && ptr.x <= this._cardAreaX + this._cardAreaW &&
      ptr.y >= this._cardAreaY && ptr.y <= this._cardAreaY + this._cardAreaH;

    this._dragDown = (ptr) => {
      if(!inA(ptr)) return;
      drag = true; this._dragged = false; sy = ptr.y; ss = this._scrollY;
    };
    this._dragMove = (ptr) => {
      if(!drag) return;
      const dy = sy - ptr.y;
      if(Math.abs(dy) > 4) this._dragged = true;
      const mx = Math.max(0, this._totalCardH - this._cardAreaH);
      this._scrollY = Math.max(0, Math.min(ss + dy, mx));
      if(this._cardRow) this._cardRow.setY(this._cardAreaY - this._scrollY);
    };
    this._dragUp = () => {
      drag = false;
      if(this._dragTimer) { this._dragTimer.remove(); this._dragTimer = null; }
      this._dragTimer = this.time.delayedCall(100, () => { this._dragged = false; });
    };
    this._dragWheel = (ptr, o, dx, dy) => {
      if(!inA(ptr)) return;
      const mx = Math.max(0, this._totalCardH - this._cardAreaH);
      this._scrollY = Math.max(0, Math.min(this._scrollY + dy * 0.5, mx));
      if(this._cardRow) this._cardRow.setY(this._cardAreaY - this._scrollY);
    };

    this.input.on('pointerdown', this._dragDown);
    this.input.on('pointermove', this._dragMove);
    this.input.on('pointerup',   this._dragUp);
    this.input.on('wheel',       this._dragWheel);
  }

  // ══════════════════════════════════════════════════════════════
  //  출발
  // ══════════════════════════════════════════════════════════════
  _depart() {
    const cost = this._calcCost();
    const ok   = SaveManager.spendArc ? SaveManager.spendArc(cost) : true;
    if(!ok) { PS_RightPanel.buildManagePanel(this); return; }
    if(CharacterManager.saveParty) CharacterManager.saveParty(this._party);
    const fl = this.add.rectangle(0, 0, this.W, this.H, 0x050407, 0).setOrigin(0).setDepth(999);
    this.tweens.add({
      targets: fl, alpha: 1, duration: 350, ease: 'Sine.easeIn',
      onComplete: () => this.scene.start('ExploreScene', { from: 'PartyScene' }),
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  정리
  // ══════════════════════════════════════════════════════════════
  shutdown() {
    this._sceneHits.forEach(h  => { try { h.destroy(); } catch(e){} });
    this._slotHits.forEach(h   => { try { h.destroy(); } catch(e){} });
    this._manageHits.forEach(h => { try { h.destroy(); } catch(e){} });
    this._sceneHits = []; this._slotHits = []; this._manageHits = [];
    if(this._dragTimer) { try { this._dragTimer.remove(); } catch(e){} }
    if(this._dblTimer)  { try { this._dblTimer.remove();  } catch(e){} }
    this.input.off('pointerdown', this._dragDown);
    this.input.off('pointermove', this._dragMove);
    this.input.off('pointerup',   this._dragUp);
    this.input.off('wheel',       this._dragWheel);
  }
}
