import test from 'node:test';
import assert from 'node:assert/strict';
import {initMission,play,legalMoves,validateSession} from '../public/estrategia/core.mjs';

const cases = [
  ['est-001', 'cells', {value:'não é tabuleiro'}],
  ['est-026', 'blocked', {value:'não é grade'}],
  ['est-051', 'credits', {value:'créditos infinitos'}],
  ['est-076', 'towers', {value:[1,2]}],
  ['est-101', 'position', {value:300}],
  ['est-126', 'energy', {value:NaN}]
];
for(const [id,field,{value}] of cases){
 test('validador rejeita sessão corrompida '+id+' ('+field+')',()=>{
  const state=initMission(id);
  assert.equal(validateSession(state),true);
  assert.equal(validateSession({...state,[field]:value}),false);
 });
}
test('sessões geradas pelos seis motores continuam válidas após uma jogada real',()=>{
 for(const [id] of cases){
  let s=initMission(id);
  const action=s.family==='defesa'?{type:'wave'}:s.family==='cidade'?{type:'equilibrio'}:
    s.family==='economia'?{type:legalMoves(s)[0]}:{cell:legalMoves(s)[0]};
  s=play(s,action);
  assert.equal(validateSession(s),true,id+' jogada '+JSON.stringify(action));
 }
});
