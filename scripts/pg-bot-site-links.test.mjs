import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const source=join('public','estrategia','independentes');
const site=join('dist','independentes');
const portal='https://pabloguilherme1121.github.io/PG-Bot/?projeto=estrategia';
test('navegação do Estratégia abre o PG Bot no ambiente correto',()=>{
 const main=readFileSync(join('dist','index.html'),'utf8');
 assert.ok(main.includes(portal), 'faltou parâmetro da Estratégia na central');
});
test('29 jogos independentes oferecem link contextual para a central, mantendo bot local',()=>{
 const slugs=readdirSync(source,{withFileTypes:true}).filter(x=>x.isDirectory()&&existsSync(join(source,x.name,'index.html'))).map(x=>x.name);
 assert.equal(slugs.length,29);
 for(const slug of slugs){
  const html=readFileSync(join(site,slug,'index.html'),'utf8');
  assert.ok(html.includes('id="pg-bot"'),slug+' perdeu ajuda local');
  assert.ok(html.includes('data-pg-bot-site="independent"'),slug+' perdeu link externo');
  assert.ok(html.includes(portal+'&amp;jogo='+encodeURIComponent(slug)),slug+' link sem ID correto');
  assert.equal(html.split('data-pg-bot-site="independent"').length-1,1,slug+' link duplicado');
 }
});
