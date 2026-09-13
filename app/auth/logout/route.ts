import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isSameOrigin, siteOrigin } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

/** Encerra a sessão. Também é formulário, pela mesma razão do login. */
export async function POST(request: Request) {
  const origin = siteOrigin(request);
  if (!isSameOrigin(request)) return NextResponse.redirect(`${origin}/?conta=origem`, 303);

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(`${origin}/?conta=saiu`, 303);
}
