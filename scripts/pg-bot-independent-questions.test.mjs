import test from "node:test";
import assert from "node:assert/strict";
import {BOT_TOPICS, botMessage, botQuestion} from "../public/estrategia/independentes/pg-bot.mjs";
const games=["frota-oculta","cartas-de-cerco","hex-conexao","damas-taticas","patrulha-tatica","muralha-das-torres","fronteira-orbital","refugio-do-inverno","mercado-de-sombras"];
test("todos os nove jogos clássicos fornecem dica de estratégia distinta de objetivos e comandos",()=>{
 assert.deepEqual(BOT_TOPICS,["objetivo","controles","situacao","dica"]);
 for(const id of games){
  const state={phase:"playing",mode:"tatico",turn:2};
  const hint=botMessage(id,state,"dica");
  assert.ok(hint.length>55,id);
  assert.notEqual(hint,botMessage(id,state,"objetivo"));
  assert.notEqual(hint,botMessage(id,state,"controles"));
  assert.doesNotMatch(hint,/<\/?[a-z]|<script/i);
 }
});
test("entende perguntas naturais sobre objetivo, dica, situação, controles e offline",()=>{
 const cases=[
  ["qual a melhor estratégia?","dica"],
  ["me dá uma DICA!","dica"],
  ["como vencer","dica"],
  ["como jogar","objetivo"],
  ["quais são os controles?","controles"],
  ["como usar o teclado?","controles"],
  ["em qual turno estou?","situacao"],
  ["quero ver o estado da partida","situacao"],
  ["funciona sem internet?","offline"]
 ];
 for(const [question,expected] of cases){
  const result=botQuestion("frota-oculta",{phase:"playing",mode:"tatico",turn:3},question);
  assert.equal(result.topic,expected,question);
  assert.ok(result.answer.length>=40);
 }
});
test("dicas contextualizadas não inventam placar e não apresentam HTML da pergunta",()=>{
 assert.match(botMessage("hex-conexao",{phase:"won"},"dica"),/venceu/i);
 assert.match(botMessage("frota-oculta",{phase:"lost"},"dica"),/derrota/i);
 assert.match(botMessage("patrulha-tatica",{phase:"playing",paused:true},"dica"),/pausad/i);
 assert.match(botMessage("patrulha-tatica",{phase:"playing",mission:"extracao"},"dica"),/sinal|base|caminho/i);
 assert.match(botQuestion("frota-oculta",{phase:"playing",mode:"veterano"},"qual o status?").answer,/Veterano/);
 const malicious=botQuestion("frota-oculta",{phase:"playing"},"<img src=x onerror=alert(1)>").answer;
 assert.doesNotMatch(malicious,/<img|alert\(/);
 assert.equal(botQuestion("__proto__",{},"qual o objetivo?").topic,"fallback");
 assert.equal(botQuestion("frota-oculta",{},"x".repeat(3000)).topic,"fallback");
});
