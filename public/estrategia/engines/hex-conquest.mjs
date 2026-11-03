/** Conquista territorial determinística. Independente do jogo Hex Conexão. */
export const AXIAL_DIRECTIONS=Object.freeze([[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]);
const key=(q,r)=>q+','+r;
const positive=n=>Number.isSafeInteger(n)&&n>0;
const fail=error=>({success:false,error});
const cloneGrid=grid=>new Map([...grid].map(([id,c])=>[id,{...c}]));

export class HexConquestEngine {
 #state;
 #rules;
 constructor(rules,initialState){
  if(!rules||!positive(rules.maxTurns)||!positive(rules.baseTroopCost)||
   !Number.isSafeInteger(rules.supplyPerOwnedHex)||rules.supplyPerOwnedHex<0)
   throw new RangeError('Regras inválidas');
  if(!(initialState?.grid instanceof Map)||!positive(initialState.turn)||
   !Number.isSafeInteger(initialState.playerSupplies)||initialState.playerSupplies<0||
   !Number.isSafeInteger(initialState.enemySupplies)||initialState.enemySupplies<0)
   throw new TypeError('Estado inicial inválido');
  for(const [id,c] of initialState.grid){
   if(!c||!Number.isSafeInteger(c.q)||!Number.isSafeInteger(c.r)||id!==key(c.q,c.r)||
    !['player','enemy','neutral'].includes(c.owner)||!positive(c.troops)||
    !Number.isFinite(c.defenseBonus)||c.defenseBonus<=0)
    throw new TypeError('Hexágono inválido: '+id);
  }
  this.#rules={...rules};
  this.#state={...initialState,grid:cloneGrid(initialState.grid)};
 }
 getState(){return Object.freeze({...this.#state,grid:cloneGrid(this.#state.grid)});}
 evaluateState(){
  const owners=[...this.#state.grid.values()].map(c=>c.owner);
  if(!owners.includes('player'))return 'defeat';
  if(!owners.includes('enemy'))return 'victory';
  return this.#state.turn>this.#rules.maxTurns?'defeat':'playing';
 }
 static adjacent(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  const [q,r]=a.split(',').map(Number),[x,y]=b.split(',').map(Number);
  return AXIAL_DIRECTIONS.some(([dq,dr])=>q+dq===x&&r+dr===y);
 }
 #attack(sourceKey,targetKey,attacker){
  const source=this.#state.grid.get(sourceKey),target=this.#state.grid.get(targetKey);
  if(!source||!target)return fail('Territórios inválidos.');
  if(source.owner!==attacker||target.owner===attacker)return fail('Origem ou destino inválido.');
  if(!HexConquestEngine.adjacent(sourceKey,targetKey))return fail('Territórios não adjacentes.');
  if(source.troops<=1)return fail('A origem deve manter uma tropa.');
  const power=source.troops-1,defense=target.troops*target.defenseBonus;
  if(power>defense){
   target.owner=attacker;
   target.troops=Math.max(1,power-Math.ceil(defense/2));
  }else target.troops=Math.max(1,target.troops-Math.ceil(power*0.4));
  source.troops=1;
  return {success:true};
 }
 #enemyTurn(){
  const frontiers=[...this.#state.grid.entries()].filter(([id,c])=>c.owner==='enemy'&&
   [...this.#state.grid.entries()].some(([otherId,other])=>other.owner!=='enemy'&&HexConquestEngine.adjacent(id,otherId)));
  if(frontiers.length&&this.#state.enemySupplies>=this.#rules.baseTroopCost){
   frontiers.sort((a,b)=>a[1].troops-b[1].troops||a[0].localeCompare(b[0]));
   frontiers[0][1].troops++;
   this.#state.enemySupplies-=this.#rules.baseTroopCost;
  }
  for(let move=0;move<2;move++){
   const candidates=[];
   for(const [fromId,from] of this.#state.grid){
    if(from.owner!=='enemy'||from.troops<=1)continue;
    for(const [toId,to] of this.#state.grid){
     if(to.owner==='enemy'||!HexConquestEngine.adjacent(fromId,toId))continue;
     const margin=from.troops-1-to.troops*to.defenseBonus;
     if(margin>0)candidates.push({fromId,toId,score:margin+(to.owner==='player'?3:0)+(toId==='0,0'?2:0)});
    }
   }
   candidates.sort((a,b)=>b.score-a.score||a.fromId.localeCompare(b.fromId)||a.toId.localeCompare(b.toId));
   if(!candidates.length)break;
   this.#attack(candidates[0].fromId,candidates[0].toId,'enemy');
   if(this.evaluateState()!=='playing')break;
  }
 }
 processAction(action){
  if(this.evaluateState()!=='playing')return fail('A partida já terminou.');
  if(!action||typeof action.type!=='string')return fail('Ação inválida.');
  if(action.type==='SELECT_HEX'){
   const id=key(action.q,action.r);
   if(!this.#state.grid.has(id))return fail('Célula inexistente.');
   this.#state.selectedHexKey=id;
   return {success:true};
  }
  if(action.type==='DEPLOY_TROOPS'){
   if(!positive(action.amount))return fail('Quantidade precisa ser inteiro positivo.');
   const target=this.#state.grid.get(action.targetKey);
   if(!target||target.owner!=='player')return fail('Alvo precisa ser território aliado.');
   const cost=action.amount*this.#rules.baseTroopCost;
   if(!Number.isSafeInteger(cost)||!Number.isSafeInteger(target.troops+action.amount)||cost>this.#state.playerSupplies)
    return fail('Suprimentos insuficientes ou valor inválido.');
   target.troops+=action.amount;
   this.#state.playerSupplies-=cost;
   return {success:true};
  }
  if(action.type==='ATTACK_HEX')return this.#attack(action.sourceKey,action.targetKey,'player');
  if(action.type==='END_TURN'){
   this.#state.selectedHexKey=null;
   this.#enemyTurn();
   if(this.evaluateState()==='playing'){
    const owned=[...this.#state.grid.values()];
    this.#state.playerSupplies+=owned.filter(c=>c.owner==='player').length*this.#rules.supplyPerOwnedHex;
    this.#state.enemySupplies+=owned.filter(c=>c.owner==='enemy').length*this.#rules.supplyPerOwnedHex;
   }
   this.#state.turn++;
   return {success:true};
  }
  return fail('Tipo de ação desconhecido.');
 }
 getBotGuidance(){
  const state=this.getState(),phase=this.evaluateState();
  if(phase!=='playing')return {currentPhase:phase,recommendedAction:'A partida terminou.',tacticalTip:'Reinicie para tentar outra estratégia.'};
  const frontier=[...state.grid.entries()].filter(([id,c])=>c.owner==='player'&&
   [...state.grid.entries()].some(([otherId,other])=>other.owner!=='player'&&HexConquestEngine.adjacent(id,otherId))).length;
  if(state.playerSupplies>=this.#rules.baseTroopCost)
   return {currentPhase:'Turno '+state.turn+' · Reforço',recommendedAction:'Reforce um dos '+frontier+' setores de fronteira com seus '+state.playerSupplies+' suprimentos.',tacticalTip:'Mantenha uma tropa na origem dos ataques.'};
  const center=state.grid.get('0,0');
  return {currentPhase:'Turno '+state.turn+' · Expansão',recommendedAction:center?.owner!=='player'?'Planeje a conquista do centro quando houver força suficiente.':'Expanda a partir dos setores aliados.',tacticalTip:'Cada setor aliado rende '+this.#rules.supplyPerOwnedHex+' suprimentos ao fim do turno.'};
 }
}

/** Configuração de sete setores para o protótipo Domínio Territorial. */
export function createDominioTerritorialGame(){
 const cells=[[0,1,'player',4,1.2],[-1,1,'neutral',1,1],[1,0,'neutral',1,1],[0,0,'neutral',2,1.5],
  [-1,0,'neutral',1,1],[1,-1,'neutral',1,1],[0,-1,'enemy',4,1.2]];
 return new HexConquestEngine({maxTurns:20,baseTroopCost:3,supplyPerOwnedHex:2},{
  grid:new Map(cells.map(([q,r,owner,troops,defenseBonus])=>[key(q,r),{q,r,owner,troops,defenseBonus}])),
  turn:1,playerSupplies:6,enemySupplies:6,selectedHexKey:null
 });
}
