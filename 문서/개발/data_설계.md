# 📦 Data 파일 설계 — NEURAL RUST
> `Games/Codes/Data/` 경로. 전역 상수 파일, 어떤 씬·매니저에서도 참조 가능.
> 최종 반영: 2026-03

---

## 파일 목록

| 파일 | 역할 | 상태 |
|------|------|------|
| `Data_Skills.js` | 스킬 전체 정의 (id·타입·조건·효과) | ✅ 완료 |
| `Data_Passives.js` | 패시브 전체 정의 (범위 enum 포함) | ✅ 완료 |
| `Data_Enemies.js` | 이형 종류·스탯·행동패턴·처치보상 | ✅ 완료 |
| `Data_Items.js` | 아이템 정의 (소모품·장비·가중치 강화) | ✅ 완료 |
| `Data_Events.js` | 라운드 슬롯 이벤트 (가중치·강제조건·보상) | ✅ 완료 |
| `Data_Regions.js` | 탐사 구역 (코그 범위·등장 이형·배경) | ⬜ 추후 |

---

## index.html 로드 순서

Data 파일은 매니저(Managers/)보다 반드시 먼저 로드한다.

```html
<!-- ① Data 파일 -->
<script src="Games/Codes/Data/Data_Skills.js"></script>
<script src="Games/Codes/Data/Data_Passives.js"></script>
<script src="Games/Codes/Data/Data_Enemies.js"></script>
<script src="Games/Codes/Data/Data_Items.js"></script>
<script src="Games/Codes/Data/Data_Events.js"></script>

<!-- ② Managers -->
<script src="Games/Codes/Managers/utils.js"></script>
<script src="Games/Codes/Managers/FontManager.js"></script>
<!-- ... 나머지 매니저 ... -->

<!-- ③ Scenes -->
```

---

## Data_Skills.js 구조

```js
SKILL_DATA = [{
  id: string,            // 고유 식별자
  name: string,
  cogMin: number,        // 등장 최소 코그
  type: 'auto'|'manual',
  gaugeRequired: number, // 수동 스킬 요구 게이지 (100/200/300)
  triggerType: 'attack_count'|'on_hit'|'hp_below'|null,
  triggerValue: number|null,
  effect: { type, target, value, duration },
  description: string,
}]
```

스킬 ID 목록:

| Cog | ID |
|-----|----|
| 1 | `basic_strike`, `quick_stab` |
| 2 | `combo_hit`, `guard_stance` |
| 3 | `heavy_blow`, `evasion`, `poison_coat` |
| 4 | `aoe_strike`, `strong_poison`, `burst_speed` |
| 5 | `explosion_hit`, `front_scan`, `armor_pierce` |
| 6 | `deep_pressure`, `electric_shock`, `iron_wall` |
| 7+ | `core_overload`, `abyss_roar` |

CharacterManager의 `SKILL_POOL` 키를 이 id로 교체 필요.

---

## Data_Passives.js 구조

```js
// 범위 enum
const RANGE = {
  UPPER, FRONT, SELF, DIAGONAL,
  FRONT_ROW, REAR, FRONT_REAR, ALL
}

PASSIVE_DATA = [{
  id: string,
  name: string,
  cogMin: number,
  range: RANGE.*,
  description: string,
}]

// Cog별 풀 (CharacterManager.PASSIVE_POOL 교체 대상)
PASSIVE_POOL = {
  1: ['upper_strike', 'front_strike'],
  2: ['front_strike', 'self_strike'],
  ...
}
```

---

## Data_Enemies.js 구조

```js
ENEMY_DATA = [{
  id: string,
  name: string,
  cogMin: number,
  cogMax: number|null,
  baseStats: { hp, attack, agility, luck },
  statScaling: number,       // 코그 1 오를 때마다 배율
  behavior: 'random'|'target_weak'|'wave',
  behaviorWeights: { attack, move, skill },
  spawnCount: [min, max],
  spawnWeight: number,
  waveBonus: { attackBonus, hpBonus } | undefined,
  reward: { type, value },
  description: string,
}]

// 헬퍼
getEnemyScaledStats(enemyId, cogLevel) → 실제 스탯 반환
```

이형 목록:

| id | 코그 | 행동 |
|----|------|------|
| `deep_fish` | 1~4 | random |
| `wild_ai` | 2~7 | target_weak |
| `drowned` | 3~∞ | wave |

---

## Data_Items.js 구조

```js
ITEM_DATA = [{
  id: string,
  name: string,
  rarity: 'common'|'rare'|'unique',
  effect: { type, stat, value },
  source: string[],   // 획득처 키
  description: string,
}]

// 헬퍼
getItemById(id)
getItemsBySource(source)
```

effect.type 목록:

| type | 설명 |
|------|------|
| `stat_boost` | 스탯 수치 증가 |
| `heal` | HP 즉시 회복 |
| `gauge_boost` | 전투 게이지 즉시 충전 |
| `passive_override` | 패시브 범위 교체 |
| `weight_boost` | 직업 특성 획득 가중치 증가 |

---

## Data_Events.js 구조

```js
EVENT_DATA = [{
  id: string,
  name: string,
  weight: number,
  forcedCondition: [...] | null,  // 강제 포함 조건
  requiredJob: string | null,
  efficiencyPenalty: number,      // 직업 없을 때 효율 배율
  reward: { type, ... },
  description: string,
}]

// 헬퍼
buildSlots(count, partyState) → 이벤트 id 배열
```

이벤트 목록:

| id | 가중치 | 강제조건 |
|----|--------|---------|
| `combat` | 4 | - |
| `fishing` | 2 | - |
| `salvage` | 2 | - |
| `wire_connect` | 2 | - |
| `deep_shop` | 1 | - |
| `drifter` | 1 | - |
| `signal` | 1 | - |
| `repair` | 0.5 | - |
| `retreat` | 1 | 파티 절반↓ / 잠수정 HP 50%↓ |

---

## 저장 키 변경 사항

| 키 | 상태 | 비고 |
|----|------|------|
| `nr_squad` | ❌ 더 이상 사용 안 함 | 탐사대 탭 삭제로 폐기 |
| `nr_record_chips` | ⬜ 신규 추가 필요 | 기록칩 (얼굴 ID별 누적 기록) |
| `nr_party` | ⬜ 신규 추가 필요 | 탐사 진입 전 파티 편성 결과 |

---

## CharacterManager 수정 필요 사항

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| `SKILL_POOL` | 문자열 직접 기재 | `Data_Skills.js` id 참조 |
| `PASSIVE_POOL` | 문자열 직접 기재 | `Data_Passives.js` PASSIVE_POOL 참조 |
| `saveSquad()` / `loadSquad()` | 3×3 格子 기반 10슬롯 | ❌ 삭제 예정 |
| `saveParty()` / `loadParty()` | 미구현 | ⬜ 신규 구현 필요 |
| `saveRecordChip()` | 미구현 | ⬜ 신규 구현 필요 |
