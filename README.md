# PG Estratégia

Site próprio do PG Estratégia, extraído sem alterar ou apagar o projeto PG Arcade. Repositório: https://github.com/pabloguilherme1121/PG-Estrategia

## Conteúdo

- Campanha original de **150 missões**, distribuídas em seis mecânicas reais.
- **36 jogos independentes**: nove títulos no laboratório clássico e 27 jogos em páginas próprias.
- PG Bot dentro da campanha e em todos os jogos, com ajuda local, sem serviço pago de IA.
- PWA com cache e armazenamento de progresso no próprio navegador.
- Biblioteca de 47 jogos históricos do PG Arcade, acessados por links oficiais. Esses 47 jogos continuam hospedados no Arcade.

## Organização

- `public/estrategia/`: fonte da campanha e dos jogos, mantida com sua hierarquia original para preservar os motores e os testes existentes.
- `public/brand/pg-bot/`: mascote local utilizado pelo site.
- `scripts/build.mjs`: exporta o site para `dist/`, atualiza caminhos, canonical e links do Arcade, sem editar a fonte.
- `scripts/*.test.mjs`: testes herdados de cada motor, bot e PWA, mais verificações específicas desta migração.
- `dist/`: saída gerada, usada na publicação GitHub Pages.

## Rodar e testar

É necessário Node.js 22 ou superior.

```bash
npm test
npm run build
npm run preview
```

Prévia local: http://127.0.0.1:5481/PG-Estrategia/

## Publicação

A publicação usa a branch `gh-pages` com o conteúdo de `dist/`. O endereço, após a configuração do GitHub Pages, é https://pabloguilherme1121.github.io/PG-Estrategia/.

O catálogo do Arcade original permanece intacto. Antes de trocar os links do projeto antigo para este endereço, confirmar que o deploy e os testes da nova versão foram aprovados. O progresso não é sincronizado entre URLs nem aparelhos: mudar de endereço pode fazer o navegador exibir histórico local vazio, sem apagar automaticamente o histórico salvo no endereço antigo.

## Licença e limites

Preserva a licença do PG Arcade. Dicas do PG Bot são respostas locais, não uma IA conectada. Teste em Android físico e auditoria real de performance continuam necessários para garantir compatibilidade de dispositivo.
