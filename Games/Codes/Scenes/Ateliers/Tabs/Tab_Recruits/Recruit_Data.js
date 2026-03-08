// ================================================================
//  Recruit_Data.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Data.js
//
//  역할: 영입 탭 전용 상수 + 가챠 유틸 함수
//  의존: CharacterNames.js (CHARACTER_NAMES)
// ================================================================

// ── 상수 ──────────────────────────────────────────────────────────

// RECRUIT_STAT_MINS 합계 = 1+0+1+5+0 = 7 이므로 최솟값을 7로 보장
// ── Cog 10등급 체계 (CharacterManager.calcCog 기준과 동일) ──────
//   Cog 1:   7~ 25   Cog 2:  26~ 44   Cog 3:  45~ 63
//   Cog 4:  64~ 82   Cog 5:  83~100   Cog 6: 101~133
//   Cog 7: 134~166   Cog 8: 167~200   Cog 9: 201~250
//   Cog10: 251~300
//
// ── 기획 의도 ───────────────────────────────────────────────────
//   초반: 1~2등급 압도적으로 많이 배출 (저스펙 캐릭터 위주)
//   시설 강화 시: 1~5 weight 감소 / 6~8 weight 증가 → 점진적 균등화
//   9·10등급 (스페셜): weight=0 — 가챠로 획득 불가, 별도 경로 예정
//
// ── 초기 가중치 (총 1356) ───────────────────────────────────────
//   Cog 1: 55.3%  Cog 2: 22.1%  Cog 3: 11.1%
//   Cog 4:  7.4%  Cog 5:  3.7%
//   Cog 6:  0.22% Cog 7:  0.15% Cog 8:  0.07%
//   Cog 9·10: 0% (비활성)
const RECRUIT_GACHA_TABLE = [
  { cog: 1,  weight: 750, min:   7, max:  25 },
  { cog: 2,  weight: 300, min:  26, max:  44 },
  { cog: 3,  weight: 150, min:  45, max:  63 },
  { cog: 4,  weight: 100, min:  64, max:  82 },
  { cog: 5,  weight:  50, min:  83, max: 100 },
  { cog: 6,  weight:   3, min: 101, max: 133 },
  { cog: 7,  weight:   2, min: 134, max: 166 },
  { cog: 8,  weight:   1, min: 167, max: 200 },
  // ── 스페셜 등급 — 시설 해금 전까지 weight: 0 유지 ──────────
  { cog: 9,  weight:   0, min: 201, max: 250 },
  { cog: 10, weight:   0, min: 251, max: 300 },
];

const RECRUIT_STAT_MINS   = [1, 0, 1, 5, 0];
const RECRUIT_STAT_LABELS = ['체력', '건강', '공격', '민첩', '행운'];
const RECRUIT_STAT_KEYS   = ['hp', 'health', 'attack', 'agility', 'luck'];

// Cog 등급 색상 — CharacterManager.COG_COLORS와 동기화
// (Cog 9·10은 special, UI에서 getCogColor() 사용 권장)
const RECRUIT_COG_COLORS = {
  1:  '#7dff4f',  // 연두
  2:  '#aaee22',  // 황록
  3:  '#ccdd00',  // 라임
  4:  '#ffdd00',  // 노랑
  5:  '#ffaa00',  // 황금
  6:  '#ff7700',  // 주황
  7:  '#ff4400',  // 주홍
  8:  '#dd0000',  // 진빨강
  9:  '#ff2255',  // 핑크빛 빨강 (검은 테두리)
  10: '#ffffff',  // 흰 텍스트 / 검은 배경 (special)
};

