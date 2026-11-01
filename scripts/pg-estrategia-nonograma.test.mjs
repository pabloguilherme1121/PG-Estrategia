import test from "node:test";
import assert from "node:assert/strict";
import {createNonogram,playNonogram,undoNonogram,pauseNonogram,hintNonogram,NONOGRAM_LEVELS,NONOGRAM_MODES} from "../public/estrategia/independentes/nonograma-tatico/engine.mjs";
test("Nonograma: dois modos, três dificuldades e pistas consistentes",()=>{
 for(const mode of NONOGRAM_MODES)for(const difficulty of Object.keys(NONOGRAM_LEVELS))for(let seed=0;seed<12;seed++){
  const game=createNonogram({mode,difficulty,seed});
  assert.deepEqual(game,createNonogram({mode,difficulty,seed}));
  assert.equal(game.rows.length,game.size);assert.equal(game.columns.length,game.size);
  assert.ok(game.rows.every(r=>r.length&&r.every(Number.isInteger)));
  assert.ok(game.columns.every(r=>r.length&&r.every(Number.isInteger)));
  let state=game,steps=0;
  while(state.phase==="playing"&&steps++<game.size*game.size){
   const hint=hintNonogram(state);assert.ok(hint);
   state=playNonogram(state,hint.index,hint.mark);
  }
  assert.equal(state.phase,"won",mode+"/"+difficulty+"/"+seed);
 }
});
test("Nonograma: comandos inválidos são imutáveis",()=>{
 const game=createNonogram();
 for(const [index,mark] of [[-1,"fill"],[25,"fill"],[0,"hack"],[1.5,"empty"]])assert.equal(playNonogram(game,index,mark),game);
 assert.throws(()=>createNonogram({mode:"falso"}),RangeError);
 assert.throws(()=>createNonogram({difficulty:"falso"}),RangeError);
 assert.throws(()=>createNonogram({seed:-1}),RangeError);
});
test("Nonograma: desfazer restaura movimentos e erros, pausa bloqueia ações",()=>{
 const game=createNonogram({mode:"precisao"});
 const wrong=game.solution[0]?"empty":"fill";
 const next=playNonogram(game,0,wrong);assert.equal(next.errors,1);
 assert.equal(game.errors,0);assert.equal(next.moves,1);
 const paused=pauseNonogram(next);assert.equal(playNonogram(paused,1,"fill"),paused);assert.equal(undoNonogram(paused),paused);assert.equal(hintNonogram(paused),null);
 const undo=undoNonogram(pauseNonogram(paused));assert.equal(undo.errors,0);assert.equal(undo.moves,0);assert.equal(undo.marks[0],null);
});
test("Nonograma: quatro erros encerram o modo precisão e novo jogo reinicia",()=>{
 let state=createNonogram({mode:"precisao"});
 for(let i=0;i<4;i++)state=playNonogram(state,i,state.solution[i]?"empty":"fill");
 assert.equal(state.phase,"lost");assert.equal(playNonogram(state,5,"fill"),state);
 assert.equal(createNonogram({mode:"precisao"}).phase,"playing");
});

test("Nonograma: pistas definem solução única em todas as dificuldades e orientações",()=>{
 const clues=bits=>{const seq=[];let current=0;for(const value of bits){if(value)current++;else if(current){seq.push(current);current=0;}}if(current)seq.push(current);return JSON.stringify(seq.length?seq:[0]);};
 for(const difficulty of Object.keys(NONOGRAM_LEVELS))for(let seed=0;seed<8;seed++){
  const game=createNonogram({difficulty,seed}),n=game.size;
  const all=Array.from({length:2**n},(_,mask)=>Array.from({length:n},(_,i)=>Boolean(mask&(1<<i))));
  const allowedRows=game.rows.map(row=>all.filter(bits=>clues(bits)===JSON.stringify(row)));
  const allowedColumns=game.columns.map(column=>all.filter(bits=>clues(bits)===JSON.stringify(column)));
  let solutions=0;
  function walk(rows){
   if(solutions>1)return;
   if(rows.length===n){solutions++;return;}
   for(const row of allowedRows[rows.length]){
    if(allowedColumns.every((options,c)=>options.some(option=>rows.every((existing,r)=>existing[c]===option[r])&&row[c]===option[rows.length])))walk([...rows,row]);
   }
  }
  walk([]);
  assert.equal(solutions,1,difficulty+"/"+seed+" não deve admitir solução alternativa");
 }
});
