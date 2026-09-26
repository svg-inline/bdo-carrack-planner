import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isSameOrigin, RETURN_COOKIE, siteOrigin } from "@/lib/supabase/request";
import { returnPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

/**
 * Início do login pelo Discord. É um POST de formulário justamente para funcionar sem
 * JavaScript: o navegador envia, o Supabase devolve a URL de autorização e respondemos com
 * um 303, que faz o navegador seguir em GET — um 307 preservaria o POST e quebraria o fluxo.
 * O `Referer` do formulário diz em que página o jogador estava, para o callback devolvê-lo lá.
 */
export async function POST(request: Request) {
  const origin = siteOrigin(request);
  const back = returnPath(request.headers.get("referer"), origin);
  if (!isSameOrigin(request)) return NextResponse.redirect(`${origin}/?conta=origem`, 303);
  if (!isSupabaseConfigured()) return NextResponse.redirect(`${origin}${back}?conta=indisponivel`, 303);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) return NextResponse.redirect(`${origin}${back}?conta=erro`, 303);
  const response = NextResponse.redirect(data.url, 303);
  response.cookies.set(RETURN_COOKIE, back, { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"), path: "/auth", maxAge: 600 });
  return response;
}
