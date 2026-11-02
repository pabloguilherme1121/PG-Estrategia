import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScenario,buildMetadata,generateBatch,validateScenario} from './scenario-batch.mjs';
import {readFileSync} from 'node:fs';

test('gera lote determinístico de quinze cenários, com sete ou dezenove células',async()=>{
 const scenarios=await generateBatch({write:false});
 const again=await generateBatch({write:false});
 assert.deepEqual(scenarios,again);
 assert.equal(scenarios.length,15);
 assert.equal(new Set(scenarios.map(s=>s.id)).size,15);
 for(const [i,s] of scenarios.entries()){
  assert.equal(s.id,'hex-conquest-'+String(i+39).padStart(3,'0'));
  assert.ok([7,19].includes(s.initialCells.length));
  assert.equal(s.kind,'scenario');
  assert.ok(validateScenario(s));
 }
});
test('metadados têm instruções verificáveis e não chamam cenários de jogos completos',()=>{
 for(let i=0;i<15;i++){
  const metadata=buildMetadata(buildScenario(i));
  assert.equal(metadata.id,'hex-conquest-'+String(i+39).padStart(3,'0'));
  assert.equal(metadata.kind,'scenario');
  assert.equal(metadata.strategyPlan.length,3);
  assert.ok(metadata.strategyPlan.every(s=>s.length>30));
  assert.match(metadata.version,/^\d+\.\d+\.\d+$/);
  assert.ok(metadata.controls.touch&&metadata.controls.keyboard);
 }
});
test('rejeita mapas desconectados, IDs duplicados e objetivos sem base rival',()=>{
 const source=buildScenario(0);
 const duplicated=structuredClone(source);
 duplicated.initialCells[0]={...duplicated.initialCells[1]};
 assert.throws(()=>validateScenario(duplicated),/Hexágono inválido/);
 const disconnected=structuredClone(source);
 disconnected.initialCells[0].q=99;
 assert.throws(()=>validateScenario(disconnected),/Mapa desconectado/);
 const wrong=structuredClone(source);
 wrong.objective.targetHex='999,999';
 assert.throws(()=>validateScenario(wrong),/Objetivo incompatível/);
 assert.throws(()=>buildScenario(15),RangeError);
});
test('mantém os cenários fora da pasta de jogos independentes, evitando contagem artificial',()=>{
 const source=readFileSync('scripts/scenario-batch.mjs','utf8');
 assert.match(source,/scenarios/, 'A saída deve ficar em scenarios/');
 assert.doesNotMatch(source,/public\/estrategia\/independentes/);
});
