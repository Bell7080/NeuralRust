# 📁 프로젝트 폴더 구조 — NEURAL RUST

> 실제 현재 파일 경로 기준.
> index.html 스크립트 로드 순서와 동기화되어 있습니다.

---

## 현재 구조

```
neural-rust/
│
├── index.html                              ← 진입점. 스크립트 로드 순서 관리
│
├── 문서/
│   ├── 기획/
│   │   ├── README.md                       ← 프로젝트 개요 / 로드맵
│   │   ├── GDD.md                          ← 게임 디자인 문서
│   │   ├── 세계관.md                        ← 세계 설정 (구조·역사·법칙·세력)
│   │   ├── 시나리오.md                      ← 스토리·씬 목록·대사·엔딩
│   │   ├── 캐릭터.md                        ← 인간·AI 캐릭터 설정
│   │   └── 레퍼런스.md                      ← 참고 게임·비주얼·사운드
│   └── 개발/
│       ├── 개발 일지.md                     ← 날짜별 작업 기록
│       ├── 시스템 기획.md                   ← 시스템 세부 설계
│       ├── 탐사대_시스템.md                 ← 탐사대·직업·스탯·던전 설계
│       └── folder_structure.md             ← 이 파일
│
├── Games/
│   ├── Assets/
│   │   └── Fonts/
│   │       ├── BMKIRANGHAERANG.woff2
│   │       └── NeoDunggeunmoPro-Regular.woff2
│   │
│   └── Codes/
│       ├── Managers/
│       │   ├── utils.js                    ← scaledFontSize 등 전역 유틸
│       │   ├── FontManager.js              ← 폰트 중앙 관리
│       │   ├── AudioManager.js             ← 볼륨 관리 (마스터·BGM·SFX)
│       │   ├── SaveManager.js              ← 세이브 / 설정 / 스토리 저장
│       │   ├── StoryManager.js             ← 스토리 흐름 제어
│       │   ├── InputManager.js             ← 키 바인딩 관리
│       │   └── CharacterManager.js         ← 캐릭터 생성·저장·불러오기
│       │
│       └── Scenes/
│           ├── LobbyScene.js               ← 타이틀 / 로비
│           ├── LoadingScene.js             ← 씬 전환 로딩
│           ├── GameScene.js                ← 인게임 플레이스홀더
│           ├── ExploreScene.js             ← 탐색 슬롯 씬
│           ├── AtelierScene.js             ← 공방 메인 씬
│           │
│           ├── Ateliers/                   ← 공방 관련 파일 모음
│           │   ├── AtelierHUD.js           ← 공방 상단 Day / Arc HUD
│           │   ├── AtelierTabs.js          ← 탭 버튼 공통 빌더
│           │   └── Tabs/
│           │       ├── Tab_Explore.js      ← 탐색 탭
│           │       ├── Tab_Manage.js       ← 관리 탭 (뼈대·카드 그리드)
│           │       ├── Tab_Manage_Popup.js ← 관리 탭 프로필 팝업
│           │       ├── Tab_Manage_Utils.js ← 관리 탭 유틸 (툴팁·회복·토스트)
│           │       ├── Tab_Squad.js        ← 탐사대 탭 (뼈대)
│           │       ├── Tab_Squad_Grid.js   ← 탐사대 3×3 격자
│           │       ├── Tab_Squad_Slider.js ← 탐사대 슬라이더·필터
│           │       └── Tab_Stubs.js        ← 미구현 탭 플레이스홀더
│           │
│           └── Settings/
│               ├── Settings_Tab_Font.js    ← 설정 > 폰트
│               ├── Settings_Tab_Video.js   ← 설정 > 비디오
│               ├── Settings_Tab_Audio.js   ← 설정 > 오디오
│               ├── Settings_Tab_Keys.js    ← 설정 > 키 설정
│               └── Settings_Tab_Save.js    ← 설정 > 저장·초기화
│
│           └── SettingsScene.js            ← 설정 씬 껍데기 (Scenes/ 루트)
│
└── Games/Codes/main.js                     ← Phaser 초기화 / 진입점
```

---

## index.html 스크립트 로드 순서

분할 파일은 **뼈대 → 확장** 순서가 필수입니다.

