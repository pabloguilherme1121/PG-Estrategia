import test from "node:test";
import assert from "node:assert/strict";
import {createCouncil, commandCouncil, previewVote, FACTIONS, POLICIES} from "../public/estrategia/independentes/conselho-de-reinos/engine.mjs";

test("Conselho: quatro facções, três dificuldades e dois objetivos determinísticos",()=>{
 assert.equal(FACTIONS.length,4);assert.equal(Object.keys(POLICIES).length,4);
 for(const mode of ["tratados","crise"])for(const difficulty of ["recruta","tatico","veterano"]){
  const a=createCouncil({mode,difficulty,seed:7});
  assert.deepEqual(a,createCouncil({mode,difficulty,seed:7}));
  assert.equal(a.status,"playing");assert.equal(a.round,0);
  assert.equal(a.trust.length,4);assert.equal(a.goal,mode==="tratados"?3:2);
 }
 assert.throws(()=>createCouncil({difficulty:"super"}),RangeError);
 assert.throws(()=>createCouncil({mode:"desconhecido"}),RangeError);
});
test("Conselho: votação exige coalizão, negociações custam influência e não podem ultrapassar duas por rodada",()=>{
 const s=createCouncil({difficulty:"recruta",seed:7});
 assert.equal(previewVote(s,"comercio").seats,5);
 const a=commandCouncil(s,{type:"talk",faction:2});
 assert.equal(a.influence,s.influence-1);
 assert.equal(a.trust[2],s.trust[2]+1);
 assert.equal(a.round,0);
 assert.equal(previewVote(a,"comercio").seats,7);
 const b=commandCouncil(a,{type:"talk",faction:3});
 assert.equal(commandCouncil(b,{type:"talk",faction:1}),b);
 assert.equal(s.trust[2],3);
 assert.equal(commandCouncil(s,{type:"talk",faction:99}),s);
});
test("Conselho: conquista três aprovações por maioria com rivais, sem mutar o estado inicial",()=>{
 const initial=createCouncil({difficulty:"recruta",mode:"tratados",seed:7});
 let state=initial;
 for(let round=0;round<3;round++){
  // Negocie o suficiente para aprovar uma política favorável a uma maioria.
  for(let talks=0;talks<2&&Math.max(...Object.keys(POLICIES).map(policy=>previewVote(state,policy).seats))<state.requiredSeats;talks++){
   const faction=state.trust.indexOf(Math.min(...state.trust));
   state=commandCouncil(state,{type:"talk",faction});
  }
  const policy=Object.keys(POLICIES).find(key=>previewVote(state,key).seats>=state.requiredSeats);
  assert.ok(policy,"deve haver coalizão viável no turno "+round);
  state=commandCouncil(state,{type:"vote",policy});
 }
 assert.equal(state.status,"won");assert.equal(state.passed,3);assert.ok(state.score>0);
 assert.equal(initial.passed,0);assert.equal(commandCouncil(state,{type:"wait"}),state);
});
test("Conselho: modo crise permite vitória e derrotas respeitam prazo e pausa",()=>{
 let s=createCouncil({difficulty:"veterano",mode:"crise",seed:2});
 const paused=commandCouncil(s,{type:"pause"});
 assert.equal(paused.status,"paused");
 assert.equal(commandCouncil(paused,{type:"wait"}),paused);
 assert.equal(commandCouncil(paused,{type:"resume"}).status,"playing");
 assert.equal(commandCouncil(s,{type:"vote",policy:"invalido"}),s);
 while(s.status==="playing")s=commandCouncil(s,{type:"wait"});
 assert.equal(s.status,"lost");assert.equal(s.round,s.maxRounds);
 assert.deepEqual(s,commandCouncil(s,{type:"wait"}));
});
