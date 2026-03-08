// ================================================================
//  DialogueData.js  ← 자동 생성 — 직접 수정 금지
//  경로: Games/Codes/Dialogues/DialogueData.js
//
//  원본: NeuralRust_Dialogue.xlsx
//  생성: node Tools/convert_dialogue.js
//  생성일: 2026. 3. 8. 오전 10:11:25
// ================================================================

const CAST_DATA = {
  "P": "Player",
  "A": "Noa"
};

const BGM_DATA = {
  "이벤트 ID (시트명)": "BGM 파일명",
  "Day_1_1": "bgm_calm_morning",
  "Shop_Open": "bgm_shop_theme",
  "Shop_In": "bgm_shop_theme"
};

const SFX_DATA = {
  "별칭 (sfx 컬럼에 입력)": "SFX 파일명",
  "Happy": "sfx_happy_001",
  "Sad": "sfx_sad_001",
  "Shock": "sfx_shock_001",
  "Door": "sfx_door_open",
  "Beep": "sfx_beep_alert",
  "Typing": "sfx_typing_loop",
  "Confirm": "sfx_confirm",
  "Cancel": "sfx_cancel"
};

const KEYWORD_DATA = [
  {
    "word": "이형",
    "color": "FF4444",
    "bold": true,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "아크",
    "color": "FFD700",
    "bold": true,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "A.I",
    "color": "5DD8F0",
    "bold": true,
    "italic": false,
    "underline": false,
    "effect": "glow"
  },
  {
    "word": "탐사",
    "color": "7FDD55",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "경고",
    "color": "FF8800",
    "bold": true,
    "italic": false,
    "underline": false,
    "effect": "blink"
  },
  {
    "word": "시스템",
    "color": "BB88FF",
    "bold": true,
    "italic": false,
    "underline": true,
    "effect": "none"
  },
  {
    "word": "???",
    "color": "999999",
    "bold": false,
    "italic": true,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "ERROR",
    "color": "FF2222",
    "bold": true,
    "italic": false,
    "underline": false,
    "effect": "shake"
  },
  {
    "word": "기밀",
    "color": "AAAAAA",
    "bold": false,
    "italic": false,
    "underline": true,
    "effect": "blur"
  },
  {
    "word": "위험",
    "color": "FF6600",
    "bold": true,
    "italic": false,
    "underline": false,
    "effect": "blink"
  },
  {
    "word": "해제",
    "color": "44FF88",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "연결",
    "color": "5DD8F0",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "효과",
    "color": "구현 방식",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "none",
    "color": "setText + style color / bold / italic",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "glow",
    "color": "PostFX: GlowFX Pipeline (Phaser 3.60+)",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "blink",
    "color": "tweens: alpha 0↔1, repeat:-1, yoyo:true",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "shake",
    "color": "tweens: x ±4px, yoyo:true, repeat:3",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "blur",
    "color": "PostFX: BlurFX Pipeline (Phaser 3.60+)",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "rainbow",
    "color": "tween: setTint 색상 배열 순환",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "wave",
    "color": "custom: 글자별 GameObject, sin(time+i) y offset",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "typewriter",
    "color": "dialogManager 해당 구간 delay 개별 설정",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  },
  {
    "word": "underline",
    "color": "Graphics.lineBetween (text 하단 좌표 계산)",
    "bold": false,
    "italic": false,
    "underline": false,
    "effect": "none"
  }
];

const DIALOGUE_DATA = {
  "Welcome": {
    "lines": [
      {
        "id": "001",
        "char": "A",
        "text": "반갑습니다.",
        "expr": "001"
      },
      {
        "id": "002",
        "char": "A",
        "text": "저는 외각 지부에 이전 관리자 노아라고 합니다.",
        "expr": "001"
      },
      {
        "id": "003",
        "char": "P",
        "text": "외각 지부?",
        "choice": true,
        "goto": "004"
      },
      {
        "id": "004",
        "char": "A",
        "text": "말 그대로 외각 지부입니다, 별 볼 일 없는 곳이죠.",
        "expr": "003"
      },
      {
        "id": "005",
        "char": "A",
        "text": "아무튼, 새롭게 외각 지부 관리자로 부임하신 것을 축하드립니다.",
        "expr": "001"
      },
      {
        "id": "006",
        "char": "B",
        "text": "부임이라니?",
        "choice": true,
        "goto": "007"
      },
      {
        "id": "007",
        "char": "A",
        "text": "이런, 아무것도 기억나지 않으신가보네요.",
        "expr": "003"
      },
      {
        "id": "008",
        "char": "A",
        "text": "음. . . 뭐, 상관 없나.",
        "expr": "002"
      },
      {
        "id": "009",
        "char": "A",
        "text": "천천히 배우면 될 거라 생각합니다.",
        "expr": "001"
      },
      {
        "id": "010",
        "char": "A",
        "text": "그럼 인수인계를 시작하겠습니다.",
        "expr": "003"
      }
    ],
    "lineMap": {
      "001": 0,
      "002": 1,
      "003": 2,
      "004": 3,
      "005": 4,
      "006": 5,
      "007": 6,
      "008": 7,
      "009": 8,
      "010": 9
    }
  }
};
