import {test,expect} from '@playwright/test';

for(const width of [320,390]){
 test('Gravidade: telemetria opt-in na arena real em '+width+'px',async({page,context})=>{
  await page.setViewportSize({width,height:820});
  const listener=await context.newPage();
  await listener.goto('./independentes/gravidade-cristais/');
  await listener.evaluate(()=>{
   window.__ticks=[];window.__channel=new BroadcastChannel('pg_telemetry_hub_v1');
   window.__channel.onmessage=e=>window.__ticks.push(e.data);
  });
  await page.goto('./independentes/gravidade-cristais/');
  await expect(page.locator('#moves')).toContainText('0/');
  await expect(page.locator('#live-share')).not.toBeChecked();
  await page.locator('[data-dir="right"]').click();
  await expect.poll(()=>listener.evaluate(()=>window.__ticks.length)).toBe(0);
  await page.locator('#live-share').check();
  await expect.poll(()=>listener.evaluate(()=>window.__ticks.length)).toBeGreaterThan(0);
  const initial=await listener.evaluate(()=>window.__ticks.at(-1));
  expect(initial.project).toBe('estrategia');expect(initial.gameId).toBe('gravidade-cristais');
  expect(initial.turn).toBeNull();expect(initial.moves).toBeGreaterThanOrEqual(0);
  expect(initial.resources).toBeNull();
  const before=initial.moves;
  for(const direction of ['up','left','down','right']){
   await page.locator('[data-dir="'+direction+'"]').click();
   const number=Number((await page.locator('#moves').innerText()).split('/')[0]);
   if(number>before)break;
  }
  await expect.poll(()=>listener.evaluate(()=>window.__ticks.at(-1)?.moves)).toBeGreaterThan(before);
  await page.locator('#live-share').uncheck();
  const after=await listener.evaluate(()=>window.__ticks.length);
  await page.locator('#reset').click();
  await expect.poll(()=>listener.evaluate(()=>window.__ticks.length)).toBe(after);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await listener.close();
 });
}
