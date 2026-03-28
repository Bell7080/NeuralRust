// ================================================================
//  scripts/convert_dialogue.js
//  경로: scripts/convert_dialogue.js
//
//  역할: NeuralRust_Dialogue.xlsx → src/Dialogues/DialogueData.ts 자동 변환
//        ES 모듈 + TypeScript named export 형식으로 출력
//
//  실행: node scripts/convert_dialogue.js
//        (또는) npm run convert
//
//  원본 xlsx 위치:
//    Games/Codes/Dialogues/NeuralRust_Dialogue.xlsx
//
//  출력 파일:
//    src/Dialogues/DialogueData.ts  (직접 수정 금지)
//
//  CAST 탭 구조:
//    A: 단축어  B: 캐릭터명  C: 비고  D: 닉네임 (대화창 표시명)
//    → 닉네임이 있으면 대화창 이름판에 닉네임 표시
//    → 없으면 캐릭터명 표시
// ================================================================

const XLSX   = require('xlsx');
const fs     = require('fs');
const path   = require('path');

// ── 경로 설정 ────────────────────────────────────────────────────
// __dirname = scripts/
const XLSX_PATH = path.join(__dirname, '..', 'Games', 'Codes', 'Dialogues', 'NeuralRust_Dialogue.xlsx');
const OUT_PATH  = path.join(__dirname, '..', 'src', 'Dialogues', 'DialogueData.ts');

// ── 상수 ─────────────────────────────────────────────────────────
const HEADER_ROWS   = 4;   // 헤더+주석 행 수 (0-indexed: 행 0~3이 헤더)
const DIALOGUE_MARK = '[DIALOGUE]';
const SKIP_SHEETS   = ['CAST', 'BG', 'BGM', 'SFX', 'FX', 'KEYWORD', '_양식'];

// ── 유틸 ─────────────────────────────────────────────────────────
const clean = v => (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? null : String(v).trim();
const bool  = v => clean(v) !== null && clean(v) !== '';

// ── 워크북 로드 ──────────────────────────────────────────────────
console.log('[convert] 파일 읽기:', XLSX_PATH);
if (!fs.existsSync(XLSX_PATH)) {
  console.error('[convert] 파일 없음:', XLSX_PATH);
  console.error('[convert] 빈 DialogueData.ts 는 그대로 유지합니다.');
  process.exit(0);
}
const wb = XLSX.readFile(XLSX_PATH);

// ── CAST_DATA 파싱 ────────────────────────────────────────────────
function parseCast() {
  const ws   = wb.Sheets['CAST'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const data = {};
  for (let i = HEADER_ROWS; i < rows.length; i++) {
    const [code, name, , nickname] = rows[i];
    const c = clean(code);
    const n = clean(name);
    if (!c || !n) continue;
    data[c] = {
      name:     n,
      nickname: clean(nickname) || null,
    };
  }
  if (!data['P']) data['P'] = { name: 'Player', nickname: null };
  return data;
}

// ── BG_DATA 파싱 ──────────────────────────────────────────────────
function parseBg() {
  const ws = wb.Sheets['BG'];
  if (!ws) return {};
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const data = {};
  for (let i = HEADER_ROWS; i < rows.length; i++) {
    const [tag, file] = rows[i];
    const t = clean(tag);
    const f = clean(file);
    if (!t || !f) continue;
    data[t] = f;
  }
  return data;
}

// ── BGM_DATA 파싱 ─────────────────────────────────────────────────
function parseBgm() {
  const ws   = wb.Sheets['BGM'];
  if (!ws) return {};
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const data = {};
  for (let i = HEADER_ROWS; i < rows.length; i++) {
    const [eventId, file] = rows[i];
    const e = clean(eventId), f = clean(file);
    if (e && f) data[e] = f;
  }
  return data;
}

// ── SFX_DATA 파싱 ─────────────────────────────────────────────────
function parseSfx() {
  const ws   = wb.Sheets['SFX'];
  if (!ws) return {};
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const data = {};
  for (let i = HEADER_ROWS; i < rows.length; i++) {
    const [alias, file] = rows[i];
    const a = clean(alias), f = clean(file);
    if (a && f) data[a] = f;
  }
  return data;
}

// ── DIALOGUE_DATA 파싱 ────────────────────────────────────────────
function parseDialogue(sheetName) {
  const ws   = wb.Sheets[sheetName];
  if (!ws) return null;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let startRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(v => clean(v) === DIALOGUE_MARK)) { startRow = i + 2; break; }
  }
  if (startRow < 0) return null;

  const lines   = [];
  const lineMap = {};

  for (let i = startRow; i < rows.length; i++) {
    const [line_id, char, expr, text, choice, goto_, flag_set, flag_check, sfx, fx, bg] = rows[i];
    const id = clean(line_id);
    if (!id) continue;

    const entry = {
      id,
      char:       clean(char)       || null,
      expr:       clean(expr)       || null,
      text:       clean(text)       || '',
      choice:     bool(choice),
      goto:       clean(goto_)      || null,
      flag_set:   clean(flag_set)   || null,
      flag_check: clean(flag_check) || null,
      sfx:        clean(sfx)        || null,
      fx:         clean(fx)         || null,
      bg:         clean(bg)         || null,
    };

    lineMap[id] = lines.length;
    lines.push(entry);
  }

  // choice 라인 처리: choice:1 인 라인은 직전 일반 라인의 choices[] 에 추가
  const processedLines = [];
  const processedMap   = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.choice) {
      const prevIdx = processedLines.length - 1;
      if (prevIdx >= 0) {
        if (!processedLines[prevIdx].choices) processedLines[prevIdx].choices = [];
        processedLines[prevIdx].choices.push({ label: line.text, goto: line.goto });
        processedLines[prevIdx].isChoice = true;
      }
      i++;
      continue;
    }
    processedMap[line.id] = processedLines.length;
    processedLines.push({ ...line });
    i++;
  }

  // goto → processedMap 인덱스로 재매핑
  processedLines.forEach(line => {
    if (line.goto && line.goto !== 'END' && processedMap[line.goto] !== undefined) {
      line.gotoIdx = processedMap[line.goto];
    }
    if (line.choices) {
      line.choices.forEach(c => {
        if (c.goto && c.goto !== 'END' && processedMap[c.goto] !== undefined) {
          c.gotoIdx = processedMap[c.goto];
        }
      });
    }
  });

  return { lines: processedLines, lineMap: processedMap };
}

