// Portos em Turnos: programação paralela de dois berços com calado e prazo.
export const HARBOR_MODES=Object.freeze(["prazo","economia"]);
export const HARBOR_LEVELS=Object.freeze({recruta:4,tatico:6,veterano:8});
export const HARBOR_BERTHS=Object.freeze(["profundo","costeiro"]);
const valid=game=>game?.phase==="playing"&&!game.paused;
const own=(obj,key)=>Object.hasOwn(obj,key);
const started=game=>new Set([...game.completed,...HARBOR_BERTHS.map(b=>game.active[b]?.id).filter(Boolean)]);
const snapshot=game=>({
 clock:game.clock,active:Object.fromEntries(HARBOR_BERTHS.map(b=>[b,game.active[b]?{...game.active[b]}:null])),
 completed:[...game.completed],waited:game.waited,phase:game.phase,score:game.score,message:game.message
});
function makeShips(mode,count,seed){
 let state=(Math.imul(seed+1,1664525)+1013904223)>>>0;
 const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
 const schedules={profundo:0,costeiro:0};
 const ships=[];
 for(let i=0;i<count;i++){
  const berth=i%2===0?"profundo":"costeiro";
  const plannedStart=schedules[berth];
  const duration=1+next()%3;
  const arrival=Math.max(0,plannedStart-(next()%2));
  const cargo=i%2===0&&i%4===0?"pesada":"leve";
  const slack=mode==="economia"?next()%2:1+next()%3;
  const deadline=plannedStart+duration+slack;
  ships.push({id:"N"+(i+1),arrival,duration,deadline,cargo});
  schedules[berth]+=duration;
 }
 for(let i=ships.length-1;i>0;i--){
  const j=next()%(i+1);[ships[i],ships[j]]=[ships[j],ships[i]];
 }
 return ships;
}
export function createHarbor({mode="prazo",difficulty="recruta",seed=0}={}){
 if(!HARBOR_MODES.includes(mode)||!own(HARBOR_LEVELS,difficulty)||
    !Number.isSafeInteger(seed)||seed<0||seed>999999999)
   throw new RangeError("Configuração inválida");
 return {mode,difficulty,seed,ships:makeShips(mode,HARBOR_LEVELS[difficulty],seed),
   clock:0,active:{profundo:null,costeiro:null},completed:[],waited:0,
   phase:"playing",paused:false,score:0,history:[],
   message:"Atenda dois berços em paralelo. Carga pesada exige o cais profundo."};
}
function canFinish(game){
 const used=started(game);
 for(const ship of game.ships){
  if(used.has(ship.id))continue;
  if(Math.max(game.clock,ship.arrival)+ship.duration>ship.deadline)return false;
 }
 for(const berth of HARBOR_BERTHS){
  const active=game.active[berth];
  if(!active)continue;
  const ship=game.ships.find(s=>s.id===active.id);
  if(game.clock+active.remaining>ship.deadline)return false;
 }
 return true;
}
export function dispatchHarbor(game,id,berth){
 if(!valid(game)||typeof id!=="string"||!HARBOR_BERTHS.includes(berth)||game.active[berth])return game;
 const ship=game.ships.find(s=>s.id===id);
 if(!ship||started(game).has(id)||ship.arrival>game.clock||(ship.cargo==="pesada"&&berth!=="profundo")||
    game.clock+ship.duration>ship.deadline)return game;
 const next={...game,active:{...game.active,[berth]:{id,remaining:ship.duration}},
    history:[...game.history,snapshot(game)],
    message:ship.id+" iniciou atendimento no berço "+berth+". Operações dos dois berços avançam juntas."};
 return canFinish(next)?next:{...next,phase:"lost",message:"Esta distribuição inviabilizou um prazo."};
}
export function waitHarbor(game){
 if(!valid(game))return game;
 const used=started(game);
 const waiting=game.ships.some(s=>!used.has(s.id)&&s.arrival<=game.clock);
 const idle=HARBOR_BERTHS.every(berth=>!game.active[berth]);
 const wasted=idle&&waiting;
 const clock=game.clock+1,completed=[...game.completed];
 const active={};
 let expired=false;
 for(const berth of HARBOR_BERTHS){
  const assignment=game.active[berth];
  if(!assignment){active[berth]=null;continue;}
  const remaining=assignment.remaining-1;
  if(remaining>0){active[berth]={...assignment,remaining};continue;}
  active[berth]=null;completed.push(assignment.id);
  const ship=game.ships.find(s=>s.id===assignment.id);
  if(clock>ship.deadline)expired=true;
 }
 const won=completed.length===game.ships.length;
 const next={...game,clock,active,completed,waited:game.waited+(wasted?1:0),
   history:[...game.history,snapshot(game)]};
 const lost=expired||(game.mode==="economia"&&wasted)||(!won&&!canFinish(next));
 return {...next,phase:lost?"lost":won?"won":"playing",
   score:won&&!lost?Math.max(100,1500-clock*25-(game.waited+(wasted?1:0))*20+(game.mode==="economia"?100:0)):0,
   message:lost?"Prazo perdido ou cais ocioso no modo Economia.":won?"Vitória! Todos os navios atendidos.":"Hora "+clock+": atribua navios aos berços livres e confira os prazos."};
}
export function undoHarbor(game){
 if(!game||game.paused||!game.history.length)return game;
 const history=[...game.history],prev=history.pop();
 return {...game,...prev,history,message:"Última operação desfeita."};
}
export function pauseHarbor(game){
 return game?.phase==="playing"?{...game,paused:!game.paused,message:game.paused?"Partida retomada.":"Operações pausadas."}:game;
}
export function hintHarbor(game){
 if(!valid(game))return null;
 const failed=new Set();
 function solve(current){
  if(current.phase==="won")return [];
  if(current.phase!=="playing")return null;
  const key=current.clock+"|"+current.completed.join(",")+"|"+HARBOR_BERTHS.map(b=>current.active[b] ? current.active[b].id+"@"+current.active[b].remaining : "-").join(":");
  if(failed.has(key))return null;
  const used=started(current);
  const options=current.ships.filter(s=>!used.has(s.id)&&s.arrival<=current.clock)
    .sort((a,b)=>a.deadline-b.deadline||a.duration-b.duration||a.id.localeCompare(b.id));
  for(const berth of HARBOR_BERTHS){
   if(current.active[berth])continue;
   for(const ship of options){
    const next=dispatchHarbor(current,ship.id,berth);
    if(next===current||next.phase==="lost")continue;
    const result=solve({...next,history:[]});
    if(result)return [{id:ship.id,berth},...result];
   }
  }
  const tick=waitHarbor(current);
  if(tick!==current&&tick.phase!=="lost"){
   const result=solve({...tick,history:[]});
   if(result)return ["wait",...result];
  }
  failed.add(key);
  return null;
 }
 const result=solve({...game,history:[]});
 return result?.[0]??null;
}
