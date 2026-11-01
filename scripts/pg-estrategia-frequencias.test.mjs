import test from "node:test";
import assert from "node:assert/strict";
import {
  createFrequencyNetwork, assignFrequency, clearFrequency,
  undoFrequency, toggleFrequencyPause, getFrequencyHint,
  FREQUENCY_DIFFICULTIES, FREQUENCY_MODES,
} from "../public/estrategia/independentes/rede-frequencias/engine.mjs";

test("Frequências: dois modos, três dificuldades, grafos conectados e sementes determinísticas", () => {
  for (const mode of FREQUENCY_MODES) for (const difficulty of Object.keys(FREQUENCY_DIFFICULTIES)) {
    for (let seed = 0; seed < 16; seed++) {
      const game = createFrequencyNetwork({mode,difficulty,seed});
      assert.deepEqual(game,createFrequencyNetwork({mode,difficulty,seed}));
      assert.equal(game.phase,"playing");
      assert.equal(game.slots.length,FREQUENCY_DIFFICULTIES[difficulty].nodes);
      assert.equal(game.channels,mode==="economizar"?2:3);
      assert.ok(game.edges.length>=game.slots.length-1);
      assert.equal(new Set(game.edges.map(([a,b])=>a+":"+b)).size,game.edges.length);
      assert.ok(game.edges.every(([a,b])=>a>=0&&b<game.slots.length&&a<b));
    }
  }
  assert.throws(()=>createFrequencyNetwork({mode:"invalido"}),RangeError);
  assert.throws(()=>createFrequencyNetwork({difficulty:"invalida"}),RangeError);
  assert.throws(()=>createFrequencyNetwork({seed:-1}),RangeError);
});

test("Frequências: impede interferências e mudanças inválidas sem alterar estado", () => {
  const game=createFrequencyNetwork({seed:12});
  const [a,b]=game.edges[0];
  const first=assignFrequency(game,a,0);
  assert.equal(game.slots[a],null);
  assert.equal(first.slots[a],0);
  assert.equal(first.moves,1);
  assert.equal(assignFrequency(first,b,0),first);
  assert.equal(assignFrequency(first,a,0),first);
  assert.equal(assignFrequency(first,-1,0),first);
  assert.equal(assignFrequency(first,b,5),first);
  assert.equal(clearFrequency(first,b),first);
  const cleared=clearFrequency(first,a);
  assert.equal(cleared.slots[a],null);
  assert.equal(cleared.moves,2);
});

test("Frequências: pausa e desfazer preservam tabuleiro e estado", () => {
  const start=createFrequencyNetwork({seed:5});
  const played=assignFrequency(start,0,0);
  const paused=toggleFrequencyPause(played);
  assert.equal(assignFrequency(paused,1,1),paused);
  assert.equal(clearFrequency(paused,0),paused);
  assert.equal(undoFrequency(paused),paused);
  assert.equal(getFrequencyHint(paused),null);
  const resumed=toggleFrequencyPause(paused);
  const back=undoFrequency(resumed);
  assert.deepEqual(back.slots,start.slots);
  assert.equal(back.moves,0);
  assert.equal(back.paused,false);
});

test("Frequências: dica oferece solução segura em 2 modos, 3 níveis e 25 sementes", () => {
  for(const mode of FREQUENCY_MODES) for(const difficulty of Object.keys(FREQUENCY_DIFFICULTIES)) {
    for(let seed=0;seed<25;seed++) {
      let state=createFrequencyNetwork({mode,difficulty,seed});
      for(let step=0;step<state.slots.length && state.phase==="playing";step++) {
        const hint=getFrequencyHint(state);
        assert.ok(hint&&Number.isInteger(hint.node)&&Number.isInteger(hint.channel),
          "Sem solução em "+mode+"/"+difficulty+"/"+seed);
        const next=assignFrequency(state,hint.node,hint.channel);
        assert.notEqual(next,state);
        state=next;
      }
      assert.equal(state.phase,"won",mode+"/"+difficulty+"/"+seed);
      assert.equal(getFrequencyHint(state),null);
      assert.ok(state.score>0);
    }
  }
});

test("Frequências: esgotar tentativas encerra rodada e reinício é independente", () => {
  let state=createFrequencyNetwork({difficulty:"recruta",seed:2});
  for(let step=0;step<state.maxMoves;step++) {
    state=assignFrequency(state,0,step%2);
    assert.equal(state.moves,step+1);
  }
  assert.equal(state.phase,"lost");
  assert.equal(assignFrequency(state,1,1),state);
  assert.equal(toggleFrequencyPause(state),state);
  assert.equal(createFrequencyNetwork({seed:2}).moves,0);
});
