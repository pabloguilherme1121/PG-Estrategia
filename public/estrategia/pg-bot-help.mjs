// Respostas locais e auditáveis. O PG Bot não coleta mensagens nem faz chamadas de rede.
export const TOPICS = Object.freeze({
  'como-jogar': 'Escolha uma missão no catálogo e use Iniciar desafio. Leia o objetivo, os turnos e as ações disponíveis na arena. Ao concluir uma missão, use Próximo desafio. As 150 missões utilizam seis sistemas de regras, não 150 jogos independentes.',
  progresso: 'Vitórias e favoritos ficam salvos apenas neste navegador. Limpar os dados do site ou trocar de dispositivo pode apagar o progresso. Não há cadastro ou sincronização na nuvem.',
  offline: 'Abra o PG Estratégia conectado à internet pelo menos uma vez. Em HTTPS, o site tenta guardar seus arquivos essenciais para partidas posteriores sem conexão. Na primeira visita ou se o armazenamento estiver bloqueado, pode ser necessária a rede.',
  reiniciar: 'Dentro de uma missão, use Desfazer para voltar uma jogada, quando disponível, ou Reiniciar para começar a mesma missão novamente. Voltar ao catálogo não exclui as vitórias registradas.',
  acessibilidade: 'Use Tab para navegar entre controles e Enter ou Espaço para ativá-los. O tabuleiro também aceita setas para mover o foco. O botão Alternar contraste ajuda na leitura; animações respeitam a preferência de movimento reduzido do sistema.',
});


// Dicas específicas para cada um dos seis motores das 150 missões, sem chamadas externas.
const MISSION_HINTS = Object.freeze({
 'conquista territorial': 'Expanda para casas vizinhas e mantenha dois caminhos de avanço. O rival também conquista áreas; alcance a meta antes do limite de turnos.',
 'rota critica': 'Planeje um caminho contínuo até o destino. Não atravesse bloqueios e use Desfazer para recuperar uma escolha que fechou a rota.',
 'comercio & recursos': 'Alterne produção, comércio e investimentos. Reserve alimento, minério e créditos suficientes para conquistar a meta de influência.',
 'defesa de fronteira': 'Observe qual das três pistas será atacada, construa torres na pista ameaçada e fortaleça sua defesa antes de iniciar a próxima onda.',
 'expedicao tatica': 'Colete todas as cargas, gerencie o combustível e planeje sua passagem pelos postos de abastecimento antes de chegar à saída.',
 'plano da cidade': 'Equilibre energia, água e confiança. O planejamento integrado aumenta os três indicadores, mas custa um turno; use projetos especializados com cuidado.'
});
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function responseFor(topic, missionTitle = '') {
  if (topic === 'dica-missao') {
    const title = normalize(missionTitle);
    return Object.entries(MISSION_HINTS).find(([family]) => title.startsWith(family + ':'))?.[1]
      || 'Abra uma missão na arena para receber uma dica específica da sua mecânica.';
  }
  return Object.hasOwn(TOPICS, topic) ? TOPICS[topic] : 'Selecione um assunto para ver a orientação disponível.';
}

/**
 * Perguntas interpretadas localmente por intenções explícitas. Não é um modelo
 * generativo, não guarda o texto digitado e não acessa serviços externos.
 */
