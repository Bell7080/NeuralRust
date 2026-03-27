// ================================================================
//  DialogueData.ts  —  자동 생성 파일 (직접 수정 금지)
//  생성 도구: Games/Codes/Dialogues/Tools/convert_dialogue.js
//  원본:      NeuralRust_Dialogue.xlsx
//  변환:      전역 const → ES 모듈 named export + TypeScript 타입
// ================================================================

// ── 타입 정의 ─────────────────────────────────────────────────────

export interface CastEntry {
  name:     string;
  nickname: string | null;
}

export interface ChoiceEntry {
  label:    string;
  goto?:    string;
  gotoIdx?: number;
}

export interface DialogueLine {
  id:         string;
  char:       string;
  expr:       string | null;
  text:       string;
  choice:     boolean;
  goto:       string | null;
  flag_set:   string | null;
  flag_check: string | null;
  sfx:        string | null;
  fx:         string | null;
  bg:         string | null;
  isChoice?:  boolean;
  choices?:   ChoiceEntry[];
}

export interface DialogueEventData {
  lines:   DialogueLine[];
  lineMap: Record<string, number>;
}

// ── CAST_DATA ─────────────────────────────────────────────────────
export const CAST_DATA: Record<string, CastEntry> = {
  "P":  { "name": "Player", "nickname": null },
  "A":  { "name": "Noa",    "nickname": "노아" },
  "AA": { "name": "Noa",    "nickname": "???" },
};

// ── BGM_DATA ──────────────────────────────────────────────────────
export const BGM_DATA: Record<string, string> = {
  "Day_1_1":  "bgm_calm_morning",
  "Shop_Open": "bgm_shop_theme",
  "Shop_In":  "bgm_shop_theme",
};

// ── BG_DATA ───────────────────────────────────────────────────────
export const BG_DATA: Record<string, string> = {
  "A": "Background_007",
};

// ── SFX_DATA ──────────────────────────────────────────────────────
export const SFX_DATA: Record<string, string> = {
  "Happy":   "sfx_happy_001",
  "Sad":     "sfx_sad_001",
  "Shock":   "sfx_shock_001",
  "Door":    "sfx_door_open",
  "Beep":    "sfx_beep_alert",
  "Typing":  "sfx_typing_loop",
  "Confirm": "sfx_confirm",
  "Cancel":  "sfx_cancel",
};

// ── DIALOGUE_DATA ─────────────────────────────────────────────────
export const DIALOGUE_DATA: Record<string, DialogueEventData> = {
  "Welcome": {
    "lines": [
      { "id":"001", "char":"AA", "expr":"001", "text":"반갑습니다.",                                          "choice":false, "goto":null, "flag_set":null, "flag_check":null, "sfx":null, "fx":null, "bg":"A" },
      { "id":"002", "char":"A",  "expr":"001", "text":"저는 외곽 지부에 이전 관리자 노아(Noa)라고 합니다.", "choice":false, "goto":null, "flag_set":null, "flag_check":null, "sfx":null, "fx":null, "bg":null,
        "choices":[{ "label":"외곽 지부?", "goto":"004", "gotoIdx":2 }], "isChoice":true },
      { "id":"004", "char":"A",  "expr":"003", "text":"말 그대로 외각 지부입니다, 별 볼 일 없는 곳이죠.",  "choice":false, "goto":null, "flag_set":null, "flag_check":null, "sfx":null, "fx":null, "bg":null },
      { "id":"005", "char":"A",  "expr":"001", "text":"아무튼, 새롭게 외각 지부 관리자로 부임하신 것을 축하드립니다.", "choice":false, "goto":null, "flag_set":null, "flag_check":null, "sfx":null, "fx":null, "bg":null,
        "choices":[{ "label":"부임이라니?", "goto":"007", "gotoIdx":4 }], "isChoice":true },
      { "id":"007", "char":"A",  "expr":"003", "text":"이런, 아무것도 기억나지 않으신가보네요.",            "choice":false, "goto":null, "flag_set":null, "flag_check":null, "sfx":null, "fx":null, "bg":null },
      { "id":"008", "char":"A",  "expr":"002", "text":"음. . . 뭐, 상관 없나.",                            "choice":false, "goto":null, "flag_set":null, "flag_check":null, "sfx":null, "fx":null, "bg":null },
      { "id":"009", "char":"A",  "expr":"001", "text":"천천히 배우면 될 거라 생각합니다.",                  "choice":false, "goto":null, "flag_set":null, "flag_check":null, "sfx":null, "fx":null, "bg":null },
      { "id":"010", "char":"A",  "expr":"003", "text":"그럼 인수인계를 시작하겠습니다.",                    "choice":false, "goto":null, "flag_set":null, "flag_check":null, "sfx":null, "fx":null, "bg":null },
    ],
    "lineMap": { "001":0, "002":1, "004":2, "005":3, "007":4, "008":5, "009":6, "010":7 },
  },
};
