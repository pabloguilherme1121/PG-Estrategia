import test from "node:test";
import assert from "node:assert/strict";
import {
  createDispatchGame,dispatchJob,undoDispatch,toggleDispatchPause,getDispatchHint,
  DISPATCH_DIFFICULTIES,DISPATCH_MODES,
} from "../public/estrategia/independentes/central-resgates/engine.mjs";

test("Despacho: dois objetivos, três dificuldades e 20 sementes reproduzíveis",()=>{
  for(const mode of DISPATCH_MODES) for(const difficulty of Object.keys(DISPATCH_DIFFICULTIES)){
    for(let seed=0;seed<20;seed++){
      const state=createDispatchGame({mode,difficulty,seed});
      assert.deepEqual(state,createDispatchGame({mode,difficulty,seed}));
      assert.equal(state.jobs.length,DISPATCH_DIFFICULTIES[difficulty].jobs);
      assert.equal(state.time,0);
      assert.equal(state.phase,"playing");
      assert.ok(state.target>=1 && state.target<=state.bestPossible);
      assert.ok(state.jobs.every(j=>j.duration>=1&&j.deadline<=state.endTime));
    }
  }
  assert.throws(()=>createDispatchGame({mode:"falso"}),RangeError);
  assert.throws(()=>createDispatchGame({difficulty:"falso"}),RangeError);
  assert.throws(()=>createDispatchGame({seed:-1}),RangeError);
});

test("Despacho: valida prazos, pontos e índices sem mutação",()=>{
  const initial=createDispatchGame({seed:9});
  const job=initial.jobs[0];
  const next=dispatchJob(initial,job.id);
  assert.equal(initial.time,0);
  assert.equal(next.time,job.duration);
  assert.equal(next.jobs.length,initial.jobs.length);
  assert.equal(next.completed[0].id,job.id);
  assert.equal(next.completed[0].onTime,job.duration<=job.deadline);
  assert.equal(next.score,(job.duration<=job.deadline)?job.reward:0);
  assert.equal(dispatchJob(next,job.id),next);
  assert.equal(dispatchJob(next,"inexistente"),next);
  assert.equal(dispatchJob(next,null),next);
});

test("Despacho: pausa bloqueia ações, dica e desfazer",()=>{
  const state=createDispatchGame({seed:2});
  const changed=dispatchJob(state,state.jobs[0].id);
  const paused=toggleDispatchPause(changed);
  assert.equal(dispatchJob(paused,changed.jobs[1].id),paused);
  assert.equal(getDispatchHint(paused),null);
  assert.equal(undoDispatch(paused),paused);
  const resumed=toggleDispatchPause(paused);
  const restored=undoDispatch(resumed);
  assert.equal(restored.time,0);
  assert.equal(restored.score,0);
  assert.equal(restored.completed.length,0);
  assert.equal(restored.paused,false);
});

test("Despacho: a dica conduz a vitórias nos 2 modos, 3 níveis, 35 sementes",()=>{
  for(const mode of DISPATCH_MODES) for(const difficulty of Object.keys(DISPATCH_DIFFICULTIES)){
    for(let seed=0;seed<35;seed++){
      let state=createDispatchGame({mode,difficulty,seed});
      let count=0;
      while(state.phase==="playing"){
        const hint=getDispatchHint(state);
        assert.ok(hint && hint.id,"Dica sem saída: "+mode+"/"+difficulty+"/"+seed);
        state=dispatchJob(state,hint.id);
        count++;
        assert.ok(count<=state.jobs.length);
      }
      assert.equal(state.phase,"won",mode+"/"+difficulty+"/"+seed);
      assert.ok(state.score>=state.target);
      assert.equal(getDispatchHint(state),null);
    }
  }
});

test("Despacho: desperdiçar tempo leva à derrota e reiniciar zera a sessão",()=>{
  let state=createDispatchGame({difficulty:"veterano",seed:4});
  // Choose the latest deadline and largest duration first, ignoring urgency.
  while(state.phase==="playing"){
    const available=state.jobs.filter(j=>!state.completed.some(x=>x.id===j.id)&&state.time+j.duration<=state.endTime);
    if(!available.length)break;
    available.sort((a,b)=>b.deadline-a.deadline || b.duration-a.duration);
    state=dispatchJob(state,available[0].id);
  }
  assert.equal(state.phase,"lost");
  assert.equal(dispatchJob(state,state.jobs[0].id),state);
  assert.equal(toggleDispatchPause(state),state);
  assert.equal(createDispatchGame({difficulty:"veterano",seed:4}).phase,"playing");
});
