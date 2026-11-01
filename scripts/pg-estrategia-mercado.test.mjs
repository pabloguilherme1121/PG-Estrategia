import test from "node:test";
import assert from "node:assert/strict";
import { createTrade, commandTrade, tradePrice, TRADE_CITIES } from "../public/estrategia/independentes/mercado-de-rotas/game.mjs";

test("Mercado de Rotas inicia três dificuldades e dois objetivos com estados determinísticos", () => {
 for (const difficulty of ["recruta","tatico","veterano"]) {
  for (const mission of ["contratos","lucro"]) {
   const a=createTrade({difficulty,mission,seed:7});
   assert.deepEqual(a,createTrade({difficulty,mission,seed:7}));
   assert.equal(a.phase,"playing");
   assert.equal(a.position,1);
   assert.equal(a.mode,difficulty);
   assert.equal(a.mission,mission);
   assert.equal(a.turn,0);
  }
 }
 assert.throws(()=>createTrade({difficulty:"inválido"}), RangeError);
 assert.throws(()=>createTrade({mission:"sem-missão"}), RangeError);
 assert.equal(TRADE_CITIES.length,4);
});
test("Mercado de Rotas respeita estoque, dinheiro, capacidade e rotas", () => {
 const start=createTrade({seed:7});
 assert.equal(commandTrade(start,{type:"sell",good:"graos",units:1}),start);
 assert.notEqual(commandTrade(start,{type:"travel",to:2}),start);
 assert.equal(commandTrade(start,{type:"travel",to:99}),start);
 const loaded=commandTrade(start,{type:"buy",good:"graos",units:2});
 assert.deepEqual(start.cargo,{graos:0,metal:0,tecnologia:0});
 assert.equal(loaded.cargo.graos,2);
 assert.equal(commandTrade(loaded,{type:"buy",good:"graos",units:2}),loaded);
 assert.equal(loaded.credits<start.credits,true);
});
test("Mercado de Rotas conclui contratos por entrega em cidades distintas", () => {
 let s=createTrade({difficulty:"recruta",mission:"contratos",seed:7});
 const commands=[
  {type:"buy",good:"graos",units:2},{type:"travel",to:3},
  {type:"sell",good:"graos",units:2},{type:"travel",to:2},
  {type:"buy",good:"metal",units:1},{type:"travel",to:3},
  {type:"travel",to:0},{type:"sell",good:"metal",units:1}
 ];
 for(const command of commands){const next=commandTrade(s,command);assert.notEqual(next,s,JSON.stringify(command));s=next;}
 assert.equal(s.phase,"won");
 assert.deepEqual(s.delivered,{graos:2,metal:1});
 assert.ok(s.score>0);
 assert.equal(commandTrade(s,{type:"rest"}),s);
});
test("Mercado de Rotas tem preços dinâmicos, rival determinístico e pausa segura", () => {
 const initial=createTrade({mission:"lucro",seed:4});
 assert.ok(tradePrice(initial,1,"graos")>0);
 const paused=commandTrade(initial,{type:"pause"});
 assert.equal(paused.phase,"paused");
 assert.equal(commandTrade(paused,{type:"buy",good:"graos",units:1}),paused);
 const resumed=commandTrade(paused,{type:"resume"});
 const later=commandTrade(resumed,{type:"rest"});
 assert.equal(later.turn,1);
 assert.ok(later.rival.position!==initial.rival.position);
 assert.deepEqual(later,commandTrade(resumed,{type:"rest"}));
 assert.equal(initial.turn,0);
});
test("Mercado de Rotas pode perder por prazo e rejeita ações inválidas", () => {
 let s=createTrade({mission:"lucro",difficulty:"veterano",seed:9});
 assert.equal(commandTrade(s,{type:"buy",good:"inexistente",units:1}),s);
 assert.equal(commandTrade(s,{type:"buy",good:"graos",units:-3}),s);
 assert.equal(commandTrade(s,{type:"travel",to:99}),s);
 while(s.phase==="playing")s=commandTrade(s,{type:"rest"});
 assert.equal(s.phase,"lost");
 assert.equal(s.turn,s.maxTurns);
 assert.equal(commandTrade(s,{type:"rest"}),s);
});

test("Mercado de Rotas: objetivo Capital também admite vitória na dificuldade Veterano", () => {
 let state=createTrade({difficulty:"veterano",mission:"lucro",seed:7});
 const actions=[
  {type:"buy",good:"graos",units:2},
  {type:"sell",good:"graos",units:1},
  {type:"buy",good:"graos",units:2},
  {type:"travel",to:3},
  {type:"sell",good:"graos",units:2},
  {type:"buy",good:"tecnologia",units:2},
  {type:"sell",good:"graos",units:1},
  {type:"travel",to:2},
  {type:"sell",good:"tecnologia",units:2},
  {type:"buy",good:"metal",units:2},
  {type:"sell",good:"metal",units:2},
 ];
 for(const action of actions) {
  const next=commandTrade(state,action);
  assert.notEqual(next,state,"a sequência vencedora deve aplicar todas as decisões");
  state=next;
 }
 assert.equal(state.phase,"won");
 assert.equal(state.credits,70);
 assert.equal(state.turn,11);
 assert.ok(state.score>0);
});
