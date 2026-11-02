import { getMission } from './catalog.mjs';
export const SIZE = 5;
const cell = (r,c) => r*SIZE+c;
const row = id => Math.floor(id/SIZE);
const col = id => id%SIZE;
const neighbors = n => [[row(n)-1,col(n)],[row(n)+1,col(n)],[row(n),col(n)-1],[row(n),col(n)+1]].filter(([r,c])=>r>=0&&r<SIZE&&c>=0&&c<SIZE).map(([r,c])=>cell(r,c));
export function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;}}
const fail = (s,msg) => ({...s,notice:msg});
const complete = (s,won,notice) => ({...s,status:won?'won':'lost',notice});
const count = (a,v) => a.filter(x=>x===v).length;
export function initMission(id){const m=getMission(id);if(!m)throw new Error('Missão inválida');const random=rng(m.seed);let base={id:m.id,family:m.family,status:'playing',turn:0,limit:m.turns,notice:'Escolha sua primeira jogada.',history:[]};
  switch(m.family){
    case 'territorio': {const cells=Array(25).fill(0);cells[0]=1;cells[24]=2;for(const i of [7,8,11,12,13,16,17])if(random()<.21)cells[i]=-1;return {...base,cells,enemyBias:m.seed%11,target:7+(m.level%3),limit:13+(m.level%5)};}
    case 'rotas': {const safe=new Set([0,1,2,3,4,9,14,19,24]);const blocked=Array.from({length:25},(_,i)=>!safe.has(i)&&random()<(.22+m.level*.008));return {...base,blocked,path:[0],goal:24,limit:14+(m.level%6)};}
    case 'economia': return {...base,credits:8+Math.floor(m.level/8),food:4,ore:3,influence:0,target:8+(m.level%4),limit:14+(m.level%5)};
    case 'defesa': {const waves=Array.from({length:7+(m.level%3)},(_,i)=>({lane:Math.floor(random()*3),power:1+Math.floor(random()*(i>3?3:2))}));return {...base,towers:[0,0,0],waves,hp:6,credits:9,limit:waves.length};}
    case 'logistica': {const safe=new Set([0,1,2,3,4,9,14,19,24]);const rocks=Array.from({length:25},(_,i)=>!safe.has(i)&&random()<.18);const crates=[2,14];const pumps=[4,19];for(const n of [...crates,...pumps])rocks[n]=false;return {...base,position:0,rocks,crates,pumps,carried:[],fuel:12,limit:24};}
    case 'cidade': return {...base,energy:3+(m.level%3),water:3+((m.level+1)%3),trust:3+((m.level+2)%3),target:8+(m.level%3),limit:13+(m.level%5)};
    default:throw new Error('Família desconhecida');
  }
}
function updated(s,patch,notice){const history=[...s.history,snapshot(s)].slice(-30);return {...s,...patch,turn:s.turn+1,history,notice};}
function snapshot(s){const {history, ...rest}=s;return structuredClone(rest);}
export function undo(s){if(!s.history?.length)return fail(s,'Não há jogadas para desfazer.');const history=s.history.slice(0,-1);return {...structuredClone(s.history.at(-1)),history,notice:'Última jogada desfeita.'};}
export function legalMoves(s){if(s.status!=='playing')return [];
  if(s.family==='territorio')return s.cells.map((x,i)=>!x&&neighbors(i).some(n=>s.cells[n]===1)?i:-1).filter(i=>i>=0);
  if(s.family==='rotas')return neighbors(s.path.at(-1)).filter(i=>!s.blocked[i]&&!s.path.includes(i));
  if(s.family==='logistica')return s.fuel>0?neighbors(s.position).filter(i=>!s.rocks[i]):[];
  if(s.family==='defesa')return [0,1,2];
  if(s.family==='economia')return ['cultivar','minerar','comerciar','investir'].filter(a=>canPay(s,a));
  if(s.family==='cidade')return ['solar','reservatorio','comunidade','equilibrio'];
  return [];
}
function canPay(s,a){return a==='cultivar'?s.credits>=2:a==='minerar'?s.food>=2:a==='comerciar'?s.ore>=2:a==='investir'?s.credits>=4&&s.ore>=1:false;}
export function play(s,action){if(s.status!=='playing')return fail(s,'Esta partida terminou. Reinicie para jogar novamente.');if(!action||typeof action!=='object')return fail(s,'Comando inválido.');let next;
  if(s.family==='territorio'){
    const id=action.cell;if(!Number.isInteger(id)||!legalMoves(s).includes(id))return fail(s,'Escolha uma área livre ao lado do seu território.');
    const cells=[...s.cells];cells[id]=1;
    const enemy=cells.map((x,i)=>!x&&neighbors(i).some(n=>cells[n]===2)?i:-1).filter(i=>i>=0);
    if(enemy.length)cells[enemy[(s.turn+s.target+s.enemyBias)%enemy.length]]=2;
    next=updated(s,{cells},'Território conquistado. O rival respondeu.');
    if(count(cells,1)>=s.target)return complete(next,true,'Vitória! Sua frente atingiu a meta.');
    if(next.turn>=next.limit||!legalMoves(next).length)return complete(next,false,'Fim da campanha. Replaneje a expansão.');
  }else if(s.family==='rotas'){
    const id=action.cell;if(!Number.isInteger(id)||!legalMoves(s).includes(id))return fail(s,'Continue por uma casa vizinha e sem obstáculos.');
    next=updated(s,{path:[...s.path,id]},'Corredor ampliado.');if(id===s.goal)return complete(next,true,'Vitória! Rota segura estabelecida.');
    if(next.turn>=s.limit||!legalMoves(next).length)return complete(next,false,'Rota bloqueada. Use Reiniciar ou Desfazer.');
  }else if(s.family==='economia'){
    const a=action.type;if(!canPay(s,a))return fail(s,'Recursos insuficientes para esta operação.');let patch={};
    if(a==='cultivar')patch={credits:s.credits-2,food:s.food+4};
    if(a==='minerar')patch={food:s.food-2,ore:s.ore+4};
    if(a==='comerciar')patch={ore:s.ore-2,credits:s.credits+5,influence:s.influence+1};
    if(a==='investir')patch={credits:s.credits-4,ore:s.ore-1,influence:s.influence+3};
    next=updated(s,patch,'Operação executada. Planeje o próximo turno.');
    if(next.influence>=next.target)return complete(next,true,'Vitória! Meta de influência alcançada.');
    if(next.turn>=next.limit||!legalMoves(next).length)return complete(next,false,'Economia sem tempo ou recursos. Tente outra sequência.');
  }else if(s.family==='defesa'){
    if(action.type==='build'){
      const lane=action.lane;if(!Number.isInteger(lane)||lane<0||lane>2)return fail(s,'Escolha uma pista válida.');const price=s.towers[lane]?4:3;
      if(s.credits<price||s.towers[lane]>=4)return fail(s,'Sem créditos ou torre no nível máximo.');
      const towers=[...s.towers];towers[lane]++;next={...s,towers,credits:s.credits-price,history:[...s.history,snapshot(s)].slice(-30),notice:'Defesa posicionada. Inicie a próxima onda.'};
    }else if(action.type==='wave'){
      const wave=s.waves[s.turn];if(!wave)return complete(s,true,'Vitória! Todas as ondas foram vencidas.');
      const shield=s.towers[wave.lane]+Math.floor((s.towers[(wave.lane+1)%3]+s.towers[(wave.lane+2)%3])/3);
      const hp=s.hp-Math.max(0,wave.power-shield);
      next=updated(s,{hp,credits:s.credits+3},hp<s.hp?'Sua base recebeu dano.':'O ataque foi neutralizado.');
      if(hp<=0)return complete(next,false,'A base caiu. Reorganize as torres.');
      if(next.turn>=s.waves.length)return complete(next,true,'Vitória! Todas as ondas foram defendidas.');
    }else return fail(s,'Escolha uma pista ou avance a onda.');
  }else if(s.family==='logistica'){
    const id=action.cell;if(!Number.isInteger(id)||!legalMoves(s).includes(id))return fail(s,'A expedição só anda por casas livres e vizinhas.');
    const carried=s.crates.includes(id)&&!s.carried.includes(id)?[...s.carried,id]:s.carried;
    const fuel=s.pumps.includes(id)?Math.min(15,s.fuel+6):s.fuel-1;
    next=updated(s,{position:id,carried,fuel},carried.length>s.carried.length?'Carga coletada.':s.pumps.includes(id)?'Combustível reabastecido.':'Expedição em movimento.');
    if(id===24&&carried.length===s.crates.length)return complete(next,true,'Vitória! Entrega completa.');
    if(next.turn>=s.limit||fuel<=0)return complete(next,false,'Expedição interrompida. Refaça o percurso.');
  }else if(s.family==='cidade'){
    const a=action.type;let patch;
    if(a==='solar')patch={energy:s.energy+3,water:Math.max(0,s.water-1)};
    else if(a==='reservatorio')patch={water:s.water+3,trust:Math.max(0,s.trust-1)};
    else if(a==='comunidade')patch={trust:s.trust+3,energy:Math.max(0,s.energy-1)};
    else if(a==='equilibrio')patch={energy:s.energy+1,water:s.water+1,trust:s.trust+1};
    else return fail(s,'Projeto desconhecido.');
    next=updated(s,patch,'Projeto executado. Reavalie os indicadores.');
    if(Math.min(next.energy,next.water,next.trust)>=s.target)return complete(next,true,'Vitória! A cidade alcançou o equilíbrio.');
    if(next.turn>=s.limit)return complete(next,false,'O prazo terminou antes do equilíbrio.');
  }
  return next;
}
export function progressValue(s){switch(s.family){case 'territorio':return [count(s.cells,1),s.target];case 'rotas':return [s.path.length-1,8];case 'economia':return [s.influence,s.target];case 'defesa':return [s.turn,s.waves.length];case 'logistica':return [s.carried.length,s.crates.length];case 'cidade':return [Math.min(s.energy,s.water,s.trust),s.target];default:return [0,1];}}
export function validateSession(s){if(!s||typeof s!=='object'||!getMission(s.id)||s.family!==getMission(s.id).family||!['playing','won','lost'].includes(s.status)||!Number.isInteger(s.turn)||s.turn<0||s.turn>60||!Array.isArray(s.history)||s.history.length>30)return false;try{return JSON.stringify(s).length<24000;}catch{return false;}}
