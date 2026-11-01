import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

function getFetchHandler(file, scope) {
  const handlers = new Map();
  const self = {
    registration: {scope}, location: {origin: new URL(scope).origin},
    addEventListener(name, handler) { handlers.set(name, handler); },
  };
  runInNewContext(readFileSync(file, "utf8"), {
    self, URL, Promise, Response, Set,
    caches: {match: async () => undefined, open: async () => ({})},
    fetch: async () => new Response("ok"),
  });
  return handlers.get("fetch");
}
test("Biomas: service worker do portal não intercepta o jogo independente", () => {
  const root = "https://example.test/PG-Arcade/estrategia/independentes/";
  const parent = getFetchHandler("public/estrategia/independentes/sw.js", root);
  for (const path of ["guardioes-biomas/", "guardioes-biomas/app.js", "guardioes-biomas/engine.mjs"]) {
    let intercepted = false;
    parent({request: {method: "GET", url: root + path, mode: path.endsWith("/") ? "navigate" : "cors"},
      respondWith() { intercepted = true; }});
    assert.equal(intercepted, false, path);
  }
});
test("Biomas: service worker próprio atende somente os arquivos do jogo", () => {
  const root = "https://example.test/PG-Arcade/estrategia/independentes/guardioes-biomas/";
  const handler = getFetchHandler("public/estrategia/independentes/guardioes-biomas/sw.js", root);
  for (const path of ["", "index.html", "app.js", "engine.mjs", "style.css"]) {
    let intercepted = false;
    handler({request: {method: "GET", url: root + path, mode: path ? "cors" : "navigate"},
      respondWith() { intercepted = true; }});
    assert.equal(intercepted, true, path);
  }
  let outside = false;
  handler({request: {method: "GET", url: root + "../malha-energia/app.js", mode: "cors"},
    respondWith() { outside = true; }});
  assert.equal(outside, false);
  let unlisted = false;
  handler({request: {method: "GET", url: root + "private.txt", mode: "cors"},
    respondWith() { unlisted = true; }});
  assert.equal(unlisted, false);
});
