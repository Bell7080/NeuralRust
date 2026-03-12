// ================================================================
//  _SkillRegistry.js
//  경로: Games/Codes/Data/Skills/_SkillRegistry.js
//
//  역할: 모든 스킬 파일의 등록 허브
//        각 스킬 파일(basic_strike.js 등)이 SkillRegistry.define()을
//        호출해 자신을 등록함
//
//  로드 순서 (index.html):
//    _SkillRegistry.js   ← 반드시 먼저
//    basic_strike.js
//    quick_stab.js
//    ... (스킬 파일들)
//    그 다음 CharacterManager.js
//
//  사용법:
//    getSkillData('basic_strike')        → 스킬 객체 전체
//    getSkillDescription('basic_strike') → description 문자열
//    getSkillName('basic_strike')        → '기본 일격'
//    getSkillsByJob('fisher')            → 낚시꾼 전용 스킬 배열
//    getSkillsByCog(3)                   → Cog 3 이하 해금 스킬 배열
// ================================================================

const SkillRegistry = (() => {

  const _skills = {};  // id → 스킬 객체

  /**
   * 스킬 파일에서 호출 — 스킬 등록
   * @param {object} skillDef
   */
  function define(skillDef) {
    if (!skillDef.id) {
      console.warn('[SkillRegistry] id 없는 스킬 등록 시도:', skillDef);
      return;
    }
    if (_skills[skillDef.id]) {
      console.warn(`[SkillRegistry] 중복 id 등록: "${skillDef.id}"`);
    }
    _skills[skillDef.id] = skillDef;
  }

  /** id로 스킬 전체 객체 반환 */
  function getData(id) {
    return _skills[id] || null;
  }

  /** id로 description 반환 */
  function getDescription(id) {
    return _skills[id]?.description || '';
  }

  /** id로 이름 반환 */
  function getName(id) {
    return _skills[id]?.name || id;
  }

  /** 직업 전용 스킬 목록 반환 (null = 공용 포함) */
  function getByJob(jobId) {
    return Object.values(_skills).filter(s =>
      s.jobOnly === null || s.jobOnly === jobId
    );
  }

  /** 특정 Cog 이하에서 해금되는 스킬 목록 */
  function getByCog(cog) {
    return Object.values(_skills).filter(s => s.cogMin <= cog);
  }

  /** Cog별 id 배열 반환 (CharacterManager SKILL_POOL 대체용) */
  function getPoolByCog(cog) {
    return getByCog(cog).map(s => s.id);
  }

  /** 등록된 전체 스킬 id 배열 */
  function getAllIds() {
    return Object.keys(_skills);
  }

  return { define, getData, getDescription, getName, getByJob, getByCog, getPoolByCog, getAllIds };

})();

// ── 기존 코드와의 호환 래퍼 ─────────────────────────────────────
// TM_RightPanel, Tab_CharProfile 등에서 호출하는 전역 함수 유지
// 스킬 식별자가 id(영문)인지 name(한글)인지 자동 판별

function getSkillData(idOrName) {
  // id로 직접 시도
  const byId = SkillRegistry.getData(idOrName);
  if (byId) return byId;
  // name으로 역검색
  const byName = Object.values(SkillRegistry._skills || {})
    .find(s => s.name === idOrName);
  return byName || null;
}

function getSkillDescription(idOrName) {
  const s = getSkillData(idOrName);
  return s?.description || '';
}

function getSkillName(id) {
  return SkillRegistry.getName(id);
}
