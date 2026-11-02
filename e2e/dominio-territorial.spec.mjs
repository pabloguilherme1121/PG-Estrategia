import {test,expect} from '@playwright/test';
const path='./independentes/dominio-territorial/';
for(const width of [320,390]){
 test.describe('Domínio Territorial · '+width+' px',()=>{
  test.use({viewport:{width,height:760},hasTouch:true,isMobile:true});
  test('sete alvos SVG acessíveis e sem overflow, toque realiza conquista',async({page})=>{
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(path);
   const hexes=page.locator('#hex-grid [data-hex-key]');
   await expect(hexes).toHaveCount(7);
   const dimensions=await hexes.evaluateAll(nodes=>nodes.map(node=>({
    name:node.getAttribute('aria-label'),role:node.getAttribute('role'),
    width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height
   })));
   for(const hex of dimensions){
    expect(hex.role,hex.name).toBe('button');
    expect(hex.width,hex.name).toBeGreaterThanOrEqual(48);
    expect(hex.height,hex.name).toBeGreaterThanOrEqual(48);
   }
   expect(await page.locator('#hex-grid').evaluate(el=>getComputedStyle(el).touchAction)).toBe('none');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
   await page.locator('[data-hex-key="0,1"]').tap();
   await expect(page.locator('[data-hex-key="0,1"]')).toHaveAttribute('data-selected','true');
   await page.locator('[data-hex-key="-1,1"]').tap();
   await expect(page.locator('[data-hex-key="-1,1"]')).toHaveAttribute('data-owner','player');
   await expect(page.locator('#game-status')).toContainText('conquistado');
   await page.getByRole('button',{name:'Plano de 3 passos'}).tap();
   await expect(page.locator('#bot-plan li')).toHaveCount(3);
   await expect(page.locator('#bot-answer')).toContainText('Turno 1');
   await page.getByRole('button',{name:'Encerrar turno'}).tap();
   await expect(page.locator('#turn')).toHaveText('2/20');
   expect(errors).toEqual([]);
  });
 });
}
test('teclado, pausa, reinício e transparência do PG Bot',async({page})=>{
 await page.goto(path);
 const player=page.locator('[data-hex-key="0,1"]');
 await player.focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('[data-hex-key="0,1"]')).toHaveAttribute('data-selected','true');
 await page.getByRole('button',{name:'Pausar',exact:true}).click();
 await expect(page.getByRole('button',{name:'Encerrar turno'})).toBeDisabled();
 await page.getByRole('button',{name:'Retomar'}).click();
 await page.getByRole('button',{name:'Reforçar +1 tropa (3 suprimentos)'}).click();
 await expect(page.locator('#supplies')).toHaveText('3');
 await page.getByRole('button',{name:'Desfazer'}).click();
 await expect(page.locator('#supplies')).toHaveText('6');
 await expect(page.locator('#pg-bot .disclosure')).toContainText('estado local');
 await page.getByRole('button',{name:'Nova partida'}).click();
 await expect(page.locator('#turn')).toHaveText('1/20');
});
test('PWA previamente carregado mantém interface e motor offline',async({page,context})=>{
 await page.goto(path);
 await page.waitForFunction(async()=>{
  if(!('serviceWorker' in navigator))return false;
  const reg=await navigator.serviceWorker.ready;
  const names=await caches.keys();
  return !!reg.active&&names.includes('pg-estrategia-dominio-territorial-v1');
 },null,{timeout:12000});
 await context.setOffline(true);
 await page.reload();
 await expect(page.locator('#hex-grid [data-hex-key]')).toHaveCount(7);
 await page.locator('[data-hex-key="0,1"]').click();
 await page.locator('[data-hex-key="-1,1"]').click();
 await expect(page.locator('[data-hex-key="-1,1"]')).toHaveAttribute('data-owner','player');
 await context.setOffline(false);
});