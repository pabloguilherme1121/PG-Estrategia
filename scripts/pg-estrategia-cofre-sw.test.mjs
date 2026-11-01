import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
test("Cofre: cache PWA restrito ao diretório e arquivos previstos",()=>{
 const src=readFileSync("public/estrategia/independentes/cofre-codigos/sw.js","utf8");
 assert.match(src,/pg-estrategia-cofre-v1/);
 for(const file of ["engine.mjs","app.js","index.html","style.css","manifest.webmanifest"])assert.ok(src.includes(file));
 assert.match(src,/url.origin!==self.location.origin/);
 assert.match(src,/url.pathname.startsWith\(ROOT.pathname\)/);
 assert.match(src,/ALLOWED.has\(url.pathname\)/);
});