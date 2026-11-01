import { createNaval, commandNaval } from "./naval.mjs";
import { createSiege, playSiegeCard, endSiegeTurn, SIEGE_CARDS } from "./siege.mjs";
import { createHex, playHex } from "./hex.mjs";
import { createSquad, commandSquad, legalSquadMoves } from "./squad.mjs";
import { createTowers, commandTowers, TOWER_TYPES, TOWER_PATH } from "./towers.mjs";
import { createFrontier, commandFrontier, canFrontierAction } from "./frontier.mjs";
import { createWinter, commandWinter, canWinterAction } from "./winter.mjs";
import { createDraughts, commandDraughts, legalDraughtsMoves } from "./draughts.mjs";
import { botMessage, botQuestion, BOT_TOPICS } from "./pg-bot.mjs";
import { createMarket, commandMarket, marketLot, marketScore } from "./market.mjs";

const $ = id => document.getElementById(id);
const STORAGE = "pg-strategy-original-records-v1";
const GAMES = {
  "frota-oculta": { name: "Frota Oculta", intro: "Localize a frota inimiga num mapa 6×6. Cada disparo consome um turno; use o sonar para deduzir a posição das embarcações.", instructions: "Toque em um quadrante para atacar. Sonar revela o número de navios numa linha, mas gasta um turno. Reparos preservam sua base sob pressão.", init: createNaval },
  "cartas-de-cerco": { name: "Cartas de Cerco", intro: "Monte sua ofensiva com as cartas disponíveis, distribua energia e sobreviva aos ataques de uma fortaleza inimiga.", instructions: "Jogue cartas de sua mão gastando energia. Fortificar bloqueia o próximo ataque; Aríete causa dano elevado. Encerrar o turno permite que o rival ataque.", init: createSiege },
  "damas-taticas": { name: "Damas Táticas", intro: "Partida de damas 8×8 contra o computador, com captura obrigatória, múltiplos saltos e promoção a dama.", instructions: "Toque numa peça clara e depois na casa destacada para mover. Se houver captura, ela é obrigatória. A dama pode andar nas diagonais nos dois sentidos.", init: createDraughts },
  "hex-conexao": { name: "Hex Conexão", intro: "Conecte de cima até embaixo num tabuleiro hexagonal de 49 casas. O rival tenta unir as bordas esquerda e direita.", instructions: "Selecione uma casa livre para colocar uma pedra. O adversário responde automaticamente. Você ganha ao criar uma cadeia contínua entre as bordas norte e sul.", init: createHex },
  "refugio-do-inverno": { name: "Refúgio do Inverno", intro: "Gerencie um abrigo durante nevascas, com alimentos, lenha, aquecimento e moral dos moradores.", instructions: "Cada ordem consome um dia. Alimente a comunidade e mantenha o aquecimento; escolha sobreviver até o último dia ou construir três sinais para evacuar após cinco dias.", init: createWinter },
  "fronteira-orbital": { name: "Fronteira Orbital", intro: "Explore um setor 4×4 sob névoa, colonize planetas vizinhos, pesquise tecnologias e dispute o mapa com uma facção rival.", instructions: "Selecione Explorar e toque num setor vizinho revelável. Depois use Colonizar numa área explorada e conectada à sua base. Pesquisa exige pelo menos duas colônias e avança ciência; Extrair repõe recursos. A facção rival cresce a cada rodada, conforme a dificuldade.", init: createFrontier },
  "muralha-das-torres": { name: "Muralha das Torres", intro: "Construa torres, defenda uma rota de 11 casas e administre créditos em ondas crescentes.", instructions: "Escolha Canhão ou Gelo e toque numa casa livre para construir. Toque numa torre de nível 1 para aprimorá-la por 4 créditos. Inicie cada onda e avance os turnos para observar a defesa.", init: createTowers },
  "mercado-de-sombras": { name: "Mercado de Sombras", intro: "Leilões por turnos: arremate oito lotes, planeje créditos e dispute uma coleção com um rival automático.", instructions: "Em cada rodada escolha um lance baixo, médio, alto ou passe. Lances altos aumentam as chances contra o rival, mas reduzem o caixa para as próximas rodadas. Vença reunindo as quatro famílias ou acumulando patrimônio.", init: createMarket },
  "patrulha-tatica": { name: "Patrulha Tática", intro: "Conduza um esquadrão por um mapa 5×5. Elimine drones ou recupere um sinal e volte à base.", instructions: "Toque ou use Tab/Enter nas casas livres vizinhas para mover. Ataque drones ao alcance de duas casas; também pode se defender ou curar. Troque o objetivo para uma operação de extração.", init: createSquad },
};
let gameId = Object.hasOwn(GAMES, location.hash.slice(1)) ? location.hash.slice(1) : "frota-oculta";
let current;
let selectedDraughts = null;
let botTopic = 'objetivo';
let records = {};
try {
  const raw = JSON.parse(localStorage.getItem(STORAGE) || "{}");
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    records = Object.fromEntries(Object.entries(raw).filter(([key, value]) =>
      /^(frota-oculta|cartas-de-cerco|hex-conexao):(recruta|tatico|veterano)$|^patrulha-tatica:(recruta|tatico|veterano):(combate|extracao)$|^muralha-das-torres:(recruta|tatico|veterano):(defesa|maratona)$|^fronteira-orbital:(recruta|tatico|veterano):(expansao|pesquisa)$|^refugio-do-inverno:(recruta|tatico|veterano):(resistencia|evacuacao)$|^damas-taticas:(recruta|tatico|veterano)$|^mercado-de-sombras:(recruta|tatico|veterano):(colecao|patrimonio)$/.test(key) &&
      Number.isSafeInteger(value) && value >= 0 && value < 100000));
  }
} catch { records = {}; }
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function action(label, callback, className = "", disabled = false) {
  const b = el("button", className, label);
  b.type = "button";
  b.disabled = disabled;
  b.addEventListener("click", callback);
  return b;
}
function number(seed) {
  return Math.floor((seed >>> 0) % 100000) + 31;
}
function newGame(id = gameId) {
  if (!Object.hasOwn(GAMES,id)) return;
  if (id !== gameId) {
    botTopic = 'objetivo';
    $("pg-bot-question").value = '';
    document.querySelectorAll('[data-pg-bot-topic]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.pgBotTopic === botTopic)));
  }
  gameId = id;
  selectedDraughts = null;
  const mode = $("difficulty").value;
  const seed = number(Math.floor(Math.random() * 0xffffffff));
  current = GAMES[id].init({ difficulty: mode, seed, mission: id === "muralha-das-torres" ? $("tower-mode").value : id === "fronteira-orbital" ? $("frontier-mode").value : id === "refugio-do-inverno" ? $("winter-mode").value : id === "mercado-de-sombras" ? $("market-mode").value : $("squad-mode").value });
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  document.querySelectorAll("[data-select]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.select === id));
  });
  render();
}
function bestKey() { return gameId + ":" + current.mode + (["patrulha-tatica","muralha-das-torres","fronteira-orbital","refugio-do-inverno","mercado-de-sombras"].includes(gameId) ? ":" + current.mission : ""); }
function update(next) {
  if (next === current) return;
  current = next;
  if (current.phase === "won") {
    const key = bestKey();
    if ((records[key] || 0) < current.score) {
      records = { ...records, [key]: current.score };
      try { localStorage.setItem(STORAGE, JSON.stringify(records)); } catch { /* Optional scores */ }
    }
  }
  render();
  if (current.phase === "playing") {
    ($("board").querySelector("button:not(:disabled)") || $("actions").querySelector("button:not(:disabled)") || $("restart")).focus({ preventScroll: true });
  } else $("restart").focus({ preventScroll: true });
}
function metric(title, value) {
  const box = el("div", "metric");
  box.append(el("small", "", title), el("strong", "", value));
  return box;
}
function renderNaval() {
  const board = $("board"), actions = $("actions");
  board.className = "board naval-board";
  board.setAttribute("aria-label", "Setores marítimos — seis linhas e seis colunas");
  board.replaceChildren();
  const labels = { hit: "navio atingido", miss: "água livre", hidden: "não investigado" };
  for (let cell = 0; cell < 36; cell++) {
    const fired = current.shots.includes(cell);
    const hit = fired && current.enemyShips.includes(cell);
    const revealed = current.phase !== "playing" && current.enemyShips.includes(cell);
    const state = hit ? "hit" : fired ? "miss" : revealed ? "revealed" : "hidden";
    const row = Math.floor(cell / 6) + 1, col = (cell % 6) + 1;
    const button = action(hit ? "✹" : fired ? "·" : revealed ? "◇" : "", () =>
      update(commandNaval(current, { type: "fire", cell })), "sea-cell", fired || current.phase !== "playing");
    button.dataset.status = state;
    button.setAttribute("aria-label", "Linha " + row + ", coluna " + col + ": " +
      (labels[state] || "navio revelado"));
    button.dataset.cell = String(cell);
    board.append(button);
  }
  $("metrics").replaceChildren(
    metric("Turnos", current.turn + " / " + current.maxTurns),
    metric("Integridade", current.hull + " / " + current.maxHull),
    metric("Acertos", current.shots.filter(cell => current.enemyShips.includes(cell)).length + " / " + current.enemyShips.length),
    metric("Sonar", current.sonar),
  );
  $("legend").textContent = "✹ Acerto · · Falha · ◇ Navio revelado ao final";
  actions.replaceChildren();
  actions.append(el("h4", "", "Sonar por linha"));
  const sonar = el("div", "sonar-row");
  for (let row = 0; row < 6; row++) {
    const button = action(String(row + 1), () =>
      update(commandNaval(current, { type: "sonar", row })),
    "", current.phase !== "playing" || current.sonar <= 0);
    button.setAttribute("aria-label", "Usar sonar na linha " + (row + 1));
    sonar.append(button);
  }
  actions.append(sonar);
  actions.append(action("Reparar base (" + current.repairs + ")", () =>
    update(commandNaval(current, { type: "repair" })), "secondary",
    current.phase !== "playing" || current.repairs <= 0 || current.hull === current.maxHull));
  if (current.intel) actions.append(el("p", "intel", "Sonar linha " + (current.intel.row + 1) +
    ": " + current.intel.count + " contato(s) detectado(s)."));
}
function renderSiege() {
  const board = $("board"), actions = $("actions");
  board.className = "board siege-board";
  board.setAttribute("aria-label", "Duelo de fortalezas");
  board.replaceChildren();
  const enemy = el("div", "fortress enemy");
  enemy.append(el("span", "fortress-glyph", "♜"), el("strong", "", "Fortaleza rival"),
    el("small", "", current.enemyHealth + " / " + current.maxEnemyHealth + " de vida"));
  const center = el("div", "duel-center", "VS");
  const player = el("div", "fortress player");
  player.append(el("span", "fortress-glyph", "♜"), el("strong", "", "Sua fortaleza"),
    el("small", "", current.health + " / " + current.maxHealth + " de vida"));
  board.append(enemy, center, player);
  $("metrics").replaceChildren(
    metric("Rodada", current.round + " / " + current.maxRounds),
    metric("Energia", current.energy),
    metric("Escudo", current.shield),
    metric("Cartas jogadas", current.used),
  );
  $("legend").textContent = "Ataque + defesa + administração de energia · mão renovada a cada rodada";
  actions.replaceChildren(el("h4", "", "Suas cartas"));
  const hand = el("div", "hand");
  for (const id of current.hand) {
    const card = SIEGE_CARDS.find(c => c.key === id.split(":")[0]);
    if (!card) continue;
    const button = action("", () => update(playSiegeCard(current, id)), "hand-card",
      current.phase !== "playing" || card.cost > current.energy);
    button.append(el("span", "card-cost", "⚡ " + card.cost), el("strong", "", card.name),
      el("small", "", card.description));
    button.setAttribute("aria-label", "Jogar " + card.name + ", custa " + card.cost + " energia");
    hand.append(button);
  }
  actions.append(hand);
  actions.append(action("Encerrar turno · receber ataque rival", () =>
    update(endSiegeTurn(current)), "end-turn", current.phase !== "playing"));
}
function renderHex() {
  const board = $("board"), actions = $("actions");
  board.className = "board hex-board";
  board.setAttribute("aria-label", "Tabuleiro Hex 7 por 7, conecte norte a sul");
  board.replaceChildren();
  for (let cell=0;cell<49;cell++) {
    const owner=current.board[cell];
    const row=Math.floor(cell/7)+1,col=(cell%7)+1;
    const button=action(owner===1?"●":owner===2?"◆":"", () =>
      update(playHex(current,cell)), "hex-cell", owner!==0 || current.phase!=="playing");
    button.dataset.owner=String(owner);
    button.setAttribute("aria-label", "Linha "+row+", coluna "+col+
      (owner===1?", sua pedra":owner===2?", pedra adversária":", livre"));
    board.append(button);
  }
  $("metrics").replaceChildren(
    metric("Turnos",current.turn),
    metric("Suas pedras",current.board.filter(c=>c===1).length),
    metric("Pedras rivais",current.board.filter(c=>c===2).length),
    metric("Campo","7 × 7"),
  );
  $("legend").textContent="● Suas pedras: conecte norte e sul · ◆ Rival: conecta oeste e leste";
  actions.replaceChildren(el("h4","","Regras Hex"));
  actions.append(el("p","intel",
    "Cada casa aceita uma pedra. As seis vizinhas hexagonais formam as conexões. Não é possível mover uma pedra já colocada. Recruta, Tático e Veterano usam estratégias rivais diferentes."));
}
function renderDraughts() {
  const s = current, board = $("board"), actions = $("actions");
  const legal = legalDraughtsMoves(s.board, 1, s.chainFrom);
  const selected = s.chainFrom ?? selectedDraughts;
  const targets = legal.filter(move => move.from === selected);
  board.className = "board draughts-board";
  board.setAttribute("aria-label", "Damas Táticas: tabuleiro de oito linhas e oito colunas");
  board.replaceChildren();
  for(let cell = 0; cell < 64; cell++){
    const piece = s.board[cell], own = piece > 0;
    const from = legal.some(move => move.from === cell);
    const target = targets.some(move => move.to === cell);
    const row = Math.floor(cell / 8) + 1, col = cell % 8 + 1;
    const symbol = piece === 1 ? "●" : piece === 2 ? "♔" : piece === -1 ? "●" : piece === -2 ? "♚" : target ? "·" : "";
    const button = action(symbol, () => {
      if(from && !target) { selectedDraughts = cell; render(); return; }
      if(target) { selectedDraughts = null; update(commandDraughts(current, {type:"move",from:selected,to:cell})); }
    }, "draughts-cell", s.paused || s.phase !== "playing" || !(from || target));
    button.dataset.cell = String(cell);
    button.dataset.piece = String(piece);
    button.dataset.tone = (row + col) % 2 === 1 ? "dark" : "light";
    button.dataset.selected = String(cell === selected);
    button.dataset.target = String(target);
    button.setAttribute("aria-label", "Linha " + row + ", coluna " + col + ": " +
      (piece === 1 ? "sua peça" : piece === 2 ? "sua dama" :
       piece === -1 ? "peça rival" : piece === -2 ? "dama rival" : target ? "destino permitido" : "casa vazia") +
      (from ? ", selecionar" : target ? ", mover aqui" : ""));
    board.append(button);
  }
  $("metrics").replaceChildren(
    metric("Rodada",s.turn + " / " + s.maxTurns),
    metric("Suas peças",s.board.filter(piece=>piece>0).length),
    metric("Peças rivais",s.board.filter(piece=>piece<0).length),
    metric("Capturas",s.captures)
  );
  $("legend").textContent = "● Peças claras contra peças âmbar · ♔ Dama. Toque numa peça e depois no destino. Capturas têm prioridade; Tab/Enter também funcionam.";
  actions.replaceChildren(el("h4","","Comandos de damas"));
  actions.append(action(s.paused ? "Retomar damas" : "Pausar damas",()=>update(commandDraughts(current,{type:s.paused?"resume":"pause"})),"secondary",s.phase!=="playing"));
  actions.append(el("p","intel","O rival responde após cada movimento completo. Capturas encadeadas continuam com a mesma peça. Recruta, Tático e Veterano usam escolhas rivais diferentes."));
}
function renderSquad() {
  const s=current,board=$("board"),actions=$("actions");
  board.className="board squad-board";
  board.setAttribute("aria-label","Tabuleiro de Patrulha Tática com cinco linhas e cinco colunas");
  board.replaceChildren();
  const pos=s.units[0].pos,moves=legalSquadMoves(s);
  const distance=(a,b)=>Math.abs(Math.floor(a/5)-Math.floor(b/5))+Math.abs(a%5-b%5);
  for(let cell=0;cell<25;cell++){
    const enemyIndex=s.enemies.findIndex(e=>e.hp>0&&e.pos===cell);
    const shoot=enemyIndex>=0&&distance(pos,cell)<=2&&s.ammo>0;
    const walk=moves.includes(cell);
    const own=cell===pos,cover=s.rocks.includes(cell);
    const rescue=s.mission==="extracao"&&cell===12&&!s.rescued;
    const kind=own?"squad":enemyIndex>=0?"drone":cover?"cover":rescue?"rescue":walk?"move":"empty";
    const symbol=own?"◆":enemyIndex>=0?"♟":cover?"▥":rescue?"★":cell===20?"⌂":walk?"·":"";
    const cmd=enemyIndex>=0?{type:"attack",target:enemyIndex}:{type:"move",cell};
    const button=action(symbol,()=>update(commandSquad(current,cmd)),"squad-cell",s.phase!=="playing"||!(walk||shoot));
    button.dataset.kind=kind;button.dataset.squad=String(cell);
    button.setAttribute("aria-label","Linha "+(Math.floor(cell/5)+1)+", coluna "+(cell%5+1)+": "+(own?"Seu esquadrão":enemyIndex>=0?"Drone inimigo, vida "+s.enemies[enemyIndex].hp:cover?"Terreno bloqueado":rescue?"Sinal de resgate":cell===20?"Base":walk?"Mover para cá":"Casa livre")+(shoot?", atacar":""));
    board.append(button);
  }
  $("metrics").replaceChildren(
    metric("Turnos",s.turn+" / "+s.maxTurns),
    metric("Integridade",s.units[0].hp+" / "+s.maxHealth),
    metric("Munição",s.ammo),
    metric("Drones restantes",s.enemies.filter(e=>e.hp>0).length),
  );
  $("legend").textContent="◆ Esquadrão · ♟ Drone · ▥ Bloqueio · ★ Sinal · ⌂ Base. Use Tab e Enter ou toque para agir.";
  actions.replaceChildren(el("h4","","Ordens do esquadrão"));
  actions.append(action("Defender posição",()=>update(commandSquad(current,{type:"guard"})),"secondary",s.phase!=="playing"));
  actions.append(action("Aplicar kit médico ("+s.kits+")",()=>update(commandSquad(current,{type:"heal"})),"secondary",s.phase!=="playing"||s.kits===0||s.units[0].hp>=s.maxHealth));
  actions.append(el("p","squad-summary",s.mission==="extracao"?(s.rescued?"Sinal recolhido: retorne à base (casa inferior esquerda).":"Objetivo: recolha o sinal ★ no centro da grade, depois retorne à base."):"Objetivo: neutralize ambos os drones. Cada ataque custa uma munição."));
}

