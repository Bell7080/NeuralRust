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
    description: '수면 탐색 특화. 자원 수집 효율 +20%, 어획물 판별 능력 보유.',
    // 추후 구현 — 직업 특성 효과
    traits: [
      // { id: 'surface_scan', name: '수면 탐색', description: '수면 자원 수집 효율 +20%.', effect: null },
      // { id: 'catch_identify', name: '어획물 판별', description: '어획물 종류를 즉시 식별한다.', effect: null },
    ],
  },

  diver: {
    id:          'diver',
    label:       '잠수부',
    short:       'DIVE',
    description: '심해 탐색 특화. 수압 저항, 수중 작업 시간 +30%.',
    traits: [
      // { id: 'pressure_resist', name: '수압 저항', description: '심해 환경에서 패널티를 받지 않는다.', effect: null },
      // { id: 'deep_work', name: '수중 작업', description: '수중 작업 시간 +30%.', effect: null },
    ],
  },

  ai: {
    id:          'ai',
    label:       'A.I',
    short:       'A·I',
    description: '기계 지성체. 연산 속도 탁월, 감정 연산 미탑재.',
    traits: [
      // { id: 'compute_speed', name: '고속 연산', description: '행동 계산 속도가 크게 증가한다.', effect: null },
      // { id: 'no_emotion', name: '감정 없음', description: '공포/혼란 상태이상 면역.', effect: null },
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
