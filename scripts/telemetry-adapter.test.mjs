import test from 'node:test';
import assert from 'node:assert/strict';
import {createTelemetryAdapter,makeTick} from '../public/estrategia/independentes/telemetry-adapter.mjs';

test('adaptador mantém canal fechado até consentimento e envia somente campos permitidos',()=>{
 const sent=[],closed=[];
 class MockChannel{postMessage(value){sent.push(value)}close(){closed.push(true)}}
 const adapter=createTelemetryAdapter({
  project:'estrategia',gameId:'gravidade-cristais',
  getSnapshot:()=>({phase:'playing',moves:3,score:null,turn:null,resources:null,secret:'PRIVATE',tokens:['secret']}),
  channelFactory:()=>new MockChannel(),now:()=>1800000000000,heartbeat:false
 });
 adapter.send();assert.equal(sent.length,0);
 adapter.enable();assert.equal(sent.length,1);
 assert.deepEqual(sent[0],{type:'PG_STATE_TICK',version:1,project:'estrategia',gameId:'gravidade-cristais',timestamp:1800000000000,phase:'playing',turn:null,score:null,resources:null,moves:3});
 assert.doesNotMatch(JSON.stringify(sent),/secret|PRIVATE|tokens/);
 adapter.disable();adapter.send();assert.equal(sent.length,1);assert.equal(closed.length,1);
});
test('valida campos de jogo, evita números absurdos e erros sem BroadcastChannel',()=>{
 assert.equal(makeTick({gameId:'../../fake',snapshot:{phase:'playing'},now:1}),null);
 assert.equal(makeTick({gameId:'gravidade-cristais',snapshot:{phase:'playing',moves:-1},now:1}),null);
 assert.equal(makeTick({gameId:'gravidade-cristais',snapshot:{phase:'playing',moves:Infinity},now:1}),null);
 assert.equal(makeTick({gameId:'gravidade-cristais',snapshot:{phase:'won',moves:2},now:1}),null);
 const disabled=createTelemetryAdapter({gameId:'gravidade-cristais',getSnapshot:()=>({phase:'playing'}) , channelFactory:()=>{throw Error('unavailable')},heartbeat:false});
 assert.equal(disabled.enable(),false);
});
test('a saída de build instala adaptador compartilhado como módulo local no PWA',async()=>{
 const {readFileSync,existsSync}=await import('node:fs');
 assert.ok(existsSync('dist/independentes/gravidade-cristais/telemetry-adapter.mjs'));
 const sw=readFileSync('public/estrategia/independentes/gravidade-cristais/sw.js','utf8');
 assert.match(sw,/telemetry-adapter\.mjs/);
});
