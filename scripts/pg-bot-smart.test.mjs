import test from 'node:test';
import assert from 'node:assert/strict';
import { answerQuestion } from '../public/estrategia/pg-bot-help.mjs';

test('PG Bot Estratégia identifica perguntas naturais sem precisar de rede', () => {
 const cases=[
  ['Como jogo?', 'como-jogar'],
  ['Como passar desta missão?', 'dica-missao'],
  ['dica para a rota', 'dica-missao'],
  ['Meus favoritos estão salvos?', 'progresso'],
  ['Funciona OFFLINE?', 'offline'],
  ['Posso desfazer?', 'reiniciar'],
  ['Como usar o teclado?', 'acessibilidade'],
  ['Qual o estado atual dos turnos?', 'estado-missao']
 ];
 for (const [question,topic] of cases) assert.equal(answerQuestion(question).topic,topic,question);
});
test('PG Bot Estratégia mostra contexto real da missão sem inventar turno ou progresso',()=>{
 const context={missionTitle:'Plano da cidade: Horizonte',turn:'3 / 12',progress:'8 / 20'};
 const hint=answerQuestion('Como vencer essa missão?',context);
 assert.equal(hint.topic,'dica-missao');assert.match(hint.answer,/energia|água|confiança/i);
 const state=answerQuestion('Em qual turno estou?',context);
 assert.equal(state.topic,'estado-missao');
 assert.match(state.answer,/3 \/ 12/);assert.match(state.answer,/8 \/ 20/);
 assert.doesNotMatch(answerQuestion('Em qual turno estou?').answer,/0 \/ 0/);
});
test('PG Bot Estratégia responde com limites: não simula IA nem injeta HTML',()=>{
 const text=answerQuestion('<script>alert(1)</script> saber o futuro?').answer;
 assert.doesNotMatch(text,/<script|alert\(/i);
 assert.match(text,/assuntos|pergunt|ajuda/i);
 assert.equal(answerQuestion(' '.repeat(15)).topic,'fallback');
 assert.equal(answerQuestion('x'.repeat(5000)).topic,'fallback');
 assert.match(answerQuestion('DICA nesta rota!',{missionTitle:'Rota crítica: Serra'}).answer,/caminho|bloqueios/i);
});
