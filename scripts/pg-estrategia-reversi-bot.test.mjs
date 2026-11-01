import test from "node:test";
import assert from "node:assert/strict";
import {createReversi,legalReversiMoves,playReversiTurn,pauseReversi} from "../public/estrategia/independentes/reversi-tatico/engine.mjs";
import {reversiHelp,REVERSI_HELP} from "../public/estrategia/independentes/reversi-tatico/pg-bot.mjs";
test("PG Bot Reversi: explica objetivo e interação por teclado sem HTML",()=>{
 const s=createReversi({size:8,difficulty:"veterano"});
 assert.deepEqual(REVERSI_HELP,["objetivo","controles","situacao"]);
 assert.match(reversiHelp("objetivo",s),/cantos/i);
 assert.match(reversiHelp("controles",s),/Tab.*Enter/i);
 assert.doesNotMatch(reversiHelp("objetivo",s)+reversiHelp("controles",s),/<\/?[a-z]/i);
});
test("PG Bot Reversi: acompanha pontuação, pausa e invalid input sem mutar partida",()=>{
 const s=createReversi({size:6});
 const before=structuredClone(s);
 assert.match(reversiHelp("situacao",s),/4 jogadas/i);
 const next=playReversiTurn(s,legalReversiMoves(s)[0]);
 assert.match(reversiHelp("situacao",next),/Rodadas:/);
 assert.match(reversiHelp("situacao",pauseReversi(next)),/pausada/i);
 assert.match(reversiHelp("__proto__",s),/Escolha um assunto/i);
 assert.deepEqual(s,before);
});