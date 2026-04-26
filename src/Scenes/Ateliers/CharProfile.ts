// ================================================================
//  CharProfile.ts
//  경로: src/Scenes/Ateliers/CharProfile.ts
//
//  역할: 캐릭터 상세 프로필 팝업 (CSS DOM 모달)
//        어떤 씬에서든 CharProfile.open(char, opts) 로 호출
//
//  사용 예:
//    CharProfile.open(char, { scene: this, onClose: () => {} });
// ================================================================

import './CharProfile.css';
import type { Character, StatKey } from '../../types';
import {
  CharacterManager, getCogColor, STAT_COLORS, STAT_LABEL_MAP,
} from '../../Managers/CharacterManager';
import { CharacterSpriteManager } from '../../Managers/CharacterSpriteManager';
import { AbilityIndex } from '../../Data/AbilityIndex';
import { getStatTooltipDynamic } from '../../Data/Data_Tooltips';

// ── 공개 타입 ─────────────────────────────────────────────────────
export interface CharProfileOpts {
  /** Phaser 씬 — 스프라이트 표시에 사용 (선택) */
  scene?:   Phaser.Scene;
  onClose?: () => void;
  onHeal?:  (char: Character, cost: number) => void;
}

// ── 능력 표시 정의 ────────────────────────────────────────────────
const STAT_KEYS: StatKey[] = ['hp', 'health', 'attack', 'agility', 'luck'];

type AbilityField = 'passive' | 'action' | 'enhanced' | 'finale';
const ABILITY_DEFS: { type: AbilityField; label: string; color: string }[] = [
  { type: 'passive',  label: 'PASSIVE',  color: '#a0d080' },
  { type: 'action',   label: 'ACTION',   color: '#c8a060' },
  { type: 'enhanced', label: 'ENHANCED', color: '#80b8e0' },
  { type: 'finale',   label: 'FINALE',   color: '#e080c0' },
];

// ================================================================
//  CharProfile — 공개 API
// ================================================================
export const CharProfile = {

  open(char: Character, opts: CharProfileOpts = {}): void {
    // 기존 팝업 닫기
    document.getElementById('char-profile-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'char-profile-overlay';
    overlay.className = 'cp-overlay';

    const modal = document.createElement('div');
    modal.className = 'cp-modal';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 살아있는 char 참조 (스탯 소비 후 갱신용)
    let liveChar: Character = { ...char, stats: { ...char.stats } };

    const _close = () => {
      overlay.remove();
      opts.onClose?.();
    };

    const _rebuild = (updated: Character) => {
      liveChar = { ...updated, stats: { ...updated.stats } };
      modal.innerHTML = '';
      _fillModal(modal, liveChar, opts, _close, _rebuild);
    };

    // 오버레이 바깥 클릭 → 닫기
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _close();
    });

    // 최초 빌드
    _rebuild(liveChar);
  },
};

