# Arquitetura do planner

## Renderização e resiliência

A rota `/` entrega no HTML um guia completo com Carracas, materiais, receitas, missões e fontes. Esse conteúdo é independente de JavaScript, `localStorage` e APIs externas. Após a hidratação no navegador, o componente interativo substitui o guia e carrega o progresso local.

Os dados de jogo usados nos cálculos ficam em `lib/data.ts`. A aplicação não consulta WordPress nem outras APIs em tempo de execução; indisponibilidade externa não afeta o conteúdo básico.

## Persistência

O estado é salvo em `localStorage` com a chave `bdo-carrack-ledger-v1`. Todo estado carregado é normalizado antes de entrar no planner: identificadores desconhecidos são descartados, quantidades são inteiros não negativos e aprimoramentos ficam entre 0 e 10. Se o armazenamento estiver bloqueado ou exceder a cota, o planner continua durante a sessão e informa que não pode persistir.

## Verificação

Use `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run test:e2e`. O fluxo E2E crítico valida o guia sem JavaScript, o onboarding e a persistência após recarregar a página.
