import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createSudoku, countSolutions, isValidSudoku, playSudoku, hintSudoku,
 undoSudoku, toggleSudokuPause, getSudokuCandidates
} from '../public/estrategia/independentes/sudoku-fortaleza/engine.mjs';

const modes=['classico','diagonal'];
const difficulties=[['recruta',4],['tatico',6],['veterano',9]];
test('Sudoku Fortaleza gera três tabuleiros e dois modos determinísticos, com solução única',()=>{
 for(const mode of modes)for(const [difficulty,size] of difficulties){
  const a=createSudoku({mode,difficulty,seed:7});
  const b=createSudoku({mode,difficulty,seed:7});
  assert.equal(a.size,size);
  assert.equal(a.values.length,size*size);
  assert.equal(a.givens.length,size*size);
  assert.deepEqual(a.values,b.values);
  assert.deepEqual(a.solution,b.solution);
  assert.ok(a.values.some(value=>value===0));
  assert.equal(countSolutions(a.values,size,mode,2),1,mode+' '+difficulty);
  assert.ok(isValidSudoku(a.solution,size,mode,true));
  assert.ok(a.givens.every((given,i)=>!given||a.values[i]===a.solution[i]));
 }
});
test('Sudoku Fortaleza valida linha, coluna, bloco e diagonal quando necessário',()=>{
 const s=createSudoku({difficulty:'recruta',mode:'diagonal',seed:1});
 const invalid=s.solution.slice();invalid[0]=invalid[1];
 assert.equal(isValidSudoku(invalid,4,'diagonal'),false);
 const diag=s.solution.slice();diag[0]=diag[5];
 assert.equal(isValidSudoku(diag,4,'diagonal'),false);
 const empty=s.values.findIndex(value=>value===0);
 const values=getSudokuCandidates(s.values,s.size,s.mode,empty);
 assert.ok(values.includes(s.solution[empty]));
 assert.ok(values.every(x=>x>=1&&x<=s.size));
});
test('Ação ilegal, índice fora do tabuleiro, valores fora do intervalo e pistas fixas não alteram estado',()=>{
 const s=createSudoku();
 const fixed=s.givens.findIndex(Boolean);
 assert.strictEqual(playSudoku(s,fixed,s.solution[fixed]),s);
 assert.strictEqual(playSudoku(s,-1,1),s);
 assert.strictEqual(playSudoku(s,999,1),s);
 const empty=s.values.findIndex(value=>value===0);
 assert.strictEqual(playSudoku(s,empty,99),s);
 assert.strictEqual(playSudoku(s,empty,-2),s);
});
test('Entrada errada soma erro; desfazer restaura a grade sem mutação',()=>{
 const s=createSudoku({mode:'classico',difficulty:'recruta',seed:3});
 const i=s.values.findIndex(x=>x===0);
 const wrong=s.solution[i]%s.size+1;
 const after=playSudoku(s,i,wrong);
 assert.equal(after.errors,1);
 assert.equal(after.values[i],wrong);
 assert.equal(s.values[i],0);
 const restored=undoSudoku(after);
 assert.deepEqual(restored.values,s.values);
 assert.equal(restored.errors,0);
});
test('Após limite de erros, o jogo termina em derrota e bloqueia comandos',()=>{
 let s=createSudoku({difficulty:'recruta',mode:'classico'});
 const i=s.values.findIndex(x=>x===0);
 for(let n=0;n<s.maxErrors;n++)s=playSudoku(s,i,s.solution[i]%s.size+1);
 assert.equal(s.phase,'lost');
 assert.strictEqual(playSudoku(s,i,s.solution[i]),s);
 assert.strictEqual(hintSudoku(s),s);
});
test('Pausa bloqueia números, dicas e desfazer',()=>{
 const s=createSudoku({mode:'diagonal',difficulty:'tatico'});
 const paused=toggleSudokuPause(s);
 const i=s.values.findIndex(x=>x===0);
 assert.equal(paused.paused,true);
 assert.strictEqual(playSudoku(paused,i,s.solution[i]),paused);
 assert.strictEqual(hintSudoku(paused),paused);
 assert.strictEqual(undoSudoku(paused),paused);
 assert.equal(toggleSudokuPause(paused).paused,false);
});
test('Dicas reais conduzem à vitória com penalidade e pontuação positiva',()=>{
 let s=createSudoku({mode:'diagonal',difficulty:'veterano',seed:11});
 const max=s.values.filter(x=>x===0).length;
 for(let n=0;n<max;n++){
  if(s.phase!=='playing')break;
  const next=hintSudoku(s);
  assert.notStrictEqual(next,s);
  s=next;
 }
 assert.equal(s.phase,'won');
 assert.deepEqual(s.values,s.solution);
 assert.equal(s.hints,max);
 assert.ok(s.score>0);
 assert.strictEqual(playSudoku(s,0,1),s);
});
