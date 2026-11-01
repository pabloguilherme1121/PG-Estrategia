import test from 'node:test';
import assert from 'node:assert/strict';
import {createDroneGame,queueDroneOrder,removeDroneOrder,toggleDronePause,executeDroneProgram,undoDroneCycle,patrolAt,DIFFICULTIES,MODES,WALLS} from '../public/estrategia/independentes/comando-de-drones/engine.mjs';
const load=(state,orders)=>orders.reduce(queueDroneOrder,state);
const run=(state,orders)=>executeDroneProgram(load(state,orders));
test('configurações próprias com duas operações, três dificuldades e semente determinística',()=>{
 for(const mode of Object.keys(MODES))for(const difficulty of Object.keys(DIFFICULTIES)){
  const a=createDroneGame({mode,difficulty,seed:42});
  const b=createDroneGame({mode,difficulty,seed:42});
  assert.deepEqual(a,b);
  assert.equal(a.phase,'playing');
  assert.equal(a.beacons.length,2);
  assert.equal(a.maxCycles,DIFFICULTIES[difficulty].cycles);
 }
 assert.throws(()=>createDroneGame({mode:'nao-existe'}));
 assert.throws(()=>createDroneGame({difficulty:'__proto__'}));
 assert.throws(()=>createDroneGame({seed:-1}));
});
test('fila de três instruções, remoção e bloqueio de comandos inválidos',()=>{
 const a=createDroneGame();
 assert.equal(queueDroneOrder(a,'hack'),a);
 assert.equal(removeDroneOrder(a),a);
 const b=load(a,['right','wait','down']);
 assert.deepEqual(b.queue,['right','wait','down']);
 assert.equal(queueDroneOrder(b,'left'),b);
 assert.deepEqual(removeDroneOrder(b).queue,['right','wait']);
 assert.deepEqual(a.queue,[]);
});
test('paredes e bordas gastam energia sem atravessar os bloqueios',()=>{
 let a=createDroneGame({seed:2});
 a=run(a,['left','up']);
 assert.equal(a.position,0);
 assert.equal(a.energy,a.maxEnergy-2);
 a=run(a,['right','down']);
 assert.equal(a.position,1);
 assert.ok(WALLS.includes(6));
});
test('pausa, histórico, desfazer e reinício determinístico',()=>{
 const a=createDroneGame({seed:1});
 const queued=queueDroneOrder(a,'right');
 const paused=toggleDronePause(queued);
 assert.equal(executeDroneProgram(paused),paused);
 assert.equal(queueDroneOrder(paused,'up'),paused);
 const resumed=toggleDronePause(paused);
 const next=executeDroneProgram(resumed);
 assert.equal(next.cycles,1);
 assert.equal(next.history.length,1);
 const undone=undoDroneCycle(next);
 assert.equal(undone.cycles,0);
 assert.deepEqual(undone.queue,['right']);
 assert.deepEqual(createDroneGame({seed:1}),a);
});
test('patrulha se move e derrota pode ocorrer por tempo ou energia',()=>{
 let a=createDroneGame({difficulty:'veterano',seed:0});
 assert.equal(patrolAt(a,0),2);
 for(let i=0;i<45&&a.phase==='playing';i++)a=run(a,['wait']);
 assert.equal(a.phase,'lost');
 assert.ok(a.energy<=0||a.cycles>=a.maxCycles||a.integrity<=0);
 assert.equal(executeDroneProgram(a),a);
});
test('resgate pode ser concluído após coletar os sinais',()=>{
 let a=createDroneGame({seed:1,mode:'resgate',difficulty:'recruta'});
 const route=[...Array(4).fill('right'),...Array(4).fill('down'),...Array(4).fill('left'),...Array(4).fill('right')];
 for(let i=0;i<route.length&&a.phase==='playing';i+=3)a=run(a,route.slice(i,i+3));
 assert.equal(a.phase,'won',JSON.stringify(a));
 assert.deepEqual(new Set(a.collected),new Set([4,20]));
 assert.equal(a.position,24);
 assert.ok(a.cycles<=a.maxCycles);
 assert.equal(queueDroneOrder(a,'up'),a);
});
test('varredura possui objetivos diferentes e os estados são imutáveis',()=>{
 const a=createDroneGame({seed:5,mode:'varredura'});
 const b=run(a,['down','down','down']);
 assert.notDeepEqual(a,b);
 assert.deepEqual(a.collected,[]);
 assert.deepEqual(b.beacons,[10,14]);
 assert.equal(a.position,0);
});
test('as duas operações são vencíveis nas três dificuldades e cinco patrulhas',()=>{
 const routes={resgate:[...Array(4).fill('right'),...Array(4).fill('down'),...Array(4).fill('left'),...Array(4).fill('right')],varredura:[...Array(2).fill('down'),...Array(4).fill('right'),...Array(2).fill('down')]};
 for(const difficulty of Object.keys(DIFFICULTIES))for(const mode of Object.keys(MODES))for(let seed=0;seed<5;seed++){
  let state=createDroneGame({difficulty,mode,seed}),route=routes[mode];
  for(let i=0;i<route.length&&state.phase==='playing';i+=3)state=run(state,route.slice(i,i+3));
  assert.equal(state.phase,'won',mode+'/'+difficulty+'/'+seed);
 }
});
