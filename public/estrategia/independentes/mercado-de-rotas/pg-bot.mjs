// Suporte local para o Mercado de Rotas. Não armazena mensagens nem acessa rede.
import { TRADE_CITIES, tradeCargoSize } from "./game.mjs";
export const MARKET_BOT_TOPICS=Object.freeze(["objetivo","controles","situacao"]);
export function marketBotAnswer(topic,state) {
 if(!MARKET_BOT_TOPICS.includes(topic)) return "Escolha um assunto para consultar a ajuda.";
 if(!state||!Number.isInteger(state.position)||!TRADE_CITIES[state.position])return "Abra uma partida para consultar o PG Bot.";
 if(topic==="objetivo"){
   return state.mission==="contratos"
     ? "Entregue 2 grãos na Metrópole e 1 metal no Porto Norte. Compre no Vale Verde, observe os preços, planeje os pedágios e abasteça antes de viajar."
     : "Acumule "+state.target+" créditos antes do dia "+state.maxTurns+". Compre nas cidades baratas, venda onde o preço é maior e reserve dinheiro para combustível.";
 }
 if(topic==="controles"){
   return "Use Tab e Enter para selecionar cidades conectadas, comprar e vender mercadorias, reabastecer, ampliar a carga, pausar ou reiniciar. Cada operação válida consome um dia. Os comandos indisponíveis ficam desativados.";
 }
 const city=TRADE_CITIES[state.position].name;
 const rival=TRADE_CITIES[state.rival.position]?.name||"desconhecida";
 const situation="Dia "+state.turn+"/"+state.maxTurns+". Você está em "+city+", com "+state.credits+
   " créditos, "+state.fuel+" de combustível e "+tradeCargoSize(state)+"/"+state.capacity+
   " de carga. Rival em "+rival+". ";
 if(state.phase==="paused")return "A partida está pausada. "+situation;
 if(state.phase==="won")return "Vitória concluída! "+situation;
 if(state.phase==="lost")return "Fim do prazo, derrota. "+situation;
 return situation+(state.fuel<=1?"Considere reabastecer antes de viajar.":"Confira preços e rotas antes de agir.");
}
