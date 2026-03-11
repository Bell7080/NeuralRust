# ⚙️ NEURAL RUST — 뉴럴 러스트

> 스토리 중심 인디게임 개발 저장소
> Phaser 3 (웹) → Electron (exe 패키징) → Unity (이식)

---

// https://bell7080.github.io/NeuralRust/
//게임 접속 사이트

## 📁 저장소 구조

```
neural-rust/
│
├── 문서/
│   ├── 기획/
│   │   ├── README.md          ← 이 파일
│   │   ├── GDD.md             ← 게임 시스템 설계 (루프·직군·UI 등)
│   │   ├── 세계관.md           ← 핵심 설정 (세계구조·역사·법칙·세력·모티프)
│   │   ├── 시나리오.md          ← 스토리 흐름·씬 목록·대사·엔딩·로어
│   │   ├── 캐릭터.md            ← 인간·AI 캐릭터 구분 설정집
│   │   └── 레퍼런스.md          ← 참고 게임·비주얼·글 자료
│   └── 개발/
│       ├── 개발 일지.md         ← 날짜별 작업 기록
│       ├── 시스템 기획.md        ← 시스템 세부 설계 (공방·자원·직군·세력·진행구조)
│       ├── 탐사대_시스템.md      ← 탐사대·직업·스탯·Cog·던전 배치 설계
│       └── folder_structure.md  ← 파일 구조·스크립트 로드 순서·저장 키
│
└── Games/
    ├── Assets/
    │   ├── Fonts/              ← BMKiranghaerang, NeoDunggeunmoPro
    │   └── Sprites/            ← Sd_Character_Sheet_001~002.png (캐릭터 72종)
    └── Codes/
        ├── Managers/           ← 전역 매니저 8종
        └── Scenes/
            ├── LobbyScene.js / LoadingScene.js / GameScene.js / ExploreScene.js / AtelierScene.js
            ├── Ateliers/       ← AtelierHUD.js / AtelierTabs.js / Tabs/*.js
            └── Settings/       ← Settings_Tab_*.js / SettingsScene.js
```

→ 파일 구조 전체 및 스크립트 로드 순서: `문서/개발/folder_structure.md`

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
| 코그 | Cog | 위험도 등급 체계. Cog 1~7. 구역·AI·괴수 등에 적용 |
| 드레지 | Dredge | AI를 고철 몸체에 불러오는 행위. 심연에서 건져올린다는 뜻 |
| 공방 | Atelier | 인게임 허브. 탭 기반 경영 화면 |
| 마스트 | Mast | 이 세계의 파벌·세력 단위. 각 마스트의 수장은 앵커(Anchor) |

→ 용어 전체: `문서/기획/세계관.md` §5

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

→ 시스템 세부: `문서/개발/시스템 기획.md`

---

## 🏗️ 공방 (Atelier) 탭 구조

```
좌측: [상점] [창고] [도감] [회상]      HUD(Day|Arc)      [설정]
우측:                              [영입][관리][탐사대][시설][외주][드레지]

                    [ 중앙 콘텐츠 패널 ]

                         [ 탐  색 ]  ← 하단 중앙 기본 탭
```

| 탭 키 | 클래스 | 파일 | 구현 상태 |
|-------|--------|------|-----------|
| `explore` | `Tab_Explore` | `Tab_Explore.js` | ✅ 구현 완료 (탐색 씬 연결) |
| `manage` | `Tab_Manage` | `Tab_Manage.js` + Popup + Utils | ✅ 구현 완료 (카드 그리드·프로필 팝업·회복) |
| `squad` | ~~`Tab_Squad`~~ | ❌ 삭제 예정 | 전투 방식 변경으로 제거 |
| `recruit` | `Tab_Recruit` | `Tab_Stubs.js` | 🔲 플레이스홀더 |
| `facility` | `Tab_Facility` | `Tab_Stubs.js` | 🔲 플레이스홀더 |
| `outsource` | `Tab_Outsource` | `Tab_Stubs.js` | 🔲 플레이스홀더 |
| `dredge` | `Tab_Dredge` | `Tab_Stubs.js` | 🔲 플레이스홀더 |
| `shop` | `Tab_Shop` | `Tab_Stubs.js` | 🔲 플레이스홀더 |
| `storage` | `Tab_Storage` | `Tab_Stubs.js` | 🔲 플레이스홀더 |
| `codex` | `Tab_Codex` | `Tab_Stubs.js` | 🔲 플레이스홀더 |
| `memory` | `Tab_Memory` | `Tab_Stubs.js` | 🔲 플레이스홀더 |

