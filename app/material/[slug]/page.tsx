import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JsonLd from "@/app/json-ld";
import { GuideIntro, GuideShell, MaterialGuide } from "@/app/reference";
import { CATEGORY_LABELS, MATERIAL_BY_ID, SOURCE_TYPE_LABELS } from "@/lib/data";
import { materialFromSlug, materialPath, MATERIAL_SLUGS } from "@/lib/materials";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/site";
import type { MaterialId } from "@/types";

/**
 * Página de um material. Como o guia das Carracas, é referência pura, montada na compilação,
 * e responde à busca de quem quer saber como conseguir aquele item.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(MATERIAL_SLUGS).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

/** "missão diária, permuta e drop / caça": os tipos de fonte, sem repetir. */
function sourceSummary(id: MaterialId): string {
  const labels = [...new Set(MATERIAL_BY_ID[id].sources.map((source) => SOURCE_TYPE_LABELS[source.type].toLowerCase()))];
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)}` : labels[0];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = materialFromSlug((await params).slug);
  if (!id) return {};
  const material = MATERIAL_BY_ID[id];
  return pageMetadata({
    path: materialPath(id),
    title: `Como conseguir ${material.name}`,
    description: `Onde conseguir ${material.name} no Black Desert: ${sourceSummary(id)}. Quanto cada Carraca de Epheria pede, o prazo partindo do zero e em que peças o material é usado.`,
  });
}

export default async function Page({ params }: Props) {
  const id = materialFromSlug((await params).slug);
  if (!id) notFound();
  const material = MATERIAL_BY_ID[id];
  return <main id="main-content" tabIndex={-1}>
    <JsonLd data={breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Como obter", path: "/como-obter" }, { name: material.name, path: materialPath(id) }])} />
    <GuideShell account={null} accountEnabled={false}>
      <GuideIntro title={`Como conseguir ${material.name}`}>
        <p className="item-label"><Image className="item-icon" src={material.icon} alt={material.name} width={44} height={44} /><span>{CATEGORY_LABELS[material.category]} · dificuldade {material.difficulty}/5 · {sourceSummary(id)}</span></p>
        <p><Link className="text-gold-bright" href="/">Acompanhe {material.name} no Carrack Ledger</Link>, com o seu estoque, as missões que você faz e o prazo da sua Carraca.</p>
      </GuideIntro>
      <MaterialGuide id={id} />
    </GuideShell>
  </main>;
}
