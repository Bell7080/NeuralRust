// ================================================================
//  AbilityIndex.js
//  경로: Games/Codes/Data/AbilityIndex.js
//
//  역할: 모든 능력 레지스트리를 묶어 Cog·직업별 풀을 구성
//        CharacterManager가 캐릭터 생성 시 이 풀을 참조
//
//  의존 (index.html 로드 순서):
//    Passives/Common.js  Passives/Fisher.js  Passives/Diver.js  Passives/Helmsman.js
//    Actions/Common.js   Actions/Fisher.js   Actions/Diver.js   Actions/Helmsman.js
//    Enhanced/Common.js  Enhanced/Fisher.js  Enhanced/Diver.js  Enhanced/Helmsman.js
//    Finales/Common.js   Finales/Fisher.js   Finales/Diver.js   Finales/Helmsman.js
//    Finales/Named.js
//    AbilityIndex.js   ← 반드시 마지막
//
//  사용법:
//    AbilityIndex.getPool('passive',  'fisher', 3)  → Cog 3 이하 낚시꾼 패시브 id 배열
//    AbilityIndex.getPool('action',   'common', 5)  → Cog 5 이하 공통 일반행동 id 배열
//    AbilityIndex.getPool('finale',   'diver',  7)  → Cog 7 이하 잠수부+공통 피날레 id 배열
//    AbilityIndex.getData('passive',  'tough_body')  → 능력 객체 전체
//    AbilityIndex.getDesc('finale',   'core_overload') → description 문자열
// ================================================================

const AbilityIndex = (() => {

  // ── 레지스트리 참조 ───────────────────────────────────────────
  //  각 레지스트리 파일이 전역 배열로 push한 내용을 여기서 통합
  const _reg = {
    passive:  typeof PASSIVE_REGISTRY  !== 'undefined' ? PASSIVE_REGISTRY  : [],
    action:   typeof ACTION_REGISTRY   !== 'undefined' ? ACTION_REGISTRY   : [],
    enhanced: typeof ENHANCED_REGISTRY !== 'undefined' ? ENHANCED_REGISTRY : [],
    finale:   typeof FINALE_REGISTRY   !== 'undefined' ? FINALE_REGISTRY   : [],
  };

  // ── 빠른 조회용 맵 (id → 객체) ───────────────────────────────
  const _map = { passive:{}, action:{}, enhanced:{}, finale:{} };
  Object.keys(_reg).forEach(type => {
    _reg[type].forEach(item => { _map[type][item.id] = item; });
  });

  // ── 풀 구성 캐시 (첫 호출 시 생성) ───────────────────────────
  // 키: `${type}_${job}_${cog}`
  const _cache = {};

  /**
   * Cog 등급 이하 + 직업(common 포함) 능력 id 배열 반환
   * @param {'passive'|'action'|'enhanced'|'finale'} type
   * @param {'common'|'fisher'|'diver'|'helmsman'|'named'} job
   * @param {number} cog
   * @returns {string[]}
   */
  function getPool(type, job, cog) {
    const key = `${type}_${job}_${cog}`;
    if (_cache[key]) return _cache[key];

    const items = _reg[type] || [];
    const pool  = items
      .filter(item =>
        item.cogMin <= cog &&
        item.job !== 'named' &&           // named는 일반 풀 제외
        (item.job === 'common' || item.job === job)
      )
      .map(item => item.id);

    _cache[key] = pool;
    return pool;
  }

  /**
   * Named 피날레 id 배열 반환 (cogMin 이하)
   * @param {number} cog
   * @returns {string[]}
   */
  function getNamedFinales(cog) {
    return (_reg.finale || [])
      .filter(item => item.job === 'named' && item.cogMin <= cog)
      .map(item => item.id);
  }

  /**
   * 능력 객체 전체 반환
   * @param {'passive'|'action'|'enhanced'|'finale'} type
   * @param {string} id
   * @returns {object|null}
   */
  function getData(type, id) {
    return _map[type]?.[id] || null;
  }

  /**
   * description 문자열 반환
   */
  function getDesc(type, id) {
    return _map[type]?.[id]?.description || '';
  }

  /**
   * 이름 문자열 반환
   */
  function getName(type, id) {
    return _map[type]?.[id]?.name || id;
  }

  /**
   * gaugeRequired 반환 (finale 전용)
   */
  function getGauge(id) {
    return _map.finale?.[id]?.gaugeRequired ?? 100;
  }

  /**
   * 풀 캐시 초기화 (레지스트리 동적 추가 후 필요 시)
   */
  function clearCache() {
    Object.keys(_cache).forEach(k => delete _cache[k]);
  }

  /**
   * 등록된 항목 수 디버그 출력
   */
  function debug() {
    console.group('[AbilityIndex]');
    Object.keys(_reg).forEach(type => {
      const counts = {};
      _reg[type].forEach(item => { counts[item.job] = (counts[item.job] || 0) + 1; });
      console.log(`${type}:`, counts, `(총 ${_reg[type].length}개)`);
    });
    console.groupEnd();
  }

  return { getPool, getNamedFinales, getData, getDesc, getName, getGauge, clearCache, debug };

})();
