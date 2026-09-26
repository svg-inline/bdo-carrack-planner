import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JsonLd from "@/app/json-ld";
import { CarrackGuide, GuideIntro, GuideShell } from "@/app/reference";
import { CARRACKS } from "@/lib/data";
import { carrackFromSlug, carrackPath, CARRACK_SLUGS } from "@/lib/routes";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/site";

/**
 * Guia de uma Carraca. Não tem planner nem conta: é referência pura, montada na compilação,
 * e aponta para o planner quando o jogador quer acompanhar o próprio progresso.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(CARRACK_SLUGS).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = carrackFromSlug((await params).slug);
  if (!id) return {};
  const carrack = CARRACKS[id];
  return pageMetadata({
    path: carrackPath(id),
    title: `${carrack.name}: materiais e receitas`,
    description: `Materiais, quantidades, receitas do equipamento azul +10 e do conjunto de Shiro e prazo estimado para construir a ${carrack.name} a partir do ${carrack.sourceShip}.`,
  });
}

export default async function Page({ params }: Props) {
  const id = carrackFromSlug((await params).slug);
  if (!id) notFound();
  const carrack = CARRACKS[id];
  return <main id="main-content" tabIndex={-1}>
    <JsonLd data={breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: carrack.name, path: carrackPath(id) }])} />
    <GuideShell account={null} accountEnabled={false}>
      <GuideIntro title={carrack.name}>
        <p>Materiais, receitas e prazo para chegar à {carrack.shortName} a partir do {carrack.sourceShip}.</p>
        <p><Link className="text-gold-bright" href="/">Planejar a {carrack.shortName} no Carrack Ledger</Link>, com o seu estoque, missões e prazo.</p>
      </GuideIntro>
      <CarrackGuide id={id} />
    </GuideShell>
  </main>;
}
