**É viável adicionar banco de dados e login pelo Discord mantendo a Vercel gratuita. Minha recomendação para este projeto é Supabase: PostgreSQL + Supabase Auth com Discord.**

Analisei o código e a documentação. Hoje, o progresso fica exclusivamente no `localStorage`, gerenciado pelo Zustand em [lib/store.ts](C:/Users/victo/Downloads/bdo-carrack-planner-v3-completo/lib/store.ts:134). Não existe autenticação nem persistência no servidor: outro navegador não recebe os dados, e limpar o armazenamento pode apagar o progresso.

**Como eu estruturaria**

Manteria a Vercel hospedando o Next.js e usaria o Supabase para contas e progresso. O login pelo Discord já é suportado pelo Supabase, reduzindo o trabalho de implementar autenticação. [Documentação do provedor](https://supabase.com/docs/guides/auth/social-login/auth-discord).

O banco começaria com esta estrutura:

| Entidade                  | Dados                                                           |
| ------------------------- | --------------------------------------------------------------- |
| Usuário autenticado       | Identidade vinculada ao Discord, gerenciada pelo Supabase Auth  |
| Perfil do usuário         | Nome de exibição e preferências                                 |
| Presets                   | Dono, nome, Carraca, inventário, moedas, equipamentos e missões |
| Controle de sincronização | Versão do registro e data de atualização de cada preset         |

Para começar, guardaria o progresso de cada preset em uma coluna `JSONB`, com dono, identificador e versão em colunas próprias. Isso acompanha a estrutura atual e permite ampliar os dados sem criar uma tabela para cada detalhe do planner.

**Um ponto de produto importante:** atualmente, inventário e Moedas Corvo pertencem a cada preset. Preservaria essa regra inicialmente. Um inventário único compartilhado entre todas as Carracas exigiria uma mudança adicional nos cálculos e na documentação.

O catálogo de itens, receitas e imagens continuaria no projeto. Apenas os dados pessoais precisariam do banco.

**Como deveria funcionar para o jogador**

- Sem login, continua usando o armazenamento local.
- Ao entrar pelo Discord, pode importar os presets deste navegador para a conta, preservando os que já existem na nuvem.
- As alterações são salvas localmente de imediato e enviadas ao servidor após uma pequena pausa na edição.
- Se o serviço falhar, o planner informa que existem alterações pendentes e tenta sincronizar novamente.
- Ao editar o mesmo preset em dois dispositivos, a versão do registro detecta conflitos e impede sobrescritas silenciosas.
- Ao trocar de conta, dados locais e operações pendentes permanecem separados por usuário.

O guia básico continuaria disponível sem JavaScript e sem depender do banco, conforme a regra do projeto. A sincronização seria uma melhoria do planner interativo.

**Segurança necessária**

Cada preset deve ter um `user_id`, com políticas de acesso no PostgreSQL para permitir que apenas o dono consulte e altere seus dados. O Supabase oferece isso por meio de Row Level Security. A aplicação também deve validar a sessão e os dados recebidos em cada operação protegida. [Documentação de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Podemos reaproveitar a normalização de [lib/profile.ts](C:/Users/victo/Downloads/bdo-carrack-planner-v3-completo/lib/profile.ts:39), acrescentando validação de entrada, limites de tamanho e controle de versão.

**Sobre os planos gratuitos**

| Serviço       | Condições relevantes                                                                       |
| ------------- | ------------------------------------------------------------------------------------------ |
| Vercel Hobby  | Permite começar sem mensalidade, dentro das cotas; destinado a uso pessoal e não comercial |
| Supabase Free | 500 MB de banco, 50 mil usuários ativos mensais de autenticação e 5 GB de saída de dados   |

Esses limites são independentes: a cota de autenticação não significa que o sistema completo suportará 50 mil usuários com qualquer volume de uso. [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase Free](https://supabase.com/pricing).

O Supabase gratuito também pode pausar projetos após uma semana de inatividade e não inclui backups automáticos. Por isso, incluiria exportação do progresso e uma rotina de backup do banco. [Condições do plano](https://supabase.com/pricing).

**Ordem recomendada de implementação:** banco e políticas de acesso → login e sessão → migração dos dados locais → sincronização e conflitos → testes de isolamento entre contas, falhas e persistência em outro navegador. A entrega deve incluir documentação, changelog e as verificações exigidas pelo projeto.

Para ativar, serão necessários um projeto Supabase, uma aplicação no Discord Developer Portal e as configurações de callback e ambiente na Vercel. **Nesta etapa fiz apenas a análise; não alterei arquivos nem configurei serviços.**
