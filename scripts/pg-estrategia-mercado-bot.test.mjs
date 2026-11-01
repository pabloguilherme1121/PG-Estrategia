import test from "node:test";
import assert from "node:assert/strict";
import { createTrade, commandTrade } from "../public/estrategia/independentes/mercado-de-rotas/game.mjs";
import { marketBotAnswer, MARKET_BOT_TOPICS } from "../public/estrategia/independentes/mercado-de-rotas/pg-bot.mjs";

test("PG Bot Mercado de Rotas: objetivos distintos e instruções de teclado",()=>{
 const contracts=createTrade({mission:"contratos",seed:7});
 const capital=createTrade({mission:"lucro",difficulty:"veterano",seed:7});
 assert.deepEqual(MARKET_BOT_TOPICS,["objetivo","controles","situacao"]);
 assert.match(marketBotAnswer("objetivo",contracts),/2 grãos.*1 metal/i);
 assert.match(marketBotAnswer("objetivo",capital),/70 créditos/);
 assert.match(marketBotAnswer("controles",capital),/Tab.*Enter/i);
});
test("PG Bot Mercado de Rotas: contextualiza recursos, rival, turno, pausa e vitória sem mutação",()=>{
 const state=createTrade({seed:7});
 const snapshot=structuredClone(state);
 const message=marketBotAnswer("situacao",state);
 assert.match(message,/dia 0/i);
 assert.match(message,/Vale Verde/);
 assert.match(message,/créditos/i);
 assert.match(message,/combustível/i);
 assert.match(message,/rival/i);
 assert.deepEqual(state,snapshot);
 assert.match(marketBotAnswer("situacao",commandTrade(state,{type:"pause"})),/pausada/i);
 assert.match(marketBotAnswer("inexistente",state),/Escolha um assunto/i);
 assert.match(marketBotAnswer("__proto__",state),/Escolha um assunto/i);
});
