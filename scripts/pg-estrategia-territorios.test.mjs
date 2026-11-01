import test from "node:test";
import assert from "node:assert/strict";
import {
  TERRITORY_MODES, TERRITORY_LEVELS, createTerritory, placeTerritory, passTerritory,
  legalTerritory, botTerritory, commandTerritory, undoTerritory, pauseTerritory,
  scoreTerritory
} from "../public/estrategia/independentes/territorios-de-pedra/engine.mjs";

test("territórios: dois objetivos, três níveis e mapas iniciais únicos e reproduzíveis", () => {
 for (const mode of TERRITORY_MODES) for (const difficulty of Object.keys(TERRITORY_LEVELS)) {
  const game = createTerritory({mode,difficulty,seed:42});
  assert.equal(game.mode, mode);
  assert.equal(game.size,TERRITORY_LEVELS[difficulty]);
  assert.equal(game.board.length,game.size ** 2);
  assert.ok(game.board.every(v=>v===0));
  assert.deepEqual(game,createTerritory({mode,difficulty,seed:42}));
 }
 for (const config of [{mode:"bad"},{difficulty:"bad"},{seed:-1},{seed:1.1}]) {
  assert.throws(()=>createTerritory(config),RangeError);
 }
});

test("territórios: captura quando a última liberdade adversária é ocupada", () => {
 const base=createTerritory();
 const board=base.board.slice();
 for(const i of [7,11,13])board[i]=1;
 board[12]=2;
 const game={...base,board,turn:1};
 const next=placeTerritory(game,17);
 assert.notEqual(next,game);
 assert.equal(next.board[12],0);
 assert.equal(next.board[17],1);
 assert.equal(next.captures.black,1);
 assert.equal(game.board[12],2);
});

test("territórios: jogadas ocupadas, suicidas e fora do mapa são rejeitadas sem mutação", () => {
 const game=createTerritory();
 for(const input of [-1,25,1.2,null,"2"]) assert.equal(placeTerritory(game,input),game);
 const occupied={...game,board:game.board.map((v,i)=>i===3?1:v)};
 assert.equal(placeTerritory(occupied,3),occupied);
 const surrounded={...game,board:game.board.map((v,i)=>[7,11,13,17].includes(i)?2:v)};
 assert.equal(legalTerritory(surrounded,12),false);
 assert.equal(placeTerritory(surrounded,12),surrounded);
});

test("territórios: dois passes encerram por área com resolução de regiões cercadas", () => {
 const game=createTerritory({mode:"territorio"});
 const board=game.board.slice();
 for(const i of [1,5,7,11])board[i]=1;
 const score=scoreTerritory({...game,board});
 assert.ok(score.black>0);
 assert.ok(score.blackTerritory>0);
 const first=passTerritory({...game,board});
 assert.equal(first.phase,"playing");
 assert.equal(first.turn,2);
 const end=passTerritory(first);
 assert.equal(end.phase,"won");
 assert.equal(end.passes,2);
 assert.equal(end.scores.black,score.black);
 assert.equal(end.scores.white,score.white);
});

test("territórios: modo capturas termina imediatamente ao alcançar a meta", () => {
 const base=createTerritory({mode:"capturas",difficulty:"recruta"});
 const board=base.board.slice();
 for(const i of [7,11,13])board[i]=1;
 board[12]=2;
 const game={...base,board,turn:1,captures:{black:base.captureTarget-1,white:0}};
 const won=placeTerritory(game,17);
 assert.equal(won.phase,"won");
 assert.equal(won.captures.black,game.captureTarget);
 assert.equal(legalTerritory(won,0),false);
});

test("territórios: turno inteiro convoca IA, preserva histórico, pausa e permite desfazer", () => {
 const game=createTerritory({difficulty:"tatico",seed:44});
 const played=commandTerritory(game,24);
 assert.notEqual(played,game);
 assert.equal(played.board[24],1);
 assert.ok(played.board.some(v=>v===2));
 assert.equal(played.turn,1);
 assert.equal(played.history.length,1);
 const back=undoTerritory(played);
 assert.deepEqual(back.board,game.board);
 assert.equal(back.captures.black,0);
 const paused=pauseTerritory(played);
 assert.equal(paused.paused,true);
 assert.equal(commandTerritory(paused,1),paused);
 assert.equal(botTerritory(paused),paused);
 assert.equal(pauseTerritory(paused).paused,false);
});

test("territórios: IA local é determinística, só utiliza posições legais", () => {
 const game=createTerritory({seed:9});
 const white={...game,turn:2};
 const a=botTerritory(white);
 const b=botTerritory(white);
 assert.deepEqual(a,b);
 assert.equal(a.turn,1);
 assert.equal(a.board.filter(v=>v===2).length,1);
});

test("territórios: 48 partidas reais terminam em vitória/derrota sem travar", () => {
 for (const mode of TERRITORY_MODES) for (const difficulty of Object.keys(TERRITORY_LEVELS)) {
  for (let seed=0; seed<8; seed++) {
   let game=createTerritory({mode,difficulty,seed});
   let steps=0;
   while (game.phase==="playing"&&steps++<game.maxMoves+6) {
    const candidate=game.board.findIndex((v,i)=>v===0&&legalTerritory(game,i));
    game=commandTerritory(game,candidate===-1?"pass":candidate);
   }
   assert.notEqual(game.phase,"playing",mode+"/"+difficulty+"/"+seed);
   assert.ok(["won","lost"].includes(game.phase));
   assert.ok(game.moves<=game.maxMoves);
  }
 }
});
