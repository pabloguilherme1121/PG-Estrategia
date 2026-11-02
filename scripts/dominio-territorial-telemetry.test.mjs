import test from 'node:test';
import assert from 'node:assert/strict';
import {createDomainGame,actDomain} from '../public/estrategia/independentes/dominio-territorial/engine.mjs';
import {makeDomainTick} from '../public/estrategia/independentes/dominio-territorial/telemetry.mjs';
test('emissor expõe apenas estado mínimo, sem grid, usuário ou histórico',()=>{
 const state=createDomainGame();
 const tick=makeDomainTick(state,1800000000000);
 assert.deepEqual(tick,{type:'PG_STATE_TICK',version:1,project:'estrategia',gameId:'dominio-territorial',timestamp:1800000000000,turn:1,score:null,phase:'playing',resources:6});
 assert.doesNotMatch(JSON.stringify(tick),/grid|history|selected|localStorage|record/);
});
test('emissor acompanha fim de turno, pausa e desfazer',()=>{
 const state=createDomainGame();
 const after=actDomain(state,{type:'END_TURN'});
 assert.equal(makeDomainTick(after,1800000000001).turn,2);
 assert.equal(makeDomainTick(actDomain(after,{type:'PAUSE'}),1800000000002).phase,'paused');
});
