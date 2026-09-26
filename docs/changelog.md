# Changelog

Todas as mudanças relevantes para usuários são registradas em `Unreleased`, nas categorias Added, Changed, Fixed, Removed, Deprecated ou Security.

## [Unreleased]

### Added

- Cada seção do planner tem o próprio endereço: `/inventario`, `/como-obter`, `/equipamento-amarelo`, `/missoes` e `/estrategia`, além da Visão geral em `/`. Recarregar, compartilhar o link ou usar o voltar do navegador mantém a seção, e cada página tem título e descrição próprios nos buscadores.
- Página de guia de cada Carraca em `/carraca/gradual`, `/carraca/equilibrio`, `/carraca/emergencia` e `/carraca/bravura`, com materiais, receitas e prazo partindo do zero.
- Sem preset salvo, as páginas de seção mostram o guia do assunto com um convite para escolher a Carraca, e a tela de escolha da Carraca traz links para o guia.
- `robots.txt`, `sitemap.xml` com todas as páginas, URL canônica, cartão de compartilhamento e verificação do Google Search Console e do Bing Webmaster Tools.

- Média de drop por dia de cada material, informada pelo jogador na coluna "Drop/dia" do inventário ou no cartão do material em "Como obter". A média substitui a estimativa do planner para aquele material — mesmo com a atividade fora da rotina — e se soma às missões no ritmo e no prazo. Aceita vírgula e frações (ex.: 0,5); zero diz que o item não sai fora das missões; campo vazio volta à estimativa, que aparece como dica. A média pertence ao preset.

- Aba "Equip. amarelo" com o equipamento de Falasi da Carraca do preset: as quatro peças com receita, base de Shiro +10 e permissão; o passo a passo para conseguir cada item (Colônia de Lyngbakr, processamento dos espólios, troca do Chifre de Lyngbakr, plantas com Philaberto Falasi e permissão de 5 bilhões de prata); o que falta juntar; a comparação de atributos entre Shiro +10 e Falasi +10; a tabela de aprimoramento com Pedra Negra da Onda Crepuscular; e o preço no Mercado Mundial. Ícones oficiais do anúncio de 27/08/2026.
- Opção "Contar o equipamento amarelo no cálculo", por preset, na aba nova e no inventário. Desligada — o padrão, inclusive em presets antigos —, os materiais de Falasi ficam guardados sem meta, falta ou prazo. Ligada, eles ganham meta, falta e prazo no inventário e em "Como obter", e a Visão geral mostra as quatro peças com a marcação "Pronta · fora do cálculo".
- Filtro "Equip. amarelo" no inventário, com os materiais de Falasi, as quatro plantas, e a Essência de Coral Crepuscular e a Pedra Negra da Onda Crepuscular em Aprimoramento.
- Guia sem JavaScript com a seção do equipamento amarelo: a rota de obtenção, as peças de cada Carraca e a tabela de aprimoramento.

- Marcação "Pronta · fora do cálculo" em cada peça do equipamento azul do Navio Mercante ou do Contratorpedeiro e do conjunto de Shiro, na Visão geral. Os materiais da peça marcada saem da meta, do que falta, dos gargalos e do prazo — o estoque que caiu depois da fabricação deixa de voltar como falta. A marcação pertence ao preset e é salva no navegador e na conta.

