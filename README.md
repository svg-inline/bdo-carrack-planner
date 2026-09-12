# Carrack Ledger — BDO Carrack Planner

Planner web para acompanhar a construção das quatro Carracas de Epheria no Black Desert SA.

## Carracas suportadas

- Carraca de Epheria: Gradual — parte do Navio Mercante de Epheria
- Carraca de Epheria: Equilíbrio — parte do Navio Mercante de Epheria
- Carraca de Epheria: Ascensão — parte do Contratorpedeiro de Epheria
- Carraca de Epheria: Bravura — parte do Contratorpedeiro de Epheria

## Funcionalidades

- seleção entre as quatro Carracas sem apagar o estoque;
- inventário único de materiais salvo no navegador;
- metas e faltantes recalculados conforme a Carraca escolhida;
- receitas separadas dos equipamentos azuis +10 do Navio Mercante e do Contratorpedeiro;
- progresso independente das duas linhas de equipamento;
- catálogo "Como obter" com filtros para missões, compra com Moeda Corvo, processamento, drop/caça, permuta e evento;
- indicação de onde cada material é usado;
- ranking dinâmico de gargalos;
- checklist de missões diárias e semanais;
- recomendações para os baús do Passe Especial;
- estratégia de gasto de Moedas Corvo;
- persistência via localStorage com migração do formato anterior.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Build

```bash
npm run build
npm start
```

## Fontes de dados

As fontes públicas usadas pelo planner ficam também listadas na aba Estratégia: Pearl Abyss SA e BDO Codex. A dificuldade e a ordem de foco são heurísticas do planner; quantidades, nomes, receitas e métodos de obtenção devem ser mantidos sincronizados com as fontes do jogo.

## Qualidade e resiliência

O conteúdo de referência funciona sem JavaScript e não depende de APIs externas. Com JavaScript, o progresso é salvo e validado no navegador. Consulte [a arquitetura](docs/architecture.md) e o [changelog](docs/changelog.md).

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```
