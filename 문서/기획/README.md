# ⚙️ NEURAL RUST — 뉴럴 러스트

> 스토리 중심 인디게임 개발 저장소
> Phaser 3 (웹) → Electron (exe 패키징) → Unity (이식)

---

## 📁 저장소 구조

```
neural-rust/  (project001)
│
├── 📒 문서/
│   ├── 기획/
│   │   ├── README.md          ← 이 파일
│   │   ├── 세계관.md           ← 핵심 설정 (세계구조·역사·법칙·Cog·모티프)
│   │   ├── 시나리오.md          ← 스토리 흐름·씬 목록·대사·엔딩·로어
│   │   ├── 캐릭터.md            ← 인간·AI 캐릭터 구분 설정집
│   │   ├── GDD.md              ← 게임 시스템 설계 (루프·직군·UI 등)
│   │   └── 레퍼런스.md          ← 참고 게임·비주얼·글 자료
│   └── 개발/
│       ├── 개발 일지.md
│       └── 시스템 기획.md       ← 시스템 세부 설계 (루프·자원·직군·Cog·밸런스)
│
├── 🎮 Games/
│   ├── Assets/Fonts/
│   │   └── NeoDunggeunmoPro-Regular.woff2
│   └── Codes/
│       ├── Managers/
│       │   ├── FontManager.js   # 폰트 관리 + 전환
│       │   ├── SaveManager.js   # 세이브 / 설정 / 스토리 데이터
│       │   ├── StoryManager.js  # 스토리 흐름 제어 (Day · Flag · Log)
│       │   ├── InputManager.js  # 키 바인딩 관리
│       │   └── utils.js
│       ├── Scenes/
│       │   ├── LobbyScene.js
│       │   ├── LoadingScene.js
│       │   ├── SettingsScene.js
│       │   └── GameScene.js     # 인게임 (개발 중)
│       ├── Entities/            # (추후)
│       ├── Systems/             # (추후)
│       └── UI/                  # (추후)
│
└── index.html
```

---

## 🎨 게임 정보

| 항목 | 내용 |
|------|------|
| 제목 | **NEURAL RUST** (뉴럴 러스트) |
| 부제 | 뇌신경과 녹 |
| 내부 코드명 | project001 |
| 장르 | 스토리 진행형 관리 시뮬레이션 + 디펜스 |
| 플랫폼 | 웹 (Phaser3) → Electron (exe) → Unity (이식) |
| 배경 | 붕괴 후 102년, 심해·증기·고철의 세계 |
| 분위기 | `심해` · `증기` · `고철` · `녹` · `톱니바퀴` · `소금바람` · `폐허` · `공존` |

---

## 🔑 핵심 용어

| 용어 | 원어 | 의미 |
|------|------|------|
| 아크 | Arc | 전류를 정제한 이 세계의 화폐. 선박 동력원이자 경제 기반 |
| 코그 | Cog | 이 세계의 파벌·세력 단위. 톱니바퀴 이빨 하나를 의미 |
| 드레지 | Dredge | AI를 고철 몸체에 불러오는 행위. 심연에서 건져올린다는 뜻 |

---

## 🎨 컬러 팔레트 (Neural Rust 테마)

| 이름 | HEX | 용도 |
|------|-----|------|
| BG | `#050407` | 베이스 배경 |
| GRID | `#0f0a05` | 그리드 선 |
| BORDER | `#2a1a0a` | 테두리 / 구분선 |
| DIM | `#1e1008` | 어두운 텍스트 |
| MID | `#3d2010` | 중간 텍스트 |
| ACCENT | `#a05018` | 주요 강조 (녹슨 주황) |
| BRIGHT | `#c8a070` | 밝은 강조 (동판) |
| TEXT | `#c8bfb0` | 주 텍스트 |

---

## ♻️ 핵심 루프 요약

```
[ 아침 — 경영 ]
  스토리 씬 / NPC 대화
  AI 배치 · 낚시꾼 보초 배치 · 다이버 목표 설정 · 엔지니어 외주
      ↓
[ 점심 — 운영 ]
  낚시꾼 디펜스 이벤트 처리
  다이버 수집 결과 수령 (고철 · 로어)
  AI → Arc 수령
      ↓
[ 저녁 — 결산 ]
  Arc · 자원 정산
  스토리 씬 / 캐릭터 대화
      ↓
[ 다음날 아침 ]
  전날 이벤트 후일담 → 순환
```

---

## 📝 기획 문서 작업 순서

```
1. 세계관.md       설정 확정 및 Cog 세력 추가
2. 캐릭터.md       등장인물 추가
3. 시나리오.md     씬 목록 작성 (ID 부여)
4. StoryManager.js STORY_DATA 에 씬 ID 등록
5. Scenes/         실제 씬 파일 구현
```

---

## 💾 저장 데이터 구조

| 키 | 내용 |
|---|---|
| `neural_rust_save` | 인게임 진행 데이터 |
| `neural_rust_settings` | 설정 (폰트 등) |
| `neural_rust_story` | 스토리 진행 (Day · 플래그 · 이벤트 로그 · 로어) |
| `neural_rust_keybinds` | 키 바인딩 |

---

## 📖 스토리 시스템 요약

`StoryManager.js` 의 `STORY_DATA` 에 씬을 정의합니다.

```javascript
5: [
  {
    id:    'day5_scene_name',     // 시나리오.md 의 ID와 동일하게
    phase: 'morning',             // 'morning' | 'noon' | 'evening'
    once:  true,
    condition: () => SaveManager.getFlag('some_flag'),
    onComplete: () => SaveManager.unlockLore('lore_001'),
  },
],
```

씬 파일에서:
```javascript
if (StoryManager.shouldPlay('day5_scene_name')) { ... }
StoryManager.completeScene('day5_scene_name');
StoryManager.advance();
StoryManager.debug(); // 콘솔에 현재 상태 출력
```

---

## ⌨️ 키 설정

설정 화면 → 키 설정 탭에서 리바인딩 가능.
코드: `InputManager.isJustDown('confirm')`

기본 액션: `confirm` / `cancel` / `menu` / `tab` / `moveUp` / `moveDown` / `moveLeft` / `moveRight` / `dash` / `map`

---

## 🔌 Electron 이식 체크리스트

| 항목 | 파일 | 처리 |
|---|---|---|
| `[BROWSER-ONLY]` 전체화면 | `main.js` | `win.setFullScreen()` 교체 |
| `[BROWSER-ONLY]` 오버레이 | `main.js` | `app.whenReady()` 로 교체 |
| localStorage | `SaveManager._read/_write` | `fs` / `electron-store` 교체 |
| 키 바인딩 저장 | `InputManager._saveBinds/_loadBinds` | 동상 |

---

## 🚀 빠른 시작 (Codespaces)

```bash
npx serve .
```

---

## 🗺️ 개발 로드맵

| 단계 | 내용 | 환경 |
|---|---|---|
| 1단계 ✅ | 환경 구성 · 매니저 구축 · 기획 문서 정리 · 타이틀 확정 (Neural Rust) | 사지방 |
| 2단계 | 세계관 / 시나리오 작업 + Arc·드레지 시스템 프로토타입 | 사지방 |
| 3단계 | 핵심 시스템 구현 (Arc 루프 · 낚시꾼 디펜스 · 다이버 수집) + 스토리 씬 | 사지방 |
| 4단계 | Cog 시스템 + Electron 패키징 → exe | 사지방 / 휴가 |
| 5단계 | Unity 이식 | 전역 후 |
