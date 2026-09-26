import type { CarrackTarget } from "@/types";

/**
 * Páginas do planner. Cada aba do menu é uma URL própria, com título e descrição próprios,
 * para que o buscador indexe cada assunto separado e o jogador possa compartilhar o link
 * da seção. A aba ativa vem da URL, e não de estado da interface.
 */
export const PLANNER_PAGES = [
  {
    tab: "overview",
    path: "/",
    label: "Visão geral",
    title: "Planejador das Carracas de Epheria",
    description: "Planejador das quatro Carracas de Epheria no Black Desert: inventário, materiais, equipamentos +10, missões do oceano e tempo estimado até a sua Carraca.",
  },
  {
    tab: "inventory",
    path: "/inventario",
    label: "Inventário",
    title: "Materiais de cada Carraca",
    description: "Quantidade de cada material pedido pelas Carracas de Epheria Gradual, Equilíbrio, Emergência e Bravura, com inventário para acompanhar o que falta.",
  },
  {
    tab: "materials",
    path: "/como-obter",
    label: "Como obter",
    title: "Como obter os materiais da Carraca",
    description: "Onde conseguir cada material da Carraca de Epheria: missões diárias e semanais, loja de Moeda Corvo, processamento, caça no oceano, permuta e trabalhadores.",
  },
  {
    tab: "yellow",
    path: "/equipamento-amarelo",
    label: "Equip. amarelo",
    title: "Equipamento amarelo de Falasi da Carraca",
    description: "Como fazer o equipamento amarelo de Falasi da Carraca: Colônia de Lyngbakr, processamento dos espólios, plantas, permissão, receitas e tabela de aprimoramento.",
  },
  {
    tab: "quests",
    path: "/missoes",
    label: "Missões",
    title: "Missões do Oceano para a Carraca",
    description: "Missões diárias e semanais do oceano em Iliya, Velia, Olho da Okilua e Terra do Amanhecer, com recompensas e regras de aceite de cada NPC.",
  },
  {
    tab: "strategy",
    path: "/estrategia",
    label: "Estratégia",
    title: "Estratégia e tempo estimado da Carraca",
    description: "Como o planner estima o prazo da Carraca: ritmo das missões, permuta, caça, processamento e onde gastar as Moedas Corvo para chegar mais rápido.",
  },
] as const;

export type PlannerPage = (typeof PLANNER_PAGES)[number];
export type PlannerTab = PlannerPage["tab"];

/** Endereço da página de guia de cada Carraca. Emergência tem o id antigo `ascensao`. */
export const CARRACK_SLUGS: Record<CarrackTarget, string> = {
  gradual: "gradual",
  equilibrio: "equilibrio",
  ascensao: "emergencia",
  bravura: "bravura",
};

export function carrackPath(target: CarrackTarget): string {
  return `/carraca/${CARRACK_SLUGS[target]}`;
}

export function carrackFromSlug(slug: string): CarrackTarget | null {
  const entry = Object.entries(CARRACK_SLUGS).find(([, value]) => value === slug);
  return entry ? (entry[0] as CarrackTarget) : null;
}

function trimPath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** Aba do planner de uma URL; `null` fora das páginas do planner. */
export function tabOfPath(pathname: string): PlannerTab | null {
  const path = trimPath(pathname);
  return PLANNER_PAGES.find((page) => page.path === path)?.tab ?? null;
}

export function pageOfTab(tab: PlannerTab): PlannerPage {
  return PLANNER_PAGES.find((page) => page.tab === tab)!;
}

/** Todas as páginas públicas, na ordem do sitemap. */
export function publicPaths(): string[] {
  return [...PLANNER_PAGES.map((page) => page.path), ...Object.values(CARRACK_SLUGS).map((slug) => `/carraca/${slug}`)];
}

/**
 * Página para onde o login e a saída devolvem o jogador. Só aceita as páginas conhecidas do
 * site: o valor vem do `Referer` ou de cookie, e aceitar qualquer caminho abriria um
 * redirecionamento para fora do site.
 */
export function returnPath(value: string | null | undefined, origin: string): string {
  if (!value) return "/";
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return "/";
    const path = trimPath(url.pathname);
    return publicPaths().includes(path) ? path : "/";
  } catch {
    return "/";
  }
}