function renderTowers() {
  const s=current,board=$("board"),actions=$("actions"),kind=$("tower-type").value;
  board.className="board tower-board";
  board.setAttribute("aria-label","Defesa de torres com seis linhas e seis colunas");
  board.replaceChildren();
  for(let cell=0;cell<36;cell++){
    const path=TOWER_PATH.indexOf(cell), tower=s.towers.find(t=>t.cell===cell);
    const enemies=s.enemies.filter(e=>TOWER_PATH[e.position]===cell).length;
    const build=path<0&&!tower&&s.coins>=TOWER_TYPES[kind].cost;
    const upgrade=tower&&tower.level===1&&s.coins>=4;
    const label=path>=0?"Caminho, setor "+(path+1):tower?
      (TOWER_TYPES[tower.kind].name+", nível "+tower.level+(upgrade?", aprimorar":"")):
      ("Lote livre"+(build?", construir "+TOWER_TYPES[kind].name:""));
    const symbol=tower?(tower.kind==="laser"?"♜":"❄"):enemies?"●":path>=0?"·":"+";
    const button=action(symbol,()=>update(commandTowers(current,tower?{type:"upgrade",cell}:{type:"build",cell,kind})),"tower-cell",
      s.paused||s.phase==="won"||s.phase==="lost"||!(build||upgrade));
    button.dataset.tower=String(cell);
    button.dataset.kind=tower?tower.kind:path>=0?"path":"free";
    button.setAttribute("aria-label","Linha "+(Math.floor(cell/6)+1)+", coluna "+(cell%6+1)+": "+label+(enemies?", inimigos "+enemies:""));
    board.append(button);
  }
  $("metrics").replaceChildren(
    metric("Onda",s.wave+" / "+s.maxWaves),
    metric("Base",s.base+" / "+s.maxBase),
    metric("Créditos",s.coins),
    metric("Eliminados",s.destroyed),
  );
  $("legend").textContent="♜ Canhão: alcance 3 · ❄ Gelo: alcance 2 e desacelera · + Construir · toque na torre para aprimorar. Inimigos: "+s.enemies.length;
  actions.replaceChildren(el("h4","","Controle de ondas"));
  actions.append(action("Iniciar onda "+s.wave,()=>update(commandTowers(current,{type:"start"})),"end-turn",s.phase!=="ready"||s.paused));
  actions.append(action("Avançar combate",()=>update(commandTowers(current,{type:"tick"})),"end-turn",s.phase!=="playing"||s.paused));
  actions.append(action(s.paused?"Retomar defesa":"Pausar defesa",()=>update(commandTowers(current,{type:s.paused?"resume":"pause"})),"secondary",!["playing","ready"].includes(s.phase)));
  actions.append(el("p","intel","Desafio: "+(s.mission==="maratona"?"maratona com duas ondas adicionais":"defesa de "+s.maxWaves+" ondas")+". Cada inimigo que chega ao final reduz a base. Derrotar inimigos rende créditos."));
}


