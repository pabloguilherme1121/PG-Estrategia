import test from "node:test";
import assert from "node:assert/strict";
import {createWarehouse,moveWarehouse,undoWarehouse,toggleWarehousePause,getWarehouseHint,WAREHOUSE_LEVELS,WAREHOUSE_MODES} from "../public/estrategia/independentes/armazem-tatico/engine.mjs";
test("Armazém: 2 modos, 3 níveis e 24 sementes solucionáveis com caixas distintas",()=>{
 for(const mode of WAREHOUSE_MODES) for(const difficulty of Object.keys(WAREHOUSE_LEVELS))
  for(let seed=0;seed<24;seed++){
   let game=createWarehouse({mode,difficulty,seed}),guard=0;
   assert.deepEqual(game,createWarehouse({mode,difficulty,seed}));
   assert.equal(game.boxes.length,WAREHOUSE_LEVELS[difficulty].boxes);
   assert.equal(game.goals.length,game.boxes.length);
   assert.equal(new Set(game.boxes).size,game.boxes.length);
   assert.ok(game.boxes.every(i=>!game.walls.includes(i)));
   while(game.phase==="playing"&&guard++<100){
    const hint=getWarehouseHint(game);
    assert.ok(hint?.direction,mode+"/"+difficulty+"/"+seed);
    const updated=moveWarehouse(game,hint.direction);
    assert.notEqual(updated,game);
    game=updated;
   }
   assert.equal(game.phase,"won",mode+"/"+difficulty+"/"+seed);
   assert.ok(game.score>0);
   assert.ok(game.moves<=game.maxMoves);
  }
});
test("Armazém: bloqueios e comandos inválidos não alteram estado nem histórico",()=>{
 const game=createWarehouse({difficulty:"veterano",seed:0});
 assert.equal(moveWarehouse(game,"hack"),game);
 assert.equal(moveWarehouse(game,"up"),game);
 assert.equal(undoWarehouse(game),game);
 assert.throws(()=>createWarehouse({difficulty:"falso"}),RangeError);
 assert.throws(()=>createWarehouse({mode:"falso"}),RangeError);
 assert.throws(()=>createWarehouse({seed:-1}),RangeError);
 assert.throws(()=>createWarehouse({seed:1.1}),RangeError);
 const step=moveWarehouse(game,getWarehouseHint(game).direction);
 assert.equal(game.moves,0);
 assert.equal(step.moves,1);
 assert.equal(step.history.length,1);
 assert.deepEqual(undoWarehouse(step).boxes,game.boxes);
 assert.equal(undoWarehouse(step).moves,0);
});
test("Armazém: pausa impede jogar, dicas e desfazer e permite retomar",()=>{
 let game=createWarehouse({mode:"economia",difficulty:"tatico",seed:11});
 const first=moveWarehouse(game,getWarehouseHint(game).direction);
 const paused=toggleWarehousePause(first);
 assert.equal(paused.paused,true);
 assert.equal(getWarehouseHint(paused),null);
 assert.equal(moveWarehouse(paused,"right"),paused);
 assert.equal(undoWarehouse(paused),paused);
 const resumed=toggleWarehousePause(paused);
 assert.equal(resumed.paused,false);
 assert.deepEqual(undoWarehouse(resumed).boxes,game.boxes);
});
test("Armazém: movimentos inúteis levam à derrota sem travar reinício",()=>{
 let game=createWarehouse({mode:"economia",difficulty:"recruta",seed:0});
 for(let i=0;i<200&&game.phase==="playing";i++){
  const directions=["right","left","up","down"];
  let candidate=null;
  for(const dir of directions){const next=moveWarehouse(game,dir);if(next!==game&&next.phase!=="won"){candidate=next;break;}}
  if(candidate)game=candidate;
  else break;
 }
 assert.equal(game.phase,"lost");
 assert.equal(moveWarehouse(game,"up"),game);
 assert.equal(toggleWarehousePause(game),game);
 assert.equal(createWarehouse({seed:0}).phase,"playing");
});

test("Armazém: missões Tático e Veterano exigem decisões laterais, não apenas empurrar em linha reta",()=>{
 for(const difficulty of ["tatico","veterano"]){
  const game=createWarehouse({difficulty,seed:0});
  assert.ok(game.goals.some((goal,i)=>goal%game.size!==game.boxes[i]%game.size),difficulty);
  const verticalPath=game.boxes.map(box=>box+2*game.size);
  assert.notDeepEqual(verticalPath.sort((a,b)=>a-b),game.goals,difficulty);
  assert.ok(game.walls.length>4*(game.size-1),"layout precisa de obstáculos");
  let state=game;
  for(let i=0;i<100&&state.phase==="playing";i++){
   const hint=getWarehouseHint(state);
   assert.ok(hint,"a complexidade não pode gerar fase impossível");
   state=moveWarehouse(state,hint.direction);
  }
  assert.equal(state.phase,"won",difficulty);
  assert.ok(state.moves>game.boxes.length*2,difficulty);
 }
});
