import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const index=read('public/estrategia/independentes/index.html');
const portal=read('public/estrategia/index.html');
const shared=read('public/estrategia/independentes/app.js');
const ids=[
 'frota-oculta','cartas-de-cerco','hex-conexao','damas-taticas','patrulha-tatica',
 'refugio-do-inverno','fronteira-orbital','muralha-das-torres','mercado-de-sombras',
 'conselho-de-reinos','mercado-de-rotas','reversi-tatico','cifras-reais','comando-de-drones','oficina-automatos','controle-trafego','malha-energia','pontes-arquipelago','torre-logistica','guardioes-biomas','rede-frequencias','central-resgates','linha-contencao','espelhos-sinal','armazem-tatico','nonograma-tatico','moinhos-pedra','satelites-orbitais','travessia-vale','cofre-codigos','relogios-mare','sudoku-fortaleza','labirinto-sombras','portos-em-turnos','territorios-de-pedra','conves-modular'
];
const embedded=ids.slice(0,9),subsites=ids.slice(9);
test('catálogo anuncia exatamente 36 motores, não 150 missões como jogos',()=>{
 const buttons=[...index.matchAll(/data-select="([^"]+)"/g)].map(m=>m[1]);
 const children=[...index.matchAll(/class="choice[^"]*" href="\.\/([^/]+)\/"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(new Set([...buttons,...children]),new Set(ids));
 assert.equal(buttons.length,9);
 assert.equal(children.length,27);
 assert.match(index,/36 motores independentes/);
 assert.match(index,/<h1>36 jogos/);
 assert.match(portal,/36 jogos independentes/);
});
test('cada jogo possui um motor e um caminho único e acessível desde o portal',()=>{
 for(const id of embedded){
  assert.match(index,new RegExp('data-select="'+id+'"'));
  assert.ok(shared.includes('"'+id+'"'),id);
  assert.ok(portal.includes('./independentes/#'+id),id);
 }
 for(const id of subsites){
  for(const path of ['index.html','app.js','style.css','sw.js'])
   assert.ok(existsSync('public/estrategia/independentes/'+id+'/'+path),id+'/'+path);
  assert.ok(existsSync('public/estrategia/independentes/'+id+'/'+(id==='conselho-de-reinos'||id==='reversi-tatico'||id==='cifras-reais'||id==='comando-de-drones'||id==='oficina-automatos'||id==='controle-trafego'||id==='malha-energia'||id==='pontes-arquipelago'||id==='torre-logistica'||id==='guardioes-biomas'||id==='rede-frequencias'||id==='central-resgates'||id==='linha-contencao'||id==='espelhos-sinal'||id==='armazem-tatico'||id==='nonograma-tatico'||id==='moinhos-pedra'||id==='satelites-orbitais'||id==='travessia-vale'||id==='cofre-codigos'||id==='relogios-mare'||id==='sudoku-fortaleza'||id==='labirinto-sombras'||id==='portos-em-turnos'||id==='territorios-de-pedra'||id==='conves-modular'?'engine.mjs':'game.mjs')),id);
  assert.match(index,new RegExp('href="\\./'+id+'/"'));
  assert.ok(portal.includes('./independentes/'+id+'/'),id);
 }
});
