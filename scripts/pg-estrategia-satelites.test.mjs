import test from "node:test";
import assert from "node:assert/strict";
import {createOrbitals,stepOrbitals,undoOrbitals,toggleOrbitalPause,hintOrbitals,ORBITAL_LEVELS,ORBITAL_MODES} from "../public/estrategia/independentes/satelites-orbitais/engine.mjs";
test("satélites: duas missões e três níveis geram janelas e obstáculos reais",()=>{
 for(const mode of ORBITAL_MODES)for(const difficulty of Object.keys(ORBITAL_LEVELS))for(let seed=0;seed<24;seed++){
  const g=createOrbitals({mode,difficulty,seed});
  assert.deepEqual(g,createOrbitals({mode,difficulty,seed}));
  assert.equal(g.targets.length,ORBITAL_LEVELS[difficulty].targets);
  assert.ok(g.targets.every(t=>t.start<t.end&&t.end<g.slots&&t.start>=0));
  assert.ok(g.blocked.every(i=>i%2===1));
  assert.equal(g.phase,"playing");
 }
});
test("satélites: pedidos inválidos não alteram rodada ou recursos",()=>{
 const g=createOrbitals();
 for(const action of [{kind:"capture",target:"x"},{kind:"capture",target:"t1"},{kind:"hack"},null]){
  assert.equal(stepOrbitals(g,action),g);
 }
 assert.throws(()=>createOrbitals({mode:"fake"}),RangeError);
 assert.throws(()=>createOrbitals({difficulty:"fake"}),RangeError);
 assert.throws(()=>createOrbitals({seed:-1}),RangeError);
});
test("satélites: pausa e desfazer funcionam após uma transmissão",()=>{
 const g=createOrbitals({seed:1});
 const next=stepOrbitals(g,{kind:"capture",target:"t0"});
 assert.equal(next.turn,1);
 assert.equal(next.captured.length,1);
 assert.equal(g.captured.length,0);
 const paused=toggleOrbitalPause(next);
 assert.equal(paused.paused,true);
 assert.equal(stepOrbitals(paused,{kind:"wait"}),paused);
 assert.equal(undoOrbitals(paused),paused);
 assert.equal(hintOrbitals(paused),null);
 const undone=undoOrbitals(toggleOrbitalPause(paused));
 assert.equal(undone.turn,0);
 assert.equal(undone.captured.length,0);
 assert.equal(undone.energy,g.energy);
});
test("satélites: BFS encontra vitória em 2 modos, 3 níveis e 24 sementes",()=>{
 for(const mode of ORBITAL_MODES)for(const difficulty of Object.keys(ORBITAL_LEVELS))for(let seed=0;seed<24;seed++){
  let g=createOrbitals({mode,difficulty,seed}),guard=0;
  while(g.phase==="playing"&&guard++<g.slots){
   const action=hintOrbitals(g);
   assert.ok(action,mode+"/"+difficulty+"/"+seed);
   g=stepOrbitals(g,action);
  }
  assert.equal(g.phase,"won",mode+"/"+difficulty+"/"+seed);
  assert.ok(g.score>0);
 }
});
test("satélites: ignorar contatos até o prazo termina em derrota e reinício funciona",()=>{
 let g=createOrbitals({difficulty:"veterano",mode:"cobertura"});
 for(let i=0;i<g.slots;i++)g=stepOrbitals(g,{kind:"wait"});
 assert.equal(g.phase,"lost");
 assert.equal(stepOrbitals(g,{kind:"wait"}),g);
 assert.equal(toggleOrbitalPause(g),g);
 assert.equal(createOrbitals().phase,"playing");
});
