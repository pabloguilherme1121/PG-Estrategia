import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const OUT=join(ROOT,'scenarios','hex-conquest');
const META=join(ROOT,'scenarios','metadata');
const CONFIG={start:39,count:15};
const PRESETS=[
 {theme:'Cerco de Vanguarda',turns:18,supply:2,cost:3,bonus:1.2},
 {theme:'Gargalo Montanhoso',turns:15,supply:3,cost:4,bonus:1.5},
 {theme:'Ataque Assimétrico',turns:22,supply:1,cost:2,bonus:1}
];
const key=(q,r)=>q+','+r;
const adjacent=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r))===1;
export function buildScenario(index){
 if(!Number.isInteger(index)||index<0||index>=CONFIG.count)throw RangeError('Índice fora do lote');
 const id='hex-conquest-'+String(CONFIG.start+index).padStart(3,'0');
 const preset=PRESETS[index%PRESETS.length];
 const radius=index%2===0?1:2;
 const cells=[];
 for(let q=-radius;q<=radius;q++)for(let r=-radius;r<=radius;r++){
  if(Math.abs(q+r)>radius)continue;
  const distance=Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
  cells.push({q,r,owner:'neutral',troops:distance===0?2+(index%3):(q===-1&&r===0?1+Math.floor(index/6):1),defenseBonus:distance===0?preset.bonus:1});
 }
 const player=cells.find(c=>c.q===0&&c.r===radius);
 const enemy=cells.find(c=>c.q===0&&c.r===-radius);
 player.owner='player';player.troops=4+(index%2);player.defenseBonus=1.2;
 enemy.owner='enemy';enemy.troops=3+(index%3);enemy.defenseBonus=1.2;
 return {id,title:preset.theme+' '+(CONFIG.start+index),kind:'scenario',engine:'hex-conquest',
  rules:{maxTurns:preset.turns,supplyPerOwnedHex:preset.supply,baseTroopCost:preset.cost},
  initialPlayerSupplies:preset.cost*3,initialEnemySupplies:preset.cost*3,initialCells:cells,
  objective:{targetHex:key(enemy.q,enemy.r),centralHex:'0,0',
   text:'Dominar o centro e conquistar a base adversária antes do turno '+preset.turns+'.'}};
}
export function validateScenario(s){
 if(!s||s.kind!=='scenario'||s.engine!=='hex-conquest'||!/^hex-conquest-\d{3}$/.test(s.id))
  throw Error('Identidade do cenário inválida');
 const rules=s.rules;
 if(!rules||!Number.isSafeInteger(rules.maxTurns)||rules.maxTurns<4||rules.maxTurns>60||
 !Number.isSafeInteger(rules.supplyPerOwnedHex)||rules.supplyPerOwnedHex<1||
 !Number.isSafeInteger(rules.baseTroopCost)||rules.baseTroopCost<1)throw Error('Regras inválidas');
 const cells=s.initialCells;
 if(!Array.isArray(cells)||![7,19].includes(cells.length))throw Error('Grade axial inválida');
 const nodes=new Map();
 for(const c of cells){
  const label=key(c.q,c.r);
  if(nodes.has(label)||!Number.isInteger(c.q)||!Number.isInteger(c.r)||
  !['player','enemy','neutral'].includes(c.owner)||!Number.isInteger(c.troops)||c.troops<1||
  !Number.isFinite(c.defenseBonus)||c.defenseBonus<1||c.defenseBonus>2)throw Error('Hexágono inválido '+label);
  nodes.set(label,c);
 }
 if(cells.filter(c=>c.owner==='player').length!==1||cells.filter(c=>c.owner==='enemy').length!==1||
 !nodes.has('0,0'))throw Error('Bases e centro inválidos');
 const queue=[cells[0]],seen=new Set([key(cells[0].q,cells[0].r)]);
 for(let k=0;k<queue.length;k++)for(const c of cells){
  const label=key(c.q,c.r);
  if(!seen.has(label)&&adjacent(queue[k],c)){seen.add(label);queue.push(c)}
 }
 if(seen.size!==nodes.size)throw Error('Mapa desconectado');
 if(!s.objective||!nodes.has(s.objective.targetHex)||nodes.get(s.objective.targetHex).owner!=='enemy'||
 s.objective.centralHex!=='0,0')throw Error('Objetivo incompatível com mapa');
 if(!Number.isInteger(s.initialPlayerSupplies)||s.initialPlayerSupplies<0||
 !Number.isInteger(s.initialEnemySupplies)||s.initialEnemySupplies<0)throw Error('Suprimentos inválidos');
 return true;
}
export function buildMetadata(s){
 validateScenario(s);
 return {id:s.id,title:s.title,category:'estrategia',kind:'scenario',engine:'hex-conquest',
  objective:s.objective.text,
  controls:{
   touch:'Toque primeiro numa posição aliada e depois num hexágono adjacente. Use os controles de reforço e encerramento do turno.',
   keyboard:'Navegue pelo tabuleiro com Tab e setas; use Enter ou Espaço para selecionar e confirme a ação nos controles.'},
  strategyPlan:[
   'Capture as posições neutras adjacentes para obter suprimentos por turno.',
   'Observe a defesa do centro '+s.objective.centralHex+' antes de atacar e preserve uma guarnição na origem.',
   'Alcance a base adversária '+s.objective.targetHex+' antes do turno '+s.rules.maxTurns+'.'
  ],version:'1.0.0'};
}
export async function generateBatch({write=true}={}){
 const scenarios=Array.from({length:CONFIG.count},(_,i)=>buildScenario(i));
 const ids=new Set(),signatures=new Set();
 for(const scenario of scenarios){
  validateScenario(scenario);
  if(ids.has(scenario.id))throw Error('ID duplicado: '+scenario.id);
  ids.add(scenario.id);
  const signature=JSON.stringify([scenario.rules,scenario.initialCells]);
  if(signatures.has(signature))throw Error('Mapa/regras duplicados: '+scenario.id);
  signatures.add(signature);
 }
 if(write){
  await mkdir(OUT,{recursive:true});await mkdir(META,{recursive:true});
  for(const scenario of scenarios){
   const payload=JSON.stringify(scenario,null,2)+'\n';
   const meta=JSON.stringify(buildMetadata(scenario),null,2)+'\n';
   await writeFile(join(OUT,scenario.id+'.json'),payload);
   await writeFile(join(META,scenario.id+'.meta.json'),meta);
  }
  await writeFile(join(OUT,'index.json'),JSON.stringify(scenarios.map(s=>({id:s.id,title:s.title,kind:s.kind,engine:s.engine})),null,2)+'\n');
 }
 return scenarios;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.some(x=>!['--check','--write'].includes(x)))throw Error('Argumento desconhecido');
 const write=args.includes('--write');
 const items=await generateBatch({write});
 if(write){
  const snapshots=await Promise.all(items.map(s=>readFile(join(OUT,s.id+'.json'),'utf8')));
  if(!snapshots.every((data,i)=>JSON.stringify(JSON.parse(data))===JSON.stringify(items[i])))throw Error('Registros não idempotentes');
 }
 console.log(items.length+' cenários hexagonais validados'+(write?' e gerados':' (somente verificação)')+
 '; preservados como variações, não jogos independentes.');
}