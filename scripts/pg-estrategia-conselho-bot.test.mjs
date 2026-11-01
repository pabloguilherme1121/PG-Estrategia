import test from 'node:test';
import assert from 'node:assert/strict';
import {createCouncil,commandCouncil} from '../public/estrategia/independentes/conselho-de-reinos/engine.mjs';
import {councilBotAnswer} from '../public/estrategia/independentes/conselho-de-reinos/pg-bot.mjs';

test('PG Bot do Conselho contextualiza os objetivos sem usar um serviço externo',()=>{
 const treaties=createCouncil({mode:'tratados',difficulty:'recruta',seed:7});
 const crisis=createCouncil({mode:'crise',difficulty:'veterano',seed:2});
 assert.match(councilBotAnswer('objective',treaties),/três tratados|3 tratados|3 aprovações/i);
 assert.match(councilBotAnswer('objective',crisis),/dois acordos|2 acordos|2 aprovações/i);
 assert.match(councilBotAnswer('controls',crisis),/Tab/i);
});

test('PG Bot identifica rodada, influência, coalizão e estado atual sem mudar a partida',()=>{
 const state=createCouncil({mode:'tratados',difficulty:'recruta',seed:7});
 const before=structuredClone(state);
 assert.match(councilBotAnswer('situation',state),/rodada/i);
 assert.match(councilBotAnswer('situation',state),/influência/i);
 const paused=commandCouncil(state,{type:'pause'});
 assert.match(councilBotAnswer('situation',paused),/pausad/i);
 assert.deepEqual(state,before);
 assert.match(councilBotAnswer('unknown',state),/ajuda/i);
});
