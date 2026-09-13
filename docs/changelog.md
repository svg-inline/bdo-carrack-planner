# Changelog

Todas as mudanças relevantes para usuários são registradas em `Unreleased`, nas categorias Added, Changed, Fixed, Removed, Deprecated ou Security.

## [Unreleased]

### Added

- Guia completo de Carracas, materiais, receitas e missões disponível mesmo sem JavaScript.
- Verificações automatizadas de lint, tipos, regras do planner, interface e fluxos críticos.
- Aviso quando o navegador não permite salvar o progresso localmente.
- Presets independentes para planejar várias Carracas, inclusive modelos repetidos.
- Equipamento azul de Shiro da Carraca: aba própria, receitas, ícones oficiais das quatro peças de cada Carraca e acompanhamento de Toro +10, fabricação e aprimoramento.
- Materiais do conjunto de Shiro no inventário e no catálogo de obtenção: planta de construção de cada peça, madeira compensada de onda violenta, suporte elaborado e cola com traços de onda.
- Fonte de obtenção por escavação de trabalhadores nos nós das ilhas.
- Botão para remover o preset ativo direto no seletor lateral, para desfazer uma Carraca adicionada por engano.

### Changed

- Dependências atualizadas para a geração estável mais recente compatível, incluindo Next.js 16.3.5, React 19.3 e Tailwind CSS 4.3.
- Estado salvo validado e normalizado antes de ser usado nos cálculos.
- O planner agora começa pela escolha da Carraca de um novo preset e permite alternar entre todos os planos pelo seletor lateral.
- Textos, ícones de materiais e imagens de equipamentos foram ampliados em todas as telas para melhorar a leitura.
- O progresso da rota até a Carraca considera apenas os materiais da própria construção; o conjunto de Shiro tem progresso separado, por ser equipamento posterior.

### Removed

- Removido o onboarding obrigatório de três etapas.
- Removidos a área do Passe Especial de Navegação, seus dados salvos, recomendações de baús e fontes de obtenção do evento.

### Fixed

- Progresso dos equipamentos ignora aprimoramento azul antes da fabricação da peça.
- Campos, navegação, foco e indicadores de progresso receberam nomes e estados acessíveis.
- As rotas do Navio Mercante e do Contratorpedeiro agora exibem uma captura oficial do jogo, e os resumos de equipamento mostram as miniaturas sem o marcador que parecia uma imagem vazia.
- A troca de abas no celular mantém o título da tela visível abaixo da navegação fixa.
