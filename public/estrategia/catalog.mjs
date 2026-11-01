export const FAMILIES = Object.freeze([
  { id: 'territorio', title: 'Conquista territorial', tag: 'Tática', tone: 'violet', summary: 'Expanda sua frente antes que a facção rival tome o território.', icon: '◇', guide: 'Toque em uma casa livre vizinha ao seu território. O adversário também expande. Domine a meta antes do limite de turnos.' },
  { id: 'rotas', title: 'Rota crítica', tag: 'Planejamento', tone: 'cyan', summary: 'Abra um corredor entre a base e o objetivo, contornando barreiras.', icon: '⌁', guide: 'Expanda a rota por casas vizinhas. Bloqueios não podem ser atravessados. Use Desfazer para recuar sem gastar turnos.' },
  { id: 'economia', title: 'Comércio & recursos', tag: 'Economia', tone: 'amber', summary: 'Combine produção, comércio e investimentos para atingir a meta.', icon: '▣', guide: 'Cada operação consome um turno e recursos. Gere créditos, alimento, minério e influência para cumprir a meta.' },
  { id: 'defesa', title: 'Defesa de fronteira', tag: 'Defesa', tone: 'coral', summary: 'Escolha posições, fortaleça torres e sobreviva às ondas.', icon: '⬡', guide: 'Toque nas três pistas para construir ou aprimorar torres. Avance uma onda quando estiver pronto. Preserve a base.' },
  { id: 'logistica', title: 'Expedição tática', tag: 'Logística', tone: 'green', summary: 'Colete cargas, gerencie combustível e alcance o destino.', icon: '✦', guide: 'Mova o veículo para casas vizinhas. Colete os pacotes, visite os pontos de reabastecimento e chegue à saída.' },
  { id: 'cidade', title: 'Plano da cidade', tag: 'Gestão', tone: 'blue', summary: 'Equilibre energia, água e confiança pública antes do prazo.', icon: '▤', guide: 'Escolha projetos para equilibrar os três indicadores. Cada projeto ocupa um turno e tem ganhos e custos próprios.' },
]);
const ZONES = ['Aurora', 'Serra', 'Horizonte', 'Estuário', 'Fronteira', 'Mirante', 'Delta', 'Estação', 'Vale', 'Cidadela', 'Orvalho', 'Cânion', 'Órbita', 'Floresta', 'Bastilha', 'Planalto', 'Farol', 'Minério', 'Eclipse', 'Nascente', 'Arquipélago', 'Vórtice', 'Refúgio', 'Ponte', 'Sentinela'];
export const MISSIONS = Object.freeze(FAMILIES.flatMap((family, familyIndex) => ZONES.map((zone, i) => Object.freeze({
  id: `est-${String(familyIndex * 25 + i + 1).padStart(3,'0')}`,
  family: family.id,
  name: `${family.title}: ${zone}`,
  zone,
  level: i + 1,
  difficulty: i < 7 ? 'Iniciante' : i < 17 ? 'Intermediário' : 'Avançado',
  seed: ((familyIndex + 3) * 827 + i * 419 + (i*i*17)) >>> 0,
  turns: 12 + (i % 5),
}))));
export const getMission = id => MISSIONS.find(m => m.id === id) ?? null;
export const getFamily = id => FAMILIES.find(f => f.id === id);
export const EXISTING_STRATEGY = Object.freeze([
  [
    "trem",
    "Trem Sem Freio"
  ],
  [
    "fortalezas",
    "Fortalezas de Turnos"
  ],
  [
    "reles",
    "Rede de Relés"
  ],
  [
    "irrigacao",
    "Zonas de Irrigação"
  ],
  [
    "cidade",
    "Cidade em Miniatura"
  ],
  [
    "alquimia",
    "Alquimia de Elementos"
  ],
  [
    "climas",
    "Cartas de Climas"
  ],
  [
    "colheita",
    "Colheita das Estações"
  ],
  [
    "resgate",
    "Barcos de Resgate"
  ],
  [
    "farois",
    "Defesa de Faróis"
  ],
  [
    "mercadores",
    "Mercadores de Rotas"
  ],
  [
    "trilhos",
    "Trilhos Cruzados"
  ],
  [
    "arquipelago",
    "Pontes do Arquipélago"
  ],
  [
    "contrato",
    "Contrato das Cores"
  ],
  [
    "passagem",
    "Passagem Secreta"
  ],
  [
    "cofre",
    "Cofre em Equipe"
  ],
  [
    "neon",
    "Sobrevivência Neon"
  ],
  [
    "liga4",
    "Liga 4"
  ],
  [
    "puzzle",
    "Quebra-cabeça"
  ],
  [
    "2048",
    "2048"
  ],
  [
    "xadrez",
    "Xadrez"
  ],
  [
    "domino",
    "Dominó"
  ],
  [
    "damas",
    "Damas"
  ],
  [
    "velha",
    "Jogo da velha"
  ],
  [
    "peg",
    "Resta Um"
  ],
  [
    "knight",
    "Caminho do Cavalo"
  ],
  [
    "queens",
    "Oito Rainhas"
  ],
  [
    "slideblock",
    "Saída Livre"
  ],
  [
    "gomoku",
    "Cinco em Linha"
  ],
  [
    "hex",
    "Hex Conexões"
  ],
  [
    "ataxx",
    "Colônia Ataxx"
  ],
  [
    "isolation",
    "Ilhas em Duelo"
  ],
  [
    "breakthrough",
    "Linha de Avanço"
  ],
  [
    "mancala",
    "Mancala"
  ],
  [
    "chomp",
    "Chocolate Tático"
  ],
  [
    "territory",
    "Fronteiras"
  ],
  [
    "sokoban",
    "Sokoban"
  ],
  [
    "nim",
    "Nim"
  ],
  [
    "reversi",
    "Reversi"
  ],
  [
    "batalha",
    "Batalha Naval"
  ],
  [
    "pontes",
    "Pontos e Caixas"
  ],
  [
    "dados",
    "Dados de Combinação"
  ],
  [
    "tendas",
    "Acampamento"
  ],
  [
    "constelacao",
    "Constelação"
  ],
  [
    "trilha-soma",
    "Trilha da Soma"
  ],
  [
    "mochila",
    "Mochila de Expedição"
  ],
  [
    "sapos",
    "Travessia dos Sapos"
  ]
]);
