# Domínio Territorial: primeiro motor Hex Conquest independente

Status desta branch: implementação isolada, ainda não publicada.

- Jogo próprio com sete células axiais (anel de raio 1), bastião em (0,0), base aliada (0,1) e base inimiga (0,-1).
- Três dificuldades, ações explícitas de seleção, reforço, ataque, fim de turno, pausa, desfazer e reinício.
- IA inimiga determinística: reforça uma posição de fronteira e escolhe uma conquista legal por turno; sem timers, Math.random ou requestAnimationFrame.
- Interface SVG com foco, Tab/Enter/Espaço/setas, gestos de toque, respostas acessíveis e controles com pelo menos 48 px.
- PG Bot usa o estado local para explicar suprimentos, setores vulneráveis, ataque legal e plano de três passos. Respostas não são geradas por IA externa nem transmitidas para outro site.
- Manifesto declarativo: `public/estrategia/independentes/dominio-territorial/game.meta.json`, destinado à sincronização segura do catálogo PG Bot.
- Service worker isolado no caminho deste jogo, com pré-cache de todos os arquivos essenciais.

## Evidência de testes

O motor possui teste de vitória legal no terceiro turno (modo Tático), regras de guarda, entrada inválida, determinismo do turno adversário, derrota, pausa/desfazer e orientações derivadas dos dados.

```bash
npm test
npm run test:e2e
```

Playwright verifica Chromium e WebKit a 320 e 390 px com toque em polígonos SVG, alvos de no mínimo 48 × 48 px, sem rolagem horizontal, foco de teclado, comportamento do PG Bot e recarga offline após instalação do service worker.

**Não confundir emulação de toque com Android físico:** permanecem necessários testes no aparelho de desempenho, temperatura, consumo, gestos sob barras de navegação do sistema, rotação e reconexão real.

## Relação com as missões 01 a 15

O motor é uma nova experiência independente e **não substitui automaticamente** as missões 01 a 15, preservadas no catálogo de 150 missões e seis famílias. Migrar a trilha Cerco e Expansão exige contrato de conversão, salvamento e testes específicos, sem contar o mesmo motor quinze vezes como jogos diferentes.

A PR foi desenvolvida sobre a branch do 37º jogo, Gravidade dos Cristais. É uma alteração **dependente** e não deve ser mesclada antes da PR de base.
