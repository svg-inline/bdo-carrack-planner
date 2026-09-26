import PlannerApp from "@/app/planner-app";
import { GuideShell } from "@/app/reference";
import { currentAccount, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * O planner mora no layout para sobreviver à troca de página: a carga do progresso e a
 * sincronização com a conta acontecem uma vez, e cada página só entrega o próprio guia.
 * Ler a sessão torna as páginas dinâmicas; o guia continua inteiro no HTML.
 */
export default async function PlannerLayout({ children }: { children: React.ReactNode }) {
  const enabled = isSupabaseConfigured();
  const account = enabled ? await currentAccount() : null;
  return <PlannerApp account={account} accountEnabled={enabled}>
    <GuideShell account={account} accountEnabled={enabled}>{children}</GuideShell>
  </PlannerApp>;
}
