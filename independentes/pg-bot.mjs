// Conteúdo local e explícito. Sem rede, API ou dados pessoais.
export const BOT_TOPICS = Object.freeze(['objetivo', 'controles', 'situacao', 'dica']);
const TIPS = Object.freeze({
  'frota-oculta': {
    objetivo:'Encontre todas as embarcações inimigas antes que sua base perca integridade. O sonar informa a quantidade de alvos em uma linha.',
    controles:'Toque ou pressione Enter em um quadrante ainda oculto para disparar. Use os botões de sonar e reparo no painel lateral, quando disponíveis.'
  },
  'cartas-de-cerco': {
    objetivo:'Reduza a vida da fortaleza inimiga a zero antes que sua própria fortaleza caia. Combine cartas ofensivas, defesa e energia.',
    controles:'Escolha uma carta que caiba no seu limite de energia. Jogue as cartas na ordem desejada e finalize o turno para receber a resposta rival.'
  },
  'hex-conexao': {
    objetivo:'Conecte suas pedras de norte a sul por casas vizinhas hexagonais. O adversário tenta unir as bordas oeste e leste.',
    controles:'Toque ou pressione Enter sobre uma casa livre. Uma pedra colocada não pode ser movida. Role somente o tabuleiro horizontalmente no celular.'
  },
  'damas-taticas': {
    objetivo:'Capture as peças rivais ou deixe o adversário sem jogadas. Capturas são obrigatórias, saltos podem encadear e peças alcançam promoção.',
    controles:'Selecione uma peça clara e depois uma casa marcada como destino. Use Tab e Enter pelo teclado. O painel permite pausar e retomar.'
  },
  'patrulha-tatica': {
    objetivo:'No combate, neutralize os drones inimigos preservando seu esquadrão. Na extração, recolha o sinal central e retorne à base.',
    controles:'Toque nas casas vizinhas para andar ou nos drones ao alcance para atacar. Use Defender posição e Aplicar kit médico quando necessário.'
  },
  'muralha-das-torres': {
    objetivo:'Proteja a base de ondas inimigas. Na operação Maratona, vença duas ondas adicionais. Planeje o alcance das torres e seus créditos.',
    controles:'Escolha Canhão ou Gelo e toque numa casa livre fora da rota para construir. Toque numa torre para melhorar; use Iniciar onda e Avançar combate.'
  },
  'fronteira-orbital': {
    objetivo:'Na Expansão, conecte cinco colônias. Na Pesquisa, alcance 12 pontos de ciência. Evite que a facção rival domine o mapa.',
    controles:'Escolha a ordem Explorar ou Colonizar e toque em um setor válido. Use Extrair para recursos e Pesquisar quando possuir colônias suficientes.'
  },
  'mercado-de-sombras': {
    objetivo:'Arremate lotes em oito rodadas. Na Coleção, junte quatro famílias; em Patrimônio, alcance 40 pontos. Nos dois casos, supere a coleção rival.',
    controles:'Em cada rodada, ofereça o lance mínimo, um lance médio ou alto. Passar conserva créditos. Reiniciar cria outro leilão com oito lotes.'
  },
  'refugio-do-inverno': {
    objetivo:'No modo Resistência, mantenha a comunidade viva até o último dia. Em Evacuação, construa três sinais e resista pelo menos cinco dias.',
    controles:'Cada ordem avança um dia. Coletar alimentos, cortar lenha, aquecer, descansar e construir sinais gastam recursos; observe o clima.'
  }
});
const MODES=Object.freeze({recruta:'Recruta',tatico:'Tático',veterano:'Veterano'});
// Uma orientação concreta de decisão por mecânica, não uma promessa de vitória.
const HINTS=Object.freeze({
  'frota-oculta':'Use o sonar numa linha com contatos não identificados e compare os disparos anteriores. Não repita um quadrante já investigado; reserve reparos para proteger a base quando a integridade cair.',
  'cartas-de-cerco':'Antes de gastar energia, conte a força do próximo ataque rival. Uma carta defensiva pode preservar mais vida que uma ofensiva; reserve energia para finalizar o turno com segurança.',
  'hex-conexao':'Crie duas possíveis rotas entre suas bordas em vez de depender de um único corredor. Feche pontes entre pedras e observe os espaços que o adversário pode ocupar.',
  'damas-taticas':'Confira capturas obrigatórias antes de mover. Evite entregar uma peça em sequência de saltos; procure avançar sem abandonar a defesa das diagonais.',
  'patrulha-tatica':'No combate, foque um drone de cada vez e proteja os agentes feridos. Na extração, faça um caminho seguro até o sinal central e planeje também o retorno à base.',
  'muralha-das-torres':'Gaste os primeiros créditos em pontos de passagem frequente e compare alcance antes de melhorar. Não esgote os recursos numa torre se duas pistas estiverem ameaçadas.',
  'fronteira-orbital':'Expanda por setores conectados para não isolar suas colônias. Observe o estoque antes de Pesquisar ou Colonizar e bloqueie corredores úteis para a facção adversária.',
  'refugio-do-inverno':'Observe quantos dias de alimento e lenha restam antes de escolher uma ordem. Priorize aquecer nos dias frios e reserve recursos para construir os sinais se estiver evacuando.',
  'mercado-de-sombras':'Avalie o custo restante antes de elevar lances. Distribua créditos entre famílias para cumprir Coleção ou conserve recursos para pontos de Patrimônio; passar pode ser melhor que pagar alto.'
});
export function botMessage(gameId,state={},topic='objetivo') {
  if(!Object.hasOwn(TIPS,gameId)) return 'Escolha um jogo para consultar o PG Bot.';
  if(!BOT_TOPICS.includes(topic)) return 'Selecione um assunto para receber orientação.';
  const game=TIPS[gameId];
  if(topic==='dica'){
    if(state.phase==='won'||state.phase==='lost'||state.paused)return botMessage(gameId,state,'situacao');
    return HINTS[gameId];
  }
  if(topic==='objetivo') {
    if(gameId==='patrulha-tatica' && state.mission==='extracao') return 'Na extração, recolha o sinal central e volte à base com seu esquadrão. Defender e curar também consomem turnos.';
    if(gameId==='fronteira-orbital' && state.mission==='pesquisa') return 'No objetivo Pesquisa, consiga 12 pontos de ciência enquanto protege suas colônias da facção rival.';
    if(gameId==='mercado-de-sombras' && state.mission==='patrimonio') return 'Em Patrimônio, alcance 40 pontos em oito rodadas e supere o rival. Controle seus lances.';
    if(gameId==='muralha-das-torres' && state.mission==='maratona') return 'Na operação Maratona, resista a duas ondas extras. Economize créditos para aprimorar torres antes dos ataques mais fortes.';
    return game.objetivo;
  }
  if(topic==='controles') return game.controles;
  if(state.phase==='won') return 'Você venceu esta partida! Seu resultado é registrado neste navegador. Pode reiniciar e experimentar outra dificuldade.';
  if(state.phase==='lost') return 'A partida terminou em derrota. Reinicie, revise o objetivo e tente uma ordem diferente de ações.';
  if(state.paused) return 'A partida está pausada. Retome no painel de comandos para continuar sem perder esta sessão.';
  const mode=Object.hasOwn(MODES,state.mode)?MODES[state.mode]:'não informado';
  const turn=Number.isSafeInteger(state.turn)&&state.turn>=0?' Turno atual: '+state.turn+'.':'';
  return 'Partida em andamento. Dificuldade: '+mode+'.'+turn+' Observe os indicadores e ações disponíveis. Este PG Bot apresenta dicas prontas, não é uma IA conectada.';
}
/** Respostas baseadas em regras, sem salvar o texto digitado nem chamar rede. */
export function botQuestion(gameId,state={},question=''){
  const fallback='Posso explicar objetivo, estratégia, controles, situação da partida e jogo offline. Escolha um assunto ou escreva outra pergunta.';
  if(!Object.hasOwn(TIPS,gameId))return {topic:'fallback',answer:'Escolha um jogo para consultar o PG Bot.'};
  const raw=typeof question==='string'&&question.length<=240?question.trim():'';
  const q=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(!q||!/[a-z]/.test(q))return {topic:'fallback',answer:fallback};
  if(/offline|sem (internet|rede|conexao)|desconectad/.test(q))
    return {topic:'offline',answer:'O jogo pode funcionar sem internet depois de os arquivos essenciais serem carregados em uma visita conectada. Na primeira visita offline ou sem armazenamento disponível, a partida pode não abrir. Os recordes ficam neste navegador.'};
  let topic='fallback';
  if(/turno|situacao|status|estado|pausad|pontua|record|dificuldade|minha partida/.test(q))topic='situacao';
  else if(/dica|estrateg|venc|ganh|como pass|melhor jogad|proxim(a|o) (passo|jogada)/.test(q))topic='dica';
  else if(/controles|teclado|teclas|tocar|touch|botao|setas|comandos/.test(q))topic='controles';
  else if(/como jog|jogar|objetivo|regras|comec|ajuda|fazer/.test(q))topic='objetivo';
  return {topic,answer:topic==='fallback'?fallback:botMessage(gameId,state,topic)};
}