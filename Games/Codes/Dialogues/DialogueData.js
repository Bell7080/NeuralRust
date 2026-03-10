// ================================================================
//  DialogueData.js  —  자동 생성 파일 (직접 수정 금지)
//  생성 도구: Games/Codes/Dialogues/Tools/convert_dialogue.js
//  원본:      NeuralRust_Dialogue.xlsx
// ================================================================

// ── CAST_DATA ─────────────────────────────────────────────────────
//
//  구조: { 단축어: { name: "캐릭터명", nickname: "닉네임"|null } }
//
//  닉네임 동적 변경 방법:
//    SaveManager.setFlag('cast_nick_A', 'Noa')
//    → DialogueScene이 자동으로 이름판에 Noa 표시
//
const CAST_DATA = {
  "P": {
    "name": "Player",
    "nickname": null
  },
  "A": {
    "name": "Noa",
    "nickname": "노아"
  },
  "AA": {
    "name": "Noa",
    "nickname": "???"
  }
};

// ── BGM_DATA ──────────────────────────────────────────────────────
const BGM_DATA = {
  "Day_1_1": "bgm_calm_morning",
  "Shop_Open": "bgm_shop_theme",
  "Shop_In": "bgm_shop_theme"
};

// ── BG_DATA ───────────────────────────────────────────────────────
//
//  구조: { "태그": "파일명" }  (파일명 = 확장자 제외)
//  경로: Games/Assets/Sprites/Backgrounds/{파일명}.png
//
//  대화 시트 bg 컬럼 사용법:
//    - 태그 입력 → 해당 라인 진입 시 배경 크로스페이드 전환
//    - 공백     → 이전 배경 유지
//    - NONE     → 배경 제거 (어둠 처리)
//
const BG_DATA = {
  "태그 (bg 컬럼에 입력)": "배경 파일명",
  "A": "Background_003",
  "B": "Background002",
  "C": "Background003"
};

// ── SFX_DATA ──────────────────────────────────────────────────────
const SFX_DATA = {
  "Happy": "sfx_happy_001",
  "Sad": "sfx_sad_001",
  "Shock": "sfx_shock_001",
  "Door": "sfx_door_open",
  "Beep": "sfx_beep_alert",
  "Typing": "sfx_typing_loop",
  "Confirm": "sfx_confirm",
  "Cancel": "sfx_cancel"
};

// ── DIALOGUE_DATA ─────────────────────────────────────────────────
//
//  구조: {
//    "이벤트ID": {
//      lines: [
//        { id, char, expr, text, choices?, goto, flag_set, flag_check, sfx, fx }
//      ],
//      lineMap: { "line_id": index }
//    }
//  }
//
const DIALOGUE_DATA = {
  "Welcome": {
    "lines": [
      {
        "id": "001",
        "char": "AA",
        "expr": "001",
        "text": "반갑습니다.",
        "choice": false,
        "goto": null,
        "flag_set": null,
        "flag_check": null,
        "sfx": null,
        "fx": null,
        "bg": "A"
      },
      {
        "id": "002",
        "char": "A",
        "expr": "001",
        "text": "저는 외곽 지부에 이전 관리자 노아(Noa)라고 합니다.",
        "choice": false,
        "goto": null,
        "flag_set": null,
        "flag_check": null,
        "sfx": null,
        "fx": null,
        "bg": null,
        "choices": [
          {
            "label": "외곽 지부?",
            "goto": "004",
            "gotoIdx": 2
          }
        ],
        "isChoice": true
      },
      {
        "id": "004",
        "char": "A",
        "expr": "003",
        "text": "말 그대로 외각 지부입니다, 별 볼 일 없는 곳이죠.",
        "choice": false,
        "goto": null,
        "flag_set": null,
        "flag_check": null,
        "sfx": null,
        "fx": null,
        "bg": null
      },
      {
        "id": "005",
        "char": "A",
        "expr": "001",
        "text": "아무튼, 새롭게 외각 지부 관리자로 부임하신 것을 축하드립니다.",
        "choice": false,
        "goto": null,
        "flag_set": null,
        "flag_check": null,
        "sfx": null,
        "fx": null,
        "bg": null,
        "choices": [
          {
            "label": "부임이라니?",
            "goto": "007",
            "gotoIdx": 4
          }
        ],
        "isChoice": true
      },
      {
        "id": "007",
        "char": "A",
        "expr": "003",
        "text": "이런, 아무것도 기억나지 않으신가보네요.",
        "choice": false,
        "goto": null,
        "flag_set": null,
        "flag_check": null,
        "sfx": null,
        "fx": null,
        "bg": null
      },
      {
        "id": "008",
        "char": "A",
        "expr": "002",
        "text": "음. . . 뭐, 상관 없나.",
        "choice": false,
        "goto": null,
        "flag_set": null,
        "flag_check": null,
        "sfx": null,
        "fx": null,
        "bg": null
      },
      {
        "id": "009",
        "char": "A",
        "expr": "001",
        "text": "천천히 배우면 될 거라 생각합니다.",
        "choice": false,
        "goto": null,
        "flag_set": null,
        "flag_check": null,
        "sfx": null,
        "fx": null,
        "bg": null
      },
      {
        "id": "010",
        "char": "A",
        "expr": "003",
        "text": "그럼 인수인계를 시작하겠습니다.",
        "choice": false,
        "goto": null,
        "flag_set": null,
        "flag_check": null,
        "sfx": null,
        "fx": null,
        "bg": null
      }
    ],
    "lineMap": {
      "001": 0,
      "002": 1,
      "004": 2,
      "005": 3,
      "007": 4,
      "008": 5,
      "009": 6,
      "010": 7
    }
  }
};
