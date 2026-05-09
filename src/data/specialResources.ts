import type { CargoType, PlanetType, SpecialId } from "./types.ts";
import {
  CargoType as Cargo,
  PlanetType as PT,
  SpecialId as SID,
} from "./types.ts";

export type SpecialBonusKind =
  | "popGrowth"
  | "hullCost"
  | "cargoCapacity"
  | "reputationGain"
  | "fuelCost"
  | "damageRecovery"
  | "passengerPayout";

export interface SpecialBonus {
  kind: SpecialBonusKind;
  amount: number;
}

export interface SpecialDef {
  id: SpecialId;
  name: string;
  parentCargo: CargoType;
  parentPlanetType: PlanetType;
  description: string;
  activeRouteBonus: SpecialBonus;
}

export const SPECIALS: Record<SpecialId, SpecialDef> = {
  [SID.FoodGenesis]: {
    id: SID.FoodGenesis,
    name: "Genesis Produce",
    parentCargo: Cargo.Food,
    parentPlanetType: PT.Agricultural,
    description: "Bio-engineered super-crops with extraordinary yield.",
    activeRouteBonus: { kind: "popGrowth", amount: 5 },
  },
  [SID.RawAdamantine]: {
    id: SID.RawAdamantine,
    name: "Adamantine Lode",
    parentCargo: Cargo.RawMaterials,
    parentPlanetType: PT.Mining,
    description: "Hyper-dense alloy ore prized by shipwrights.",
    activeRouteBonus: { kind: "hullCost", amount: -10 },
  },
  [SID.TechJokaero]: {
    id: SID.TechJokaero,
    name: "Jokaero Artifacts",
    parentCargo: Cargo.Technology,
    parentPlanetType: PT.TechWorld,
    description: "Sapient artisans whose tools defy physics.",
    activeRouteBonus: { kind: "cargoCapacity", amount: 1 },
  },
  [SID.LuxPleasureGarden]: {
    id: SID.LuxPleasureGarden,
    name: "Pleasure Garden Vintages",
    parentCargo: Cargo.Luxury,
    parentPlanetType: PT.LuxuryWorld,
    description: "Legendary vintages found nowhere else.",
    activeRouteBonus: { kind: "reputationGain", amount: 15 },
  },
  [SID.HzmAntimatterTap]: {
    id: SID.HzmAntimatterTap,
    name: "Antimatter Tap",
    parentCargo: Cargo.Hazmat,
    parentPlanetType: PT.Mining,
    description:
      "A stable antimatter well, supremely dangerous and supremely valuable.",
    activeRouteBonus: { kind: "fuelCost", amount: -10 },
  },
  [SID.MedPanacea]: {
    id: SID.MedPanacea,
    name: "Panacea Bloom",
    parentCargo: Cargo.Medical,
    parentPlanetType: PT.Manufacturing,
    description: "A wonder-drug source whose flowers bloom only here.",
    activeRouteBonus: { kind: "damageRecovery", amount: -25 },
  },
  [SID.PaxPilgrimage]: {
    id: SID.PaxPilgrimage,
    name: "Pilgrimage Spire",
    parentCargo: Cargo.Passengers,
    parentPlanetType: PT.CoreWorld,
    description:
      "Galactic cultural capital; everyone wants to visit at least once.",
    activeRouteBonus: { kind: "passengerPayout", amount: 20 },
  },
};

export function getSpecial(id: SpecialId): SpecialDef {
  return SPECIALS[id];
}

export function getSpecialsForCargo(cargo: CargoType): SpecialDef[] {
  return Object.values(SPECIALS).filter((s) => s.parentCargo === cargo);
}

export const SPECIAL_PRICE_MULTIPLIER = 2.5;
