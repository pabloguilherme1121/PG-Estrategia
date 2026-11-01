import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const child=readFileSync("public/estrategia/independentes/nonograma-tatico/sw.js","utf8");
const parent=readFileSync("public/estrategia/independentes/sw.js","utf8");
test("Nonograma: SW próprio cacheia apenas recursos do jogo",()=>{
 assert.match(child,/pg-estrategia-nonograma-v1/);
 for(const file of ["index.html","app.js","engine.mjs","style.css","manifest.webmanifest"])assert.ok(child.includes(file));
 assert.match(child,/url\.origin!==self\.location\.origin/);
 assert.match(child,/url\.pathname\.startsWith\(ROOT\.pathname\)/);
 assert.match(child,/VALID\.has\(url\.pathname\)/);
 assert.doesNotMatch(parent,/pg-estrategia-nonograma-v1/);
});
