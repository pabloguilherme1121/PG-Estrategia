import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("cache de Relógios usa escopo restrito e recursos locais",()=>{
 const text=readFileSync("public/estrategia/independentes/relogios-mare/sw.js","utf8");
 assert.match(text,/pg-estrategia-relogios-v1/);
 for(const name of ["engine.mjs","app.js","style.css","manifest.webmanifest"])assert.ok(text.includes(name));
 assert.match(text,/url.origin!==self.location.origin/);
 assert.match(text,/url.pathname.startsWith\(ROOT.pathname\)/);
 assert.match(text,/ALLOWED.has\(url.pathname\)/);
});