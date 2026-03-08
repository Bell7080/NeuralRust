// ================================================================
//  convert_dialogue.js
//  경로: Games/Codes/Dialogues/Tools/convert_dialogue.js
//       (빌드 타임 전용 — 게임에 포함 안 됨)
//
//  역할: NeuralRust_Dialogue.xlsx → DialogueData.js 변환
//  실행: node Games/Codes/Dialogues/Tools/convert_dialogue.js
//  의존: npm install xlsx  (최초 1회)
//
//  폴더 구조:
//    Dialogues/
//    ├── NeuralRust_Dialogue.xlsx   ← 원본
//    ├── DialogueData.js            ← 여기에 출력됨
//    └── Tools/
//        └── convert_dialogue.js   ← 여기서 실행
// ================================================================

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

// ── 경로 ─────────────────────────────────────────────────────────
// __dirname = .../Dialogues/Tools
// xlsx, 출력 파일 모두 한 단계 위 Dialogues/ 에 위치
const INPUT_PATH  = path.resolve(__dirname, '../NeuralRust_Dialogue.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '../DialogueData.js');

// ── 시스템 시트 — 대화 이벤트가 아닌 것 ─────────────────────────
const SYSTEM_SHEETS = new Set(['CAST', 'BGM', 'SFX', 'FX', 'KEYWORD', '_양식']);

// ── 값 정규화 (001 → '001', null → '') ───────────────────────────
const norm = v => (v === null || v === undefined) ? '' : String(v).trim();

// ── xlsx 로드 ─────────────────────────────────────────────────────
console.log('[convert_dialogue] 읽기:', INPUT_PATH);
const wb = XLSX.readFile(INPUT_PATH, { cellText: true, cellNF: false });

// ================================================================
// CAST 파싱  →  { P: 'Player', B: 'Bea', ... }
// ================================================================
function parseCast(ws) {
  const cast = { P: 'Player' };
  if (!ws) return cast;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => norm(c) === '단축어')) { start = i + 1; break; }
  }
  if (start < 0) return cast;
  for (let i = start; i < rows.length; i++) {
    const a = norm(rows[i][0]), n = norm(rows[i][1]);
    if (a && n && a !== 'P') cast[a] = n;
  }
  return cast;
}

// ================================================================
// BGM 파싱  →  { Day_1_1: 'bgm_calm_morning', ... }
// ================================================================
function parseBgm(ws) {
  const bgm = {};
  if (!ws) return bgm;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => norm(c).includes('이벤트'))) { start = i + 1; break; }
  }
  if (start < 0) return bgm;
  for (let i = start; i < rows.length; i++) {
    const e = norm(rows[i][0]), f = norm(rows[i][1]);
    if (e && f) bgm[e] = f;
  }
  return bgm;
}

// ================================================================
// SFX 파싱  →  { Happy: 'sfx_happy_001', ... }
// ================================================================
function parseSfx(ws) {
  const sfx = {};
  if (!ws) return sfx;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => norm(c).includes('별칭'))) { start = i + 1; break; }
  }
  if (start < 0) return sfx;
  for (let i = start; i < rows.length; i++) {
    const a = norm(rows[i][0]), f = norm(rows[i][1]);
    if (a && f) sfx[a] = f;
  }
  return sfx;
}

// ================================================================
// KEYWORD 파싱  →  [{ word, color, bold, italic, underline, effect }]
// ================================================================
function parseKeyword(ws) {
  const kw = [];
  if (!ws) return kw;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    const cell = norm(rows[i][0]);
    if (cell === '키워드') { start = i + 1; break; }
  }
  if (start < 0) return kw;
  for (let i = start; i < rows.length; i++) {
    const w = norm(rows[i][0]);
    if (!w || w.startsWith('//') || w.startsWith('[')) continue;
    kw.push({
      word:      w,
      color:     norm(rows[i][1]) || 'FFFFFF',
      bold:      norm(rows[i][2]) === 'Y',
      italic:    norm(rows[i][3]) === 'Y',
      underline: norm(rows[i][4]) === 'Y',
      effect:    norm(rows[i][5]) || 'none',
    });
  }
  return kw;
}

