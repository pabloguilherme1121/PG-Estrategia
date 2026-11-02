/** Adaptador genérico e opt-in para jogos da mesma origem GitHub Pages.
 * Este módulo é copiado pelo build para cada arena que participa, permitindo cache PWA isolado.
 */
export const TELEMETRY_CHANNEL='pg_telemetry_hub_v1';
const integerOrNull=value=>value===null||(Number.isSafeInteger(value)&&value>=0&&value<=1_000_000_000);
export function makeTick({project='estrategia',gameId,snapshot,now=Date.now()}={}){
 if(!['arcade','estrategia'].includes(project)||typeof gameId!=='string'||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(gameId))return null;
 if(!snapshot||typeof snapshot!=='object'||!Number.isSafeInteger(now))return null;
 if(!['playing','paused','victory','defeat'].includes(snapshot.phase))return null;
 const turn=snapshot.turn??null,score=snapshot.score??null,resources=snapshot.resources??null,moves=snapshot.moves??null;
 if(![turn,score,resources,moves].every(integerOrNull))return null;
 return {type:'PG_STATE_TICK',version:1,project,gameId,timestamp:now,phase:snapshot.phase,turn,score,resources,moves};
}
export function createTelemetryAdapter({project='estrategia',gameId,getSnapshot,channelFactory=()=>new BroadcastChannel(TELEMETRY_CHANNEL),now=Date.now,heartbeat=true}={}){
 let channel=null,interval=null;
 const send=()=>{
  if(!channel)return false;
  const tick=makeTick({project,gameId,snapshot:getSnapshot?.(),now:now()});
  if(!tick)return false;
  try{channel.postMessage(tick);return true}catch{return false}
 };
 const disable=()=>{if(interval!==null){clearInterval(interval);interval=null}channel?.close();channel=null};
 const enable=()=>{
  if(channel)return true;
  if(typeof getSnapshot!=='function')return false;
  try{channel=channelFactory()}catch{return false}
  if(!channel||typeof channel.postMessage!=='function'){channel=null;return false}
  if(heartbeat)interval=setInterval(send,5000);
  send();return true;
 };
 return {enable,disable,send,get enabled(){return channel!==null}};
}
