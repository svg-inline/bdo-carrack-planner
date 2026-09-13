# ADR 0001 — Contas pelo Discord e persistência do progresso na nuvem

- **Status:** aceito
- **Data:** 2026-09-13
- **Escopo:** primeira versão da sincronização; um dispositivo em uso por vez

## Contexto

O progresso do planner vive hoje apenas no `localStorage`, sob a chave `bdo-carrack-ledger-v1`, gerenciado pelo Zustand em `lib/store.ts`. Não existe conta nem cópia no servidor. Na prática isso significa três coisas: quem troca de navegador ou de aparelho recomeça do zero; limpar o armazenamento apaga semanas de inventário sem aviso; e não há como recuperar um plano perdido.

O planner já guarda um estado rico por preset — inventário, saldo de Moeda Corvo, equipamento das duas ramificações, conjunto de Shiro, missões escolhidas e missões concluídas na janela atual. É pouco dado em bytes e muito dado em esforço do jogador. Perder isso é a pior falha possível do produto.

Queremos login pelo Discord, que é onde a comunidade de Black Desert já está, e o progresso acessível de outro dispositivo.

## Decisão

### 1. Supabase para banco e autenticação

PostgreSQL gerenciado, com Supabase Auth no provedor Discord e Row Level Security. A Vercel continua hospedando o Next.js. Montar autenticação própria sobre qualquer Postgres custaria mais trabalho sem vantagem clara nesta escala.

### 2. Todo acesso ao banco passa por Route Handlers, não pelo navegador

O cliente não carrega `supabase-js` e não fala com o Supabase diretamente. A interface conversa com `/api/presets` por `fetch`, e as rotas do Next usam o cliente de servidor com a sessão em cookie.

São três motivos. O bundle do cliente continua magro, coerente com as cinco dependências de runtime do projeto. A validação do que chega reaproveita `normalizePreset` e `normalizeProfile` de `lib/profile.ts`, que já são as funções em que o planner confia. E, principalmente, **login e logout viram formulários com `method="post"`**, o que os faz funcionar sem JavaScript e preserva a regra de ouro do projeto.

O RLS continua ativo e obrigatório, como segunda barreira. Ele não é dispensado por as rotas validarem a sessão: é o que garante que um erro de programação numa rota não vire vazamento entre contas.

### 3. A sessão não passa por `proxy.ts`

O guia oficial do Supabase para Next.js instrui a criar um `middleware.ts` que renova a sessão. **Essa receita não se aplica a este projeto.** Nesta versão do Next, a convenção `middleware` está depreciada e renomeada para `proxy` — está registrado em `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md`. Além do nome, a documentação do próprio Next desaconselha o uso para este caso: proxy é descrito como inadequado para gerenciamento completo de sessão ou autorização, e pode ser executado na borda, sem módulos compartilhados.

A renovação do token acontece, portanto, nas Route Handlers e nos Server Components, onde `cookies()` — assíncrono nesta versão — pode escrever.

### 4. Um preset por linha, com o progresso em `JSONB`

```sql
create table public.presets (
  user_id        uuid not null references auth.users(id) on delete cascade,
  id             uuid not null,
  name           text not null check (char_length(name) between 1 and 48),
  schema_version smallint not null,
  data           jsonb not null,
  updated_at     timestamptz not null default now(),
  primary key (user_id, id),
  check (pg_column_size(data) < 65536)
);
```

O `JSONB` acompanha o formato que o planner já usa e permite acrescentar campos sem criar uma tabela por detalhe do plano. O `id` é o mesmo `crypto.randomUUID()` que o cliente gera, o que dispensa tabela de correspondência.

A chave primária é composta por decisão de segurança, não de modelagem: com `id` sozinho como chave, um identificador escolhido de propósito colidiria com o de outra conta, e o erro de conflito revelaria que aquele preset existe. Com `(user_id, id)` a questão desaparece.

O limite de 48 caracteres no nome espelha o que `lib/store.ts` e `lib/profile.ts` já aplicam. O teto de tamanho do `JSONB` e um limite de presets por conta existem porque nada mais impede uma conta de ocupar o plano gratuito inteiro. O limite é de **50 presets**, aplicado por gatilho em `INSERT`: são quatro Carracas e o uso real é um punhado de planos, então 50 é folgado para o jogador e ainda protege o banco.

### 5. `schema_version` protege os dados entre publicações

Esta é a proteção central, e vale mesmo com um dispositivo por vez.

`normalizeProfile` descarta em silêncio qualquer campo que não conheça. No `localStorage` isso é uma virtude: estado antigo sempre entra normalizado. Contra um banco compartilhado entre versões do site, é perigoso. Uma aba aberta antes de uma publicação lê um preset gravado no formato novo, a normalização remove os campos que ela desconhece, e o salvamento seguinte devolve ao servidor um preset mutilado. Nenhum erro aparece.

A versão do formato passa a ser uma constante única, `PRESET_SCHEMA_VERSION`, compartilhada entre o Zustand e o servidor — hoje o número está solto na configuração do `persist`, e duas fontes acabariam divergindo. Cada gravação compara:

| Situação                                  | Ação                                                             |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Versão do registro maior que a do cliente | Recusa a gravação; a interface pede que a página seja atualizada |
| Versão do registro menor                  | Normaliza na leitura e regrava na versão atual                   |
| Iguais                                    | Grava                                                            |

### 6. A última gravação aceita pelo servidor prevalece

Não haverá combinação por campo, histórico de versões nem tela de resolução de conflito. A premissa desta versão é um dispositivo em uso por vez, e resolver conflito seria construir a resposta para um problema que ainda não existe.

### 7. A cópia local continua, agora separada por conta

