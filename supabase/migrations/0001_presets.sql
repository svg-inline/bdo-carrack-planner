-- Presets do planner por conta. Ver docs/adr/0001-contas-e-persistencia-na-nuvem.md.
-- Idempotente de propósito: pode ser reaplicada sobre um banco que já tenha parte disto.

create table if not exists public.presets (
  user_id        uuid not null references auth.users(id) on delete cascade,
  id             uuid not null,
  name           text not null check (char_length(name) between 1 and 48),
  schema_version smallint not null,
  data           jsonb not null,
  updated_at     timestamptz not null default now(),
  -- Chave composta por segurança, não por modelagem: com `id` sozinho como chave, um
  -- identificador escolhido de propósito colidiria com o de outra conta e o erro de conflito
  -- revelaria que aquele preset existe.
  primary key (user_id, id),
  check (pg_column_size(data) < 65536)
);

alter table public.presets enable row level security;

-- `(select auth.uid())` em vez de `auth.uid()` direto: assim a função é avaliada uma vez por
-- consulta, e não linha a linha.
drop policy if exists "presets_select_own" on public.presets;
create policy "presets_select_own" on public.presets
  for select using ((select auth.uid()) = user_id);

drop policy if exists "presets_insert_own" on public.presets;
create policy "presets_insert_own" on public.presets
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "presets_update_own" on public.presets;
create policy "presets_update_own" on public.presets
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "presets_delete_own" on public.presets;
create policy "presets_delete_own" on public.presets
  for delete using ((select auth.uid()) = user_id);

-- Teto de presets por conta. Nada mais impediria uma conta de ocupar o plano gratuito
-- inteiro. São quatro Carracas e o uso real é um punhado de planos; 50 é folgado para o
-- jogador e ainda protege o banco.
create or replace function public.enforce_preset_limit()
returns trigger
language plpgsql
as $$
declare
  total integer;
begin
  select count(*) into total from public.presets where user_id = new.user_id;
  if total >= 50 then
    -- A rota /api/presets/[id] reconhece esta marca e responde "limite-de-presets".
    raise exception 'preset_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Só em INSERT: atualizar um preset existente não acrescenta linha, e o upsert de um preset
-- já gravado passa por UPDATE.
drop trigger if exists presets_limit on public.presets;
create trigger presets_limit
  before insert on public.presets
  for each row execute function public.enforce_preset_limit();
