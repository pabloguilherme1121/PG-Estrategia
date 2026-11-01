import test from "node:test";
import assert from "node:assert/strict";
import {createTower,moveDisc,undoTower,toggleTowerPause,nextTowerHint,TOWER_LEVELS} from "../public/estrategia/independentes/torre-logistica/engine.mjs";

test("Torre Logística tem modos, três níveis e estados determinísticos",()=>{
 for(const mode of ["transferencia","resgate"])for(const difficulty of Object.keys(TOWER_LEVELS)){
  const a=createTower({mode,difficulty,seed:17});
  assert.deepEqual(a,createTower({mode,difficulty,seed:17}));
  assert.equal(a.discs,TOWER_LEVELS[difficulty].discs);
  assert.equal(a.pegs.flat().length,a.discs);
  assert.equal(a.phase,"playing");
  assert.equal(a.target,mode==="transferencia"?2:1);
  assert.ok(a.pegs.every(peg=>peg.every((v,i)=>i===0||peg[i-1]>v)));
 }
 assert.throws(()=>createTower({mode:"invalido"}),RangeError);
 assert.throws(()=>createTower({difficulty:"invalida"}),RangeError);
 assert.throws(()=>createTower({seed:-1}),RangeError);
});
test("Torre: regra de disco menor bloqueia jogadas proibidas e preserva o estado",()=>{
 const start=createTower({seed:0});
 const first=moveDisc(start,0,1);
 assert.notEqual(first,start);assert.equal(start.moves,0);
 assert.equal(first.moves,1);assert.equal(first.pegs[1].at(-1),1);
 assert.equal(moveDisc(first,0,1),first);
 assert.equal(moveDisc(first,0,0),first);
 assert.equal(moveDisc(first,0,8),first);
 assert.equal(moveDisc(first,1.4,2),first);
});
test("Torre: pausar impede movimento e desfazer restaura posição anterior",()=>{
 const first=createTower({seed:0});
 const paused=toggleTowerPause(first);
 assert.equal(moveDisc(paused,0,2),paused);
 const playing=toggleTowerPause(paused);
 const second=moveDisc(playing,0,2);
 const undone=undoTower(second);
 assert.deepEqual(undone.pegs,first.pegs);
 assert.equal(undone.moves,0);
 assert.equal(toggleTowerPause(second).paused,true);
});
test("Torre: 180 configurações têm solução legal obtida pelo sistema de dicas",()=>{
 for(const mode of ["transferencia","resgate"])for(const difficulty of Object.keys(TOWER_LEVELS))for(let seed=0;seed<30;seed++){
  let state=createTower({mode,difficulty,seed});
  for(let turn=0;turn<state.maxMoves&&state.phase==="playing";turn++){
   const next=nextTowerHint(state);
   assert.ok(next&&[0,1,2].includes(next.from)&&[0,1,2].includes(next.to),mode+"/"+difficulty+"/"+seed);
   state=moveDisc(state,next.from,next.to);
   assert.equal(state.moves,turn+1);
  }
  assert.equal(state.phase,"won",mode+"/"+difficulty+"/"+seed);
  assert.equal(state.pegs[state.target].length,state.discs);
  assert.equal(nextTowerHint(state),null);
 }
});
test("Torre: limite de manobras encerra partida sem efeito em comandos posteriores",()=>{
 let state=createTower({mode:"resgate",difficulty:"recruta",seed:0});
 for(let i=0;i<state.maxMoves&&state.phase==="playing";i++){
  const choice=i%2===0?[0,2]:[2,0];
  state=moveDisc(state,...choice);
 }
 assert.equal(state.phase,"lost");
 assert.equal(nextTowerHint(state),null);
 assert.equal(moveDisc(state,0,1),state);
 assert.equal(undoTower(state).phase,"playing");
});
