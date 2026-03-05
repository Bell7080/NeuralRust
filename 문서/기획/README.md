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
│   │   ├── 세계관.md           ← 핵심 설정 (세계구조·역사·법칙·세력·모티프)
│   │   ├── 시나리오.md          ← 스토리 흐름·씬 목록·대사·엔딩·로어
│   │   ├── 캐릭터.md            ← 인간·AI 캐릭터 구분 설정집
│   │   ├── GDD.md              ← 게임 시스템 설계 (루프·직군·UI 등)
│   │   └── 레퍼런스.md          ← 참고 게임·비주얼·글 자료
│   └── 개발/
│       ├── 개발 일지.md
│       └── 시스템 기획.md       ← 시스템 세부 설계
│
├── 🎮 Games/
│   ├── Assets/Fonts/
│   └── Codes/
│       ├── Managers/
│       │   ├── FontManager.js
│       │   ├── SaveManager.js
│       │   ├── StoryManager.js
│       │   ├── InputManager.js
│       │   └── utils.js
│       └── Scenes/
│           ├── LobbyScene.js
│           ├── LoadingScene.js
│           ├── SettingsScene.js
│           ├── GameScene.js
│           └── Atelier/
│               ├── AtelierScene.js   ← 공방 메인 씬
│               ├── AtelierHUD.js     ← Day / Arc HUD
│               ├── AtelierTabs.js    ← 탭 버튼 공통 빌더
│               └── tabs/
│                   ├── Tab_Explore.js  ← 탐색 탭
│                   └── Tab_Stubs.js    ← 미구현 탭 플레이스홀더
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
| 코그 | Cog | **위험도 등급 체계.** Cog 1~5. 구역·적·기록물 등에 적용 |
| 드레지 | Dredge | AI를 고철 몸체에 불러오는 행위. 심연에서 건져올린다는 뜻 |
| 공방 | Atelier | 인게임 허브. 탭 기반 경영 화면 |
| 마스트 | Mast | 이 세계의 파벌·세력 단위 |

---

## 🎨 컬러 팔레트

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

## ♻️ 핵심 루프

```
[ 아침 — 경영 ]  공방(Atelier) 에서 편성
  AI 배치 · 낚시꾼 보초 배치 · 다이버 목표 설정 · 엔지니어 외주
      ↓
[ 점심 — 운영 ]
  낚시꾼 디펜스 이벤트 처리
  다이버 수집 결과 수령 (고철 · 로어)
  AI → Arc 수령
      ↓
[ 저녁 — 결산 ]
  Arc · 자원 정산 / 스토리 씬
      ↓
[ 다음날 아침 ]  순환
```

---

## 🏗️ 공방 (Atelier) 탭 구조

```
좌측: [창고] [도감] [회상]      HUD(Day|Arc)      [설정]
우측:                        [영입][탐사대][시설][외주][드레지]

              [ 중앙 콘텐츠 패널 ]

                  [ 탐  색 ]  ← 하단 중앙 기본 탭
```

---

## 📝 기획 문서 작업 순서

```
1. 세계관.md       세력 용어 확정 및 세력 설정 추가
2. 캐릭터.md       등장인물 추가
3. 시나리오.md     씬 목록 작성 (ID 부여)
4. StoryManager.js STORY_DATA 에 씬 ID 등록
5. Scenes/         실제 씬 파일 구현
```

---

## 💾 저장 데이터 구조

| 키 | 내용 |
|---|---|
| `neural_rust_save` | 인게임 진행 데이터 (arc 포함) |
| `neural_rust_settings` | 설정 (폰트 등) |
| `neural_rust_story` | 스토리 진행 (Day · 플래그 · 이벤트 로그 · 로어) |
| `neural_rust_keybinds` | 키 바인딩 |

---

## 🔌 Electron 이식 체크리스트

| 항목 | 파일 | 처리 |
|---|---|---|
| `[BROWSER-ONLY]` 전체화면 | `main.js` | `win.setFullScreen()` 교체 |
| `[BROWSER-ONLY]` 오버레이 | `main.js` | `app.whenReady()` 로 교체 |
| localStorage | `SaveManager._read/_write` | `fs` / `electron-store` 교체 |
| 키 바인딩 저장 | `InputManager._saveBinds/_loadBinds` | 동상 |

---

## 🗺️ 개발 로드맵

| 단계 | 내용 |
|---|---|
| 1단계 ✅ | 환경 구성 · 매니저 구축 · 기획 문서 정리 · 타이틀 확정 |
| 2단계 🔄 | 공방(Atelier) 씬 탭 레이아웃 · 탐색/영입 구현 + 세계관·시나리오 작업 |
| 3단계 | 핵심 시스템 구현 (Arc 루프 · 낚시꾼 디펜스 · 다이버 수집) + 스토리 씬 |
| 4단계 | 세력 시스템 + Electron 패키징 → exe |
| 5단계 | Unity 이식 |
