import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { RETURN_COOKIE, siteOrigin } from "@/lib/supabase/request";
import { returnPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

/**
 * Retorno do Discord, já passando pelo Supabase. Trocar o código pela sessão grava os cookies
 * aqui, numa Route Handler, que é onde o Next permite escrever. O jogador volta para a página
 * em que começou o login, guardada pela rota de login.
 */
export async function GET(request: Request) {
  const origin = siteOrigin(request);
  const code = new URL(request.url).searchParams.get("code");
  const cookieStore = await cookies();
  const back = returnPath(cookieStore.get(RETURN_COOKIE)?.value, origin);
  cookieStore.delete({ name: RETURN_COOKIE, path: "/auth" });

  if (!code || !isSupabaseConfigured()) return NextResponse.redirect(`${origin}${back}?conta=erro`, 303);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(`${origin}${back}?conta=${error ? "erro" : "entrou"}`, 303);
}
