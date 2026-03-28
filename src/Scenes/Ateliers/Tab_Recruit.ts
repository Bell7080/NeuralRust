// ================================================================
//  Tab_Recruit.ts — 영입 탭 (슬롯머신 가챠 + 커스터마이징)
//  UI: CSS DOM | 애니메이션: Phaser.time 타이머 → DOM 갱신
//  Phase: READY → SLOT → PICK → CUSTOM → COMPLETE
// ================================================================

import { CharacterManager, calcCog, getCogColor } from '../../Managers/CharacterManager';
import { AbilityIndex } from '../../Data/AbilityIndex';
import { SaveManager }  from '../../Managers/SaveManager';
import type { Character, JobId } from '../../types/index';

const BASE_PRICE = 5, PRICE_STEP = 5, MAX_REROLL = 3;
const SLOT_TICK_MS = 55, SLOT_TICKS = 30, SPRITE_COUNT = 72;
const JOBS: JobId[] = ['fisher', 'diver', 'helmsman'];
const JOB_LABEL: Record<string,string> = { fisher:'낚시꾼', diver:'잠수부', helmsman:'조타수' };

interface Roll {
  name: string; job: JobId; cog: number; statSum: number;
  stats: Record<string,number>;
  passive: string; action: string; enhanced: string; finale: string;
  spriteKey: string;
}

function _pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function _ab(t: 'passive'|'action'|'enhanced'|'finale', job: JobId, cog: number): string {
  const p = CharacterManager.getAbilityPool(t, job, cog);
  return p.length ? _pick(p) : 'strike';
}
function _statsBySum(total: number): Record<string,number> {
  const mins=[1,0,1,5,0], keys=['hp','health','attack','agility','luck'];
  const rem=Math.max(0,total-mins.reduce((a,b)=>a+b,0)), b=[0,0,0,0,0];
  for(let i=0;i<rem;i++) b[Math.floor(Math.random()*5)]++;
  const r:Record<string,number>={};
  keys.forEach((k,i)=>{r[k]=mins[i]+b[i];});
  return r;
}
function _rollOne(price: number): Roll {
  const GACHA=[{cog:1,w:9490,min:7,max:25},{cog:2,w:350,min:26,max:44},
    {cog:3,w:100,min:45,max:63},{cog:4,w:30,min:64,max:82},
    {cog:5,w:15,min:83,max:100},{cog:6,w:3,min:101,max:133},
    {cog:7,w:2,min:134,max:166},{cog:8,w:1,min:167,max:200}];
  const scl=[0,0,0,0.2,0.35,0.55,0.75,1.0];
  const lv=Math.max(0,Math.floor((price-BASE_PRICE)/PRICE_STEP));
  const tbl=GACHA.map((e,i)=>({...e,w:Math.round(e.w*(1+(scl[i]??0)*lv))}));
  const tot=tbl.reduce((s,e)=>s+e.w,0);
  let r=Math.random()*tot, picked=tbl[0];
  for(const e of tbl){r-=e.w;if(r<=0){picked=e;break;}}
  const statSum=picked.min+Math.floor(Math.pow(Math.random(),1.8)*(picked.max-picked.min+1));
  const cog=calcCog(statSum), job=_pick(JOBS);
  const names=['볼트','기어','러스트','뎁스','아크','드릴','앵커','크롬','스팀','웨이브'];
  return { name:_pick(names), job, cog, statSum, stats:_statsBySum(statSum),
    passive:_ab('passive',job,cog), action:_ab('action',job,cog),
    enhanced:_ab('enhanced',job,cog), finale:_ab('finale',job,cog),
    spriteKey:`char_${String(Math.floor(Math.random()*SPRITE_COUNT)).padStart(3,'0')}` };
}
function _rollTriple(price: number): [Roll,Roll,Roll] {
  const rolls=[_rollOne(price),_rollOne(price),_rollOne(price)];
  if(rolls.every(r=>r.job===rolls[0].job)){
    const alt=_pick(JOBS.filter(j=>j!==rolls[0].job));
    const r2=rolls[2]; r2.job=alt;
    r2.passive=_ab('passive',alt,r2.cog); r2.action=_ab('action',alt,r2.cog);
    r2.enhanced=_ab('enhanced',alt,r2.cog); r2.finale=_ab('finale',alt,r2.cog);
  }
  return [rolls[0],rolls[1],rolls[2]];
}

