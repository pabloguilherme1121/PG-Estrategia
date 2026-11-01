import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=join('public','estrategia','independentes');
const start='<!-- PG_BOT_ASK_BRIDGE_START -->';
const end='<!-- PG_BOT_ASK_BRIDGE_END -->';
const source=readFileSync(join('scripts','pg-bot-inline-bridge.js'),'utf8').trimEnd();
const ids=readdirSync(root,{withFileTypes:true})
  .filter(item=>item.isDirectory()&&existsSync(join(root,item.name,'index.html')))
  .map(item=>item.name);
test('todos os 27 jogos com arena recebem o mesmo PG Bot offline, exatamente uma vez',()=>{
 assert.equal(ids.length,27);
 for(const id of ids){
  const html=readFileSync(join(root,id,'index.html'),'utf8');
  assert.ok(html.includes('id="pg-bot"'),id);
  assert.equal(html.split(start).length-1,1,id);
  assert.equal(html.split(end).length-1,1,id);
  assert.ok(html.includes(start+'\n<script>\n'+source+'\n</script>\n'+end),id+' script desatualizado');
  assert.ok(html.indexOf(end)<html.toLowerCase().lastIndexOf('</body>'),id);
 }
});
test('campo compartilhado preserva privacidade, acessibilidade e entradas limitadas',()=>{
 assert.match(source,/maxLength = 240/);
 assert.match(source,/createElement\('label'\)/);
 assert.match(source,/aria-live/);
 assert.match(source,/preventDefault\(\)/);
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage\.setItem/);
 assert.match(source,/selected\.click\(\)/);
});
