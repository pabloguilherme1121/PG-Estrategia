export const LIVE_CHANNEL='pg_telemetry_hub_v1';
export function makeDomainTick(state,now=Date.now()){
 if(!state||state.id!=='dominio-territorial'||!Number.isSafeInteger(state.turn)||state.turn<1||!['playing','paused','victory','defeat'].includes(state.phase)||!Number.isSafeInteger(state.playerSupplies)||state.playerSupplies<0)return null;
 return {type:'PG_STATE_TICK',version:1,project:'estrategia',gameId:'dominio-territorial',timestamp:now,turn:state.turn,score:null,phase:state.phase,resources:state.playerSupplies};
}
/** Sem rede, sem armazenamento e somente enquanto o jogador autorizar. */
export function startDomainLiveTelemetry(readState){
 if(typeof BroadcastChannel!=='function')return null;
 const channel=new BroadcastChannel(LIVE_CHANNEL);
 const send=()=>{const tick=makeDomainTick(readState());if(tick)channel.postMessage(tick)};
 send();
 const heartbeat=setInterval(send,5000);
 const onVisibility=()=>{if(!document.hidden)send()};
 document.addEventListener('visibilitychange',onVisibility);
 return {send,stop:()=>{clearInterval(heartbeat);document.removeEventListener('visibilitychange',onVisibility);channel.close()}};
}
