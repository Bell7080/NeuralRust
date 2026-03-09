// ================================================================
//  Recruit_Data.js
//  경로: Games/Codes/Scenes/Ateliers/Tabs/Tab_Recruits/Recruit_Data.js
//
//  역할: 영입 탭 전용 상수 + 가챠 유틸 함수
//  의존: CharacterNames.js (CHARACTER_NAMES)
//        PositionData.js   (POSITION_POOL)
//        PassiveData.js    (PASSIVE_POOL)
//        SkillData.js      (SKILL_DATA — 키 참조)
//
//  ── 변경 이력 (v2) ───────────────────────────────────────────
//    1. 어빌리티 3분리  position / passive / skill
//    2. 오버클럭(Overclock) 희귀 특성 — 3% 확률, 공격/체력/민첩/행운 4종
//    3. 스탯 분포 — 완전 균등 랜덤 → 낮은 값 편향 가중 분포
//       극단 특화(한 스탯 몰빵) 허용 — 제한 없음
//    4. 직업 다양성 강제 — 3장 카드에서 같은 직업 3개 방지
//    5. 가격 연동 가중치 — 영입가격이 오를수록 고Cog 확률 점진 상승
//       초반(가격 5~10): Cog1이 ~95%, 고등급 거의 불가
//    6. Cog 1 내부도 낮은 스탯합(7~13)이 더 자주 등장하도록
//       Cog 전 등급 내부 범위 모두 하단 편향 적용
// ================================================================


// ── Cog 10등급 체계 ───────────────────────────────────────────────
//   Cog 1:   7~ 25   Cog 2:  26~ 44   Cog 3:  45~ 63
//   Cog 4:  64~ 82   Cog 5:  83~100   Cog 6: 101~133
//   Cog 7: 134~166   Cog 8: 167~200   Cog 9: 201~250
//   Cog10: 251~300
//
// ── 기준 가중치 (가격=5, RECRUIT_BASE_PRICE일 때) ────────────────
//   Cog 1: ~94.9%  Cog 2: ~3.5%  Cog 3: ~1.0%
//   Cog 4: ~0.30%  Cog 5: ~0.15% Cog 6~8: <0.05%
//   Cog 9·10: 0% (별도 경로 전용)

const RECRUIT_GACHA_BASE = [
  { cog: 1,  baseW: 9490, min:   7, max:  25 },
  { cog: 2,  baseW:  350, min:  26, max:  44 },
  { cog: 3,  baseW:  100, min:  45, max:  63 },
  { cog: 4,  baseW:   30, min:  64, max:  82 },
  { cog: 5,  baseW:   15, min:  83, max: 100 },
  { cog: 6,  baseW:    3, min: 101, max: 133 },
  { cog: 7,  baseW:    2, min: 134, max: 166 },
  { cog: 8,  baseW:    1, min: 167, max: 200 },
  { cog: 9,  baseW:    0, min: 201, max: 250 },  // 별도 경로 전용
  { cog: 10, baseW:    0, min: 251, max: 300 },  // 별도 경로 전용
];

// ── 가격 연동 가중치 보정 계수 ───────────────────────────────────
// · 가격이 RECRUIT_BASE_PRICE를 초과한 스텝 수를 lv로 환산
//   lv = Math.floor((price - RECRUIT_BASE_PRICE) / RECRUIT_PRICE_STEP)
//   예) 가격 5 → lv 0, 가격 10 → lv 1, 가격 30 → lv 5
// · Cog 1~3 은 lv당 multiplier 감소 (하한 clamp: 0.10)
// · Cog 4~8 은 lv당 multiplier 증가
// · Cog 9~10은 0 고정 (별도 경로)
const RECRUIT_COG_SCALE = {
  1:  { type: 'down', rate: 0.05 },   // lv당 -5%,  하한 10%
  2:  { type: 'down', rate: 0.03 },   // lv당 -3%,  하한 10%
  3:  { type: 'down', rate: 0.01 },   // lv당 -1%,  하한 10%
  4:  { type: 'up',   rate: 0.20 },   // lv당 +20%
  5:  { type: 'up',   rate: 0.35 },   // lv당 +35%
  6:  { type: 'up',   rate: 0.55 },   // lv당 +55%
  7:  { type: 'up',   rate: 0.75 },   // lv당 +75%
  8:  { type: 'up',   rate: 1.00 },   // lv당 +100%
  9:  { type: 'fixed', val: 0 },
  10: { type: 'fixed', val: 0 },
};

