import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
const files=readdirSync('scripts').filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'scripts/'+f);
const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit',shell:false,env:process.env});
process.exit(result.status??1);
