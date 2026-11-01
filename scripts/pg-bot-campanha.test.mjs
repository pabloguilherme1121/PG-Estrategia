import test from "node:test";
import assert from "node:assert/strict";
import { responseFor } from "../public/estrategia/pg-bot-help.mjs";

test("PG Bot orienta as seis mecânicas de campanha sem confundir missões com jogos",()=>{
 const cases=[
  ["Conquista territorial: Aurora",/casas vizinhas|expan/i],
  ["Rota crítica: Serra",/bloqueio|caminho/i],
  ["Comércio & recursos: Horizonte",/créditos|influência/i],
  ["Defesa de fronteira: Estuário",/torres|pistas/i],
  ["Expedição tática: Fronteira",/combustível|cargas/i],
  ["Plano da cidade: Mirante",/energia|água|confiança/i]
 ];
 for(const [title,expected] of cases)assert.match(responseFor("dica-missao",title),expected,title);
 assert.match(responseFor("dica-missao",""),/abra|missão|arena/i);
});
