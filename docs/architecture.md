# Arquitetura do planner

## Renderização e resiliência

A rota `/` entrega no HTML um guia completo com Carracas, materiais, receitas, missões e fontes. Esse conteúdo é independente de JavaScript, `localStorage` e APIs externas. Após a hidratação no navegador, o componente interativo substitui o guia e carrega o progresso local.

Os dados de jogo usados nos cálculos ficam em `lib/data.ts`. A aplicação não consulta WordPress nem outras APIs em tempo de execução; indisponibilidade externa não afeta o conteúdo básico.

As artes dos navios, equipamentos e materiais ficam em `public/assets` e são entregues pelo componente `next/image`. A imagem do Navio Mercante e do Contratorpedeiro é uma captura oficial do jogo publicada pela Pearl Abyss no [Guia de Melhorias em Navios](https://www.sa.playblackdesert.com/pt-br/Wiki?wikiNo=291); o arquivo local `epheria-caravel.png` mantém a interface ilustrada sem depender do CDN em tempo de execução.

## Equipamento de navio

O planner separa dois conjuntos de equipamento. `GEAR_SETS` traz as quatro peças azuis do Navio Mercante e do Contratorpedeiro, exigidas para a melhoria até a Carraca. `CARRACK_GEAR_SETS` traz o conjunto azul de Shiro, que só existe depois que a Carraca está pronta: cada Carraca possui a sua versão das quatro peças, com ícone próprio, e a base é a peça verde de Toro em +10.

Os materiais do conjunto de Shiro usam a categoria `carrack-gear`. Eles aparecem no inventário e no catálogo de obtenção, mas ficam fora dos gargalos e do percentual da rota até a Carraca, calculados apenas sobre as categorias `blue-gear` e `carrack`. O progresso do conjunto de Shiro é exposto por `carrackGearCompletion`.

Nomes de itens, ícones e ilhas das oficinas seguem o banco de dados do jogo. Onde o [Guia de Melhorias em Navios](https://www.sa.playblackdesert.com/pt-br/Wiki?wikiNo=291) diverge — a planta da Proa de Shiro e o nome da peça de casco — a divergência está registrada no texto exibido ao usuário.

## Presets e persistência

O estado interativo é gerenciado pelo Zustand. O usuário cria um preset escolhendo uma das quatro Carracas e pode manter vários presets, inclusive do mesmo modelo. Inventário, equipamentos e missões pertencem ao preset, enquanto o seletor lateral define qual plano está ativo.

Os presets são salvos em `localStorage` com a chave `bdo-carrack-ledger-v1`. Planos salvos antes do conjunto de Shiro recebem o estado vazio das quatro peças na normalização. Todo estado carregado é normalizado antes de entrar no planner: identificadores desconhecidos são descartados, quantidades são inteiros não negativos e aprimoramentos ficam entre 0 e 10. Planos do formato anterior que já haviam concluído o onboarding são migrados para um preset. Se o armazenamento estiver bloqueado ou exceder a cota, o planner continua durante a sessão e informa que não pode persistir.

## Verificação

Use `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run test:e2e`. O fluxo E2E crítico valida o guia sem JavaScript, o carregamento das artes principais, a criação de presets diferentes e repetidos, o isolamento do progresso e a persistência após recarregar a página.
