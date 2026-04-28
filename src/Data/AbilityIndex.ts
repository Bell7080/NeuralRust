// ================================================================
//  AbilityIndex.ts
//  경로: src/Data/AbilityIndex.ts
//
//  역할: 모든 능력 레지스트리를 묶어 Cog·직업별 풀을 구성
//        CharacterManager가 캐릭터 생성 시 이 풀을 참조
//
//  사용법:
//    AbilityIndex.getPool('passive',  'fisher', 3)  → Cog 3 이하 낚시꾼 패시브 id 배열
//    AbilityIndex.getPool('action',   'common', 5)  → Cog 5 이하 공통 일반행동 id 배열
//    AbilityIndex.getPool('finale',   'diver',  7)  → Cog 7 이하 잠수부+공통 피날레 id 배열
//    AbilityIndex.getData('passive',  'tough_body')  → 능력 객체 전체
//    AbilityIndex.getDesc('finale',   'core_overload') → description 문자열
// ================================================================

import type {
  AbilityType, AbilityJob,
  PassiveDefinition, ActionDefinition, EnhancedDefinition, FinaleDefinition,
  IAbilityIndex,
} from '../types';

// ── 각 파일에서 배열 임포트 ──────────────────────────────────────
import passivesCommon   from './Passives/Common';
import passivesFisher   from './Passives/Fisher';
import passivesDiver    from './Passives/Diver';
import passivesHelmsman from './Passives/Helmsman';
import passivesEnemy    from './Passives/Enemy';

import actionsCommon    from './Actions/Common';
import actionsFisher    from './Actions/Fisher';
import actionsDiver     from './Actions/Diver';
import actionsHelmsman  from './Actions/Helmsman';
import actionsEnemy     from './Actions/Enemy';

import enhancedCommon   from './Enhanced/Common';
import enhancedFisher   from './Enhanced/Fisher';
import enhancedDiver    from './Enhanced/Diver';
import enhancedHelmsman from './Enhanced/Helmsman';
import enhancedEnemy    from './Enhanced/Enemy';

import finalesCommon    from './Finales/Common';
import finalesFisher    from './Finales/Fisher';
import finalesDiver     from './Finales/Diver';
import finalesHelmsman  from './Finales/Helmsman';
import finalesNamed     from './Finales/Named';

// ── 통합 레지스트리 ───────────────────────────────────────────────
type AnyAbility = PassiveDefinition | ActionDefinition | EnhancedDefinition | FinaleDefinition;

const _reg: Record<AbilityType, AnyAbility[]> = {
  passive:  [...passivesCommon,  ...passivesFisher,  ...passivesDiver,  ...passivesHelmsman,  ...passivesEnemy],
  action:   [...actionsCommon,   ...actionsFisher,   ...actionsDiver,   ...actionsHelmsman,   ...actionsEnemy],
  enhanced: [...enhancedCommon,  ...enhancedFisher,  ...enhancedDiver,  ...enhancedHelmsman,  ...enhancedEnemy],
  finale:   [...finalesCommon,   ...finalesFisher,   ...finalesDiver,   ...finalesHelmsman, ...finalesNamed],
};

// ── 빠른 조회용 맵 (id → 객체) ────────────────────────────────────
const _map: Record<AbilityType, Record<string, AnyAbility>> = {
  passive:  {},
  action:   {},
  enhanced: {},
  finale:   {},
};

(Object.keys(_reg) as AbilityType[]).forEach(type => {
  _reg[type].forEach(item => { _map[type][item.id] = item; });
});

// ── 풀 구성 캐시 (첫 호출 시 생성) ────────────────────────────────
// 키: `${type}_${job}_${cog}`
const _cache: Record<string, string[]> = {};

// ================================================================
//  AbilityIndex — 공개 API
// ================================================================
export const AbilityIndex: IAbilityIndex = {

  /**
   * Cog 등급 이하 + 직업(common 포함) 능력 id 배열 반환
   */
  getPool(type: AbilityType, job: AbilityJob, cog: number): string[] {
    const key = `${type}_${job}_${cog}`;
    if (_cache[key]) return _cache[key];

    const pool = (_reg[type] ?? [])
      .filter(item =>
        item.cogMin <= cog &&
        item.job !== 'named' &&
        (item.job === 'common' || item.job === job)
      )
      .map(item => item.id);

    _cache[key] = pool;
    return pool;
  },

  /**
   * Named 피날레 id 배열 반환 (cogMin 이하)
   */
  getNamedFinales(cog: number): string[] {
    return (_reg.finale ?? [])
      .filter(item => item.job === 'named' && item.cogMin <= cog)
      .map(item => item.id);
  },

  /**
   * 능력 객체 전체 반환
   */
  getData(type: AbilityType, id: string): AnyAbility | null {
    return _map[type]?.[id] ?? null;
  },

  /**
   * description 문자열 반환
   */
  getDesc(type: AbilityType, id: string): string {
    return _map[type]?.[id]?.description ?? '';
  },

  /**
   * name 문자열 반환
   */
  getName(type: AbilityType, id: string): string {
    return _map[type]?.[id]?.name ?? id;
  },

  /**
   * gaugeRequired 반환 (finale 전용)
   */
  getGauge(id: string): number {
    const finale = _map.finale?.[id] as FinaleDefinition | undefined;
    return finale?.gaugeRequired ?? 100;
  },

  /**
   * 풀 캐시 초기화 (레지스트리 동적 추가 후 필요 시)
   */
  clearCache(): void {
    Object.keys(_cache).forEach(k => delete _cache[k]);
  },

  /**
   * 등록된 항목 수 디버그 출력
   */
  debug(): void {
    console.group('[AbilityIndex]');
    (Object.keys(_reg) as AbilityType[]).forEach(type => {
      const counts: Record<string, number> = {};
      _reg[type].forEach(item => { counts[item.job] = (counts[item.job] ?? 0) + 1; });
      console.log(`${type}:`, counts, `(총 ${_reg[type].length}개)`);
    });
    console.groupEnd();
  },
};
