// ================================================================
//  convert_dialogue.js
//  경로: Games/Codes/Dialogues/Tools/convert_dialogue.js
//
//  역할: NeuralRust_Dialogue.xlsx → DialogueData.js 자동 변환
//
//  실행: node Games/Codes/Dialogues/Tools/convert_dialogue.js
//
//  생성 파일: Games/Codes/Dialogues/DialogueData.js (직접 수정 금지)
//
//  CAST 탭 구조:
//    A: 단축어  B: 캐릭터명  C: 비고  D: 닉네임 (대화창 표시명)
//    → 닉네임이 있으면 대화창 이름판에 닉네임 표시
//    → 없으면 캐릭터명 표시
//
//  단축어 예시 (엑셀 기준):
//    A  = Noa, 닉네임=노아  (이름 공개 이후)
//    AA = Noa, 닉네임=???  (이름 공개 이전 — 동일 캐릭터의 미공개 버전)
//    단축어는 한 글자 이상 자유롭게 사용 가능 (AA, AB, ... 모두 허용)
//
//  CAST_DATA 구조:
//    { "A":  { name: "Noa", nickname: "노아" },
//      "AA": { name: "Noa", nickname: "???" } }
//    대화창은 nickname이 있으면 nickname, 없으면 name 사용
//
//  닉네임 런타임 변경 (필요 시):
//    SaveManager.setFlag('cast_nick_AA', '노아') 로 런타임 오버라이드 가능
//    → DialogueScene이 자동으로 반영
// ================================================================

const XLSX   = require('xlsx');
const fs     = require('fs');
const path   = require('path');

// ── 경로 설정 ────────────────────────────────────────────────────
// __dirname = Games/Codes/Dialogues/Tools
// xlsx, DialogueData.js 는 한 단계 위 Dialogues/ 에 위치
const XLSX_PATH = path.join(__dirname, '..', 'NeuralRust_Dialogue.xlsx');
const OUT_PATH  = path.join(__dirname, '..', 'DialogueData.js');

// ── 상수 ─────────────────────────────────────────────────────────
const HEADER_ROWS   = 4;   // 헤더+주석 행 수 (0-indexed: 행 0~3이 헤더)
const DIALOGUE_MARK = '[DIALOGUE]';
const SKIP_SHEETS   = ['CAST', 'BGM', 'SFX', 'FX', 'KEYWORD', '_양식'];

// ── 유틸 ─────────────────────────────────────────────────────────
const clean = v => (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? null : String(v).trim();
const bool  = v => clean(v) !== null && clean(v) !== '';

// ── 워크북 로드 ──────────────────────────────────────────────────
console.log('[convert] 파일 읽기:', XLSX_PATH);
if (!fs.existsSync(XLSX_PATH)) {
  console.error('[convert] 파일 없음:', XLSX_PATH);
  process.exit(1);
}
const wb = XLSX.readFile(XLSX_PATH);

// ── CAST_DATA 파싱 ────────────────────────────────────────────────
// 컬럼: A=단축어, B=캐릭터명, C=비고, D=닉네임
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
      nickname: clean(nickname) || null,  // null이면 name 사용
    };
  }
  // Player는 항상 고정
  if (!data['P']) data['P'] = { name: 'Player', nickname: null };
  return data;
}

// ── BGM_DATA 파싱 ─────────────────────────────────────────────────
function parseBgm() {
  const ws   = wb.Sheets['BGM'];
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
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const data = {};
  for (let i = HEADER_ROWS; i < rows.length; i++) {
    const [alias, file] = rows[i];
    const a = clean(alias), f = clean(file);
    if (a && f) data[a] = f;
  }
  return data;
}

// ── KEYWORD_DATA 파싱 ─────────────────────────────────────────────
function parseKeyword() {
  const ws   = wb.Sheets['KEYWORD'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const data = {};
  for (let i = HEADER_ROWS; i < rows.length; i++) {
    const [kw, color, bold, italic, underline, effect] = rows[i];
    const k = clean(kw);
    if (!k) continue;
    // 헤더행·구분행·효과 설명행 스킵
    // color가 HEX 6자리가 아니면 데이터 행이 아님
    const c = clean(color);
    if (!c || !/^[0-9A-Fa-f]{6}$/.test(c)) continue;
    data[k] = {
      color:     c,
      bold:      clean(bold)      === 'Y',
      italic:    clean(italic)    === 'Y',
      underline: clean(underline) === 'Y',
      effect:    clean(effect)    || 'none',
    };
  }
  return data;
}

// ── DIALOGUE_DATA 파싱 ────────────────────────────────────────────
// 컬럼 순서: line_id, char, expr, text, choice, goto, flag_set, flag_check, sfx, fx
function parseDialogue(sheetName) {
  const ws   = wb.Sheets[sheetName];
  if (!ws) return null;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // [DIALOGUE] 마커 행 찾기
  let startRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(v => clean(v) === DIALOGUE_MARK)) { startRow = i + 2; break; }
  }
  if (startRow < 0) return null;

  const lines  = [];
  const lineMap = {};   // line_id → index in lines[]

  for (let i = startRow; i < rows.length; i++) {
    const [line_id, char, expr, text, choice, goto_, flag_set, flag_check, sfx, fx] = rows[i];
    const id = clean(line_id);
    if (!id) continue;

    const entry = {
      id,
      char:       clean(char)        || null,
      expr:       clean(expr)        || null,
      text:       clean(text)        || '',
      choice:     bool(choice),
      goto:       clean(goto_)       || null,
      flag_set:   clean(flag_set)    || null,
      flag_check: clean(flag_check)  || null,
      sfx:        clean(sfx)         || null,
      fx:         clean(fx)          || null,
    };

    lineMap[id] = lines.length;
    lines.push(entry);
  }

  // choice 라인 처리:
  //   choice:1 인 라인은 직전 일반 라인의 choices[] 에 추가
  //   lineMap은 processedLines 인덱스 기준으로 재계산
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
    // processedMap: line_id → processedLines 인덱스
    processedMap[line.id] = processedLines.length;
    processedLines.push({ ...line });
    i++;
  }

  // goto 값도 processedMap 기준으로 재매핑
  // (choice 라인의 goto가 원본 line_id를 가리키므로 processedMap으로 변환)
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
const CAST_DATA    = parseCast();
const BGM_DATA     = parseBgm();
const SFX_DATA     = parseSfx();
const KEYWORD_DATA = parseKeyword();
const DIALOGUE_DATA = {};

for (const name of wb.SheetNames) {
  if (SKIP_SHEETS.includes(name)) continue;
  const result = parseDialogue(name);
  if (result) {
    DIALOGUE_DATA[name] = result;
    console.log(`[convert] 이벤트 파싱: ${name} (${result.lines.length}줄)`);
  }
}

// ── 출력 ─────────────────────────────────────────────────────────
const out = `// ================================================================
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
const CAST_DATA = ${JSON.stringify(CAST_DATA, null, 2)};

// ── BGM_DATA ──────────────────────────────────────────────────────
const BGM_DATA = ${JSON.stringify(BGM_DATA, null, 2)};

// ── SFX_DATA ──────────────────────────────────────────────────────
const SFX_DATA = ${JSON.stringify(SFX_DATA, null, 2)};

// ── KEYWORD_DATA ──────────────────────────────────────────────────
const KEYWORD_DATA = ${JSON.stringify(KEYWORD_DATA, null, 2)};

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
const DIALOGUE_DATA = ${JSON.stringify(DIALOGUE_DATA, null, 2)};
`;

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, out, 'utf8');
console.log('[convert] 완료 →', OUT_PATH);
