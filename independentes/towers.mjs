/** Muralha das Torres: motor de defesa com construcao, upgrades, ondas e economia.
 * Estado puro, sem DOM, rede, temporizadores ou dependencia de frameworks.
 */
export const TOWER_DIFFICULTIES = Object.freeze(['recruta', 'tatico', 'veterano']);
export const TOWER_MODES = Object.freeze(['defesa', 'maratona']);
export const TOWER_PATH = Object.freeze([0, 1, 2, 3, 4, 5, 11, 17, 23, 29, 35]);
const CONFIG = Object.freeze({
  recruta: {base: 7, coins: 18, hp: 3, count: 2, waves: 3},
  tatico: {base: 6, coins: 15, hp: 4, count: 3, waves: 4},
  veterano: {base: 4, coins: 12, hp: 5, count: 4, waves: 5},
});
export const TOWER_TYPES = Object.freeze({
  laser: Object.freeze({name:'Canhao',cost:5,damage:2,range:3}),
  gelo: Object.freeze({name:'Gelo',cost:4,damage:1,range:2}),
});
const validCell = n => Number.isInteger(n) && n >= 0 && n < 36;
const distance = (a,b) => Math.abs(Math.floor(a/6)-Math.floor(b/6))+Math.abs(a%6-b%6);
const score = s => 500 + s.destroyed*50 + s.base*110 + s.coins*5;

export function createTowers({difficulty='recruta', mission='defesa', seed=1}={}) {
  if (!TOWER_DIFFICULTIES.includes(difficulty)) throw new RangeError('Dificuldade invalida');
  if (!TOWER_MODES.includes(mission)) throw new RangeError('Missao invalida');
  if (!Number.isSafeInteger(seed)) throw new RangeError('Semente invalida');
  const config = CONFIG[difficulty];
  return {
    mode:difficulty, mission, seed, phase:'ready', paused:false,
    wave:1, maxWaves:config.waves+(mission==='maratona'?2:0), tick:0, waveTick:0,
    base:config.base, maxBase:config.base, coins:config.coins,
    enemies:[], towers:[], spawned:0, destroyed:0,
    message:'Construa torres nas casas livres e inicie a primeira onda.', score:0,
  };
}
function waveSize(s) { return CONFIG[s.mode].count+s.wave-1+(s.mission==='maratona'?1:0); }
function endWave(s) {
  if (s.spawned < waveSize(s) || s.enemies.length) return s;
  if (s.wave === s.maxWaves) return {...s,phase:'won',score:score(s),message:'Vitoria! Todas as ondas foram contidas.'};
  return {...s,phase:'ready',wave:s.wave+1,coins:s.coins+4,waveTick:0,spawned:0,
    message:'Onda vencida! Receba 4 creditos, aprimore a defesa e inicie a proxima.'};
}
function advance(s) {
  const next={...s,tick:s.tick+1,waveTick:s.waveTick+1,enemies:[],towers:s.towers.map(t=>({...t}))};
  for(const e of s.enemies){
    const position=e.slow?e.position:e.position+1;
    if (position>=TOWER_PATH.length){next.base-=1;continue;}
    next.enemies.push({...e,position,slow:false});
  }
  if (next.spawned<waveSize(next) && next.waveTick%3===1) {
    const health=CONFIG[next.mode].hp+Math.floor((next.wave-1)/2);
    next.enemies.push({id:next.wave*100+next.spawned,position:0,hp:health,slow:false});
    next.spawned++;
  }
  for(const t of next.towers){
    const type=TOWER_TYPES[t.kind];
    const targets=next.enemies.filter(e=>distance(t.cell,TOWER_PATH[e.position])<=type.range+(t.level-1))
      .sort((a,b)=>b.position-a.position || a.id-b.id);
    const target=targets[0];
    if (!target) continue;
    target.hp-=type.damage+(t.level-1);
    if(t.kind==='gelo' && target.hp>0) target.slow=true;
    if(target.hp<=0){next.enemies=next.enemies.filter(e=>e!==target);next.destroyed++;next.coins+=2;}
  }
  if(next.base<=0) return {...next,base:0,phase:'lost',message:'Derrota: a base foi invadida.'};
  const end=endWave(next);
  return end===next?{...next,message:'Onda '+next.wave+': '+next.enemies.length+' inimigo(s) no mapa.'}:end;
}
export function commandTowers(state,action) {
  if (!action || typeof action!=='object' || state.phase==='won' || state.phase==='lost') return state;
  if (action.type==='resume') return state.paused?{...state,paused:false,message:'Defesa retomada.'}:state;
  if (action.type==='pause') return !state.paused?{...state,paused:true,message:'Defesa pausada.'}:state;
  if (state.paused) return state;
  if (action.type==='start') return state.phase==='ready'
    ? {...state,phase:'playing',message:'Onda '+state.wave+' iniciada. Avance para combater.'}:state;
  if (action.type==='tick') return state.phase==='playing'?advance(state):state;
  if (action.type==='build') {
    const type=TOWER_TYPES[action.kind],cell=action.cell;
    if (!validCell(cell)||TOWER_PATH.includes(cell)||!type||state.towers.some(t=>t.cell===cell)||state.coins<type.cost) return state;
    return {...state,coins:state.coins-type.cost,towers:[...state.towers,{cell,kind:action.kind,level:1}],
      message:type.name+' construido na casa '+(cell+1)+'.'};
  }
  if(action.type==='upgrade') {
    const cell=action.cell;
    if(!validCell(cell)||state.coins<4||!state.towers.some(t=>t.cell===cell&&t.level===1)) return state;
    return {...state,coins:state.coins-4,towers:state.towers.map(t=>t.cell===cell?{...t,level:2}:t),
      message:'Torre melhorada para nivel 2.'};
  }
  return state;
}
