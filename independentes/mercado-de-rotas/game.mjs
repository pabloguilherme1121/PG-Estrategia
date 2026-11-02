// Mercado de Rotas: economia logística determinística, sem dependências ou rede.
export const TRADE_CITIES = [
  { name:"Porto Norte", roads:[1,3], prices:{graos:6,metal:9,tecnologia:11} },
  { name:"Vale Verde", roads:[0,2,3], prices:{graos:2,metal:7,tecnologia:13} },
  { name:"Minas Secas", roads:[1,3], prices:{graos:8,metal:3,tecnologia:12} },
  { name:"Metrópole", roads:[0,1,2], prices:{graos:9,metal:10,tecnologia:6} },
];
export const TRADE_GOODS = ["graos","metal","tecnologia"];
const DIFFICULTY = {
  recruta:{credits:35,turns:14,fuel:5,target:58},
  tatico:{credits:30,turns:12,fuel:4,target:65},
  veterano:{credits:26,turns:11,fuel:4,target:70}
};
export function createTrade({difficulty="recruta",mission="contratos",seed=7}={}) {
  if(!Object.hasOwn(DIFFICULTY,difficulty)||!["contratos","lucro"].includes(mission)) throw new RangeError("Modo ou dificuldade inválidos");
  const config=DIFFICULTY[difficulty];
  const safeSeed=Number.isSafeInteger(seed)?(seed>>>0):7;
  return {
    mode:difficulty,mission,seed:safeSeed,phase:"playing",position:1,turn:0,
    maxTurns:config.turns,credits:config.credits,target:config.target,
    fuel:config.fuel,capacity:3,cargo:{graos:0,metal:0,tecnologia:0},
    delivered:{graos:0,metal:0},rival:{position:2,pressure:0},
    score:0,notice:"Compre mercadorias no Vale Verde e planeje as rotas de entrega."
  };
}
export function tradePrice(state,city,good) {
  if(!Number.isInteger(city)||city<0||city>=TRADE_CITIES.length||!TRADE_GOODS.includes(good))return 0;
  const baseline=TRADE_CITIES[city].prices[good];
  const delta=(state.seed+state.turn*7+city*3+TRADE_GOODS.indexOf(good)*5)%3-1;
  const rivalry=city===state.rival.position&&good===TRADE_GOODS[state.rival.pressure] ? 2 : 0;
  return Math.max(1,baseline+delta+rivalry);
}
export function tradeCargoSize(state) {
  return TRADE_GOODS.reduce((sum,good)=>sum+state.cargo[good],0);
}
export function commandTrade(state,command) {
  if(!state||!command||typeof command!=="object")return state;
  const {type}=command;
  if(type==="pause"&&state.phase==="playing")return {...state,phase:"paused",notice:"Partida pausada."};
  if(type==="resume"&&state.phase==="paused")return {...state,phase:"playing",notice:"Partida retomada."};
  if(state.phase!=="playing")return state;
  let next;
  if(type==="buy"||type==="sell") {
    const {good,units}=command;
    if(!TRADE_GOODS.includes(good)||!Number.isInteger(units)||units<1||units>2)return state;
    const price=tradePrice(state,state.position,good);
    if(type==="buy") {
      if(tradeCargoSize(state)+units>state.capacity||state.credits<price*units)return state;
      next={...state,cargo:{...state.cargo,[good]:state.cargo[good]+units},credits:state.credits-price*units,
        notice:"Compra realizada: "+units+" unidade(s) de "+good+"."};
    }else{
      if(state.cargo[good]<units)return state;
      const delivered={...state.delivered};
      if(state.position===3&&good==="graos")delivered.graos+=units;
      if(state.position===0&&good==="metal")delivered.metal+=units;
      next={...state,cargo:{...state.cargo,[good]:state.cargo[good]-units},credits:state.credits+price*units,
        delivered,notice:"Venda concluída em "+TRADE_CITIES[state.position].name+"."};
    }
  }else if(type==="travel") {
    const destination=command.to;
    if(!Number.isInteger(destination)||!TRADE_CITIES[state.position].roads.includes(destination)||state.fuel<1||state.credits<2)return state;
    next={...state,position:destination,credits:state.credits-2,fuel:state.fuel-1,
      notice:"Chegada a "+TRADE_CITIES[destination].name+". Pedágio: 2 créditos."};
  }else if(type==="refuel") {
    if(state.credits<5||state.fuel>=7)return state;
    next={...state,credits:state.credits-5,fuel:Math.min(7,state.fuel+3),notice:"Combustível reabastecido."};
  }else if(type==="upgrade") {
    if(state.credits<10||state.capacity>=7)return state;
    next={...state,credits:state.credits-10,capacity:state.capacity+2,notice:"Capacidade de carga ampliada."};
  }else if(type==="rest") {
    next={...state,notice:"Você observou os preços e aguardou o próximo dia."};
  }else return state;

  const turn=state.turn+1;
  // Rival local muda de cidade e pressiona um produto por turno. Sem aleatoriedade global.
  const rival={position:(state.rival.position+1+(state.seed%2))%4,
    pressure:(state.rival.pressure+1)%TRADE_GOODS.length};
  next={...next,turn,rival};
  const fulfilled=next.delivered.graos>=2&&next.delivered.metal>=1;
  const won=state.mission==="contratos"?fulfilled:next.credits>=next.target;
  if(won) return {...next,phase:"won",score:next.credits*10+(next.maxTurns-turn)*15+
    next.delivered.graos*25+next.delivered.metal*35,
    notice:"Vitória! Seu plano comercial cumpriu o objetivo."};
  if(turn>=state.maxTurns) return {...next,phase:"lost",notice:"Fim do prazo. O objetivo não foi cumprido."};
  return next;
}
