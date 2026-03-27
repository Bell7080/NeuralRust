// ================================================================
//  Data_Tooltips.ts
//  경로: src/Data/Data_Tooltips.ts
//
//  역할: 인게임 마우스오버 툴팁 설명 텍스트 통합 관리
//        스탯 / 직업 / 포지션 / 패시브 / 스킬
//
//  사용처:
//    - TM_RightPanel.ts  (_buildStats, _buildAbilRow)
//    - Tab_CharProfile.ts (STAT_DEFS, makeAbilBox)
//    - Recruit_Custom.ts  (makeAbilBox)
//    - Recruit_Popup.ts   (팝업 설명)
//
//  수정 방법:
//    각 항목의 description 값만 수정하면 인게임에 즉시 반영됩니다.
// ================================================================

import type { StatKey }  from '../types';
import { StatFormulas }  from '../constants';
import { getJobDescription } from './Data_Jobs';

// ── 스탯 툴팁 (정적 설명) ────────────────────────────────────────
export const TOOLTIP_STATS: Record<StatKey, string> = {
  hp:      '최대 체력에 영향을 줍니다.',
  health:  '라운드 종료 시 잃은 체력 회복에 영향을 줍니다.',
  attack:  '피해에 영향을 줍니다.',
  agility: '공격속도에 영향을 줍니다.',
  luck:    '크리티컬 확률과 회피율에 영향을 줍니다.',
};

// ── 직업 툴팁 ────────────────────────────────────────────────────
// 비워두면 getJobDescription() 값을 그대로 사용
export const TOOLTIP_JOBS: Record<string, string> = {
  fisher: '',
  diver:  '',
  ai:     '',
};

// ── 편의 함수 ────────────────────────────────────────────────────

export function getStatTooltip(key: StatKey): string {
  return TOOLTIP_STATS[key] ?? key;
}

export function getJobTooltip(jobId: string): string {
  if (TOOLTIP_JOBS[jobId]) return TOOLTIP_JOBS[jobId];
  return getJobDescription(jobId);
}

export function getPositionTooltip(name: string): string {
  return name ?? '';
}

export function getPassiveTooltip(name: string): string {
  return name ?? '';
}

export function getSkillTooltip(name: string): string {
  return name ?? '';
}

/**
 * 캐릭터 실효 스탯값을 포함한 동적 툴팁 텍스트 반환
 * @param key    - 'hp' | 'health' | 'attack' | 'agility' | 'luck'
 * @param effVal - getEffectiveStat(char, key) 결과값
 */
export function getStatTooltipDynamic(key: StatKey, effVal: number): string {
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