function renderFrontier() {
  const s=current,board=$("board"),actions=$("actions"),order=$("frontier-action").value;
  board.className="board frontier-board";
  board.setAttribute("aria-label","Fronteira Orbital, mapa de quatro linhas e quatro colunas");
  board.replaceChildren();
  for(let cell=0;cell<16;cell++){
    const owned=s.owners[cell]===1,rival=s.owners[cell]===2,visible=s.visible[cell];
    const legal=canFrontierAction(s,{type:order,cell});
    const title=owned?"Sua colônia":rival?"Facção rival":!visible?"Setor desconhecido":
      ("Área "+s.terrain[cell]);
    const symbol=owned?"◆":rival?"♟":!visible?"?":
      s.terrain[cell]==="solar"?"☼":s.terrain[cell]==="mineral"?"◇":s.terrain[cell]==="ruinas"?"✧":"·";
    const button=action(symbol,()=>update(commandFrontier(current,{type:order,cell})),"frontier-cell",!legal);
    button.dataset.frontier=String(cell);
    button.dataset.owner=String(s.owners[cell]);
    button.dataset.visible=String(visible);
    button.setAttribute("aria-label","Linha "+(Math.floor(cell/4)+1)+", coluna "+(cell%4+1)+": "+title+(legal?", "+(order==="scout"?"explorar":"colonizar"):""));
    board.append(button);
  }
  $("metrics").replaceChildren(
    metric("Turnos",s.turn+" / "+s.maxTurns),
    metric("Energia / minério",s.energy+" / "+s.ore),
    metric("Ciência",s.science+" / 12"),
    metric("Colônias",s.owners.filter(o=>o===1).length+" / 5")
  );
  $("legend").textContent="◆ Sua colônia · ♟ Rival · ? Névoa · ☼ Energia · ◇ Minério · ✧ Ruínas. Objetivo: "+(s.mission==="pesquisa"?"12 pontos de ciência":"5 colônias conectadas")+".";
  actions.replaceChildren(el("h4","","Centro de pesquisa e suprimentos"));
  actions.append(action("Pesquisar (+3 ciência)",()=>update(commandFrontier(current,{type:"research"})),"secondary",
    !canFrontierAction(s,{type:"research"})));
  actions.append(action("Extrair (+3 recursos)",()=>update(commandFrontier(current,{type:"extract"})),"secondary",
    !canFrontierAction(s,{type:"extract"})));
  actions.append(action(s.paused?"Retomar operação":"Pausar operação",()=>update(commandFrontier(current,{type:s.paused?"resume":"pause"})),"secondary",
    s.phase!=="playing"));
  actions.append(el("p","intel","Explorar custa 1 energia. Colonizar custa 2 energia e 2 minérios. Pesquisar exige ao menos 2 colônias. Cada turno gera renda básica. O rival se expande sem usar rede ou dados pessoais."));
}