---

## 🧩 구현된 매니저 목록

| 파일 | 역할 | 상태 |
|------|------|------|
| `FontManager.js` | 폰트 로드·전환 (BMKiranghaerang / NeoDunggeunmoPro / System) | ✅ |
| `SaveManager.js` | 게임·설정·스토리 localStorage 저장/불러오기 | ✅ |
| `StoryManager.js` | Day 단위 스토리 씬 흐름 제어 | ✅ (씬 데이터 미작성) |
| `InputManager.js` | 키 바인딩 관리·리바인드 | ✅ |
| `AudioManager.js` | 마스터·BGM·SFX 볼륨 관리 | ✅ |
| `CharacterManager.js` | 캐릭터 생성(72종 스프라이트)·저장·탐사대 편성 관리 | ✅ |
| `CharacterSpriteManager.js` | 스프라이트 시트 2장 → 72개 텍스처 추출 | ✅ |
| `utils.js` | `scaledFontSize` 등 전역 유틸 | ✅ |

---

## 🎮 구현된 씬 목록

| 씬 | 파일 | 상태 | 비고 |
|----|------|------|------|
| LobbyScene | `LobbyScene.js` | ✅ | 타이틀·글리치 효과·메뉴·새 게임/불러오기 |
| LoadingScene | `LoadingScene.js` | ✅ | 씬 전환 로딩·스프라이트 텍스처 추출 |
| AtelierScene | `AtelierScene.js` | ✅ | 공방 허브·탭 라우팅·웰컴 팝업 |
| ExploreScene | `ExploreScene.js` | ✅ | 3슬롯 카드 추첨·카드 선택 (씬 분기 미구현) |
| SettingsScene | `SettingsScene.js` | ✅ | 폰트·비디오·오디오·키설정·저장/초기화 탭 |
| GameScene | `GameScene.js` | 🔲 | 인게임 플레이스홀더 |

---

## 👥 캐릭터 시스템 구현 현황

- 초기 캐릭터 30명 자동 생성 (낚시꾼·잠수부·AI 각 10명)
- 스탯 5종 (체력·건강·공격·민첩·행운), 총합 기준 Cog 1~7 등급 산정
- Cog 등급별 패시브(공격 범위) / 스킬 풀에서 랜덤 부여
- 스프라이트 시트 2장 → 72종 캐릭터 이미지 자동 추출·적용
- 관리 탭: 카드 그리드 스크롤·프로필 팝업·Arc 소모 HP 회복
- 탐사대 탭: 3×3 격자 배치·드래그 앤 드롭·슬라이더 필터(직업·Cog)·미니맵 오버레이

---

## 💾 저장 데이터 구조

| 키 | 관리 파일 | 내용 |
|---|---|---|
| `neural_rust_save` | SaveManager | 인게임 진행 데이터 (arc 포함) |
| `neural_rust_settings` | SaveManager | 설정 (폰트 등) |
| `neural_rust_story` | SaveManager | 스토리 진행 (Day·플래그·이벤트 로그·로어) |
| `neural_rust_keybinds` | InputManager | 키 바인딩 |
| `neural_rust_audio` | AudioManager | 볼륨 설정 (마스터·BGM·SFX) |
| `settings_font` | FontManager | 폰트 선택 |
| `nr_characters` | CharacterManager | 캐릭터 데이터 (30명) |
| `nr_squad` | CharacterManager | ❌ 폐기 (탐사대 탭 삭제) |
| `nr_record_chips` | CharacterManager | ⬜ 신규 — 기록칩 누적 데이터 |
| `nr_party` | PartyManager | ⬜ 신규 — 탐사 파티 편성 결과 |

