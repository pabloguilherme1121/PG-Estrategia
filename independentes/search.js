// Busca local em títulos e descrições, sem carregar jogos ou dados externos.
const input=document.querySelector("#independent-search");
const result=document.querySelector("#independent-results");
const empty=document.querySelector("#independent-empty");
const cards=Array.from(document.querySelectorAll(".choices .choice"));
const normalize=value=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
for(const card of cards)card.dataset.search=normalize(
 Array.from(card.querySelectorAll("strong,small")).map(el=>el.textContent||"").join(" ")
);
function applySearch(){
 const query=normalize(input.value.trim());let shown=0;
 for(const card of cards){
  card.hidden=!card.dataset.search.includes(query);
  if(!card.hidden)shown++;
 }
 result.textContent=shown+" de "+cards.length+" jogos encontrados";
 empty.hidden=shown!==0;
}
input.addEventListener("input",applySearch);
input.addEventListener("keydown",event=>{
 if(event.key!=="Escape")return;
 event.preventDefault();
 input.value="";
 applySearch();
});
applySearch();
