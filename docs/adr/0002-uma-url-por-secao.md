# ADR 0002 — Uma URL por seção do planner

- **Status:** aceito
- **Data:** 2026-09-26
- **Escopo:** abas do planner, guia sem JavaScript e indexação

## Contexto

O planner inteiro vivia em `/`. As abas eram estado do React: recarregar voltava para a Visão geral, não havia link para uma seção, e o buscador via uma única página para todos os assuntos. O guia sem JavaScript — cerca de 16 mil palavras — era substituído pelo planner na hidratação. Como o buscador renderiza JavaScript e não tem preset salvo, o que ele indexava era a tela de escolha da Carraca, e não o guia.

## Decisão

1. **Cada aba é uma página.** `/`, `/inventario`, `/como-obter`, `/equipamento-amarelo`, `/missoes` e `/estrategia`, listadas em `lib/routes.ts` com título e descrição próprios. A aba ativa é derivada da URL.
2. **O planner mora no layout do grupo `app/(planner)`.** Trocar de página não remonta o componente, então a carga do progresso e a sincronização com a conta não se repetem a cada clique. A página entrega só o guia do próprio assunto, que o planner exibe antes da hidratação e quando não há preset.
3. **Sem preset, as páginas de seção mostram o guia.** A escolha da Carraca fica em `/`. Nas outras páginas, o visitante vê o conteúdo que buscou, com um convite para montar o plano.
4. **Guia de cada Carraca em `/carraca/<nome>`**, estático e sem conta, pelo nome exibido (`emergencia`, e não o identificador interno `ascensao`).
5. **Pré-carregamento completo no menu, e não `loading.tsx`.** As páginas são dinâmicas porque leem a sessão. O `loading.tsx` recomendado pelo Next faria a navegação ser imediata, mas também faria o HTML inicial chegar com o conteúdo escondido até o JavaScript rodar, quebrando o guia sem JavaScript. `prefetch` nos links do menu traz a página inteira antes do clique.
6. **Login e saída voltam à página de origem**, pelo `Referer` do formulário guardado em cookie até o callback. A URL de retorno ao Supabase continua fixa em `/auth/callback`, sem exigir novas entradas na lista de Redirect URLs.

## Consequências

- Cada página pode ranquear para a própria busca, e o `sitemap.xml` lista as dez.
- Os links do menu geram até cinco pré-carregamentos por visita. É o custo de manter a troca de aba sem espera enquanto as páginas forem dinâmicas.
- Uma página nova do planner exige uma entrada em `PLANNER_PAGES`, a pasta em `app/(planner)` e o componente da aba; o menu, os metadados e o sitemap seguem a lista.
