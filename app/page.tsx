import PlannerApp from "./planner-app";
import Reference from "./reference";
import { currentAccount, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Ler a sessão torna a rota dinâmica. O guia continua entregue inteiro no HTML, sem
 * JavaScript e sem banco — é só o seu preparo que deixa de ser feito na compilação.
 */
const NOTICES: Record<string, string> = {
  erro: "Não foi possível entrar na conta. Tente novamente.",
  indisponivel: "A conta está indisponível no momento. O progresso continua salvo neste navegador.",
  origem: "Pedido recusado porque não veio deste site.",
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requested = typeof params.conta === "string" ? params.conta : "";
  const enabled = isSupabaseConfigured();
  const account = enabled ? await currentAccount() : null;

  return <PlannerApp account={account} accountEnabled={enabled} notice={NOTICES[requested] ?? null}>
    <Reference account={account} accountEnabled={enabled} notice={NOTICES[requested] ?? null} />
  </PlannerApp>;
}