function renderWinter(){
 const s=current,board=$("board"),actions=$("actions");
 board.className="board winter-board";
 board.setAttribute("aria-label","Painel visual do Refúgio do Inverno");
 board.replaceChildren();
 const sectors=[
  {id:"food",name:"Mantimentos",symbol:"✦",value:s.food},
  {id:"wood",name:"Lenha",symbol:"♧",value:s.wood},
  {id:"heat",name:"Aquecimento",symbol:"☼",value:s.heat},
  {id:"people",name:"Moradores",symbol:"♟",value:s.people}
 ];
 for(const sector of sectors){
  const card=el("div","winter-sector");
  card.dataset.resource=sector.id;
  card.append(el("span","winter-symbol",sector.symbol),el("small","",sector.name),el("strong","",sector.value));
  board.append(card);
 }
 $("metrics").replaceChildren(
  metric("Dia",s.day+" / "+s.maxDays),
  metric("Moral",s.morale+" / 12"),
  metric("Próximo clima",s.weather==="nevasca"?"Nevasca":s.weather==="frio"?"Frio":"Ameno"),
  metric("Sinais",s.beacon+" / 3")
 );
 $("legend").textContent="A cada dia os moradores consomem 2 alimentos. Frio e nevasca retiram calor. Falta de recursos reduz a moral. "+(s.mission==="evacuacao"?"Construa 3 sinais e resista por 5 dias.":"Sobreviva por "+s.maxDays+" dias.");
 actions.replaceChildren(el("h4","","Ordens de sobrevivência"));
 const commands=[
  ["collect","Coletar alimentos (+5)"],
  ["chop","Cortar lenha (+4)"],
  ["stoke","Reforçar fogueira (2 lenhas)"],
  ["rest","Descansar comunidade (1 alimento)"],
  ["signal","Construir sinal (2 lenhas e 1 alimento)"]
 ];
 for(const [type,label] of commands)actions.append(action(label,()=>update(commandWinter(current,{type})),"secondary",!canWinterAction(s,{type})));
 actions.append(action(s.paused?"Retomar abrigo":"Pausar abrigo",()=>update(commandWinter(current,{type:s.paused?"resume":"pause"})),"secondary",s.phase!=="playing"));
 actions.append(el("p","intel","Recruta, Tático e Veterano alteram estoque, clima e prazo. O modo Evacuação exige sinais completos e sobreviventes. Sem contagem automática do tempo."));
}

