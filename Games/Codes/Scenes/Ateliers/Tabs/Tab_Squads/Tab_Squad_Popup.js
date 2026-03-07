// ================================================================
//  Tab_Squad_Popup.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Squads/Tab_Squad_Popup.js
//
//  역할: 탐사대 탭 — 캐릭터 프로필 팝업
//        공용 모듈 CharProfile(Tab_CharProfile.js)로 위임
//  의존: Tab_Squad.js (prototype 확장), Tab_CharProfile.js
// ================================================================

Object.assign(Tab_Squad.prototype, {

  _openSquadPopup(char) {
    if (this._squadOpenCharId) this._closeSquadPopup();
    this._squadOpenCharId = char.id;

    // 배치 현황에서 마지막 슬롯 파악 (추가 버튼용)
    const deploySlots = this._getDeploySlots(char.id);
    const extraBtns   = [];

    if (deploySlots.length > 0) {
      const lastSlot = deploySlots[deploySlots.length - 1];
      extraBtns.push({
        label:   '배치 회수',
        danger:  true,
        onClick: () => {
          this._removeLastFromSlot(lastSlot);
          this._squadOpenCharId = null;
          this._forceCloseCharProfile();
        },
      });
    }

    CharProfile.open(this.scene, this.W, this.H, char, {
      onClose: () => {
        this._squadOpenCharId = null;
      },
      extraBtns,
    });
  },

  _closeSquadPopup() {
    this._forceCloseCharProfile();
    this._squadOpenCharId = null;
  },

  // depth 400~402 범위의 CharProfile 오브젝트 강제 제거
  _forceCloseCharProfile() {
    if (!this.scene || !this.scene.children) return;
    const toRemove = this.scene.children.list.filter(
      obj => obj.depth >= 400 && obj.depth <= 402
    );
    toRemove.forEach(obj => { try { obj.destroy(); } catch(e) {} });
  },

});
