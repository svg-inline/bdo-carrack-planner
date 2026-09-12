export type CarrackTarget = "gradual" | "equilibrio" | "ascensao" | "bravura";
export type ShipBranch = "caravel" | "galleass";
export type GearKey = "figurehead" | "plating" | "cannon" | "sail";
export type MaterialCategory = "carrack" | "blue-gear" | "enhancement";
export type AcquisitionType = "daily" | "weekly" | "barter" | "crow" | "hunt" | "processing" | "event" | "market";

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
  | "waveStone";

export interface Acquisition {
  type: AcquisitionType;
  label: string;
  detail?: string;
  yield?: number;
}

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
  initialized: boolean;
  target: CarrackTarget;
  crowCoins: number;
  materials: Record<MaterialId, number>;
  gear: BranchGearState;
  passOwned: boolean;
  passPoints: number;
  normalChests: number;
  extravagantChests: number;
}

export interface QuestDefinition {
  id: string;
  cadence: "daily" | "weekly";
  title: string;
  npc: string;
  location: string;
  objective: string;
  rewards: string[];
  recommendedFor: MaterialId[];
  priority: 1 | 2 | 3 | 4 | 5;
  source: string;
}
