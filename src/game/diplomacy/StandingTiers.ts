export type StandingTierName =
  | "Hostile"
  | "Cold"
  | "Neutral"
  | "Warm"
  | "Allied";

export interface StandingTier {
  readonly name: StandingTierName;
  readonly min: number;
  readonly max: number;
}

export const STANDING_TIERS: readonly StandingTier[] = [
  { name: "Hostile", min: 0, max: 19 },
  { name: "Cold", min: 20, max: 39 },
  { name: "Neutral", min: 40, max: 59 },
  { name: "Warm", min: 60, max: 79 },
  { name: "Allied", min: 80, max: 100 },
];

export function getStandingTier(value: number): StandingTierName {
  const clamped = Math.max(0, Math.min(100, value));
  for (const tier of STANDING_TIERS) {
    if (clamped >= tier.min && clamped <= tier.max) return tier.name;
  }
  return "Neutral";
}

export function isTierTransition(before: number, after: number): boolean {
  return getStandingTier(before) !== getStandingTier(after);
}
