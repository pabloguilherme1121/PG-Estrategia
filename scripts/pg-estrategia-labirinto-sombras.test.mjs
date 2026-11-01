import test from "node:test";
import assert from "node:assert/strict";
import {createStealth,moveStealth,undoStealth,pauseStealth,hintStealth,spotStealth,STEALTH_MODES,STEALTH_LEVELS,STEALTH_ACTIONS} from "../public/estrategia/independentes/labirinto-sombras/engine.mjs";
test("infiltração: dois modos, três níveis e 24 sementes reproduzíveis",()=>{
 for(const mode of STEALTH_MODES)for(const difficulty of Object.keys(STEALTH_LEVELS))for(let seed=0;seed<24;seed++){
  const a=createStealth({mode,difficulty,seed});
  assert.deepEqual(a,createStealth({mode,difficulty,seed}));
  assert.equal(a.size,STEALTH_LEVELS[difficulty]);
  assert.equal(a.phase,"playing");assert.deepEqual(a.player,{x:0,y:0});
  assert.deepEqual(a.intel,{x:a.size-1,y:0});
  assert.deepEqual(a.exit,{x:a.size-1,y:a.size-1});
  assert.ok(a.guards.length>=1);
  assert.ok(a.walls.every(([x,y])=>x>0&&y>0&&x<a.size-1&&y<a.size-1));
 }
});
test("infiltração: campo de visão tem direção, alcance e bloqueio por parede",()=>{
 const base={size:5,mode:"cautela",guards:[{x:2,y:2,offset:0}],walls:[]};
 assert.equal(spotStealth(base,{x:2,y:1},0),true);
 assert.equal(spotStealth(base,{x:2,y:0},0),true);
 assert.equal(spotStealth(base,{x:2,y:3},0),false);
 assert.equal(spotStealth(base,{x:3,y:2},1),true);
 assert.equal(spotStealth({...base,walls:[[2,1]]},{x:2,y:0},0),false);
 assert.equal(spotStealth({...base,mode:"alerta"},{x:2,y:0},0),true);
 assert.equal(spotStealth(base,{x:2,y:2},0),true);
});
test("infiltração: movimentos inválidos e parâmetros fora do contrato não alteram estado",()=>{
 const g=createStealth({});
 for(const a of ["foo","",null,1,{},["right"]])assert.equal(moveStealth(g,a),g);
 assert.equal(moveStealth(g,"west"),g);assert.equal(moveStealth(g,"north"),g);
 for(const input of [{mode:"x"},{difficulty:"x"},{seed:-1},{seed:1.5}])
  assert.throws(()=>createStealth(input),RangeError);
});
test("infiltração: pausa bloqueia entrada e desfazer recupera o turno",()=>{
 const g=createStealth({seed:2}),n=moveStealth(g,"east");
 assert.equal(n.turn,1);assert.equal(g.turn,0);
 const paused=pauseStealth(n);assert.equal(paused.paused,true);
 assert.equal(moveStealth(paused,"wait"),paused);
 assert.equal(undoStealth(paused),paused);
 assert.equal(hintStealth(paused),null);
 const unpaused=pauseStealth(paused),undone=undoStealth(unpaused);
 assert.deepEqual(undone.player,g.player);assert.equal(undone.turn,0);
});
test("infiltração: dicas BFS conduzem 144 mapas até a vitória, respeitando prazos",()=>{
 for(const mode of STEALTH_MODES)for(const difficulty of Object.keys(STEALTH_LEVELS))for(let seed=0;seed<24;seed++){
  let g=createStealth({mode,difficulty,seed}),steps=0;
  while(g.phase==="playing"&&steps++<=g.limit){
   const nextMove=hintStealth(g);
   assert.ok(STEALTH_ACTIONS.includes(nextMove),mode+"/"+difficulty+"/"+seed);
   const n=moveStealth(g,nextMove);assert.notEqual(n,g);
   g=n;
  }
  assert.equal(g.phase,"won",mode+"/"+difficulty+"/"+seed);
  assert.equal(g.hasIntel,true);assert.ok(g.score>0);
 }
});
test("infiltração: alarme real provoca derrota; estados finais são imutáveis",()=>{
 const g=createStealth({mode:"cautela",seed:0});
 const forced={...g,player:{x:2,y:1},guards:[{x:2,y:2,offset:0}],walls:[],turn:3};
 const failed=moveStealth(forced,"wait");
 assert.equal(failed.phase,"lost");
 assert.equal(moveStealth(failed,"wait"),failed);
 assert.equal(pauseStealth(failed),failed);
});
test("infiltração: sem tempo suficiente a dica não inventa rota",()=>{
 const g=createStealth({difficulty:"veterano",mode:"alerta",seed:5});
 const noTime={...g,turn:g.limit-1};
 assert.equal(hintStealth(noTime),null);
});
