import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {join,dirname,resolve,sep} from 'node:path';

const output=resolve('dist');
function* filesIn(folder){
 for(const entry of readdirSync(folder,{withFileTypes:true})){
  const full=join(folder,entry.name);
  if(entry.isDirectory())yield* filesIn(full);
  else if(entry.isFile())yield full;
 }
}

test('cada service worker independente aponta para arquivos reais no build publicável',()=>{
 const workers=[...filesIn(output)].filter(file=>file.endsWith(sep+'sw.js'));
 assert.ok(workers.length>=30,'esperados service workers do catálogo, independentes e hub');
 for(const worker of workers){
  const source=readFileSync(worker,'utf8');
  const declaration=source.match(/(?:const|let)\\s+(?:FILES|ASSETS)\\s*=\\s*\\[([\\s\\S]*?)\\]/);
  assert.ok(declaration,'lista de pré-cache não encontrada: '+worker);
  const assets=[...declaration[1].matchAll(/["']([^"']+)["']/g)].map(x=>x[1]);
  assert.ok(assets.length>0,'pré-cache vazio: '+worker);
  for(const asset of assets){
   assert.ok(asset.startsWith('./'),'pré-cache precisa ser relativo ao escopo: '+worker+' '+asset);
   const target=resolve(dirname(worker),asset);
   assert.ok(target.startsWith(output+sep),'pré-cache fora do build: '+worker+' '+asset);
   const file=asset==='./'?join(target,'index.html'):target;
   assert.ok(existsSync(file)&&statSync(file).isFile(),'pré-cache aponta para arquivo ausente: '+worker+' '+asset);
  }
 }
});