- A compra sugerida de Moeda Corvo passa a contar a moeda que as missões marcadas rendem por dia. Todos os itens da fila aparecem, cada um com o prazo em que fica pago ("agora", "≈ 5 dias", "≈ 3 semanas"), e o saldo após o plano pode ficar negativo, mostrando quanto falta juntar. Materiais que só saem da loja deixam de aparecer "sem estimativa" e ganham prazo; dos que também vêm de missão, o plano compra só a diferença que as missões não cobrem a tempo.
- Rotina de farm na aba Estratégia: escolha se você faz permuta, caça no oceano (com o processamento dos drops) e escavação. Atividade desmarcada deixa de contar no prazo, e o material que nenhuma missão entrega passa a aparecer como "sem fonte" e a ter prioridade na compra sugerida de Moeda Corvo, com o total que falta para fechá-lo. A escolha pertence ao preset; presets antigos continuam com as três atividades ligadas.
- Escolha do item que você pega nas missões de recompensa de escolha, na aba Missões: a conclusão inteira passa a contar para o item escolhido, em vez de ser dividida entre as metas que faltam. A opção sugerida leva o texto "(Recomendado)" e aponta a meta que hoje demora mais sem aquela missão. A escolha pertence ao preset; "Automático" mantém a divisão de antes, e uma escolha cuja meta já foi concluída volta sozinha ao automático.
- Escolha de onde a Moeda Corvo pode ser gasta, na aba Estratégia: comprar as peças verdes de Toro da Carraca, com a quantidade de peças, e acelerar os materiais do equipamento azul e os da construção da Carraca, cada um com o seu próprio interruptor. A escolha pertence ao preset. As peças reservam o saldo antes de tudo, a 10.000 moedas cada, e o plano avisa quantas o saldo realmente paga.
- Ícone do Discord no botão de login, tanto no planner quanto no guia sem JavaScript.
- Conta pelo Discord: o progresso passa a ser salvo na nuvem e fica acessível em outro navegador ou aparelho. Entrar e sair funcionam sem JavaScript.
- Aviso de alterações pendentes quando o salvamento na conta falha, com nova tentativa automática ao voltar a conexão. O progresso continua guardado no navegador enquanto isso.
- Importação dos planos guardados no navegador para a conta, oferecida ao entrar. A importação cria cópias novas e não substitui nada do que já está na conta.
- Guia completo de Carracas, materiais, receitas e missões disponível mesmo sem JavaScript.
- Verificações automatizadas de lint, tipos, regras do planner, interface e fluxos críticos.
- Aviso quando o navegador não permite salvar o progresso localmente.
- Presets independentes para planejar várias Carracas, inclusive modelos repetidos.
- Equipamento azul de Shiro da Carraca: receitas, ícones oficiais das quatro peças de cada Carraca e progresso de Toro +10, fabricação e aprimoramento resumido na Visão geral.
- Materiais do conjunto de Shiro no inventário e no catálogo de obtenção: planta de construção de cada peça, madeira compensada de onda violenta, suporte elaborado e cola com traços de onda.
- Fonte de obtenção por escavação de trabalhadores nos nós das ilhas.
- Botão para remover o preset ativo direto no seletor lateral, para desfazer uma Carraca adicionada por engano.
- Tempo estimado para concluir cada material, cada peça de equipamento, o conjunto de Shiro e a Carraca inteira, calculado a partir do que falta no inventário e do ritmo das missões, permuta, caça e processamento.
- Ritmo diário de cada material e de cada missão recorrente no catálogo "Como obter", com a explicação do cálculo na aba Estratégia e no guia sem JavaScript.
- O saldo de Moeda Corvo entra no tempo estimado: o que a compra sugerida resolve sai do que falta farmar e o prazo cai assim que as moedas ou o inventário mudam.
- A compra sugerida passou a distribuir o saldo onde ele corta mais tempo da rota, em vez de seguir a ordem de gargalo, e mostra de quanto para quanto o prazo cai.
- Escolha de quais missões entram no cálculo, uma a uma, guardada em cada preset. As que ficam de fora continuam na lista, marcadas, com o ritmo que devolveriam se voltassem.
- Aba Missões organizada por NPC, com a regra de aceite de cada um e a contagem de quantas missões do NPC estão no cálculo.
- Ordenação do inventário por material, estoque, falta ou prazo, direto nos cabeçalhos das colunas Item, Tenho, Falta e Tempo, com inversão da direção a cada clique.
- Regra de trilha única do jogo: aceitar a caçada ao Rei do Mar Jovem bloqueia as três caçadas da Guilda Lua Minguante do Ravikel, e vice-versa. O planner deixa de somar alternativas que não podem ser aceitas no mesmo dia. O Ravikel é o único NPC do catálogo com essa exclusividade.

### Changed

- Entrar com o Discord e sair da conta devolvem o jogador à página em que ele estava, em vez da página inicial.
- O guia sem JavaScript foi dividido pelas mesmas páginas do planner, cada uma com o próprio conteúdo, e o menu dele navega entre elas.

- A Pedra Negra da Onda ganhou a troca dos espólios de Lyngbakr no Comerciante de Moeda Corvo como fonte.

