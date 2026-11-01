import test from 'node:test';
import assert from 'node:assert/strict';
import {createSquad,commandSquad,SQUAD_DIFFICULTIES,SQUAD_MODES,legalSquadMoves} from '../public/estrategia/independentes/squad.mjs';

test('Patrulha Tática: motor distinto, determinístico, com duas missões e três dificuldades',()=>{
 for(const difficulty of SQUAD_DIFFICULTIES)for(const mission of SQUAD_MODES){
  const a=createSquad({difficulty,mission,seed:19}),b=createSquad({difficulty,mission,seed:19});
  assert.deepEqual(a,b);assert.equal(a.phase,'playing');assert.equal(a.mode,difficulty);
  assert.equal(a.mission,mission);assert.equal(a.enemies.length,2);
  assert.ok(a.enemies.every(e=>e.hp>0));assert.ok(a.maxTurns>=20);
 }
});
test('Movimentos ilegais não gastam turno nem atravessam bloqueios',()=>{
 const s=createSquad();
 for(const a of [{type:'move',cell:-1},{type:'move',cell:24},{type:'move',cell:17},{type:'attack',target:4},{type:'heal'},{type:'abc'},null])assert.equal(commandSquad(s,a),s);
 assert.deepEqual(legalSquadMoves(s),[15,21]);
});
test('Deslocar e defender gera turnos imutáveis e resposta do adversário',()=>{
 const s=createSquad({seed:3}),n=commandSquad(s,{type:'move',cell:15});
 assert.equal(n.turn,1);assert.equal(n.units[0].pos,15);assert.equal(s.units[0].pos,20);
 const shield=commandSquad(n,{type:'guard'});assert.equal(shield.turn,2);assert.ok(shield.units[0].hp<=n.units[0].hp);
});
test('Combate e extração possuem objetivos realmente diferentes e vitórias alcançáveis',()=>{
 let combat=createSquad({difficulty:'recruta',mission:'combate',seed:4});
 const metric=(a,b)=>Math.abs(Math.floor(a/5)-Math.floor(b/5))+Math.abs(a%5-b%5);
 for(let i=0;i<25&&combat.phase==='playing';i++){
  const target=combat.enemies.findIndex(e=>e.hp>0&&metric(e.pos,combat.units[0].pos)<=2);
  if(target>=0)combat=commandSquad(combat,{type:'attack',target});
  else {
   const opts=legalSquadMoves(combat),desired=combat.enemies.find(e=>e.hp>0)?.pos??12;
   opts.sort((a,b)=>metric(a,desired)-metric(b,desired));
   combat=commandSquad(combat,{type:'move',cell:opts[0]});
  }
 }
 assert.equal(combat.phase,'won');assert.ok(combat.score>0);
 let extract=createSquad({difficulty:'recruta',mission:'extracao',seed:4});
 for(const cell of [15,10,11,12,11,10,15,20]){if(extract.phase!=='playing')break;extract=commandSquad(extract,{type:'move',cell});}
 assert.equal(extract.phase,'won');assert.equal(extract.rescued,true);
});
test('Existe derrota real, após fim ações não alteram estado e reiniciar repõe turnos',()=>{
 let s=createSquad({difficulty:'veterano',mission:'combate',seed:9});
 for(let i=0;i<50&&s.phase==='playing';i++)s=commandSquad(s,{type:'guard'});
 assert.equal(s.phase,'lost');assert.equal(commandSquad(s,{type:'guard'}),s);
 assert.equal(createSquad({difficulty:'veterano',mission:'combate',seed:9}).turn,0);
});
test('Entradas adulteradas, dificuldades e modos inválidos são rejeitados',()=>{
 assert.throws(()=>createSquad({difficulty:'super'}),RangeError);
 assert.throws(()=>createSquad({mission:'super'}),RangeError);
 assert.throws(()=>createSquad({seed:NaN}),RangeError);
 const s=createSquad();for(const a of [{type:'attack',target:'0'},{type:'attack',target:-1},{type:'move',cell:'15'},{type:'move',cell:500}])assert.equal(commandSquad(s,a),s);
});
