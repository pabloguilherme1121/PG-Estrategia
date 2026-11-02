import test from 'node:test';
import assert from 'node:assert/strict';
import {createDomainGame,actDomain,domainGuidance} from '../public/estrategia/independentes/dominio-territorial/engine.mjs';

test('existe uma campanha legal de três turnos até a vitória no modo tático',()=>{
 let s=createDomainGame({difficulty:'tatico'});
 const doAction=(type,extra={})=>{
  const next=actDomain(s,{type,...extra});
  assert.notEqual(next,s,'ação ignorada: '+JSON.stringify({type,...extra}));
  s=next;
 };
 doAction('ATTACK',{source:'0,1',target:'-1,1'});
 assert.equal(s.grid['-1,1'].owner,'player');
 doAction('END_TURN');
 assert.equal(s.grid['0,0'].owner,'enemy');
 doAction('DEPLOY',{target:'-1,1',amount:3});
 doAction('ATTACK',{source:'-1,1',target:'0,0'});
 assert.equal(s.grid['0,0'].owner,'player');
 doAction('END_TURN');
 doAction('DEPLOY',{target:'0,0',amount:2});
 doAction('ATTACK',{source:'0,0',target:'0,-1'});
 assert.equal(s.phase,'victory');
 assert.equal(s.turn,3);
 assert.match(domainGuidance(s).recommendedAction,/concluída/);
});
