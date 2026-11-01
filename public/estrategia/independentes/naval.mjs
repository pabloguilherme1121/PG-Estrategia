/** Frota Oculta — standalone naval deduction engine; pure, offline, deterministic.
 * This is a full new game, not a mission template or an Arcade catalog alias.
 */
export const NAVAL_DIFFICULTIES = Object.freeze(["recruta", "tatico", "veterano"]);
const SETTINGS = Object.freeze({
  recruta: { ships: 4, hull: 9, sonar: 3, repairs: 2, maxTurns: 17, attackEvery: 4 },
  tatico: { ships: 5, hull: 8, sonar: 2, repairs: 1, maxTurns: 15, attackEvery: 3 },
  veterano: { ships: 6, hull: 7, sonar: 1, repairs: 1, maxTurns: 13, attackEvery: 2 },
});
function shuffle(seed) {
  let value = (seed >>> 0) || 1;
  const cells = Array.from({ length: 36 }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    const j = Math.floor(((t ^ t >>> 14) >>> 0) / 4294967296 * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}
export function createNaval({ difficulty = "recruta", seed = 31 } = {}) {
  if (!NAVAL_DIFFICULTIES.includes(difficulty) || !Number.isSafeInteger(seed)) {
    throw new RangeError("Modo ou mapa inválido");
  }
  const config = SETTINGS[difficulty];
  return {
    id: "frota-oculta", mode: difficulty, seed, phase: "playing",
    enemyShips: shuffle(seed).slice(0, config.ships).sort((a, b) => a - b),
    shots: [], sonar: config.sonar, repairs: config.repairs, intel: null,
    turn: 0, maxTurns: config.maxTurns, hull: config.hull, maxHull: config.hull,
    attackEvery: config.attackEvery, score: 0, message: "Encontre a frota oculta e proteja sua base.",
  };
}
export function commandNaval(state, action) {
  if (state?.phase !== "playing" || !action || typeof action !== "object") return state;
  let patch;
  if (action.type === "fire") {
    if (!Number.isInteger(action.cell) || action.cell < 0 || action.cell >= 36 ||
      state.shots.includes(action.cell)) return state;
    const hit = state.enemyShips.includes(action.cell);
    patch = { shots: [...state.shots, action.cell], intel: null,
      message: hit ? "Alvo atingido! Continue a ofensiva." : "Água livre. Reavalie seu plano." };
  } else if (action.type === "sonar") {
    if (!Number.isInteger(action.row) || action.row < 0 || action.row > 5 || state.sonar <= 0) return state;
    const count = state.enemyShips.filter(cell => Math.floor(cell / 6) === action.row).length;
    patch = { sonar: state.sonar - 1, intel: { row: action.row, count },
      message: "Sonar: setor " + (action.row + 1) + " apresenta " + count + " contato(s)." };
  } else if (action.type === "repair") {
    if (state.repairs <= 0 || state.hull >= state.maxHull) return state;
    patch = { repairs: state.repairs - 1, hull: Math.min(state.maxHull, state.hull + 2),
      message: "Tripulação reparou dois pontos da base." };
  } else return state;
  const turn = state.turn + 1;
  const shots = patch.shots ?? state.shots;
  const won = state.enemyShips.every(cell => shots.includes(cell));
  const hull = Math.max(0, (patch.hull ?? state.hull) -
    (won || turn % state.attackEvery !== 0 ? 0 : 1));
  const lost = !won && (hull === 0 || turn >= state.maxTurns);
  const phase = won ? "won" : lost ? "lost" : "playing";
  return {
    ...state, ...patch, turn, hull, phase,
    score: won ? 2000 + hull * 90 + (state.maxTurns - turn) * 55 - shots.length * 15 : 0,
    message: won ? "Vitória: frota rival neutralizada!" :
      lost ? "Derrota: missão encerrada. Reorganize seus recursos." : patch.message,
  };
}
