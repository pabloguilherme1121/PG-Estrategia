import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("SW orbital isola cache do jogo do Arcade e jogos vizinhos",()=>{
 const src=readFileSync("public/estrategia/independentes/satelites-orbitais/sw.js","utf8");
 assert.match(src,/pg-estrategia-orbitais-v1/);
 for(const file of ["index.html","app.js","engine.mjs","style.css","manifest.webmanifest"])assert.ok(src.includes(file));
 assert.match(src,/url.origin!==self.location.origin/);
 assert.match(src,/url.pathname.startsWith\(ROOT.pathname\)/);
 assert.match(src,/ALLOWED.has\(url.pathname\)/);
});