function renderMarket(){
 const s=current,board=$("board"),actions=$("actions");
 board.className="board market-board";
 board.setAttribute("aria-label","Lote em leilão e coleção de artefatos");
 board.replaceChildren();
 const lot=s.round<s.maxRounds?marketLot(s.seed,s.round):null;
 if(lot){
  const card=el("div","market-lot");
  card.append(el("small","","LOTE "+(s.round+1)+" / "+s.maxRounds),el("strong","",lot.name),
    el("p","","Família: "+lot.family+" · Valor estimado: "+lot.value+" · Lance mínimo: "+lot.minBid));
  board.append(card);
 } else board.append(el("p","market-final","Leilão encerrado. Sua coleção: "+s.player.length+" lotes."));
 $("metrics").replaceChildren(
  metric("Rodada",s.round+" / "+s.maxRounds),
  metric("Seus créditos",s.credits),
  metric("Seu valor",marketScore(s.player)),
  metric("Valor rival",marketScore(s.rival)));
 $("legend").textContent="Famílias adquiridas: "+new Set(s.player.map(x=>x.family)).size+" / 4. "+(s.mission==="colecao"?"Objetivo: colecionar as quatro famílias e superar o rival.":"Objetivo: acumular ao menos 40 pontos e superar o rival.")+" Lances rivais dependem da dificuldade.";
 actions.replaceChildren(el("h4","","Suas propostas"));
 if(lot){
  for(const offset of [0,3,6]){
   const amount=lot.minBid+offset;
   actions.append(action("Ofertar "+amount+" créditos",()=>update(commandMarket(current,{type:"bid",amount})),"market-bid",s.phase!=="playing"||s.paused||s.credits<amount));
  }
  actions.append(action("Passar este lote",()=>update(commandMarket(current,{type:"pass"})),"secondary",s.phase!=="playing"||s.paused));
 }
 actions.append(action(s.paused?"Retomar leilão":"Pausar leilão",()=>update(commandMarket(current,{type:s.paused?"resume":"pause"})),"secondary",s.phase!=="playing"));
 actions.append(el("p","intel","Oferta do adversário é calculada localmente. Em empate, Recruta favorece você; nas dificuldades maiores, o rival tem prioridade."));
}
function render() {
  const config = GAMES[gameId];
  $("game-title").textContent = config.name;
  $("guide").textContent = config.intro;
  $("instructions").textContent = config.instructions;
  $("squad-mode-wrap").hidden = gameId !== "patrulha-tatica";
  $("tower-mode-wrap").hidden = gameId !== "muralha-das-torres";
  $("tower-type-wrap").hidden = gameId !== "muralha-das-torres";
  $("frontier-mode-wrap").hidden = gameId !== "fronteira-orbital";
  $("frontier-action-wrap").hidden = gameId !== "fronteira-orbital";
  $("winter-mode-wrap").hidden = gameId !== "refugio-do-inverno";
  $("market-mode-wrap").hidden = gameId !== "mercado-de-sombras";
  if (gameId === "frota-oculta") renderNaval();
  else if (gameId === "cartas-de-cerco") renderSiege();
  else if (gameId === "hex-conexao") renderHex();
  else if (gameId === "damas-taticas") renderDraughts();
  else if (gameId === "patrulha-tatica") renderSquad();
  else if (gameId === "muralha-das-torres") renderTowers();
  else if (gameId === "fronteira-orbital") renderFrontier();
  else if (gameId === "mercado-de-sombras") renderMarket();
  else renderWinter();
  $("message").textContent = current.message;
  $("message").dataset.phase = current.phase;
  if (!$("pg-bot-body").hidden) $("pg-bot-answer").textContent = botMessage(gameId,current,botTopic);
  $("record").textContent = current.phase === "won"
    ? "Vitória: " + current.score + " pontos. Melhor recorde: " + (records[bestKey()] || current.score)
    : "Recorde neste aparelho: " + (records[bestKey()] || "—");
  document.querySelectorAll("[data-select]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.select === gameId));
  });
}
document.querySelectorAll("[data-select]").forEach(button =>
  button.addEventListener("click", () => newGame(button.dataset.select)));
