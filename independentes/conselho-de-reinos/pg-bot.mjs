// Ajuda local e determinística para um jogo fictício; nenhuma API ou coleta de perguntas.
import {FACTIONS,POLICIES,previewVote} from './engine.mjs';

export function councilBotAnswer(topic,state) {
 if(!state||!Array.isArray(state.trust))return 'Abra uma partida para consultar a ajuda.';
 if(topic==='objective'){
  return state.mode==='crise'
   ? 'Seu objetivo é aprovar 2 acordos urgentes antes do fim de '+state.maxRounds+' rodadas. Negocie até formar maioria e vote.'
   : 'Seu objetivo é aprovar 3 tratados antes do fim de '+state.maxRounds+' rodadas. Cada projeto precisa de '+state.requiredSeats+' dos 9 assentos.';
 }
 if(topic==='controls'){
  return 'Use Tab para selecionar Negociar, Votar, Pausar ou Nova partida. Enter e Espaço ativam o botão. Até duas negociações são permitidas antes de cada voto; encerrar a rodada recupera influência.';
 }
 if(topic==='situation'){
  const votes=Object.keys(POLICIES).map(id=>({id,...previewVote(state,id)})).sort((a,b)=>b.seats-a.seats);
  const best=votes[0],name=POLICIES[best.id].name;
  const status=state.status==='paused'?'A partida está pausada. ':state.status==='won'?'A partida terminou em vitória. ':state.status==='lost'?'A partida terminou em derrota. ':'';
  const fragile=state.trust.map((value,i)=>({name:FACTIONS[i].name,value})).sort((a,b)=>a.value-b.value)[0];
  return status+'Rodada '+state.round+'/'+state.maxRounds+'. Influência '+state.influence+', negociações '+state.talks+'/2. Melhor votação disponível: '+name+' com '+best.seats+' assentos (necessários '+state.requiredSeats+'). Menor confiança: '+fragile.name+' ('+fragile.value+'/7).';
 }
 return 'Posso ajudar com objetivo, controles e situação atual do Conselho.';
}
