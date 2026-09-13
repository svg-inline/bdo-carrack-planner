# Arquitetura do planner

## Renderização e resiliência

A rota `/` entrega no HTML um guia completo com Carracas, materiais, receitas, missões e fontes. Esse conteúdo é independente de JavaScript, `localStorage` e APIs externas. Após a hidratação no navegador, o componente interativo substitui o guia e carrega o progresso local.

Os dados de jogo usados nos cálculos ficam em `lib/data.ts`. A aplicação não consulta WordPress nem outras APIs em tempo de execução; indisponibilidade externa não afeta o conteúdo básico.

O catálogo marítimo mantém 27 missões diárias e 11 semanais de Iliya, Velia, Olho da Okilua e Terra do Amanhecer, conforme o levantamento em `docs/bdo-guia-quests.md`. Cada missão guarda a fonte consultada e o link correspondente.

## Catálogo de missões

`QUEST_GROUPS`, em `lib/data.ts`, é a única fonte do catálogo. Um grupo reúne as missões de um mesmo NPC e de uma mesma frequência, e carrega o que se repete: NPC, local, frequência e a regra de aceite do jogo. Cada missão descreve apenas o próprio conteúdo — título, objetivo, recompensas, materiais recomendados, prioridade e fonte. `QUESTS` é o catálogo achatado, com NPC, local, frequência e trilha já herdados do grupo, e `QUEST_BY_ID` e `QUEST_GROUP_BY_ID` são os índices usados pelo resto do planner.

Acrescentar uma missão é somar uma entrada em `quests` do grupo correspondente; um NPC novo, ou uma leva de missões de evento, é um grupo novo. Nenhuma tela precisa mudar: abas, filtros, contagens, ritmo e seleção do jogador leem essas listas. Frequências ficam em `QUEST_CADENCES`, com nome, período em dias e janela de reinício; somar um identificador em `QuestCadence` e uma linha nessa tabela basta para o planner tratar a nova frequência, e a tipagem aponta o que falta preencher.

As regras de aceite do jogo são o campo `selection` do grupo. Em `all`, as missões do NPC convivem. Em `one-track`, cada missão pertence a uma trilha e só uma trilha fica ativa por vez: é assim que o Ravikel separa a caçada ao Rei do Mar Jovem das três caçadas da Guilda Lua Minguante, e o Herrad Romson separa as duas Pequenas Retribuições. Missões da mesma trilha continuam podendo ser aceitas juntas.

Toda fonte de missão de um material aponta para a missão de origem pelo campo `questId`, e os testes garantem que o vínculo existe, que a frequência bate e que o rótulo da fonte não diverge do título da missão.

## Missões que entram no cálculo

`profile.activeQuests` guarda, por preset, quais missões alimentam o ritmo. `lib/quests.ts` concentra as regras: `defaultActiveQuests` monta a seleção inicial a partir do catálogo — tudo ligado, exceto as trilhas que o jogo bloqueia, onde só a trilha padrão entra; `setQuestActive` aplica a escolha do jogador, trocando a trilha inteira quando o grupo é `one-track`; e `normalizeActiveQuests` reaplica as regras a qualquer estado recebido, descartando missões que não existem mais, preenchendo missões novas com o padrão do catálogo e nunca deixando duas trilhas ativas no mesmo NPC.

Uma missão fora da rotina não rende nada e também não disputa a recompensa de escolha. A aba Missões mostra um bloco por NPC, com a regra de aceite e quantas missões do grupo estão no cálculo; a aba Como obter mantém a fonte na lista, marcada como fora do cálculo e com o ritmo que ela devolveria.

