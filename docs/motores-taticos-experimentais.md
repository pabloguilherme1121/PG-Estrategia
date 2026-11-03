# Motores táticos experimentais: Domínio Territorial e Combate em Grade

Adição de motores sem mudar nenhuma arena já publicada. O PG Estratégia atual usa módulos ECMAScript em vez dos arquivos TypeScript citados no texto enviado.

## Arquivos

- public/estrategia/engines/hex-conquest.mjs: conquista por hexágonos axiais, compra de tropas, guarnição mínima, IA determinística e fábrica createDominioTerritorialGame() com sete hexágonos.
- public/estrategia/engines/turn-tactics.mjs: combate por turnos em grade, movimentação sem atravessar obstáculos, AP, cobertura, IA inimiga e orientações contextuais.
- scripts/pg-estrategia-new-engines.test.mjs: regressões de ações inválidas, isolamento de estado e resposta do adversário.

## Testes

Execute: node --test scripts/pg-estrategia-new-engines.test.mjs

O npm test existente executa o arquivo automaticamente, pois scripts/run-tests.mjs descobre todos os testes *.test.mjs.

## Limites e etapas de integração

Os motores são uma base funcional isolada, ainda sem interface gráfica, catálogo, PWA específico ou publicação como novo jogo. Não substituem o Hex Conexão existente, que tem outras regras.

Para estrear Domínio Territorial: implementar grade SVG acessível, controle de toque, reinício, pausa, estados de vitória e derrota, persistência local, vínculo ao PG Bot e Playwright nos três motores de navegador. Android físico continua pendente.

getState() devolve cópia independente de grid e células, evitando alterar a partida por meio do snapshot. O Map do snapshot continua mutável em si: a interface deve consumir uma nova cópia após cada ação, não presumir imutabilidade profunda.

Não incluir estes protótipos na contagem oficial nem declarar 150 jogos independentes sem auditoria individual.
