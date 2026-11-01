import test from "node:test";
import assert from "node:assert/strict";
import {createCargo,placeCargo,undoCargo,pauseCargo,hintCargo,cargoBalance,cargoFit,CARGO_MODES,CARGO_LEVELS} from "../public/estrategia/independentes/conves-modular/engine.mjs";

test("Convés Modular: 2 modos, 3 dificuldades e sementes determinísticas",()=>{
 for(const mode of CARGO_MODES)for(const difficulty of Object.keys(CARGO_LEVELS))for(let seed=0;seed<25;seed++){
  const a=createCargo({mode,difficulty,seed}),b=createCargo({mode,difficulty,seed});
  assert.deepEqual(a,b);assert.equal(a.size,CARGO_LEVELS[difficulty]);
  assert.equal(a.phase,"playing");assert.ok(a.items.length>=4);
  assert.ok(a.blocked.length>0);assert.equal(a.placements.length,0);
 }
});
test("Convés Modular: rejeita configuração e posicionamento inválidos",()=>{
 for(const args of [{mode:"x"},{difficulty:"x"},{seed:-1},{seed:1.2},{seed:Infinity}])
  assert.throws(()=>createCargo(args),RangeError);
 const s=createCargo({seed:7}),id=s.items[0].id;
 for(const move of [{id:"nao-existe",x:0,y:0},{id,x:-1,y:0},{id,x:999,y:0},{id,x:0.5,y:0},{id,x:0,y:0,rotated:"sim"}])
  assert.equal(placeCargo(s,move),s);
 const first=hintCargo(s);assert.ok(first);
 const placed=placeCargo(s,first);
 assert.equal(placed.placements.length,1);assert.equal(s.placements.length,0);
 assert.equal(placeCargo(placed,first),placed);
 const overlaps={id:s.items.find(i=>i.id!==first.id).id,x:first.x,y:first.y};
 assert.equal(cargoFit(placed,overlaps),false);
});
test("Convés Modular: pausa bloqueia, desfazer recupera e limite encerra",()=>{
 const s=createCargo({seed:2}),first=hintCargo(s),played=placeCargo(s,first);
 const paused=pauseCargo(played);assert.equal(paused.paused,true);
 assert.equal(placeCargo(paused,hintCargo(s)),paused);
 assert.equal(hintCargo(paused),null);
 assert.equal(undoCargo(paused),paused);
 const undone=undoCargo(pauseCargo(paused));
 assert.equal(undone.placements.length,0);assert.ok(undone.moves>played.moves);
 const stuck={...s,moves:s.limit-1};
 const lost=placeCargo(stuck,first);
 assert.equal(lost.phase,"lost");assert.equal(placeCargo(lost,first),lost);
});
test("Convés Modular: 150 cenários solucionáveis com dicas reais e meta de equilíbrio",()=>{
 for(const mode of CARGO_MODES)for(const difficulty of Object.keys(CARGO_LEVELS))for(let seed=0;seed<25;seed++){
  let s=createCargo({mode,difficulty,seed}),steps=0;
  while(s.phase==="playing"&&steps++<s.items.length){
   const hint=hintCargo(s);assert.ok(hint,mode+"/"+difficulty+"/"+seed);
   const next=placeCargo(s,hint);assert.notEqual(next,s);s=next;
  }
  assert.equal(s.phase,"won",mode+"/"+difficulty+"/"+seed);
  assert.equal(s.placements.length,s.items.length);
  if(mode==="equilibrio")assert.equal(cargoBalance(s),s.targetBalance);
  assert.ok(s.score>0);
 }
});