- O catálogo "Como obter" avisa quando a recompensa de uma missão está escolhida em outro item, para explicar por que aquela fonte parou de render.
- Fontes de obtenção completadas com as opções que faltavam nas recompensas de escolha: a Madeira Compensada Revestida de Rubus Aprimorada da Pequena Retribuição I e a Pedra Negra da Onda das três caçadas diárias da Guilda Lua Minguante.
- O ícone da Moeda Corvo passou a acompanhar toda menção à moeda, e não só o saldo do cabeçalho: recompensas de missão, a Loja de Moeda Corvo em "Como obter", o rodapé da barra lateral, o resumo do inventário e as quantias da compra sugerida na aba Estratégia.
- Com a conta conectada, "Redefinir tudo" passa a limpar apenas este navegador; o progresso da conta continua salvo.
- O progresso guardado no navegador passou a ser separado por conta, para que sair num computador compartilhado não deixe os planos para o próximo usuário.
- Cabeçalho da tabela do inventário com texto maior e seta de ordenação destacada, para deixar claro quais colunas podem ser ordenadas.
- O tempo estimado no resumo do inventário passou a acompanhar o filtro de categoria: em Todos ele continua sendo o prazo da rota até a Carraca, e em Equip. azul, Carraca, Equip. Carraca ou Aprimoramento mostra apenas o prazo da categoria selecionada.
- Dependências atualizadas para a geração estável mais recente compatível, incluindo Next.js 16.3.5, React 19.3 e Tailwind CSS 4.3.
- Catálogo marítimo reduzido às 12 diárias e 9 semanais conferidas nos prints do jogo em `docs/quests`: títulos, objetivos e recompensas passaram a ser os que a janela de missão mostra, com a Moeda de Okilua que faltava nas diárias do Soldado e do Ravikel e as três Águas Frescas de Okilua como recompensa de escolha do Hae-Ran.
- Fontes de obtenção dos materiais sincronizadas com as frequências, quantidades e alternativas de recompensa atuais das missões marítimas.
- Catálogo de missões reorganizado por NPC e frequência: o grupo passou a carregar NPC, local, frequência e regra de aceite, de modo que uma missão nova — inclusive de evento — só precisa do próprio conteúdo.
- Cada fonte de material passou a apontar para a missão que a entrega, o que sincroniza o catálogo de missões com o de obtenção.
- A opção de Pedra Negra da Onda das semanais do Olho da Okilua deixou de ser uma linha genérica e virou as três semanais do Ravikel que realmente a oferecem.
- Estado salvo validado e normalizado antes de ser usado nos cálculos.
- O planner agora começa pela escolha da Carraca de um novo preset e permite alternar entre todos os planos pelo seletor lateral.
- Textos, ícones de materiais e imagens de equipamentos foram ampliados em todas as telas para melhorar a leitura.
- O progresso da rota até a Carraca considera apenas os materiais da própria construção; o conjunto de Shiro tem progresso separado, por ser equipamento posterior.

### Removed

- Removidas do catálogo as missões sem confirmação no jogo: as diárias do Baori, Maonil e Friko na Ilha de Iliya, as duas Pequenas Retribuições do Herrad Romson, a semanal Piratas do Meio do Caminho do Yu-An e as diárias e a semanal de Velia, com exceção do Transporte de Suprimentos (Ilha de Iliya). As fontes de material que dependiam delas saíram junto; nenhum material ficou sem fonte.
- Removidas as abas "Azuis +10" e "Shiro da Carraca" do menu lateral. O acompanhamento de fabricação e aprimoramento das peças sai da interface por ora; o resumo de cada peça continua na Visão geral e os materiais continuam no inventário e no catálogo de obtenção.
- Removido o onboarding obrigatório de três etapas.
- Removidos a área do Passe Especial de Navegação, seus dados salvos, recomendações de baús e fontes de obtenção do evento.

### Fixed

- Os percentuais da Visão geral (progresso geral, materiais azuis, materiais Carraca e conjunto de Shiro) passam a arredondar para baixo. Antes mostravam 100% com material ainda faltando, como 141 de 150 Ferros Forjados Rígidos do Oceano (99,5%).
- "Ocultar concluídos" no inventário passou a ficar salvo neste navegador; antes voltava desligado a cada troca de aba ou recarga.
- Progresso dos equipamentos ignora aprimoramento azul antes da fabricação da peça.
- O tempo estimado não soma mais missões que o jogo não deixa aceitar juntas, o que deixava os prazos de Olho Abissal, Escama da Lua, Suporte Elaborado e Cola com Traços de Onda otimistas demais.
- Campos, navegação, foco e indicadores de progresso receberam nomes e estados acessíveis.
- As rotas do Navio Mercante e do Contratorpedeiro agora exibem uma captura oficial do jogo, e os resumos de equipamento mostram as miniaturas sem o marcador que parecia uma imagem vazia.
- A troca de abas no celular mantém o título da tela visível abaixo da navegação fixa.

### Security

- Os planos de cada conta ficam isolados no banco por Row Level Security, e um plano salvo por uma versão mais nova do site não pode ser sobrescrito por uma aba antiga, o que apagaria dados sem aviso.