export class Tab_Recruit {
  readonly _container: null = null;
  private _scene: Phaser.Scene;
  private _el: HTMLDivElement;
  private _timers: Phaser.Time.TimerEvent[] = [];
  private _price: number;
  private _rolls: [Roll,Roll,Roll] | null = null;
  private _chosen: Roll | null = null;
  private _rerolls: Record<string,number> = {};

  constructor(scene: Phaser.Scene, _W: number, _H: number, contentEl: HTMLElement) {
    this._scene = scene;
    const save = SaveManager.load() as Record<string,unknown>|null;
    this._price = typeof save?.recruitPrice==='number' ? save.recruitPrice : BASE_PRICE;
    const el = document.createElement('div');
    el.className = 'atelier-tab-panel recruit-panel';
    contentEl.appendChild(el);
    this._el = el as HTMLDivElement;
    this._showReady();
  }

  private _clear() {
    this._timers.forEach(t=>{try{t.remove();}catch(_){}});
    this._timers=[];
    this._el.innerHTML='';
  }
  private _delay(ms: number, fn: ()=>void) {
    this._timers.push(this._scene.time.delayedCall(ms,fn));
  }
  private _toast(msg: string) {
    const el=this._el.querySelector<HTMLElement>('.rct-toast');
    if(!el)return; el.textContent=msg; el.style.opacity='1';
    this._delay(1500,()=>{if(el)el.style.opacity='0';});
  }
  private _typeText(el: HTMLElement, text: string, delay: number, cb: ()=>void) {
    el.textContent='';
    const chars=[...text]; let i=0;
    const tick=()=>{
      if(i<chars.length){el.textContent=chars.slice(0,++i).join('');this._delay(delay,tick);}
      else cb();
    };
    this._delay(delay,tick);
  }
  private _spriteEl(key: string, cls: string): HTMLElement {
    const w=document.createElement('div'); w.className=cls;
    if(this._scene.textures.exists(key)){
      const src=(this._scene.textures.get(key).getSourceImage() as HTMLImageElement).src;
      const img=document.createElement('img');
      img.src=src;
      img.style.cssText='width:100%;height:100%;object-fit:contain;image-rendering:pixelated';
      w.appendChild(img);
    } else { w.textContent='?'; w.style.color='#3d2010'; }
    return w;
  }

  // ── READY ──────────────────────────────────────────────────────
  private _showReady() {
    this._clear();
    const save=SaveManager.load() as Record<string,unknown>|null;
    const arc=typeof save?.arc==='number'?save.arc:0;
    const box=document.createElement('div'); box.className='recruit-box';
    const lbl=document.createElement('div'); lbl.className='atelier-panel-label'; lbl.textContent='영  입';
    const div=document.createElement('div'); div.className='atelier-panel-divider';
    const main=document.createElement('div'); main.className='recruit-main-txt';
    const pw=document.createElement('div'); pw.className='recruit-price-wrap'; pw.style.opacity='0'; pw.style.transition='opacity 0.3s';
    pw.innerHTML=`<div class="recruit-price-label">영입 비용</div>
      <div class="recruit-price">${this._price}  Arc</div>
      <div class="recruit-arc-cur">보유: ${arc} Arc</div>`;
    const btn=document.createElement('button'); btn.className='recruit-btn'; btn.textContent='영  입'; btn.style.opacity='0'; btn.style.transition='opacity 0.28s';
    const toast=document.createElement('div'); toast.className='rct-toast'; toast.style.cssText='opacity:0;transition:opacity 0.3s;color:#e87040;text-align:center;font-size:0.9em;margin-top:0.5em';
    box.append(lbl,div,main,pw,btn,toast);
    this._el.appendChild(box);

    this._typeText(main,'새로운 동료를 영입하시겠습니까?',48,()=>{
      pw.style.opacity='1';
      this._delay(200,()=>{btn.style.opacity='1';});
    });
    btn.addEventListener('click',()=>this._onHire());
  }

