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


// ── 스탯 툴팁 (정적 설명) ────────────────────────────────────────
// 동적 수치 포함 버전 → getStatTooltipDynamic(key, effVal) 사용
const TOOLTIP_STATS = {
  hp:      '최대 체력에 영향을 줍니다.',
  health:  '라운드 종료 시 잃은 체력 회복에 영향을 줍니다.',
  attack:  '피해에 영향을 줍니다.',
  agility: '공격속도에 영향을 줍니다.',
  luck:    '크리티컬 확률과 회피율에 영향을 줍니다.',
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

/**
 * 캐릭터 실효 스탯값을 포함한 동적 툴팁 텍스트 반환
 * 첫 줄 = 제목 (스탯 이름), 이후 = 설명 + 현재 수치
 * @param {string} key     - 'hp' | 'health' | 'attack' | 'agility' | 'luck'
 * @param {number} effVal  - getEffectiveStat(char, key) 결과값
 * @returns {string}
 */
function getStatTooltipDynamic(key, effVal) {
  if (typeof StatFormulas === 'undefined') return getStatTooltip(key);

  switch (key) {
    case 'hp':
      return `체력\n${TOOLTIP_STATS.hp}\n현재 최대 체력  ${effVal * 5}`;

    case 'health':
      return `건강\n${TOOLTIP_STATS.health}\n현재 회복량  ${effVal}`;

    case 'attack':
      return `공격\n${TOOLTIP_STATS.attack}\n현재 공격력  ${effVal}`;

    case 'agility': {
      const spd = StatFormulas.attackSpeed(effVal);
      return `민첩\n${TOOLTIP_STATS.agility}\n현재 공격속도  ${spd}회/s`;
    }

    case 'luck': {
      const crit = StatFormulas.critRate(effVal);
      const eva  = StatFormulas.evasionRate(effVal);
      return `행운\n${TOOLTIP_STATS.luck}\n크리티컬  ${crit}%\n회피  ${eva}%`;
    }

    default:
      return getStatTooltip(key);
  }
}
