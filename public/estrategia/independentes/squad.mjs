/** Patrulha Tática: motor independente de tática por turnos.
 * Combate e extração, cobertura, medicina e rival local determinístico.
 * Sem DOM, rede, armazenamento, temporizadores ou estado global mutável.
 */
export const SQUAD_DIFFICULTIES=Object.freeze(['recruta','tatico','veterano']);
export const SQUAD_MODES=Object.freeze(['combate','extracao']);
const CONFIG=Object.freeze({
  recruta:{hp:12,ammo:15,kits:2,enemyHp:2,enemyDamage:1,cadence:2,turns:30},
  tatico:{hp:9,ammo:12,kits:1,enemyHp:3,enemyDamage:1,cadence:1,turns:25},
  veterano:{hp:7,ammo:10,kits:1,enemyHp:4,enemyDamage:2,cadence:1,turns:22},
});
const ROCKS=Object.freeze([7,17]);
const at=p=>[Math.floor(p/5),p%5];
const distance=(a,b)=>Math.abs(at(a)[0]-at(b)[0])+Math.abs(at(a)[1]-at(b)[1]);
const adjacent=p=>[p-5,p+5,p-1,p+1].filter(q=>q>=0&&q<25&&distance(p,q)===1);
const safeCell=p=>Number.isInteger(p)&&p>=0&&p<25;
const alive=s=>s.enemies.filter(e=>e.hp>0);
export function createSquad({difficulty='recruta',mission='combate',seed=31}={}){
  if(!SQUAD_DIFFICULTIES.includes(difficulty)||!SQUAD_MODES.includes(mission)||!Number.isSafeInteger(seed))throw new RangeError('Modo, dificuldade ou semente inválidos');
  const c=CONFIG[difficulty];
  return {id:'patrulha-tatica',mode:difficulty,mission,seed,phase:'playing',turn:0,maxTurns:c.turns,
    units:[{pos:20,hp:c.hp}],maxHealth:c.hp,ammo:c.ammo,kits:c.kits,guarded:false,
    enemies:[{pos:2+(seed&1),hp:c.enemyHp},{pos:4,hp:c.enemyHp}],enemyDamage:c.enemyDamage,enemyCadence:c.cadence,
    rocks:[...ROCKS],rescued:false,score:0,
    message:mission==='combate'?'Neutralize os dois drones com posicionamento e cobertura.':'Alcance o sinal no centro e retorne à base 20.'};
}
export function legalSquadMoves(s){
  if(s?.phase!=='playing')return [];
  const p=s.units[0].pos,occupied=new Set(alive(s).map(e=>e.pos));
  return adjacent(p).filter(q=>!s.rocks.includes(q)&&!occupied.has(q));
}
function enemyTurn(s){
  if(s.phase!=='playing'||s.turn%s.enemyCadence!==0)return s;
  const idx=(Math.floor(s.turn/s.enemyCadence)-1)%s.enemies.length;
  const e=s.enemies[idx];if(!e||e.hp<=0)return s;
  const target=s.units[0].pos;let moved={...e},hp=s.units[0].hp;
  if(distance(e.pos,target)<=2){hp=Math.max(0,hp-Math.max(0,s.enemyDamage-(s.guarded?2:0)));}
  else {
    const occupied=new Set(s.enemies.filter((v,i)=>i!==idx&&v.hp>0).map(v=>v.pos));
    const options=adjacent(e.pos).filter(q=>!s.rocks.includes(q)&&!occupied.has(q)&&q!==target);
    options.sort((a,b)=>distance(a,target)-distance(b,target)||a-b);
    if(options.length&&distance(options[0],target)<distance(e.pos,target))moved={...e,pos:options[0]};
  }
  const enemies=s.enemies.map((v,i)=>i===idx?moved:v);
  return {...s,units:[{...s.units[0],hp}],enemies,guarded:false,
    message:hp<s.units[0].hp?'O adversário atingiu seu esquadrão.':s.message,
    phase:hp===0?'lost':s.phase};
}
export function commandSquad(s,a){
  if(s?.phase!=='playing'||!a||typeof a!=='object'||Array.isArray(a))return s;
  let next;const me=s.units[0];
  if(a.type==='move'){
    if(!safeCell(a.cell)||!legalSquadMoves(s).includes(a.cell))return s;
    const rescued=s.rescued||(s.mission==='extracao'&&a.cell===12);
    next={...s,units:[{...me,pos:a.cell}],rescued,message:rescued&&!s.rescued?'Sinal encontrado. Retorne à base na casa 20.':'Posição atualizada.'};
  }else if(a.type==='attack'){
    if(!Number.isInteger(a.target)||a.target<0||a.target>=s.enemies.length||s.ammo<=0)return s;
    const enemy=s.enemies[a.target];if(enemy.hp<=0||distance(me.pos,enemy.pos)>2)return s;
    const enemies=s.enemies.map((e,i)=>i===a.target?{...e,hp:Math.max(0,e.hp-2)}:e);
    next={...s,enemies,ammo:s.ammo-1,message:enemies[a.target].hp===0?'Drone neutralizado.':'Alvo atingido.'};
  }else if(a.type==='guard')next={...s,guarded:true,message:'Cobertura ativa até a resposta adversária.'};
  else if(a.type==='heal'){
    if(s.kits<=0||me.hp>=s.maxHealth)return s;
    next={...s,kits:s.kits-1,units:[{...me,hp:Math.min(s.maxHealth,me.hp+3)}],message:'Medicina de campanha aplicada.'};
  }else return s;
  next={...next,turn:s.turn+1};
  const won=next.mission==='combate'?alive(next).length===0:next.rescued&&next.units[0].pos===20;
  if(won)return {...next,phase:'won',score:1000+next.units[0].hp*75+(next.maxTurns-next.turn)*35,message:'Vitória! Objetivo tático concluído.'};
  next=enemyTurn(next);
  if(next.phase==='lost'||next.turn>=next.maxTurns)return {...next,phase:'lost',message:'Derrota: objetivo não alcançado no prazo ou sem sobreviventes.'};
  return next;
}
