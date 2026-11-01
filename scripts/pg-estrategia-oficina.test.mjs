import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkshop, commandWorkshop, canWorkshopAction } from '../public/estrategia/independentes/oficina-automatos/engine.mjs';

for(const difficulty of ['recruta','tatico','veterano']) for(const mode of ['montagem','contrato']) {
 test(`Oficina ${difficulty} ${mode}: início determinístico, recursos e escopo`,()=>{
   const s=createWorkshop({difficulty,mode,seed:17});
   assert.deepEqual(s,createWorkshop({difficulty,mode,seed:17}));
   assert.equal(s.status,'playing'); assert.equal(s.day,0);
   assert.equal(s.robots,0); assert.ok(s.maxDays>=19);
   assert.ok(canWorkshopAction(s,{type:'mine'}));
 });
}
test('Oficina: valida comandos e não permite recursos negativos',()=>{
 const s=createWorkshop({seed:5});
 assert.throws(()=>createWorkshop({difficulty:'invencivel'}),RangeError);
 assert.throws(()=>createWorkshop({mode:'nada'}),RangeError);
 for(const action of [{type:'assemble'},{type:'forge'},{type:'smelt'},{type:'random'}, {type:'buy',quantity:-2}, {type:'mine',quantity:999}]){
   assert.equal(canWorkshopAction(s,action),false);
   assert.equal(commandWorkshop(s,action),s);
 }
 const paused=commandWorkshop(s,{type:'pause'});
 assert.equal(paused.status,'paused');
 assert.equal(commandWorkshop(paused,{type:'mine'}),paused);
 const resumed=commandWorkshop(paused,{type:'resume'});
 assert.equal(resumed.status,'playing');
 assert.equal(s.day,0);
});
test('Oficina: ciclo de mineração, fundição e fábrica sem mutar estado anterior',()=>{
 let s=createWorkshop({difficulty:'recruta',seed:3});
 const a=commandWorkshop(s,{type:'mine'});
 assert.notEqual(a,s); assert.equal(s.ore,0);assert.ok(a.ore>=3);assert.equal(a.day,1);
 const b=commandWorkshop(a,{type:'smelt'});
 assert.ok(b.plates>=1);assert.ok(b.ore>=0);
 assert.ok(b.energy>=0);assert.ok(b.heat>=0);
});
test('Oficina: existem rotas de vitória para os dois objetivos e partidas acabam por prazo',()=>{
 const attempt=(mode)=>{
  let s=createWorkshop({difficulty:'recruta',mode,seed:0});
  for(let day=0;day<40&&s.status==='playing';day++){
   const order=s.robots<(mode==='montagem'?2:1)
    ? s.gears===0 && s.plates>=3 ? 'forge'
      : s.gears>0 && s.plates>=1 ? 'assemble'
      : s.plates<3 && s.ore>=2 ? 'smelt'
      : s.ore<2 ? 'mine' : 'smelt'
    : s.credits>=20?'rest': s.ore>=2?'sell':'mine';
   const candidate={type:order};
   s=commandWorkshop(s,canWorkshopAction(s,candidate)?candidate:{type:'rest'});
  }
  return s;
 };
 assert.equal(attempt('montagem').status,'won');
 assert.equal(attempt('contrato').status,'won');
 let lost=createWorkshop({difficulty:'veterano',seed:7});
 while(lost.status==='playing')lost=commandWorkshop(lost,{type:'rest'});
 assert.equal(lost.status,'lost');assert.equal(commandWorkshop(lost,{type:'mine'}),lost);
});