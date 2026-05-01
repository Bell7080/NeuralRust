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

// ── 스탯 색상 (CharacterManager.STAT_COLORS 와 동기화) ─────────
export const TIP_STAT_COLORS: Record<StatKey, string> = {
  hp:      '#ff88bb',
  health:  '#88ddaa',
  attack:  '#ff3333',
  agility: '#55ccff',
  luck:    '#ddcc44',
};

// ── 능력 타입 색상 / 레이블 ────────────────────────────────────
export const TIP_ABIL_COLORS: Record<string, string> = {
  passive:  '#a0d080',
  action:   '#c8a060',
  enhanced: '#80b8e0',
  finale:   '#e080c0',
};

export const TIP_ABIL_LABELS: Record<string, string> = {
  passive: '패시브', action: '행동', enhanced: '강화', finale: '피날레',
};

// ── 직업 색상 ─────────────────────────────────────────────────
export const TIP_JOB_COLORS: Record<string, string> = {
  fisher: '#c8a070', diver: '#7ab0c8', helmsman: '#a080e0',
};

// ================================================================
//  툴팁 HTML 양식 (공통 규칙)
//
//  구조 (3줄):
//    줄1 — .tip-name   : 스탯명 / 능력명 / 직업명 (색상 = 해당 색상)
//    줄2 — .tip-desc   : 설명 텍스트 (일반 텍스트)
//    줄3 — .tip-value  : 총합/수치 (숫자·수치는 <strong style="color:[색상]"> 강조)
//
//  수치 강조 규칙:
//    - 스탯 툴팁: <strong style="color:[STAT_COLOR]"> 로 해당 스탯 색상 적용
//    - 능력 툴팁: 설명 내 숫자/퍼센트를 능력 타입 색상으로 highlight
//    - 직업 툴팁: 값 줄 없음 (설명만)
// ================================================================

// ── 내부 — 숫자·퍼센트 하이라이트 ──────────────────────────────
function _hlNum(text: string, color: string): string {
  return text.replace(
    /(\d+(?:\.\d+)?%?)/g,
    `<span style="color:${color};font-weight:700">$1</span>`,
  );
}

// ── 내부 HTML 빌더 ────────────────────────────────────────────
function _tip(nameColor: string, name: string, desc: string, valueHtml: string): string {
  return [
    `<div class="tip-name" style="color:${nameColor}">${name}</div>`,
    `<div class="tip-sep"></div>`,
    `<div class="tip-desc">${desc}</div>`,
    valueHtml ? `<div class="tip-sep"></div><div class="tip-value">${valueHtml}</div>` : '',
  ].join('');
}

// ── 공개 HTML 빌더 ────────────────────────────────────────────

/** 스탯 툴팁 HTML (3줄 구조) */
export function buildStatTipHtml(key: StatKey, effVal: number): string {
  const NAMES: Record<StatKey, string> = {
    hp: '체력', health: '건강', attack: '공격', agility: '민첩', luck: '행운',
  };
  const color = TIP_STAT_COLORS[key] ?? '#c8bfb0';
  const name  = NAMES[key] ?? key;
  const desc  = TOOLTIP_STATS[key] ?? '';

  const n = (v: string | number) => `<strong style="color:${color}">${v}</strong>`;

  let valueHtml = '';
  switch (key) {
    case 'hp':
      valueHtml = `최대 체력  ${n(effVal * 5)}`;
      break;
    case 'health':
      valueHtml = `회복량  ${n(effVal)}`;
      break;
    case 'attack':
      valueHtml = `공격력  ${n(effVal)}`;
      break;
    case 'agility': {
      const spd = StatFormulas.attackSpeed(effVal);
      valueHtml = `공격속도  ${n(`${spd}회/s`)}`;
      break;
    }
    case 'luck': {
      const crit = StatFormulas.critRate(effVal);
      const eva  = StatFormulas.evasionRate(effVal);
      valueHtml = `크리티컬  ${n(`${crit}%`)}  /  회피  ${n(`${eva}%`)}`;
      break;
    }
  }

  return _tip(color, name, desc, valueHtml);
}

/** 능력(패시브/행동/강화/피날레) 툴팁 HTML (3줄 구조) */
export function buildAbilTipHtml(type: string, name: string, desc: string): string {
  const color     = TIP_ABIL_COLORS[type] ?? '#c8bfb0';
  const typeLabel = TIP_ABIL_LABELS[type] ?? type;
  const hlDesc    = _hlNum(desc, color);
  return _tip(color, name, hlDesc, `<span class="tip-type-badge">${typeLabel}</span>`);
}

/** 직업 툴팁 HTML (3줄 구조) */
export function buildJobTipHtml(jobId: string, desc: string): string {
  const color = TIP_JOB_COLORS[jobId] ?? '#c8bfb0';
  const JOB_NAMES: Record<string, string> = {
    fisher: '낚시꾼', diver: '잠수부', helmsman: '조타수',
  };
  const name = JOB_NAMES[jobId] ?? jobId;
  return _tip(color, name, desc, '');
}

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

/** 캐릭터 실효 스탯값을 포함한 동적 툴팁 HTML 반환 */
export function getStatTooltipDynamic(key: StatKey, effVal: number): string {
  return buildStatTipHtml(key, effVal);
}
