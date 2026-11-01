import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOPICS, responseFor } from '../public/estrategia/pg-bot-help.mjs';

test('PG Bot apresenta cinco temas reais de suporte sem prometer atendimento humano ou IA', () => {
  assert.deepEqual(Object.keys(TOPICS).sort(), [
    'acessibilidade', 'como-jogar', 'offline', 'progresso', 'reiniciar',
  ]);
  for (const [topic, answer] of Object.entries(TOPICS)) {
    assert.equal(responseFor(topic), answer);
    assert.ok(answer.length >= 50);
    assert.ok(!/<\/?[a-z]/i.test(answer), 'respostas devem ser apenas texto');
  }
  assert.match(responseFor('desconhecido'), /Selecione um assunto/);
  assert.match(responseFor('__proto__'), /Selecione um assunto/);
});

test('PG Bot usa módulo sob demanda e preserva shell offline independente', () => {
  const app = readFileSync('public/estrategia/app.js','utf8');
  const html = readFileSync('public/estrategia/index.html','utf8');
  const sw = readFileSync('public/estrategia/sw.js','utf8');
  assert.match(app, /import\(['"]\.\/pg-bot-help\.mjs['"]\)/);
  assert.match(html, /id="pg-bot-open"/);
  assert.match(html, /id="pg-bot-dialog"/);
  assert.match(html, /aria-labelledby="pg-bot-title"/);
  assert.match(html, /id="pg-bot-answer"[^>]*role="status"/);
  assert.match(sw, /\.\/pg-bot-help\.mjs/);
  assert.match(sw, /\.\/pg-bot\.css/);
  assert.match(sw, /pg-estrategia-shell-v4/);
  assert.match(sw, /key\.startsWith\("pg-estrategia-shell-"\)/);
  assert.match(sw, /url\.pathname\.startsWith\(new URL\("independentes\/", SCOPE\)\.pathname\)/);
});