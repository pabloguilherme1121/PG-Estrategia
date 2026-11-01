/** Cartas de Cerco — tactical hand/deck combat with a deterministic opponent.
 * Independent from the six campaign engines; no timers, accounts or APIs.
 */
export const SIEGE_CARDS = Object.freeze([
  { key: "ataque", name: "Avanço", cost: 1, damage: 5, shield: 0, heal: 0, energy: 0, draw: 0, description: "5 de dano ao forte rival." },
  { key: "ariete", name: "Aríete", cost: 2, damage: 9, shield: 0, heal: 0, energy: 0, draw: 0, description: "9 de dano. Ação ofensiva pesada." },
  { key: "escudo", name: "Fortificar", cost: 1, damage: 0, shield: 6, heal: 0, energy: 0, draw: 0, description: "6 de proteção para a próxima investida rival." },
  { key: "medico", name: "Socorro", cost: 1, damage: 0, shield: 0, heal: 5, energy: 0, draw: 0, description: "Recupere até 5 pontos de vida." },
  { key: "suprimento", name: "Suprimentos", cost: 0, damage: 0, shield: 0, heal: 0, energy: 2, draw: 0, description: "Ganhe 2 de energia neste turno." },
  { key: "batedor", name: "Reconhecimento", cost: 1, damage: 2, shield: 0, heal: 0, energy: 0, draw: 1, description: "2 de dano e compre outra carta." },
]);
const MODES = {
  recruta: { health: 26, enemyHealth: 24, damage: 2, rounds: 10 },
  tatico: { health: 22, enemyHealth: 33, damage: 4, rounds: 9 },
  veterano: { health: 18, enemyHealth: 43, damage: 6, rounds: 8 },
};
const CARDS = [
  "ataque", "ataque", "ataque", "ataque",
  "ariete", "ariete", "ariete",
  "escudo", "escudo", "medico",
  "suprimento", "suprimento", "batedor", "batedor",
].map((key, index) => key + ":" + index);
function seededShuffle(input, seed) {
  const copy = [...input];
  let s = (seed >>> 0) || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const index = Math.floor(s / 4294967296 * (i + 1));
    [copy[i], copy[index]] = [copy[index], copy[i]];
  }
  return copy;
}
export function createSiege({ difficulty = "recruta", seed = 31 } = {}) {
  if (!Object.hasOwn(MODES, difficulty) || !Number.isSafeInteger(seed)) {
    throw new RangeError("Modo ou baralho inválido");
  }
  const config = MODES[difficulty];
  const deck = seededShuffle(CARDS, seed);
  return {
    id: "cartas-de-cerco", mode: difficulty, seed, phase: "playing",
    health: config.health, maxHealth: config.health,
    enemyHealth: config.enemyHealth, maxEnemyHealth: config.enemyHealth,
    enemyDamage: config.damage, round: 1, maxRounds: config.rounds,
    energy: 3, shield: 0, hand: deck.slice(0, 4), deck: deck.slice(4),
    discard: [], used: 0, score: 0,
    message: "Use energia e cartas para derrubar a fortaleza adversária.",
  };
}
export function playSiegeCard(state, id) {
  if (state?.phase !== "playing" || typeof id !== "string" || !state.hand.includes(id)) return state;
  const card = SIEGE_CARDS.find(c => c.key === id.split(":")[0]);
  if (!card || card.cost > state.energy) return state;
  const enemyHealth = Math.max(0, state.enemyHealth - card.damage);
  const health = Math.min(state.maxHealth, state.health + card.heal);
  const phase = enemyHealth === 0 ? "won" : "playing";
  let deck = [...state.deck];
  let discard = [...state.discard, id];
  let hand = state.hand.filter(existing => existing !== id);
  for (let n = 0; n < card.draw; n++) {
    if (!deck.length) {
      deck = seededShuffle(discard, state.seed + state.round * 1049 + state.used);
      discard = [];
    }
    if (deck.length) hand.push(deck.shift());
  }
  return {
    ...state, health, enemyHealth, phase, hand, deck, discard,
    energy: Math.min(6, state.energy - card.cost + card.energy),
    shield: state.shield + card.shield, used: state.used + 1,
    score: phase === "won"
      ? 1800 + health * 35 + (state.maxRounds - state.round) * 90
      : 0,
    message: phase === "won" ? "Vitória! A fortaleza rival caiu." :
      card.name + ": " + card.description,
  };
}
export function endSiegeTurn(state) {
  if (state?.phase !== "playing") return state;
  const damage = Math.max(0, state.enemyDamage - state.shield);
  const health = Math.max(0, state.health - damage);
  const round = state.round + 1;
  const lost = health === 0 || round > state.maxRounds;
  let deck = [...state.deck];
  let discard = [...state.discard, ...state.hand];
  if (deck.length < 4) {
    deck = [...deck, ...seededShuffle(discard, state.seed + round * 1009)];
    discard = [];
  }
  return {
    ...state, health, round,
    phase: lost ? "lost" : "playing",
    hand: lost ? [] : deck.slice(0, 4),
    deck: deck.slice(4),
    discard, energy: 3, shield: 0,
    message: lost ? "Derrota. A fortaleza resistiu ao seu cerco." :
      "O rival causou " + damage + " de dano. Um novo turno começou.",
  };
}