As artes dos navios, equipamentos e materiais ficam em `public/assets` e são entregues pelo componente `next/image`. A imagem do Navio Mercante e do Contratorpedeiro é uma captura oficial do jogo publicada pela Pearl Abyss no [Guia de Melhorias em Navios](https://www.sa.playblackdesert.com/pt-br/Wiki?wikiNo=291); o arquivo local `epheria-caravel.png` mantém a interface ilustrada sem depender do CDN em tempo de execução.

## Equipamento de navio

O planner separa dois conjuntos de equipamento. `GEAR_SETS` traz as quatro peças azuis do Navio Mercante e do Contratorpedeiro, exigidas para a melhoria até a Carraca. `CARRACK_GEAR_SETS` traz o conjunto azul de Shiro, que só existe depois que a Carraca está pronta: cada Carraca possui a sua versão das quatro peças, com ícone próprio, e a base é a peça verde de Toro em +10.

Os materiais do conjunto de Shiro usam a categoria `carrack-gear`. Eles aparecem no inventário e no catálogo de obtenção, mas ficam fora dos gargalos e do percentual da rota até a Carraca, calculados apenas sobre as categorias `blue-gear` e `carrack`. O progresso do conjunto de Shiro é exposto por `carrackGearCompletion`.

Nomes de itens, ícones e ilhas das oficinas seguem o banco de dados do jogo. Onde o [Guia de Melhorias em Navios](https://www.sa.playblackdesert.com/pt-br/Wiki?wikiNo=291) diverge — a planta da Proa de Shiro e o nome da peça de casco — a divergência está registrada no texto exibido ao usuário.

## Tempo estimado

`lib/estimate.ts` transforma o que falta no inventário em prazo. Cada fonte de material vira um ritmo diário: as missões que o preset mantém na rotina usam a quantidade declarada na própria recompensa, convertida para unidades por dia pelo período da frequência; recompensas de escolha compartilham as conclusões da missão entre as metas ainda pendentes, através do campo `group` das fontes, e voltam a render o valor cheio quando as concorrentes são concluídas. Missão que o jogador tirou do cálculo — ou que pertence a uma trilha que ele não escolheu — não entra em nenhuma das duas contas. Permuta, caça, processamento e escavação não têm frequência fixa e usam `FARM_UNITS_PER_DAY`, uma estimativa única por dificuldade do material, contada uma vez por material porque disputam o mesmo tempo de jogo. Moeda Corvo não vira ritmo diário, porque é estoque. O saldo é distribuído por `coinPlan`, que substitui a antiga compra por ordem de gargalo: a cada passo ele compra o material que hoje define o prazo, apenas até esse material alcançar o próximo da fila, e repete com o que sobrar. O resultado nivela os prazos pelo menor teto possível — gastar em um material que já é mais rápido que o gargalo não adiantaria nada. As unidades compradas saem do que falta farmar, e o mesmo plano alimenta a compra sugerida da aba Estratégia, para que recomendação e prazo nunca discordem.

O prazo de um material é o que falta, menos o que o saldo de Moeda Corvo já compra, dividido pelo ritmo. Estoque, saldo e metas vêm do preset ativo, e o contexto de estimativa é montado a cada renderização, então qualquer alteração no inventário, nas moedas ou na Carraca escolhida refaz o plano de compra e os prazos por inteiro. O prazo de uma peça é o do material mais demorado da receita dela, comparado com o estoque atual, e cai para zero quando a peça já foi fabricada. O prazo da Carraca e o do conjunto de Shiro usam as metas somadas das categorias correspondentes, e não o maior prazo entre as peças, porque as quatro peças dividem os mesmos materiais. Pela mesma regra, `categoryEstimate` responde pelo prazo de uma categoria isolada do inventário: os materiais são obtidos em paralelo, então vale o mais demorado do grupo. É esse prazo que o resumo do inventário mostra quando um filtro de categoria está ativo; sem filtro, ele volta a mostrar o da rota inteira até a Carraca. A tabela do inventário também pode ser ordenada por material, estoque, falta ou prazo, pelos próprios cabeçalhos das colunas: a ordenação só reorganiza a lista visível e não altera metas nem estoque, e material sem meta no plano fica sempre no fim das ordens por falta e por prazo, porque não tem o que comparar — é o mesmo "—" que a linha já mostra nessas colunas. Sem ordenação escolhida vale a ordem do catálogo, que agrupa os materiais por uso. Fabricação e aprimoramento dependem de tentativas e ficam fora da conta; a interface declara isso na aba Estratégia e no guia sem JavaScript.

Os prazos são heurísticas, como a dificuldade e a ordem de foco. Quantidades e frequências das missões seguem as fontes listadas em `lib/data.ts`.

## Presets e persistência

O estado interativo é gerenciado pelo Zustand. O usuário cria um preset escolhendo uma das quatro Carracas e pode manter vários presets, inclusive do mesmo modelo. Inventário, equipamentos e missões pertencem ao preset, enquanto o seletor lateral define qual plano está ativo. O seletor lateral também permite remover o preset ativo, com confirmação; quando o último é removido, o planner volta à escolha da Carraca.

Os presets são salvos em `localStorage` com a chave `bdo-carrack-ledger-v1`. Planos salvos antes do conjunto de Shiro recebem o estado vazio das quatro peças na normalização, e planos salvos antes da escolha de missões recebem a seleção padrão do catálogo. Todo estado carregado é normalizado antes de entrar no planner: identificadores desconhecidos são descartados, quantidades são inteiros não negativos e aprimoramentos ficam entre 0 e 10. Planos do formato anterior que já haviam concluído o onboarding são migrados para um preset. Se o armazenamento estiver bloqueado ou exceder a cota, o planner continua durante a sessão e informa que não pode persistir.

## Verificação

Use `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run test:e2e`. O fluxo E2E crítico valida o guia sem JavaScript, o carregamento das artes principais, a criação de presets diferentes e repetidos, o isolamento do progresso, a persistência após recarregar a página, o tempo estimado acompanhando o inventário e a escolha das missões que alimentam o cálculo, incluindo a troca de trilha do Ravikel.
