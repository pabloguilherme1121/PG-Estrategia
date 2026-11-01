import test from "node:test";
import assert from "node:assert/strict";
import {
  MIRROR_LEVELS, MIRROR_MODES, createMirrorGame, rotateMirror,
  traceSignals, undoMirror, toggleMirrorPause, getMirrorHint,
} from "../public/estrategia/independentes/espelhos-sinal/engine.mjs";

test("Espelhos: geração reproduzível, posições válidas e rotas independentes",()=>{
 for(const mode of MIRROR_MODES)for(const difficulty of Object.keys(MIRROR_LEVELS))
  for(let seed=0;seed<32;seed++){
    const a=createMirrorGame({mode,difficulty,seed});
    assert.deepEqual(a,createMirrorGame({mode,difficulty,seed}));
    assert.equal(a.size,MIRROR_LEVELS[difficulty].size);
    assert.equal(a.emitters.length,mode==="duplo"?2:1);
    assert.equal(a.targets.length,a.emitters.length);
    assert.ok(a.mirrors.length>=2*a.emitters.length);
    assert.equal(new Set(a.mirrors.map(m=>m.cell)).size,a.mirrors.length);
    assert.ok(a.mirrors.every(m=>m.cell>=0&&m.cell<a.size*a.size));
    assert.equal(a.phase,"playing");
    assert.ok(a.mirrors.some(m=>m.solution!==m.slant));
  }
 assert.throws(()=>createMirrorGame({mode:"desconhecido"}),RangeError);
 assert.throws(()=>createMirrorGame({difficulty:"desconhecida"}),RangeError);
 assert.throws(()=>createMirrorGame({seed:-1}),RangeError);
});
test("Espelhos: rotação isolada, índice inválido e colisão sem mudança",()=>{
 const s=createMirrorGame({seed:4});
 assert.equal(rotateMirror(s,-1),s);
 assert.equal(rotateMirror(s,s.size*s.size),s);
 const blank=Array.from({length:s.size*s.size},(_,i)=>i).find(i=>!s.mirrors.some(m=>m.cell===i));
 assert.equal(rotateMirror(s,blank),s);
 const mirror=s.mirrors[0];
 const next=rotateMirror(s,mirror.cell);
 assert.equal(s.moves,0);
 assert.equal(next.moves,1);
 assert.equal(next.mirrors.find(m=>m.cell===mirror.cell).slant,mirror.slant==="/"? "\\":"/");
 const returned=rotateMirror(next,mirror.cell);
 assert.equal(returned.mirrors.find(m=>m.cell===mirror.cell).slant,mirror.slant);
 assert.equal(returned.moves,2);
});
test("Espelhos: pausa bloqueia dicas, rotação e desfazer",()=>{
 const s=createMirrorGame({seed:9});
 const next=rotateMirror(s,s.mirrors[0].cell);
 const paused=toggleMirrorPause(next);
 assert.equal(rotateMirror(paused,s.mirrors[1].cell),paused);
 assert.equal(undoMirror(paused),paused);
 assert.equal(getMirrorHint(paused),null);
 const returned=toggleMirrorPause(paused);
 const undone=undoMirror(returned);
 assert.equal(undone.moves,0);
 assert.deepEqual(undone.mirrors,s.mirrors);
});
test("Espelhos: propagação de sinais é finita e encontra receptores",()=>{
 for(const mode of MIRROR_MODES)for(const difficulty of Object.keys(MIRROR_LEVELS))
  for(let seed=0;seed<40;seed++){
    let s=createMirrorGame({mode,difficulty,seed});
    const initial=traceSignals(s);
    assert.equal(initial.paths.length,s.emitters.length);
    assert.ok(initial.paths.every(p=>p.length<=s.size*s.size*4));
    let operations=0;
    while(s.phase==="playing"){
      const hint=getMirrorHint(s);
      assert.ok(hint,mode+"/"+difficulty+"/"+seed);
      const next=rotateMirror(s,hint.cell);
      assert.notEqual(next,s);
      s=next;
      operations++;
      assert.ok(operations<=s.mirrors.length);
    }
    assert.equal(s.phase,"won",mode+"/"+difficulty+"/"+seed);
    assert.equal(traceSignals(s).reached,s.targets.length);
    assert.ok(s.score>0);
    assert.equal(getMirrorHint(s),null);
  }
});
test("Espelhos: excesso de giros termina em derrota e reiniciar limpa estado",()=>{
 let s=createMirrorGame({difficulty:"recruta",seed:5});
 const decoy=s.mirrors.find(m=>!m.critical);
 assert.ok(decoy);
 for(let i=0;i<s.maxMoves&&s.phase==="playing";i++)
   s=rotateMirror(s,decoy.cell);
 assert.equal(s.phase,"lost");
 assert.equal(rotateMirror(s,s.mirrors[0].cell),s);
 assert.equal(toggleMirrorPause(s),s);
 assert.equal(createMirrorGame({seed:5}).phase,"playing");
});