O `localStorage` deixa de ser o dono do progresso e passa a ser cache e rede de segurança. A chave muda conforme a sessão: `bdo-carrack-ledger-v1` enquanto anônimo, `bdo-carrack-ledger-v1:<id do usuário>` quando logado.

Sem essa separação, sair da conta num computador compartilhado deixaria o progresso no cache para o próximo usuário, e entrar com outra conta misturaria dois jogadores no mesmo estado local.

A marcação de pendente também é gravada localmente. Se o jogador fecha a aba dentro da janela de espera do salvamento, o dado ainda está no navegador, e o planner precisa saber, ao reabrir, que falta enviá-lo.

### 8. Salvamento após pausa na edição, com pendência visível

Alterações valem imediatamente na interface e no armazenamento local. O envio do preset inteiro acontece depois de uma pausa curta na edição. Falha de rede ou de servidor mantém a marcação de pendente, avisa o jogador e tenta de novo — inclusive quando a conexão volta.

### 9. Importar não substitui nada

Ao entrar pela primeira vez com presets no navegador, o planner oferece importá-los. A importação **insere com identificadores novos**, nunca reaproveita o identificador local.

A razão é concreta: um preset já importado antes, e depois editado na conta a partir de outro aparelho, seria sobrescrito pela cópia velha deste navegador se a importação fosse feita por identificador. Inserindo com identificador novo, nada que está na conta é tocado. Nomes repetidos ganham marca de importado, e o navegador registra que já importou, para o convite não reaparecer.

### 10. O preset selecionado é preferência do aparelho

`activePresetId` não sincroniza. Trocar de plano no celular não deve mudar a tela aberta no computador.

### 11. Rotina diária contra a pausa do projeto

O plano gratuito do Supabase pode pausar projetos sem uso, e a restauração é manual. Um projeto pausado não derruba apenas os dados: **derruba o login**, deixando o jogador sem acesso ao progresso que está na nuvem. Uma tarefa agendada diária faz uma consulta trivial para manter o projeto ativo.

## Consequências

**O que melhora.** O progresso deixa de depender de um navegador. Existe recuperação depois de limpar o armazenamento. O caminho fica aberto para compartilhar um plano por link e para outras funcionalidades que dependem de servidor.

**O que piora.** O projeto passa a ter configuração externa — projeto no Supabase, aplicação no Discord Developer Portal, variáveis de ambiente e URLs de retorno — e, com ela, modos de falha que não existiam. Sessão, importação e pendência são estado novo para manter. E o planner interativo passa a depender de um serviço externo em tempo de execução.

**Sobre a regra de ouro.** O guia em `/` continua entregue no HTML, sem JavaScript, sem `localStorage` e sem banco. Login e logout funcionam sem JavaScript por serem formulários. O que passa a depender de serviço externo é a sincronização do planner interativo, e apenas ela: sem rede, o planner continua funcionando sobre a cópia local.

## Alternativas recusadas

**Cliente falando direto com o Supabase, protegido só por RLS.** É o caminho mais curto e o mais documentado. Recusado porque colocaria `supabase-js` no bundle, deixaria a validação fora do nosso código e tornaria o login dependente de JavaScript, contra a regra de ouro.

**Combinação por campo e histórico de versões.** Recusados por escopo. São a resposta certa para uso simultâneo em vários aparelhos, que esta versão não se propõe a resolver. Se o uso simultâneo aparecer, isto vira um ADR próprio.

**Código de sincronização em vez de conta.** Sincronizar por um código anônimo evitaria OAuth inteiro. Recusado porque um código perdido é um progresso perdido, o que reintroduz o problema que estamos resolvendo.

## Verificação e lacuna assumida

As partes puras — conversão do preset, regra de versão, decisão do que está pendente e do que importar — ficam em módulos sem rede e são cobertas por testes unitários. O fluxo sem JavaScript já coberto em `e2e/planner.spec.ts` continua sendo a proteção da regra de ouro, e passa a cobrir também o estado deslogado.

**O fluxo completo de login fica fora do E2E nesta versão.** Automatizá-lo exigiria um projeto Supabase dedicado a testes com sessão semeada, ou uma autenticação falsa acionada por variável de ambiente — e um atalho desses é exatamente o tipo de coisa que escapa para produção. A lacuna é declarada de propósito e coberta por uma verificação manual documentada.

## Condições externas

Os planos gratuitos da Vercel e do Supabase têm limites e condições que mudam, incluindo a restrição de uso pessoal e não comercial do plano Hobby. As condições devem ser conferidas antes de publicar.

Implantações de prévia da Vercel recebem URL dinâmica. O Supabase aceita curingas na lista de retornos autorizados, então autorizá-las é possível — a versão anterior deste documento afirmava o contrário e estava errada. A decisão de deixá-las de fora se mantém por outro motivo: um curinga amplia a superfície de retorno do login em troca de conveniência que esta versão não precisa. Nesta versão, apenas produção e ambiente local ficam autorizados.

A exportação do progresso pelo próprio jogador e a exclusão da conta com os dados associados são requisitos desta linha de trabalho, tanto por proteção contra a falta de backup automático no plano gratuito quanto por obrigação legal, já que passamos a guardar identidade vinculada a um terceiro. O que se guarda do perfil do Discord deve ser o mínimo necessário.

## Documentação dependente

`docs/architecture.md` afirma hoje que a aplicação não consulta APIs externas em tempo de execução. A afirmação continua verdadeira enquanto este ADR não for implementado, e deve ser reescrita no mesmo conjunto de mudanças que trouxer a sincronização, junto do registro no changelog. Este documento decide; ele não descreve o que já existe.
