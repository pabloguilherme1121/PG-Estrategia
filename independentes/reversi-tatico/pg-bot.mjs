import {legalReversiMoves,reversiScore} from "./engine.mjs";
export const REVERSI_HELP=Object.freeze(["objetivo","controles","situacao"]);
export function reversiHelp(topic,state){
 if(!REVERSI_HELP.includes(topic))return "Escolha um assunto para consultar o PG Bot.";
 if(!state||!Array.isArray(state.board))return "Abra uma partida para receber uma dica.";
 if(topic==="objetivo")return "No Reversi, coloque uma peça verde que cerque peças laranjas entre duas das suas, nas oito direções. Tente ocupar os quatro cantos. Vence quem terminar com mais peças.";
 if(topic==="controles")return "Use Tab para percorrer casas destacadas e Enter ou Espaço para jogar. O PG Rival responde automaticamente. Use Pausar, Desfazer ou Nova partida sem perder o controle do teclado.";
 const points=reversiScore(state),moves=state.status==="playing"?legalReversiMoves(state,1).length:0;
 const status=state.paused?"Partida pausada. ":state.status==="won"?"Você venceu! ":state.status==="lost"?"O rival venceu. ":state.status==="tie"?"A partida terminou empatada. ":"";
 return status+"Rodadas: "+state.turns+". Você tem "+points.player+" peças; o PG Rival tem "+points.bot+". "+moves+" jogadas disponíveis para você. Tabuleiro "+state.size+"×"+state.size+", nível "+state.difficulty+".";
}
