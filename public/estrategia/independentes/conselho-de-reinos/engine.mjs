// Conselho dos Reinos: coalizões por votos, diplomacia e rival local determinístico.
export const FACTIONS = Object.freeze([
 {name:"Cidades Livres",seats:3},
 {name:"Guildas Comerciais",seats:2},
 {name:"Academia",seats:2},
 {name:"Guardiões",seats:2}
]);
export const POLICIES = Object.freeze({
 comercio:{name:"Pacto comercial",effects:[1,2,0,-1]},
 paz:{name:"Tratado de paz",effects:[2,1,-1,0]},
 pesquisa:{name:"Acordo científico",effects:[-1,0,2,1]},
 defesa:{name:"Escudo conjunto",effects:[0,-1,1,2]}
});
const LEVELS={recruta:{turns:12,seats:6,pressure:1},tatico:{turns:10,seats:7,pressure:1},veterano:{turns:9,seats:7,pressure:2}};
const clamp=n=>Math.max(0,Math.min(7,n));

export function createCouncil({difficulty="recruta",mode="tratados",seed=7}={}) {
 if(!Object.hasOwn(LEVELS,difficulty)||!["tratados","crise"].includes(mode))throw new RangeError("Dificuldade ou objetivo inválido");
 const level=LEVELS[difficulty];
 return {
  status:"playing",difficulty,mode,seed:Number.isSafeInteger(seed)?seed>>>0:7,
  round:0,maxRounds:mode==="crise"?Math.min(level.turns,6):level.turns,
  requiredSeats:level.seats,pressure:level.pressure,trust:[3,3,3,3],
  influence:5,talks:0,passed:0,goal:mode==="tratados"?3:2,score:0,
  rivalFaction:3,notice:"Converse com as facções, forme uma maioria e apresente seu projeto."
 };
}
export function previewVote(state,policy) {
 const effects=POLICIES[policy]?.effects;
 if(!effects)return {seats:0,supporters:[],required:state.requiredSeats};
 const supporters=FACTIONS.flatMap((faction,index)=>
   state.trust[index]+effects[index]>=4?[index]:[]);
 return {seats:supporters.reduce((total,index)=>total+FACTIONS[index].seats,0),
   supporters,required:state.requiredSeats};
}
function nextRound(state,update) {
 const target=(state.seed+state.round)%FACTIONS.length;
 const trust=[...update.trust];
 trust[target]=clamp(trust[target]-state.pressure);
 const round=state.round+1;
 const common={...update,round,talks:0,rivalFaction:target,trust};
 const won=common.passed>=common.goal;
 const status=won?"won":round>=common.maxRounds?"lost":"playing";
 return {...common,status,score:won?common.passed*120+(common.maxRounds-round)*20+common.influence*10:0};
}
export function commandCouncil(state,action) {
 if(!state||!action||typeof action!=="object")return state;
 if(action.type==="pause"&&state.status==="playing")return {...state,status:"paused",notice:"Conselho em pausa."};
 if(action.type==="resume"&&state.status==="paused")return {...state,status:"playing",notice:"Conselho retomado."};
 if(state.status!=="playing")return state;
 if(action.type==="talk"){
  const index=action.faction;
  if(!Number.isInteger(index)||index<0||index>=FACTIONS.length||
    state.talks>=2||state.influence<1||state.trust[index]>=7)return state;
  const trust=[...state.trust];
  trust[index]++;
  return {...state,trust,talks:state.talks+1,influence:state.influence-1,
    notice:"Negociação com "+FACTIONS[index].name+". A confiança aumentou."};
 }
 if(action.type==="wait"){
  return nextRound(state,{...state,influence:Math.min(7,state.influence+2),notice:"Rodada encerrada. Influência recuperada; o rival agiu."});
 }
 if(action.type==="vote"&&Object.hasOwn(POLICIES,action.policy)){
  const {seats}=previewVote(state,action.policy);
  const approved=seats>=state.requiredSeats;
  const effects=POLICIES[action.policy].effects;
  const trust=state.trust.map((value,i)=>clamp(value+(approved?Math.sign(effects[i]):-1)));
  const next={...state,trust,passed:state.passed+(approved?1:0),
   influence:Math.min(7,state.influence+(approved?1:0)),
   notice:(approved?"Aprovado":"Rejeitado")+": "+POLICIES[action.policy].name+" recebeu "+seats+" de 9 votos. O rival também agiu."};
  const result=nextRound(state,next);
  if(result.status==="won")return {...result,notice:"Vitória: sua coalizão aprovou os acordos necessários!"};
  if(result.status==="lost")return {...result,notice:"Fim do mandato: faltaram acordos para vencer."};
  return result;
 }
 return state;
}
