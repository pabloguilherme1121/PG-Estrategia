import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist'),base='/PG-Estrategia/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.ico':'image/x-icon'};
const port=Number(process.env.PORT||5481);
createServer((req,res)=>{
 let p;
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!path.startsWith(base))throw Error('fora do site');
  const sub=decodeURIComponent(path.slice(base.length));
  p=resolve(root,sub);
  if(p!==root&&!p.startsWith(root+sep))throw Error('caminho invalido');
  if(existsSync(p)&&statSync(p).isDirectory())p=resolve(p,'index.html');
  if(!existsSync(p)||!statSync(p).isFile())throw Error('arquivo ausente');
  res.writeHead(200,{'Content-Type':types[extname(p)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(readFileSync(p));
 }catch{res.writeHead(404);res.end('Nao encontrado')}
}).listen(port,'127.0.0.1',()=>console.log('PG Estrategia: http://127.0.0.1:'+port+base));
