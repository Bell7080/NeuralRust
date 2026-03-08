// ================================================================
//  Tab_Squad_Popup.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Squads/Tab_Squad_Popup.js
//
//  역할: 탐사대 탭 — 캐릭터 프로필 팝업
//        공용 모듈 CharProfile(Tab_CharProfile.js)로 위임
//  의존: Tab_Squad.js (prototype 확장), Tab_CharProfile.js
//
//  ✏️ 수정: 배치 회수 onClick을 클릭 시점에 재조회
//    팝업이 열린 채로 다른 캐릭터가 제거되어 squad 상태가 바뀌어도
//    charId 기준으로 재검색하므로 엉뚱한 슬롯이 제거되지 않음.
// ================================================================

Object.assign(Tab_Squad.prototype, {

  _openSquadPopup(char) {
    if (this._squadOpenCharId) this._closeSquadPopup();
    this._squadOpenCharId = char.id;

    // charId를 클로저로 고정 — 버튼 클릭 시점에 squad를 재조회해 정확한 슬롯 제거
    const charId    = char.id;
    const extraBtns = [];

    const deploySlots = this._getDeploySlots(charId);
    if (deploySlots.length > 0) {
      extraBtns.push({
        label:  '배치 회수',
        danger: true,
        onClick: () => {
          // 클릭 시점에 squad를 다시 읽어 정확한 마지막 슬롯 사용
          const currentSlots = this._getDeploySlots(charId);
          if (currentSlots.length > 0) {
            const targetSlot = currentSlots[currentSlots.length - 1];
            this._removeCharFromSlot(targetSlot, charId);
          }
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
