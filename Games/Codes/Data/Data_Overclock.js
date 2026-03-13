// ================================================================
//  Data_Overclock.js
//  경로: Games/Codes/Data/Data_Overclock.js
//
//  역할: 오버클럭 정의 테이블
//        발생 확률 / 스탯별 보정 정보 / UI 표시용 색상·이름
//
//  수정할 때:
//    · bonus    — 보정 배율 (0.50 = +50%)
//    · color    — UI 강조 색상
//    · name     — 인게임 표시 이름
//    · description — 툴팁 설명
//
//  참조처:
//    Recruit_Data.js  → _rollOverclock()
//    Recruit_Custom.js → result.overclock
//    Tab_CharProfile.js, CharacterManager → overclock 필드
//
//  ✏️ PATCH — 오버클럭 color를 CharacterManager.STAT_COLORS 기준으로 통일
//    스탯 색보다 한 단계 밝게 처리 (오버클럭 강조 표현)
//    hp:#ffaad0 / health:#aaeecc / attack:#ff6655 / agility:#88ddff / luck:#ffee66
// ================================================================

// ── 발생 확률 ────────────────────────────────────────────────────
// ⚠️ 테스트 50% — 실서비스 시 0.05 로 복구
const OVERCLOCK_CHANCE = 0.50;

// ── 오버클럭 풀 ──────────────────────────────────────────────────
const OVERCLOCK_POOL = [
  {
    id:          'oc_hp',
    name:        '강화 외피',
    label:       '오버클럭 : 체력',
    description: '체력 스탯이 50% 증가합니다.',
    statKey:     'hp',
    statIdx:     0,
    bonus:       0.50,
    color:       '#ffaad0',   // STAT_COLORS hp:#ff88bb 기준 → 밝게
  },
  {
    id:          'oc_health',
    name:        '자가 수복',
    label:       '오버클럭 : 건강',
    description: '건강 스탯이 50% 증가합니다.',
    statKey:     'health',
    statIdx:     1,
    bonus:       0.50,
    color:       '#aaeecc',   // STAT_COLORS health:#88ddaa 기준 → 밝게
  },
  {
    id:          'oc_attack',
    name:        '분노 회로',
    label:       '오버클럭 : 공격',
    description: '공격 스탯이 50% 증가합니다.',
    statKey:     'attack',
    statIdx:     2,
    bonus:       0.50,
    color:       '#ff6655',   // STAT_COLORS attack:#ff3333 기준 → 밝게
  },
  {
    id:          'oc_agility',
    name:        '가속 구동계',
    label:       '오버클럭 : 민첩',
    description: '민첩 스탯이 50% 증가합니다.',
    statKey:     'agility',
    statIdx:     3,
    bonus:       0.50,
    color:       '#88ddff',   // STAT_COLORS agility:#55ccff 기준 → 밝게
  },
  {
    id:          'oc_luck',
    name:        '행운 코어',
    label:       '오버클럭 : 행운',
    description: '행운 스탯이 50% 증가합니다.',
    statKey:     'luck',
    statIdx:     4,
    bonus:       0.50,
    color:       '#ffee66',   // STAT_COLORS luck:#ddcc44 기준 → 밝게
  },
];

// ── 편의 함수 ────────────────────────────────────────────────────

/** id로 오버클럭 정의 반환 */
function getOverclockData(id) {
  return OVERCLOCK_POOL.find(o => o.id === id) || null;
}

/** statKey로 오버클럭 정의 반환 */
function getOverclockByStat(statKey) {
  return OVERCLOCK_POOL.find(o => o.statKey === statKey) || null;
}
