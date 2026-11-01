import test from 'node:test';
import assert from 'node:assert/strict';
import {createTowers, commandTowers, TOWER_MODES, TOWER_DIFFICULTIES, TOWER_PATH} from '../public/estrategia/independentes/towers.mjs';
test('Torres: configuracoes, geometria e estado reproduzivel nas seis combinacoes',()=>{
 assert.equal(new Set(TOWER_PATH).size,TOWER_PATH.length);
 assert.ok(TOWER_PATH.every(p=>p>=0&&p<36));
 for(const difficulty of TOWER_DIFFICULTIES)for(const mission of TOWER_MODES){
  const a=createTowers({difficulty,mission,seed:31});
  assert.deepEqual(a,createTowers({difficulty,mission,seed:31}));
  assert.equal(a.phase,'ready');assert.equal(a.towers.length,0);assert.ok(a.maxWaves>=3);
 }
});
test('Torres: construir e aprimorar sem violar invariantes ou mutar estado',()=>{
 const a=createTowers();
 for(const b of [{type:'build',cell:TOWER_PATH[0],kind:'laser'},{type:'build',cell:60,kind:'laser'},{type:'build',cell:6,kind:'outro'},{type:'upgrade',cell:6},null])assert.equal(commandTowers(a,b),a);
 const built=commandTowers(a,{type:'build',cell:6,kind:'laser'});
 assert.equal(a.towers.length,0);assert.equal(built.towers[0].level,1);assert.ok(built.coins<a.coins);
 assert.equal(commandTowers(built,{type:'build',cell:6,kind:'laser'}),built);
 const upgraded=commandTowers(built,{type:'upgrade',cell:6});
 assert.equal(upgraded.towers[0].level,2);assert.ok(upgraded.coins<built.coins);
 assert.equal(commandTowers(upgraded,{type:'upgrade',cell:6}),upgraded);
});
test('Torres: ondas, inimigos e ataques funcionais',()=>{
 let s=createTowers({seed:4});s=commandTowers(s,{type:'build',cell:6,kind:'laser'});s=commandTowers(s,{type:'start'});
 assert.equal(s.phase,'playing');
 for(let k=0;k<9;k++)s=commandTowers(s,{type:'tick'});
 assert.ok(s.tick>0);assert.ok(s.destroyed>0||s.base<s.maxBase);
});
test('Torres: derrota sem torres, pausa e bloqueio depois do fim',()=>{
 let s=createTowers({difficulty:'veterano',mission:'maratona'});s=commandTowers(s,{type:'start'});
 const paused=commandTowers(s,{type:'pause'});assert.equal(commandTowers(paused,{type:'tick'}),paused);
 s=commandTowers(paused,{type:'resume'});
 for(let k=0;k<400&&s.phase!=='lost'&&s.phase!=='won';k++)s=commandTowers(s,{type:s.phase==='ready'?'start':'tick'});
 assert.equal(s.phase,'lost');assert.equal(commandTowers(s,{type:'start'}),s);
});
test('Torres: vitoria alcancavel com planejamento e pontuacao real',()=>{
 let s=createTowers({difficulty:'recruta',mission:'defesa'});
 for(const cell of [6,7,13])s=commandTowers(s,{type:'build',cell,kind:'laser'});
 for(let k=0;k<400&&s.phase!=='won'&&s.phase!=='lost';k++)s=commandTowers(s,{type:s.phase==='ready'?'start':'tick'});
 assert.equal(s.phase,'won');assert.ok(s.score>0);
});
test('Torres: entradas adulteradas e semente invalida sao rejeitadas',()=>{
 assert.throws(()=>createTowers({difficulty:'inv'}),RangeError);
 assert.throws(()=>createTowers({mission:'inv'}),RangeError);
 assert.throws(()=>createTowers({seed:NaN}),RangeError);
 const s=createTowers();
 for(const a of [{type:'build',cell:'6',kind:'laser'},{type:'build',cell:6.2,kind:'laser'},{type:'tick'},{type:'upgrade',cell:1},{type:'resume'}])assert.equal(commandTowers(s,a),s);
});
