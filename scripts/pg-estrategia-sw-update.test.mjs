import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("PG Estratégia atualiza app.js online e mantém última versão offline", async () => {
  const root = "https://example.test/PG-Arcade/estrategia/";
  const asset = root + "app.js";
  const store = new Map([[asset, new Response("codigo-antigo", { status: 200 })]]);
  let online = true;
  let fetches = 0;
  const cache = {
    async match(request) {
      const key = typeof request === "string" ? new URL(request, root).href : request.url;
      return store.get(key)?.clone();
    },
    async put(request, response) {
      const key = typeof request === "string" ? new URL(request, root).href : request.url;
      store.set(key, response.clone());
    },
  };
  const handlers = new Map();
  const self = {
    location: { origin: new URL(root).origin },
    registration: { scope: root },
    addEventListener(name, handler) { handlers.set(name, handler); },
  };
  runInNewContext(readFileSync("public/estrategia/sw.js", "utf8"), {
    self, URL, Promise, Response, caches: {
      async open() { return cache; },
      async match(request) { return cache.match(request); },
    },
    fetch: async () => {
      fetches++;
      if (!online) throw new Error("rede indisponível");
      return new Response("codigo-atualizado", { status: 200 });
    },
  });
  const intercept = handlers.get("fetch");
  assert.equal(typeof intercept, "function");
  async function request(url, mode = "cors") {
    let promise;
    intercept({
      request: { url, method: "GET", mode },
      respondWith(value) { promise = value; },
    });
    return promise ? await promise : null;
  }
  const onlineResult = await request(asset);
  assert.ok(onlineResult, "arquivo estático do microsite precisa ser tratado pelo próprio SW");
  assert.equal(await onlineResult.text(), "codigo-atualizado",
    "o SW não deve bloquear uma nova versão por manter cache antigo");
  assert.equal(fetches, 1, "o SW deve procurar atualização na rede");
  online = false;
  const offlineResult = await request(asset);
  assert.ok(offlineResult, "app.js deve permanecer disponível offline");
  assert.equal(await offlineResult.text(), "codigo-atualizado",
    "a última versão online precisa substituir o cache antigo");

  const outside = await request("https://example.test/PG-Arcade/assets/index.js");
  assert.equal(outside, null, "o SW de Estratégia não captura arquivos do Arcade");
});