const RECRUIT_PASSIVE_POOL = {
  1:  ['윗칸 타격', '앞칸 타격'],
  2:  ['앞칸 타격', '현재 칸 타격'],
  3:  ['현재 칸 타격', '대각 타격'],
  4:  ['대각 타격', '윗칸 타격'],
  5:  ['전열 전체 타격', '후열 타격'],
  6:  ['전열 전체 타격', '현재 칸 타격'],
  7:  ['전/후열 동시 타격', '후열 타격'],
  8:  ['전/후열 동시 타격', '전열 전체 타격'],
  9:  ['전체 칸 타격', '전/후열 동시 타격'],
  10: ['전체 칸 타격'],
};
const RECRUIT_SKILL_POOL = {
  1:  ['기본 일격', '빠른 찌르기'],
  2:  ['연속 타격', '방어 자세'],
  3:  ['강타', '회피 기동'],
  4:  ['독 도포', '광역 타격'],
  5:  ['강화 독', '순간 가속'],
  6:  ['폭발 타격', '전방 스캔'],
  7:  ['철갑 관통', '심해 압박'],
  8:  ['전기 충격', '철벽 방어'],
  9:  ['코어 오버로드', '심연의 포효'],
  10: ['코어 오버로드', '심연의 포효'],
};

// 이름 풀 — CharacterNames.js 우선, 없으면 폴백
const _RECRUIT_NAME_POOL = (typeof CHARACTER_NAMES !== 'undefined' && CHARACTER_NAMES.length > 0)
  ? CHARACTER_NAMES
  : ['볼트','기어','러스트','뎁스','아크','스팀','드릴','앵커','크롬','스크랩'];

const RECRUIT_NAMES    = { fisher: _RECRUIT_NAME_POOL, diver: _RECRUIT_NAME_POOL };

const RECRUIT_JOB_LABEL = { fisher: '낚시꾼', diver: '잠수부' };
// ※ 'ai'는 가챠 획득 불가 — 시설 등 별도 경로로만 획득
const RECRUIT_JOBS      = ['fisher', 'diver'];

const RECRUIT_BASE_PRICE   = 5;
const RECRUIT_PRICE_STEP   = 5;
const RECRUIT_MAX_REROLL   = 3;
const RECRUIT_SLOT_TICK    = 55;
const RECRUIT_SLOT_COUNT   = 30;
const RECRUIT_SPRITE_COUNT = 72;

// ── 가챠 유틸 ─────────────────────────────────────────────────────

function _rWPick(table) {
  const active = table.filter(e => e.weight > 0);   // weight 0 항목 제외
  const total  = active.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of active) { r -= e.weight; if (r <= 0) return e; }
  return active[active.length - 1];
}

// CharacterManager.calcCog()와 동일 기준 — 10등급 체계
function _rCog(sum) {
  if (sum <=  25) return 1;
  if (sum <=  44) return 2;
  if (sum <=  63) return 3;
  if (sum <=  82) return 4;
  if (sum <= 100) return 5;
  if (sum <= 133) return 6;
  if (sum <= 166) return 7;
  if (sum <= 200) return 8;
  if (sum <= 250) return 9;
  return 10;
}

function _rDist(total) {
  const s = [...RECRUIT_STAT_MINS];
  const minSum = s.reduce((a, b) => a + b, 0);
  // total이 최솟값 합산보다 작으면 최솟값 그대로 반환
  let rem = total - minSum;
  if (rem < 0) rem = 0;
  for (let i = 0; i < rem; i++) s[Math.floor(Math.random() * 5)]++;
  return s;
}

function _rFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _rSpriteKey() {
  return `char_${String(Math.floor(Math.random() * RECRUIT_SPRITE_COUNT)).padStart(3, '0')}`;
}

// 가챠 1회 결과 생성
function _rRoll() {
  const entry   = _rWPick(RECRUIT_GACHA_TABLE);
  const statSum = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
  const cog     = entry.cog;   // 테이블에 cog가 명시되어 있으므로 재계산 불필요
  const job     = _rFrom(RECRUIT_JOBS);
  return {
    job, statSum, cog,
    stats:     _rDist(statSum),
    name:      _rFrom(RECRUIT_NAMES[job]),
    spriteKey: _rSpriteKey(),
    passive:   _rFrom(RECRUIT_PASSIVE_POOL[cog] || RECRUIT_PASSIVE_POOL[1]),
    skill:     _rFrom(RECRUIT_SKILL_POOL[cog]   || RECRUIT_SKILL_POOL[1]),
  };
}
