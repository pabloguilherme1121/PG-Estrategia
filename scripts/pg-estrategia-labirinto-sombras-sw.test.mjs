import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const root="public/estrategia/independentes/labirinto-sombras/";
const child=readFileSync(root+"sw.js","utf8");
const parent=readFileSync("public/estrategia/independentes/sw.js","utf8");
test("Labirinto possui arquivos offline e service worker restrito ao próprio jogo",()=>{
  for (const name of ["index.html","app.js","engine.mjs","style.css","manifest.webmanifest","sw.js"])
    assert.ok(existsSync(root+name),name);
  assert.match(child,/self\.registration\.scope/);
  assert.match(child,/url\.origin!==self\.location\.origin/);
  assert.match(child,/!url\.pathname\.startsWith\(ROOT\.pathname\)/);
  assert.match(child,/key\.startsWith\("pg-estrategia-sombras-"\)/);
  assert.match(parent,/const isCatalogNavigation/);
  assert.match(parent,/request\.mode === "navigate" && !isCatalogNavigation\) return/);
});
