// Controle de Tráfego: jogo de escalonamento de quatro filas independentes.
// Todas as transições são determinísticas e locais; sem rede ou temporizadores.
export const TRAFFIC_LEVELS=Object.freeze({
 recruta:Object.freeze({maxQueue:6,target:16,maxTurns:12}),
 tatico:Object.freeze({maxQueue:5,target:18,maxTurns:12}),
 veterano:Object.freeze({maxQueue:3,target:20,maxTurns:12})
});
export const TRAFFIC_MODES=Object.freeze(['cidade','resgate']);
const SIDES=Object.freeze(['N','E','S','W']);
function snapshot(state){const {history,...saved}=state;return structuredClone(saved);}
export function createTraffic({mode='cidade',difficulty='recruta',seed=0}={}){
 if(!TRAFFIC_MODES.includes(mode)||!Object.hasOwn(TRAFFIC_LEVELS,difficulty)||!Number.isSafeInteger(seed)||seed<0)throw new RangeError('Modo, dificuldade ou semente inválidos.');
 const rules=TRAFFIC_LEVELS[difficulty];
 return {mode,difficulty,seed,phase:'playing',paused:false,turn:0,maxTurns:rules.maxTurns,
  maxQueue:rules.maxQueue,target:rules.target,served:0,urgentServed:0,axis:'none',
  lanes:{N:[],E:[],S:[],W:[]},history:[],
  notice:'Abra um sentido por turno. Evite congestionamentos e libere veículos urgentes.'};
}
export function toggleTrafficPause(state){
 if(!state||state.phase!=='playing')return state;
 return {...state,paused:!state.paused,notice:state.paused?'Operação retomada.':'Operação pausada.'};
}
export function runTrafficTurn(state,axis){
 if(!state||state.phase!=='playing'||state.paused||!['NS','EW'].includes(axis))return state;
 const turn=state.turn+1;
 const lanes=Object.fromEntries(SIDES.map(side=>[side,state.lanes[side].map(vehicle=>({...vehicle}))]));
 const arriving=(turn+state.seed)%2===0?['N','S']:['E','W'];
 for(const side of arriving)lanes[side].push({urgent:false,born:turn});
 if(state.mode==='resgate'&&(turn===3||turn===9))lanes.E.unshift({urgent:true,born:turn});
 let served=state.served,urgentServed=state.urgentServed;
 for(const side of (axis==='NS'?['N','S']:['E','W'])){
  const vehicle=lanes[side].shift();
  if(vehicle){served++;if(vehicle.urgent)urgentServed++;}
 }
 const overflow=SIDES.some(side=>lanes[side].length>state.maxQueue);
 const expired=SIDES.some(side=>lanes[side].some(car=>car.urgent&&turn-car.born>=2));
 let phase='playing',notice='Sinal '+(axis==='NS'?'Norte–Sul':'Leste–Oeste')+' liberado; confira as filas.';
 if(overflow){phase='lost';notice='Derrota: congestionamento acima do limite da via.';}
 else if(expired){phase='lost';notice='Derrota: veículo de emergência perdeu o prazo.';}
 else if(turn>=state.maxTurns){
  const passed=served>=state.target&&(state.mode!=='resgate'||urgentServed===2);
  phase=passed?'won':'lost';
  notice=passed?'Vitória! Você manteve o fluxo e cumpriu as prioridades.':'Derrota: trânsito insuficiente ou resgate incompleto.';
 }
 return {...state,turn,lanes,served,urgentServed,axis,phase,notice,
  history:[...state.history,snapshot(state)].slice(-12)};
}
export function undoTrafficTurn(state){
 if(!state?.history?.length)return state;
 return {...structuredClone(state.history.at(-1)),history:state.history.slice(0,-1),
  notice:'Último turno desfeito. Ajuste a abertura dos semáforos.'};
}
