// Guardiões dos Biomas: previsão climática, suprimentos, proteção e recuperação.
export const BIOMES_REGIONS = Object.freeze(["Mata", "Costa", "Serra"]);
export const BIOMES_DIFFICULTIES = Object.freeze({
  recruta: Object.freeze({rounds: 8, health: 7, supplies: 7, damage: 1}),
  tatico: Object.freeze({rounds: 10, health: 7, supplies: 6, damage: 2}),
  veterano: Object.freeze({rounds: 12, health: 6, supplies: 5, damage: 2}),
});
export const BIOMES_MODES = Object.freeze(["conservar", "recuperar"]);
const MAX_HEALTH = 9;
const MAX_SHIELD = 6;
const MAX_SUPPLIES = 12;

function nextForecast(seed, round, difficulty) {
  const n = Math.imul((seed + 17) ^ Math.imul(round, 2654435761), 2246822519) >>> 0;
  return {
    round, region: (seed + round * 2) % BIOMES_REGIONS.length,
    intensity: BIOMES_DIFFICULTIES[difficulty].damage + ((n >>> 7) % 2),
    event: ["Seca", "Tempestade", "Vento forte"][(n >>> 4) % 3],
  };
}
function savedState(state) {
  const {history, ...rest} = state;
  return {...rest, regions: rest.regions.map(region => ({...region})),
    forecast: rest.forecast ? {...rest.forecast} : null};
}
export function createBiomesGame({mode = "conservar", difficulty = "recruta", seed = 0} = {}) {
  if (!BIOMES_MODES.includes(mode) || !Object.hasOwn(BIOMES_DIFFICULTIES, difficulty)
    || !Number.isSafeInteger(seed) || seed < 0 || seed > 999999999)
    throw new RangeError("Modo, dificuldade ou semente inválidos.");
  const rules = BIOMES_DIFFICULTIES[difficulty];
  return {
    mode, difficulty, seed, round: 1, maxRounds: rules.rounds, phase: "playing",
    paused: false, actionsLeft: 2, supplies: rules.supplies,
    regions: BIOMES_REGIONS.map(name => ({
      name, health: mode === "recuperar" ? 5 : rules.health, shield: 0,
    })),
    forecast: nextForecast(seed, 1, difficulty),
    score: 0, history: [],
    message: "Use até duas ações. Consulte a previsão antes de avançar a rodada.",
  };
}
export function getBiomesForecast(state) {
  return state?.phase === "playing" ? state.forecast : null;
}
export function takeBiomesAction(state, action, regionIndex = 0) {
  if (!state || state.phase !== "playing" || state.paused || state.actionsLeft <= 0) return state;
  if (!["blindar", "restaurar", "coletar"].includes(action)) return state;
  if (action !== "coletar" && (!Number.isInteger(regionIndex) ||
    regionIndex < 0 || regionIndex >= state.regions.length)) return state;
  const regions = state.regions.map(region => ({...region}));
  let supplies = state.supplies;
  if (action === "blindar") {
    if (supplies < 2 || regions[regionIndex].shield >= MAX_SHIELD) return state;
    supplies -= 2;
    regions[regionIndex].shield = Math.min(MAX_SHIELD, regions[regionIndex].shield + 3);
  } else if (action === "restaurar") {
    if (supplies < 1 || regions[regionIndex].health >= MAX_HEALTH) return state;
    supplies -= 1;
    regions[regionIndex].health += 1;
  } else {
    if (supplies >= MAX_SUPPLIES) return state;
    supplies = Math.min(MAX_SUPPLIES, supplies + 2);
  }
  const message = action === "coletar" ? "Suprimentos coletados." :
    action === "blindar" ? regions[regionIndex].name + " protegida." :
      regions[regionIndex].name + " restaurada.";
  return {...state, regions, supplies, actionsLeft: state.actionsLeft - 1, message,
    history: [...state.history, savedState(state)].slice(-2)};
}
export function advanceBiomesRound(state) {
  if (!state || state.phase !== "playing" || state.paused) return state;
  const {region: index, intensity} = state.forecast;
  const regions = state.regions.map(region => ({...region}));
  const affected = regions[index];
  const absorbed = Math.min(intensity, affected.shield);
  affected.shield -= absorbed;
  affected.health = Math.max(0, affected.health - (intensity - absorbed));
  const anyLost = regions.some(region => region.health === 0);
  const lastRound = state.round >= state.maxRounds;
  const recovered = regions.every(region => region.health >= 5);
  const phase = anyLost || (lastRound && state.mode === "recuperar" && !recovered)
    ? "lost" : lastRound ? "won" : "playing";
  const score = phase === "won"
    ? regions.reduce((total, region) => total + region.health * 10 + region.shield * 2, 0) + state.supplies
    : 0;
  const round = lastRound ? state.round : state.round + 1;
  return {...state, regions, round, phase, score, actionsLeft: phase === "playing" ? 2 : 0,
    history: [], forecast: phase === "playing" ? nextForecast(state.seed, round, state.difficulty) : null,
    message: phase === "won" ? "Vitória! Os três biomas resistiram." :
      phase === "lost" ? "Derrota. Um bioma entrou em colapso ou não foi recuperado." :
        affected.name + ": " + absorbed + " de " + intensity + " impacto absorvido. Prepare a próxima rodada."};
}
export function toggleBiomesPause(state) {
  if (!state || state.phase !== "playing") return state;
  return {...state, paused: !state.paused,
    message: state.paused ? "Partida retomada." : "Partida pausada."};
}
export function undoBiomesAction(state) {
  if (!state?.history?.length || state.paused || state.phase !== "playing") return state;
  return {...savedState(state.history.at(-1)), history: state.history.slice(0, -1),
    message: "Última preparação desfeita."};
}