// ── 스탯 최솟값 ──────────────────────────────────────────────────
// 합계 최솟값 = 1+0+1+5+0 = 7
const RECRUIT_STAT_MINS   = [1, 0, 1, 5, 0];
const RECRUIT_STAT_LABELS = ['체력', '건강', '공격', '민첩', '행운'];
const RECRUIT_STAT_KEYS   = ['hp', 'health', 'attack', 'agility', 'luck'];

// ── Cog 등급 색상 ─────────────────────────────────────────────────
const RECRUIT_COG_COLORS = {
  1:  '#7dff4f',
  2:  '#aaee22',
  3:  '#ccdd00',
  4:  '#ffdd00',
  5:  '#ffaa00',
  6:  '#ff7700',
  7:  '#ff4400',
  8:  '#dd0000',
  9:  '#ff2255',
  10: '#cc44ff',
};

// ── 스킬 풀 (SkillData.js 키 기준) ───────────────────────────────
// position / passive 풀은 PositionData.js / PassiveData.js에 정의됨
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

// ── 오버클럭 정의 ─────────────────────────────────────────────────
// · 발생 확률 5% (OVERCLOCK_CHANCE)
// · 특정 스탯을 +50% 보정 (Math.floor 적용)
// · CharacterManager.addCharacter 저장 시 overclock 필드로 전달
// · UI 표시: overclock.label / overclock.color 참조
const OVERCLOCK_CHANCE = 0.05;   // 5%

const OVERCLOCK_POOL = [
  {
    id:      'oc_attack',
    name:    '분노 회로',
    label:   '⚡ 오버클럭 : 공격',
    description: '공격 스탯이 50% 증가합니다.',
    statKey: 'attack',
    statIdx: 2,          // RECRUIT_STAT_KEYS 인덱스
    bonus:   0.50,
    color:   '#ff4400',
  },
  {
    id:      'oc_hp',
    name:    '강화 외피',
    label:   '⚡ 오버클럭 : 체력',
    description: '체력 스탯이 50% 증가합니다.',
    statKey: 'hp',
    statIdx: 0,
    bonus:   0.50,
    color:   '#44dd44',
  },
  {
    id:      'oc_health',
    name:    '자가 수복',
    label:   '⚡ 오버클럭 : 건강',
    description: '건강 스탯이 50% 증가합니다.',
    statKey: 'health',
    statIdx: 1,
    bonus:   0.50,
    color:   '#aaffaa',
  },
  {
    id:      'oc_agility',
    name:    '가속 구동계',
    label:   '⚡ 오버클럭 : 민첩',
    description: '민첩 스탯이 50% 증가합니다.',
    statKey: 'agility',
    statIdx: 3,
    bonus:   0.50,
    color:   '#44ccff',
  },
  {
    id:      'oc_luck',
    name:    '행운 코어',
    label:   '⚡ 오버클럭 : 행운',
    description: '행운 스탯이 50% 증가합니다.',
    statKey: 'luck',
    statIdx: 4,
    bonus:   0.50,
    color:   '#ffdd00',
  },
];

// ── 이름 풀 ──────────────────────────────────────────────────────
const _RECRUIT_NAME_POOL = (typeof CHARACTER_NAMES !== 'undefined' && CHARACTER_NAMES.length > 0)
  ? CHARACTER_NAMES
  : ['볼트','기어','러스트','뎁스','아크','스팀','드릴','앵커','크롬','스크랩'];

const RECRUIT_NAMES = { fisher: _RECRUIT_NAME_POOL, diver: _RECRUIT_NAME_POOL };

