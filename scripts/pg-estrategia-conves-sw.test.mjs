import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const root="public/estrategia/independentes/conves-modular/";
const child=readFileSync(root+"sw.js","utf8");
const parent=readFileSync("public/estrategia/independentes/sw.js","utf8");
test("Convés usa cache offline isolado, sem interceptar outros jogos",()=>{
 for(const file of ["index.html","app.js","engine.mjs","style.css","manifest.webmanifest","sw.js"])
  assert.ok(existsSync(root+file),file);
 assert.match(child,/self\.registration\.scope/);
 assert.match(child,/url\.origin!==self\.location\.origin/);
 assert.match(child,/!url\.pathname\.startsWith\(ROOT\.pathname\)/);
 assert.match(child,/key\.startsWith\("pg-estrategia-conves-"\)/);
 assert.match(parent,/const isCatalogNavigation/);
 assert.match(parent,/request\.mode === "navigate" && !isCatalogNavigation\) return/);
});