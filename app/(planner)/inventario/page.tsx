import { MaterialsTable, GuidePage } from "@/app/reference";
import { accountNotice } from "@/lib/notices";
import { pageOfTab } from "@/lib/routes";
import { pageMetadata } from "@/lib/site";

const page = pageOfTab("inventory");
export const metadata = pageMetadata(page);

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <GuidePage page={page} notice={accountNotice(await searchParams)}><MaterialsTable /></GuidePage>;
}
