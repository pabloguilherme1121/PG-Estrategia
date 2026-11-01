import test from "node:test";
import assert from "node:assert/strict";
import { createNaval, commandNaval, NAVAL_DIFFICULTIES } from "../public/estrategia/independentes/naval.mjs";
import { createSiege, playSiegeCard, endSiegeTurn, SIEGE_CARDS } from "../public/estrategia/independentes/siege.mjs";

test("Frota Oculta: tabuleiro, frotas e modos próprios são determinísticos", () => {
  for (const difficulty of NAVAL_DIFFICULTIES) {
    const a = createNaval({ difficulty, seed: 73 });
    const b = createNaval({ difficulty, seed: 73 });
    assert.deepEqual(a, b);
    assert.equal(a.mode, difficulty);
    assert.equal(a.phase, "playing");
    assert.ok(a.enemyShips.length >= 4);
    assert.equal(new Set(a.enemyShips).size, a.enemyShips.length);
    assert.ok(a.enemyShips.every(c => Number.isInteger(c) && c >= 0 && c < 36));
    assert.ok(a.maxTurns >= a.enemyShips.length);
  }
});
test("Frota Oculta: tiros inválidos/duplicados não consomem turno nem saúde", () => {
  const s = createNaval({ seed: 19 });
  for (const action of [{ type: "fire", cell: -1 }, { type: "fire", cell: 36 }, { type: "fire", cell: "2" }, { type: "unknown" }]) {
    assert.deepEqual(commandNaval(s, action), s);
  }
  const next = commandNaval(s, { type: "fire", cell: 0 });
  assert.equal(next.turn, 1);
  assert.deepEqual(commandNaval(next, { type: "fire", cell: 0 }), next);
});
test("Frota Oculta: o jogador pode vencer afundando os navios de cada dificuldade", () => {
  for (const difficulty of NAVAL_DIFFICULTIES) {
    const s = createNaval({ difficulty, seed: 91 });
    let game = s;
    for (const cell of s.enemyShips) {
      if (game.phase !== "playing") break;
      game = commandNaval(game, { type: "fire", cell });
    }
    assert.equal(game.phase, "won", difficulty);
    assert.ok(game.score > 0);
    assert.deepEqual(commandNaval(game, { type: "fire", cell: 0 }), game);
  }
});
test("Frota Oculta: sonar revela informação limitada e possui estoque finito; derrota é possível", () => {
  let g = createNaval({ difficulty: "veterano", seed: 123 });
  const result = commandNaval(g, { type: "sonar", row: 1 });
  assert.equal(result.sonar, g.sonar - 1);
  assert.equal(result.intel.row, 1);
  assert.equal(result.intel.count, g.enemyShips.filter(n => Math.floor(n / 6) === 1).length);
  assert.equal(result.enemyShips.length, g.enemyShips.length);
  assert.deepEqual(commandNaval(g, { type: "sonar", row: 8 }), g);
  g = createNaval({ difficulty: "veterano", seed: 123 });
  const misses = Array.from({ length: 36 }, (_, i) => i).filter(i => !g.enemyShips.includes(i));
  for (const cell of misses) {
    if (g.phase !== "playing") break;
    g = commandNaval(g, { type: "fire", cell });
  }
  assert.equal(g.phase, "lost");
});

test("Cartas de Cerco: baralho e efeitos distintos, modos, compra reproduzível", () => {
  assert.equal(new Set(SIEGE_CARDS.map(c => c.key)).size, SIEGE_CARDS.length);
  assert.ok(SIEGE_CARDS.length >= 5);
  for (const difficulty of ["recruta", "tatico", "veterano"]) {
    const a = createSiege({ difficulty, seed: 77 });
    const b = createSiege({ difficulty, seed: 77 });
    assert.deepEqual(a, b);
    assert.equal(a.phase, "playing");
    assert.equal(a.mode, difficulty);
    assert.equal(a.hand.length, 4);
    assert.ok(a.health > 0 && a.enemyHealth > 0);
  }
});
test("Cartas de Cerco: não aceita ID ausente, carta repetida nem custo impossível", () => {
  let g = createSiege({ seed: 3 });
  assert.deepEqual(playSiegeCard(g, "nao-existe"), g);
  const first = g.hand[0];
  g = playSiegeCard(g, first);
  assert.deepEqual(playSiegeCard(g, first), g);
  if (g.phase === "playing") {
    const expensive = g.hand.find(id => SIEGE_CARDS.find(c => c.key === id.split(":")[0]).cost > g.energy);
    if (expensive) assert.deepEqual(playSiegeCard(g, expensive), g);
  }
});
test("Cartas de Cerco: bloquear, atacar, gerar suprimentos e comprar cartas são regras próprias", () => {
  const initial = createSiege({ seed: 10 });
  let state = initial;
  for (const key of [...state.hand]) {
    const card = SIEGE_CARDS.find(c => c.key === key.split(":")[0]);
    if (card.cost > state.energy) continue;
    state = playSiegeCard(state, key);
    assert.ok(state.health >= 0);
    assert.ok(state.enemyHealth <= initial.enemyHealth);
  }
  if (state.phase === "playing") {
    const end = endSiegeTurn(state);
    assert.equal(end.round, 2);
    assert.equal(end.hand.length, 4);
    assert.ok(end.enemyHealth <= initial.enemyHealth);
  }
});
test("Cartas de Cerco: IA pode vencer por dano ou tempo; reinício é independente", () => {
  let g = createSiege({ difficulty: "veterano", seed: 9 });
  for (let i = 0; i < 20 && g.phase === "playing"; i++) g = endSiegeTurn(g);
  assert.equal(g.phase, "lost");
  assert.deepEqual(endSiegeTurn(g), g);
  const restart = createSiege({ difficulty: "veterano", seed: 9 });
  assert.equal(restart.round, 1);
  assert.equal(restart.phase, "playing");
});
test("Cartas de Cerco: uma estratégia ofensiva pode vencer no modo recruta", () => {
  let g = createSiege({ difficulty: "recruta", seed: 31 });
  for (let i = 0; i < 90 && g.phase === "playing"; i++) {
    const options = g.hand
      .map(id => ({ id, card: SIEGE_CARDS.find(card => card.key === id.split(":")[0]) }))
      .filter(({card}) => card.cost <= g.energy)
      .sort((a,b) => b.card.damage - a.card.damage);
    const damage = options.find(({card}) => card.damage > 0);
    if (damage) g = playSiegeCard(g, damage.id);
    else g = endSiegeTurn(g);
  }
  assert.equal(g.phase, "won", "Modo recruta precisa ter uma sequência de vitória viável");
  assert.ok(g.score > 0);
});