$("difficulty").addEventListener("change", () => newGame());
$("squad-mode").addEventListener("change", () => { if (gameId === "patrulha-tatica") newGame(); });
$("tower-mode").addEventListener("change", () => { if (gameId === "muralha-das-torres") newGame(); });
$("tower-type").addEventListener("change", () => { if (gameId === "muralha-das-torres") render(); });
$("frontier-mode").addEventListener("change", () => { if (gameId === "fronteira-orbital") newGame(); });
$("frontier-action").addEventListener("change", () => { if (gameId === "fronteira-orbital") render(); });
$("winter-mode").addEventListener("change", () => { if (gameId === "refugio-do-inverno") newGame(); });
$("market-mode").addEventListener("change", () => { if (gameId === "mercado-de-sombras") newGame(); });
$("pg-bot-question-form").addEventListener("submit", event => {
  event.preventDefault();
  const reply = botQuestion(gameId, current, $("pg-bot-question").value);
  if (BOT_TOPICS.includes(reply.topic)) botTopic = reply.topic;
  document.querySelectorAll('[data-pg-bot-topic]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.pgBotTopic === reply.topic)));
  $("pg-bot-answer").textContent = reply.answer;
});
$("pg-bot-toggle").addEventListener("click", () => {
  const panel=$("pg-bot-body");
  panel.hidden=!panel.hidden;
  $("pg-bot-toggle").setAttribute("aria-expanded",String(!panel.hidden));
  if(!panel.hidden) $("pg-bot-answer").textContent=botMessage(gameId,current,botTopic);
});
for(const button of document.querySelectorAll('[data-pg-bot-topic]')){
  button.addEventListener('click',()=>{
    if(!BOT_TOPICS.includes(button.dataset.pgBotTopic))return;
    botTopic=button.dataset.pgBotTopic;
    document.querySelectorAll('[data-pg-bot-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    $("pg-bot-answer").textContent=botMessage(gameId,current,botTopic);
  });
}
$("restart").addEventListener("click", () => newGame());
window.addEventListener("hashchange", () => {
  const id = location.hash.slice(1);
  if (Object.hasOwn(GAMES,id) && id !== gameId) newGame(id);
});
newGame(gameId);
if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {}));
}
