import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

// Contraste mínimo WCAG AA para texto normal dos botões do PG Bot.
function luminance(hex){
 const rgb=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255);
 const linear=rgb.map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 return linear[0]*0.2126+linear[1]*0.7152+linear[2]*0.0722;
}
function contrast(a,b){
 const [high,low]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
 return (high+0.05)/(low+0.05);
}
for(const slug of ['cofre-codigos','labirinto-sombras','portos-em-turnos','satelites-orbitais','travessia-vale']){
 test('hover do PG Bot mantém contraste de texto AA: '+slug,()=>{
  const css=readFileSync(join('public','estrategia','independentes',slug,'style.css'),'utf8');
  const match=css.match(/button:hover:not\(:disabled\)\s*\{\s*background:\s*(#[0-9a-fA-F]{6})/);
  assert.ok(match,'Hover não encontrado em '+slug);
  assert.ok(contrast(match[1],'#ffffff')>=4.5,slug+' contraste: '+contrast(match[1],'#ffffff').toFixed(2));
 });
}
