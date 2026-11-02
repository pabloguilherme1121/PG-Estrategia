// Oficina de Autômatos: pipeline de quatro etapas e planejamento de recursos por dia.
// Pure transition rules; deterministic local play, no API, no timers, no PII.
const LEVELS=Object.freeze({
  recruta:{days:24,energy:17,credits:18,heat:14},
  tatico:{days:22,energy:15,credits:15,heat:12},
  veterano:{days:20,energy:14,credits:12,heat:11}
});
const MODES=Object.freeze(['montagem','contrato']);
const COST=Object.freeze({mine:1,smelt:2,forge:2,assemble:2,sell:1,cool:1,upgrade:1,rest:0});
export function createWorkshop({difficulty='recruta',mode='montagem',seed=0}={}){
 if(!Object.hasOwn(LEVELS,difficulty)||!MODES.includes(mode)) throw new RangeError('Modo ou dificuldade inválidos');
 const d=LEVELS[difficulty];
 return {status:'playing',difficulty,mode,seed:Number.isSafeInteger(seed)&&seed>=0?seed:0,
  day:0,maxDays:d.days,energy:d.energy,maxEnergy:d.energy,credits:d.credits,
  heat:0,maxHeat:d.heat,ore:0,plates:0,gears:0,robots:0,upgraded:false,score:0,
  notice:'Minere, funda placas, forje engrenagens e monte autômatos antes do prazo.'};
}
export function canWorkshopAction(state,action){
 if(!state||state.status!=='playing'||!action||typeof action!=='object'||typeof action.type!=='string'||!Object.hasOwn(COST,action.type))return false;
 if(Object.keys(action).some(k=>k!=='type'))return false;
 const type=action.type;
 if(type==='rest')return true;
 if(state.energy<COST[type])return false;
 if(type==='mine')return state.heat+1<=state.maxHeat;
 if(type==='smelt')return state.ore>=2&&state.heat+2<=state.maxHeat;
 if(type==='forge')return state.plates>=2&&state.heat+2<=state.maxHeat;
 if(type==='assemble')return state.plates>=1&&state.gears>=1&&state.heat+1<=state.maxHeat;
 if(type==='sell')return state.ore>=2;
 if(type==='cool')return state.heat>0;
 if(type==='upgrade')return !state.upgraded&&state.credits>=8;
 return false;
}
export function commandWorkshop(state,action){
 if(!state||!action||typeof action!=='object')return state;
 if(action.type==='pause'&&state.status==='playing')return {...state,status:'paused',notice:'Produção pausada.'};
 if(action.type==='resume'&&state.status==='paused')return {...state,status:'playing',notice:'Produção retomada.'};
 if(!canWorkshopAction(state,action))return state;
 const type=action.type;
 let n={...state,energy:state.energy-COST[type],day:state.day+1};
 if(type==='mine')n={...n,ore:n.ore+(state.upgraded?4:3),heat:n.heat+1,notice:'Mineração concluída: minério disponível.'};
 if(type==='smelt')n={...n,ore:n.ore-2,plates:n.plates+1,heat:n.heat+2,notice:'Duas unidades de minério viraram uma placa.'};
 if(type==='forge')n={...n,plates:n.plates-2,gears:n.gears+1,heat:n.heat+2,notice:'Duas placas viraram uma engrenagem.'};
 if(type==='assemble')n={...n,plates:n.plates-1,gears:n.gears-1,robots:n.robots+1,heat:n.heat+1,notice:'Autômato finalizado. Planeje a próxima fabricação.'};
 if(type==='sell')n={...n,ore:n.ore-2,credits:n.credits+6,notice:'Matéria-prima vendida por seis créditos.'};
 if(type==='cool')n={...n,heat:Math.max(0,n.heat-7),notice:'Refrigeração aplicada à linha de montagem.'};
 if(type==='upgrade')n={...n,credits:n.credits-8,upgraded:true,notice:'Extrator aprimorado: quatro minérios por coleta.'};
 if(type==='rest')n={...n,energy:Math.min(n.maxEnergy,n.energy+7),heat:Math.max(0,n.heat-3),notice:'Equipe descansou; energia recuperada e máquinas resfriadas.'};
 // Every fifth shift, the local deterministic environment adds heat pressure.
 if(n.day%5===0 && (n.seed%2===1))n={...n,heat:Math.min(n.maxHeat,n.heat+1)};
 const achieved=n.mode==='montagem'?n.robots>=2:n.robots>=1&&n.credits>=20;
 if(achieved)return {...n,status:'won',score:n.robots*150+n.credits*3+(n.maxDays-n.day)*5,notice:'Vitória: meta industrial alcançada com recursos planejados.'};
 if(n.day>=n.maxDays)return {...n,status:'lost',notice:'Prazo encerrado. Ajuste a sequência de produção para concluir a meta.'};
 return n;
}