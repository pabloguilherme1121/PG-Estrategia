import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const root="public/estrategia/independentes/gravidade-cristais/";
const child=readFileSync(root+"sw.js","utf8");
const parent=readFileSync("public/estrategia/independentes/sw.js","utf8");
test("Gravidade dos Cristais: recursos disponíveis no cache isolado",()=>{
 for(const file of ["index.html","app.js","engine.mjs","style.css","manifest.webmanifest","sw.js"])
  assert.ok(existsSync(root+file),file);
 for(const token of ["self.registration.scope","pg-estrategia-gravidade-","url.origin!==self.location.origin","url.pathname.startsWith(ROOT.pathname)","caches.match(key)"])
  assert.ok(child.includes(token),token);
 assert.match(parent,/const isCatalogNavigation/);
 assert.match(parent,/request\.mode === "navigate" && !isCatalogNavigation\) return/);
});