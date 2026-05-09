import type { SpecialId } from "../../data/types.ts";
import { SPECIALS } from "../../data/specialResources.ts";

export interface CompanyBonusBundle {
  popGrowthMultiplier: number;
  hullCostMultiplier: number;
  cargoCapacityBonus: number;
  reputationGainMultiplier: number;
  fuelCostMultiplier: number;
  damageRecoveryMultiplier: number;
  passengerPayoutMultiplier: number;
}

export function computeCompanyBonuses(opts: {
  activeSpecialRoutes: SpecialId[];
}): CompanyBonusBundle {
  const bundle: CompanyBonusBundle = {
    popGrowthMultiplier: 1.0,
    hullCostMultiplier: 1.0,
    cargoCapacityBonus: 0,
    reputationGainMultiplier: 1.0,
    fuelCostMultiplier: 1.0,
    damageRecoveryMultiplier: 1.0,
    passengerPayoutMultiplier: 1.0,
  };

  for (const id of opts.activeSpecialRoutes) {
    const spec = SPECIALS[id];
    if (!spec) continue;
    const { kind, amount } = spec.activeRouteBonus;
    switch (kind) {
      case "popGrowth":
        bundle.popGrowthMultiplier += amount / 100;
        break;
      case "hullCost":
        bundle.hullCostMultiplier += amount / 100;
        break;
      case "cargoCapacity":
        bundle.cargoCapacityBonus += amount;
        break;
      case "reputationGain":
        bundle.reputationGainMultiplier += amount / 100;
        break;
      case "fuelCost":
        bundle.fuelCostMultiplier += amount / 100;
        break;
      case "damageRecovery":
        bundle.damageRecoveryMultiplier += amount / 100;
        break;
      case "passengerPayout":
        bundle.passengerPayoutMultiplier += amount / 100;
        break;
    }
  }

  return bundle;
}