export function answerQuestion(question, context = {}) {
  const raw = typeof question === 'string' && question.length <= 240 ? question.trim() : '';
  const q = normalize(raw);
  const fallback = 'Posso responder perguntas sobre como jogar, dicas da missão, turnos, progresso, favoritos, offline, reinício e acessibilidade. Escolha um assunto acima ou faça outra pergunta.';
  if (!q || raw.length > 240 || /^[^a-z0-9]*$/.test(q)) return { topic: 'fallback', answer: fallback };
  let topic = 'fallback';
  if (/offline|sem (internet|rede|conexao)|desconectad/.test(q)) topic = 'offline';
  else if (/salv|favorit|record|pontua|backup|progresso (salvo|guardado)/.test(q)) topic = 'progresso';
  else if (/teclad|tab\b|acessib|contraste|leitor de tela|movimento reduzido/.test(q)) topic = 'acessibilidade';
  else if (/desfaz|desfazer|reinici|recomec|repetir|reset/.test(q)) topic = 'reiniciar';
  else if (/turno|situacao|status|estado atual|quantas jogadas|quanto falta|minha partida|objetivo atual/.test(q)) topic = 'estado-missao';
  else if (/dica|estrateg|venc|ganh|passar (desta|essa|a) missao|missao|rota|proximo passo/.test(q)) topic = 'dica-missao';
  else if (/como jog|jogar|comec|inicio|regras|ajuda|controles/.test(q)) topic = 'como-jogar';
  if (topic === 'fallback') return { topic, answer: fallback };
  if (topic === 'estado-missao') {
    const title = typeof context.missionTitle === 'string' ? context.missionTitle.slice(0, 120).trim() : '';
    if (!title) return { topic, answer: 'Abra uma missão para consultar seu turno e progresso atuais. O PG Bot não inventa o estado de partidas que não estão abertas.' };
    const turn = /^\d+\s*\/\s*\d+$/.test(context.turn || '') ? context.turn : '';
    const progress = /^\d+\s*\/\s*\d+$/.test(context.progress || '') ? context.progress : '';
    return { topic, answer: 'Missão em andamento: ' + title + '. ' +
      (turn ? 'Turno: ' + turn + '. ' : 'Turno não disponível. ') +
      (progress ? 'Progresso: ' + progress + '. ' : 'Progresso não disponível. ') +
      'Confira o objetivo e os recursos na arena para decidir a próxima jogada.' };
  }
  return { topic, answer: responseFor(topic, context.missionTitle || '') };
}

function currentMissionContext() {
  const arena = document.querySelector('#arena[open]');
  return arena ? {
    missionTitle: arena.querySelector('#arena-title')?.textContent?.trim() || '',
    turn: (arena.querySelector('#arena-turn')?.textContent || '').trim(),
    progress: (arena.querySelector('#arena-progress-text')?.textContent || '').trim(),
  } : {};
}
let initialized = false;
let focusReturn = null;
function showAnswer(dialog, result) {
  const output = dialog.querySelector('#pg-bot-answer');
  if (output) output.textContent = result.answer;
  const label = dialog.querySelector('#pg-bot-answer-topic');
  if (label) label.textContent = {
    'como-jogar': 'Como jogar', 'dica-missao': 'Dica da missão',
    'estado-missao': 'Situação da missão', progresso: 'Progresso',
    offline: 'Offline', reiniciar: 'Controles da partida',
    acessibilidade: 'Acessibilidade', fallback: 'Assuntos disponíveis',
  }[result.topic] || 'Orientação';
  for (const button of dialog.querySelectorAll('[data-help-topic]')) {
    button.setAttribute('aria-pressed', String(button.dataset.helpTopic === result.topic));
  }
}
export function openHelp(trigger = document.activeElement) {
  const dialog = document.getElementById('pg-bot-dialog');
  if (!dialog) return false;
  focusReturn = trigger;
  if (!initialized) {
    for (const button of dialog.querySelectorAll('[data-help-topic]')) {
      button.addEventListener('click', () => {
        const topic = button.dataset.helpTopic;
        const context = currentMissionContext();
        const answer = topic === 'estado-missao' ?
          answerQuestion('situação da missão', context) :
          {topic, answer: responseFor(topic, context.missionTitle || '')};
        showAnswer(dialog, answer);
      });
    }
    const form = dialog.querySelector('#pg-bot-question-form');
    form?.addEventListener('submit', event => {
      event.preventDefault();
      const input = dialog.querySelector('#pg-bot-question');
      showAnswer(dialog, answerQuestion(input?.value || '', currentMissionContext()));
    });
    dialog.querySelector('#pg-bot-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      const target = focusReturn?.isConnected ? focusReturn : document.getElementById('pg-bot-open');
      target?.focus({preventScroll:true});
    });
    initialized = true;
  }
  if (!dialog.open) dialog.showModal();
  if (currentMissionContext().missionTitle) {
    showAnswer(dialog, answerQuestion('situação da missão', currentMissionContext()));
  } else {
    showAnswer(dialog, {topic:'como-jogar',answer:responseFor('como-jogar')});
  }
  dialog.querySelector('[data-help-topic]')?.focus({preventScroll:true});
  return true;
}