// ================================================================
// 대화 이벤트 시트 파싱
// 컬럼: line_id | char | expr | text | choice | goto | flag_set | flag_check | sfx | fx
// ================================================================
function parseDialogueSheet(ws, sheetName) {
  if (!ws) return null;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

  // line_id 헤더 행 찾기
  let headerRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => norm(c) === 'line_id')) { headerRow = i; break; }
  }
  if (headerRow < 0) {
    console.warn(`  ⚠ [${sheetName}] line_id 헤더 없음 — 스킵`);
    return null;
  }

  // 컬럼 인덱스 매핑
  const headers = rows[headerRow].map(norm);
  const idx = {};
  headers.forEach((h, i) => { if (h) idx[h] = i; });

  for (const r of ['line_id', 'char', 'text']) {
    if (idx[r] === undefined) {
      console.warn(`  ⚠ [${sheetName}] '${r}' 컬럼 없음 — 스킵`);
      return null;
    }
  }

  const lines = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row    = rows[i];
    const lineId = norm(row[idx['line_id']]);
    if (!lineId || lineId.startsWith('//')) continue;

    const entry = {
      id:   lineId,
      char: norm(row[idx['char']]) || '',
      text: norm(row[idx['text']]) || '',
    };

    // 선택 필드 — 값 있을 때만 포함 (출력 크기 최소화)
    const expr       = norm(row[idx['expr']]);
    const choice     = norm(row[idx['choice']]);
    const goto_      = norm(row[idx['goto']]);
    const flag_set   = norm(row[idx['flag_set']]);
    const flag_check = norm(row[idx['flag_check']]);
    const sfx        = norm(row[idx['sfx']]);
    const fx         = norm(row[idx['fx']]);

    if (expr)       entry.expr       = expr;
    if (choice === '1') entry.choice = true;
    if (goto_)      entry.goto       = goto_;
    if (flag_set)   entry.flag_set   = flag_set;
    if (flag_check) entry.flag_check = flag_check;
    if (sfx)        entry.sfx        = sfx;
    if (fx)         entry.fx         = fx;

    lines.push(entry);
  }

  // line_id → 인덱스 빠른 조회 맵
  const lineMap = {};
  lines.forEach((l, i) => { lineMap[l.id] = i; });

  return { lines, lineMap };
}

// ================================================================
// 메인 변환
// ================================================================
const castData    = parseCast   (wb.Sheets['CAST']);
const bgmData     = parseBgm    (wb.Sheets['BGM']);
const sfxData     = parseSfx    (wb.Sheets['SFX']);
const keywordData = parseKeyword(wb.Sheets['KEYWORD']);

const dialogues = {};
for (const sheetName of wb.SheetNames) {
  if (SYSTEM_SHEETS.has(sheetName)) continue;
  console.log(`  파싱: ${sheetName}`);
  const result = parseDialogueSheet(wb.Sheets[sheetName], sheetName);
  if (result) dialogues[sheetName] = result;
}

// ================================================================
// DialogueData.js 출력
// ================================================================
const output =
`// ================================================================
//  DialogueData.js  ← 자동 생성 — 직접 수정 금지
//  경로: Games/Codes/Dialogues/DialogueData.js
//
//  원본: NeuralRust_Dialogue.xlsx
//  생성: node Tools/convert_dialogue.js
//  생성일: ${new Date().toLocaleString('ko-KR')}
// ================================================================

const CAST_DATA = ${JSON.stringify(castData, null, 2)};

const BGM_DATA = ${JSON.stringify(bgmData, null, 2)};

const SFX_DATA = ${JSON.stringify(sfxData, null, 2)};

const KEYWORD_DATA = ${JSON.stringify(keywordData, null, 2)};

const DIALOGUE_DATA = ${JSON.stringify(dialogues, null, 2)};
`;

fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
console.log('[convert_dialogue] 완료 →', OUTPUT_PATH);
console.log(`  이벤트: ${Object.keys(dialogues).length}개  캐릭터: ${Object.keys(castData).length}명  SFX: ${Object.keys(sfxData).length}개  키워드: ${keywordData.length}개`);
