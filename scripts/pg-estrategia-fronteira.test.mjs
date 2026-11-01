import test from "node:test";
import assert from "node:assert/strict";
import {createFrontier, commandFrontier, canFrontierAction, FRONTIER_DIFFICULTIES, FRONTIER_MODES} from "../public/estrategia/independentes/frontier.mjs";

test("Fronteira Orbital: seis combinações geram mapas determinísticos e próprios",()=>{
 for(const difficulty of FRONTIER_DIFFICULTIES) for(const mission of FRONTIER_MODES){
  const a=createFrontier({difficulty,mission,seed:1337});
  assert.deepEqual(a,createFrontier({difficulty,mission,seed:1337}));
  assert.equal(a.phase,"playing");assert.equal(a.terrain.length,16);
  assert.equal(a.owners[0],1);assert.equal(a.owners[15],2);
  assert.equal(a.visible[0],true);assert.equal(a.owners.filter(o=>o===1).length,1);
  assert.ok(a.maxTurns>=18);
 }
});
test("Fronteira Orbital: exploração é exigida antes de colonizar",()=>{
 const s=createFrontier({seed:123});
 assert.equal(canFrontierAction(s,{type:"colonize",cell:1}),false);
 assert.equal(canFrontierAction(s,{type:"scout",cell:1}),true);
 const explored=commandFrontier(s,{type:"scout",cell:1});
 assert.equal(explored.turn,1);assert.equal(explored.visible[1],true);
 assert.equal(explored.owners[1],0);assert.equal(s.visible[1],false);
 const planted=commandFrontier(explored,{type:"colonize",cell:1});
 assert.equal(planted.turn,2);assert.equal(planted.owners[1],1);
 assert.equal(planted.owners[0],1);
 assert.equal(commandFrontier(planted,{type:"colonize",cell:1}),planted);
});
test("Fronteira Orbital: vitória por expansão exige colônias adjacentes reais",()=>{
 let s=createFrontier({difficulty:"recruta",mission:"expansao",seed:2});
 for(const cell of [1,2,3,4]){
  s=commandFrontier(s,{type:"scout",cell});
  assert.equal(s.visible[cell],true);
  s=commandFrontier(s,{type:"colonize",cell});
 }
 assert.equal(s.phase,"won");assert.equal(s.owners.filter(o=>o===1).length,5);
 assert.ok(s.score>0);
 assert.equal(commandFrontier(s,{type:"extract"}),s);
});
test("Fronteira Orbital: vitória por pesquisa sem disfarçar expansão",()=>{
 let s=createFrontier({mission:"pesquisa",seed:2});
 assert.equal(commandFrontier(s,{type:"research"}),s,"pesquisa exige infraestrutura");
 s=commandFrontier(s,{type:"scout",cell:1});
 s=commandFrontier(s,{type:"colonize",cell:1});
 for(let i=0;i<4;i++)s=commandFrontier(s,{type:"research"});
 assert.equal(s.phase,"won");assert.ok(s.science>=12);
 assert.equal(s.owners.filter(o=>o===1).length,2);
});
test("Fronteira Orbital: rival conquista territórios, derrota e pausa persistentes",()=>{
 let s=createFrontier({difficulty:"veterano",mission:"expansao",seed:44});
 const idle=commandFrontier(s,{type:"pause"});
 assert.equal(idle.paused,true);
 assert.equal(commandFrontier(idle,{type:"extract"}),idle);
 s=commandFrontier(idle,{type:"resume"});
 assert.equal(s.paused,false);
 s=commandFrontier(s,{type:"scout",cell:1});
 s=commandFrontier(s,{type:"colonize",cell:1});
 assert.equal(s.owners[1],1);
 for(let i=0;i<45&&s.phase==="playing";i++)s=commandFrontier(s,{type:i%2===0?"extract":"research"});
 assert.equal(s.phase,"lost");
 assert.ok(s.owners.filter(o=>o===2).length>1);
 assert.equal(commandFrontier(s,{type:"research"}),s);
});
test("Fronteira Orbital: invalidez, paredes e energia finita não corrompem o estado",()=>{
 assert.throws(()=>createFrontier({difficulty:"inexistente"}),RangeError);
 assert.throws(()=>createFrontier({mission:"inexistente"}),RangeError);
 assert.throws(()=>createFrontier({seed:NaN}),RangeError);
 const s=createFrontier();
 for(const action of [null,{}, {type:"scout",cell:15},{type:"scout",cell:2},{type:"scout",cell:-1},{type:"scout",cell:"1"},{type:"colonize",cell:1},{type:"invalido",cell:5},{type:"colonize",cell:15}].slice(0,8)){
  assert.equal(commandFrontier(s,action),s);
 }
 assert.equal(commandFrontier(s,{type:"research"}),s);
 const scout=commandFrontier(s,{type:"scout",cell:1});
 const colony=commandFrontier(scout,{type:"colonize",cell:1});
 const research=commandFrontier(colony,{type:"research"});
 assert.ok(research.science>colony.science);
 assert.notDeepEqual(research,colony);
});