const RECRUIT_JOB_LABEL = { fisher: '낚시꾼', diver: '잠수부' };
// ※ 'ai'는 가챠 획득 불가 — 시설 등 별도 경로로만 획득
const RECRUIT_JOBS = ['fisher', 'diver'];

// ── 기타 상수 ────────────────────────────────────────────────────
const RECRUIT_BASE_PRICE   = 5;
const RECRUIT_PRICE_STEP   = 5;
const RECRUIT_MAX_REROLL   = 3;
const RECRUIT_SLOT_TICK    = 55;
const RECRUIT_SLOT_COUNT   = 30;
const RECRUIT_SPRITE_COUNT = 72;


// ════════════════════════════════════════════════════════════════
//  가챠 유틸 함수
// ════════════════════════════════════════════════════════════════

// ── 가격 → 가중치 테이블 빌드 ────────────────────────────────────
// 매 가챠 호출 시 현재 가격을 넘겨서 동적으로 테이블 생성
function _buildGachaTable(currentPrice) {
  const lv = Math.max(0, Math.floor(
    (currentPrice - RECRUIT_BASE_PRICE) / RECRUIT_PRICE_STEP
  ));

  return RECRUIT_GACHA_BASE.map(entry => {
    const sc = RECRUIT_COG_SCALE[entry.cog];
    let w = entry.baseW;

    if (sc.type === 'fixed') {
      w = sc.val;
    } else if (sc.type === 'down') {
      const mult = Math.max(0.10, 1 - sc.rate * lv);
      w = Math.round(w * mult);
    } else {
      // 'up'
      const mult = 1 + sc.rate * lv;
      w = Math.round(w * mult);
    }
    return { cog: entry.cog, weight: w, min: entry.min, max: entry.max };
  });
}

// ── 가중 랜덤 픽 ─────────────────────────────────────────────────
function _rWPick(table) {
  const active = table.filter(e => e.weight > 0);
  const total  = active.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of active) { r -= e.weight; if (r <= 0) return e; }
  return active[active.length - 1];
}

// ── 스탯합 내부 하단 편향 랜덤 (제곱근 편향) ─────────────────────
// 범위 [min, max] 안에서 낮은 값이 더 자주 나오도록
// Math.random()^2 를 사용하면 0에 치우친 분포 → min 쪽 편향
function _rBiasedInRange(min, max) {
  const r = Math.random();
  // r^1.8: 낮은 쪽 편향 (1이면 균등, 2면 강한 편향)
  const biased = Math.pow(r, 1.8);
  return min + Math.floor(biased * (max - min + 1));
}

// ── 스탯 분포 — 가중 랜덤 (낮은 스탯 편향 + 극단 특화 허용) ──────
// 방법: 스탯 인덱스를 고를 때 지수분포 느낌으로 하나에 편중되게
//       → 전체 rem 포인트 중 70%를 1~2개 스탯에 집중 할당하는 방식이 아닌
//         순수 랜덤이지만 "제한 없음"을 보장 (모든 포인트가 한 스탯으로 가도 OK)
// 실제 구현: 5개 스탯 중 하나를 랜덤하게 골라 포인트 추가.
// 극단 특화 자연 발생 확률은 낮지만 제한을 두지 않아 가능.
// 낮은 스탯합 편향은 _rBiasedInRange가 담당.
function _rDist(total) {
  const s      = [...RECRUIT_STAT_MINS];
  const minSum = s.reduce((a, b) => a + b, 0);
  let   rem    = Math.max(0, total - minSum);

  // 완전 랜덤 배분 (제한 없음 — 모두 한 스탯에 몰릴 수 있음)
  for (let i = 0; i < rem; i++) {
    s[Math.floor(Math.random() * 5)]++;
  }
  return s;
}

// ── 유틸 ─────────────────────────────────────────────────────────
function _rFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _rSpriteKey() {
  return `char_${String(Math.floor(Math.random() * RECRUIT_SPRITE_COUNT)).padStart(3, '0')}`;
}

