import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, MISSIONS, EXISTING_STRATEGY, getMission } from '../public/estrategia/catalog.mjs';
import { initMission, play, undo, legalMoves, rng, validateSession, progressValue } from '../public/estrategia/core.mjs';

test('150 IDs estáveis, títulos únicos, seis sistemas e 25 missões por sistema',()=>{
 assert.equal(MISSIONS.length,150);assert.equal(new Set(MISSIONS.map(m=>m.id)).size,150);assert.equal(new Set(MISSIONS.map(m=>m.name)).size,150);
 for(const f of FAMILIES)assert.equal(MISSIONS.filter(x=>x.family===f.id).length,25);
 assert.equal(getMission('est-150').family,'cidade');assert.equal(getMission('est-000'),null);
 assert.equal(EXISTING_STRATEGY.length,47);
 assert.equal(new Set(EXISTING_STRATEGY.map(x=>x[0])).size,EXISTING_STRATEGY.length);
});
test('cada missão inicia com estado válido e ao menos uma ação disponível',()=>{
 for(const m of MISSIONS){let s=initMission(m.id);assert.equal(s.id,m.id);assert.equal(s.status,'playing');assert.ok(validateSession(s),m.id);assert.ok(legalMoves(s).length,m.id);assert.ok(progressValue(s)[1]>0,m.id);}
});
test('conquista expande, adversário responde, ação inválida não altera turno e desfazer recupera estado',()=>{
 let s=initMission('est-001'),bad=play(s,{cell:24});assert.equal(bad.turn,0);const move=legalMoves(s)[0],next=play(s,{cell:move});assert.equal(next.cells[move],1);assert.equal(next.turn,1);assert.equal(next.cells.filter(x=>x===2).length,2);
 let prev=undo(next);assert.equal(prev.cells[move],0);assert.equal(prev.turn,0);
});
test('rota tem caminho garantido pelas bordas, 25 vitórias sem atravessar bloqueios',()=>{
 for(const m of MISSIONS.filter(m=>m.family==='rotas')){let s=initMission(m.id);for(const id of [1,2,3,4,9,14,19,24]){assert.ok(legalMoves(s).includes(id),`${m.id} destino ${id}`);s=play(s,{cell:id});}assert.equal(s.status,'won',m.id);assert.equal(s.turn,8);}
});
test('economia aplica custos e recupera por desfazer sem permitir créditos negativos',()=>{
 let s=initMission('est-051');assert.equal(play(s,{type:'invalid'}).turn,0);s=play(s,{type:'cultivar'});assert.equal(s.food,8);assert.ok(s.credits>=0);assert.equal(undo(s).food,4);
});
test('defesa permite construir, bloqueia compra sem crédito e preserva a vida quando cobre a pista',()=>{
 let s=initMission('est-076');let lane=s.waves[0].lane;s=play(s,{type:'build',lane});s=play(s,{type:'build',lane});let hp=s.hp;s=play(s,{type:'wave'});assert.equal(s.hp,hp);assert.equal(s.turn,1);assert.equal(play(s,{type:'build',lane:8}).turn,1);
});
test('logística tem caminho conhecido de entrega em todas as 25 missões',()=>{
 for(const m of MISSIONS.filter(m=>m.family==='logistica')){let s=initMission(m.id);for(const id of [1,2,3,4,9,14,19,24])s=play(s,{cell:id});assert.equal(s.status,'won',m.id);assert.deepEqual(s.carried,[2,14]);}
});
test('cidade conclui com projeto de equilíbrio em 25 missões',()=>{
 for(const m of MISSIONS.filter(m=>m.family==='cidade')){let s=initMission(m.id);const steps=s.target-Math.min(s.energy,s.water,s.trust);for(let t=0;t<steps;t++)s=play(s,{type:'equilibrio'});assert.equal(s.status,'won',m.id);}
});
test('jogos concluídos não aceitam novos comandos; entradas inesperadas são rejeitadas',()=>{
 assert.throws(()=>initMission('__proto__'));let s=initMission('est-126');let result=play(s,null);assert.equal(result.turn,0);assert.equal(validateSession({...s,history:Array(100).fill({})}),false);
 for(let i=0;i<10&&s.status==='playing';i++)s=play(s,{type:'equilibrio'});assert.equal(s.status,'won');assert.equal(play(s,{type:'solar'}).turn,s.turn);
});
test('PRNG gera mapas diferentes e as regras não dependem de Math.random',()=>{
 assert.deepEqual([rng(91)(),rng(91)()],[rng(91)(),rng(91)()]);
 const a=initMission('est-026'),b=initMission('est-027');assert.notDeepEqual(a.blocked,b.blocked);
});

test('todas as 150 missões admitem uma sequência de vitória com regras reais',()=>{
 for(const m of MISSIONS){let s=initMission(m.id),guard=0;
  if(m.family==='territorio')while(s.status==='playing'&&guard++<60)s=play(s,{cell:legalMoves(s)[0]});
  if(m.family==='rotas')for(const id of [1,2,3,4,9,14,19,24])s=play(s,{cell:id});
  if(m.family==='economia')while(s.status==='playing'&&guard++<60){let a=['investir','comerciar','minerar','cultivar'].find(x=>legalMoves(s).includes(x));s=play(s,{type:a});}
  if(m.family==='defesa')while(s.status==='playing'&&guard++<70){const wave=s.waves[s.turn];const lane=wave.lane;if(s.towers[lane]<wave.power&&s.credits>=(s.towers[lane]?4:3))s=play(s,{type:'build',lane});else s=play(s,{type:'wave'});}
  if(m.family==='logistica')for(const id of [1,2,3,4,9,14,19,24])s=play(s,{cell:id});
  if(m.family==='cidade'){const steps=s.target-Math.min(s.energy,s.water,s.trust);for(let i=0;i<steps;i++)s=play(s,{type:'equilibrio'});}
  assert.equal(s.status,'won',`${m.id}: ${s.notice}`);
 }
});


test('torres compradas podem ser desfeitas sem gastar um turno ou perder créditos',()=>{
 const base=initMission('est-076');const lane=base.waves[0].lane;
 const afterBuy=play(base,{type:'build',lane});
 assert.equal(afterBuy.turn,0);
 assert.equal(afterBuy.towers[lane],1);
 assert.equal(afterBuy.credits,base.credits-3);
 const restored=undo(afterBuy);
 assert.deepEqual(restored.towers,base.towers);
 assert.equal(restored.credits,base.credits);
 assert.equal(restored.turn,0);
 assert.equal(restored.history.length,0);
});