```html
<!-- ① Phaser 3 -->
<script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>

<!-- ② Managers (의존성 순서 엄수) -->
<script src="Games/Codes/Managers/FontManager.js"></script>
<script src="Games/Codes/Managers/SaveManager.js"></script>
<script src="Games/Codes/Managers/StoryManager.js"></script>
<script src="Games/Codes/Managers/InputManager.js"></script>
<script src="Games/Codes/Managers/AudioManager.js"></script>
<script src="Games/Codes/Managers/utils.js"></script>
<script src="Games/Codes/Managers/CharacterManager.js"></script>

<!-- ③ Scenes -->
<script src="Games/Codes/Scenes/LobbyScene.js"></script>
<script src="Games/Codes/Scenes/LoadingScene.js"></script>
<script src="Games/Codes/Scenes/GameScene.js"></script>
<script src="Games/Codes/Scenes/ExploreScene.js"></script>

<!-- ③-Settings (탭 파일 먼저, SettingsScene 마지막) -->
<script src="Games/Codes/Scenes/Settings/Settings_Tab_Font.js"></script>
<script src="Games/Codes/Scenes/Settings/Settings_Tab_Video.js"></script>
<script src="Games/Codes/Scenes/Settings/Settings_Tab_Audio.js"></script>
<script src="Games/Codes/Scenes/Settings/Settings_Tab_Keys.js"></script>
<script src="Games/Codes/Scenes/Settings/Settings_Tab_Save.js"></script>
<script src="Games/Codes/Scenes/SettingsScene.js"></script>

<!-- ③-Atelier (뼈대 → 확장 순서 엄수) -->
<script src="Games/Codes/Scenes/Ateliers/AtelierTabs.js"></script>
<script src="Games/Codes/Scenes/Ateliers/AtelierHUD.js"></script>
<script src="Games/Codes/Scenes/Ateliers/Tabs/Tab_Explore.js"></script>
<script src="Games/Codes/Scenes/Ateliers/Tabs/Tab_Stubs.js"></script>
<script src="Games/Codes/Scenes/Ateliers/Tabs/Tab_Manage.js"></script>
<script src="Games/Codes/Scenes/Ateliers/Tabs/Tab_Manage_Popup.js"></script>
<script src="Games/Codes/Scenes/Ateliers/Tabs/Tab_Manage_Utils.js"></script>
<script src="Games/Codes/Scenes/Ateliers/Tabs/Tab_Squad.js"></script>
<script src="Games/Codes/Scenes/Ateliers/Tabs/Tab_Squad_Grid.js"></script>
<script src="Games/Codes/Scenes/Ateliers/Tabs/Tab_Squad_Slider.js"></script>
<script src="Games/Codes/Scenes/AtelierScene.js"></script>

<!-- ④ 진입점 -->
<script src="Games/Codes/main.js"></script>
```

> ⚠️ `AtelierScene.js`는 모든 탭 클래스가 정의된 후 로드되어야 합니다.
> 탭 뼈대(Tab_Manage, Tab_Squad) 뒤에 반드시 확장 파일(Popup, Utils, Grid, Slider)이 와야 합니다.

---

## 저장 키 구조

| localStorage 키 | 관리 파일 | 내용 |
|-----------------|-----------|------|
| `neural_rust_save` | SaveManager | 인게임 진행 (arc 등) |
| `neural_rust_settings` | SaveManager | 설정 (폰트 등) |
| `neural_rust_story` | SaveManager | 스토리 진행 (Day·플래그·로그·로어) |
| `neural_rust_keybinds` | InputManager | 키 바인딩 |
| `neural_rust_audio` | AudioManager | 볼륨 설정 (마스터·BGM·SFX) |
| `settings_font` | FontManager / Settings_Tab_Font | 폰트 선택 |
| `nr_characters` | CharacterManager | 캐릭터 데이터 |
| `nr_squad` | CharacterManager | 탐사대 편성 |

---

## 분할 파일 관계 요약

| 뼈대 파일 | 확장 파일 | 방식 |
|-----------|-----------|------|
| `Tab_Manage.js` | `Tab_Manage_Popup.js` | `Object.assign(Tab_Manage.prototype, ...)` |
| `Tab_Manage.js` | `Tab_Manage_Utils.js` | `Object.assign(Tab_Manage.prototype, ...)` |
| `Tab_Squad.js` | `Tab_Squad_Grid.js` | `Object.assign(Tab_Squad.prototype, ...)` |
| `Tab_Squad.js` | `Tab_Squad_Slider.js` | `Object.assign(Tab_Squad.prototype, ...)` |

---

## 파일 줄 수 참고

| 파일 | 줄 수 |
|------|:-----:|
| Tab_Manage.js | ~220 |
| Tab_Manage_Popup.js | ~235 |
| Tab_Manage_Utils.js | ~147 |
| Tab_Squad.js | ~90 |
| Tab_Squad_Grid.js | ~186 |
| Tab_Squad_Slider.js | ~232 |

---

## Electron 이식 시 변경 지점

| 항목 | 현재 (브라우저) | 변경 후 (Electron) |
|------|-----------------|-------------------|
| 전체화면 | `requestFullscreen()` | `win.setFullScreen(true)` |
| 시작 오버레이 | `#fs-overlay` 클릭 | `app.whenReady()` 후 바로 `startGame()` |
| 저장 | `localStorage` | `electron-store` 또는 `fs` + `app.getPath('userData')` |
| 키 바인딩 저장 | `localStorage` | 동상 |
| 볼륨 저장 | `localStorage` | 동상 |

변경 대상 함수: `SaveManager._read/_write`, `InputManager._saveBinds/_loadBinds`, `AudioManager._save/_load`, `CharacterManager` (saveAll/loadAll/saveSquad/loadSquad)
