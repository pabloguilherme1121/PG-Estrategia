// Satélites Orbitais: agendamento de contatos por janelas de observação e energia.
export const ORBITAL_MODES=Object.freeze(["cobertura","economia"]);
export const ORBITAL_LEVELS=Object.freeze({
 recruta:Object.freeze({targets:3,slots:8}),
 tatico:Object.freeze({targets:4,slots:10}),
 veterano:Object.freeze({targets:5,slots:12})
});
const snapshot=g=>({turn:g.turn,energy:g.energy,captured:[...g.captured],phase:g.phase,score:g.score,message:g.message});
const canPlay=g=>g?.phase==="playing"&&!g.paused;
const isWon=g=>{
 if(g.mode==="cobertura")return g.captured.length===g.targets.length;
 const points=g.targets.filter(t=>g.captured.includes(t.id)).reduce((sum,t)=>sum+t.reward,0);
 return points>=g.goal;
};
export function createOrbitals({mode="cobertura",difficulty="recruta",seed=0}={}){
 if(!ORBITAL_MODES.includes(mode)||!Object.hasOwn(ORBITAL_LEVELS,difficulty)||!Number.isSafeInteger(seed)||seed<0||seed>999999999)throw new RangeError("Configuração inválida.");
 const cfg=ORBITAL_LEVELS[difficulty];
 const targets=Array.from({length:cfg.targets},(_,i)=>({
  id:"t"+i,name:["Floresta","Oceano","Deserto","Montanhas","Geleiras"][i],
  start:i*2,end:i*2+2,reward:2+((seed+i*7)%3),
  cost:2,channel:(seed+i)%2?"B":"A"
 }));
 const blocked=Array.from({length:cfg.slots},(_,i)=>i).filter(i=>i%2===1&&(i+seed)%4!==1);
 const total=targets.reduce((n,t)=>n+t.reward,0);
 return {mode,difficulty,seed,slots:cfg.slots,targets,blocked,goal:mode==="economia"?total-1:total,
  turn:0,energy:mode==="economia"?3:4,maxEnergy:mode==="economia"?3:4,captured:[],score:0,
  paused:false,phase:"playing",history:[],message:"Escolha um alvo visível ou aguarde a próxima órbita."};
}
export function stepOrbitals(game,action){
 if(!canPlay(game)||!action||!["capture","wait"].includes(action.kind))return game;
 let target;
 if(action.kind==="capture"){
  target=game.targets.find(t=>t.id===action.target);
  if(!target||game.captured.includes(target.id)||game.turn<target.start||game.turn>target.end
   ||game.blocked.includes(game.turn)||game.energy<target.cost)return game;
 }
 const captured=target?[...game.captured,target.id]:[...game.captured];
 const turn=game.turn+1,energy=Math.min(game.maxEnergy,game.energy-(target?.cost||0)+1);
 const temporary={...game,captured,turn,energy};
 const won=isWon(temporary),phase=won?"won":turn>=game.slots?"lost":"playing";
 const score=won?Math.max(10,400+captured.reduce((n,id)=>n+game.targets.find(t=>t.id===id).reward*40,0)-turn*7):0;
 return {...temporary,phase,score,
  history:[...game.history,snapshot(game)],
  message:won?"Vitória! Transmissões concluídas.":phase==="lost"?"Prazo orbital encerrado.":"Próxima janela de contato."};
}
export function undoOrbitals(game){
 if(!canPlay(game)||!game.history.length)return game;
 const history=game.history.slice(),last=history.pop();
 return {...game,...last,history,message:"Último turno desfeito."};
}
export function toggleOrbitalPause(game){
 return game?.phase==="playing"?{...game,paused:!game.paused,message:game.paused?"Operação retomada.":"Operação pausada."}:game;
}
// BFS sobre o tabuleiro real; a dica nunca executa a jogada e respeita energia e nuvens.
export function hintOrbitals(game){
 if(!canPlay(game))return null;
 const queue=[{state:game,first:null}],seen=new Set(),actions=[{kind:"wait"},...game.targets.map(t=>({kind:"capture",target:t.id}))];
 for(let i=0;i<queue.length&&i<25000;i++){
  const {state,first}=queue[i];
  const key=state.turn+"|"+state.energy+"|"+state.captured.join(",");
  if(seen.has(key))continue;seen.add(key);
  if(state.phase==="won")return first;
  if(state.phase!=="playing")continue;
  for(const action of actions){
   const next=stepOrbitals(state,action);
   if(next===state)continue;
   // Dicas não precisam manter o histórico de ramos.
   queue.push({state:{...next,history:[]},first:first??action});
  }
 }
 return null;
}
