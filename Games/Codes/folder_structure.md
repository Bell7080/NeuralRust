# 📁 프로젝트 폴더 구조 제안

## 현재 구조 (추정)
```
Games/Codes/
├── index.html / main.js / utils.js
├── AudioManager.js / CharacterManager.js / FontManager.js
├── InputManager.js / SaveManager.js / StoryManager.js
├── AtelierHUD.js / AtelierScene.js / AtelierTabs.js
├── ExploreScene.js / GameScene.js / LoadingScene.js / LobbyScene.js / SettingsScene.js
├── Tab_Explore.js / Tab_Manage.js / Tab_Squad.js / Tab_Stubs.js
└── Settings/
    └── Settings_Tab_Audio/Font/Keys/Save/Video.js
```

---

## 제안 구조
```
Games/Codes/
├── index.html
├── main.js
│
├── Core/                         ← 전역 매니저 / 유틸
│   ├── utils.js
│   ├── AudioManager.js
│   ├── CharacterManager.js
│   ├── FontManager.js
│   ├── InputManager.js
│   ├── SaveManager.js
│   └── StoryManager.js
│
└── Scenes/
    ├── LoadingScene.js
    ├── LobbyScene.js
    ├── GameScene.js
    ├── ExploreScene.js
    │
    ├── Atelier/                  ← 아틀리에 씬 묶음
    │   ├── AtelierScene.js
    │   ├── AtelierHUD.js
    │   ├── AtelierTabs.js
    │   └── tabs/
    │       ├── Tab_Explore.js
    │       ├── Tab_Stubs.js
    │       ├── Tab_Manage.js          ← 뼈대 + 카드 그리드
    │       ├── Tab_Manage_Popup.js    ← 프로필 팝업 UI
    │       ├── Tab_Manage_Utils.js    ← 툴팁 / 버튼 / 토스트
    │       ├── Tab_Squad.js           ← 뼈대 + build
    │       ├── Tab_Squad_Grid.js      ← 3×3 격자 빌드 / 조작
    │       └── Tab_Squad_Slider.js    ← 슬라이더 / 필터 / 드래그
    │
    └── Settings/
        ├── SettingsScene.js
        ├── Settings_Tab_Audio.js
        ├── Settings_Tab_Font.js
        ├── Settings_Tab_Keys.js
        ├── Settings_Tab_Save.js
        └── Settings_Tab_Video.js
```

---

## 이동 요약

| 파일 그룹 | 이동 위치 |
|-----------|-----------|
| utils.js + *Manager.js 6개 | → `Core/` |
| Loading / Lobby / Game / ExploreScene | → `Scenes/` |
| Atelier* + AtelierHUD/Tabs | → `Scenes/Atelier/` |
| Tab_*.js (기존 + 신규 분할) | → `Scenes/Atelier/tabs/` |
| SettingsScene + Settings_Tab_* | → `Scenes/Settings/` |

---

## index.html 로드 순서

분할 파일은 **뼈대 → 확장** 순서가 필수입니다.

```html
<!-- Core -->
<script src="Core/utils.js"></script>
<script src="Core/FontManager.js"></script>
<script src="Core/AudioManager.js"></script>
<script src="Core/SaveManager.js"></script>
<script src="Core/CharacterManager.js"></script>
<script src="Core/InputManager.js"></script>
<script src="Core/StoryManager.js"></script>

<!-- Scenes -->
<script src="Scenes/LoadingScene.js"></script>
<script src="Scenes/LobbyScene.js"></script>
<script src="Scenes/GameScene.js"></script>
<script src="Scenes/ExploreScene.js"></script>

<!-- Atelier tabs (순서 중요!) -->
<script src="Scenes/Atelier/tabs/Tab_Explore.js"></script>
<script src="Scenes/Atelier/tabs/Tab_Stubs.js"></script>
<script src="Scenes/Atelier/tabs/Tab_Manage.js"></script>
<script src="Scenes/Atelier/tabs/Tab_Manage_Popup.js"></script>
<script src="Scenes/Atelier/tabs/Tab_Manage_Utils.js"></script>
<script src="Scenes/Atelier/tabs/Tab_Squad.js"></script>
<script src="Scenes/Atelier/tabs/Tab_Squad_Grid.js"></script>
<script src="Scenes/Atelier/tabs/Tab_Squad_Slider.js"></script>

<script src="Scenes/Atelier/AtelierHUD.js"></script>
<script src="Scenes/Atelier/AtelierTabs.js"></script>
<script src="Scenes/Atelier/AtelierScene.js"></script>

<!-- Settings -->
<script src="Scenes/Settings/Settings_Tab_Audio.js"></script>
<script src="Scenes/Settings/Settings_Tab_Font.js"></script>
<script src="Scenes/Settings/Settings_Tab_Keys.js"></script>
<script src="Scenes/Settings/Settings_Tab_Save.js"></script>
<script src="Scenes/Settings/Settings_Tab_Video.js"></script>
<script src="Scenes/Settings/SettingsScene.js"></script>

<script src="main.js"></script>
```

---

## 분할 결과 줄 수

| 파일 | 분할 전 | 분할 후 |
|------|:-------:|:-------:|
| Tab_Manage.js | 617줄 | **220줄** |
| Tab_Manage_Popup.js | *(신규)* | **235줄** |
| Tab_Manage_Utils.js | *(신규)* | **147줄** |
| Tab_Squad.js | 539줄 | **90줄** |
| Tab_Squad_Grid.js | *(신규)* | **186줄** |
| Tab_Squad_Slider.js | *(신규)* | **232줄** |
