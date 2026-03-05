// ================================================================
//  CharacterManager.js
//  경로: Games/Codes/Managers/CharacterManager.js
// ================================================================

const CharacterManager = (() => {
  const NAMES = [
    '카이로스','쉐도우','레이든','아이론','루미나',
    '스크랩','드리프터','코어','글리치','넥서스',
    '볼트','파이퍼','오라클','크롬','덱스터',
    '리프트','러스트','모스','아쿠아','뎁스',
    '타이드','스피어','훅','싱커','바이트',
    '에코','노드','씨드','프록시','시그마',
  ];
  const JOB_LABEL = { fisher:'낚시꾼', diver:'잠수부', ai:'AI' };

  function calcCog(s){
    if(s<=10)return 1; if(s<=25)return 2; if(s<=45)return 3;
    if(s<=65)return 4; if(s<=80)return 5; if(s<=95)return 6; return 7;
  }
  const PASSIVE_POOL={
    1:['윗칸 타격','앞칸 타격'],
    2:['앞칸 타격','현재 칸 타격'],
    3:['현재 칸 타격','대각 타격','윗칸 타격'],
    4:['전열 전체 타격','대각 타격','앞칸 타격'],
    5:['전열 전체 타격','현재 칸 타격','후열 타격'],
    6:['전/후열 동시 타격','후열 타격','전열 전체 타격'],
    7:['전체 칸 타격','전/후열 동시 타격'],
  };
  const SKILL_POOL={
    1:['기본 일격','빠른 찌르기'],
    2:['연속 타격','방어 자세'],
    3:['강타','회피 기동','독 도포'],
    4:['광역 타격','강화 독','순간 가속'],
    5:['폭발 타격','전방 스캔','철갑 관통'],
    6:['심해 압박','전기 충격','철벽 방어'],
    7:['코어 오버로드','심연의 포효'],
  };
  function pick(a){return a[Math.floor(Math.random()*a.length)];}

  function randStats(){
    const total=10+Math.floor(Math.random()*41);
    const mins=[1,0,1,5,0]; const minSum=7;
    const remain=Math.max(0,total-minSum);
    const b=[0,0,0,0,0];
    for(let i=0;i<remain;i++) b[Math.floor(Math.random()*5)]++;
    return{hp:mins[0]+b[0],health:mins[1]+b[1],attack:mins[2]+b[2],agility:mins[3]+b[3],luck:mins[4]+b[4]};
  }
  function createCharacter(job){
    const stats=randStats();
    const statSum=Object.values(stats).reduce((a,v)=>a+v,0);
    const cog=calcCog(statSum);
    return{
      id:`c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      name:pick(NAMES), age:18+Math.floor(Math.random()*35),
      job, jobLabel:JOB_LABEL[job], stats, statSum, cog,
      passive:pick(PASSIVE_POOL[cog]||PASSIVE_POOL[1]),
      skill:pick(SKILL_POOL[cog]||SKILL_POOL[1]),
      currentHp:stats.hp*10, maxHp:stats.hp*10,
    };
  }
  const KEY='nr_characters'; const SQUAD_KEY='nr_squad';
  function saveAll(c){localStorage.setItem(KEY,JSON.stringify(c));}
  function loadAll(){try{const r=localStorage.getItem(KEY);return r?JSON.parse(r):null;}catch{return null;}}
  function initIfEmpty(){
    const ex=loadAll(); if(ex&&ex.length>0)return ex;
    const chars=[createCharacter('fisher'),createCharacter('diver'),createCharacter('ai')];
    saveAll(chars); return chars;
  }
  function loadSquad(){try{const r=localStorage.getItem(SQUAD_KEY);return r?JSON.parse(r):Array(9).fill(null);}catch{return Array(9).fill(null);}}
  function saveSquad(s){localStorage.setItem(SQUAD_KEY,JSON.stringify(s));}

  return{initIfEmpty,loadAll,saveAll,createCharacter,calcCog,JOB_LABEL,loadSquad,saveSquad};
})();
