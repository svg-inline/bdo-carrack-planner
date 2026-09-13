export type CarrackTarget = "gradual" | "equilibrio" | "ascensao" | "bravura";
export type ShipBranch = "caravel" | "galleass";
export type GearKey = "figurehead" | "plating" | "cannon" | "sail";
export type MaterialCategory = "carrack" | "blue-gear" | "carrack-gear" | "enhancement";

/**
 * Frequência de uma missão recorrente. Para acrescentar missões de evento, some o novo
 * identificador aqui e descreva-o em `QUEST_CADENCES`: o restante do planner — ritmo,
 * chave de reinício, abas e filtros — passa a reconhecê-lo por tipagem.
 */
export type QuestCadence = "daily" | "weekly";

/** Fontes sem frequência fixa: dependem do tempo de jogo, não de uma missão. */
export type FarmAcquisitionType = "barter" | "crow" | "hunt" | "processing" | "workers" | "market";
export type AcquisitionType = QuestCadence | FarmAcquisitionType;

export interface QuestCadenceDefinition {
  id: QuestCadence;
  /** Nome no singular, usado em rótulos de missão. */
  label: string;
  /** Nome no plural, usado nas abas e contagens. */
  plural: string;
  /** Dias entre duas conclusões da missão. */
  periodDays: number;
  /** Janela que zera a marcação de concluída. */
  reset: "day" | "week" | "never";
}

export type MaterialId =
  | "redSeaGold"
  | "enhancedPlywood"
  | "seaweedStalk"
  | "greatOceanIron"
  | "purePearl"
  | "coxLow"
  | "coxCombat"
  | "moonScalePlywood"
  | "tideTimber"
  | "reefPiece"
  | "coxHigh"
  | "luminousCobalt"
  | "moonVeinFlax"
  | "blueMarineTimber"
  | "saltRock"
  | "brilliantPearl"
  | "abyssalEye"
  | "waveStone"
  | "violentWavePlywood"
  | "polishedSupport"
  | "waveAdhesive"
  | "shiroFigureheadBlueprint"
  | "shiroPlatingBlueprint"
  | "shiroCannonBlueprint"
  | "shiroSailBlueprint";

/** Recompensa de uma missão do catálogo. O vínculo com `questId` é obrigatório. */
export interface QuestAcquisition {
  type: QuestCadence;
  label: string;
  detail?: string;
  /** Unidades entregues por conclusão da missão. */
  yield: number;
  /** Recompensa de escolha: fontes do mesmo grupo disputam a mesma conclusão. */
  group?: string;
  /** Missão de `QUESTS` que entrega este material. */
  questId: string;
}

export interface FarmAcquisition {
  type: FarmAcquisitionType;
  label: string;
  detail?: string;
}

export type Acquisition = QuestAcquisition | FarmAcquisition;

export interface MaterialDefinition {
  id: MaterialId;
  name: string;
  shortName: string;
  icon: string;
  category: MaterialCategory;
  required: Record<CarrackTarget, number>;
  difficulty: 1 | 2 | 3 | 4 | 5;
  crowPrice?: number;
  sources: Acquisition[];
}

export interface GearDefinition {
  name: string;
  icon: string;
  base: string;
  baseIcon: string;
  materials: Partial<Record<MaterialId, number>>;
}

export interface CarrackGearDefinition {
  name: string;
  icon: string;
  base: string;
  baseIcon: string;
  workshop: string;
  blueprint: MaterialId;
  blueprintSource: string;
  permit: string;
  materials: Partial<Record<MaterialId, number>>;
}

export interface CarrackDefinition {
  id: CarrackTarget;
  name: string;
  shortName: string;
  branch: ShipBranch;
  sourceShip: string;
  role: string;
  description: string;
}

export interface GearState {
  baseEnhancement: number;
  crafted: boolean;
  blueEnhancement: number;
}

export type BranchGearState = Record<ShipBranch, Record<GearKey, GearState>>;

export interface PlannerProfile {
  target: CarrackTarget;
  crowCoins: number;
  materials: Record<MaterialId, number>;
  gear: BranchGearState;
  carrackGear: Record<GearKey, GearState>;
  /** Missões que o jogador mantém na rotina e que, por isso, entram no ritmo estimado. */
  activeQuests: Record<string, boolean>;
}

export interface PlannerPreset {
  id: string;
  name: string;
  profile: PlannerProfile;
  completedQuests: Record<string, string>;
}

/**
 * Missão como ela é escrita no catálogo. NPC, local e frequência vêm do grupo, então uma
 * missão nova só precisa do próprio conteúdo.
 */
export interface QuestEntry {
  id: string;
  title: string;
  objective: string;
  rewards: string[];
  recommendedFor: MaterialId[];
  priority: 1 | 2 | 3 | 4 | 5;
  source: string;
  sourceUrl: string;
  note?: string;
  /**
   * Trilha de aceite dentro do grupo. Missões da mesma trilha convivem no diário; trilhas
   * diferentes se excluem em grupos `one-track`. Sem valor, a missão é a própria trilha.
   */
  track?: string;
  /** Fora do cálculo até o jogador marcar. Padrão: entra. */
  defaultActive?: boolean;
}

/**
 * Conjunto de missões do mesmo NPC e da mesma frequência. É a unidade de exibição da aba
 * Missões e o lugar onde ficam as regras de aceite do jogo.
 */
export interface QuestGroupDefinition {
  id: string;
  npc: string;
  location: string;
  cadence: QuestCadence;
  /** `all`: todas podem ficar ativas juntas. `one-track`: só uma trilha por vez. */
  selection: "all" | "one-track";
  /** Regra de aceite em texto, exibida no cabeçalho do grupo. */
  note?: string;
  /** Trilha ativa por padrão em grupos `one-track`. Padrão: a trilha da primeira missão. */
  defaultTrack?: string;
  /** Nome legível de cada trilha, exibido nas missões de grupos com mais de uma. */
  trackLabels?: Record<string, string>;
  quests: QuestEntry[];
}

/** Missão já resolvida com os dados herdados do grupo. */
export interface QuestDefinition extends Omit<QuestEntry, "track" | "defaultActive"> {
  cadence: QuestCadence;
  npc: string;
  location: string;
  group: string;
  track: string;
  defaultActive: boolean;
}
