// ================================================================
//  JobData.js
//  경로: Games/Codes/Data/JobData.js
//
//  역할: 직업 정의 데이터
//        id, label, description, traits(특성 — 추후 구현)
//  의존: 없음
// ================================================================

const JOB_DATA = {

  fisher: {
    id:          'fisher',
    label:       '낚시꾼',
    short:       'FISH',
    description: '이형에게 입히는 피해 +2. 이형에게 받는 피해 -1.',
    // 추후 구현 — 직업 특성 효과
    traits: [
      // 전투 단계에서 데미지 최후 계산 시 체력에 반영하기 이전 이 수치를 합연산함.
    ],
  },

  diver: {
    id:          'diver',
    label:       '잠수부',
    short:       'DIVE',
    description: '이형 처시 시 50% 확률로 아이템 발견. 이형에게 받는 피해 +2.',
    traits: [
      // 전투 단계에서 이형을 처치 시 캐릭터가 배치되어 살아있다면 아이템 수집, 아이템 개수나 종류는 추후 구체화.
    ],
  },

  ai: {
    id:          'ai',
    label:       'A.I',
    short:       'A·I',
    description: '이형 처치시 50% 확률로 아크 발견. 이형에게 받는 피해 +2.',
    traits: [
      // 전투 단계에서 이형을 처치 시 캐릭터가 배치되어 살아있다면 Arc(화폐)를 수집, 수치는 추후 구체화.
    ],
  },

};

// 편의 함수
function getJobData(jobId) {
  return JOB_DATA[jobId] || null;
}

function getJobLabel(jobId) {
  return JOB_DATA[jobId]?.label || jobId;
}

function getJobDescription(jobId) {
  return JOB_DATA[jobId]?.description || '';
}
