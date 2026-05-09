import { CargoType, GoodCategory } from "./types.ts";

const CARGO_TO_CATEGORY: Record<CargoType, GoodCategory> = {
  food: GoodCategory.Bulk,
  rawMaterials: GoodCategory.Bulk,
  technology: GoodCategory.Strategic,
  hazmat: GoodCategory.Strategic,
  medical: GoodCategory.Strategic,
  luxury: GoodCategory.Premium,
  passengers: GoodCategory.Premium,
};

export function getGoodCategory(cargo: CargoType): GoodCategory {
  return CARGO_TO_CATEGORY[cargo];
}

export const IMPORT_MULTIPLIER = 1.25;

export { GoodCategory };
