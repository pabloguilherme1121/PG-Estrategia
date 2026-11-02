import test from "node:test";
import assert from "node:assert/strict";
import {createGravity,tiltGravity,undoGravity,pauseGravity,hintGravity,solveGravity,GRAVITY_LEVELS,GRAVITY_MODES,GRAVITY_DIRS} from "../public/estrategia/independentes/gravidade-cristais/engine.mjs";
const point=({x,y})=>x+":"+y;
test("Gravidade dos Cristais: dois modos, três níveis e cenários reproduzíveis",()=>{
 for(const mode of GRAVITY_MODES)for(const difficulty of Object.keys(GRAVITY_LEVELS))for(let seed=0;seed<25;seed++){
  const a=createGravity({mode,difficulty,seed});
  assert.deepEqual(a,createGravity({mode,difficulty,seed}));
  assert.equal(a.size,GRAVITY_LEVELS[difficulty]);
  assert.equal(a.tokens.length,2);assert.equal(a.goals.length,2);
  assert.equal(new Set(a.tokens.map(point)).size,2);
  assert.equal(new Set(a.goals.map(point)).size,2);
  const occupied=new Set(a.blocks.map(point));
  for(const item of [...a.tokens,...a.goals]){
   assert.ok(item.x>=0&&item.x<a.size&&item.y>=0&&item.y<a.size);
   assert.ok(!occupied.has(point(item)),"parede não pode ocupar peça ou objetivo");
  }
  assert.equal(a.phase,"playing");assert.equal(a.moves,0);
  assert.ok(a.limit>=5);
 }
});
test("Gravidade: rejeita configurações inválidas e direções desconhecidas",()=>{
 for(const args of [{mode:"x"},{difficulty:"x"},{seed:-1},{seed:1.1},{seed:Infinity},{seed:100000000}])
  assert.throws(()=>createGravity(args),RangeError);
 const s=createGravity({seed:2});
 for(const invalid of ["leste","UP",null,{},0])assert.equal(tiltGravity(s,invalid),s);
});
test("Gravidade: gravidade move peças simultâneas sem sobrepor paredes nem peças",()=>{
 for(const mode of GRAVITY_MODES)for(const difficulty of Object.keys(GRAVITY_LEVELS))for(let seed=0;seed<25;seed++){
  let s=createGravity({mode,difficulty,seed});
  for(const direction of GRAVITY_DIRS){
   const next=tiltGravity(s,direction);
   const taken=new Set(s.blocks.map(point));
   assert.equal(new Set(next.tokens.map(point)).size,2);
   for(const token of next.tokens){assert.ok(!taken.has(point(token)));assert.ok(token.x>=0&&token.x<next.size&&token.y>=0&&token.y<next.size);}
  }
 }
});
test("Gravidade: pausa bloqueia movimentos, desfazer restaura estado e derrota encerra",()=>{
 const s=createGravity({seed:17}),step=hintGravity(s);
 assert.ok(GRAVITY_DIRS.includes(step));
 const moved=tiltGravity(s,step);assert.notEqual(moved,s);assert.equal(moved.moves,1);
 const paused=pauseGravity(moved);
 assert.equal(paused.paused,true);assert.equal(tiltGravity(paused,step),paused);
 assert.equal(hintGravity(paused),null);assert.equal(undoGravity(paused),paused);
 const resumed=pauseGravity(paused);const undone=undoGravity(resumed);
 assert.deepEqual(undone.tokens,s.tokens);assert.equal(undone.moves,2);
 const lost=tiltGravity({...s,limit:1},step);
 assert.equal(lost.phase,"lost");assert.equal(tiltGravity(lost,step),lost);
});
test("Gravidade: 150 partidas vencíveis com as dicas do próprio motor",()=>{
 let games=0;
 for(const mode of GRAVITY_MODES)for(const difficulty of Object.keys(GRAVITY_LEVELS))for(let seed=0;seed<25;seed++){
  let s=createGravity({mode,difficulty,seed});
  const optimal=solveGravity(s);
  assert.ok(optimal?.length>=2,mode+"/"+difficulty+"/"+seed+": partida trivial");
  let steps=0;
  while(s.phase==="playing"&&steps++<s.limit){
   const hint=hintGravity(s);
   assert.ok(GRAVITY_DIRS.includes(hint),mode+"/"+difficulty+"/"+seed);
   s=tiltGravity(s,hint);
  }
  assert.equal(s.phase,"won",mode+"/"+difficulty+"/"+seed);
  assert.equal(s.tokens.filter((p,i)=>point(p)===point(s.goals[i])).length,2);
  assert.ok(s.score>0);games++;
 }
 assert.equal(games,150);
});
