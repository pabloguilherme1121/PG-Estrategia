// Travessia do Vale: otimização de transporte com restrições de convivência.
export const CROSSING_MODES=Object.freeze(['classico','expedicao']);
export const CROSSING_LEVELS=Object.freeze({recruta:3,tatico:4,veterano:5});
const ALL=Object.freeze(['lobo','cabra','repolho','ferramentas','remedios']);
const CONFLICTS=[['lobo','cabra'],['cabra','repolho']];
export function newCrossing({mode='classico',difficulty='recruta'}={}){
 if(!CROSSING_MODES.includes(mode)||!Object.hasOwn(CROSSING_LEVELS,difficulty))throw new RangeError('Modo ou dificuldade inválida');
 const items=ALL.slice(0,CROSSING_LEVELS[difficulty]),capacity=mode==='classico'?1:2;
 return {mode,difficulty,items,capacity,right:[],bank:0,moves:0,limit:20+items.length*5,phase:'playing',paused:false,score:0,history:[],message:'Escolha quem vai na balsa. O piloto pode voltar sozinho.'};
}
const snap=g=>({right:[...g.right],bank:g.bank,moves:g.moves,phase:g.phase,score:g.score,message:g.message});
const allowed=(items,right,unattended)=>{
 const positions=new Set(right);
 return !CONFLICTS.some(([a,b])=>items.includes(a)&&items.includes(b)
 &&(positions.has(a)?1:0)===unattended&&(positions.has(b)?1:0)===unattended);
};
export function moveCrossing(g,passengers){
 if(!g||g.phase!=='playing'||g.paused||!Array.isArray(passengers)||passengers.length>g.capacity||new Set(passengers).size!==passengers.length)return g;
 if(passengers.some(x=>!g.items.includes(x)||g.right.includes(x)!==(g.bank===1)))return g;
 const next=new Set(g.right);
 for(const x of passengers){if(next.has(x))next.delete(x);else next.add(x);}
 const right=g.items.filter(x=>next.has(x)),newBank=1-g.bank;
 if(!allowed(g.items,right,g.bank))return g;
 const moves=g.moves+1,won=right.length===g.items.length&&newBank===1,phase=won?'won':moves>=g.limit?'lost':'playing';
 return {...g,right,bank:newBank,moves,phase,score:won?Math.max(50,600-moves*15+g.items.length*65):0,
  message:won?'Vitória: todos chegaram em segurança.':phase==='lost'?'O prazo de travessia acabou.':'Balsa atravessou o vale.',
  history:[...g.history,snap(g)]};
}
export function toggleCrossingPause(g){return g.phase==='playing'?{...g,paused:!g.paused,message:g.paused?'Travessia retomada.':'Travessia pausada.'}:g;}
export function undoCrossing(g){
 if(!g||g.phase!=='playing'||g.paused||!g.history.length)return g;
 const history=[...g.history],last=history.pop();
 return {...g,...last,history,message:'Última travessia desfeita.'};
}
export function hintCrossing(g){
 if(!g||g.phase!=='playing'||g.paused)return null;
 const queue=[{g,first:null}],seen=new Set();
 for(let i=0;i<queue.length&&i<5000;i++){
  const {g:state,first}=queue[i],key=state.bank+'|'+state.right.join(',')+'|'+state.moves;
  if(seen.has(key))continue;seen.add(key);
  if(state.phase==='won')return first||[];
  if(state.phase!=='playing')continue;
  const current=state.items.filter(x=>state.right.includes(x)===(state.bank===1));
  const actions=[[]];
  for(let p=0;p<current.length;p++)actions.push([current[p]]);
  if(state.capacity>1)for(let p=0;p<current.length;p++)for(let q=p+1;q<current.length;q++)actions.push([current[p],current[q]]);
  for(const action of actions){
   const next=moveCrossing(state,action);
   if(next!==state)queue.push({g:{...next,history:[]},first:first??action});
  }
 }
 return null;
}