// ── 오버클럭 롤 ──────────────────────────────────────────────────
function _rOverclock() {
  if (Math.random() >= OVERCLOCK_CHANCE) return null;
  return OVERCLOCK_POOL[Math.floor(Math.random() * OVERCLOCK_POOL.length)];
}

// ── 오버클럭 적용: stats 배열에 보정 반영 ───────────────────────
// stats: _rDist() 결과 배열 [hp, health, attack, agility, luck]
// overclock: OVERCLOCK_POOL 항목 or null
// 반환: 보정된 stats 배열 (원본 변경 없음)
function _applyOverclock(stats, overclock) {
  if (!overclock) return stats;
  const result   = [...stats];
  const idx      = overclock.statIdx;
  result[idx]    = Math.floor(result[idx] * (1 + overclock.bonus));
  return result;
}

// ── 직업 다양성 강제 ─────────────────────────────────────────────
// 3장 카드에서 같은 직업 3개가 나오지 않도록 보장
// [jobA, jobA, jobA] → [jobA, jobA, jobB] 로 교체
function _ensureJobDiversity(rolls) {
  const jobs = rolls.map(r => r.job);
  // 모두 같은 직업인지 확인
  if (jobs.every(j => j === jobs[0])) {
    // 마지막 카드의 직업을 다른 직업으로 교체
    const altJobs = RECRUIT_JOBS.filter(j => j !== jobs[0]);
    rolls[2].job = _rFrom(altJobs);
    rolls[2].name = _rFrom(RECRUIT_NAMES[rolls[2].job]);
  }
  return rolls;
}

// ── 가챠 1회 결과 생성 ───────────────────────────────────────────
// currentPrice: 현재 영입 비용 (가중치 보정에 사용)
function _rRoll(currentPrice) {
  const price     = currentPrice ?? RECRUIT_BASE_PRICE;
  const table     = _buildGachaTable(price);
  const entry     = _rWPick(table);

  // 스탯합: Cog 등급 내에서 낮은 값 편향
  const statSum   = _rBiasedInRange(entry.min, entry.max);
  const cog       = entry.cog;
  const job       = _rFrom(RECRUIT_JOBS);

  // 스탯 분배
  const baseStats = _rDist(statSum);

  // 오버클럭 판정
  const overclock  = _rOverclock();
  const finalStats = _applyOverclock(baseStats, overclock);

  // 최종 스탯합 재계산 (오버클럭 보정 반영)
  const finalSum = finalStats.reduce((a, b) => a + b, 0);

  // 포지션 — PositionData.js의 POSITION_POOL 참조
  const posPool = (typeof POSITION_POOL !== 'undefined')
    ? (POSITION_POOL[cog] || POSITION_POOL[1])
    : ['앞칸 타격'];

  // 패시브 — PassiveData.js의 PASSIVE_POOL 참조
  const pasPool = (typeof PASSIVE_POOL !== 'undefined')
    ? (PASSIVE_POOL[cog] || PASSIVE_POOL[1])
    : ['강인한 체질'];

  // 스킬
  const sklPool = RECRUIT_SKILL_POOL[cog] || RECRUIT_SKILL_POOL[1];

  return {
    job,
    statSum:   finalSum,
    baseSum:   statSum,   // 오버클럭 전 원본 스탯합 (UI 표시용)
    cog,
    stats:     finalStats,
    name:      _rFrom(RECRUIT_NAMES[job]),
    spriteKey: _rSpriteKey(),
    position:  _rFrom(posPool),
    passive:   _rFrom(pasPool),
    skill:     _rFrom(sklPool),
    overclock: overclock,   // null이면 오버클럭 없음
  };
}

// ── 3장 동시 뽑기 (직업 다양성 보장 포함) ───────────────────────
function _rRollTriple(currentPrice) {
  const rolls = [
    _rRoll(currentPrice),
    _rRoll(currentPrice),
    _rRoll(currentPrice),
  ];
  return _ensureJobDiversity(rolls);
}
