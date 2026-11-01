import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Travessia usa service worker restrito à própria origem e diretório',()=>{
 const s=readFileSync('public/estrategia/independentes/travessia-vale/sw.js','utf8');
 assert.match(s,/pg-estrategia-vale-v1/);
 for(const f of ['engine.mjs','app.js','style.css','manifest.webmanifest'])assert.ok(s.includes(f),f);
 assert.match(s,/url.origin!==self.location.origin/);
 assert.match(s,/url.pathname.startsWith\(ROOT.pathname\)/);
 assert.match(s,/ALLOWED.has\(url.pathname\)/);
});