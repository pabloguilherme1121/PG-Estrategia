import { FAMILIES, MISSIONS, getMission, getFamily } from './catalog.mjs';
import { initStrategyHub } from './strategy-hub.mjs';
import { initMission, play, undo, legalMoves, progressValue } from './core.mjs';
const $ = id => document.getElementById(id);
const STORAGE='pg-estrategia-progress-v1';
const accent={violet:'#b7a5ff',cyan:'#87e5f1',amber:'#ffcc7e',coral:'#ff9b83',green:'#aef3a7',blue:'#8dbdff'};
const icons={territorio:'◆',rotas:'⌁',economia:'▤',defesa:'♜',logistica:'✦',cidade:'◈'};
const storage = {completed:[],favorites:[],last:null};
// Parse untrusted local state without discarding valid in-memory progress on errors.
function restoreProgress(raw) {
  let value;
  try { value = JSON.parse(raw ?? '{}'); } catch { return false; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  for (const field of ['completed','favorites']) {
    storage[field] = Array.isArray(value[field])
      ? [...new Set(value[field].filter(id => typeof id === 'string' && getMission(id)))].slice(0, 150)
      : [];
  }
  storage.last = getMission(value.last)?.id || null;
  return true;
}
try { restoreProgress(localStorage.getItem(STORAGE)); } catch { /* storage unavailable */ }
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(storage));}catch{notify('Progresso não salvo: armazenamento indisponível.');}}
let active=null;let filter='all';let term='';let sort='index';let pageSize=18;let toastId;
function notify(message){const node=$('toast');node.textContent=message;node.classList.add('visible');clearTimeout(toastId);toastId=setTimeout(()=>node.classList.remove('visible'),3100);}
function labelMission(m){return `${m.id.toUpperCase()} · ${getFamily(m.family).tag}`;}
function renderStats(){$('win-count').textContent=String(storage.completed.length).padStart(2,'0');$('star-count').textContent=String(storage.favorites.length).padStart(2,'0');}
function renderTabs(){const group=$('family-tabs');if(!group.childElementCount){const tabs=[{id:'all',title:'Todas (150)'},...FAMILIES.map(f=>({id:f.id,title:f.title})),{id:'favorites',title:'☆ Favoritas'}];group.replaceChildren(...tabs.map(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.title;b.dataset.filter=t.id;return b;}));}for(const b of group.querySelectorAll('button[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===filter));}
function matches(m){return (filter==='all'||m.family===filter||(filter==='favorites'&&storage.favorites.includes(m.id)))&&(`${m.id} ${m.name} ${getFamily(m.family).tag} ${m.difficulty}`).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());}
function filtered(){let missions=MISSIONS.filter(matches);if(sort==='level')missions=[...missions].sort((a,b)=>b.level-a.level||a.id.localeCompare(b.id));if(sort==='won')missions=[...missions].sort((a,b)=>Number(storage.completed.includes(a.id))-Number(storage.completed.includes(b.id))||a.id.localeCompare(b.id));return missions;}
function card(m){const f=getFamily(m.family),won=storage.completed.includes(m.id),fav=storage.favorites.includes(m.id);const article=document.createElement('article');article.className='mission-card';const art=document.createElement('div');art.className='mission-art';art.dataset.family=m.family;art.style.setProperty('--a',accent[f.tone]);const small=document.createElement('small');small.textContent=m.id.toUpperCase();const span=document.createElement('span');span.textContent=f.icon;art.append(small,span);if(won){const completed=document.createElement('b');completed.className='done';completed.textContent='✓ CONCLUÍDA';art.append(completed);}const body=document.createElement('div');body.className='mission-card-inner';const meta=document.createElement('div');meta.className='meta';const tag=document.createElement('span');tag.textContent=f.tag;const diff=document.createElement('i');diff.textContent=m.difficulty;meta.append(tag,diff);const title=document.createElement('h3');title.textContent=m.name;const p=document.createElement('p');p.textContent=f.summary;const foot=document.createElement('div');foot.className='mission-footer';const open=document.createElement('button');open.type='button';open.className='button primary';open.dataset.open=m.id;open.textContent=won?'Jogar novamente →':'Iniciar desafio →';const star=document.createElement('button');star.type='button';star.className='star';star.dataset.star=m.id;star.setAttribute('aria-label',`${fav?'Remover dos':'Adicionar aos'} favoritos: ${m.name}`);star.setAttribute('aria-pressed',String(fav));star.textContent=fav?'★':'☆';foot.append(open,star);body.append(meta,title,p,foot);article.append(art,body);return article;}
function renderCatalog(){renderTabs();const shown=filtered();$('mission-list').replaceChildren(...shown.slice(0,pageSize).map(card));$('result-count').textContent=`${shown.length} missões`; $('empty').hidden=shown.length!==0;$('more').hidden=shown.length<=pageSize;renderStats();}
function toggleFavorite(id,restoreKeyboardFocus=false){if(!getMission(id))return;const index=storage.favorites.indexOf(id);if(index>=0)storage.favorites.splice(index,1);else storage.favorites.push(id);persist();renderCatalog();if(restoreKeyboardFocus){const next=$('mission-list').querySelector(`[data-star="${id}"]`)??$('search');next.focus({preventScroll:true});}if(active?.id===id)renderGame();}
function openMission(id){if(!getMission(id))return;active=initMission(id);storage.last=id;persist();const dlg=$('arena');if(!dlg.open)dlg.showModal();renderGame();if(location.hash!==`#${id}`)history.replaceState(null,'',`#${id}`);$('exit').focus();}
function closeMission(){if($('arena').open)$('arena').close();active=null;if(location.hash.startsWith('#est-'))history.replaceState(null,'','#catalogo');}
function apply(action){if(!active)return;const was=active.status;active=play(active,action);if(was==='playing'&&active.status==='won'){if(!storage.completed.includes(active.id))storage.completed.push(active.id);persist();renderStats();notify('Missão concluída! Seu progresso foi registrado.');}renderGame();}
function stat(name,value){const item=document.createElement('span');item.textContent=`${name}: ${value}`;return item;}
function actionButton(label,type,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.action=type;b.disabled=disabled;return b;}
function renderGame(){if(!active)return;const m=getMission(active.id),f=getFamily(active.family),s=active;const moves=legalMoves(s);$('arena-id').textContent=s.id.toUpperCase();$('arena-title').textContent=m.name;$('arena-category').textContent=f.tag.toUpperCase();$('arena-guide').textContent=f.guide;$('arena-turn').textContent=`${s.turn} / ${s.limit}`;const [value,total]=progressValue(s);$('arena-progress-text').textContent=`${value} / ${total}`;$('arena-progress-bar').style.width=`${Math.min(100,Math.max(0,100*value/total))}%`;const labels={territorio:'Áreas conquistadas',rotas:'Passos da rota',economia:'Influência',defesa:'Ondas superadas',logistica:'Cargas coletadas',cidade:'Indicador mais baixo'};$('arena-metric').textContent=labels[s.family];const stats=$('arena-stats'),field=$('battlefield'),actions=$('arena-actions');stats.replaceChildren();field.replaceChildren();actions.replaceChildren();const defenseVisual=$('defense-visual');defenseVisual.hidden=s.family!=='defesa';defenseVisual.replaceChildren();field.hidden=!['territorio','rotas','logistica'].includes(s.family);
 if(s.family==='territorio'){stats.append(stat('Seu território',s.cells.filter(x=>x===1).length),stat('Rival',s.cells.filter(x=>x===2).length),stat('Meta',s.target));}
 else if(s.family==='rotas'){stats.append(stat('Passos',s.path.length-1),stat('Limite',s.limit),stat('Destino','✦'));}
 else if(s.family==='economia'){stats.append(stat('Créditos',s.credits),stat('Alimento',s.food),stat('Minério',s.ore),stat('Influência',s.influence));const options=[['Cultivar · 2 créditos → +4 alimento','cultivar'],['Minerar · 2 alimento → +4 minério','minerar'],['Comerciar · 2 minério → +5 créditos, +1 influência','comerciar'],['Investir · 4 créditos + 1 minério → +3 influência','investir']];for(const [label,type] of options)actions.append(actionButton(label,type,s.status!=='playing'||!moves.includes(type)));}
 else if(s.family==='defesa'){stats.append(stat('Vida da base',s.hp),stat('Créditos',s.credits),stat('Onda atual',`${s.turn+1} / ${s.waves.length}`));const wave=s.waves[s.turn];if(wave)stats.append(stat('Ameaça prevista',`Pista ${wave.lane+1} · Força ${wave.power}`));for(let i=0;i<3;i++){
 const laneGraphic=document.createElement('div');laneGraphic.className='defense-lane';laneGraphic.dataset.threat=String(Boolean(wave&&wave.lane===i));
 const laneTitle=document.createElement('div');laneTitle.className='defense-lane-heading';laneTitle.textContent=`PISTA ${i+1}`;
 const laneBadge=document.createElement('span');laneBadge.textContent=wave?.lane===i?`AMEAÇA ${wave.power}`:'DEFESA';laneTitle.append(laneBadge);
 const laneTowers=document.createElement('div');laneTowers.className='defense-tower-row';laneTowers.setAttribute('aria-label',`Pista ${i+1}, torre nível ${s.towers[i]} de 4`);
 for(let level=0;level<4;level++){const segment=document.createElement('span');segment.dataset.built=String(level<s.towers[i]);laneTowers.append(segment);}
 const laneCaption=document.createElement('small');laneCaption.textContent=s.towers[i]?`Torre nível ${s.towers[i]}`:'Sem torre';
 laneGraphic.append(laneTitle,laneTowers,laneCaption);defenseVisual.append(laneGraphic);
 }for(let i=0;i<3;i++){const price=s.towers[i]?4:3;const b=actionButton(`Pista ${i+1} · Torre nível ${s.towers[i]} · ${price} créditos`,`lane-${i}`,s.status!=='playing'||s.credits<price||s.towers[i]>=4);actions.append(b);}actions.append(actionButton('Avançar onda →','wave',s.status!=='playing'));}
 else if(s.family==='logistica'){stats.append(stat('Combustível',s.fuel),stat('Cargas',`${s.carried.length} / ${s.crates.length}`),stat('Objetivo','Entregar em ✦'));}
 else if(s.family==='cidade'){stats.append(stat('Energia',s.energy),stat('Água',s.water),stat('Confiança',s.trust),stat('Meta em cada',s.target));for(const [label,type] of [['Energia solar · +3 energia, −1 água','solar'],['Reservatórios · +3 água, −1 confiança','reservatorio'],['Comunidade · +3 confiança, −1 energia','comunidade'],['Planejamento integrado · +1 em tudo','equilibrio']])actions.append(actionButton(label,type,s.status!=='playing'));}
 if(!field.hidden){for(let i=0;i<25;i++){let kind='empty',symbol='',description='Casa livre';if(s.family==='territorio'){kind=s.cells[i]===1?'own':s.cells[i]===2?'enemy':s.cells[i]===-1?'rock':moves.includes(i)?'possible':'empty';symbol=s.cells[i]===1?'◆':s.cells[i]===2?'✕':s.cells[i]===-1?'■':moves.includes(i)?'·':'';description=s.cells[i]===1?'Seu território':s.cells[i]===2?'Território rival':s.cells[i]===-1?'Terreno bloqueado':'Casa livre';}
 if(s.family==='rotas'){kind=s.path.includes(i)?'path':s.blocked[i]?'rock':i===s.goal?'goal':moves.includes(i)?'possible':'empty';symbol=s.path.includes(i)?(i===s.path.at(-1)?'●':'·'):s.blocked[i]?'✕':i===s.goal?'✦':moves.includes(i)?'+':'';description=s.blocked[i]?'Bloqueio':i===s.goal?'Destino':'Ponto da rota';}
 if(s.family==='logistica'){kind=i===s.position?'vehicle':s.rocks[i]?'rock':s.crates.includes(i)&&!s.carried.includes(i)?'crate':s.pumps.includes(i)?'pump':i===24?'goal':moves.includes(i)?'possible':'empty';symbol=i===s.position?'◉':s.rocks[i]?'✕':s.crates.includes(i)&&!s.carried.includes(i)?'▣':s.pumps.includes(i)?'⛽':i===24?'✦':moves.includes(i)?'·':'';description=i===s.position?'Seu veículo':s.rocks[i]?'Bloqueio':s.crates.includes(i)?'Carga':s.pumps.includes(i)?'Combustível':'Estrada';}
 const b=document.createElement('button');b.type='button';b.className='field-cell';b.dataset.kind=kind;b.dataset.cell=String(i);b.disabled=!moves.includes(i)||s.status!=='playing';b.textContent=symbol;b.setAttribute('aria-label',`Linha ${Math.floor(i/5)+1}, coluna ${i%5+1}: ${description}${moves.includes(i)?', jogada disponível':''}`);field.append(b);}}
 $('arena-message').textContent=s.notice;$('arena-message').className=`arena-message ${s.status==='won'?'win':s.status==='lost'?'lost':''}`;$('undo').disabled=!s.history.length;$('favorite').textContent=storage.favorites.includes(s.id)?'★ Favoritado':'☆ Favoritar';$('favorite').setAttribute('aria-pressed',String(storage.favorites.includes(s.id)));$('next').hidden=s.status!=='won';}
$('family-tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;filter=b.dataset.filter;pageSize=18;renderCatalog();});
$('mission-list').addEventListener('click',e=>{const open=e.target.closest('[data-open]');const star=e.target.closest('[data-star]');if(open)openMission(open.dataset.open);else if(star)toggleFavorite(star.dataset.star,e.detail===0);});
$('search').addEventListener('input',e=>{term=e.target.value.trim().toLowerCase();pageSize=18;renderCatalog();});$('sort').addEventListener('change',e=>{sort=e.target.value;renderCatalog();});$('more').addEventListener('click',()=>{pageSize+=18;renderCatalog();});
$('surprise').addEventListener('click',()=>openMission(MISSIONS[Math.floor(Math.random()*MISSIONS.length)].id));
$('arena-actions').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action.startsWith('lane-'))apply({type:'build',lane:Number(b.dataset.action.slice(5))});else if(b.dataset.action==='wave')apply({type:'wave'});else apply({type:b.dataset.action});});
$('battlefield').addEventListener('click',e=>{const b=e.target.closest('button[data-cell]');if(b)apply({cell:Number(b.dataset.cell)});});
$('battlefield').addEventListener('keydown',e=>{const keys={ArrowUp:-5,ArrowDown:5,ArrowLeft:-1,ArrowRight:1};if(!(e.key in keys))return;const b=e.target.closest('button[data-cell]');if(!b)return;const id=Number(b.dataset.cell),next=id+keys[e.key];if(next<0||next>=25||(e.key==='ArrowLeft'&&id%5===0)||(e.key==='ArrowRight'&&id%5===4))return;e.preventDefault();$('battlefield').querySelector(`[data-cell="${next}"]`)?.focus();});
$('exit').addEventListener('click',closeMission);$('arena').addEventListener('cancel',e=>{e.preventDefault();closeMission();});$('reset').addEventListener('click',()=>{if(active)openMission(active.id);});$('undo').addEventListener('click',()=>{if(active){active=undo(active);renderGame();}});$('favorite').addEventListener('click',()=>{if(active)toggleFavorite(active.id);});$('next').addEventListener('click',()=>{if(!active)return;const n=Number(active.id.slice(4));openMission(`est-${String(n%150+1).padStart(3,'0')}`);});
$('theme-btn').addEventListener('click',()=>{document.body.dataset.highContrast=document.body.dataset.highContrast==='true'?'false':'true';$('theme-btn').setAttribute('aria-pressed',document.body.dataset.highContrast);});
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(getMission(id)){if(active?.id!==id)openMission(id);}else if($('arena').open)closeMission();});
initStrategyHub();
// Other tabs can update favorites and completed missions on the same origin.
// Keep the visible catalog and its counters in sync rather than overwriting
// changes from an older in-memory snapshot when another tab acts later.
window.addEventListener('storage', event => {
  if (event.key !== STORAGE) return;
  try { if (event.storageArea !== localStorage) return; } catch { return; }
  if (!restoreProgress(event.newValue)) return;
  renderCatalog();
  if (active) renderGame();
});
renderCatalog();const initial=location.hash.slice(1);if(getMission(initial))openMission(initial);
const helpLauncher = $('pg-bot-open');
for (const trigger of [helpLauncher, $('pg-bot-in-arena')]) {
  trigger.addEventListener('click', async () => {
    try {
      const { openHelp } = await import('./pg-bot-help.mjs');
      openHelp(trigger);
    } catch {
      notify('Não foi possível carregar a ajuda. Verifique a conexão e tente novamente.');
    }
  });
}
if (new URLSearchParams(location.search).get('ajuda') === '1' && !getMission(initial)) helpLauncher.click();
if('serviceWorker'in navigator&&location.protocol==='https:')window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});});