  private _onHire() {
    const save=SaveManager.load() as Record<string,unknown>|null;
    const arc=typeof save?.arc==='number'?save.arc:0;
    if(arc<this._price){this._toast('Arc 부족!');return;}
    const next={...save,arc:arc-this._price,recruitPrice:this._price+PRICE_STEP};
    this._price+=PRICE_STEP;
    SaveManager.save(next as unknown as Parameters<typeof SaveManager.save>[0]);
    this._scene.events.emit('arcUpdated',arc-(this._price-PRICE_STEP));
    this._rolls=_rollTriple(this._price);
    this._showSlot();
  }

  // ── SLOT ───────────────────────────────────────────────────────
  private _showSlot() {
    this._clear();
    const rolls=this._rolls!;
    const row=document.createElement('div'); row.className='recruit-slot-row';
    const disp:{jobEl:HTMLElement;statEl:HTMLElement}[]=[];
    rolls.forEach((_,i)=>{
      const card=document.createElement('div'); card.className='recruit-slot-card';
      card.innerHTML=`<div class="rct-card-num">${i+1}</div>
        <div class="rct-card-job">???</div>
        <div class="rct-card-sep"></div>
        <div class="rct-card-stat">---</div>
        <div class="rct-card-sublabel">스 탯  합 계</div>`;
      row.appendChild(card);
      disp.push({jobEl:card.querySelector('.rct-card-job')!,statEl:card.querySelector('.rct-card-stat')!});
    });
    this._el.appendChild(row);

    let done=0;
    rolls.forEach((roll,i)=>{
      let tick=0; const total=SLOT_TICKS+i*4;
      this._delay(i*80,()=>{
        const ev=this._scene.time.addEvent({delay:SLOT_TICK_MS,repeat:total-1,callback:()=>{
          tick++;
          const {jobEl,statEl}=disp[i];
          if(tick<total){
            jobEl.textContent=_pick(['낚시꾼','잠수부','조타수']);
            const fake=tick>total*0.65?roll.statSum+Math.round((Math.random()-0.5)*(total-tick)*2.5):Math.floor(Math.random()*250);
            statEl.textContent=String(Math.max(0,Math.min(300,fake)));
          } else {
            const c=getCogColor(roll.cog);
            jobEl.textContent=JOB_LABEL[roll.job]; jobEl.style.color=c.css;
            statEl.textContent=String(roll.statSum);
            done++; if(done===3)this._delay(200,()=>this._showPick());
          }
        }});
        this._timers.push(ev);
      });
    });
  }

  // ── PICK ───────────────────────────────────────────────────────
  private _showPick() {
    this._clear();
    const rolls=this._rolls!;
    const g=document.createElement('div'); g.className='recruit-guide'; g.textContent='영입할 동료를 선택하십시오';
    const row=document.createElement('div'); row.className='recruit-pick-row';
    rolls.forEach((roll,i)=>{
      const cogC=getCogColor(roll.cog);
      const jobCol=roll.job==='fisher'?'#c8a070':roll.job==='diver'?'#7ab0c8':'#a080e0';
      const card=document.createElement('div'); card.className='recruit-pick-card';
      card.style.cssText=`border-color:${cogC.css}40;opacity:0;transform:scaleY(0.85);cursor:pointer`;
      const jEl=document.createElement('div');jEl.className='rct-pick-job';jEl.style.color=jobCol;jEl.textContent=JOB_LABEL[roll.job];
      const sEl=this._spriteEl(roll.spriteKey,'rct-pick-sprite');
      const nEl=document.createElement('div');nEl.className='rct-pick-name';nEl.textContent=roll.name;
      const cEl=document.createElement('div');cEl.className='rct-pick-cog';cEl.style.color=cogC.css;cEl.textContent=`Cog  ${roll.cog}`;
      const sumEl=document.createElement('div');sumEl.className='rct-pick-sum';sumEl.textContent=`합계  ${roll.statSum}`;
      card.append(jEl,sEl,nEl,cEl,sumEl);
      card.addEventListener('mouseover',()=>{card.style.borderColor=cogC.css;card.style.background='rgba(18,13,7,0.98)';});
      card.addEventListener('mouseout',()=>{card.style.borderColor=`${cogC.css}40`;card.style.background='';});
      card.addEventListener('click',()=>{
        this._chosen=roll;
        this._rerolls={stat:MAX_REROLL,sprite:MAX_REROLL,passive:MAX_REROLL,action:MAX_REROLL,enhanced:MAX_REROLL,finale:MAX_REROLL};
        this._showCustom();
      });
      row.appendChild(card);
      this._delay(50+i*100,()=>{card.style.transition='opacity 0.3s,transform 0.3s,border-color 0.15s,background 0.12s';card.style.opacity='1';card.style.transform='scaleY(1)';});
    });
    this._el.append(g,row);
  }

