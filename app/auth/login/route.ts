import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isSameOrigin, siteOrigin } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

/**
 * Início do login pelo Discord. É um POST de formulário justamente para funcionar sem
 * JavaScript: o navegador envia, o Supabase devolve a URL de autorização e respondemos com
 * um 303, que faz o navegador seguir em GET — um 307 preservaria o POST e quebraria o fluxo.
 */
export async function POST(request: Request) {
  const origin = siteOrigin(request);
  if (!isSameOrigin(request)) return NextResponse.redirect(`${origin}/?conta=origem`, 303);
  if (!isSupabaseConfigured()) return NextResponse.redirect(`${origin}/?conta=indisponivel`, 303);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) return NextResponse.redirect(`${origin}/?conta=erro`, 303);
  return NextResponse.redirect(data.url, 303);
}
