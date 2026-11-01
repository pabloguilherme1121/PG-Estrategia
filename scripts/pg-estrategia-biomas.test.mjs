import test from "node:test";
import assert from "node:assert/strict";
import {
  createBiomesGame, takeBiomesAction, advanceBiomesRound,
  toggleBiomesPause, undoBiomesAction, getBiomesForecast,
  BIOMES_DIFFICULTIES,
} from "../public/estrategia/independentes/guardioes-biomas/engine.mjs";

test("Biomas: partidas determinísticas, dois objetivos e três dificuldades", () => {
  for (const mode of ["conservar", "recuperar"]) {
    for (const difficulty of Object.keys(BIOMES_DIFFICULTIES)) {
      const game = createBiomesGame({mode, difficulty, seed: 41});
      assert.deepEqual(game, createBiomesGame({mode, difficulty, seed: 41}));
      assert.equal(game.regions.length, 3);
      assert.equal(game.phase, "playing");
      assert.equal(game.actionsLeft, 2);
      assert.equal(game.forecast.round, 1);
      assert.ok(game.forecast.region >= 0 && game.forecast.region < 3);
    }
  }
  assert.throws(() => createBiomesGame({mode: "falso"}), RangeError);
  assert.throws(() => createBiomesGame({difficulty: "falso"}), RangeError);
  assert.throws(() => createBiomesGame({seed: -1}), RangeError);
});

test("Biomas: administrar defesa, restauração, suprimentos e ações inválidas sem mutação", () => {
  const initial = createBiomesGame({seed: 3});
  const target = initial.forecast.region;
  const protectedGame = takeBiomesAction(initial, "blindar", target);
  assert.equal(initial.regions[target].shield, 0);
  assert.equal(protectedGame.regions[target].shield, 3);
  assert.equal(protectedGame.supplies, initial.supplies - 2);
  assert.equal(takeBiomesAction(initial, "blindar", 9), initial);
  assert.equal(takeBiomesAction(initial, "hack", target), initial);
  const replenished = takeBiomesAction(protectedGame, "coletar");
  assert.equal(replenished.actionsLeft, 0);
  assert.equal(replenished.supplies, initial.supplies);
  assert.equal(takeBiomesAction(replenished, "coletar"), replenished);
  const next = advanceBiomesRound(replenished);
  assert.equal(next.round, 2);
  assert.equal(next.actionsLeft, 2);
  assert.ok(next.regions[target].health >= 1);
  assert.equal(next.history.length, 0);
});

test("Biomas: pausa impede ações, avançar e desfazer; retomada permite recuperar", () => {
  const original = createBiomesGame({seed: 3,mode: "recuperar"});
  const played = takeBiomesAction(original, "blindar", original.forecast.region);
  const paused = toggleBiomesPause(played);
  assert.equal(takeBiomesAction(paused, "coletar"), paused);
  assert.equal(advanceBiomesRound(paused), paused);
  assert.equal(undoBiomesAction(paused), paused);
  const resumed = toggleBiomesPause(paused);
  const undone = undoBiomesAction(resumed);
  assert.equal(undone.actionsLeft, 2);
  assert.equal(undone.regions[original.forecast.region].shield, 0);
  assert.equal(undone.paused, false);
});

test("Biomas: todas as dificuldades e os dois objetivos possuem caminho de vitória", () => {
  for (const mode of ["conservar", "recuperar"]) {
    for (const difficulty of Object.keys(BIOMES_DIFFICULTIES)) for (let seed = 0; seed < 18; seed++) {
      let game = createBiomesGame({mode, difficulty, seed});
      while (game.phase === "playing") {
        game = takeBiomesAction(game, "blindar", game.forecast.region);
        game = takeBiomesAction(game, "coletar");
        game = advanceBiomesRound(game);
      }
      assert.equal(game.phase, "won", mode + "/" + difficulty + "/" + seed);
      assert.ok(game.score > 0);
    }
  }
});

test("Biomas: ignorar as ameaças no veterano termina em derrota", () => {
  let game = createBiomesGame({difficulty: "veterano", seed: 6});
  for (let i = 0; i < 14 && game.phase === "playing"; i++) {
    game = advanceBiomesRound(game);
  }
  assert.equal(game.phase, "lost");
  assert.equal(advanceBiomesRound(game), game);
  assert.equal(getBiomesForecast(game), null);
});
