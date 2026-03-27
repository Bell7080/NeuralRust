// ================================================================
//  Settings/_types.ts
//  경로: src/Scenes/Settings/_types.ts
//
//  역할: 설정 탭 파일들이 공유하는 SettingsScene 인터페이스 정의
//        순환 임포트 방지용 — SettingsScene 직접 임포트 대신 사용
// ================================================================

export interface ISettingsScene extends Phaser.Scene {
  fromScene:            string;
  _activeTab:           string;
  _cursorTimer:         Phaser.Time.TimerEvent | null;
  _audioEffRefreshers?: Array<() => void>;

  drawOptionBox(
    gfx:      Phaser.GameObjects.Graphics,
    x:        number,
    y:        number,
    w:        number,
    h:        number,
    selected: boolean,
    hover?:   boolean,
  ): void;

  makeButton(
    x:       number,
    y:       number,
    bw:      number,
    bh:      number,
    label:   string,
    onClick: () => void,
    danger?: boolean,
  ): void;

  showConfirmPopup(
    cx:        number,
    H:         number,
    message:   string,
    onConfirm: () => void,
  ): void;

  showToast(
    cx:          number,
    y:           number,
    message:     string,
    onComplete?: () => void,
    color?:      string,
  ): void;
}
