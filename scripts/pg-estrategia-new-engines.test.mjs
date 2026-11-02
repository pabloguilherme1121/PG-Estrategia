import test from 'node:test';
import assert from 'node:assert/strict';
import {HexConquestEngine,createDominioTerritorialGame} from '../public/estrategia/engines/hex-conquest.mjs';
import {TurnTacticsEngine} from '../public/estrategia/engines/turn-tactics.mjs';

test('território: impede compras inválidas sem efeitos colaterais',()=>{
 const g=createDominioTerritorialGame(),before=g.getState();
 for(const amount of [0,-1,0.5,NaN,Infinity])assert.equal(g.processAction({type:'DEPLOY_TROOPS',targetKey:'0,1',amount}).success,false);
 assert.equal(g.getState().playerSupplies,before.playerSupplies);
 assert.equal(g.getState().grid.get('0,1').troops,before.grid.get('0,1').troops);
});
test('território: apenas hexágonos adjacentes, guarnições sempre positivas',()=>{
 const g=createDominioTerritorialGame();
 assert.equal(g.processAction({type:'ATTACK_HEX',sourceKey:'0,1',targetKey:'0,-1'}).success,false);
 assert.equal(g.processAction({type:'ATTACK_HEX',sourceKey:'0,1',targetKey:'0,0'}).success,true);
 assert.ok([...g.getState().grid.values()].every(c=>c.troops>=1));
});
test('território: adversário recruta e avança no fim do turno',()=>{
 const g=createDominioTerritorialGame(),before=g.getState();
 assert.equal(g.processAction({type:'END_TURN'}).success,true);
 const after=g.getState();
 assert.equal(after.turn,2);
 assert.notDeepEqual([...after.grid.entries()],[...before.grid.entries()]);
 assert.ok([...after.grid.values()].every(c=>c.troops>=1));
});
test('território: snapshot isolado da sessão e referência nova para renderização',()=>{
 const g=createDominioTerritorialGame(),snapshot=g.getState();
 snapshot.grid.set('0,1',{q:0,r:1,owner:'enemy',troops:999,defenseBonus:1});
 assert.equal(g.getState().grid.get('0,1').owner,'player');
 assert.notEqual(g.getState().grid,snapshot.grid);
});
function tacticsFixture(){
 return new TurnTacticsEngine({maxTurns:9},{turn:1,activeTeam:'player',grid:[
  [{terrain:'plain',unit:{id:'p',team:'player',hp:8,maxHp:8,ap:3,maxAp:3,attackDamage:4,attackRange:1}},{terrain:'plain',unit:null},{terrain:'cover',unit:{id:'e',team:'enemy',hp:8,maxHp:8,ap:2,maxAp:2,attackDamage:2,attackRange:1}}],
  [{terrain:'plain',unit:null},{terrain:'obstacle',unit:null},{terrain:'plain',unit:null}],
  [{terrain:'plain',unit:null},{terrain:'plain',unit:null},{terrain:'plain',unit:null}],
 ]});
}
test('tática: movimento bloqueado por terreno e AP consumido no caminho',()=>{
 const g=tacticsFixture();
 assert.equal(g.processAction({type:'MOVE',unitId:'p',target:{x:1,y:1}}).success,false);
 assert.equal(g.processAction({type:'MOVE',unitId:'p',target:{x:2,y:1}}).success,false);
 assert.equal(g.processAction({type:'MOVE',unitId:'p',target:{x:1,y:0}}).success,true);
 assert.equal(g.getState().grid[0][1].unit.ap,2);
});
test('tática: cobertura atenua dano e IA adversária responde',()=>{
 const g=tacticsFixture();
 g.processAction({type:'MOVE',unitId:'p',target:{x:1,y:0}});
 assert.equal(g.processAction({type:'ATTACK',unitId:'p',targetId:'e'}).success,true);
 assert.equal(g.getState().grid[0][2].unit.hp,6);
 assert.equal(g.processAction({type:'END_TURN'}).success,true);
 assert.equal(g.getState().turn,2);
 assert.ok(g.getState().grid.flat().some(c=>c.unit?.team==='player'&&c.unit.hp<8));
});
test('tática: alterações no snapshot não afetam unidades do motor',()=>{
 const g=tacticsFixture(),snapshot=g.getState();
 snapshot.grid[0][0].unit.hp=0;
 assert.equal(g.getState().grid[0][0].unit.hp,8);
});
