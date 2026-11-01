import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipher,submitCipherGuess,pauseCipher} from '../public/estrategia/independentes/cifras-reais/engine.mjs';
import {cipherHelp,CIPHER_HELP} from '../public/estrategia/independentes/cifras-reais/pg-bot.mjs';
test('PG Bot explica cada modo sem revelar a combinação secreta',()=>{
 const game=createCipher({seed:42});
 const expedition=createCipher({mode:'expedicao',difficulty:'veterano',seed:42});
 assert.deepEqual(CIPHER_HELP,['objetivo','controles','situacao']);
 assert.match(cipherHelp('objetivo',game),/4 símbolos/i);
 assert.match(cipherHelp('objetivo',expedition),/5 símbolos/i);
 assert.match(cipherHelp('controles',game),/Tab.*Enter/i);
 assert.doesNotMatch(cipherHelp('situacao',game),new RegExp(game.secret.join('.{0,5}'),'i'));
});
test('PG Bot considera palpites, pausa e número de pistas, sem alterar o estado',()=>{
 const game=createCipher({seed:42});
 const snapshot=structuredClone(game);
 assert.match(cipherHelp('situacao',game),/0\/11/);
 const after=submitCipherGuess(game,['sol','lua','terra','vento']);
 assert.match(cipherHelp('situacao',after),/1\/11/);
 assert.match(cipherHelp('situacao',pauseCipher(after)),/pausada/i);
 assert.deepEqual(game,snapshot);
 assert.match(cipherHelp('__proto__',game),/Escolha um assunto/i);
});