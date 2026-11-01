import test from "node:test";
import assert from "node:assert/strict";
import {createBridges,toggleBridge,undoBridge,toggleBridgePause,nextBridgeHint,BRIDGE_LEVELS} from "../public/estrategia/independentes/pontes-arquipelago/engine.mjs";

test("Pontes: modos e três níveis são determinísticos e entradas incorretas são rejeitadas",()=>{
 for(const mode of ["conexao","redundancia"]) for(const difficulty of Object.keys(BRIDGE_LEVELS)){
  const a=createBridges({mode,difficulty,seed:17});
  assert.deepEqual(a,createBridges({mode,difficulty,seed:17}));
  assert.equal(a.phase,"playing");assert.equal(a.selected.length,0);
  assert.equal(a.islands.length,BRIDGE_LEVELS[difficulty].islands);
  assert.equal(a.edges.length,a.islands.length*2,"Cada ilha deve ter uma ligação de circuito e uma alternativa diagonal");
  assert.ok(a.budget>=a.edges.filter(x=>x.ring).reduce((sum,e)=>sum+e.cost,0));
 }
 assert.throws(()=>createBridges({mode:"invalido"}),RangeError);
 assert.throws(()=>createBridges({difficulty:"impossivel"}),RangeError);
 assert.throws(()=>createBridges({seed:-1}),RangeError);
});

test("Pontes: custo, retirada, undo e pausa são aplicados sem mutação",()=>{
 const start=createBridges({seed:2});
 const id=start.edges[0].id;
 const after=toggleBridge(start,id);
 assert.notEqual(after,start);
 assert.equal(start.spent,0);
 assert.equal(after.spent,start.edges[0].cost);
 assert.deepEqual(after.selected,[id]);
 assert.equal(toggleBridge(after,"inexistente"),after);
 assert.equal(toggleBridge(toggleBridgePause(after),id).paused,true);
 assert.equal(toggleBridge(undoBridge(after),id).moves,1);
 const removed=toggleBridge(after,id);
 assert.equal(removed.spent,0);
 assert.deepEqual(removed.selected,[]);
});

test("Pontes: conexão aceita árvore, redundância exige que nenhuma ponte isolada corte a rede",()=>{
 for(const difficulty of Object.keys(BRIDGE_LEVELS)){
  let a=createBridges({difficulty,mode:"conexao",seed:0});
  let b=createBridges({difficulty,mode:"redundancia",seed:0});
  const ring=a.edges.filter(e=>e.ring);
  for(const edge of ring.slice(0,-1)){a=toggleBridge(a,edge.id);b=toggleBridge(b,edge.id);}
  assert.equal(a.phase,"won",difficulty+" conexão");
  assert.equal(b.phase,"playing",difficulty+" redundância não pode vencer com árvore");
  b=toggleBridge(b,ring.at(-1).id);
  assert.equal(b.phase,"won",difficulty+" redundância com circuito");
 }
});

test("Pontes: solução garantida em 144 cenários; dicas não jogam automaticamente",()=>{
 for(const mode of ["conexao","redundancia"])for(const difficulty of Object.keys(BRIDGE_LEVELS))for(let seed=0;seed<24;seed++){
  let s=createBridges({mode,difficulty,seed});
  const limit=s.maxMoves;
  for(let n=0;n<limit&&s.phase==="playing";n++){
   const id=nextBridgeHint(s);
   assert.ok(typeof id==="string"&&id.length>0);
   const before=s.moves;
   s=toggleBridge(s,id);
   assert.equal(s.moves,before+1);
  }
  assert.equal(s.phase,"won",mode+"/"+difficulty+"/"+seed);
  assert.equal(nextBridgeHint(s),null);
  assert.ok(s.spent<=s.budget);
 }
});

test("Pontes: alternar ligações até o limite encerra a partida e undo recupera estado",()=>{
 let s=createBridges({mode:"redundancia",seed:5,difficulty:"veterano"});
 const id=s.edges.find(e=>!e.ring).id;
 for(let i=0;i<s.maxMoves&&s.phase==="playing";i++)s=toggleBridge(s,id);
 assert.equal(s.phase,"lost");
 assert.equal(toggleBridge(s,id),s);
 const undone=undoBridge(s);
 assert.equal(undone.phase,"playing");
});
