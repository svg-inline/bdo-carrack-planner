import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account } from "@/types";

/**
 * O planner funciona sem conta. Enquanto as variáveis não existirem — desenvolvimento local
 * sem `.env.local`, por exemplo — a sincronização fica desligada e o progresso continua no
 * navegador, em vez de a aplicação quebrar.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/**
 * Um cliente por requisição, nunca compartilhado: é ele que carrega a sessão daquele usuário.
 *
 * A renovação do token não passa por `proxy.ts`. Esta versão do Next depreciou a convenção
 * `middleware` e desaconselha proxy para gerenciar sessão, então quem escreve os cookies
 * renovados são as Route Handlers, onde `cookies()` pode gravar. Ver ADR 0001, decisão 3.
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components não podem escrever cookies. Ignorar aqui é o comportamento
          // esperado: as Route Handlers rodam a cada carga e a cada salvamento e persistem
          // a renovação por elas.
        }
      },
    },
  });
}

/** Nome que o Discord devolve, sem guardar mais do perfil do que o necessário para identificar. */
function accountName(metadata: Record<string, unknown> | undefined, fallback: string): string {
  for (const key of ["full_name", "name", "user_name", "preferred_username"]) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 48);
  }
  return fallback;
}

/** Conta da requisição atual, ou `null` quando não há sessão ou o Supabase não está ligado. */
export async function currentAccount(): Promise<Account | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, name: accountName(data.user.user_metadata, "Jogador") };
}
