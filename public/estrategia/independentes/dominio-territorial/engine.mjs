/**
 * Domínio Territorial: motor puro, determinístico e serializável.
 * Nenhuma operação toca DOM, rede, storage ou timers.
 */
export const AXIAL_DIRECTIONS=Object.freeze([[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]);
export const GAME_RULES=Object.freeze({
  id:'dominio-territorial',maxTurns:20,supplyPerOwnedHex:2,baseTroopCost:3
});
const LEVELS=Object.freeze({
  recruta:{enemySupplies:3,enemyTroops:3,playerTroops:5},
  tatico:{enemySupplies:6,enemyTroops:4,playerTroops:4},
  veterano:{enemySupplies:9,enemyTroops:5,playerTroops:4}
});
const HEXES=Object.freeze([
  {q:0,r:1,owner:'player',troops:4,defenseBonus:1.2},
  {q:-1,r:1,owner:'neutral',troops:1,defenseBonus:1},
  {q:1,r:0,owner:'neutral',troops:1,defenseBonus:1},
  {q:0,r:0,owner:'neutral',troops:2,defenseBonus:1.5},
  {q:-1,r:0,owner:'neutral',troops:1,defenseBonus:1},
  {q:1,r:-1,owner:'neutral',troops:1,defenseBonus:1},
  {q:0,r:-1,owner:'enemy',troops:4,defenseBonus:1.2}
]);
const MAX_HISTORY=30;
export const hexKey=(q,r)=>q+','+r;
export function axialNeighbors(key){
  if(typeof key!=='string'||!/^[-]?[0-9]+,[-]?[0-9]+$/.test(key))return [];
  const [q,r]=key.split(',').map(Number);
  return AXIAL_DIRECTIONS.map(([dq,dr])=>hexKey(q+dq,r+dr));
}
const sideCount=(grid,side)=>Object.values(grid).filter(c=>c.owner===side).length;
const snapshot=state=>({
  grid:structuredClone(state.grid),turn:state.turn,playerSupplies:state.playerSupplies,
  enemySupplies:state.enemySupplies,selected:state.selected,
  phase:state.phase,lastEvent:state.lastEvent
});
function commit(previous,next){
  const history=[...previous.history,snapshot(previous)].slice(-MAX_HISTORY);
  return {...next,history};
}
function outcome(state){
  const grid=state.grid;
  if(grid['0,0'].owner==='player'&&grid['0,-1'].owner==='player')return 'victory';
  if(!sideCount(grid,'player')||state.turn>GAME_RULES.maxTurns)return 'defeat';
  return 'playing';
}
export function createDomainGame({difficulty='tatico'}={}){
  if(!Object.hasOwn(LEVELS,difficulty))throw new RangeError('Dificuldade desconhecida');
  const rule=LEVELS[difficulty];
  const cells=HEXES.map(cell=>({...cell}));
  cells.find(c=>c.owner==='player').troops=rule.playerTroops;
  cells.find(c=>c.owner==='enemy').troops=rule.enemyTroops;
  return {
    id:GAME_RULES.id,difficulty,grid:Object.fromEntries(cells.map(c=>[hexKey(c.q,c.r),c])),
    turn:1,playerSupplies:6,enemySupplies:rule.enemySupplies,
    selected:null,phase:'playing',lastEvent:'Selecione sua base ou toque em um setor aliado.',history:[]
  };
}
const legalKey=key=>typeof key==='string'&&/^-?[0-9]+,-?[0-9]+$/.test(key);
const adjacent=(source,target)=>axialNeighbors(source).includes(target);
export function legalAttacks(state,owner='player'){
  if(!state||state.phase!=='playing')return [];
  return Object.entries(state.grid).flatMap(([source,c])=>
    c.owner!==owner||c.troops<=1?[]:
    axialNeighbors(source).filter(target=>state.grid[target]&&state.grid[target].owner!==owner)
      .map(target=>({source,target,attackPower:c.troops-1,defensePower:state.grid[target].troops*state.grid[target].defenseBonus})));
}
function resolveAttack(state,source,target,owner){
  const from=state.grid[source],to=state.grid[target];
  if(!from||!to||from.owner!==owner||to.owner===owner||from.troops<=1||!adjacent(source,target))return null;
  const grid={...state.grid,[source]:{...from,troops:1}};
  const power=from.troops-1,defense=to.troops*to.defenseBonus;
  const captured=power>defense;
  grid[target]=captured
    ? {...to,owner,troops:Math.max(1,power-Math.ceil(defense/2))}
    : {...to,troops:Math.max(1,to.troops-Math.ceil(power/3))};
  return {grid,captured};
}
function aiTurn(state){
  let next={...state,grid:{...state.grid}};
  const enemyOwned=Object.entries(next.grid).filter(([,c])=>c.owner==='enemy');
  const frontier=enemyOwned.filter(([key])=>axialNeighbors(key).some(n=>next.grid[n]&&next.grid[n].owner!=='enemy'));
  if(frontier.length&&next.enemySupplies>=GAME_RULES.baseTroopCost){
    frontier.sort((a,b)=>a[1].troops-b[1].troops||a[0].localeCompare(b[0]));
    const key=frontier[0][0],cell=next.grid[key];
    next={...next,enemySupplies:next.enemySupplies-GAME_RULES.baseTroopCost,
      grid:{...next.grid,[key]:{...cell,troops:cell.troops+1}}};
  }
  const choices=legalAttacks(next,'enemy').filter(a=>a.attackPower>a.defensePower);
  choices.sort((a,b)=>{
    const score=x=>(x.target==='0,0'?8:0)+(next.grid[x.target].owner==='player'?5:1)+
      (x.attackPower-x.defensePower)*0.1;
    return score(b)-score(a)||a.target.localeCompare(b.target)||a.source.localeCompare(b.source);
  });
  if(choices.length){
    const hit=resolveAttack(next,choices[0].source,choices[0].target,'enemy');
    if(hit)next={...next,grid:hit.grid,lastEvent:'O adversário conquistou o setor '+choices[0].target+'.'};
  }else next={...next,lastEvent:'O adversário reforçou sua posição e aguardou.'};
  return next;
}
export function actDomain(state,action){
  if(!state||!state.grid||!action||typeof action!=='object')return state;
  if(action.type==='RESTART')return createDomainGame({difficulty:state.difficulty});
  if(action.type==='PAUSE'&&['playing','paused'].includes(state.phase))
    return {...state,phase:state.phase==='playing'?'paused':'playing',
      lastEvent:state.phase==='playing'?'Partida pausada.':'Partida retomada.'};
  if(action.type==='UNDO'&&state.phase!=='paused'&&state.history?.length){
    const previous=state.history.at(-1);
    return {...state,...structuredClone(previous),history:state.history.slice(0,-1)};
  }
  if(state.phase!=='playing')return state;
  if(action.type==='SELECT'){
    if(!legalKey(action.target))return state;
    const cell=state.grid[action.target];
    if(!cell||cell.owner!=='player')return state;
    return {...state,selected:state.selected===action.target?null:action.target};
  }
  if(action.type==='DEPLOY'){
    if(!legalKey(action.target)||!Number.isInteger(action.amount)||action.amount<1||action.amount>3)return state;
    const cell=state.grid[action.target],cost=action.amount*GAME_RULES.baseTroopCost;
    if(!cell||cell.owner!=='player'||cost>state.playerSupplies)return state;
    return commit(state,{...state,grid:{...state.grid,[action.target]:{...cell,troops:cell.troops+action.amount}},
      playerSupplies:state.playerSupplies-cost,lastEvent:'Reforço de '+action.amount+' tropa(s) no setor '+action.target+'.'});
  }
  if(action.type==='ATTACK'){
    if(!legalKey(action.source)||!legalKey(action.target))return state;
    const result=resolveAttack(state,action.source,action.target,'player');
    if(!result)return state;
    const next={...state,grid:result.grid,selected:result.captured?action.target:action.source,
      lastEvent:result.captured?'Setor '+action.target+' conquistado.':'Ataque resistido no setor '+action.target+'.'};
    next.phase=outcome(next);
    return commit(state,next);
  }
  if(action.type==='END_TURN'){
    const early=outcome(state);
    if(early!=='playing')return commit(state,{...state,phase:early,lastEvent:early==='victory'?'Bastião e base rival conquistados.':'Partida encerrada.'});
    let next=aiTurn(state);
    const playerHexes=sideCount(next.grid,'player'),enemyHexes=sideCount(next.grid,'enemy');
    next={...next,turn:state.turn+1,playerSupplies:state.playerSupplies+playerHexes*GAME_RULES.supplyPerOwnedHex,
      enemySupplies:next.enemySupplies+enemyHexes*GAME_RULES.supplyPerOwnedHex,selected:null};
    next.phase=outcome(next);
    if(next.phase==='victory')next.lastEvent='Vitória: o bastião e a base rival estão sob seu controle.';
    if(next.phase==='defeat')next.lastEvent='Derrota: suas forças acabaram ou o prazo foi ultrapassado.';
    return commit(state,next);
  }
  return state;
}
export function domainGuidance(state){
  const owned=sideCount(state.grid,'player');
  const enemy=sideCount(state.grid,'enemy');
  const center=state.grid['0,0'];
  const options=legalAttacks(state).filter(a=>a.attackPower>a.defensePower);
  const best=options.sort((a,b)=>(b.target==='0,0'?4:0)-(a.target==='0,0'?4:0)||b.attackPower-a.attackPower)[0];
  const front=Object.entries(state.grid).filter(([key,c])=>c.owner==='player'&&axialNeighbors(key).some(x=>state.grid[x]?.owner==='enemy'));
  const recommend=state.phase==='victory'?'Partida concluída: você conquistou os dois objetivos.'
    :state.phase==='defeat'?'Partida encerrada: reinicie para tentar outra estratégia.'
    :state.phase==='paused'?'Retome a partida para executar novas decisões.'
    :best?'Ataque legal disponível: '+best.source+' → '+best.target+'.'
    :state.playerSupplies>=GAME_RULES.baseTroopCost?'Reforce uma posição aliada na fronteira ou expanda pelos flancos.'
    :'Termine o turno para obter suprimentos das posições controladas.';
  return {
    currentPhase:'Turno '+state.turn+' · '+state.phase,
    recommendedAction:recommend,
    tacticalTip:center.owner!=='player'
      ?'O bastião central (0,0) tem defesa reforçada de 1,5×. Compare tropas e adjacência antes do ataque.'
      :'Mantenha o bastião e avance até a base adversária (0,-1) com uma guarnição de reserva.',
    metrics:{turn:state.turn,playerSupplies:state.playerSupplies,enemySupplies:state.enemySupplies,
      playerHexes:owned,enemyHexes:enemy,vulnerableFrontiers:front.length},
    strategyPlan:[
      owned<3?'Aumente a renda capturando flancos neutros adjacentes.':'Administre os suprimentos gerados pelos '+owned+' territórios aliados.',
      center.owner!=='player'?'Prepare tropas suficientes para superar a defesa do bastião central.':'Defenda o bastião central (0,0) e evite expor o caminho de suprimentos.',
      'Planeje o avanço até a base (0,-1) antes do limite de '+GAME_RULES.maxTurns+' turnos.'
    ]
  };
}