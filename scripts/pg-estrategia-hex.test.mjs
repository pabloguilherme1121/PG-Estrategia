import test from "node:test";
import assert from "node:assert/strict";
import { createHex, playHex, getHexWinner, getHexBotMove, HEX_MODES, getHexNeighbors } from "../public/estrategia/independentes/hex.mjs";

test("Hex Conexão: três modos e estados iniciais próprios sem efeitos globais", () => {
  assert.deepEqual([...HEX_MODES], ["recruta", "tatico", "veterano"]);
  for (const mode of HEX_MODES) {
    const a = createHex({ difficulty: mode, seed: 47 });
    assert.deepEqual(a, createHex({ difficulty: mode, seed: 47 }));
    assert.equal(a.board.length, 49);
    assert.equal(a.board.every(cell => cell === 0), true);
    assert.equal(a.phase, "playing");
    assert.equal(a.mode, mode);
    assert.equal(a.turn, 0);
  }
});
test("Hex Conexão: geometria hexagonal não conecta casas diagonais quadradas inválidas", () => {
  assert.deepEqual(getHexNeighbors(0).sort((a,b)=>a-b), [1,7]);
  assert.deepEqual(getHexNeighbors(8).sort((a,b)=>a-b), [1,2,7,9,14,15]);
  assert.deepEqual(getHexNeighbors(48).sort((a,b)=>a-b), [41,47]);
});
test("Hex Conexão: conexão do jogador é vertical e do rival é horizontal", () => {
  const vertical = Array(49).fill(0);
  for (let i=0;i<7;i++) vertical[i*7+2] = 1;
  assert.equal(getHexWinner(vertical), 1);
  const horizontal = Array(49).fill(0);
  for (let i=0;i<7;i++) horizontal[3*7+i] = 2;
  assert.equal(getHexWinner(horizontal), 2);
  const diagonal = Array(49).fill(0);
  diagonal[0]=1; diagonal[8]=1;
  assert.equal(getHexWinner(diagonal), null);
});
test("Hex Conexão: turnos alternam sem sobrescrever casa, índice inválido ou etapa concluída", () => {
  const s = createHex({ difficulty: "tatico", seed: 77 });
  for (const cell of [-1,49,2.2,"3",null]) assert.deepEqual(playHex(s,cell),s);
  const next = playHex(s,0);
  assert.equal(next.turn,1);
  assert.equal(next.board[0],1);
  assert.equal(next.board.filter(x=>x===2).length,1);
  assert.equal(next.board.filter(x=>x===1).length,1);
  assert.deepEqual(playHex(next,0),next);
  assert.deepEqual(s.board,Array(49).fill(0));
});
test("Hex Conexão: uma conexão final assegura vitória antes do turno do bot", () => {
  const g = createHex({ difficulty: "veterano",seed:19 });
  const board = [...g.board];
  for (let i=0;i<6;i++) board[i*7+0] = 1;
  const near = {...g,board};
  const won = playHex(near,42);
  assert.equal(won.phase,"won");
  assert.equal(won.board[42],1);
  assert.ok(won.score>0);
  assert.deepEqual(playHex(won,43),won);
});
test("Hex Conexão: bot veterano bloqueia vitória vertical iminente", () => {
  const g = createHex({ difficulty: "veterano",seed:3 });
  const b=[...g.board];
  for(let i=0;i<6;i++)b[i*7+1]=1;
  // Row 6, col 0 also touches this axial chain. Occupy it so that
  // col 1 is the unique one-move victory the veteran must prevent.
  b[42]=2;
  assert.equal(getHexBotMove(b,"veterano",3),43);
});
test("Hex Conexão: bot detecta vitória horizontal e encerra partida com derrota", () => {
  const g=createHex({difficulty:"tatico",seed:21});
  const b=[...g.board];
  for(let i=0;i<6;i++)b[4*7+i]=2;
  const near={...g,board:b};
  const lost=playHex(near,0);
  assert.equal(lost.phase,"lost");
  assert.equal(getHexWinner(lost.board),2, "o bot deve formar conexão de ponta a ponta em qualquer rota hexagonal válida");
});
test("Hex Conexão: escolha de IA determinística para cada dificuldade", () => {
  const g=createHex({seed:2026});
  const board=[...g.board];
  board[17]=1;board[31]=2;
  for(const mode of HEX_MODES){
    const a=getHexBotMove(board,mode,149);
    const b=getHexBotMove(board,mode,149);
    assert.equal(a,b);
    assert.equal(board[a],0);
  }
});
