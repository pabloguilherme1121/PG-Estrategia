import {
  createBiomesGame, takeBiomesAction, advanceBiomesRound,
  toggleBiomesPause, undoBiomesAction, BIOMES_DIFFICULTIES,
} from "./engine.mjs";

const $ = id => document.getElementById(id);
const STORE = "pg-estrategia-biomas-recordes-v1";
let state;
let records = {};
try {
  const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    records = Object.fromEntries(Object.entries(saved).filter(([key, score]) =>
      /^(conservar|recuperar):(recruta|tatico|veterano)$/.test(key) &&
      Number.isInteger(score) && score > 0 && score < 1000));
  }
} catch {}

function recordKey() {
  return state.mode + ":" + state.difficulty;
}
function saveRecord() {
  if (state.phase !== "won" || (records[recordKey()] || 0) >= state.score) return;
  records[recordKey()] = state.score;
  try { localStorage.setItem(STORE, JSON.stringify(records)); } catch {}
}
function render() {
  const playing = state.phase === "playing";
  const blocked = !playing || state.paused || !state.actionsLeft;
  $("round").textContent = state.round + "/" + state.maxRounds;
  $("supplies").textContent = String(state.supplies);
  $("actions").textContent = String(state.actionsLeft);
  $("record").textContent = records[recordKey()] ? records[recordKey()] + " pontos" : "Nenhuma";
  $("phase").dataset.phase = state.phase;
  $("phase").textContent = state.phase === "won" ? "Vitória" :
    state.phase === "lost" ? "Derrota" : state.paused ? "Pausado" : "Em andamento";
  $("status").textContent = state.message;
  $("forecast").textContent = state.forecast
    ? "Previsão · " + state.forecast.event + " em " +
      state.regions[state.forecast.region].name + ": impacto " + state.forecast.intensity + "."
    : "Missão encerrada. Reinicie para tentar uma nova estratégia.";

  for (const regionElement of document.querySelectorAll(".region")) {
    const i = Number(regionElement.dataset.index);
    const region = state.regions[i];
    regionElement.dataset.threat = String(state.forecast?.region === i);
    regionElement.querySelector("[data-health]").textContent = region.health + "/9";
    regionElement.querySelector("[data-shield]").textContent = String(region.shield);
    regionElement.querySelector('[data-action="blindar"]').disabled =
      blocked || state.supplies < 2 || region.shield >= 6;
    regionElement.querySelector('[data-action="restaurar"]').disabled =
      blocked || state.supplies < 1 || region.health >= 9;
  }
  $("collect").disabled = blocked || state.supplies >= 12;
  $("advance").disabled = !playing || state.paused;
  $("pause").disabled = !playing;
  $("pause").textContent = state.paused ? "Retomar" : "Pausar";
  $("pause").setAttribute("aria-pressed", String(state.paused));
  $("undo").disabled = !playing || state.paused || !state.history.length;
}
function restart() {
  const raw = new URLSearchParams(location.search).get("seed");
  const seed = raw !== null && /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
  state = createBiomesGame({mode: $("mode").value, difficulty: $("difficulty").value, seed});
  $("bot-answer").textContent = "Escolha uma pergunta para ver a resposta.";
  render();
}
$("regions").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const regionIndex = Number(button.closest("[data-index]")?.dataset.index);
  state = takeBiomesAction(state, button.dataset.action, regionIndex);
  render();
});
$("new").addEventListener("click", restart);
$("mode").addEventListener("change", restart);
$("difficulty").addEventListener("change", restart);
$("collect").addEventListener("click", () => {
  state = takeBiomesAction(state, "coletar");
  render();
});
$("advance").addEventListener("click", () => {
  state = advanceBiomesRound(state);
  saveRecord();
  render();
});
$("pause").addEventListener("click", () => {
  state = toggleBiomesPause(state);
  render();
});
$("undo").addEventListener("click", () => {
  state = undoBiomesAction(state);
  render();
});
$("pg-bot").addEventListener("click", event => {
  const button = event.target.closest("[data-help]");
  if (!button) return;
  for (const item of document.querySelectorAll("[data-help]"))
    item.setAttribute("aria-pressed", String(item === button));
  $("bot-answer").textContent = button.dataset.help === "controles"
    ? "Use os botões das três regiões, Coletar, Avançar, Pausar e Desfazer. Enter e Espaço funcionam no teclado."
    : button.dataset.help === "situacao"
      ? "Rodada " + state.round + " de " + state.maxRounds + ", " +
        state.actionsLeft + " ações e " + state.supplies + " suprimentos. " + state.message
      : state.mode === "recuperar"
        ? "Mantenha todos os biomas vivos e termine com pelo menos 5 de vida em cada região."
        : "Sobreviva às " + BIOMES_DIFFICULTIES[state.difficulty].rounds + " rodadas sem perder um bioma.";
});
restart();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js", {scope: "./"}).catch(() => {}));
}
