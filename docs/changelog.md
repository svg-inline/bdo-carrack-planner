# Changelog

Todas as mudanças relevantes para usuários são registradas em `Unreleased`, nas categorias Added, Changed, Fixed, Removed, Deprecated ou Security.

## [Unreleased]

### Added

- Ícone do Discord no botão de login, tanto no planner quanto no guia sem JavaScript.
- Conta pelo Discord: o progresso passa a ser salvo na nuvem e fica acessível em outro navegador ou aparelho. Entrar e sair funcionam sem JavaScript.
- Aviso de alterações pendentes quando o salvamento na conta falha, com nova tentativa automática ao voltar a conexão. O progresso continua guardado no navegador enquanto isso.
- Importação dos planos guardados no navegador para a conta, oferecida ao entrar. A importação cria cópias novas e não substitui nada do que já está na conta.
- Guia completo de Carracas, materiais, receitas e missões disponível mesmo sem JavaScript.
- Verificações automatizadas de lint, tipos, regras do planner, interface e fluxos críticos.
- Aviso quando o navegador não permite salvar o progresso localmente.
- Presets independentes para planejar várias Carracas, inclusive modelos repetidos.
- Equipamento azul de Shiro da Carraca: aba própria, receitas, ícones oficiais das quatro peças de cada Carraca e acompanhamento de Toro +10, fabricação e aprimoramento.
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
- Regra de trilha única do jogo: aceitar a caçada ao Rei do Mar Jovem bloqueia as três caçadas da Guilda Lua Minguante do Ravikel, e vice-versa; as duas Pequenas Retribuições do Herrad Romson seguem a mesma regra. O planner deixa de somar alternativas que não podem ser aceitas no mesmo dia.

### Changed

- Com a conta conectada, "Redefinir tudo" passa a limpar apenas este navegador; o progresso da conta continua salvo.
- O progresso guardado no navegador passou a ser separado por conta, para que sair num computador compartilhado não deixe os planos para o próximo usuário.
- Cabeçalho da tabela do inventário com texto maior e seta de ordenação destacada, para deixar claro quais colunas podem ser ordenadas.
- O tempo estimado no resumo do inventário passou a acompanhar o filtro de categoria: em Todos ele continua sendo o prazo da rota até a Carraca, e em Equip. azul, Carraca, Equip. Carraca ou Aprimoramento mostra apenas o prazo da categoria selecionada.
- Dependências atualizadas para a geração estável mais recente compatível, incluindo Next.js 16.3.5, React 19.3 e Tailwind CSS 4.3.
- Catálogo marítimo atualizado para 27 missões diárias e 11 semanais, incluindo a missão consolidada da Ilha de Iliya, as semanais atuais do Kario e as missões da Terra do Amanhecer.
- Fontes de obtenção dos materiais sincronizadas com as frequências, quantidades e alternativas de recompensa atuais das missões marítimas.
- Catálogo de missões reorganizado por NPC e frequência: o grupo passou a carregar NPC, local, frequência e regra de aceite, de modo que uma missão nova — inclusive de evento — só precisa do próprio conteúdo.
- Cada fonte de material passou a apontar para a missão que a entrega, o que sincroniza o catálogo de missões com o de obtenção.
- A opção de Pedra Negra da Onda das semanais do Olho da Okilua deixou de ser uma linha genérica e virou as três semanais do Ravikel que realmente a oferecem.
- Estado salvo validado e normalizado antes de ser usado nos cálculos.
- O planner agora começa pela escolha da Carraca de um novo preset e permite alternar entre todos os planos pelo seletor lateral.
- Textos, ícones de materiais e imagens de equipamentos foram ampliados em todas as telas para melhorar a leitura.
- O progresso da rota até a Carraca considera apenas os materiais da própria construção; o conjunto de Shiro tem progresso separado, por ser equipamento posterior.

### Removed

- Removido o onboarding obrigatório de três etapas.
- Removidos a área do Passe Especial de Navegação, seus dados salvos, recomendações de baús e fontes de obtenção do evento.

### Fixed

- Progresso dos equipamentos ignora aprimoramento azul antes da fabricação da peça.
- O tempo estimado não soma mais missões que o jogo não deixa aceitar juntas, o que deixava os prazos de Olho Abissal, Escama da Lua, Suporte Elaborado e Cola com Traços de Onda otimistas demais.
- Campos, navegação, foco e indicadores de progresso receberam nomes e estados acessíveis.
- As rotas do Navio Mercante e do Contratorpedeiro agora exibem uma captura oficial do jogo, e os resumos de equipamento mostram as miniaturas sem o marcador que parecia uma imagem vazia.
- A troca de abas no celular mantém o título da tela visível abaixo da navegação fixa.

### Security

- Os planos de cada conta ficam isolados no banco por Row Level Security, e um plano salvo por uma versão mais nova do site não pode ser sobrescrito por uma aba antiga, o que apagaria dados sem aviso.
