import { CARRACK_GEAR_SETS, CARRACK_ORDER, CARRACKS, GEAR_SETS, MATERIALS, MATERIAL_BY_ID, YELLOW_GEAR_SETS } from "@/lib/data";
import type { CarrackTarget, GearKey, MaterialId, ShipBranch } from "@/types";

/**
 * Endereço de cada material, a partir do nome exibido no jogo, sem acento: é o que o jogador
 * digita na busca ("como conseguir barra de cobalto brilhante").
 */
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const MATERIAL_SLUGS = Object.fromEntries(MATERIALS.map((m) => [m.id, slugify(m.name)])) as Record<MaterialId, string>;

export function materialPath(id: MaterialId): string {
  return `/material/${MATERIAL_SLUGS[id]}`;
}

export function materialFromSlug(slug: string): MaterialId | null {
  const entry = Object.entries(MATERIAL_SLUGS).find(([, value]) => value === slug);
  return entry ? (entry[0] as MaterialId) : null;
}

/** Um uso do material: a peça ou a construção que o pede, quanto pede e para quais Carracas. */
export interface MaterialUse {
  name: string;
  qty: number;
  carracks: CarrackTarget[];
}

const BRANCH_CARRACKS = (branch: ShipBranch) => CARRACK_ORDER.filter((id) => CARRACKS[id].branch === branch);

/**
 * Onde o material entra, em todas as Carracas: receitas do equipamento azul +10, do conjunto
 * de Shiro e do de Falasi, e a construção da própria Carraca. Peças com o mesmo nome e a mesma
 * quantidade viram uma linha só, com as Carracas que as usam.
 */
export function materialUses(id: MaterialId): MaterialUse[] {
  const uses: MaterialUse[] = [];
  function add(name: string, qty: number | undefined, carracks: CarrackTarget[]) {
    if (!qty) return;
    const same = uses.find((use) => use.name === name && use.qty === qty);
    if (same) same.carracks.push(...carracks.filter((c) => !same.carracks.includes(c)));
    else uses.push({ name, qty, carracks: [...carracks] });
  }
  for (const branch of Object.keys(GEAR_SETS) as ShipBranch[]) {
    const set = GEAR_SETS[branch];
    for (const key of Object.keys(set) as GearKey[]) add(set[key].name, set[key].materials[id], BRANCH_CARRACKS(branch));
  }
  for (const carrack of CARRACK_ORDER) {
    for (const sets of [CARRACK_GEAR_SETS, YELLOW_GEAR_SETS]) {
      const set = sets[carrack];
      for (const key of Object.keys(set) as GearKey[]) add(set[key].name, set[key].materials[id], [carrack]);
    }
  }
  if (MATERIAL_BY_ID[id].category === "carrack")
    for (const carrack of CARRACK_ORDER) add("Construção da Carraca", MATERIAL_BY_ID[id].required[carrack], [carrack]);
  return uses;
}
