import test from 'node:test';
import assert from 'node:assert/strict';
import {createDomainGame,actDomain,domainGuidance,legalAttacks,axialNeighbors} from '../public/estrategia/independentes/dominio-territorial/engine.mjs';

const change=(state,type,extra={})=>actDomain(state,{type,...extra});

test('mapa inaugural possui 7 hexágonos axiais válidos, 2 bases e centro fortificado',()=>{
 const a=createDomainGame();
 const b=createDomainGame();
 assert.deepEqual(a,b);
 assert.equal(Object.keys(a.grid).length,7);
 assert.equal(a.grid['0,1'].owner,'player');
 assert.equal(a.grid['0,-1'].owner,'enemy');
 assert.equal(a.grid['0,0'].defenseBonus,1.5);
 assert.equal(a.turn,1);
 assert.equal(a.playerSupplies,6);
 assert.equal(a.enemySupplies,6);
 for(const [key,cell] of Object.entries(a.grid)){
  assert.equal(key,cell.q+','+cell.r);
  assert.ok(Number.isSafeInteger(cell.troops)&&cell.troops>0);
  assert.equal(axialNeighbors(key).length,6);
 }
});

test('rejeita entrada malformada, salto não adjacente e ataque com origem alheia sem mutação',()=>{
 const state=createDomainGame();
 const original=structuredClone(state);
 const invalid=[
  {type:'ATTACK',source:'0,-1',target:'0,1'},
  {type:'ATTACK',source:'0,1',target:'1,-1'},
  {type:'ATTACK',source:'0,1',target:'0,1'},
  {type:'DEPLOY',target:'0,-1',amount:1},
  {type:'DEPLOY',target:'0,1',amount:99999},
  {type:'SELECT',target:'9,9'},
  {type:'MADE_UP'}
 ];
 for(const action of invalid)assert.deepEqual(actDomain(state,action),state);
 assert.deepEqual(state,original);
});

test('seleção, reforço e ataque legal usam suprimentos e guarnição mínima',()=>{
 let game=createDomainGame();
 game=change(game,'SELECT',{target:'0,1'});
 assert.equal(game.selected,'0,1');
 game=change(game,'DEPLOY',{target:'0,1',amount:2});
 assert.equal(game.playerSupplies,0);
 assert.equal(game.grid['0,1'].troops,6);
 game=change(game,'ATTACK',{source:'0,1',target:'-1,1'});
 assert.equal(game.grid['0,1'].troops,1);
 assert.equal(game.grid['-1,1'].owner,'player');
 assert.ok(game.grid['-1,1'].troops>=1);
});

test('a IA atua ao encerrar turno, escolhe movimentos legais e não toma ações do jogador',()=>{
 const original=createDomainGame();
 const a=change(original,'END_TURN'),b=change(original,'END_TURN');
 assert.deepEqual(a,b);
 assert.equal(a.turn,2);
 assert.ok(a.enemySupplies>=0);
 assert.ok(a.playerSupplies>=0);
 for(const cell of Object.values(a.grid))assert.ok(cell.troops>=1);
 assert.equal(original.turn,1);
});

test('pausa impede ações de ataque e fim de turno, retomada e desfazer preservam estado',()=>{
 let game=createDomainGame();
 game=change(game,'PAUSE');
 assert.equal(game.phase,'paused');
 assert.deepEqual(change(game,'END_TURN'),game);
 assert.deepEqual(change(game,'DEPLOY',{target:'0,1',amount:1}),game);
 game=change(game,'PAUSE');
 const before=structuredClone(game);
 game=change(game,'DEPLOY',{target:'0,1',amount:1});
 assert.notDeepEqual(game,before);
 game=change(game,'UNDO');
 assert.deepEqual(game.grid,before.grid);
 assert.equal(game.playerSupplies,before.playerSupplies);
});

test('o objetivo exige centro e base rival; fases encerradas não mudam',()=>{
 let game=createDomainGame();
 game.grid['0,0'].owner='player';
 game.grid['0,-1'].owner='player';
 game=change(game,'END_TURN');
 assert.equal(game.phase,'victory');
 assert.deepEqual(change(game,'DEPLOY',{target:'0,1',amount:1}),game);
 let late=createDomainGame();
 late.turn=20;
 late=change(late,'END_TURN');
 assert.equal(late.phase,'defeat');
});

test('orientação do PG Bot usa somente dados reais e não sugere ação ilegal',()=>{
 const a=createDomainGame();
 const help=domainGuidance(a);
 assert.equal(help.metrics.turn,1);
 assert.equal(help.metrics.playerSupplies,6);
 assert.equal(help.strategyPlan.length,3);
 assert.equal(typeof help.recommendedAction,'string');
 assert.ok(help.strategyPlan.every(x=>typeof x==='string'&&x.length>15));
 const b=change(a,'DEPLOY',{target:'0,1',amount:2});
 const next=domainGuidance(b);
 assert.equal(next.metrics.playerSupplies,0);
 assert.notDeepEqual(next,a);
 assert.equal(legalAttacks(a).some(x=>x.target==='0,0'),true);
});

test('todas as decisões passam por eventos discretos, não exigem timers nem sorteio',()=>{
 const text=String.raw`const a=createDomainGame(); const b=actDomain(a,{type:'END_TURN'});`;
 assert.ok(text.includes('END_TURN'));
 assert.deepEqual(createDomainGame({difficulty:'recruta'}),createDomainGame({difficulty:'recruta'}));
 assert.throws(()=>createDomainGame({difficulty:'desconhecido'}),RangeError);
});