import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PRESET_TABLE } from "@/lib/supabase/api";
import { PRIVATE_HEADERS } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

/**
 * Alvo da tarefa diária. O plano gratuito do Supabase pausa projetos sem uso, e um projeto
 * pausado não derruba só os dados: derruba o login, deixando o jogador sem acesso ao progresso
 * que está na nuvem. Uma consulta trivial por dia mantém o projeto ativo. Ver ADR 0001,
 * decisão 11.
 *
 * A consulta não devolve preset nenhum: sem sessão, o RLS não libera linha alguma. O que
 * importa é encostar no banco.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ status: "negado" }, { status: 401, headers: PRIVATE_HEADERS });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ status: "sem-banco" }, { headers: PRIVATE_HEADERS });
  }

  const supabase = await createClient();
  const { error } = await supabase.from(PRESET_TABLE).select("id", { head: true, count: "exact" }).limit(1);

  return NextResponse.json(
    { status: error ? "indisponivel" : "ok" },
    { status: error ? 502 : 200, headers: PRIVATE_HEADERS },
  );
}
