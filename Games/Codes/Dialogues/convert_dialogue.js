// ================================================================
//  convert_dialogue.js
//  경로: Tools/convert_dialogue.js  (빌드 타임 전용 — 게임에 포함 안 됨)
//
//  역할: NeuralRust_Dialogue.xlsx → DialogueData.js 변환
//  실행: node convert_dialogue.js
//  의존: xlsx 패키지  →  npm install xlsx
//
//  처리 시트:
//    CAST    — 캐릭터 단축어 매핑
//    BGM     — 이벤트별 BGM 매핑
//    SFX     — 별칭 → 파일명 매핑
//    KEYWORD — 텍스트 강조 키워드
//    그 외   — 대화 이벤트 시트 (line_id 컬럼 있는 시트 전부)
//
//  출력: Games/Codes/Data/DialogueData.js
// ================================================================

const XLSX   = require('xlsx');
const fs     = require('fs');
const path   = require('path');

// ── 경로 설정 ────────────────────────────────────────────────────
const INPUT_PATH  = path.resolve(__dirname, 'NeuralRust_Dialogue.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '../Games/Codes/Data/DialogueData.js');

// ── 시스템 시트 (대화 이벤트 아닌 것) ───────────────────────────
const SYSTEM_SHEETS = new Set(['CAST', 'BGM', 'SFX', 'FX', 'KEYWORD', '_양식']);

// ── 숫자→텍스트 정규화 (001 → '001') ────────────────────────────
const norm = (v) => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
};

// ── xlsx 로드 ────────────────────────────────────────────────────
const wb = XLSX.readFile(INPUT_PATH, { cellText: true, cellNF: false });

// ================================================================
// CAST 파싱  →  { 'B': 'Bea', 'C': 'Cain', ... }
// ================================================================
function parseCast(ws) {
  const cast = { P: 'Player' };
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

  // 헤더 행 찾기 — '단축어' 포함된 행
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => String(c || '').includes('단축어'))) {
      dataStart = i + 1; break;
    }
  }
  if (dataStart < 0) return cast;

  for (let i = dataStart; i < rows.length; i++) {
    const [alias, name] = rows[i];
    const a = norm(alias), n = norm(name);
    if (a && n && a !== 'P') cast[a] = n;
  }
  return cast;
}

// ================================================================
// BGM 파싱  →  { 'Day_1_1': 'bgm_calm_morning', ... }
// ================================================================
function parseBgm(ws) {
  const bgm = {};
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => String(c || '').includes('이벤트'))) {
      dataStart = i + 1; break;
    }
  }
  if (dataStart < 0) return bgm;
  for (let i = dataStart; i < rows.length; i++) {
    const [eventId, file] = rows[i];
    const e = norm(eventId), f = norm(file);
    if (e && f) bgm[e] = f;
  }
  return bgm;
}

// ================================================================
// SFX 파싱  →  { 'Happy': 'sfx_happy_001', ... }
// ================================================================
function parseSfx(ws) {
  const sfx = {};
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => String(c || '').includes('별칭'))) {
      dataStart = i + 1; break;
    }
  }
  if (dataStart < 0) return sfx;
  for (let i = dataStart; i < rows.length; i++) {
    const [alias, file] = rows[i];
    const a = norm(alias), f = norm(file);
    if (a && f) sfx[a] = f;
  }
  return sfx;
}

// ================================================================
// KEYWORD 파싱  →  [{ word, color, bold, italic, underline, effect }]
// ================================================================
function parseKeyword(ws) {
  const keywords = [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => String(c || '').includes('키워드') && String(c || '').length < 6)) {
      dataStart = i + 1; break;
    }
  }
  if (dataStart < 0) return keywords;
  for (let i = dataStart; i < rows.length; i++) {
    const [word, color, bold, italic, underline, effect] = rows[i];
    const w = norm(word);
    if (!w || w.startsWith('//') || w.startsWith('[')) continue;
    keywords.push({
      word:      w,
      color:     norm(color)     || 'FFFFFF',
      bold:      norm(bold)      === 'Y',
      italic:    norm(italic)    === 'Y',
      underline: norm(underline) === 'Y',
      effect:    norm(effect)    || 'none',
    });
  }
  return keywords;
}

