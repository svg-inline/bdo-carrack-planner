import { CarrackSummaries, GuidePage } from "@/app/reference";
import { redirect } from "next/navigation";
import { accountNotice } from "@/lib/notices";
import { authCodeFrom } from "@/lib/supabase/request";
import { pageOfTab } from "@/lib/routes";
import { pageMetadata } from "@/lib/site";

const page = pageOfTab("overview");
export const metadata = pageMetadata(page);

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const strayCode = authCodeFrom(params);
  if (strayCode) redirect(`/auth/callback?code=${encodeURIComponent(strayCode)}`);

  return <GuidePage page={page} notice={accountNotice(params)}><CarrackSummaries /></GuidePage>;
}
