export const SIDE=5;
export const WALLS=Object.freeze([6,8,16,18]);
export const PATROL=Object.freeze([2,7,12,17,22]);
export const COMMANDS=Object.freeze(['up','right','down','left','wait']);
export const DIFFICULTIES=Object.freeze({
 recruta:Object.freeze({energy:26,integrity:4,cycles:10,patrolStep:2}),
 tatico:Object.freeze({energy:23,integrity:3,cycles:9,patrolStep:1}),
 veterano:Object.freeze({energy:20,integrity:2,cycles:8,patrolStep:1}),
});
export const MODES=Object.freeze({
 resgate:Object.freeze({name:'Resgate',beacons:[4,20]}),
 varredura:Object.freeze({name:'Varredura',beacons:[10,14]}),
});
const own=(object,key)=>Object.hasOwn(object,key);
const snapshot=state=>{const {history,...rest}=state;return structuredClone(rest);};
export function patrolAt(state,tick=state.tick){
 const offset=Math.floor(tick/state.patrolStep)+state.patrolOffset;
 return PATROL[offset%PATROL.length];
}
export function createDroneGame({mode='resgate',difficulty='recruta',seed=0}={}){
 if(!own(MODES,mode)||!own(DIFFICULTIES,difficulty)||!Number.isSafeInteger(seed)||seed<0)throw new Error('Configuração inválida');
 const rules=DIFFICULTIES[difficulty];
 return {mode,difficulty,phase:'playing',paused:false,position:0,energy:rules.energy,
  integrity:rules.integrity,maxEnergy:rules.energy,maxIntegrity:rules.integrity,maxCycles:rules.cycles,
  patrolStep:rules.patrolStep,patrolOffset:seed%PATROL.length,
  tick:0,cycles:0,beacons:[...MODES[mode].beacons],collected:[],queue:[],
  notice:'Monte até três comandos e execute o programa.',history:[]};
}
export function queueDroneOrder(state,command){
 if(state.phase!=='playing'||state.paused||!COMMANDS.includes(command)||state.queue.length>=3)return state;
 return {...state,queue:[...state.queue,command],notice:'Programa: '+(state.queue.length+1)+'/3 ordens.'};
}
export function removeDroneOrder(state){
 if(state.phase!=='playing'||state.paused||!state.queue.length)return state;
 return {...state,queue:state.queue.slice(0,-1),notice:'Último comando removido.'};
}
export function toggleDronePause(state){
 if(state.phase!=='playing')return state;
 return {...state,paused:!state.paused,notice:state.paused?'Partida retomada.':'Partida pausada.'};
}
function advance(position,command){
 const x=position%SIDE,y=Math.floor(position/SIDE);
 if(command==='wait')return position;
 const [dx,dy]=command==='up'?[0,-1]:command==='right'?[1,0]:command==='down'?[0,1]:[-1,0];
 const nx=x+dx,ny=y+dy;
 if(nx<0||ny<0||nx>=SIDE||ny>=SIDE)return position;
 const cell=ny*SIDE+nx;
 return WALLS.includes(cell)?position:cell;
}
export function executeDroneProgram(state){
 if(state.phase!=='playing'||state.paused||!state.queue.length)return state;
 const history=[...state.history,snapshot(state)].slice(-12);
 let position=state.position,energy=state.energy,integrity=state.integrity,tick=state.tick;
 const collected=new Set(state.collected);
 let phase='playing',notice='Programa executado.';
 for(const command of state.queue){
  const next=advance(position,command);
  energy--;tick++;position=next;
  if(state.beacons.includes(position))collected.add(position);
  if(position===patrolAt(state,tick)){
   integrity--;notice='A patrulha atingiu o drone!';
  }
  if(position===24&&collected.size===state.beacons.length&&integrity>0){phase='won';notice='Vitória! Todas as cargas chegaram à base.';break;}
  if(energy<=0||integrity<=0){phase='lost';notice=integrity<=0?'Drone destruído pela patrulha.':'Energia esgotada.';break;}
 }
 const cycles=state.cycles+1;
 if(phase==='playing'&&cycles>=state.maxCycles){phase='lost';notice='O limite de ciclos terminou.';}
 return {...state,position,energy,integrity,tick,cycles,collected:[...collected],phase,queue:[],history,notice};
}
export function undoDroneCycle(state){
 if(!state.history.length)return state;
 return {...structuredClone(state.history.at(-1)),history:state.history.slice(0,-1),notice:'Último ciclo desfeito.'};
}