// ================================================================
// 대화 이벤트 시트 파싱
// 컬럼: line_id | char | expr | text | choice | goto | flag_set | flag_check | sfx | fx
// ================================================================
function parseDialogueSheet(ws, sheetName) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

  // 헤더 행 찾기 — 'line_id' 포함된 행
  let headerRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => norm(c) === 'line_id')) {
      headerRow = i; break;
    }
  }
  if (headerRow < 0) {
    console.warn(`  ⚠ [${sheetName}] line_id 헤더 없음 — 스킵`);
    return null;
  }

  // 컬럼 인덱스 매핑
  const headers = rows[headerRow].map(norm);
  const idx = {};
  headers.forEach((h, i) => { if (h) idx[h] = i; });

  const required = ['line_id', 'char', 'text'];
  for (const r of required) {
    if (idx[r] === undefined) {
      console.warn(`  ⚠ [${sheetName}] '${r}' 컬럼 없음 — 스킵`);
      return null;
    }
  }

  const lines = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    const lineId = norm(row[idx['line_id']]);
    if (!lineId || lineId.startsWith('//')) continue;    // 빈 행 / 주석 행 스킵

    const entry = {
      id:         lineId,
      char:       norm(row[idx['char']])        || '',
      expr:       norm(row[idx['expr']])        || '',   // 공백 = 이전 표정 유지
      text:       norm(row[idx['text']])        || '',
      choice:     norm(row[idx['choice']])      === '1',
      goto:       norm(row[idx['goto']])        || '',   // '' = 다음 줄, 'END' = 종료, 시트명 = 점프
      flag_set:   norm(row[idx['flag_set']])    || '',
      flag_check: norm(row[idx['flag_check']]) || '',
      sfx:        norm(row[idx['sfx']])         || '',
      fx:         norm(row[idx['fx']])          || '',
    };

    // 빈 필드 정리 (출력 크기 최소화)
    for (const key of ['expr', 'goto', 'flag_set', 'flag_check', 'sfx', 'fx']) {
      if (!entry[key]) delete entry[key];
    }
    if (!entry.choice) delete entry.choice;

    lines.push(entry);
  }

  // line_id → index 빠른 조회용 맵
  const lineMap = {};
  lines.forEach((l, i) => { lineMap[l.id] = i; });

  return { lines, lineMap };
}

// ================================================================
// 메인 변환
// ================================================================
console.log('[convert_dialogue] 변환 시작:', INPUT_PATH);

const cast    = CAST_WS    in wb.Sheets ? parseCast   (wb.Sheets['CAST'])    : {};
const bgm     = BGM_WS     in wb.Sheets ? parseBgm    (wb.Sheets['BGM'])     : {};
const sfx     = SFX_WS     in wb.Sheets ? parseSfx    (wb.Sheets['SFX'])     : {};
const keyword = KEYWORD_WS in wb.Sheets ? parseKeyword(wb.Sheets['KEYWORD']) : [];

// 위 줄 오류 방지용 재선언
const castData    = parseCast   (wb.Sheets['CAST']    || {});
const bgmData     = parseBgm    (wb.Sheets['BGM']     || {});
const sfxData     = parseSfx    (wb.Sheets['SFX']     || {});
const keywordData = parseKeyword(wb.Sheets['KEYWORD'] || {});

const dialogues = {};
for (const sheetName of wb.SheetNames) {
  if (SYSTEM_SHEETS.has(sheetName)) continue;
  console.log(`  파싱: ${sheetName}`);
  const result = parseDialogueSheet(wb.Sheets[sheetName], sheetName);
  if (result) dialogues[sheetName] = result;
}

// ================================================================
// 출력 파일 생성
// ================================================================
const output = `// ================================================================
//  DialogueData.js  ← 자동 생성 — 직접 수정 금지
//  경로: Games/Codes/Data/DialogueData.js
//
//  원본: NeuralRust_Dialogue.xlsx
//  생성: node Tools/convert_dialogue.js
//  생성일: ${new Date().toLocaleString('ko-KR')}
// ================================================================

// ── 캐릭터 단축어 → 표시명 ──────────────────────────────────────
const CAST_DATA = ${JSON.stringify(castData, null, 2)};

// ── 이벤트 ID → BGM 파일명 ──────────────────────────────────────
const BGM_DATA = ${JSON.stringify(bgmData, null, 2)};

// ── SFX 별칭 → 파일명 ───────────────────────────────────────────
const SFX_DATA = ${JSON.stringify(sfxData, null, 2)};

// ── 텍스트 강조 키워드 ───────────────────────────────────────────
const KEYWORD_DATA = ${JSON.stringify(keywordData, null, 2)};

// ── 대화 이벤트 데이터 ───────────────────────────────────────────
//  구조: { [eventId]: { lines: DialogueLine[], lineMap: { [id]: index } } }
const DIALOGUE_DATA = ${JSON.stringify(dialogues, null, 2)};
`;

// 출력 디렉토리 없으면 생성
const outDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
console.log('[convert_dialogue] 완료:', OUTPUT_PATH);
console.log(`  이벤트 시트: ${Object.keys(dialogues).length}개`);
console.log(`  캐릭터: ${Object.keys(castData).length}명`);
console.log(`  SFX: ${Object.keys(sfxData).length}개`);
console.log(`  키워드: ${keywordData.length}개`);