  // ── CUSTOM ─────────────────────────────────────────────────────
  private _showCustom() { this._clear(); this._renderCustom(this._chosen!); }

  private _renderCustom(roll: Roll) {
    const cogC=getCogColor(roll.cog);
    const jobCol=roll.job==='fisher'?'#c8a070':roll.job==='diver'?'#7ab0c8':'#a080e0';
    const SL:Record<string,string>={hp:'체력',health:'건강',attack:'공격',agility:'민첩',luck:'행운'};
    const AL:Record<string,string>={passive:'패시브',action:'행동',enhanced:'강화',finale:'피날레'};
    const SC=CharacterManager.STAT_COLORS as Record<string,string>;

    const wrap=document.createElement('div'); wrap.className='recruit-custom-wrap';
    const toast=document.createElement('div'); toast.className='rct-toast'; toast.style.cssText='opacity:0;transition:opacity 0.3s;text-align:center;color:#e87040;font-size:0.9em;min-height:1.2em';

    // 좌측
    const left=document.createElement('div'); left.className='recruit-custom-left';
    const jd=document.createElement('div');jd.className='rct-custom-job';jd.style.color=jobCol;jd.textContent=JOB_LABEL[roll.job];
    const sd=this._spriteEl(roll.spriteKey,'rct-custom-sprite');
    const bSpr=document.createElement('button');bSpr.className='recruit-reroll-btn';bSpr.textContent=`외형 재설정 (${this._rerolls.sprite}회)`;
    const nd=document.createElement('div');nd.className='rct-custom-name';nd.textContent=roll.name;
    const cd=document.createElement('div');cd.className='rct-custom-cog';cd.style.color=cogC.css;cd.textContent=`Cog  ${roll.cog}`;
    const sumd=document.createElement('div');sumd.className='rct-custom-sum';sumd.textContent=`합계  ${roll.statSum}`;
    left.append(jd,sd,bSpr,nd,cd,sumd);
    bSpr.addEventListener('click',()=>{
      if(!this._rerolls.sprite){toast.style.opacity='1';toast.textContent='재설정 횟수 소진';this._delay(1500,()=>{toast.style.opacity='0';});return;}
      this._rerolls.sprite--;
      roll.spriteKey=`char_${String(Math.floor(Math.random()*SPRITE_COUNT)).padStart(3,'0')}`;
      this._renderCustom(roll);
    });

    // 중앙: 스탯
    const mid=document.createElement('div'); mid.className='recruit-custom-mid';
    const sl=document.createElement('div');sl.className='rct-section-label';sl.textContent='스  탯';
    const slist=document.createElement('div');slist.className='rct-stat-list';
    Object.entries(roll.stats).forEach(([k,v])=>{
      const row2=document.createElement('div');row2.className='rct-stat-row';
      const ke=document.createElement('span');ke.className='rct-stat-key';ke.textContent=SL[k]??k;
      const ve=document.createElement('span');ve.className='rct-stat-val';ve.style.color=SC[k]??'#c8bfb0';ve.textContent=String(v);
      row2.append(ke,ve); slist.appendChild(row2);
    });
    const bStat=document.createElement('button');bStat.className='recruit-reroll-btn';bStat.textContent=`스탯 재설정 (${this._rerolls.stat}회)`;
    mid.append(sl,slist,bStat);
    bStat.addEventListener('click',()=>{
      if(!this._rerolls.stat){toast.style.opacity='1';toast.textContent='재설정 횟수 소진';this._delay(1500,()=>{toast.style.opacity='0';});return;}
      this._rerolls.stat--; roll.stats=_statsBySum(roll.statSum); this._renderCustom(roll);
    });

    // 우측: 능력
    const right=document.createElement('div'); right.className='recruit-custom-right';
    const al=document.createElement('div');al.className='rct-section-label';al.textContent='능  력';
    right.appendChild(al);
    (['passive','action','enhanced','finale'] as const).forEach(type=>{
      const id=roll[type];
      const nm=AbilityIndex.getName(type,id)||id;
      const ds=AbilityIndex.getDesc(type,id)||'';
      const box=document.createElement('div');box.className='rct-ability-box';
      const te=document.createElement('div');te.className='rct-ab-type';te.textContent=AL[type];
      const ne=document.createElement('div');ne.className='rct-ab-name';ne.textContent=nm;
      const de=document.createElement('div');de.className='rct-ab-desc';de.textContent=ds;
      const be=document.createElement('button');be.className='recruit-reroll-btn';be.textContent=`재설정 (${this._rerolls[type]}회)`;
      box.append(te,ne,de,be); right.appendChild(box);
      be.addEventListener('click',()=>{
        if(!this._rerolls[type]){toast.style.opacity='1';toast.textContent='재설정 횟수 소진';this._delay(1500,()=>{toast.style.opacity='0';});return;}
        this._rerolls[type]--; roll[type]=_ab(type,roll.job,roll.cog); this._renderCustom(roll);
      });
    });

    wrap.append(left,mid,right);
    const actions=document.createElement('div'); actions.className='recruit-custom-actions';
    const cfm=document.createElement('button');cfm.className='recruit-confirm-btn';cfm.textContent='확  정';
    const cnl=document.createElement('button');cnl.className='recruit-cancel-btn';cnl.textContent='← 다시 고르기';
    actions.append(toast,cfm,cnl);
    this._el.append(wrap,actions);

    cfm.addEventListener('click',()=>this._confirmHire());
    cnl.addEventListener('click',()=>{this._rolls=_rollTriple(this._price);this._showPick();});
  }

