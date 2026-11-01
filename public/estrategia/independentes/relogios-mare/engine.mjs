// Relógios da Maré: alinhamento modular de mostradores com acoplamento entre vizinhos.
export const MODES=Object.freeze(['linha','anel']);
export const LEVELS=Object.freeze({recruta:4,tatico:5,veterano:6});
const indexOf=(n,size)=>((n%size)+size)%size;
function update(ticks,index,mode,amount){
 const next=[...ticks],size=ticks.length;
 const affected=new Set([index]);
 if(index>0)affected.add(index-1);
 else if(mode==='anel')affected.add(size-1);
 if(index<size-1)affected.add(index+1);
 else if(mode==='anel')affected.add(0);
 for(const i of affected)next[i]=indexOf(next[i]+amount,3);
 return next;
}
const plans=new Map();
function makePlan(mode,size){
 const key=mode+':'+size;if(plans.has(key))return plans.get(key);
 const solved=Array(size).fill(0),routes=new Map([[solved.join(''),{button:null,distance:0}]]),queue=[solved];
 for(let i=0;i<queue.length;i++){
  const ticks=queue[i],distance=routes.get(ticks.join('')).distance;
  for(let button=0;button<size;button++){
   const prior=update(ticks,button,mode,-1),id=prior.join('');
   if(routes.has(id))continue;
   routes.set(id,{button,distance:distance+1});queue.push(prior);
  }
 }
 plans.set(key,routes);return routes;
}
export function createTides({mode='linha',difficulty='recruta',seed=0}={}){
 if(!MODES.includes(mode)||!Object.hasOwn(LEVELS,difficulty)||!Number.isSafeInteger(seed)||seed<0||seed>999999999)throw new RangeError('Configuração inválida');
 const size=LEVELS[difficulty];let ticks=Array(size).fill(0),state=(seed+1)*97+size*11;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
 for(let i=0;i<size+3;i++)ticks=update(ticks,random()%size,mode,1);
 if(ticks.every(t=>t===0))ticks=update(ticks,0,mode,1);
 return {mode,difficulty,seed,size,ticks,moves:0,limit:48,paused:false,phase:'playing',score:0,
  history:[],message:'Alinhe todos os relógios no marcador 0.'};
}
export function rotateTide(game,index){
 if(!game||game.paused||game.phase!=='playing'||!Number.isInteger(index)||index<0||index>=game.size)return game;
 const ticks=update(game.ticks,index,game.mode,1),moves=game.moves+1;
 const won=ticks.every(x=>x===0),phase=won?'won':moves>=game.limit?'lost':'playing';
 return {...game,ticks,moves,phase,score:won?Math.max(10,1000-moves*16):0,
  history:[...game.history,{ticks:[...game.ticks],moves:game.moves,phase:game.phase,score:game.score}],
  message:won?'Vitória: relógios sincronizados.':phase==='lost'?'Tentativas encerradas.':'Mostradores atualizados.'};
}
export function undoTide(game){
 if(!game||game.phase!=='playing'||game.paused||!game.history.length)return game;
 const history=[...game.history],last=history.pop();
 return {...game,...last,history,message:'Último movimento desfeito.'};
}
export function pauseTide(game){
 return game?.phase==='playing'?{...game,paused:!game.paused,message:game.paused?'Missão retomada.':'Missão pausada.'}:game;
}
export function hintTides(game){
 if(!game||game.phase!=='playing'||game.paused)return null;
 const plan=makePlan(game.mode,game.size).get(game.ticks.join(''));
 return plan&&plan.button!==null&&plan.distance<=game.limit-game.moves?plan.button:null;
}
