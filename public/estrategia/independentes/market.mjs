// Mercado de Sombras: leilões táticos determinísticos com rival por rodada.
const DIFFICULTY=Object.freeze({recruta:{credits:52,rival:28,pressure:0},tatico:{credits:44,rival:38,pressure:2},veterano:{credits:37,rival:44,pressure:4}});
const MISSIONS=['colecao','patrimonio'];
const LOTS=Object.freeze([
 {name:'Carta das Marés',family:'mapas',value:12,minBid:5},
 {name:'Relógio Solar',family:'tecnologia',value:14,minBid:6},
 {name:'Jardim de Cristal',family:'natureza',value:10,minBid:4},
 {name:'Máscara do Eclipse',family:'arte',value:16,minBid:7},
 {name:'Bússola de Bronze',family:'mapas',value:11,minBid:5},
 {name:'Motor Antigo',family:'tecnologia',value:13,minBid:6},
 {name:'Semente Lunar',family:'natureza',value:15,minBid:7},
 {name:'Mural Gravado',family:'arte',value:10,minBid:4}
]);
function validSeed(seed){return Number.isSafeInteger(seed)&&seed>=0?seed:0;}
export function marketLot(seed,round){return LOTS[(validSeed(seed)+round)%LOTS.length];}
export function marketScore(items){
 const points=items.reduce((n,item)=>n+item.value,0);
 const groups=new Set(items.map(item=>item.family)).size;
 return points+(groups===4?8:groups===3?3:0);
}
export function createMarket({difficulty='recruta',mission='colecao',seed=0}={}){
 if(!Object.hasOwn(DIFFICULTY,difficulty))throw new RangeError('Dificuldade inválida');
 if(!MISSIONS.includes(mission))throw new RangeError('Objetivo inválido');
 const d=DIFFICULTY[difficulty];
 return {mode:difficulty,mission,seed:validSeed(seed),round:0,maxRounds:8,credits:d.credits,rivalCredits:d.rival,player:[],rival:[],phase:'playing',paused:false,score:0,message:'Avalie o primeiro lote e escolha quanto deseja oferecer.'};
}
function rivalBid(state,lot){
 const offered=lot.minBid+DIFFICULTY[state.mode].pressure+((state.seed+state.round)%3);
 return state.rivalCredits>=offered?offered:0;
}
export function commandMarket(state,action){
 if(!state||state.phase!=='playing'||!action||typeof action!=='object')return state;
 if(action.type==='pause'&&!state.paused)return {...state,paused:true,message:'Leilão pausado.'};
 if(action.type==='resume'&&state.paused)return {...state,paused:false,message:'Leilão retomado.'};
 if(state.paused||!['bid','pass'].includes(action.type))return state;
 const lot=marketLot(state.seed,state.round);
 const bid=action.type==='pass'?0:action.amount;
 if(action.type==='bid'&&(!Number.isSafeInteger(bid)||bid<lot.minBid||bid>lot.minBid+6||bid>state.credits))return state;
 const opponent=rivalBid(state,lot);
 const playerWins=bid>0&&(bid>opponent||(bid===opponent&&state.mode==='recruta'));
 const rivalWins=opponent>0&&!playerWins;
 const player=playerWins?[...state.player,lot]:state.player;
 const rival=rivalWins?[...state.rival,lot]:state.rival;
 const credits=state.credits-(playerWins?bid:0);
 const rivalCredits=state.rivalCredits-(rivalWins?opponent:0);
 const round=state.round+1;
 const score=marketScore(player),rivalScore=marketScore(rival);
 const fulfilled=state.mission==='colecao'?new Set(player.map(x=>x.family)).size===4:score>=40;
 const phase=round===state.maxRounds?(fulfilled&&score>rivalScore?'won':'lost'):'playing';
 const message=phase==='won'?'Vitória no mercado! Você cumpriu o objetivo e superou o rival.':phase==='lost'?'Derrota: o objetivo ou a pontuação não foram alcançados. Tente reservar créditos para lotes mais valiosos.':playerWins?'Lote arrematado! Planeje seus créditos para a próxima rodada.':rivalWins?'O rival levou este lote. Guarde créditos para o próximo leilão.':'Nenhum comprador levou este lote.';
 return {...state,round,credits,rivalCredits,player,rival,phase,score,message};
}