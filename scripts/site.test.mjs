import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {FAMILIES,MISSIONS,EXISTING_STRATEGY} from '../public/estrategia/catalog.mjs';
const root='dist';
const read=name=>readFileSync(join(root,name),'utf8');
test('preserva 150 missões e seis mecânicas originais',()=>{
 assert.equal(FAMILIES.length,6);
 assert.equal(MISSIONS.length,150);
 assert.equal(new Set(MISSIONS.map(m=>m.id)).size,150);
 assert.equal(EXISTING_STRATEGY.length,47);
});
test('exporta campanha, 28 jogos independentes em pastas e PG Bot',()=>{
 for(const path of ['index.html','app.js','core.mjs','sw.js','pg-bot-help.mjs','brand/pg-bot/mascot.webp','independentes/index.html','independentes/app.js','independentes/pg-bot.mjs'])
  assert.ok(existsSync(join(root,path)),path);
 const games=readdirSync(join(root,'independentes'),{withFileTypes:true}).filter(e=>e.isDirectory()&&existsSync(join(root,'independentes',e.name,'index.html')));
 assert.equal(games.length,28);
});
test('canonical, links do Arcade e PG Bot corrigidos para o repositório independente',()=>{
 const index=read('index.html'), hub=read('strategy-hub.mjs'), orig=read('independentes/index.html');
 assert.ok(index.includes('github.io/PG-Estrategia/'),'canonical');
 assert.ok(!index.includes('PG-Arcade/estrategia/'),'canonical antigo');
 assert.ok(index.includes('href="https://pabloguilherme1121.github.io/PG-Arcade/"'),'link do Arcade');
 assert.ok(index.includes('PG-Bot/'),'PG Bot');
 assert.ok(index.includes('src="./brand/pg-bot/mascot.webp"'),'imagem do bot');
 assert.ok(orig.includes('href="https://pabloguilherme1121.github.io/PG-Arcade/"'),'Arcade nos independentes');
 assert.ok(hub.includes('PG-Arcade/#/jogar/'),'jogos históricos');
 assert.ok(!hub.includes("'../#/jogar/'"),'rota antiga');
});
test('todos os títulos independentes mantêm HTML e não apontam imagem para a árvore antiga',()=>{
 for(const item of readdirSync(join(root,'independentes'),{withFileTypes:true})){
  if(!item.isDirectory()||!existsSync(join(root,'independentes',item.name,'index.html')))continue;
  const html=read('independentes/'+item.name+'/index.html');
  assert.ok(html.includes('lang="pt-BR"'),item.name);
  assert.ok(!html.includes('../../../brand/'),item.name+' asset antigo');
 }
});

test('PG Bot da campanha oferece acesso contextual ao site independente sem ler histórico de outros sites',()=>{
 const html=readFileSync('public/estrategia/index.html','utf8');
 const app=readFileSync('public/estrategia/app.js','utf8');
 assert.ok(html.includes('id="pg-bot-site-link"'));
 assert.ok(html.includes('https://pabloguilherme1121.github.io/PG-Bot/'));
 assert.ok(app.includes("$('pg-bot-site-link').href='https://pabloguilherme1121.github.io/PG-Bot/?projeto=estrategia&jogo='+encodeURIComponent(id)"));
});
