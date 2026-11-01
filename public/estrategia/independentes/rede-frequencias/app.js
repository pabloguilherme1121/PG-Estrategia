import {
  createFrequencyNetwork, assignFrequency, clearFrequency,
  undoFrequency, toggleFrequencyPause, getFrequencyHint,
  FREQUENCY_MODES, FREQUENCY_DIFFICULTIES,
} from "./engine.mjs";

const $ = id => document.getElementById(id);
const SAVE = "pg-estrategia-frequencias-recordes-v1";
const VIEW = "pg-estrategia-frequencias-preferencias-v1";
try {
  const saved = JSON.parse(localStorage.getItem(VIEW) || "null");
  if (saved && FREQUENCY_MODES.includes(saved.mode)) $("mode").value = saved.mode;
  if (saved && Object.hasOwn(FREQUENCY_DIFFICULTIES,saved.difficulty)) $("difficulty").value = saved.difficulty;
} catch {}
function rememberView() {
  try { localStorage.setItem(VIEW, JSON.stringify({mode:$("mode").value,difficulty:$("difficulty").value})); } catch {}
}
let records = {};
try {
  const saved = JSON.parse(localStorage.getItem(SAVE) || "{}");
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    records = Object.fromEntries(Object.entries(saved)
      .filter(([key,value]) => /^(distribuir|economizar):(recruta|tatico|veterano)$/.test(key)
        && Number.isInteger(value) && value > 0 && value <= 33));
  }
} catch {}

let state;
let selectedChannel = 0;
let eraseMode = false;
function recordKey() { return state.mode + ":" + state.difficulty; }
function updateRecord() {
  if (state.phase !== "won" || (records[recordKey()] || Infinity) <= state.moves) return;
  records[recordKey()] = state.moves;
  try { localStorage.setItem(SAVE, JSON.stringify(records)); } catch {}
}
function stationMarkup() {
  const board = $("network");
  if (board.children.length === state.nodes.length) return;
  board.replaceChildren(...state.nodes.map((name,i) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "station"; button.dataset.node = String(i);
    const heading = document.createElement("strong");
    heading.textContent = name;
    const details = document.createElement("small");
    details.dataset.links = "";
    const current = document.createElement("span");
    current.className = "assignment";
    current.dataset.current = "";
    button.append(heading, details, current);
    return button;
  }));
}
function render() {
  const playing = state.phase === "playing";
  const active = playing && !state.paused;
  stationMarkup();
  $("phase").dataset.phase = state.phase;
  $("phase").textContent = state.phase === "won" ? "Vitória" :
    state.phase === "lost" ? "Derrota" : state.paused ? "Pausado" : "Em andamento";
  $("moves").textContent = state.moves + "/" + state.maxMoves;
  $("progress").textContent = state.slots.filter(slot=>slot!==null).length + "/" + state.slots.length;
  $("record").textContent = records[recordKey()] ? records[recordKey()] + " alterações" : "Nenhum";
  $("status").textContent = state.message;
  $("selected-label").textContent = eraseMode
    ? "Remover canal: toque na estação para apagar."
    : "Canal selecionado: " + (selectedChannel + 1);
  $("clear-mode").setAttribute("aria-pressed", String(eraseMode));
  $("clear-mode").textContent = eraseMode ? "Remover canal: sim" : "Remover canal: não";
  $("clear-mode").disabled = !active;
  for (const channelButton of $("channels").querySelectorAll("[data-channel]")) {
    const id = Number(channelButton.dataset.channel);
    channelButton.hidden = id >= state.channels;
    channelButton.disabled = !active || id >= state.channels;
    channelButton.setAttribute("aria-pressed", String(!eraseMode && id === selectedChannel));
  }
  for (const station of $("network").children) {
    const node = Number(station.dataset.node);
    const slot = state.slots[node];
    const neighbors = state.edges.flatMap(([a,b]) => a===node?[state.nodes[b]]:b===node?[state.nodes[a]]:[]);
    station.dataset.color = slot === null ? "none" : String(slot);
    station.querySelector("[data-links]").textContent = "Conecta a: " + neighbors.join(", ");
    station.querySelector("[data-current]").textContent = slot === null ? "Sem canal" : "Canal " + (slot + 1);
    station.setAttribute("aria-label", state.nodes[node] + ", " +
      (slot === null ? "sem canal" : "canal " + (slot+1)) +
      ". Conecta a: " + neighbors.join(", ") + ".");
    station.disabled = !active;
  }
  $("undo").disabled = !state.history.length || state.paused;
  $("hint").disabled = !active;
  $("pause").disabled = !playing;
  $("pause").setAttribute("aria-pressed", String(state.paused));
  $("pause").textContent = state.paused ? "Retomar" : "Pausar";
}
function restart() {
  const raw = new URLSearchParams(location.search).get("seed");
  const seed = raw !== null && /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
  state = createFrequencyNetwork({mode:$("mode").value,difficulty:$("difficulty").value,seed});
  selectedChannel = 0; eraseMode = false;
  $("hint-text").textContent = "Dica disponível sem custo.";
  $("bot-answer").textContent = "Escolha uma pergunta para ver a resposta.";
  render();
}
$("network").addEventListener("click", event => {
  const button = event.target.closest("button[data-node]");
  if (!button) return;
  const node = Number(button.dataset.node);
  const next = eraseMode ? clearFrequency(state,node) : assignFrequency(state,node,selectedChannel);
  if (next === state) {
    $("status").textContent = eraseMode ? "A estação não tem canal para remover." :
      "Interferência ou alteração inválida. Uma estação conectada já pode usar este canal.";
    return;
  }
  state = next;
  updateRecord();
  render();
});
$("channels").addEventListener("click", event => {
  const button = event.target.closest("button[data-channel]");
  if (!button || button.disabled) return;
  selectedChannel = Number(button.dataset.channel);
  eraseMode = false; render();
});
$("clear-mode").addEventListener("click", () => { eraseMode = !eraseMode; render(); });
$("undo").addEventListener("click", () => { state = undoFrequency(state); render(); });
$("pause").addEventListener("click", () => { state = toggleFrequencyPause(state); render(); });
$("hint").addEventListener("click", () => {
  const hint = getFrequencyHint(state);
  $("hint-text").textContent = hint
    ? "Experimente " + state.nodes[hint.node] + " no canal " + (hint.channel + 1) + "."
    : "Não há dica segura com os canais atuais. Desfaça uma alteração e tente novamente.";
});
$("new").addEventListener("click", restart);
$("mode").addEventListener("change", () => { rememberView(); restart(); });
$("difficulty").addEventListener("change", () => { rememberView(); restart(); });
$("pg-bot").addEventListener("click", event => {
  const button = event.target.closest("[data-help]");
  if (!button) return;
  for (const item of document.querySelectorAll("[data-help]"))
    item.setAttribute("aria-pressed", String(item === button));
  $("bot-answer").textContent = button.dataset.help === "controles" ?
    "Escolha um canal, toque na estação, use Desfazer, Remover canal ou Mostrar dica. O teclado aceita Tab, Enter e Espaço." :
    button.dataset.help === "situacao" ?
      "Você configurou " + state.slots.filter(slot=>slot!==null).length + " de " +
      state.slots.length + " estações e usou " + state.moves + " de " + state.maxMoves + " alterações." :
      state.mode === "economizar" ?
        "Configure todas as estações usando apenas dois canais, sem repetir um canal entre vizinhas." :
        "Configure todas as estações usando três canais e evitando interferências.";
});
restart();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));
}
