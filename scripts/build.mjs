import {cpSync,mkdirSync,readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,dirname,relative,sep} from 'node:path';

const SOURCE='public/estrategia', OUTPUT='dist';
const ARCADE='https://pabloguilherme1121.github.io/PG-Arcade/';
const BOT='https://pabloguilherme1121.github.io/PG-Bot/';
rmSync(OUTPUT,{recursive:true,force:true});
cpSync(SOURCE,OUTPUT,{recursive:true});
mkdirSync(join(OUTPUT,'brand','pg-bot'),{recursive:true});
cpSync('public/brand/pg-bot/mascot.webp',join(OUTPUT,'brand','pg-bot','mascot.webp'));
let changed=0;
function visit(folder){
 for(const entry of readdirSync(folder,{withFileTypes:true})){
  const full=join(folder,entry.name);
  if(entry.isDirectory()){visit(full);continue}
  const rel=relative(OUTPUT,full).split(sep).join('/');
  if(!/\.(html|mjs|js|webmanifest|css)$/.test(rel))continue;
  const source=readFileSync(full,'utf8');
  let output=source.replaceAll('https://pabloguilherme1121.github.io/PG-Arcade/estrategia/','https://pabloguilherme1121.github.io/PG-Estrategia/');
  if(rel==='strategy-hub.mjs'){
    output=output.replaceAll("'../#/jogar/'",JSON.stringify(ARCADE+'#/jogar/'));
  }
  if(rel.endsWith('.html')){
    const depth=rel.split('/').length-1;
    const brand=(depth>0?'../'.repeat(depth):'./')+'brand/';
    output=output.replace(/(?:\.\.\/)+brand\//g,brand);
    if(depth===0)output=output.replaceAll('href="../"',`href="${ARCADE}"`);
    if(rel==='independentes/index.html')output=output.replaceAll('href="../../"',`href="${ARCADE}"`);
    if(depth>=2)output=output.replaceAll('href="../../../"',`href="${ARCADE}"`);
    if(rel==='index.html'){
      const botNav=`<a href="${BOT}">PG Bot</a>`;
      output=output.replace('<a class="portfolio-link"',botNav+'<a class="portfolio-link"');
      output=output.replace('<div><a href="../">PG Arcade</a>',`<div><a href="${ARCADE}">PG Arcade</a><a href="${BOT}">PG Bot</a>`);
    }
    if(rel==='independentes/index.html'){
      output=output.replace('<a href="https://pabloguilherme1121.github.io/PG-portfolio/">',`<a href="${BOT}">PG Bot</a><a href="https://pabloguilherme1121.github.io/PG-portfolio/">`);
    }
  }
  if(output!==source){writeFileSync(full,output,'utf8');changed++}
 }
}
visit(OUTPUT);
console.log('PG Estratégia pronto para Pages: '+changed+' arquivos ajustados e jogos preservados.');
