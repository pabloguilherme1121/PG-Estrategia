import test from "node:test";
import assert from "node:assert/strict";
import {createWinter,commandWinter,canWinterAction,WINTER_MODES,WINTER_DIFFICULTIES} from "../public/estrategia/independentes/winter.mjs";
test("Refúgio do Inverno: seis configurações determinísticas e dois objetivos",()=>{
 for(const difficulty of WINTER_DIFFICULTIES)for(const mission of WINTER_MODES){
  const a=createWinter({difficulty,mission,seed:31});
  assert.deepEqual(a,createWinter({difficulty,mission,seed:31}));
  assert.equal(a.phase,"playing");assert.equal(a.day,0);
  assert.ok(a.food>0&&a.wood>0&&a.heat>0&&a.people>=2);
  assert.equal(a.beacon,0);assert.ok(a.maxDays>=5);
 }
});
test("Refúgio: coleta, aquecimento e construção consomem turnos e recursos",()=>{
 const a=createWinter();
 const b=commandWinter(a,{type:"collect"});
 assert.equal(b.day,1);assert.ok(b.food>a.food-2);
 assert.equal(a.day,0);
 const c=commandWinter(b,{type:"stoke"});
 assert.equal(c.day,2);assert.ok(c.wood<b.wood);
 const d=commandWinter(c,{type:"signal"});
 assert.equal(d.beacon,1);assert.ok(d.wood<c.wood);
});
test("Refúgio: modo Resistência admite vitória sem sinal",()=>{
 let s=createWinter({difficulty:"recruta",mission:"resistencia",seed:1});
 for(const type of ["collect","stoke","collect","chop","collect","stoke","collect"])
  s=commandWinter(s,{type});
 assert.equal(s.phase,"won");assert.equal(s.day,s.maxDays);
 assert.equal(s.beacon,0);assert.ok(s.score>0);
 assert.equal(commandWinter(s,{type:"collect"}),s);
});
test("Refúgio: evacuação exige três sinais e cinco turnos de sobrevivência",()=>{
 let s=createWinter({difficulty:"recruta",mission:"evacuacao",seed:3});
 for(const type of ["collect","signal","signal","collect","signal"])s=commandWinter(s,{type});
 assert.equal(s.phase,"won");assert.equal(s.beacon,3);assert.ok(s.day>=5);
 assert.ok(s.score>0);
});
test("Refúgio: nevascas podem causar derrota mesmo com comida; pausa bloqueia ações",()=>{
 let s=createWinter({difficulty:"veterano",mission:"resistencia",seed:5});
 const paused=commandWinter(s,{type:"pause"});assert.equal(paused.paused,true);
 assert.equal(commandWinter(paused,{type:"collect"}),paused);
 s=commandWinter(paused,{type:"resume"});
 for(let i=0;i<30&&s.phase==="playing";i++)s=commandWinter(s,{type:"collect"});
 assert.equal(s.phase,"lost");assert.ok(s.morale<=0||s.people<2||s.day===s.maxDays);
 assert.equal(commandWinter(s,{type:"stoke"}),s);
});
test("Refúgio: validação de entradas e limites evita estados inválidos",()=>{
 assert.throws(()=>createWinter({difficulty:"extra"}),RangeError);
 assert.throws(()=>createWinter({mission:"extra"}),RangeError);
 assert.throws(()=>createWinter({seed:NaN}),RangeError);
 const s=createWinter();
 for(const a of [null,{}, {type:"hack"},{type:"signal",bonus:1000},{type:"resume"},{type:"stoke",unit:"free"}]){
  if(a?.type==="signal"||a?.type==="stoke")continue;
  assert.equal(commandWinter(s,a),s);
 }
 assert.equal(canWinterAction(s,{type:"build"}),false);
 assert.ok(canWinterAction(s,{type:"collect"}));
});
