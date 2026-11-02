import {defineConfig,devices} from '@playwright/test';
const port=5489;
export default defineConfig({
 testDir:'./e2e',
 fullyParallel:true,
 workers:process.env.CI?2:3,
 retries:0,
 reporter:'list',
 use:{baseURL:'http://127.0.0.1:'+port+'/PG-Estrategia/',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'chromium',use:{...devices['Desktop Chrome']}},
  {name:'webkit',use:{...devices['Desktop Safari']}}
 ],
 webServer:{
  command:'node scripts/serve.mjs',
  url:'http://127.0.0.1:'+port+'/PG-Estrategia/',
  env:{PORT:String(port)},
  reuseExistingServer:false,
  timeout:20000
 }
});