// ================================================================
//  내부 — 모달 내용 빌드
// ================================================================
function _fillModal(
  modal:     HTMLElement,
  char:      Character,
  opts:      CharProfileOpts,
  onClose:   () => void,
  onRefresh: (updated: Character) => void,
): void {
  const cogC   = getCogColor(char.cog);
  const hpPct  = char.maxHp > 0 ? Math.max(0, Math.min(1, char.currentHp / char.maxHp)) : 0;
  const hpColor = hpPct > 0.6 ? '#50c050' : hpPct > 0.3 ? '#c0a030' : '#c03030';
  const jobCol  = char.job === 'fisher' ? '#c8a070'
    : char.job === 'diver'    ? '#7ab0c8' : '#a080e0';

  // ── 헤더 (초상화 + 기본 정보) ──────────────────────────────────
  const header = document.createElement('div');
  header.className = 'cp-header';

  const portraitBox = document.createElement('div');
  portraitBox.className = 'cp-portrait-box';

  const _cpSrc = CharacterSpriteManager.getDomSrc(char.spriteKey);
  if (_cpSrc) {
    const img = document.createElement('img');
    img.src = _cpSrc;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:center 15%';
    portraitBox.appendChild(img);
  }

  const infoDiv = document.createElement('div');
  infoDiv.className = 'cp-info';
  infoDiv.innerHTML = `
    <div class="cp-name">${char.name}</div>
    <div class="cp-job" style="color:${jobCol}">
      ${char.jobLabel}
      <span class="cp-mastery">숙련도 ${char.mastery}</span>
    </div>
    ${char.overclock ? `
      <div class="cp-overclock" style="color:${char.overclock.color}">
        ${char.overclock.label}
      </div>` : ''}
    <div class="cp-hp-row">
      <div class="cp-hp-bar">
        <div class="cp-hp-fill" style="width:${Math.round(hpPct * 100)}%;background:${hpColor}"></div>
      </div>
      <span class="cp-hp-txt">HP ${char.currentHp} / ${char.maxHp}</span>
    </div>
    <div class="cp-cog-row">
      <span class="cp-cog-label">Cog</span>
      <span class="cp-cog-val" style="color:${cogC.css}">${char.cog}</span>
      <span class="cp-cog-sum">합계 ${char.statSum}</span>
    </div>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'cp-close-btn';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', onClose);

  header.appendChild(portraitBox);
  header.appendChild(infoDiv);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // ── 구분선 ─────────────────────────────────────────────────────
  modal.appendChild(_divider());

  // ── 본문: 스탯 | 능력 ─────────────────────────────────────────
  const body = document.createElement('div');
  body.className = 'cp-body';

  // 좌: 스탯
  const statsCol = document.createElement('div');
  statsCol.className = 'cp-stats-col';

  if (char.pendingStats > 0) {
    const pendRow = document.createElement('div');
    pendRow.className = 'cp-pending-row';
    pendRow.innerHTML = `미배분 스탯: <strong id="cp-pending-count">${char.pendingStats}</strong>`;
    statsCol.appendChild(pendRow);
  }

  STAT_KEYS.forEach(key => {
    const effVal = CharacterManager.getEffectiveStat(char, key);
    const base   = char.stats[key] ?? 0;
    const isOc   = char.overclock?.statKey === key;
    const color  = STAT_COLORS[key] ?? '#c8bfb0';
    const label  = STAT_LABEL_MAP[key] ?? key;
    const valStr = isOc ? `${base} → ${effVal}` : `${effVal}`;
    const tip    = getStatTooltipDynamic(key, effVal);
    const valColor = isOc ? (char.overclock?.color ?? color) : color;

    const row = document.createElement('div');
    row.className = 'cp-stat-row';
    row.title = tip;

    const keySpan = document.createElement('span');
    keySpan.className = 'cp-stat-key';
    keySpan.style.color = color;
    keySpan.textContent = label;

    const valSpan = document.createElement('span');
    valSpan.className = 'cp-stat-val';
    valSpan.style.color = valColor;
    valSpan.textContent = valStr;

    row.appendChild(keySpan);
    row.appendChild(valSpan);

    if (char.pendingStats > 0) {
      const spendBtn = document.createElement('button');
      spendBtn.className = 'cp-spend-btn';
      spendBtn.style.color = color;
      spendBtn.textContent = '+';
      spendBtn.dataset.key = key;
      spendBtn.addEventListener('click', () => {
        const chars = CharacterManager.loadAll() ?? [];
        const target = chars.find(c => c.id === char.id);
        if (!target || !target.pendingStats) return;
        target.stats[key] = (target.stats[key] ?? 0) + 1;
        target.pendingStats--;
        target.statSum = (Object.values(target.stats) as number[]).reduce((a, b) => a + b, 0);
        if (key === 'hp') target.maxHp = target.stats.hp * 5;
        CharacterManager.saveAll(chars);
        onRefresh(target);
      });
      row.appendChild(spendBtn);
    }

    statsCol.appendChild(row);
  });

  // 우: 능력
  const abilCol = document.createElement('div');
  abilCol.className = 'cp-abil-col';

  ABILITY_DEFS.forEach(({ type, label, color }) => {
    const id   = char[type as keyof Pick<Character, AbilityField>] as string;
    const nm   = AbilityIndex.getName(type, id) || id;
    const desc = AbilityIndex.getDesc(type, id) || '';

    const box = document.createElement('div');
    box.className = 'cp-abil-box';

    const typeEl = document.createElement('div');
    typeEl.className = 'cp-abil-type';
    typeEl.textContent = label;

    const nameEl = document.createElement('div');
    nameEl.className = 'cp-abil-name';
    nameEl.style.color = color;
    nameEl.textContent = nm;

    box.appendChild(typeEl);
    box.appendChild(nameEl);

    if (desc) {
      const descEl = document.createElement('div');
      descEl.className = 'cp-abil-desc';
      descEl.textContent = desc;
      box.appendChild(descEl);
    }

    abilCol.appendChild(box);
  });

  body.appendChild(statsCol);
  body.appendChild(abilCol);
  modal.appendChild(body);

  // ── 구분선 ─────────────────────────────────────────────────────
  modal.appendChild(_divider());

  // ── 푸터 버튼 ─────────────────────────────────────────────────
  const footer = document.createElement('div');
  footer.className = 'cp-footer';

  const missing  = char.maxHp - char.currentHp;
  const healCost = missing > 0 ? Math.ceil(missing * 0.5) : 0;

  if (opts.onHeal && missing > 0) {
    const healBtn = document.createElement('button');
    healBtn.className = 'cp-btn cp-btn--green';
    healBtn.textContent = `회복  (${healCost} Arc)`;
    healBtn.addEventListener('click', () => {
      onClose();
      opts.onHeal!(char, healCost);
    });
    footer.appendChild(healBtn);
  }

  const closeFooterBtn = document.createElement('button');
  closeFooterBtn.className = 'cp-btn cp-btn--red';
  closeFooterBtn.textContent = '닫  기';
  closeFooterBtn.addEventListener('click', onClose);
  footer.appendChild(closeFooterBtn);

  modal.appendChild(footer);
}

// ── 구분선 헬퍼 ─────────────────────────────────────────────────
function _divider(): HTMLHRElement {
  const hr = document.createElement('hr');
  hr.className = 'cp-divider';
  return hr;
}
