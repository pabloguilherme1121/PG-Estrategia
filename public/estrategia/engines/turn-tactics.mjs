/** Motor de combate em grade: movimento, AP, cobertura e adversário determinístico. */
const fail=error=>({success:false,error});
const positive=n=>Number.isSafeInteger(n)&&n>0;
const cloneGrid=grid=>grid.map(row=>row.map(c=>({...c,unit:c.unit?{...c.unit}:null})));
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export class TurnTacticsEngine {
 #state;
 #maxTurns;
 constructor(config,initial){
  if(!positive(config?.maxTurns)||!Array.isArray(initial?.grid)||!initial.grid.length||
   !initial.grid[0]?.length||!positive(initial.turn))throw new TypeError('Configuração tática inválida');
  const width=initial.grid[0].length,ids=new Set();
  for(const row of initial.grid){
   if(!Array.isArray(row)||row.length!==width)throw new TypeError('O mapa deve ser retangular');
   for(const c of row){
    if(!c||!['plain','cover','obstacle'].includes(c.terrain)||(c.terrain==='obstacle'&&c.unit))
     throw new TypeError('Terreno inválido');
    const u=c.unit;
    if(!u)continue;
    if(typeof u.id!=='string'||!u.id||ids.has(u.id)||!['player','enemy'].includes(u.team)||
     !positive(u.hp)||!positive(u.maxHp)||u.hp>u.maxHp||
     !Number.isSafeInteger(u.ap)||u.ap<0||!positive(u.maxAp)||u.ap>u.maxAp||
     !positive(u.attackDamage)||!positive(u.attackRange))throw new TypeError('Unidade inválida');
    ids.add(u.id);
   }
  }
  this.#maxTurns=config.maxTurns;
  this.#state={turn:initial.turn,activeTeam:initial.activeTeam||'player',grid:cloneGrid(initial.grid)};
 }
 getState(){
  const grid=cloneGrid(this.#state.grid);
  return {...this.#state,grid,
   playerUnitsAlive:grid.flat().filter(c=>c.unit?.team==='player').length,
   enemyUnitsAlive:grid.flat().filter(c=>c.unit?.team==='enemy').length};
 }
 evaluateState(){
  const units=this.#state.grid.flat().map(c=>c.unit?.team);
  if(!units.includes('player'))return 'defeat';
  if(!units.includes('enemy'))return 'victory';
  return this.#state.turn>this.#maxTurns?'defeat':'playing';
 }
 #find(id){for(const [y,row] of this.#state.grid.entries())for(const [x,c] of row.entries())if(c.unit?.id===id)return {x,y,cell:c};return null;}
 #cell(x,y){return this.#state.grid[y]?.[x]||null;}
 #neighbors(x,y){return [[1,0],[0,1],[-1,0],[0,-1]].map(([dx,dy])=>({x:x+dx,y:y+dy})).filter(p=>this.#cell(p.x,p.y));}
 #steps(from,to){
  if(from.x===to.x&&from.y===to.y)return 0;
  const seen=new Set([from.x+','+from.y]),q=[{x:from.x,y:from.y,length:0}];
  for(let i=0;i<q.length;i++)for(const n of this.#neighbors(q[i].x,q[i].y)){
   const c=this.#cell(n.x,n.y),id=n.x+','+n.y;
   if(!c||c.terrain==='obstacle'||c.unit||seen.has(id))continue;
   if(n.x===to.x&&n.y===to.y)return q[i].length+1;
   seen.add(id);q.push({...n,length:q[i].length+1});
  }
  return Infinity;
 }
 #distanceToAttack(from,target,range){
  if(distance(from,target)<=range)return 0;
  const seen=new Set([from.x+','+from.y]),queue=[{x:from.x,y:from.y,steps:0}];
  for(let i=0;i<queue.length;i++){
   const current=queue[i];
   for(const next of this.#neighbors(current.x,current.y)){
    const cell=this.#cell(next.x,next.y),id=next.x+','+next.y;
    if(!cell||cell.terrain==='obstacle'||cell.unit||seen.has(id))continue;
    if(distance(next,target)<=range)return current.steps+1;
    seen.add(id);
    queue.push({...next,steps:current.steps+1});
   }
  }
  return Infinity;
 }
 #attack(attacker,target){
  if(!attacker?.cell.unit||!target?.cell.unit||attacker.cell.unit.team===target.cell.unit.team)
   return fail('Atacante ou alvo inválido.');
  const unit=attacker.cell.unit;
  if(unit.ap<1)return fail('Pontos de ação insuficientes.');
  if(distance(attacker,target)>unit.attackRange)return fail('Alvo fora do alcance.');
  const damage=Math.max(1,Math.floor(unit.attackDamage*(target.cell.terrain==='cover'?0.5:1)));
  unit.ap--;target.cell.unit.hp-=damage;
  if(target.cell.unit.hp<=0)target.cell.unit=null;
  return {success:true};
 }
 processAction(action){
  if(this.evaluateState()!=='playing')return fail('A partida já terminou.');
  if(this.#state.activeTeam!=='player')return fail('Turno do adversário em andamento.');
  if(action?.type==='MOVE'){
   const from=this.#find(action.unitId),to=action.target;
   if(from?.cell.unit?.team!=='player')return fail('Unidade aliada não encontrada.');
   if(!Number.isSafeInteger(to?.x)||!Number.isSafeInteger(to?.y))return fail('Coordenadas inválidas.');
   const target=this.#cell(to.x,to.y);
   if(!target||target.terrain==='obstacle'||target.unit)return fail('Destino bloqueado.');
   const moves=this.#steps(from,to);
   if(!Number.isFinite(moves)||moves<1||moves>from.cell.unit.ap)return fail('Caminho impossível ou AP insuficiente.');
   from.cell.unit.ap-=moves;target.unit=from.cell.unit;from.cell.unit=null;
   return {success:true};
  }
  if(action?.type==='ATTACK'){
   const from=this.#find(action.unitId),to=this.#find(action.targetId);
   if(from?.cell.unit?.team!=='player'||to?.cell.unit?.team!=='enemy')return fail('Unidade ou alvo inválido.');
   return this.#attack(from,to);
  }
  if(action?.type==='END_TURN'){
   this.#state.activeTeam='enemy';this.#enemyTurn();this.#state.turn++;
   for(const row of this.#state.grid)for(const c of row)if(c.unit?.team==='player')c.unit.ap=c.unit.maxAp;
   this.#state.activeTeam='player';
   return {success:true};
  }
  return fail('Tipo de ação desconhecido.');
 }
 #enemyTurn(){
  const ids=this.#state.grid.flat().map(c=>c.unit).filter(u=>u?.team==='enemy').map(u=>u.id).sort();
  for(const id of ids){
   const from=this.#find(id);
   if(!from?.cell.unit||this.evaluateState()!=='playing')break;
   const unit=from.cell.unit;unit.ap=unit.maxAp;
   const players=this.#state.grid.flat().map(c=>c.unit).filter(u=>u?.team==='player').map(u=>this.#find(u.id));
   players.sort((a,b)=>distance(from,a)-distance(from,b)||a.cell.unit.id.localeCompare(b.cell.unit.id));
   const target=players[0];if(!target)break;
   if(distance(from,target)<=unit.attackRange){this.#attack(from,target);continue;}
   const choices=this.#neighbors(from.x,from.y).filter(p=>{
    const c=this.#cell(p.x,p.y);return c&&c.terrain!=='obstacle'&&!c.unit;
   });
   choices.sort((a,b)=>this.#distanceToAttack(a,target,unit.attackRange)-this.#distanceToAttack(b,target,unit.attackRange)||a.y-b.y||a.x-b.x);
   const next=choices.find(p=>Number.isFinite(this.#distanceToAttack(p,target,unit.attackRange)));
   if(next&&unit.ap>0){this.#cell(next.x,next.y).unit=unit;from.cell.unit=null;unit.ap--;}
  }
 }
 getBotGuidance(){
  const state=this.getState();
  if(this.evaluateState()!=='playing')return {currentPhase:'Partida encerrada',recommendedAction:'Inicie outra partida.',tacticalTip:'Revise as decisões.'};
  const exposed=state.grid.flat().filter(c=>c.unit?.team==='player'&&c.terrain!=='cover').length;
  return {currentPhase:'Turno '+state.turn+' · Tática',
   recommendedAction:exposed?'Priorize coberturas e concentre ataques em alvos próximos.':'Avance sem gastar todos os pontos de ação.',
   tacticalTip:'Cobertura reduz pela metade o dano recebido (mínimo de 1 ponto).'};
 }
}
