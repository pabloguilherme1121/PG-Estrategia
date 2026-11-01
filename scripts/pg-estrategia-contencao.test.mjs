import test from "node:test";
import assert from "node:assert/strict";
import {
  createFireline, firelineAction, advanceFireline,
  toggleFirelinePause, undoFireline, getFirelineHint,
  FIRELINE_LEVELS, FIRELINE_MODES,
} from "../public/estrategia/independentes/linha-contencao/engine.mjs";

test("Contenção: geração determinística, 2 modos e 3 dificuldades com incêndio distante das bases", () => {
  for (const mode of FIRELINE_MODES) for (const difficulty of Object.keys(FIRELINE_LEVELS)) {
    for (let seed = 0; seed < 24; seed++) {
      const state=createFireline({mode,difficulty,seed});
      const size=FIRELINE_LEVELS[difficulty].size;
      assert.deepEqual(state,createFireline({mode,difficulty,seed}));
      assert.equal(state.size,size);
      assert.equal(state.burning.length,FIRELINE_LEVELS[difficulty].fires);
      assert.ok(state.burning.every(i=>i<size));
      assert.ok(state.settlements.every(i=>i>=size*(size-1)));
      assert.equal(state.phase,"playing");
      assert.equal(state.actionsLeft,2);
      assert.equal(state.round,1);
    }
  }
  assert.throws(()=>createFireline({mode:"falso"}),RangeError);
  assert.throws(()=>createFireline({difficulty:"falso"}),RangeError);
  assert.throws(()=>createFireline({seed:-1}),RangeError);
});

test("Contenção: ações rejeitam movimentos ilegais e nunca alteram estado original", () => {
  const start=createFireline({seed:4});
  const fire=start.burning[0], house=start.settlements[0];
  assert.equal(firelineAction(start,"firebreak",fire),start);
  assert.equal(firelineAction(start,"firebreak",house),start);
  assert.equal(firelineAction(start,"suppress",house),start);
  assert.equal(firelineAction(start,"suppress",-1),start);
  assert.equal(firelineAction(start,"hack",fire),start);
  const after=firelineAction(start,"suppress",fire);
  assert.notEqual(after,start);
  assert.equal(start.burning.includes(fire),true);
  assert.equal(after.burning.includes(fire),false);
  assert.equal(after.water,start.water-1);
  assert.equal(after.actionsLeft,1);
  const replenished=firelineAction(after,"refill");
  assert.equal(replenished.actionsLeft,0);
  assert.ok(replenished.water>=after.water);
  assert.equal(firelineAction(replenished,"refill"),replenished);
});

test("Contenção: pausa bloqueia ações, rodada, dicas e desfazer", () => {
  const start=createFireline({seed:3});
  const moved=firelineAction(start,"suppress",start.burning[0]);
  const paused=toggleFirelinePause(moved);
  assert.equal(paused.paused,true);
  assert.equal(firelineAction(paused,"refill"),paused);
  assert.equal(advanceFireline(paused),paused);
  assert.equal(undoFireline(paused),paused);
  assert.equal(getFirelineHint(paused),null);
  const resumed=toggleFirelinePause(paused);
  const undone=undoFireline(resumed);
  assert.deepEqual(undone.burning,start.burning);
  assert.equal(undone.water,start.water);
  assert.equal(undone.actionsLeft,2);
});

test("Contenção: fogo e faixas de segurança respeitam regras e rodadas", () => {
  let game=createFireline({difficulty:"recruta",seed:9});
  const unburned=game.size + game.burning[0];
  const firebreak=firelineAction(game,"firebreak",unburned);
  assert.ok(firebreak.firebreaks.includes(unburned));
  assert.ok(!game.firebreaks.includes(unburned));
  const advanced=advanceFireline(firebreak);
  assert.equal(advanced.round,2);
  assert.equal(advanced.actionsLeft,2);
  assert.equal(advanced.history.length,0);
  assert.ok(!advanced.burning.includes(unburned));
  assert.equal(undoFireline(advanced),advanced);
});

test("Contenção: recomendações têm rota vencedora em sementes representativas", () => {
  for (const mode of FIRELINE_MODES) for (const difficulty of Object.keys(FIRELINE_LEVELS)) {
    for (let seed=0;seed<18;seed++) {
      let game=createFireline({mode,difficulty,seed});
      let guard=0;
      while(game.phase==="playing" && guard++<100) {
        if(game.actionsLeft>0) {
          const hint=getFirelineHint(game);
          assert.ok(hint && ["suppress","refill","firebreak"].includes(hint.action),mode+"/"+difficulty+"/"+seed);
          const next=firelineAction(game,hint.action,hint.cell);
          assert.notEqual(next,game);
          game=next;
        } else game=advanceFireline(game);
      }
      assert.equal(game.phase,"won",mode+"/"+difficulty+"/"+seed);
      assert.ok(game.score>0);
    }
  }
});

test("Contenção: deixar incêndios se espalharem leva à derrota; reinício é limpo", () => {
  let state=createFireline({mode:"proteger",difficulty:"veterano",seed:8});
  for(let i=0;i<20 && state.phase==="playing";i++) state=advanceFireline(state);
  assert.equal(state.phase,"lost");
  assert.equal(firelineAction(state,"refill"),state);
  assert.equal(toggleFirelinePause(state),state);
  assert.equal(createFireline({seed:8}).phase,"playing");
});
