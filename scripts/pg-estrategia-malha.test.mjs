import test from "node:test";
import assert from "node:assert/strict";
import { createGrid, pressCell, toggleGridPause, undoGrid, revealGridHint, ENERGY_DIFFICULTIES } from "../public/estrategia/independentes/malha-energia/engine.mjs";

test("Malha: duas missões, três dificuldades, sementes determinísticas e estados válidos", () => {
  for (const mode of ["restaurar","desligar"]) for (const difficulty of Object.keys(ENERGY_DIFFICULTIES)) {
    const initial = createGrid({mode,difficulty,seed:42});
    assert.deepEqual(initial,createGrid({mode,difficulty,seed:42}));
    assert.equal(initial.cells.length,initial.size**2);
    assert.equal(initial.phase,"playing");
    assert.notEqual(initial.cells.every(cell=>cell===initial.goal),true);
  }
  assert.throws(()=>createGrid({mode:"invalido"}),RangeError);
  assert.throws(()=>createGrid({difficulty:"invalida"}),RangeError);
  assert.throws(()=>createGrid({seed:-1}),RangeError);
});

test("Malha: cada comando alterna o centro e apenas os vizinhos ortogonais",()=>{
  const a=createGrid({seed:3,difficulty:"recruta"});
  const next=pressCell(a,4);
  const changed=a.cells.map((v,i)=>v!==next.cells[i]?i:-1).filter(i=>i>=0);
  assert.deepEqual(changed,[1,3,4,5,7]);
  assert.equal(a.moves,0);
  assert.equal(next.moves,1);
  assert.equal(pressCell(a,-1),a);
  assert.equal(pressCell(a,9),a);
  assert.equal(pressCell(a,1.5),a);
});

test("Malha: pausa, desfazer, limite de comandos e estado terminal",()=>{
  const start=createGrid({seed:5});
  const paused=toggleGridPause(start);
  assert.equal(pressCell(paused,0),paused);
  const played=pressCell(toggleGridPause(paused),0);
  const undone=undoGrid(played);
  assert.deepEqual(undone.cells,start.cells);
  assert.equal(undone.moves,0);
  let state=start;
  for(let i=0;i<start.maxMoves&&state.phase==="playing";i++)state=pressCell(state,0);
  assert.equal(state.phase,"lost");
  assert.equal(pressCell(state,0),state);
  assert.equal(toggleGridPause(state),state);
});

test("Malha: toda partida gerada tem rota de vitória em dois modos, três níveis e 24 sementes",()=>{
  for(const mode of ["restaurar","desligar"])for(const difficulty of Object.keys(ENERGY_DIFFICULTIES))for(let seed=0;seed<24;seed++){
    let state=createGrid({mode,difficulty,seed});
    for(let n=0;n<state.maxMoves&&state.phase==="playing";n++){
      const hint=revealGridHint(state);
      assert.ok(Number.isInteger(hint)&&hint>=0&&hint<state.cells.length,
        "Nenhuma solução em "+mode+"/"+difficulty+"/"+seed);
      state=pressCell(state,hint);
    }
    assert.equal(state.phase,"won","Partida insolúvel: "+mode+"/"+difficulty+"/"+seed);
    assert.equal(revealGridHint(state),null);
  }
});
