// ================================================================
//  Data_Tooltips.js
//  경로: Games/Codes/Data/Data_Tooltips.js
//
//  역할: 인게임 마우스오버 툴팁 설명 텍스트 통합 관리
//        스탯 / 직업 / 포지션 / 패시브 / 스킬
//
//  사용처:
//    - TM_RightPanel.js  (_buildStats, _buildAbilRow)
//    - Tab_CharProfile.js (STAT_DEFS, makeAbilBox)
//    - Recruit_Custom.js  (makeAbilBox)
//    - Recruit_Popup.js   (팝업 설명)
//
//  수정 방법:
//    각 항목의 description 값만 수정하면 인게임에 즉시 반영됩니다.
//    스탯은 TOOLTIP_STATS, 직업은 TOOLTIP_JOBS,
//    포지션/패시브/스킬은 각 Data 파일의 description 참조.
// ================================================================


// ── 스탯 툴팁 ────────────────────────────────────────────────────
// TM_RightPanel._buildStats / Tab_CharProfile STAT_DEFS 에서 참조
const TOOLTIP_STATS = {
  hp:      '체력 — 스탯당 최대 체력 + 10.',
  health:  '건강 — 라운드 종료 시 해당 스탯 만큼 잃은 체력을 회복합니다.',
  attack:  '공격 — 피해에 직접적인 영향을 끼치는 스탯입니다.',
  agility: '민첩 — 스탯당 공격속도 + 0.1 ( 공격속도 1 = 초당 1대 ).',
  luck:    '행운 — 스탯당 크리티컬 확률 + 1% ( 100% 초과 시 초과 스탯당 공격 + 1 )\n회피 확률 + 0.1% ( 50% 초과 시 스탯당 민첩 + 1 ).',
};


// ── 직업 툴팁 ────────────────────────────────────────────────────
// JobData.js 의 description 을 그대로 쓰되,
// 툴팁에 표시할 추가 설명이 필요하면 여기서 override 가능.
// 비워두면 getJobDescription(jobId) 값을 그대로 사용.
const TOOLTIP_JOBS = {
  fisher: '',   // 비워두면 JobData.js description 사용
  diver:  '',
  ai:     '',
};


// ── 편의 함수 ────────────────────────────────────────────────────

/**
 * 스탯 키로 툴팁 텍스트 반환
 * @param {string} key  - 'hp' | 'health' | 'attack' | 'agility' | 'luck'
 * @returns {string}
 */
function getStatTooltip(key) {
  return TOOLTIP_STATS[key] || key;
}

/**
 * 직업 id로 툴팁 텍스트 반환
 * TOOLTIP_JOBS에 값이 있으면 우선, 없으면 JobData.js 참조
 * @param {string} jobId
 * @returns {string}
 */
function getJobTooltip(jobId) {
  if (TOOLTIP_JOBS[jobId]) return TOOLTIP_JOBS[jobId];
  if (typeof getJobDescription === 'function') return getJobDescription(jobId);
  return jobId;
}

/**
 * 포지션 이름으로 설명 반환 (PositionData.js 위임)
 * @param {string} name
 * @returns {string}
 */
function getPositionTooltip(name) {
  if (typeof getPositionDescription === 'function') return getPositionDescription(name);
  return name || '';
}

/**
 * 패시브 이름으로 설명 반환 (PassiveData.js 위임)
 * @param {string} name
 * @returns {string}
 */
function getPassiveTooltip(name) {
  if (typeof getPassiveDescription === 'function') return getPassiveDescription(name);
  return name || '';
}

/**
 * 스킬 이름으로 설명 반환 (SkillData.js 위임)
 * @param {string} name
 * @returns {string}
 */
function getSkillTooltip(name) {
  if (typeof getSkillDescription === 'function') return getSkillDescription(name);
  return name || '';
}
