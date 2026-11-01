import test from 'node:test';
import assert from 'node:assert/strict';
import { botMessage, BOT_TOPICS } from '../public/estrategia/independentes/pg-bot.mjs';

const ids=['frota-oculta','cartas-de-cerco','hex-conexao','damas-taticas','patrulha-tatica','muralha-das-torres','fronteira-orbital','refugio-do-inverno','mercado-de-sombras'];
test('PG Bot: cada título recebe objetivo e dica específicos, sem conteúdo HTML',()=>{
  assert.deepEqual(BOT_TOPICS,['objetivo','controles','situacao','dica']);
  for(const id of ids){
    const objective=botMessage(id,{phase:'playing', mode:'tatico'},'objetivo');
    const controls=botMessage(id,{phase:'playing', mode:'tatico'},'controles');
    assert.ok(objective.length>45,id);
    assert.ok(controls.length>45,id);
    assert.notEqual(objective,controls,id);
    assert.doesNotMatch(objective+controls,/<\/?[a-z]/i);
  }
});
test('PG Bot: adaptação segura ao estado, dificuldade e operação',()=>{
  assert.match(botMessage('patrulha-tatica',{phase:'playing',mode:'veterano',mission:'extracao'},'objetivo'),/sinal.*base/i);
  assert.match(botMessage('fronteira-orbital',{phase:'playing',mode:'recruta',mission:'pesquisa'},'objetivo'),/12 pontos/);
  assert.match(botMessage('muralha-das-torres',{phase:'playing',mode:'tatico',mission:'maratona'},'objetivo'),/Maratona/);
  assert.match(botMessage('mercado-de-sombras',{phase:'playing',mode:'tatico',mission:'patrimonio'},'objetivo'),/40 pontos/);
  assert.match(botMessage('hex-conexao',{phase:'won',score:15},'situacao'),/venceu/i);
  assert.match(botMessage('frota-oculta',{phase:'lost'},'situacao'),/derrota/i);
  assert.match(botMessage('damas-taticas',{phase:'playing',paused:true},'situacao'),/pausada/i);
  assert.match(botMessage('cartas-de-cerco',{phase:'playing',turn:4,mode:'veterano'},'situacao'),/Veterano/);
  assert.match(botMessage('__proto__',{},'objetivo'),/Escolha um jogo/);
  assert.match(botMessage('hex-conexao',{},'not-an-option'),/Selecione um assunto/);
});