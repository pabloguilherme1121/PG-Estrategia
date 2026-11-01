import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const origin = "https://example.test/PG-Arcade/";
function simulate(path, scope) {
  const handlers = new Map();
  const store = new Map();
  let online = true;
  let calls = 0;
  const self = {
    location: { origin: new URL(origin).origin },
    registration: { scope },
    addEventListener(type, handler) { handlers.set(type, handler); },
  };
  const cache = {
    async match(key) { return store.get(typeof key === "string" ? key : key.url)?.clone(); },
    async put(key, value) { store.set(typeof key === "string" ? key : key.url, value.clone()); },
  };
  runInNewContext(readFileSync(path, "utf8"), {
    self, URL, Response, Promise, Set,
    caches: { open: async () => cache, match: key => cache.match(key) },
    fetch: async () => {
      calls++;
      if (!online) throw Error("offline");
      return new Response("novo-codigo", { status: 200 });
    },
  });
  async function request(url, mode = "cors") {
    let intercepted;
    handlers.get("fetch")({
      request: { url, mode, method: "GET" },
      respondWith(promise) { intercepted = promise; },
    });
    return intercepted ? await intercepted : null;
  }
  return { request, cache, setOnline(value) { online = value; }, get calls() { return calls; } };
}
test("SW da campanha não captura os jogos originais em subpasta", async () => {
  const root = simulate("public/estrategia/sw.js", origin + "estrategia/");
  assert.equal(await root.request(origin + "estrategia/independentes/","navigate"), null);
  assert.equal(await root.request(origin + "estrategia/independentes/app.js"), null);
  assert.notEqual(await root.request(origin + "estrategia/app.js"), null);
});
test("SW exclusivo dos jogos não captura a campanha ou o Arcade", async () => {
  const child = simulate("public/estrategia/independentes/sw.js", origin + "estrategia/independentes/");
  assert.equal(await child.request(origin + "estrategia/app.js"), null);
  assert.equal(await child.request(origin + "assets/index.js"), null);
  assert.notEqual(await child.request(origin + "estrategia/independentes/naval.mjs"), null);
  assert.notEqual(await child.request(origin + "estrategia/independentes/hex.mjs"), null);
});
test("SW dos jogos atualiza online e reabre arena em modo offline", async () => {
  const child = simulate("public/estrategia/independentes/sw.js", origin + "estrategia/independentes/");
  const script = origin + "estrategia/independentes/siege.mjs";
  assert.equal(await (await child.request(script)).text(), "novo-codigo");
  assert.equal(child.calls, 1);
  child.setOnline(false);
  assert.equal(await (await child.request(script)).text(), "novo-codigo");
  const page = origin + "estrategia/independentes/";
  // A first successful online navigation populates the fallback HTML.
  child.setOnline(true);
  assert.equal(await (await child.request(page, "navigate")).text(), "novo-codigo");
  child.setOnline(false);
  assert.equal(await (await child.request(page, "navigate")).text(), "novo-codigo");
});


test("ativação do SW da campanha nunca apaga o cache do subsite independente", async () => {
  const deleted = [];
  const handlers = new Map();
  const self = {
    location: { origin: new URL(origin).origin },
    registration: { scope: origin + "estrategia/" },
    clients: { async claim() {} },
    addEventListener(type, callback) { handlers.set(type, callback); },
  };
  runInNewContext(readFileSync("public/estrategia/sw.js", "utf8"), {
    self, URL, Response, Promise, Set,
    caches: {
      async keys() {
        return ["pg-estrategia-shell-v1", "pg-estrategia-shell-v2",
          "pg-estrategia-originais-shell-v1", "pg-arcade-2026-10-11-v6"];
      },
      async delete(key) { deleted.push(key); return true; },
    },
    fetch: async () => new Response("ok"),
  });
  let pending;
  handlers.get("activate")({ waitUntil(task) { pending = task; } });
  await pending;
  assert.deepEqual(deleted, ["pg-estrategia-shell-v1", "pg-estrategia-shell-v2"],
    "a campanha só pode limpar gerações antigas do próprio cache");
});

test("SW dos jogos independentes cacheia o motor tático apenas no seu escopo",async()=>{
  const child=simulate("public/estrategia/independentes/sw.js",origin+"estrategia/independentes/");
  const squad=origin+"estrategia/independentes/squad.mjs";
  assert.equal(await (await child.request(squad)).text(),"novo-codigo");
  child.setOnline(false);
  assert.equal(await (await child.request(squad)).text(),"novo-codigo");
  assert.equal(await child.request(origin+"estrategia/core.mjs"),null);
  assert.equal(await child.request(origin+"assets/index.js"),null);
});

test("SW dos jogos independentes preserva motor de torres somente no seu escopo",async()=>{
  const child=simulate("public/estrategia/independentes/sw.js",origin+"estrategia/independentes/");
  const towers=origin+"estrategia/independentes/towers.mjs";
  assert.equal(await (await child.request(towers)).text(),"novo-codigo");
  child.setOnline(false);
  assert.equal(await (await child.request(towers)).text(),"novo-codigo");
  assert.equal(await child.request(origin+"estrategia/engine.mjs"),null);
});

test("SW dos jogos independentes guarda motor orbital sem invadir a campanha",async()=>{
 const sw=simulate("public/estrategia/independentes/sw.js",origin+"estrategia/independentes/");
 const url=origin+"estrategia/independentes/frontier.mjs";
 assert.equal(await (await sw.request(url)).text(),"novo-codigo");
 sw.setOnline(false);
 assert.equal(await (await sw.request(url)).text(),"novo-codigo");
 assert.equal(await sw.request(origin+"estrategia/app.js"),null);
});

test("SW mantém o motor de sobrevivência dentro do subsite independente",async()=>{
 const sw=simulate("public/estrategia/independentes/sw.js",origin+"estrategia/independentes/");
 const target=origin+"estrategia/independentes/winter.mjs";
 assert.equal(await (await sw.request(target)).text(),"novo-codigo");
 sw.setOnline(false);
 assert.equal(await (await sw.request(target)).text(),"novo-codigo");
 assert.equal(await sw.request(origin+"estrategia/engine.mjs"),null);
});

test("SW dos jogos originais atualiza e mantém Damas Táticas offline",async()=>{
 const child=simulate("public/estrategia/independentes/sw.js",origin+"estrategia/independentes/");
 const game=origin+"estrategia/independentes/draughts.mjs";
 assert.equal(await (await child.request(game)).text(),"novo-codigo");
 child.setOnline(false);
 assert.equal(await (await child.request(game)).text(),"novo-codigo");
 const campaign=origin+"estrategia/app.js";
 assert.equal(await child.request(campaign),null);
});