// ── 메인 ─────────────────────────────────────────────────────────
const CAST_DATA     = parseCast();
const BG_DATA       = parseBg();
const BGM_DATA      = parseBgm();
const SFX_DATA      = parseSfx();
const DIALOGUE_DATA = {};

for (const name of wb.SheetNames) {
  if (SKIP_SHEETS.includes(name)) continue;
  const result = parseDialogue(name);
  if (result) {
    DIALOGUE_DATA[name] = result;
    console.log(`[convert] 이벤트 파싱: ${name} (${result.lines.length}줄)`);
  }
}

// ── TypeScript ES 모듈 출력 ───────────────────────────────────────
const out = `// ================================================================
//  DialogueData.ts  —  자동 생성 파일 (직접 수정 금지)
//  생성 도구: scripts/convert_dialogue.js
//  원본:      Games/Codes/Dialogues/NeuralRust_Dialogue.xlsx
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
export const CAST_DATA: Record<string, CastEntry> = ${JSON.stringify(CAST_DATA, null, 2)};

// ── BGM_DATA ──────────────────────────────────────────────────────
export const BGM_DATA: Record<string, string> = ${JSON.stringify(BGM_DATA, null, 2)};

// ── BG_DATA ───────────────────────────────────────────────────────
export const BG_DATA: Record<string, string> = ${JSON.stringify(BG_DATA, null, 2)};

// ── SFX_DATA ──────────────────────────────────────────────────────
export const SFX_DATA: Record<string, string> = ${JSON.stringify(SFX_DATA, null, 2)};

// ── DIALOGUE_DATA ─────────────────────────────────────────────────
export const DIALOGUE_DATA: Record<string, DialogueEventData> = ${JSON.stringify(DIALOGUE_DATA, null, 2)};
`;

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, out, 'utf8');
console.log('[convert] 완료 →', OUT_PATH);
