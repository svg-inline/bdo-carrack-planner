# Changelog

Todas as mudanças relevantes para usuários são registradas em `Unreleased`, nas categorias Added, Changed, Fixed, Removed, Deprecated ou Security.

## [Unreleased]

### Added

- Guia completo de Carracas, materiais, receitas e missões disponível mesmo sem JavaScript.
- Verificações automatizadas de lint, tipos, regras do planner, interface e fluxos críticos.
- Aviso quando o navegador não permite salvar o progresso localmente.
- Presets independentes para planejar várias Carracas, inclusive modelos repetidos.

### Changed

- Dependências atualizadas para a geração estável mais recente compatível, incluindo Next.js 16.3.5, React 19.3 e Tailwind CSS 4.3.
- Estado salvo validado e normalizado antes de ser usado nos cálculos.
- O planner agora começa pela escolha da Carraca de um novo preset e permite alternar entre todos os planos pelo seletor lateral.

### Removed

- Removido o onboarding obrigatório de três etapas.
- Removidos a área do Passe Especial de Navegação, seus dados salvos, recomendações de baús e fontes de obtenção do evento.

### Fixed

- Progresso dos equipamentos ignora aprimoramento azul antes da fabricação da peça.
- Campos, navegação, foco e indicadores de progresso receberam nomes e estados acessíveis.
