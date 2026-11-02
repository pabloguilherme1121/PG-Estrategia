# Lote experimental de cenários Hex Conquest

O comando `npm run scenarios:generate` gera **15 configurações distintas** no intervalo `hex-conquest-039` a `hex-conquest-053`, preservadas em `scenarios/hex-conquest/`. Cada arquivo tem um objetivo, grade de 7 ou 19 células axiais, duas bases, regras, custos de suprimento e posições de guarnição.

`npm run scenarios:check` valida o lote sem escrever arquivos, e `npm test` executa também testes de determinismo, unicidade de mapa/regras, conectividade axial, objetivos e schema. Os metadados `scenarios/metadata/*.meta.json` são referências **provisórias para o PG Bot**, com `kind: "scenario"`. Eles **não são importados automaticamente** pelo sincronizador de jogos independentes do Bot.

## Limitações e publicação

Estes 15 registros são **cenários de um motor**, não 15 jogos novos nem provas de que os mapas sejam vencíveis. Não criam páginas, rotas ou uma classe de motor própria e não contam para a meta de 150 jogos distintos. O número de jogos independentes publicados permanece 38.

Antes de colocar um cenário em produção, é obrigatório adaptar o Hex Conquest atual para ler suas próprias regras e grades de 19 células, definir as condições finais por configuração, executar um solucionador ou uma bateria de partidas completas, criar controles de toque em 320/390 px, validar offline e verificar instruções específicas do PG Bot. Isso evita que o gerador anuncie regras que o motor atual ainda não executa.

A sincronização do PG Bot deve aceitar esses metadados somente depois de um jogo **realmente publicado** e validado. Manter a política de atualização por pull request revisável, não commits/deploy automático.
