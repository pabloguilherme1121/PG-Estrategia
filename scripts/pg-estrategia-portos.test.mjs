import test from "node:test";
import assert from "node:assert/strict";
import {createHarbor,dispatchHarbor,waitHarbor,undoHarbor,pauseHarbor,hintHarbor,HARBOR_MODES,HARBOR_LEVELS} from "../public/estrategia/independentes/portos-em-turnos/engine.mjs";

test("portos: dois berços simultâneos, carga pesada somente no profundo e semente reproduzível",()=>{
 for(const mode of HARBOR_MODES)for(const difficulty of Object.keys(HARBOR_LEVELS))for(let seed=0;seed<24;seed++){
  const g=createHarbor({mode,difficulty,seed});
  assert.deepEqual(g,createHarbor({mode,difficulty,seed}));
  assert.deepEqual(Object.keys(g.active).sort(),["costeiro","profundo"]);
  assert.equal(g.ships.length,HARBOR_LEVELS[difficulty]);
  assert.equal(new Set(g.ships.map(s=>s.id)).size,g.ships.length);
  assert.ok(g.ships.some(s=>s.cargo==="pesada"));
  assert.ok(g.ships.some(s=>s.cargo==="leve"));
  assert.ok(g.ships.every(s=>["leve","pesada"].includes(s.cargo)&&s.duration>=1&&s.duration<=3));
 }
});
test("portos: trabalho paralelo e restrição de profundidade, distinta de uma fila única",()=>{
 const g=createHarbor({seed:2}),heavy=g.ships.find(s=>s.cargo==="pesada"&&s.arrival===0),light=g.ships.find(s=>s.cargo==="leve"&&s.arrival===0);
 assert.ok(heavy&&light);
 assert.equal(dispatchHarbor(g,heavy.id,"costeiro"),g);
 const a=dispatchHarbor(g,heavy.id,"profundo");
 assert.equal(a.clock,0);
 assert.equal(a.active.profundo.id,heavy.id);
 assert.equal(dispatchHarbor(a,light.id,"profundo"),a);
 const parallel=dispatchHarbor(a,light.id,"costeiro");
 assert.equal(parallel.clock,0);
 assert.equal(parallel.active.costeiro.id,light.id);
 const tick=waitHarbor(parallel);
 assert.equal(tick.clock,1);
 assert.notDeepEqual(tick.active,parallel.active);
});
test("portos: pausa e desfazer de despacho e horário após resultado",()=>{
 const g=createHarbor({seed:3});
 const hint=hintHarbor(g); assert.ok(hint);
 const next=hint==="wait"?waitHarbor(g):dispatchHarbor(g,hint.id,hint.berth);
 assert.notEqual(next,g);
 const paused=pauseHarbor(next); assert.equal(paused.paused,true);
 assert.equal(waitHarbor(paused),paused);
 assert.equal(dispatchHarbor(paused,"N1","profundo"),paused);
 assert.equal(hintHarbor(paused),null);
 const back=undoHarbor(pauseHarbor(paused));assert.deepEqual(back.active,g.active);
 assert.equal(back.clock,g.clock);
});
test("portos: dicas do estado real vencem 144 configurações de agendamento paralelo",()=>{
 for(const mode of HARBOR_MODES)for(const difficulty of Object.keys(HARBOR_LEVELS))for(let seed=0;seed<24;seed++){
  let g=createHarbor({mode,difficulty,seed});
  let steps=0;
  while(g.phase==="playing"&&steps++<70){
   const choice=hintHarbor(g);
   assert.ok(choice,mode+"/"+difficulty+"/"+seed);
   const next=choice==="wait"?waitHarbor(g):dispatchHarbor(g,choice.id,choice.berth);
   assert.notEqual(next,g);g=next;
  }
  assert.equal(g.phase,"won",mode+"/"+difficulty+"/"+seed);
  assert.equal(g.completed.length,HARBOR_LEVELS[difficulty]);
  assert.ok(g.score>0);
 }
});
test("portos: erro de prazo causa derrota; desfazer recupera a partida",()=>{
 const g=createHarbor({mode:"economia",seed:0});
 const after=waitHarbor(g);
 assert.equal(after.phase,"lost");
 assert.equal(undoHarbor(after).phase,"playing");
 assert.equal(dispatchHarbor(after,g.ships[0].id,"profundo"),after);
});
test("portos: parâmetros e barcos inexistentes são recusados sem mutação",()=>{
 for(const data of [{mode:"x"},{difficulty:"x"},{seed:-1},{seed:1.5}])
  assert.throws(()=>createHarbor(data),RangeError);
 const g=createHarbor({});
 for(const id of ["", "N999", null, 3])
  assert.equal(dispatchHarbor(g,id,"profundo"),g);
 assert.equal(dispatchHarbor(g,"N1","inexistente"),g);
});

// Regressions from the review of PR #282.
test("portos: hint solves veteran deadline schedule on seed 117", () => {
 let game = createHarbor({mode: "prazo", difficulty: "veterano", seed: 117});
 for (let turn = 0; game.phase === "playing" && turn < 80; turn++) {
  const hint = hintHarbor(game);
  assert.ok(hint, `Hint absent at hour ${game.clock}, completed: ${game.completed.join(",")}`);
  game = hint === "wait" ? waitHarbor(game) : dispatchHarbor(game, hint.id, hint.berth);
 }
 assert.equal(game.phase, "won", "Seed 117 should have a winning schedule");
});

test("portos: mode description must not promise a fixed waiting allowance", async () => {
 const { readFile } = await import("node:fs/promises");
 const html = await readFile(new URL("../public/estrategia/independentes/portos-em-turnos/index.html", import.meta.url), "utf8");
 assert.doesNotMatch(html, /2 horas de espera permitidas/i);
 assert.match(html, /prazo.*espera.*navios/i);
});
