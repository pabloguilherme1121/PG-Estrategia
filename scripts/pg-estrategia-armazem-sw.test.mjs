import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const read=p=>readFileSync(p,"utf8");
function capture(path,scope){
 let handler=null;
 const self={registration:{scope},location:{origin:"https://example.test"},addEventListener:(name,cb)=>{if(name==="fetch")handler=cb;},skipWaiting(){}};
 runInNewContext(read(path),{self,caches:{},URL,Set,Promise,Response:{error:()=>null}});
 assert.ok(handler);
 return url=>{
  let intercepted=false;
  handler({request:{url,method:"GET",mode:"navigate"},respondWith(){intercepted=true;}});
  return intercepted;
 };
}
test("Armazém: service worker do laboratório não captura o microsite próprio",()=>{
 const fn=capture("public/estrategia/independentes/sw.js","https://example.test/estrategia/independentes/");
 for(const suffix of ["armazem-tatico/","armazem-tatico/index.html","armazem-tatico/app.js"])
  assert.equal(fn("https://example.test/estrategia/independentes/"+suffix),false,suffix);
 assert.equal(fn("https://example.test/estrategia/independentes/index.html"),true);
});
test("Armazém: service worker filho não captura jogos vizinhos ou origem externa",()=>{
 const root="https://example.test/estrategia/independentes/armazem-tatico/";
 const fn=capture("public/estrategia/independentes/armazem-tatico/sw.js",root);
 assert.equal(fn(root),true);
 assert.equal(fn(root+"index.html"),true);
 assert.equal(fn("https://example.test/estrategia/independentes/espelhos-sinal/"),false);
 assert.equal(fn("https://other.test/estrategia/independentes/armazem-tatico/"),false);
});
