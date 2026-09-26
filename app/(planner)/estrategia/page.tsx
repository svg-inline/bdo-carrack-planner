import { DataSources, EstimateGuide, GuidePage } from "@/app/reference";
import { accountNotice } from "@/lib/notices";
import { pageOfTab } from "@/lib/routes";
import { pageMetadata } from "@/lib/site";

const page = pageOfTab("strategy");
export const metadata = pageMetadata(page);

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <GuidePage page={page} notice={accountNotice(await searchParams)}><EstimateGuide /><DataSources /></GuidePage>;
}