  private _confirmHire() {
    const roll=this._chosen!;
    const skeys:Array<keyof Character['stats']>=['hp','health','attack','agility','luck'];
    const stats={} as Character['stats'];
    skeys.forEach(k=>{stats[k]=(roll.stats as Record<string,number>)[k]??0;});
    const char:Character={
      id:`c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      name:roll.name, age:16+Math.floor(Math.random()*10),
      job:roll.job, jobLabel:JOB_LABEL[roll.job]??roll.job,
      stats, statSum:roll.statSum, cog:roll.cog,
      passive:roll.passive, action:roll.action, enhanced:roll.enhanced, finale:roll.finale,
      overclock:null, mastery:0, pendingStats:0,
      currentHp:stats.hp*5, maxHp:stats.hp*5, status:'alive', spriteKey:roll.spriteKey,
    };
    CharacterManager.addCharacter(char);
    this._clear();
    const box=document.createElement('div');box.className='recruit-box';box.style.textAlign='center';
    box.innerHTML=`<div class="atelier-panel-label">영  입  완  료</div>
      <div class="atelier-panel-divider"></div>
      <div class="recruit-complete-name">${roll.name}</div>
      <div class="recruit-complete-sub">이 동료가 합류했습니다.</div>`;
    const btn=document.createElement('button');btn.className='atelier-start-btn';btn.style.marginTop='1.5em';btn.textContent='다시 영입';
    btn.addEventListener('click',()=>this._showReady());
    box.appendChild(btn); this._el.appendChild(box);
  }

  show()    { this._el.classList.add('active'); }
  hide()    { this._el.classList.remove('active'); }
  destroy() {
    this._timers.forEach(t=>{try{t.remove();}catch(_){}});
    this._timers=[];
    this._el.remove();
  }
}
