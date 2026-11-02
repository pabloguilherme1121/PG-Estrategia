// Ajuda puramente local, com regras gerais sem revelar a senha secreta.
export const CIPHER_HELP=Object.freeze(['objetivo','controles','situacao']);
export function cipherHelp(topic,state){
 if(!CIPHER_HELP.includes(topic))return 'Escolha um assunto para consultar o PG Bot.';
 if(!state||!Array.isArray(state.history))return 'Abra uma partida para receber dicas.';
 const size=state.mode==='expedicao'?5:4;
 if(topic==='objetivo')return 'Seu objetivo é decifrar '+size+' símbolos sem repetições. Cada tentativa informa os exatos e os deslocados; use os resultados anteriores para eliminar combinações.';
 if(topic==='controles')return 'Use Tab para escolher cada símbolo no seletor, setas para trocar e Enter para confirmar a tentativa. Os botões Revelar uma posição, Pausar e Nova senha também funcionam por teclado ou toque.';
 const status=state.paused?'A partida está pausada. ':state.status==='won'?'Vitória confirmada! ':state.status==='lost'?'O prazo acabou. ':'';
 const last=state.history.at(-1);
 const feedback=last?' Na última tentativa: '+last.exact+' exatos e '+last.misplaced+' deslocados.':' Nenhuma tentativa registrada.';
 return status+'Tentativas '+state.history.length+'/'+state.maxAttempts+'. Restam '+state.hintsRemaining+' dicas. '+feedback+' Faça mudanças em posições diferentes para testar hipóteses.';
}