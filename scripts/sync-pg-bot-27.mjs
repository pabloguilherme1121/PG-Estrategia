import {readdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=join('public','estrategia','independentes');
const start='<!-- PG_BOT_ASK_BRIDGE_START -->';
const end='<!-- PG_BOT_ASK_BRIDGE_END -->';
const source=readFileSync(join('scripts','pg-bot-inline-bridge.js'),'utf8');
if (/<\/script/i.test(source)) throw Error('O código de origem não pode conter fechamento de script.');
const insert=start+'\n<script>\n'+source.trimEnd()+'\n</script>\n'+end;
const games=readdirSync(root,{withFileTypes:true}).filter(item=>item.isDirectory()&&existsSync(join(root,item.name,'index.html'))).map(item=>item.name).sort();
if (games.length!==27) throw Error('Quantidade inesperada de jogos independentes: '+games.length);
for(const game of games) {
 const path=join(root,game,'index.html');
 const original=readFileSync(path,'utf8');
 if (!/id="pg-bot"/.test(original)) throw Error('Sem bot: '+game);
 const markerStart=original.indexOf(start),markerEnd=original.indexOf(end);
 let next;
 if(markerStart>=0 && markerEnd>markerStart)next=original.slice(0,markerStart)+insert+original.slice(markerEnd+end.length);
 else if (/<\/body>/i.test(original))next=original.replace(/<\/body>/i,insert+'\n</body>');
 else throw Error('Sem body: '+game);
 if(next!==original)writeFileSync(path,next,'utf8');
}
console.log('PG Bot atualizado de forma idempotente nos '+games.length+' jogos independentes.');