---

## 📝 기획 문서 연동 구조

| 문서 | 내용 | 연동 |
|------|------|------|
| `GDD.md` | 게임 전체 설계 요약 | 세계관·시나리오·시스템 기획 참조 |
| `세계관.md` | 세계·역사·법칙·마스트·Cog | GDD §3~6, 시나리오 §1 참조 |
| `시나리오.md` | 스토리·씬 목록·로어 | StoryManager.js `STORY_DATA`와 동기화 |
| `캐릭터.md` | 등장인물 설정 | 시나리오.md 참조 |
| `시스템 기획.md` | 시스템 세부 설계 | GDD §4, 탐사대_시스템.md 참조 |
| `탐사대_시스템.md` | 탐사대·직업·스탯·던전 | CharacterManager.js, Tab_Squad.js 참조 |
| `folder_structure.md` | 파일 구조·로드 순서·저장 키 | index.html과 동기화 |

### 씬 추가 작업 순서

```
1. 시나리오.md       씬 ID 부여 및 내용 작성
2. StoryManager.js   STORY_DATA 에 씬 ID 등록
3. Scenes/           씬 파일 구현
```

---

## 🔌 Electron 이식 체크리스트

| 항목 | 파일 | 처리 |
|---|---|---|
| `[BROWSER-ONLY]` 전체화면 | `main.js` | `win.setFullScreen()` 교체 |
| `[BROWSER-ONLY]` 오버레이 | `main.js` | `app.whenReady()` 로 교체 |
| localStorage (세이브) | `SaveManager._read/_write` | `fs` / `electron-store` 교체 |
| localStorage (키 바인딩) | `InputManager._saveBinds/_loadBinds` | 동상 |
| localStorage (볼륨) | `AudioManager._save/_load` | 동상 |
| localStorage (폰트) | `FontManager.init`, `Settings_Tab_Font` | 동상 |
| localStorage (캐릭터) | `CharacterManager` | 동상 |

---

## 🗺️ 개발 로드맵

| 단계 | 내용 | 상태 |
|---|---|---|
| 1단계 | 환경 구성·매니저 구축·기획 문서 정리·타이틀 확정 | ✅ 완료 |
| 2단계 | 공방 탭 레이아웃·탐색/관리/탐사대 구현 + 세계관·시나리오 작업 | ✅ 완료 |
| 3단계 | 핵심 시스템 구현 (Arc 루프·낚시꾼 디펜스·다이버 수집) + 스토리 씬 | ⬜ 예정 |
| 4단계 | 세력 시스템 + Electron 패키징 → exe | ⬜ 예정 |
| 5단계 | Unity 이식 | ⬜ 예정 |

### 2단계 세부 완료 항목

- [x] LobbyScene — 타이틀·글리치·메뉴
- [x] LoadingScene — 씬 전환·스프라이트 텍스처 추출
- [x] AtelierScene — 공방 허브·탭 라우팅·HUD (Day/Arc)·웰컴 팝업
- [x] ExploreScene — 3슬롯 카드 추첨·선택 UI
- [x] SettingsScene — 5개 탭 전체 (폰트·비디오·오디오·키설정·저장)
- [x] Tab_Explore — 탐색 탭 진입 UI
- [x] Tab_Manage — 카드 그리드·드래그 스크롤·프로필 팝업·HP 회복
- [x] ~~Tab_Squad~~ — 탐사대 탭 삭제 (크로노 아크 방식 전투 UI로 전환)
- [x] CharacterSpriteManager — 스프라이트 시트 2장 → 72종 텍스처 자동 추출
- [x] CharacterManager — 캐릭터 30명 생성·Cog 등급·스킬/패시브 부여
- [ ] StoryManager — 씬 데이터(STORY_DATA) 작성 필요
- [ ] ExploreScene — 카드 선택 후 씬 분기 미구현
