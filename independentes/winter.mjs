/** Refúgio do Inverno: motor original de gestão de sobreviventes.
 * Duas campanhas, clima dinâmico, consumo, aquecimento, madeira e sinais.
 * Funções puras sem DOM, chamadas de rede ou temporizadores.
 */
export const WINTER_DIFFICULTIES=Object.freeze(["recruta","tatico","veterano"]);
export const WINTER_MODES=Object.freeze(["resistencia","evacuacao"]);
const SETTINGS=Object.freeze({
 recruta:{food:10,wood:8,heat:9,morale:8,people:5,days:7,evac:9,extraHeat:0},
 tatico:{food:9,wood:7,heat:8,morale:7,people:5,days:9,evac:10,extraHeat:0},
 veterano:{food:8,wood:6,heat:6,morale:6,people:5,days:10,evac:11,extraHeat:1},
});
const WEATHER=Object.freeze(["nevasca","ameno","frio","ameno"]);
export function weatherWinter(day,seed=1){
 const index=((seed+day)%4+4)%4;
 return WEATHER[index];
}
export function createWinter({difficulty="recruta",mission="resistencia",seed=1}={}){
 if(!WINTER_DIFFICULTIES.includes(difficulty)||!WINTER_MODES.includes(mission)||!Number.isSafeInteger(seed))throw new RangeError("Dificuldade, modo ou semente inválida");
 const c=SETTINGS[difficulty];
 return {mode:difficulty,mission,seed,day:0,maxDays:mission==="evacuacao"?c.evac:c.days,
  food:c.food,wood:c.wood,heat:c.heat,morale:c.morale,people:c.people,beacon:0,
  weather:weatherWinter(1,seed),phase:"playing",paused:false,score:0,
  message:"Organize a coleta, mantenha a fogueira acesa e proteja a comunidade."};
}
export function canWinterAction(s,a){
 if(!s||s.phase!=="playing"||!a||typeof a!=="object")return false;
 if(a.type==="pause")return !s.paused;
 if(a.type==="resume")return s.paused;
 if(s.paused)return false;
 if(a.type==="collect")return s.food<40;
 if(a.type==="chop")return s.wood<30;
 if(a.type==="stoke")return s.wood>=2&&s.heat<30;
 if(a.type==="rest")return s.food>=1&&s.morale<12;
 if(a.type==="signal")return s.wood>=2&&s.food>=1&&s.beacon<3;
 return false;
}
function advance(s,message){
 const day=s.day+1,weather=weatherWinter(day,s.seed);
 const heatDemand=(weather==="nevasca"?3:weather==="frio"?2:1)+SETTINGS[s.mode].extraHeat;
 const cold=s.heat<heatDemand,hungry=s.food<2;
 const next={...s,day,food:Math.max(0,s.food-2),heat:Math.max(0,s.heat-heatDemand),
  morale:Math.max(0,s.morale-(cold?2:0)-(hungry?2:0)),
  people:Math.max(0,s.people-(cold&&hungry?1:0)),
  weather:weatherWinter(day+1,s.seed),message};
 const dead=next.morale<=0||next.people<2;
 if(dead)return {...next,phase:"lost",message:"Derrota: a comunidade não resistiu ao frio e à fome."};
 const rescued=s.mission==="evacuacao"&&next.beacon>=3&&day>=5;
 const survived=s.mission==="resistencia"&&day>=s.maxDays;
 if(rescued||survived)return {...next,phase:"won",score:next.people*200+next.morale*50+
  next.food*5+next.heat*9+next.beacon*100,message:"Vitória! A comunidade sobreviveu."};
 if(day>=s.maxDays)return {...next,phase:"lost",message:"Derrota: o prazo terminou antes do resgate."};
 return next;
}
export function commandWinter(s,a){
 if(!canWinterAction(s,a))return s;
 if(a.type==="pause")return {...s,paused:true,message:"O refúgio está pausado."};
 if(a.type==="resume")return {...s,paused:false,message:"O refúgio foi retomado."};
 if(a.type==="collect")return advance({...s,food:Math.min(40,s.food+5)},"Alimentos encontrados. A comunidade foi abastecida.");
 if(a.type==="chop")return advance({...s,wood:Math.min(30,s.wood+4)},"Lenha recolhida para construir e aquecer.");
 if(a.type==="stoke")return advance({...s,wood:s.wood-2,heat:Math.min(30,s.heat+5)},"Fogueira reforçada para a próxima noite.");
 if(a.type==="rest")return advance({...s,food:s.food-1,morale:Math.min(12,s.morale+3)},"Descanso organizado para elevar a moral.");
 return advance({...s,wood:s.wood-2,food:s.food-1,beacon:s.beacon+1},
  "Sinal de resgate construído: "+(s.beacon+1)+" de 3.");
}
